// api-server.js - Simple Express server for API backend
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./api/_db');

// CM imports with error handling
let cmPointsRouter = null;
let canonicalPointsRouter = null;
let initializeCMDatabase = null;
let initializeCMDatabaseCanonical = null;

// Recovery Day Demo imports
let recoveryDayRouter = null;

try {
    initializeCMDatabase = require('./api/cm/database').initializeCMDatabase;
    initializeCMDatabaseCanonical = require('./api/cm/database-canonical').initializeCMDatabaseCanonical;
    cmPointsRouter = require('./api/cm/points');
    canonicalPointsRouter = require('./api/cm/points-canonical');
    console.log('✅ CM modules loaded successfully');
} catch (error) {
    console.warn('⚠️ CM modules failed to load:', error.message);
    console.warn('   CM features will be disabled');
}

// Load Recovery Day Demo routes
try {
    recoveryDayRouter = require('./api/recovery-day-routes');
    console.log('✅ Recovery Day demo routes loaded successfully');
} catch (error) {
    console.warn('⚠️ Recovery Day demo routes failed to load:', error.message);
    console.warn('   Recovery Day features will be disabled');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/reach-2-0', express.static('../reach-2-0'));

// Office Ally Configuration - NO HARDCODED CREDENTIALS
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC',
    isa06: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    isa08: 'OFFALLY',
    gs02: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    gs03: 'OFFALLY',
    payerID: process.env.OFFICE_ALLY_PAYER_ID || 'UTMCD'
};

// Generate UUID for PayloadID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate X12 270 for Office Ally - WORKING FORMAT (Name/DOB only)
function generateOfficeAllyX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    // Pad ISA06/ISA08 to 15 characters with spaces (CRITICAL FIX)
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    // Build segments WITHOUT trailing "~"; join with "~" once (CRITICAL FIX)
    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`); // 13 = Request (CRITICAL FIX)

    // 2100A: Payer
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // 2100B: Information Receiver (organization, not patient) (CRITICAL FIX)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    // Include Member ID if provided (required for proper patient matching)
    if (patient.medicaidId) {
        seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}****MI*${patient.medicaidId}`);
    } else {
        seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    }
    
    // Gender handling - Utah Medicaid only accepts M or F, omit if unknown
    let dmgSegment = `DMG*D8*${dob}`;
    if (patient.gender && (patient.gender.toUpperCase() === 'M' || patient.gender.toUpperCase() === 'F')) {
        dmgSegment += `*${patient.gender.toUpperCase()}`;
    }
    seg.push(dmgSegment);
    
    seg.push(`DTP*291*RD8*${ccyymmdd}-${ccyymmdd}`);
    seg.push(`EQ*30`);

    // SE count = segments from ST..SE inclusive
    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1; // +1 for SE itself
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    // Single "~" join + trailing "~" (CRITICAL FIX - no double tildes)
    return seg.join('~') + '~';
}

