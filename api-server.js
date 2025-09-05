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
    username: 'moonlit',
    password: '***REDACTED-OLD-OA-PASSWORD***',
    providerNPI: '1275348807',
    providerName: 'MOONLIT_PLLC',
    isa06: '1161680',
    isa08: 'OFFALLY',
    gs02: '1161680',
    gs03: 'OFFALLY',
    payerID: 'UTMCD' // ✅ Correct Office Ally payer ID for Utah Medicaid eligibility
};

// Generate UUID for PayloadID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate X12 270 for Office Ally - Clean implementation per Office Ally Companion Guide
function generateOfficeAllyX12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    
    // Date/Time formatting per Office Ally specs
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', ''); // HHMM
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, ''); // CCYYMMDD
    
    // Tracking reference for eligibility inquiry
    const trackingRef = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 100000)}`;
    
    // ISA segment - per Office Ally Companion Guide page 12
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ', // Auth info
        'ZZ', OFFICE_ALLY_CONFIG.isa06.padEnd(15).substring(0, 15), // Sender ID (padded to 15)
        '01', 'OFFALLY        ', // Receiver ID (01 per guide, OFFALLY padded to 15)
        dateStr, timeStr, '^', '00501', controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    // GS segment - per Office Ally Companion Guide page 13
    const gsSegment = [
        'GS', 'HS', // HS for 270 per guide
        OFFICE_ALLY_CONFIG.gs02,
        'OFFALLY',
        fullDateStr, timeStr, controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    // ST segment
    const stSegment = `ST*270*${controlNumber}*005010X279A1~`;
    
    // BHT segment
    const bhtSegment = `BHT*0022*13**${fullDateStr}*${timeStr}~`;
    
    // HL segments for hierarchical structure
    const hl1Segment = 'HL*1**20*1~'; // Payer level
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~'; // Provider level
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~'; // Subscriber level
    const trnSegment = `TRN*1*${trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    // Patient identification - Office Ally format per companion guide
    let nm1SubscriberSegment;
    if (patient.medicaidId && patient.medicaidId.trim()) {
        // Use Medicaid ID if provided - format per Office Ally guide
        nm1SubscriberSegment = `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.medicaidId.trim()}~`;
    } else if (patient.ssn && patient.ssn.trim() && patient.ssn.length >= 9) {
        // Use SSN if provided and valid
        nm1SubscriberSegment = `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****SY*${patient.ssn}~`;
    } else {
        // No member ID - name/DOB matching only with all required fields
        nm1SubscriberSegment = `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}*****~`;
    }
    
    // DMG segment for demographics - omit gender if not provided or unknown
    let dmgSegment = `DMG*D8*${formattedDOB}`;
    if (patient.gender && patient.gender !== 'U' && (patient.gender === 'M' || patient.gender === 'F')) {
        dmgSegment += `*${patient.gender}`;
    }
    dmgSegment += '~';
    
    // EQ segment for eligibility inquiry
    const eqSegment = 'EQ*30~'; // 30 = general eligibility
    
    // Calculate segment count (all segments between ST and SE, inclusive)
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1; // +1 for SE segment itself
    
    // SE segment
    const seSegment = `SE*${segmentCount}*${controlNumber}~`;
    
    // GE segment
    const geSegment = `GE*1*${controlNumber}~`;
    
    // IEA segment
    const ieaSegment = `IEA*1*${controlNumber}~`;
    
    // Assemble complete X12 270
    return isaSegment + gsSegment + stSegment + bhtSegment + hl1Segment + nm1PrSegment + hl2Segment + nm1ProviderSegment + hl3Segment + trnSegment + nm1SubscriberSegment + dmgSegment + eqSegment + seSegment + geSegment + ieaSegment;
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

// Parse X12 271 response
function parseX12_271(x12Data) {
    const result = {
        enrolled: false,
        program: '',
        effectiveDate: '',
        details: '',
        verified: true,
        error: ''
    };

    const lines = x12Data.split(/[~\n]/);
    
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