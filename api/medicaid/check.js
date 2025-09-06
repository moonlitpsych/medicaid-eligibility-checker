// api/medicaid/check.js - UPDATED for UHIN Integration
const fs = require('fs');
let pool;
try {
    const db = require('../_db');
    pool = db.pool;
} catch (error) {
    console.log('Database not available, continuing without logging');
    pool = null;
}

// Provider Configuration - Office Ally or UHIN based on environment
// Made dynamic for testing provider switching
function getEligibilityProvider() {
    return process.env.ELIGIBILITY_PROVIDER || 'office_ally'; // Default to Office Ally
}

// UHIN SOAP Configuration
const UHIN_CONFIG = {
    endpoint: 'https://ws.uhin.org/webservices/core/soaptype4.asmx',
    tradingPartner: 'HT009582-001', // Our TPN for UHIN authentication
    receiverID: 'HT000004-001', // Utah Medicaid PRODUCTION environment
    officeAllyTPN: 'HT006842-001', // Office Ally's TPN for Utah Medicaid routing
    username: process.env.UHIN_USERNAME,
    password: process.env.UHIN_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1234567890',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC'
};

// Office Ally Direct Integration Configuration (Real-time eligibility)
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY', // Office Ally's standard receiver ID
    senderID: '1161680', // Assigned Sender ID from Office Ally
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***', // Fallback for special character issues
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC',
    // Office Ally identifiers
    isa06: '1161680', // ISA06 - Sender ID
    isa08: 'OFFALLY', // ISA08 - Receiver ID
    gs02: '1161680', // GS02 - Sender ID
    gs03: 'OFFALLY', // GS03 - Receiver ID
    payerID: 'UTMCD' // Office Ally payer ID for Utah Medicaid eligibility
};

// Generate X12 270 for UHIN (embedded in SOAP)
function generateX12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', ''); // HHMM
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD for DTP

    // Generate tracking numbers matching UHIN format
    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString()}${Math.floor(Math.random() * 1000)}`;

    // HYBRID STRATEGY: Use Office Ally TPN for Utah Medicaid routing
    const senderTPN = process.env.USE_OFFICE_ALLY_TPN === 'true' ? UHIN_CONFIG.officeAllyTPN : UHIN_CONFIG.tradingPartner;
    
    // X12 270 segments with hybrid TPN strategy
    const segments = [
        `ISA*00*          *00*          *ZZ*${senderTPN} *ZZ*${UHIN_CONFIG.receiverID} *${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${senderTPN}*${UHIN_CONFIG.receiverID}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*0001*005010X279A1~`,
        `BHT*0022*13**${fullDateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${UHIN_CONFIG.receiverID}~`,
        `HL*2*1*21*1~`,
        `NM1*1P*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}***MD*34*${UHIN_CONFIG.providerNPI}~`,
        `HL*3*2*22*0~`,
        `TRN*1*${trackingRef1}*${UHIN_CONFIG.providerNPI}*ELIGIBILITY~`,
        `TRN*1*${trackingRef2}*${senderTPN}*REALTIME~`,
        `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.ssn || patient.medicaidId}~`,
        `DMG*D8*${formattedDOB}*${patient.gender || 'U'}~`,
        `DTP*291*RD8*${fullDateStr}-${fullDateStr}~`,
        `EQ*30~`, // Health Benefit Plan Coverage
        `SE*16*0001~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Generate X12 270 for Office Ally (Direct Integration) - FIXED 999 ERRORS
function generateOfficeAllyX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');
    const id = patient.medicaidId?.trim();
    const ssn = patient.ssn?.replace(/\D/g,''); // 9 digits

    // Fix #4: Choose correct qualifier/id for subscriber
    let subIdQ, subId;
    if (id) { 
        subIdQ = 'MI'; 
        subId = id; 
    } else if (ssn && ssn.length >= 9) { 
        subIdQ = 'SY'; 
        subId = ssn; 
    } else { 
        subIdQ = null; 
        subId = null; 
    }

    // Fix #2: Pad ISA06/ISA08 to 15 characters with spaces
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    // Fix #1: Build segments WITHOUT trailing "~"; we'll join with "~" once
    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    
    // Fix #5: BHT02 must be '13' (Request) not '11' (Response)
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Payer (use OA payer code in NM109 with PI)
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // Fix #3: 2100B: Information Receiver (organization, not patient)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);

    // 2100C: Subscriber (Name/DOB only - SSN/ID causes 999 errors for Utah Medicaid)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    
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

    // Fix #1: Single "~" join + trailing "~" (no double tildes)
    return seg.join('~') + '~';
}

