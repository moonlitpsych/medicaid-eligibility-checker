// api-server.js - Simple Express server for API backend
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./api/_db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: '1161680',
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD,
    providerNPI: '1275348807',
    providerName: 'MOONLIT_PLLC',
    isa06: '1161680',
    isa08: 'OFFALLY',
    gs02: '1161680',
    gs03: 'OFFALLY',
    payerID: 'UTMCD' // Correct Office Ally payer ID for Utah Medicaid eligibility
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
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`); // NO SSN/ID (CRITICAL FIX)
    
    // Gender handling - Utah Medicaid only accepts M or F, omit if unknown
    let dmgSegment = `DMG*D8*${dob}`;
    if (patient.gender && (patient.gender.toUpperCase() === 'M' || patient.gender.toUpperCase() === 'F')) {
        dmgSegment += `*${patient.gender.toUpperCase()}`;
    }
    seg.push(dmgSegment);
    
    seg.push(`DTP*291*D8*${ccyymmdd}`);
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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        provider: 'office_ally',
        ready: true
    });
});

app.listen(PORT, () => {
    console.log(`
🎉 OFFICE ALLY API SERVER READY!
================================

🌐 API Endpoint: http://localhost:${PORT}
⚡ Office Ally Integration: LIVE
🎯 Response Time Target: <1 second
💰 Cost per verification: $0.10

Ready for real patient eligibility verification! 🚀
    `);
});

module.exports = app;