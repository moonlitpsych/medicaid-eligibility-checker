#!/usr/bin/env node

/**
 * WORKING Utah Medicaid Eligibility Service
 * Based on successful test-office-ally-final.js
 *
 * Usage: node utah-medicaid-service.js Jeremy Montoya 1984-07-17
 */

require('dotenv').config({ path: '.env.local' });

const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    senderID: process.env.OFFICE_ALLY_SENDER_ID,
    receiverID: process.env.OFFICE_ALLY_RECEIVER_ID || 'OFFALLY',
    payerID: 'UTMCD',
    providerNPI: process.env.PROVIDER_NPI,
    providerName: process.env.PROVIDER_NAME
};

// Validate credentials
if (!OFFICE_ALLY_CONFIG.username || !OFFICE_ALLY_CONFIG.password || !OFFICE_ALLY_CONFIG.senderID) {
    console.error('❌ Missing Office Ally credentials. See .env.example');
    process.exit(1);
}

// WORKING X12 270 format (Name/DOB only, no SSN/ID)
function generateWorkingX12_270(patient) {
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
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // 2100B: Information Receiver (organization)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*${OFFICE_ALLY_CONFIG.providerName}*****XX*${OFFICE_ALLY_CONFIG.providerNPI}`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY`);
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

// Generate SOAP request - EXACT COPY from working test-office-ally-final.js
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

// Check Utah Medicaid eligibility (simple JSON response)
async function checkUtahMedicaidEligibility(patient) {
    const fetch = (await import('node-fetch')).default;
    
    const x12_270 = generateWorkingX12_270(patient);
    const soapRequest = generateSOAPRequest(x12_270);
    
    console.log(`🔍 Checking Utah Medicaid eligibility: ${patient.first} ${patient.last} (${patient.dob})`);
    
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
        throw new Error('No payload found in SOAP response');
    }
    
    const x12_271 = payloadMatch[1].trim();
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    
    // Analyze eligibility (fixed parsing)
    let result = {
        enrolled: false,
        program: '',
        responseTime: responseTime,
        error: ''
    };
    
    console.log('📨 X12 271 Response (first 200 chars):', x12_271.substring(0, 200) + '...');
    
    // Look for 271 transaction (ST*271)
    if (x12_271.includes('ST*271*')) {
        // Parse eligibility benefits (EB segments)
        const ebSegments = x12_271.match(/EB\*([^~]*)/g) || [];
        
        if (ebSegments.length > 0) {
            result.enrolled = true;
            result.program = 'Utah Medicaid';
            
            // Look for specific program types
            if (x12_271.includes('TARGETED ADULT MEDICAID')) {
                result.program = 'Utah Medicaid - Targeted Adult';
            } else if (x12_271.includes('MENTAL HEALTH')) {
                result.program = 'Utah Medicaid - Mental Health';
            }
            
            console.log(`✅ ENROLLED: ${result.program}`);
            console.log(`📋 Found ${ebSegments.length} eligibility segments`);
            
            // Show first few EB segments for verification
            ebSegments.slice(0, 3).forEach((eb, index) => {
                console.log(`   EB${index + 1}: ${eb}`);
            });
            
        } else {
            // Check for AAA rejection messages
            const aaaSegments = x12_271.match(/AAA\*([^~]*)/g) || [];
            if (aaaSegments.length > 0) {
                result.enrolled = false;
                result.error = 'No active Utah Medicaid coverage found';
                console.log(`❌ NOT ENROLLED: ${result.error}`);
                console.log(`📋 AAA Messages: ${aaaSegments.join(', ')}`);
            } else {
                result.enrolled = false;
                result.error = 'No eligibility data found in response';
                console.log(`❌ ERROR: ${result.error}`);
            }
        }
        
    } else {
        result.enrolled = false;
        result.error = 'Invalid X12 271 response format';
        console.log(`❌ ERROR: ${result.error}`);
        console.log('📋 Response does not contain ST*271* segment');
    }
    
    return result;
}

// Command line usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Usage: node utah-medicaid-service.js <first> <last> <dob>');
        console.log('Example: node utah-medicaid-service.js Jeremy Montoya 1984-07-17');
        process.exit(1);
    }
    
    const patient = {
        first: args[0],
        last: args[1],
        dob: args[2],
        gender: args[3] || 'U'
    };
    
    try {
        const result = await checkUtahMedicaidEligibility(patient);
        console.log('\n📊 FINAL RESULT:', JSON.stringify(result, null, 2));
        
        if (result.enrolled) {
            console.log('\n🎉 SUCCESS: Patient is enrolled in Utah Medicaid!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Patient is not enrolled or coverage not found');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} else {
    module.exports = { checkUtahMedicaidEligibility };
}