// Generate UUID exactly 36 characters for UHIN PayloadID requirement
function generateUUID36() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate SOAP envelope for UHIN
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString();
    const payloadID = generateUUID36(); // UHIN requires exactly 36 characters

    // Generate unique wsu:Id for UsernameToken (matching approved format)
    const wsuId = `UsernameToken-${Math.floor(Math.random() * 100000000)}`;
    
    return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<soap:Header>
<wsse:Security soap:mustUnderstand="true"
xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken wsu:Id="${wsuId}"
xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<wsse:Username>${UHIN_CONFIG.username}</wsse:Username>
<wsse:Password
Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${UHIN_CONFIG.password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soap:Header>
<soap:Body>
<cor:COREEnvelopeRealTimeRequest>
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${UHIN_CONFIG.tradingPartner}</SenderID>
<ReceiverID>${UHIN_CONFIG.receiverID}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>${x12Payload}</Payload>
</cor:COREEnvelopeRealTimeRequest>
</soap:Body>
</soap:Envelope>`;
}

// Generate SOAP envelope for Office Ally (Direct Integration) ✅
function generateOfficeAllySOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // CCYY-MM-DDTHH:MM:SSZ format
    const payloadID = generateUUID();
    
    // ✅ EXACT SOAP FORMAT per Office Ally Companion Guide (Page 6)
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

// Generate UUID for PayloadID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Send request to UHIN
async function sendUHINRequest(soapRequest) {
    try {
        const response = await fetch(UHIN_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd/COREEnvelopeRealTimeRequest'
            },
            body: soapRequest
        });

        if (!response.ok) {
            throw new Error(`UHIN API error: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        return responseText;
    } catch (error) {
        console.error('UHIN request failed:', error);
        throw error;
    }
}

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
    try {
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

        const responseText = await response.text();
        return responseText;
    } catch (error) {
        console.error('Office Ally request failed:', error);
        throw error;
    }
}

// Parse SOAP response to extract X12 271
function parseSOAPResponse(soapResponse) {
    try {
        // Extract X12 271 from SOAP envelope
        const payloadMatch = soapResponse.match(/<Payload>(.*?)<\/Payload>/s);
        if (!payloadMatch) {
            throw new Error('No payload found in SOAP response');
        }

        return payloadMatch[1].trim();
    } catch (error) {
        console.error('SOAP parsing error:', error);
        throw new Error('Unable to parse SOAP response');
    }
}

// Parse Office Ally SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    try {
        // ✅ Extract X12 271 from CAQH CORE SOAP envelope format
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
        
        if (!payloadMatch) {
            // Log response for debugging
            console.log('🔍 Office Ally SOAP Response (first 1000 chars):', soapResponse.substring(0, 1000));
            throw new Error('No payload found in Office Ally SOAP response');
        }
        
        return payloadMatch[1].trim();
    } catch (error) {
        console.error('Office Ally SOAP parsing error:', error);
        throw new Error('Unable to parse Office Ally SOAP response');
    }
}

// Parse X12 271 eligibility response
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
    
    try {
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
        
        if (ebSegments.length === 0) {
            return {
                enrolled: false,
                error: 'No eligibility information found in response',
                verified: true
            };
        }
        
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
                
                // Look for NM1*77 (Transportation Company)
                const transportCompany = loopSegments.find(s => s.startsWith('NM1*77*'));
                if (transportCompany) {
                    const parts = transportCompany.split('*');
                    result.transportation = {
                        company: parts[3] || 'Unknown Transport Company',
                        id: parts[9] || null
                    };
                }
                
                currentLSIndex = -1;
            }
        });
        
        // Final result summary
        if (result.enrolled) {
            // Determine overall program type
            if (hasActiveTraditional && !hasActiveManagedCare) {
                result.planType = 'Traditional Fee-for-Service';
                result.program = 'Utah Medicaid (Traditional FFS)';
            } else if (hasActiveManagedCare && !hasActiveTraditional) {
                result.planType = 'Managed Care';
                result.program = acoMcoName || 'Utah Medicaid (Managed Care)';
            } else if (hasActiveTraditional && hasActiveManagedCare) {
                result.planType = 'Hybrid (Traditional + Managed Care)';
                result.program = 'Utah Medicaid (Hybrid Coverage)';
            } else {
                // Fallback to generic if we can't determine
                result.planType = 'Standard Medicaid';
                result.program = 'Utah Medicaid';
            }
            
            // Set coverage details
            if (activeCoverageTypes.length > 0) {
                result.details = `Active coverage includes: ${activeCoverageTypes.join(', ')}`;
            } else {
                result.details = 'Active Medicaid coverage verified';
            }
        } else {
            result.error = 'No active Medicaid coverage found';
        }
        
        console.log('✅ Enhanced X12 271 parsing complete:', {
            enrolled: result.enrolled,
            planType: result.planType,
            coverageCount: result.coverage.length,
            hasTransportation: !!result.transportation
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error parsing X12 271 response:', error);
        return {
            enrolled: false,
            error: 'Error parsing eligibility response',
            verified: true
        };
    }
}

