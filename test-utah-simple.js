// test-utah-simple.js - Test using EXACT working format from test-office-ally-final.js
require('dotenv').config();

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***',
    senderID: '1161680',
    receiverID: 'OFFALLY',
    payerID: 'UTMCD'
};

// EXACT COPY from test-office-ally-final.js - NO CHANGES
function generateWorkingX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Payer
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // 2100B: Information Receiver (organization)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`);

    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

// EXACT COPY from test-office-ally-final.js - NO CHANGES
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
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

// Simple test with minimal parsing
async function testSimple() {
    const fetch = (await import('node-fetch')).default;
    
    const patient = {
        first: 'Jeremy',
        last: 'Montoya', 
        dob: '1984-07-17',
        gender: 'M'
    };
    
    const x12_270 = generateWorkingX12_270(patient);
    const soapRequest = generateSOAPRequest(x12_270);
    
    console.log(`🔍 Testing Jeremy Montoya with EXACT working format...`);
    console.log(`📋 X12 270 Generated: ${x12_270.substring(0, 100)}...`);
    
    const startTime = Date.now();
    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });
    
    const responseTime = Date.now() - startTime;
    const soapResponse = await response.text();
    
    // Parse X12 271 response
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
    
    if (!payloadMatch) {
        console.log('❌ No payload found in SOAP response');
        return;
    }
    
    const x12_271 = payloadMatch[1].trim();
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📨 Response Type: ${x12_271.includes('X12_271_Response') ? 'X12 271 ✅' : 'X12 999 ❌'}`);
    console.log(`📋 First 200 chars: ${x12_271.substring(0, 200)}`);
    
    if (x12_271.includes('ST*271*')) {
        console.log(`✅ SUCCESS: Valid X12 271 response received!`);
        
        // Check for eligibility
        const ebSegments = x12_271.match(/EB\*([^~]*)/g) || [];
        if (ebSegments.length > 0) {
            console.log(`🎉 ENROLLED: Found ${ebSegments.length} eligibility segments`);
            if (x12_271.includes('TARGETED ADULT MEDICAID')) {
                console.log(`📋 Program: Utah Medicaid - Targeted Adult`);
            }
        }
    } else {
        console.log(`❌ ERROR: Not a valid X12 271 response`);
    }
}

if (require.main === module) {
    testSimple().catch(console.error);
}