// Generate SOAP envelope for Office Ally
function generateOfficeAllySOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = generateUUID();
    
    return `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
<soapenv:Header>
<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken>
<wsse:Username>${OFFICE_ALLY_CONFIG.username}</wsse:Username>
<wsse:Password>${OFFICE_ALLY_CONFIG.password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soapenv:Header>
<soapenv:Body>
<ns1:COREEnvelopeRealTimeRequest xmlns:ns1="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${OFFICE_ALLY_CONFIG.senderID}</SenderID>
<ReceiverID>${OFFICE_ALLY_CONFIG.receiverID}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>
<![CDATA[${x12Payload}]]>
</Payload>
</ns1:COREEnvelopeRealTimeRequest>
</soapenv:Body>
</soapenv:Envelope>`;
}

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });

    if (!response.ok) {
        throw new Error(`Office Ally API error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
}

// Parse Office Ally SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
    
    if (!payloadMatch) {
        console.log('🔍 Office Ally SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
        throw new Error('No payload found in Office Ally SOAP response');
    }
    
    return payloadMatch[1].trim();
}

// Service Type Codes for detailed parsing
const SERVICE_TYPES = {
    '1': 'Medical Care',
    '30': 'Health Benefit Plan Coverage', 
    '33': 'Chiropractic',
    '35': 'Dental Care',
    '45': 'Hospice',
    '47': 'Hospital - Room and Board',
    '48': 'Hospital - Inpatient',
    '50': 'Hospital - Outpatient',
    '54': 'Long Term Care',
    '60': 'Hospital',
    '86': 'Emergency Services',
    '88': 'Pharmacy',
    '98': 'Professional Services',
    'AI': 'Substance Use Disorder',
    'AL': 'Vision',
    'MH': 'Mental Health',
    'UC': 'Urgent Care',
    'HM': 'Transportation'
};

// Eligibility Status Codes
const ELIGIBILITY_CODES = {
    '1': 'Active Coverage',
    '2': 'Active - Full Risk Capitation',
    '3': 'Active - Services Capitated to Primary Care Provider', 
    'A': 'Active',
    'I': 'Inactive',
    'B': 'Unknown',
    'C': 'Unknown',
    'G': 'Unknown'
};

// Enhanced X12 271 Parser for detailed Utah Medicaid analysis
function parseX12_271(x12Data) {
    console.log('🔍 Parsing X12 271 with enhanced Utah Medicaid analysis...');
    
    const segments = x12Data.split('~').filter(seg => seg.trim());
    
    const result = {
        enrolled: false,
        program: '',
        planType: '',
        medicaidId: '',
        address: {},
        coverage: [],
        transportation: null,
        verified: true,
        error: '',
        details: '',
        effectiveDate: new Date().toISOString().split('T')[0]
    };
    
    // Parse patient information
    const nmilSegment = segments.find(seg => seg.startsWith('NM1*IL*'));
    if (nmilSegment) {
        const parts = nmilSegment.split('*');
        if (parts[9]) result.medicaidId = parts[9];
    }
    
    // Parse address
    const n3Segment = segments.find(seg => seg.startsWith('N3*'));
    const n4Segment = segments.find(seg => seg.startsWith('N4*'));
    if (n3Segment && n4Segment) {
        const n3Parts = n3Segment.split('*');
        const n4Parts = n4Segment.split('*');
        result.address = {
            street: n3Parts[1],
            city: n4Parts[1],
            state: n4Parts[2],
            zip: n4Parts[3]
        };
    }
    
    // Parse eligibility benefits (EB segments) - THE KEY DATA!
    const ebSegments = segments.filter(seg => seg.startsWith('EB*'));
    
    let hasActiveTraditional = false;
    let hasActiveManagedCare = false;
    let activeCoverageTypes = [];
    let acoMcoName = null;
    
    ebSegments.forEach(eb => {
        const parts = eb.split('*');
        const eligibilityCode = parts[1];
        const serviceTypes = parts[3] ? parts[3].split('^') : [];
        const planCode = parts[4];
        const planDescription = parts[5] || '';
        
        const isActive = ['1', 'A', '2', '3'].includes(eligibilityCode);
        
        if (isActive) {
            result.enrolled = true;
            
            // Analyze plan type from description
            const desc = planDescription.toUpperCase();
            
            if (desc.includes('TARGETED ADULT MEDICAID')) {
                hasActiveTraditional = true;
                activeCoverageTypes.push('Targeted Adult Medicaid (ACA Expansion)');
                result.planType = 'Traditional Fee-for-Service';
                result.program = 'Targeted Adult Medicaid';
            } else if (desc.includes('MENTAL HEALTH')) {
                activeCoverageTypes.push('Mental Health Services');
            } else if (desc.includes('SUBSTANCE USE')) {
                activeCoverageTypes.push('Substance Use Disorder');
            } else if (desc.includes('DENTAL')) {
                activeCoverageTypes.push('Adult Dental Program');
            } else if (desc.includes('TRANSPORTATION')) {
                activeCoverageTypes.push('Non-Emergency Transportation');
            }
            
            // Check for managed care indicators
            if (planCode === 'MC' && !desc.includes('TARGETED ADULT') && !desc.includes('MENTAL HEALTH') && !desc.includes('SUBSTANCE') && !desc.includes('DENTAL') && !desc.includes('TRANSPORTATION')) {
                // This might be managed care, but need more analysis
            }
            
            result.coverage.push({
                status: ELIGIBILITY_CODES[eligibilityCode] || eligibilityCode,
                planCode,
                planDescription,
                services: serviceTypes.map(st => SERVICE_TYPES[st] || st),
                isActive
            });
        }
    });
    
    // Look for transportation provider in LS/LE loops
    let currentLSIndex = -1;
    segments.forEach((seg, index) => {
        if (seg.startsWith('LS*')) {
            currentLSIndex = index;
        } else if (seg.startsWith('LE*') && currentLSIndex >= 0) {
            // Process LS/LE loop
            const loopSegments = segments.slice(currentLSIndex, index + 1);
            const mcoSegment = loopSegments.find(s => s.startsWith('NM1*PR*'));
            if (mcoSegment) {
                const parts = mcoSegment.split('*');
                result.transportation = {
                    company: parts[3],
                    id: parts[9]
                };
            }
            currentLSIndex = -1;
        }
    });
    
    // Check for AAA (rejection) segments
    const aaaSegments = segments.filter(seg => seg.startsWith('AAA*'));
    if (aaaSegments.length > 0 && !result.enrolled) {
        result.error = 'No active Medicaid coverage found';
        return result;
    }
    
    // Determine final program classification
    if (result.enrolled) {
        if (hasActiveTraditional) {
            result.program = 'Utah Medicaid - Traditional (Fee-for-Service)';
            result.planType = 'Traditional FFS';
            result.details = `Active traditional Medicaid coverage. Coverage includes: ${[...new Set(activeCoverageTypes)].join(', ')}`;
        } else if (hasActiveManagedCare) {
            result.program = `Utah Medicaid - Managed Care${acoMcoName ? ` (${acoMcoName})` : ''}`;
            result.planType = 'Managed Care';
            result.details = `Active managed care coverage through ${acoMcoName || 'MCO/ACO'}`;
        } else {
            result.program = 'Utah Medicaid';
            result.planType = 'Standard';
            result.details = 'Active Medicaid coverage';
        }
    } else {
        result.error = 'No active Medicaid coverage found';
    }
    
    console.log(`✅ Parsed result: ${result.enrolled ? 'ENROLLED' : 'NOT ENROLLED'} - ${result.program}`);
    
    return result;
}

// API Routes
app.post('/api/medicaid/check', async (req, res) => {
    const startTime = Date.now();
    console.log(`🔍 Checking eligibility for ${req.body.first} ${req.body.last} via OFFICE_ALLY`);
    
    try {
        const { first, last, dob, ssn, medicaidId, gender } = req.body;

        if (!first || !last || !dob) {
            return res.status(400).json({
                error: 'Missing required fields: first, last, dob',
                enrolled: false,
                verified: false
            });
        }

        // 🎭 DEMO PATIENT DETECTION - Return mock data for Alex Demo
        if (first.trim().toLowerCase() === 'alex' && last.trim().toLowerCase() === 'demo') {
            console.log('🎭 DEMO MODE: Returning mock eligibility for Alex Demo');
            
            const mockResult = {
                enrolled: true,
                verified: true,
                program: 'Utah Medicaid (DEMO)',
                eligibilityStatus: 'Active Coverage',
                planType: 'Traditional FFS',
                patientData: {
                    firstName: 'Alex',
                    lastName: 'Demo',
                    dateOfBirth: dob,
                    phone: '3852018161',
                    medicaidId: 'DEMO123456',
                    gender: 'U',
                    address: {
                        street: '123 Demo Street',
                        city: 'Salt Lake City',
                        state: 'UT',
                        zip: '84101'
                    }
                },
                serviceTypes: {
                    'Mental Health Outpatient': 'Active Coverage',
                    'Substance Use Disorder': 'Active Coverage',
                    'Professional Services': 'Active Coverage'
                },
                details: 'DEMO: Enrolled in Utah Medicaid Traditional FFS - QUALIFIES for CM Program',
                processingTime: Date.now() - startTime,
                demoMode: true,
                rawX12: 'DEMO-MODE-NO-X12-GENERATED'
            };

            return res.json(mockResult);
        }

        console.log('🚀 Processing real OFFICE_ALLY eligibility check...');

        const x12_270 = generateOfficeAllyX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            ssn: ssn?.replace(/\D/g, ''),
            medicaidId,
            gender: gender || 'U'
        });
        
        console.log('🔍 DEBUG - Generated X12 270 Request:');
        console.log('==========================================');
        console.log(x12_270);
        console.log('==========================================');

        const soapRequest = generateOfficeAllySOAPRequest(x12_270);
        
        console.log('📡 Sending request to Office Ally...');
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        console.log('📨 Received response from Office Ally');
        
        const x12_271 = parseOfficeAllySOAPResponse(soapResponse);
        console.log('🔍 DEBUG - Raw X12 271 Response:');
        console.log('==========================================');
        console.log(x12_271);
        console.log('==========================================');
        
        const eligibilityResult = parseX12_271(x12_271);

        // Log to database
        try {
            await pool.query(`
                INSERT INTO eligibility_log (
                    patient_first_name, patient_last_name, patient_dob,
                    ssn_last_four, medicaid_id, raw_270, raw_271, sftp_filename,
                    result, is_enrolled, performed_at, processing_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
            `, [
                first.trim(), last.trim(), dob,
                ssn ? ssn.replace(/\D/g, '').slice(-4) : null,
                medicaidId || null,
                x12_270, x12_271, `office_ally_${Date.now()}.xml`,
                JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
                Date.now() - startTime
            ]);
            console.log('📝 Database logging successful');
        } catch (dbError) {
            console.error('Database logging failed:', dbError);
        }

        console.log(`✅ OFFICE_ALLY eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ OFFICE_ALLY eligibility check failed:', error);
        
        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false
        });
    }
});