// Validate patient data - Office Ally Utah Medicaid Requirements
function validatePatientData(data) {
    const errors = [];

    // REQUIRED: Full name is always required
    if (!data.first?.trim()) errors.push('First name is required');
    if (!data.last?.trim()) errors.push('Last name is required');

    // ACCEPTABLE COMBINATIONS for Utah Medicaid via Office Ally:
    // 1. Name + DOB (minimum requirement - works but less accurate)
    // 2. Name + DOB + SSN (preferred)
    // 3. Name + DOB + Medicaid ID (preferred)
    // 4. Name + SSN + Medicaid ID (without DOB, less common)
    
    const hasDOB = !!data.dob;
    const hasSSN = !!(data.ssn?.trim());
    const hasMedicaidId = !!(data.medicaidId?.trim());
    
    // Must have at least name + one identifier
    if (!hasDOB && !hasSSN && !hasMedicaidId) {
        errors.push('At least one identifier required: Date of Birth, SSN, or Medicaid ID');
    }

    // Validate DOB if provided
    if (data.dob) {
        const dob = new Date(data.dob);
        const now = new Date();
        if (dob > now) errors.push('Date of birth cannot be in the future');
        if (now.getFullYear() - dob.getFullYear() > 120) errors.push('Invalid date of birth');
    }

    // Validate SSN if provided
    if (data.ssn?.trim()) {
        const cleanSSN = data.ssn.replace(/\D/g, '');
        if (cleanSSN.length !== 9) errors.push('SSN must be 9 digits');
        if (cleanSSN === '000000000') errors.push('Invalid SSN');
    }

    // Validate Medicaid ID if provided  
    if (data.medicaidId?.trim()) {
        const cleanId = data.medicaidId.replace(/\D/g, '');
        if (cleanId.length < 8 || cleanId.length > 12) errors.push('Utah Medicaid ID must be 8-12 digits');
    }

    // Log the combination being used for transparency
    if (errors.length === 0) {
        const identifiers = [];
        if (hasDOB) identifiers.push('DOB');
        if (hasSSN) identifiers.push('SSN');
        if (hasMedicaidId) identifiers.push('Medicaid ID');
        
        console.log(`✅ Valid combination: Name + ${identifiers.join(' + ')} ${identifiers.length === 1 ? '(minimum accuracy)' : '(good accuracy)'}`);
    }

    return { valid: errors.length === 0, errors };
}

// SIMULATION MODE (for testing without UHIN credentials)
function simulateEligibilityCheck() {
    const scenarios = [
        {
            weight: 0.7,
            result: {
                enrolled: true,
                program: 'Utah Medicaid Traditional',
                details: 'Active coverage verified via UHIN',
                effectiveDate: new Date().toISOString().slice(0, 10),
                verified: false // Mark as simulation
            }
        },
        {
            weight: 0.2,
            result: {
                enrolled: false,
                error: 'No active Medicaid coverage found',
                verified: false
            }
        },
        {
            weight: 0.1,
            result: {
                enrolled: false,
                error: 'Coverage terminated as of last month',
                verified: false
            }
        }
    ];

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const scenario of scenarios) {
        cumulativeWeight += scenario.weight;
        if (random <= cumulativeWeight) {
            return scenario.result;
        }
    }

    return scenarios[0].result;
}

