// UHIN Utah Medicaid Test - Using official test TPN from companion guide
require('dotenv').config({ path: '.env.local' });

const UHIN_TEST_CONFIG = {
    endpoint: 'https://ws.uhin.org/webservices/core/soaptype4.asmx',
    tradingPartner: 'HT009582-001', // Our UHIN TPN
    receiverID: 'HT000004-003', // Utah Medicaid TEST environment
    username: process.env.UHIN_USERNAME,
    password: process.env.UHIN_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1275348807', // Using Jeremy's NPI from approved sample
    providerName: 'MOONLIT_PLLC'
};

console.log('🧪 UTAH MEDICAID TEST CONFIGURATION:');
console.log('Testing Mode: Using Production TPN with Test Flag');
console.log('Sender ID (Our TPN):', UHIN_TEST_CONFIG.tradingPartner);
console.log('Receiver ID (UT Test):', UHIN_TEST_CONFIG.receiverID);
console.log('Username:', UHIN_TEST_CONFIG.username ? '✅ Set' : '❌ Missing');
console.log('Password:', UHIN_TEST_CONFIG.password ? '✅ Set' : '❌ Missing');
console.log('Provider NPI:', UHIN_TEST_CONFIG.providerNPI);
console.log('Endpoint:', UHIN_TEST_CONFIG.endpoint);

// Generate X12 270 exactly matching Utah Medicaid requirements
function generateUtahMedicaidX12_270() {
    const controlNumber = Date.now().toString().slice(-9);
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD  
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', ''); // HHMM
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Generate tracking numbers matching approved sample format
    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString()}${Math.floor(Math.random() * 1000)}`;

    // X12 270 segments matching Utah Medicaid companion guide requirements
    const segments = [
        // ISA - Use TEST receiver ID 
        `ISA*00*          *00*          *ZZ*${UHIN_TEST_CONFIG.tradingPartner} *ZZ*${UHIN_TEST_CONFIG.receiverID} *${dateStr}*${timeStr}*^*00501*${controlNumber}*1*T*:~`,
        // GS - Test environment
        `GS*HS*${UHIN_TEST_CONFIG.tradingPartner}*${UHIN_TEST_CONFIG.receiverID}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        // ST
        `ST*270*0001*005010X279A1~`,
        // BHT
        `BHT*0022*13**${fullDateStr}*${timeStr}~`,
        // HL*1 - Payer
        `HL*1**20*1~`,
        // NM1 - Payer (Utah Medicaid)
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${UHIN_TEST_CONFIG.receiverID}~`,
        // HL*2 - Information Source (Provider)
        `HL*2*1*21*1~`,
        // NM1 - Provider 
        `NM1*1P*1*MONTOYA*JEREMY***MD*34*${UHIN_TEST_CONFIG.providerNPI}~`,
        // HL*3 - Information Receiver (Patient)
        `HL*3*2*22*0~`,
        // TRN - Trace Number
        `TRN*1*${trackingRef1}*${UHIN_TEST_CONFIG.providerNPI}*ELIGIBILITY~`,
        // TRN - Additional trace (matching approved format)
        `TRN*1*${trackingRef2}*${UHIN_TEST_CONFIG.tradingPartner}*REALTIME~`,
        // NM1 - Patient (using test data from approved sample)
        `NM1*IL*1*MONTOYA*JEREMY****MI*0900412827~`,
        // DMG - Demographics  
        `DMG*D8*19840717*M~`,
        // DTP - Service date range
        `DTP*291*RD8*${fullDateStr}-${fullDateStr}~`,
        // EQ - Eligibility inquiry (Health Benefit Plan Coverage)
        `EQ*30~`,
        // SE
        `SE*16*0001~`,
        // GE
        `GE*1*${controlNumber}~`,
        // IEA
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Generate UUID exactly 36 characters for UHIN PayloadID requirement
function generateUUID36() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate SOAP envelope for Utah Medicaid Test Environment
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString();
    const payloadID = generateUUID36(); // Exactly 36 chars as required

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" 
               xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
    <soap:Header>
        <wsse:Security soap:mustUnderstand="true" 
                       xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                <wsse:Username>${UHIN_TEST_CONFIG.username}</wsse:Username>
                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${UHIN_TEST_CONFIG.password}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <cor:COREEnvelopeRealTimeRequest>
            <PayloadType>X12_270_Request_005010X279A1</PayloadType>
            <ProcessingMode>RealTime</ProcessingMode>
            <PayloadID>${payloadID}</PayloadID>
            <TimeStamp>${timestamp}</TimeStamp>
            <SenderID>${UHIN_TEST_CONFIG.tradingPartner}</SenderID>
            <ReceiverID>${UHIN_TEST_CONFIG.receiverID}</ReceiverID>
            <CORERuleVersion>2.2.0</CORERuleVersion>
            <Payload>${x12Payload}</Payload>
        </cor:COREEnvelopeRealTimeRequest>
    </soap:Body>
</soap:Envelope>`;
}

