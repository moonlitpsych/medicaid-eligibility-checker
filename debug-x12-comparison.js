#!/usr/bin/env node

/**
 * Debug X12 Comparison Tool
 * Compare exact 270 bytes between working and failing implementations
 */

require('dotenv').config();
const crypto = require('crypto');

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***',
    senderID: '1161680',
    receiverID: 'OFFALLY',
    payerID: 'UTMCD'
};

// WORKING version (exact copy from test-office-ally-final.js)
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

// FAILING version (from universal-eligibility-checker.js)
function generateUniversalX12_270(patient, payerConfig) {
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
    seg.push(`NM1*PR*2*${payerConfig.payerName}*****PI*${payerConfig.payerId}`);

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

// Generate SOAP request (identical in both)
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

// Parse 999 error details
function parse999(x12) {
    const segs = x12.split('~');
    const errs = [];
    for (const s of segs) {
        if (s.startsWith('IK3*') || s.startsWith('AK3*')) errs.push(`SEGMENT ERROR: ${s}`);
        if (s.startsWith('IK4*') || s.startsWith('AK4*')) errs.push(`ELEMENT ERROR: ${s}`);
        if (s.startsWith('IK5*') || s.startsWith('AK5*')) errs.push(`TXN SET ACK: ${s}`);
        if (s.startsWith('AK9*')) errs.push(`FUNCTIONAL GROUP ACK: ${s}`);
    }
    return errs;
}

// Debug function
async function debugComparison() {
    const patient = {
        first: 'Jeremy',
        last: 'Montoya',
        dob: '1984-07-17',
        gender: 'M'
    };

    const payerConfig = {
        payerName: 'UTAH MEDICAID',
        payerId: 'UTMCD'
    };

    console.log('🔍 X12 270 COMPARISON DEBUG');
    console.log('='.repeat(50));

    // Generate both versions with SAME timestamp (use fixed time)
    const fixedTime = new Date('2025-09-09T20:00:00.000Z');
    const originalDateNow = Date.now;
    Date.now = () => fixedTime.getTime();
    const originalDateConstructor = global.Date;
    global.Date = class extends originalDateConstructor {
        constructor(...args) {
            return args.length ? new originalDateConstructor(...args) : fixedTime;
        }
        static now() { return fixedTime.getTime(); }
    };

    try {
        const workingX12 = generateWorkingX12_270(patient);
        const universalX12 = generateUniversalX12_270(patient, payerConfig);

        // Compare exact bytes
        const workingBytes = Buffer.from(workingX12, 'ascii');
        const universalBytes = Buffer.from(universalX12, 'ascii');
        
        const workingHash = crypto.createHash('sha1').update(workingBytes).digest('hex');
        const universalHash = crypto.createHash('sha1').update(universalBytes).digest('hex');

        console.log('📋 WORKING VERSION (test-office-ally-final.js):');
        console.log('   Length (bytes):', workingBytes.length);
        console.log('   SHA1 hash:', workingHash);
        console.log('   First 100 chars:', workingX12.substring(0, 100) + '...');

        console.log('\n📋 UNIVERSAL VERSION (universal-eligibility-checker.js):');
        console.log('   Length (bytes):', universalBytes.length);
        console.log('   SHA1 hash:', universalHash);
        console.log('   First 100 chars:', universalX12.substring(0, 100) + '...');

        console.log('\n🔍 COMPARISON RESULT:');
        if (workingHash === universalHash) {
            console.log('✅ X12 270 PAYLOADS ARE IDENTICAL');
            console.log('   ➡️  Issue is NOT in the X12 270 generation');
            console.log('   ➡️  Check SOAP envelope or HTTP headers');
        } else {
            console.log('❌ X12 270 PAYLOADS DIFFER');
            console.log('   ➡️  Found the root cause!');
            
            // Character-by-character comparison
            const minLen = Math.min(workingX12.length, universalX12.length);
            for (let i = 0; i < minLen; i++) {
                if (workingX12[i] !== universalX12[i]) {
                    console.log(`   ➡️  First difference at position ${i}:`);
                    console.log(`       Working: "${workingX12[i]}" (${workingX12.charCodeAt(i)})`);
                    console.log(`       Universal: "${universalX12[i]}" (${universalX12.charCodeAt(i)})`);
                    console.log(`       Context: "${workingX12.substring(Math.max(0, i-10), i+10)}"`);
                    console.log(`                "${universalX12.substring(Math.max(0, i-10), i+10)}"`);
                    break;
                }
            }
        }

        // Test SOAP generation
        const workingSOAP = generateSOAPRequest(workingX12);
        const universalSOAP = generateSOAPRequest(universalX12);
        
        console.log('\n📋 SOAP ENVELOPE COMPARISON:');
        console.log('   Working SOAP bytes:', Buffer.byteLength(workingSOAP, 'utf8'));
        console.log('   Universal SOAP bytes:', Buffer.byteLength(universalSOAP, 'utf8'));

        // Environment check
        console.log('\n🔍 ENVIRONMENT CHECK:');
        console.log('   ELIGIBILITY_PROVIDER:', process.env.ELIGIBILITY_PROVIDER || 'undefined');
        console.log('   OFFICE_ALLY_USERNAME:', process.env.OFFICE_ALLY_USERNAME || 'undefined');
        console.log('   OFFICE_ALLY_PASSWORD:', process.env.OFFICE_ALLY_PASSWORD ? '***SET***' : 'undefined');
        console.log('   OFFICE_ALLY_ENDPOINT:', process.env.OFFICE_ALLY_ENDPOINT || 'undefined');

        // Full segment breakdown
        console.log('\n📋 SEGMENT BREAKDOWN:');
        const workingSegments = workingX12.split('~').filter(s => s);
        const universalSegments = universalX12.split('~').filter(s => s);
        
        console.log('Working segments:');
        workingSegments.forEach((seg, i) => console.log(`   ${String(i+1).padStart(2, ' ')}: ${seg}`));
        
        console.log('\nUniversal segments:');
        universalSegments.forEach((seg, i) => console.log(`   ${String(i+1).padStart(2, ' ')}: ${seg}`));

    } finally {
        // Restore original Date
        Date.now = originalDateNow;
        global.Date = originalDateConstructor;
    }
}

// Test actual API call to get 999 details
async function test999Details() {
    const fetch = (await import('node-fetch')).default;
    
    console.log('\n🔍 TESTING UNIVERSAL CHECKER FOR 999 DETAILS');
    console.log('='.repeat(50));

    const patient = {
        first: 'Jeremy',
        last: 'Montoya',
        dob: '1984-07-17',
        gender: 'M'
    };

    const payerConfig = {
        payerName: 'UTAH MEDICAID',
        payerId: 'UTMCD'
    };

    const x12_270 = generateUniversalX12_270(patient, payerConfig);
    const soapRequest = generateSOAPRequest(x12_270);

    console.log('📋 Sending request to Office Ally...');
    console.log('   X12 270 length:', x12_270.length);
    console.log('   SOAP bytes:', Buffer.byteLength(soapRequest, 'utf8'));

    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });

    console.log('📨 Response received:');
    console.log('   HTTP status:', response.status);
    console.log('   Content-Type:', response.headers.get('content-type'));

    const soapResponse = await response.text();
    
    // Parse X12 271 response
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
    
    if (!payloadMatch) {
        console.log('❌ No payload found in SOAP response');
        return;
    }
    
    const x12_271 = payloadMatch[1].trim();
    console.log('   Response type:', x12_271.includes('X12_271_Response') ? 'X12 271 ✅' : 'X12 999 ❌');
    
    if (x12_271.includes('999')) {
        console.log('\n❌ 999 ERROR DETAILS:');
        const errorDetails = parse999(x12_271);
        if (errorDetails.length > 0) {
            errorDetails.forEach(err => console.log('   ' + err));
        } else {
            console.log('   No specific error segments found');
            console.log('   Raw 999 (first 500 chars):', x12_271.substring(0, 500));
        }
    }
}

if (require.main === module) {
    debugComparison()
        .then(() => test999Details())
        .catch(console.error);
}