// OFFICE ALLY SIMULATION MODE (for testing without credentials)
function simulateOfficeAllyEligibilityCheck() {
    const scenarios = [
        {
            weight: 0.65,
            result: {
                enrolled: true,
                program: 'Utah Medicaid Traditional',
                details: 'Active coverage verified via Office Ally',
                effectiveDate: new Date().toISOString().slice(0, 10),
                verified: false // Mark as simulation
            }
        },
        {
            weight: 0.15,
            result: {
                enrolled: true,
                program: 'Utah Medicaid Managed Care',
                details: 'Active coverage verified via Office Ally - Managed Care Plan',
                effectiveDate: new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10), // 30 days ago
                verified: false
            }
        },
        {
            weight: 0.15,
            result: {
                enrolled: false,
                error: 'No active Medicaid coverage found',
                verified: false
            }
        },
        {
            weight: 0.05,
            result: {
                enrolled: false,
                error: 'Coverage suspended - contact Utah Medicaid for details',
                verified: false
            }
        }
    ];

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const scenario of scenarios) {
        cumulativeWeight += scenario.weight;
        if (random <= cumulativeWeight) {
            return scenario.result;
        }
    }

    return scenarios[0].result;
}

// Main handler
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();

    try {
        const { first, last, dob, ssn, medicaidId } = req.body || {};

        const ELIGIBILITY_PROVIDER = getEligibilityProvider();
        const providerName = ELIGIBILITY_PROVIDER.toUpperCase();
        console.log(`🔍 Checking eligibility for ${first} ${last} via ${providerName}`);
        
        // Debug environment variables
        console.log('🔧 Debug - Environment Variables:');
        console.log('OFFICE_ALLY_USERNAME:', process.env.OFFICE_ALLY_USERNAME ? 'SET' : 'NOT SET');
        console.log('OFFICE_ALLY_PASSWORD:', process.env.OFFICE_ALLY_PASSWORD ? 'SET (length: ' + process.env.OFFICE_ALLY_PASSWORD.length + ')' : 'NOT SET');
        console.log('PROVIDER_NPI:', process.env.PROVIDER_NPI || 'NOT SET');
        console.log('ELIGIBILITY_PROVIDER:', process.env.ELIGIBILITY_PROVIDER || 'NOT SET');

        // Validate input data
        console.log('🔍 Input data received:', { first, last, dob, ssn: ssn ? 'PROVIDED' : 'MISSING', medicaidId: medicaidId ? 'PROVIDED' : 'MISSING' });
        
        const validation = validatePatientData({ first, last, dob, ssn, medicaidId });
        console.log('✅ Validation result:', validation);
        
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.errors);
            return res.status(400).json({
                enrolled: false,
                error: validation.errors.join(', '),
                verified: false
            });
        }

        let eligibilityResult;

        // Check if we're in simulation mode (no credentials yet)
        const hasCredentials = ELIGIBILITY_PROVIDER === 'uhin' 
            ? (UHIN_CONFIG.username && UHIN_CONFIG.password)
            : (OFFICE_ALLY_CONFIG.username && OFFICE_ALLY_CONFIG.password);

        if (process.env.SIMULATION_MODE === 'true' || !hasCredentials) {
            console.log(`⏳ Running in SIMULATION mode (no ${providerName} credentials)...`);

            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
            
            // Use appropriate simulation based on provider
            eligibilityResult = ELIGIBILITY_PROVIDER === 'uhin' 
                ? simulateEligibilityCheck() 
                : simulateOfficeAllyEligibilityCheck();

            // Log simulation to database (if available)
            if (pool) {
                try {
                    await pool.query(`
                        INSERT INTO eligibility_log (
                            patient_first_name, patient_last_name, patient_dob,
                            ssn_last_four, medicaid_id, result, is_enrolled,
                            performed_at, processing_time_ms, sftp_filename
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
                    `, [
                        first.trim(), last.trim(), dob,
                        ssn ? ssn.replace(/\D/g, '').slice(-4) : null,
                        medicaidId || null,
                        JSON.stringify(eligibilityResult),
                        eligibilityResult.enrolled,
                        Date.now() - startTime,
                        `sim_${ELIGIBILITY_PROVIDER}_${Date.now()}.xml`
                    ]);
                } catch (dbError) {
                    console.log('Database logging failed (continuing without):', dbError.message);
                }
            }

            console.log(`✅ ${providerName} simulation complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
            return res.json(eligibilityResult);
        }

        // REAL INTEGRATION - Route to appropriate provider
        console.log(`🚀 Processing real ${providerName} eligibility check...`);

        let x12_270, soapRequest, soapResponse, x12_271;

        if (ELIGIBILITY_PROVIDER === 'uhin') {
            // UHIN Integration
            x12_270 = generateX12_270({
                first: first.trim(),
                last: last.trim(),
                dob,
                ssn: ssn?.replace(/\D/g, ''),
                medicaidId,
                gender: 'U'
            });

            soapRequest = generateSOAPRequest(x12_270);
            console.log('📡 Sending request to UHIN...');
            soapResponse = await sendUHINRequest(soapRequest);
            console.log('📨 Received response from UHIN');
            x12_271 = parseSOAPResponse(soapResponse);
        } else {
            // Office Ally Integration
            x12_270 = generateOfficeAllyX12_270({
                first: first.trim(),
                last: last.trim(),
                dob,
                ssn: ssn?.replace(/\D/g, ''),
                medicaidId,
                gender: 'U'
            });

            soapRequest = generateOfficeAllySOAPRequest(x12_270);
            console.log('📡 Sending request to Office Ally...');
            console.log('📋 X12 270 length:', x12_270.length);
            
            try {
                soapResponse = await sendOfficeAllyRequest(soapRequest);
                console.log('📨 Received response from Office Ally (length:', soapResponse.length, ')');
                x12_271 = parseOfficeAllySOAPResponse(soapResponse);
                console.log('✅ X12 271 parsed successfully (length:', x12_271.length, ')');
                
                // 🔍 RAW X12 271 RESPONSE - For debugging and analysis
                console.log('\n' + '='.repeat(80));
                console.log('🔍 RAW X12 271 RESPONSE FROM OFFICE ALLY:');
                console.log('='.repeat(80));
                console.log(x12_271);
                console.log('='.repeat(80) + '\n');
                
                // Save raw X12 to file for easy access
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `raw_x12_271_${timestamp}.txt`;
                fs.writeFileSync(filename, x12_271);
                console.log(`📄 Raw X12 271 saved to: ${filename}`);
                
            } catch (officeAllyError) {
                console.error('❌ Office Ally request failed:', officeAllyError.message);
                throw new Error(`Office Ally API error: ${officeAllyError.message}`);
            }
        }

        // Parse eligibility result (same X12 271 format for both providers)
        eligibilityResult = parseX12_271(x12_271);
        
        // ✨ ENHANCED: Add network status verification via Supabase cross-reference
        try {
            const networkIntegration = require('../../supabase_network_integration');
            const enhancedResult = await networkIntegration.checkEligibilityWithNetworkStatus(
                { first, last, dob, state: 'UT' }, 
                x12_271
            );
            
            // Merge enhanced network data with existing eligibility result
            eligibilityResult = {
                ...eligibilityResult,
                networkStatus: enhancedResult.networkStatus,
                contractStatus: enhancedResult.contractStatus,
                contractedPayerName: enhancedResult.contractedPayerName,
                contractMessage: enhancedResult.contractMessage,
                canSchedule: enhancedResult.canSchedule,
                requiresAttending: enhancedResult.requiresAttending,
                allowsSupervised: enhancedResult.allowsSupervised,
                officeAllyPayerId: enhancedResult.officeAllyPayerId,
                officeAllyPayerName: enhancedResult.officeAllyPayerName
            };
            
            console.log(`🎯 Network Status: ${enhancedResult.networkStatus} - ${enhancedResult.contractMessage}`);
            
        } catch (networkError) {
            console.error('⚠️ Network status verification failed:', networkError.message);
            // Continue without network info rather than failing the whole request
        }

        // Log to database with full audit trail (if available)
        if (pool) {
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
                    x12_270, x12_271, `${ELIGIBILITY_PROVIDER}_${Date.now()}.xml`,
                    JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
                    Date.now() - startTime
                ]);
            } catch (dbError) {
                console.log('Database logging failed (continuing without):', dbError.message);
            }
        }

        console.log(`✅ ${providerName} eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);

        res.json(eligibilityResult);

    } catch (error) {
        console.error(`❌ ${getEligibilityProvider().toUpperCase()} eligibility check failed:`, error);

        // Log error to database (if available)
        if (pool) {
            try {
                await pool.query(`
                    INSERT INTO eligibility_log (
                        patient_first_name, patient_last_name, patient_dob,
                        result, is_enrolled, error_message, performed_at, processing_time_ms
                    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
                `, [
                    req.body?.first || 'Unknown',
                    req.body?.last || 'Unknown',
                    req.body?.dob || null,
                    JSON.stringify({ error: error.message }),
                    false,
                    error.message,
                    Date.now() - startTime
                ]);
            } catch (logError) {
                console.log('Database error logging failed (continuing without):', logError.message);
            }
        }

        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false
        });
    }
};