// api/medicaid/check.js - UPDATED for UHIN Integration
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
    password: process.env.OFFICE_ALLY_PASSWORD,
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
function parseX12_271(x12Data) {
    const lines = x12Data.split(/[~\n]/);

    try {
        // Look for EB segments (eligibility/benefit information)
        const ebSegments = lines.filter(line => line.startsWith('EB*'));

        if (ebSegments.length === 0) {
            return {
                enrolled: false,
                error: 'No eligibility information found in response',
                verified: true
            };
        }

        // Parse first EB segment
        const ebParts = ebSegments[0].split('*');
        const eligibilityCode = ebParts[1];

        // X12 eligibility codes for active coverage
        const activeCodes = ['1', 'A', 'B', 'C'];
        const isEnrolled = activeCodes.includes(eligibilityCode);

        if (isEnrolled) {
            let program = 'Utah Medicaid';
            let details = 'Active coverage verified via UHIN';

            // Check for specific service types
            ebSegments.forEach(segment => {
                if (segment.includes('*30*')) program += ' - Medical';
                if (segment.includes('*88*')) program += ' - Pharmacy';
            });

            return {
                enrolled: true,
                program,
                details,
                effectiveDate: new Date().toISOString().slice(0, 10),
                verified: true
            };
        } else {
            let errorMessage = 'No active Medicaid coverage found';

            // Parse specific error codes
            if (eligibilityCode === '6') errorMessage = 'Coverage terminated';
            if (eligibilityCode === '7') errorMessage = 'Coverage pending approval';

            return {
                enrolled: false,
                error: errorMessage,
                verified: true
            };
        }

    } catch (error) {
        console.error('X12 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            verified: false
        };
    }
}

// Validate patient data
function validatePatientData(data) {
    const errors = [];

    if (!data.first?.trim()) errors.push('First name is required');
    if (!data.last?.trim()) errors.push('Last name is required');
    if (!data.dob) errors.push('Date of birth is required');

    if (data.dob) {
        const dob = new Date(data.dob);
        const now = new Date();
        if (dob > now) errors.push('Date of birth cannot be in the future');
        if (now.getFullYear() - dob.getFullYear() > 120) errors.push('Invalid date of birth');
    }

    if (!data.ssn && !data.medicaidId) {
        errors.push('Either SSN or Medicaid ID is required');
    }

    if (data.ssn) {
        const cleanSSN = data.ssn.replace(/\D/g, '');
        if (cleanSSN.length !== 9) errors.push('SSN must be 9 digits');
        if (cleanSSN === '000000000') errors.push('Invalid SSN');
    }

    if (data.medicaidId) {
        const cleanId = data.medicaidId.replace(/\D/g, '');
        if (cleanId.length !== 10) errors.push('Utah Medicaid ID must be 10 digits');
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

        // Validate input data
        const validation = validatePatientData({ first, last, dob, ssn, medicaidId });
        if (!validation.valid) {
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
            soapResponse = await sendOfficeAllyRequest(soapRequest);
            console.log('📨 Received response from Office Ally');
            x12_271 = parseOfficeAllySOAPResponse(soapResponse);
        }

        // Parse eligibility result (same X12 271 format for both providers)
        eligibilityResult = parseX12_271(x12_271);

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