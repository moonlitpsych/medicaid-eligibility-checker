// Quick UHIN connection test (no database)
require('dotenv').config({ path: '.env.local' });

const UHIN_CONFIG = {
    endpoint: 'https://ws.uhin.org/webservices/core/soaptype4.asmx',
    tradingPartner: 'HT009582-001',
    receiverID: 'HT000004-001',
    username: process.env.UHIN_USERNAME,
    password: process.env.UHIN_PASSWORD,
    providerNPI: '1234567890',
    providerName: 'MOONLIT_PLLC'
};

console.log('🔍 UHIN Configuration Check:');
console.log('Username:', UHIN_CONFIG.username ? '✅ Set' : '❌ Missing');
console.log('Password:', UHIN_CONFIG.password ? '✅ Set' : '❌ Missing');
console.log('Endpoint:', UHIN_CONFIG.endpoint);

// Generate X12 270
function generateX12_270() {
    const controlNumber = Date.now().toString().slice(-9);
    const dateStr = '250828'; // YYMMDD
    const timeStr = '1430'; // HHMM

    const segments = [
        `ISA*00*          *00*          *ZZ*${UHIN_CONFIG.tradingPartner} *ZZ*${UHIN_CONFIG.receiverID} *${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${UHIN_CONFIG.tradingPartner}*${UHIN_CONFIG.receiverID}*${dateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*0001*005010X279A1~`,
        `BHT*0022*13**${dateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${UHIN_CONFIG.receiverID}~`,
        `HL*2*1*21*1~`,
        `NM1*1P*1*DOE*JOHN***MD*34*${UHIN_CONFIG.providerNPI}~`,
        `HL*3*2*22*0~`,
        `TRN*1*${controlNumber}*${UHIN_CONFIG.providerNPI}*REALTIME~`,
        `NM1*IL*1*DOE*JOHN****MI*123456789~`,
        `DMG*D8*19900101*U~`,
        `EQ*30~`,
        `SE*14*0001~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Generate SOAP envelope
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString();
    // Generate UUID exactly 36 characters for UHIN PayloadID requirement
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

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

async function testUHIN() {
    if (!UHIN_CONFIG.username || !UHIN_CONFIG.password) {
        console.log('❌ Missing UHIN credentials');
        return;
    }

    try {
        console.log('\n🚀 Testing UHIN connection...');
        
        const x12_270 = generateX12_270();
        const soapRequest = generateSOAPRequest(x12_270);
        
        console.log('📡 Sending test request to UHIN...');
        
        const response = await fetch(UHIN_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd/COREEnvelopeRealTimeRequest'
            },
            body: soapRequest
        });

        console.log('📨 Response Status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ UHIN Error Response:', errorText.substring(0, 500));
            return;
        }

        const responseText = await response.text();
        console.log('✅ UHIN Connection Successful!');
        console.log('📋 Response Preview:', responseText.substring(0, 200) + '...');

        // Try to extract result
        const payloadMatch = responseText.match(/<Payload>(.*?)<\/Payload>/s);
        if (payloadMatch) {
            const x12_271 = payloadMatch[1];
            console.log('📄 X12 271 Response:', x12_271.substring(0, 200) + '...');
        }

    } catch (error) {
        console.error('❌ UHIN Test Failed:', error.message);
    }
}

testUHIN();