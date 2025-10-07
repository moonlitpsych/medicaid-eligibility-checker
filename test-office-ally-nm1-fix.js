// test-office-ally-nm1-fix.js - Fix NM1*IL segment format based on 999 error analysis
require('dotenv').config();

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    senderID: process.env.OFFICE_ALLY_SENDER_ID,
    receiverID: 'OFFALLY',
    payerID: 'UTMCD'
};

// Test different NM1*IL segment formats
function generateTestX12_270Variations(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');
    const ssn = patient.ssn?.replace(/\D/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('[REDACTED-SENDER-ID]');
    const ISA08 = pad15('OFFALLY');

    const baseSegments = [
        `ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`,
        `GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`,
        `ST*270*0001*005010X279A1`,
        `BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`,
        `HL*1**20*1`,
        `NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`,
        `HL*2*1*21*1`,
        `NM1*1P*2*MOONLIT PLLC*****XX*1275348807`,
        `HL*3*2*22*0`,
        `TRN*1*${ctrl}*1275348807*ELIGIBILITY`
    ];

    // Test different NM1*IL formats
    const variations = [
        {
            name: "Original Format",
            nm1: `NM1*IL*1*${patient.last}*${patient.first}*****SY*${ssn}`
        },
        {
            name: "With Middle Name Placeholder",
            nm1: `NM1*IL*1*${patient.last}*${patient.first}****SY*${ssn}`
        },
        {
            name: "Compact Format",
            nm1: `NM1*IL*1*${patient.last}*${patient.first}***SY*${ssn}`
        },
        {
            name: "Full 11-Element Format",
            nm1: `NM1*IL*1*${patient.last}*${patient.first}****SY*${ssn}`
        },
        {
            name: "No ID Qualifier (Name/DOB only)",
            nm1: `NM1*IL*1*${patient.last}*${patient.first}`
        }
    ];

    return variations.map(variant => {
        const segments = [...baseSegments];
        segments.push(variant.nm1);
        segments.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
        segments.push(`DTP*291*D8*${ccyymmdd}`);
        segments.push(`EQ*30`);

        const stIndex = segments.findIndex(s => s.startsWith('ST*'));
        const count = segments.length - stIndex + 1;
        segments.push(`SE*${count}*0001`);
        segments.push(`GE*1*${ctrl}`);
        segments.push(`IEA*1*${ctrl}`);

        return {
            name: variant.name,
            x12: segments.join('~') + '~',
            nm1Segment: variant.nm1
        };
    });
}

// Generate SOAP request
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

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
    const fetch = (await import('node-fetch')).default;
    
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

// Parse response
function parseSOAPResponse(soapResponse) {
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
    
    if (!payloadMatch) {
        return soapResponse.substring(0, 500) + '...';
    }
    
    return payloadMatch[1].trim();
}

// Test all variations
async function testNM1Variations() {
    const patient = {
        first: 'JEREMY',
        last: 'MONTOYA', 
        dob: '1984-07-17',
        ssn: '123456789',
        gender: 'M'
    };

    console.log('\n🔬 TESTING NM1*IL SEGMENT VARIATIONS');
    console.log('='.repeat(60));
    console.log('Analyzing 999 error: IK3*NM1*9**8, IK4*10*706*7*123456789');
    console.log('Focus: NM1*IL subscriber segment format\n');

    const variations = generateTestX12_270Variations(patient);
    
    for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        
        console.log(`\n📋 Test ${i+1}: ${variation.name}`);
        console.log(`NM1*IL segment: ${variation.nm1Segment}`);
        
        try {
            const soapRequest = generateSOAPRequest(variation.x12);
            const startTime = Date.now();
            const soapResponse = await sendOfficeAllyRequest(soapRequest);
            const responseTime = Date.now() - startTime;
            const x12Response = parseSOAPResponse(soapResponse);
            
            console.log(`⏱️  Response time: ${responseTime}ms`);
            
            if (x12Response.includes('999*')) {
                console.log('❌ 999 Validation Error');
                
                // Extract specific errors
                const ik3Match = x12Response.match(/IK3\*([^~]*)/g);
                const ik4Match = x12Response.match(/IK4\*([^~]*)/g);
                
                if (ik3Match) console.log(`   IK3 errors: ${ik3Match.join(', ')}`);
                if (ik4Match) console.log(`   IK4 errors: ${ik4Match.join(', ')}`);
            } else if (x12Response.includes('271*')) {
                console.log('✅ SUCCESS! Received 271 response');
                break; // Found working format
            } else {
                console.log('❓ Unexpected response format');
            }
            
            // Small delay between tests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log(`❌ Request failed: ${error.message}`);
        }
    }
    
    console.log('\n📊 Test Summary:');
    console.log('If all variations return 999 errors, the issue may be:');
    console.log('1. Utah Medicaid payer configuration (UTMCD vs alternative)');
    console.log('2. Provider NPI not authorized in Office Ally system');
    console.log('3. SSN format requirements (hyphenated vs unhyphenated)');
    console.log('4. Date format preferences (D8 vs RD8)');
}

if (require.main === module) {
    testNM1Variations();
}