// Self-check endpoint for debugging
app.get('/debug/self-check', (req, res) => {
    try {
        // Test X12 270 Generation
        function generateSampleX12_270() {
            const now = new Date();
            const ctrl = Date.now().toString().slice(-9);
            const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
            const hhmm = now.toISOString().slice(11,16).replace(':','');
            const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');

            const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
            const ISA06 = pad15('1161680');
            const ISA08 = pad15('OFFALLY');

            const seg = [];
            seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
            seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
            seg.push(`ST*270*0001*005010X279A1`);
            seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);
            seg.push(`HL*1**20*1`);
            seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);
            seg.push(`HL*2*1*21*1`);
            seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);
            seg.push(`HL*3*2*22*0`);
            seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
            seg.push(`NM1*IL*1*TEST*PATIENT`);
            seg.push(`DMG*D8*19840717`);
            seg.push(`DTP*291*D8*${ccyymmdd}`);
            seg.push(`EQ*30`);

            const stIndex = seg.findIndex(s => s.startsWith('ST*'));
            const count = seg.length - stIndex + 1;
            seg.push(`SE*${count}*0001`);
            seg.push(`GE*1*${ctrl}`);
            seg.push(`IEA*1*${ctrl}`);

            return seg.join('~') + '~';
        }

        const sampleX12 = generateSampleX12_270();
        const hasCredentials = !!(OFFICE_ALLY_CONFIG.username && OFFICE_ALLY_CONFIG.password);

        const selfCheck = {
            timestamp: new Date().toISOString(),
            provider: process.env.ELIGIBILITY_PROVIDER || 'office_ally',
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                ELIGIBILITY_PROVIDER: process.env.ELIGIBILITY_PROVIDER,
                SIMULATION_MODE: process.env.SIMULATION_MODE
            },
            office_ally: {
                endpoint: OFFICE_ALLY_CONFIG.endpoint,
                receiverID: OFFICE_ALLY_CONFIG.receiverID,
                senderID: OFFICE_ALLY_CONFIG.senderID,
                providerNPI: OFFICE_ALLY_CONFIG.providerNPI,
                payerID: OFFICE_ALLY_CONFIG.payerID,
                username_configured: !!OFFICE_ALLY_CONFIG.username,
                password_configured: !!OFFICE_ALLY_CONFIG.password,
                password_length: OFFICE_ALLY_CONFIG.password?.length || 0,
                credentials_ready: hasCredentials
            },
            x12_test: {
                sample_length: sampleX12.length,
                segment_count: (sampleX12.match(/~/g) || []).length,
                first_100_chars: sampleX12.substring(0, 100),
                contains_required_segments: {
                    ISA: sampleX12.includes('ISA*'),
                    GS: sampleX12.includes('GS*'),
                    ST: sampleX12.includes('ST*270*'),
                    BHT: sampleX12.includes('BHT*0022*13*'),
                    SE: sampleX12.includes('SE*'),
                    GE: sampleX12.includes('GE*'),
                    IEA: sampleX12.includes('IEA*')
                }
            },
            readiness: {
                config_complete: hasCredentials,
                simulation_mode: process.env.SIMULATION_MODE === 'true',
                ready_for_live_testing: hasCredentials && process.env.SIMULATION_MODE !== 'true',
                issues: []
            }
        };

        // Identify any issues
        if (!hasCredentials) {
            selfCheck.readiness.issues.push('Missing Office Ally credentials (OFFICE_ALLY_USERNAME or OFFICE_ALLY_PASSWORD)');
        }
        if (process.env.SIMULATION_MODE === 'true') {
            selfCheck.readiness.issues.push('Running in SIMULATION_MODE (set to false for live testing)');
        }

        res.json(selfCheck);

    } catch (error) {
        console.error('Self-check failed:', error);
        res.status(500).json({
            error: 'Self-check failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        provider: 'office_ally',
        ready: true
    });
});

