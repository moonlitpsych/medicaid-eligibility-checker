#!/usr/bin/env node
// test-office-ally-quick.js - Quick test of Office Ally configuration and format

require('dotenv').config({ path: '.env.local' });

// Office Ally Configuration (pulled from environment)
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    payerID: process.env.OFFICE_ALLY_PAYER_ID || 'UTMCD'
};

// Test patient data (Jeremy Montoya from CLAUDE.md)
const testPatient = {
    first: 'Jeremy',
    last: 'Montoya',
    dob: '1984-07-17'
};

console.log('🧪 Office Ally Integration Self-Check');
console.log('=' * 50);

// 1. Environment Check
console.log('\n1. Environment Configuration:');
console.log('   ELIGIBILITY_PROVIDER:', process.env.ELIGIBILITY_PROVIDER || 'NOT SET');
console.log('   OFFICE_ALLY_USERNAME:', process.env.OFFICE_ALLY_USERNAME ? 'SET' : '❌ NOT SET');
console.log('   OFFICE_ALLY_PASSWORD:', process.env.OFFICE_ALLY_PASSWORD ? 'SET (length: ' + process.env.OFFICE_ALLY_PASSWORD.length + ')' : '❌ NOT SET');
console.log('   OFFICE_ALLY_ENDPOINT:', OFFICE_ALLY_CONFIG.endpoint);
console.log('   PROVIDER_NPI:', OFFICE_ALLY_CONFIG.providerNPI);
console.log('   SIMULATION_MODE:', process.env.SIMULATION_MODE);

// 2. Generate X12 270
function generateOfficeAllyX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    // Pad ISA06/ISA08 to 15 characters with spaces
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    const seg = [];
    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`);

    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

console.log('\n2. X12 270 Generation:');
const x12_270 = generateOfficeAllyX12_270(testPatient);
console.log('   Length:', x12_270.length, 'characters');
console.log('   Segment count:', (x12_270.match(/~/g) || []).length);
console.log('   First 200 chars:', x12_270.substring(0, 200));

// 3. SOAP Envelope
function generateOfficeAllySOAPRequest(x12Payload) {
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
<wsse:Password>***MASKED***</wsse:Password>
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

console.log('\n3. SOAP Envelope Generation:');
const soapRequest = generateOfficeAllySOAPRequest(x12_270);
console.log('   SOAP length:', soapRequest.length, 'characters');
console.log('   Username configured:', !!OFFICE_ALLY_CONFIG.username);
console.log('   Password configured:', !!OFFICE_ALLY_CONFIG.password);

// 4. Ready for Testing
console.log('\n4. Test Readiness:');
const hasCredentials = OFFICE_ALLY_CONFIG.username && OFFICE_ALLY_CONFIG.password;
console.log('   Credentials ready:', hasCredentials ? '✅ YES' : '❌ NO');
console.log('   Configuration complete:', hasCredentials ? '✅ YES' : '❌ NO');
console.log('   Simulation mode:', process.env.SIMULATION_MODE);

if (hasCredentials && process.env.SIMULATION_MODE !== 'true') {
    console.log('\n✅ READY FOR LIVE OFFICE ALLY TESTING');
    console.log('   Run: curl test or visit web app');
} else if (process.env.SIMULATION_MODE === 'true') {
    console.log('\n⚠️ IN SIMULATION MODE');
    console.log('   Set SIMULATION_MODE=false to test live');
} else {
    console.log('\n❌ MISSING CREDENTIALS');
    console.log('   Check OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD in .env.local');
}

console.log('\n' + '=' * 50);
console.log('🏁 Self-check complete');