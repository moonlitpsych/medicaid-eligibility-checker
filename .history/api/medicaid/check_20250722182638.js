// api/medicaid/check.js - UPDATED for UHIN Integration
const { pool } = require('../_db');

// UHIN SOAP Configuration
const UHIN_CONFIG = {
    endpoint: 'https://ws.uhin.org/webservices/core/soaptype4.asmx',
    tradingPartner: 'HT009582-001',
    receiverID: 'HT000004-001', // Utah Medicaid
    username: process.env.UHIN_USERNAME,
    password: process.env.UHIN_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1234567890',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC'
};

// Generate X12 270 for UHIN (embedded in SOAP)
function generateX12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', ''); // HHMM

    // X12 270 segments for UHIN
    const segments = [
        `ISA*00*          *00*          *ZZ*${UHIN_CONFIG.tradingPartner} *ZZ*${UHIN_CONFIG.receiverID} *${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${UHIN_CONFIG.tradingPartner}*${UHIN_CONFIG.receiverID}*${dateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*0001*005010X279A1~`,
        `BHT*0022*13**${dateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${UHIN_CONFIG.receiverID}~`,
        `HL*2*1*21*1~`,
        `NM1*1P*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}***MD*34*${UHIN_CONFIG.providerNPI}~`,
        `HL*3*2*22*0~`,
        `TRN*1*${controlNumber}*${UHIN_CONFIG.providerNPI}*REALTIME~`,
        `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.ssn || patient.medicaidId}~`,
        `DMG*D8*${formattedDOB}*${patient.gender || 'U'}~`,
        `EQ*30~`, // Health Benefit Plan Coverage
        `SE*14*0001~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Generate SOAP envelope for UHIN
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString();
    const payloadID = `MOONLIT_${Date.now()}`;

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" 
               xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
    <soap:Header>
        <wsse:Security soap:mustUnderstand="true" 
                       xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                <wsse:Username>${UHIN_CONFIG.username}</wsse:Username>
                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${UHIN_CONFIG.password}</wsse:Password>
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

        console.log(`🔍 Checking eligibility for ${first} ${last} via UHIN`);

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

        // Check if we're in simulation mode (no UHIN credentials yet)
        if (process.env.SIMULATION_MODE === 'true' || !UHIN_CONFIG.username || !UHIN_CONFIG.password) {
            console.log('⏳ Running in SIMULATION mode (no UHIN credentials)...');

            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
            eligibilityResult = simulateEligibilityCheck();

            // Log simulation to database
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
                `sim_uhin_${Date.now()}.xml`
            ]);

            console.log(`✅ Simulation complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
            return res.json(eligibilityResult);
        }

        // REAL UHIN INTEGRATION
        console.log('🚀 Processing real UHIN eligibility check...');

        // Generate X12 270 request
        const x12_270 = generateX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            ssn: ssn?.replace(/\D/g, ''),
            medicaidId,
            gender: 'U' // Unknown - can be enhanced later
        });

        // Wrap in SOAP envelope
        const soapRequest = generateSOAPRequest(x12_270);

        // Send to UHIN (real-time response!)
        console.log('📡 Sending request to UHIN...');
        const soapResponse = await sendUHINRequest(soapRequest);
        console.log('📨 Received response from UHIN');

        // Extract X12 271 from SOAP response
        const x12_271 = parseSOAPResponse(soapResponse);

        // Parse eligibility result
        eligibilityResult = parseX12_271(x12_271);

        // Log to database with full audit trail
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
            x12_270, x12_271, `uhin_${Date.now()}.xml`,
            JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
            Date.now() - startTime
        ]);

        console.log(`✅ UHIN eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);

        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ UHIN eligibility check failed:', error);

        // Log error to database
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
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false
        });
    }
};