// === NEW: Universal Eligibility API ===
// Import the universal eligibility module
const { checkUniversalEligibility } = require('./api-universal-eligibility');

// Universal eligibility endpoint that supports multiple payers
app.post('/api/universal-eligibility/check', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { payerId, firstName, lastName, dateOfBirth, gender, memberNumber, medicaidId, groupNumber, ssn, address } = req.body;
        
        if (!payerId) {
            return res.status(400).json({
                error: 'Missing required field: payerId',
                enrolled: false,
                verified: false
            });
        }
        
        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({
                error: 'Missing required fields: firstName, lastName, dateOfBirth',
                enrolled: false,
                verified: false
            });
        }
        
        console.log(`🔍 Universal eligibility check: ${firstName} ${lastName} with ${payerId}`);
        
        // Prepare patient data object
        const patientData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            gender: gender || 'U',
            memberNumber: memberNumber?.trim() || null,
            medicaidId: medicaidId?.trim() || null,
            groupNumber: groupNumber?.trim() || null,
            ssn: ssn?.replace(/\D/g, '') || null,
            address: address?.trim() || null
        };
        
        // Check eligibility using the universal system
        const eligibilityResult = await checkUniversalEligibility(patientData, payerId);
        
        // Log to database (using the same structure as the original endpoint)
        try {
            await pool.query(`
                INSERT INTO eligibility_log (
                    patient_first_name, patient_last_name, patient_dob,
                    ssn_last_four, medicaid_id, raw_270, raw_271, sftp_filename,
                    result, is_enrolled, performed_at, processing_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
            `, [
                firstName.trim(), lastName.trim(), dateOfBirth,
                ssn ? ssn.replace(/\D/g, '').slice(-4) : null,
                medicaidId || memberNumber || null,
                `UNIVERSAL_${payerId}_270`, // Placeholder for X12 270
                JSON.stringify(eligibilityResult.x12Details || {}), // X12 271 details
                `universal_${payerId}_${Date.now()}.json`,
                JSON.stringify(eligibilityResult), 
                eligibilityResult.enrolled,
                Date.now() - startTime
            ]);
            console.log('📝 Universal eligibility database logging successful');
        } catch (dbError) {
            console.error('Database logging failed:', dbError);
        }
        
        console.log(`✅ Universal eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        res.json(eligibilityResult);
        
    } catch (error) {
        console.error('❌ Universal eligibility check failed:', error);
        
        res.status(500).json({
            enrolled: false,
            error: `Unable to verify eligibility: ${error.message}`,
            verified: false,
            responseTime: Date.now() - startTime
        });
    }
});

// Get available payers for the frontend dropdown
app.get('/api/universal-eligibility/payers', (req, res) => {
    try {
        const { getPayerDropdownOptions } = require('./dynamic-field-system');
        const payerOptions = getPayerDropdownOptions();
        
        res.json({
            success: true,
            payers: payerOptions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to get payer options:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to load payer options',
            payers: []
        });
    }
});

// Get form configuration for a specific payer
app.get('/api/universal-eligibility/payer/:payerId/config', (req, res) => {
    try {
        const { generateDynamicFormConfig } = require('./dynamic-field-system');
        const { payerId } = req.params;
        
        const formConfig = generateDynamicFormConfig(payerId);
        
        res.json({
            success: true,
            config: formConfig,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Failed to get form config for ${req.params.payerId}:`, error);
        res.status(400).json({
            success: false,
            error: error.message,
            config: null
        });
    }
});

