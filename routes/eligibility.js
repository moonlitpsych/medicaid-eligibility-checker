// routes/eligibility.js - Express route for eligibility checking
const { pool } = require('../api/_db');

// Provider Configuration - Office Ally or UHIN based on environment
function getEligibilityProvider() {
    return process.env.ELIGIBILITY_PROVIDER || 'office_ally';
}

// OFFICE ALLY CONFIG
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: '1161680', 
    username: 'moonlit',
    password: '***REDACTED-OLD-OA-PASSWORD***',
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC',
    isa06: '1161680',
    isa08: 'OFFALLY', 
    gs02: '1161680', 
    gs03: 'OFFALLY',
    payerID: 'SKUT0'
};

// Generate X12 270 for Office Ally
function generateOfficeAllyX12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');

    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100000)}`;

    return `ISA*00*          *00*          *ZZ*${OFFICE_ALLY_CONFIG.isa06.padEnd(15)}*ZZ*${OFFICE_ALLY_CONFIG.isa08.padEnd(15)}*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~GS*HS*${OFFICE_ALLY_CONFIG.gs02}*${OFFICE_ALLY_CONFIG.gs03}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~ST*270*${controlNumber}*005010X279A1~BHT*0022*13**${fullDateStr}*${timeStr}~HL*1**20*1~NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~HL*2*1*21*1~NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~HL*3*2*22*0~TRN*1*${trackingRef1}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~TRN*1*${trackingRef2}*${OFFICE_ALLY_CONFIG.isa06}*REALTIME~NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}***MI*${patient.ssn || 'UNKNOWN'}~DMG*D8*${formattedDOB}*${patient.gender || 'U'}~EQ*30~SE*${controlNumber.length + 15}*${controlNumber}~GE*1*${controlNumber}~IEA*1*${controlNumber}~`;
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

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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

// Parse Office Ally SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    try {
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
        
        if (!payloadMatch) {
            console.log('🔍 Office Ally SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
            throw new Error('No payload found in Office Ally SOAP response');
        }
        
        return payloadMatch[1].trim();
    } catch (error) {
        console.error('Office Ally SOAP parsing error:', error);
        throw new Error('Unable to parse Office Ally SOAP response');
    }
}

// Parse X12 271 response
function parseX12_271(x12Data) {
    const lines = x12Data.split(/[~\n]/);
    
    try {
        const result = {
            enrolled: false,
            program: '',
            effectiveDate: '',
            details: '',
            verified: true,
            error: ''
        };

        // Look for eligibility segments
        for (const line of lines) {
            if (line.startsWith('EB*')) {
                const segments = line.split('*');
                if (segments[1] === '1' || segments[1] === '6') {
                    result.enrolled = true;
                    result.program = 'Utah Medicaid';
                    result.details = 'Active Medicaid coverage';
                }
            }
            
            if (line.startsWith('AAA*') && line.includes('*N*')) {
                result.enrolled = false;
                result.error = 'No active Medicaid coverage found';
            }
        }

        if (!result.enrolled && !result.error) {
            result.error = 'No active Medicaid coverage found';
        }

        return result;
    } catch (error) {
        console.error('X12 271 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            verified: true
        };
    }
}

// Main eligibility check handler
async function checkEligibility(req, res) {
    const startTime = Date.now();
    console.log(`🔍 Checking eligibility for ${req.body.first} ${req.body.last} via ${getEligibilityProvider().toUpperCase()}`);
    
    try {
        const { first, last, dob, ssn, medicaidId, gender } = req.body;

        // Validate required fields
        if (!first || !last || !dob) {
            return res.status(400).json({
                error: 'Missing required fields: first, last, dob',
                enrolled: false,
                verified: false
            });
        }

        // Generate X12 270 request
        const x12_270 = generateOfficeAllyX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            ssn: ssn?.replace(/\D/g, ''),
            medicaidId,
            gender: gender || 'U'
        });

        // Generate SOAP request
        const soapRequest = generateOfficeAllySOAPRequest(x12_270);
        
        console.log('🚀 Processing real OFFICE_ALLY eligibility check...');
        console.log('📡 Sending request to Office Ally...');
        
        // Send request
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        console.log('📨 Received response from Office Ally');
        
        // Parse response
        const x12_271 = parseOfficeAllySOAPResponse(soapResponse);
        const eligibilityResult = parseX12_271(x12_271);

        // Log to database
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
}

module.exports = checkEligibility;