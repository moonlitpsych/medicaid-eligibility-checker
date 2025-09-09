#!/usr/bin/env node

/**
 * Test Tella Silver with detailed X12 271 response parsing
 * Look for copay information and plan details
 */

require('dotenv').config();

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***',
    senderID: '1161680',
    receiverID: 'OFFALLY',
    providerNPI: '1124778121',  // Travis Norseth - enrolled with Aetna
    providerName: 'TRAVIS NORSETH'
};

// Generate X12 270 for Aetna
function generateAetnaX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15(OFFICE_ALLY_CONFIG.senderID);
    const ISA08 = pad15(OFFICE_ALLY_CONFIG.receiverID);

    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*${OFFICE_ALLY_CONFIG.senderID}*${OFFICE_ALLY_CONFIG.receiverID}*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Payer
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*AETNA*****PI*60054`);

    // 2100B: Information Receiver (organization)  
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*${OFFICE_ALLY_CONFIG.providerName}*****XX*${OFFICE_ALLY_CONFIG.providerNPI}`);

    // 2100C: Subscriber (Name/DOB + Member ID if provided)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}****MI*${patient.memberID || ''}`);
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

// Enhanced X12 271 parsing for Aetna details
function parseAetnaResponse(x12_271) {
    const result = {
        enrolled: false,
        program: '',
        planType: '',
        memberID: '',
        effectiveDate: '',
        copayInfo: {},
        deductibleInfo: {},
        planDetails: {},
        rawSegments: []
    };

    if (!x12_271.includes('ST*271*')) {
        result.error = 'Invalid X12 271 response';
        return result;
    }

    const segments = x12_271.split('~');
    result.rawSegments = segments.filter(s => s.trim().length > 0);

    // Parse key segments
    for (const seg of segments) {
        if (seg.startsWith('EB*')) {
            result.enrolled = true;
            
            // Parse eligibility benefit segment
            const parts = seg.split('*');
            const eligibilityCode = parts[1];
            const serviceType = parts[3];
            
            console.log(`📋 EB Segment: ${seg}`);
            
            // Look for copay amounts
            if (parts.length > 7 && parts[7] && parts[7].includes('CO')) {
                const amount = parts[8];
                if (amount && !isNaN(parseFloat(amount))) {
                    result.copayInfo.officeCopay = parseFloat(amount);
                    console.log(`💰 Copay found: $${amount}`);
                }
            }
            
        } else if (seg.startsWith('NM1*IL*')) {
            // Member information
            const parts = seg.split('*');
            if (parts[8] === 'MI' && parts[9]) {
                result.memberID = parts[9];
                console.log(`🆔 Member ID: ${result.memberID}`);
            }
            
        } else if (seg.startsWith('INS*')) {
            // Insurance type information
            console.log(`🏥 Insurance Info: ${seg}`);
            
        } else if (seg.startsWith('DTP*')) {
            // Date information
            const parts = seg.split('*');
            if (parts[1] === '346') {
                result.effectiveDate = parts[3];
                console.log(`📅 Plan Begin: ${result.effectiveDate}`);
            }
            
        } else if (seg.startsWith('MSG*')) {
            // Message segments
            const message = seg.substring(4);
            console.log(`💬 Message: ${message}`);
        }
    }

    if (result.enrolled) {
        result.program = 'Aetna';
        // Try to determine plan type from segments
        const x12Lower = x12_271.toLowerCase();
        if (x12Lower.includes('hmo')) {
            result.planType = 'HMO';
        } else if (x12Lower.includes('ppo')) {
            result.planType = 'PPO';
        } else if (x12Lower.includes('pos')) {
            result.planType = 'POS';
        }
    }

    return result;
}

// Test Tella Silver with detailed parsing
async function testTellaDetailed() {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔍 DETAILED AETNA TEST: Tella Silver');
    console.log('='.repeat(50));
    
    const patient = {
        first: 'Tella',
        last: 'Silver',
        dob: '1995-09-18',
        gender: 'F',
        memberID: 'W268197637'  // Her actual Aetna member ID
    };
    
    console.log(`👤 Patient: ${patient.first} ${patient.last}`);
    console.log(`📅 DOB: ${patient.dob}`);
    console.log(`🆔 Member ID: ${patient.memberID}`);
    console.log(`👨‍⚕️ Provider: ${OFFICE_ALLY_CONFIG.providerName} (${OFFICE_ALLY_CONFIG.providerNPI})`);
    
    const x12_270 = generateAetnaX12_270(patient);
    const soapRequest = generateSOAPRequest(x12_270);
    
    console.log('\n📋 Generated X12 270 (first 200 chars):');
    console.log(x12_270.substring(0, 200) + '...');
    
    console.log('\n🚀 Sending request to Office Ally...');
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
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📨 HTTP Status: ${response.status}`);
    
    // Parse X12 271 response
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
    
    if (!payloadMatch) {
        console.log('❌ No payload found in SOAP response');
        return;
    }
    
    const x12_271 = payloadMatch[1].trim();
    console.log(`📨 Response Type: ${x12_271.includes('X12_271_Response') ? 'X12 271 ✅' : 'X12 999 ❌'}`);
    
    // Save full response for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tella_silver_aetna_detailed_${timestamp}.txt`;
    
    const fs = require('fs').promises;
    fs.writeFile(filename, x12_271).catch(err => 
        console.log('Note: Could not save response file:', err.message)
    );
    
    console.log(`💾 Full response saved to: ${filename}`);
    
    // Parse detailed Aetna response
    console.log('\n🔍 DETAILED PARSING:');
    console.log('='.repeat(30));
    
    const aetnaDetails = parseAetnaResponse(x12_271);
    
    console.log('\n📊 FINAL DETAILED RESULT:');
    console.log(JSON.stringify(aetnaDetails, null, 2));
    
    console.log('\n📋 RAW X12 271 SEGMENTS:');
    aetnaDetails.rawSegments.slice(0, 20).forEach((seg, index) => {
        console.log(`${String(index + 1).padStart(2, ' ')}: ${seg}`);
    });
    
    if (aetnaDetails.rawSegments.length > 20) {
        console.log(`... and ${aetnaDetails.rawSegments.length - 20} more segments`);
    }
    
    return aetnaDetails;
}

if (require.main === module) {
    testTellaDetailed().catch(console.error);
}