// === DATABASE-DRIVEN ELIGIBILITY API ===
// Import the database-driven handlers
let handleDatabaseDrivenEligibilityCheck = null;
let handleGetPayers = null;
let handleGetPayerConfig = null;

try {
    console.log('🔍 Importing database-driven routes...');
    const databaseRoutes = require('./database-driven-api-routes');
    handleDatabaseDrivenEligibilityCheck = databaseRoutes.handleDatabaseDrivenEligibilityCheck;
    handleGetPayers = databaseRoutes.handleGetPayers;
    handleGetPayerConfig = databaseRoutes.handleGetPayerConfig;
    console.log('✅ Database-driven routes imported successfully');
    console.log('   Available functions:', Object.keys(databaseRoutes));
} catch (error) {
    console.error('❌ Failed to import database-driven routes:', error.message);
    console.error('   Database eligibility features will be disabled');
}

// Database-driven eligibility check endpoint (uses Supabase configurations)
if (handleDatabaseDrivenEligibilityCheck) {
    app.post('/api/database-eligibility/check', handleDatabaseDrivenEligibilityCheck);
    console.log('✅ Database eligibility check route registered');
} else {
    console.log('⚠️ Database eligibility check route skipped (handler not available)');
}

// Get available payers from Supabase database
if (handleGetPayers) {
    app.get('/api/database-eligibility/payers', handleGetPayers);
    console.log('✅ Database payers route registered');
} else {
    console.log('⚠️ Database payers route skipped (handler not available)');
}