// Enhanced parsing of X12 271 response
function parseX12_271(x12Data) {
    console.log('\n📋 PARSING X12 271 RESPONSE:');
    
    const lines = x12Data.split(/[~\n]/);
    console.log('Total segments found:', lines.filter(l => l.trim()).length);
    
    // Look for key segments
    const segments = {
        ISA: lines.find(line => line.startsWith('ISA')),
        BHT: lines.find(line => line.startsWith('BHT')),
        EB: lines.filter(line => line.startsWith('EB')),
        AAA: lines.filter(line => line.startsWith('AAA')),
        TRN: lines.filter(line => line.startsWith('TRN'))
    };
    
    console.log('Key segments found:');
    Object.entries(segments).forEach(([type, data]) => {
        if (Array.isArray(data)) {
            console.log(`  ${type}: ${data.length} segments`);
            data.forEach((seg, i) => console.log(`    ${i+1}: ${seg}`));
        } else if (data) {
            console.log(`  ${type}: ${data}`);
        }
    });
    
    // Parse EB segments for eligibility
    if (segments.EB && segments.EB.length > 0) {
        console.log('\n🔍 ELIGIBILITY ANALYSIS:');
        segments.EB.forEach((ebSegment, i) => {
            const parts = ebSegment.split('*');
            const eligibilityCode = parts[1];
            const serviceType = parts[3];
            
            console.log(`  EB Segment ${i+1}:`);
            console.log(`    Eligibility Code: ${eligibilityCode}`);
            console.log(`    Service Type: ${serviceType || 'Not specified'}`);
            
            // Standard eligibility codes
            const codes = {
                '1': 'Active Coverage',
                '2': 'Active - Full Risk Capitation',
                '3': 'Active - Services Capitated',
                '4': 'Active - Services Capitated to Primary Care Physician',
                '5': 'Active - Pending Investigation',
                '6': 'Inactive',
                '7': 'Inactive - Pending Eligibility Update',
                '8': 'Inactive - Pending Investigation',
                'A': 'Co-Insurance',
                'B': 'Deductible',
                'C': 'Coverage Basis'
            };
            
            console.log(`    Status: ${codes[eligibilityCode] || 'Unknown code'}`);
        });
    }
    
    // Check for error codes
    if (segments.AAA && segments.AAA.length > 0) {
        console.log('\n⚠️ ERROR/REJECTION CODES:');
        segments.AAA.forEach(aaaSegment => {
            console.log(`  ${aaaSegment}`);
        });
    }
    
    return segments;
}

async function testUtahMedicaid() {
    if (!UHIN_TEST_CONFIG.username || !UHIN_TEST_CONFIG.password) {
        console.log('❌ Missing UHIN credentials - check .env.local file');
        return;
    }

    try {
        console.log('\n🚀 TESTING UTAH MEDICAID via UHIN...');
        console.log('Using Production TPN with Test Flag (T) in ISA segment');
        
        const x12_270 = generateUtahMedicaidX12_270();
        console.log('\n📄 Generated X12 270 Request:');
        console.log('First 200 chars:', x12_270.substring(0, 200) + '...');
        
        const soapRequest = generateSOAPRequest(x12_270);
        
        console.log('\n📡 Sending test request to UHIN...');
        console.log('SOAP envelope size:', soapRequest.length, 'bytes');
        
        const response = await fetch(UHIN_TEST_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd/COREEnvelopeRealTimeRequest'
            },
            body: soapRequest
        });

        console.log('\n📨 UHIN Response:');
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Response size:', responseText.length, 'bytes');

        if (!response.ok) {
            console.log('\n❌ UHIN ERROR RESPONSE:');
            console.log(responseText);
            return;
        }

        console.log('\n✅ UHIN CONNECTION SUCCESSFUL!');
        
        // Try to extract X12 271 from SOAP response
        const payloadMatch = responseText.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
        if (payloadMatch) {
            const x12_271 = payloadMatch[1].trim();
            console.log('\n🎉 X12 271 RESPONSE RECEIVED!');
            console.log('X12 271 length:', x12_271.length, 'bytes');
            
            // Parse the response
            parseX12_271(x12_271);
            
            console.log('\n📄 RAW X12 271 RESPONSE:');
            console.log(x12_271);
            
        } else {
            console.log('\n⚠️ No X12 271 payload found in response');
            console.log('Full response:', responseText);
        }

    } catch (error) {
        console.error('\n❌ UTAH MEDICAID TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
console.log('🧪 STARTING UTAH MEDICAID TEST...\n');
testUtahMedicaid();