// Get form configuration for a specific payer from Supabase database  
if (handleGetPayerConfig) {
    app.get('/api/database-eligibility/payer/:payerId/config', handleGetPayerConfig);
    console.log('✅ Database payer config route registered');
} else {
    console.log('⚠️ Database payer config route skipped (handler not available)');
}

// Test route to debug registration
app.get('/api/test-route', (req, res) => {
    res.json({ message: 'Test route working!', timestamp: new Date().toISOString() });
});
console.log('✅ Test route registered at /api/test-route');

// Test database handler directly
app.get('/api/test-database', async (req, res) => {
    try {
        if (handleGetPayers) {
            console.log('🧪 Testing handleGetPayers directly...');
            // Create mock req/res and test the handler
            const mockReq = {};
            const mockRes = {
                json: (data) => {
                    console.log('✅ handleGetPayers returned data');
                    res.json({ ...data, testedDirectly: true });
                },
                status: (code) => ({
                    json: (data) => {
                        console.log(`⚠️ handleGetPayers returned status ${code}`);
                        res.status(code).json({ ...data, testedDirectly: true });
                    }
                })
            };
            await handleGetPayers(mockReq, mockRes);
        } else {
            res.status(500).json({ error: 'handleGetPayers not available' });
        }
    } catch (error) {
        console.error('❌ Direct database handler test failed:', error);
        res.status(500).json({ error: error.message });
    }
});
console.log('✅ Test database handler route registered at /api/test-database');

// CM (Contingency Management) Routes - Canonical Architecture
if (canonicalPointsRouter) {
    app.use('/api/cm', canonicalPointsRouter);
    console.log('✅ CM canonical routes enabled');
} else {
    console.log('⚠️ CM canonical routes disabled (module failed to load)');
}

// Legacy CM Routes (for backward compatibility during transition)
if (cmPointsRouter) {
    app.use('/api/cm-legacy', cmPointsRouter);
    console.log('✅ CM legacy routes enabled');
} else {
    console.log('⚠️ CM legacy routes disabled (module failed to load)');
}

// Recovery Day Demo Routes
if (recoveryDayRouter) {
    app.use('/api/recovery-day', recoveryDayRouter);
    console.log('✅ Recovery Day demo routes enabled');
} else {
    console.log('⚠️ Recovery Day demo routes disabled (module failed to load)');
}

// Initialize CM database on server start
async function startServer() {
    if (initializeCMDatabaseCanonical) {
        try {
            await initializeCMDatabaseCanonical();
            console.log('✅ CM Canonical Database initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize CM database:', error);
        }
    } else {
        console.log('⚠️ CM database initialization skipped (module not available)');
    }
    
    app.listen(PORT, () => {
        console.log(`
🎉 OFFICE ALLY + CM API SERVER READY!
====================================

🌐 API Endpoint: http://localhost:${PORT}
⚡ Office Ally Integration: LIVE
🎯 Response Time Target: <1 second
💰 Cost per verification: $0.10
🏥 CM Program Database: READY
💎 Points System: ACTIVE

Ready for CM program management! 🚀
        `);
    });
}

startServer();

module.exports = app;