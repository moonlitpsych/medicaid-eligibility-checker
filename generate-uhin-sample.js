#!/usr/bin/env node

// Generate sample X12 270 and SOAP payload for UHIN review
// This is exactly what we'll send them for approval

console.log('📋 UHIN Sample Payload Generator');
console.log('================================\n');

// Import our functions (mock DB first)
const mockPool = { query: async () => ({ rows: [] }) };
require.cache[require.resolve('./api/_db')] = { exports: { pool: mockPool } };

// Set up environment for sample generation
process.env.USE_OFFICE_ALLY_TPN = 'true'; // Show both strategies
process.env.PROVIDER_NPI = '1275348807';

// Sample patient for UHIN review (safe test data)
const samplePatient = {
    first: 'JANE',
    last: 'TESTPATIENT',
    dob: '1985-01-01',
    ssn: '999999999',
    medicaidId: '9999999999',
    gender: 'F'
};

// Generate X12 270 manually for UHIN sample
function generateSampleX12_270(patient, useOfficeAllyTPN = false) {
    const controlNumber = '123456789';
    const formattedDOB = patient.dob.replace(/-/g, '');
    const dateStr = '250903'; // YYMMDD
    const timeStr = '1200'; // HHMM
    const fullDateStr = '20250903'; // YYYYMMDD

    const senderTPN = useOfficeAllyTPN ? 'HT006842-001' : 'HT009582-001';
    const receiverTPN = 'HT000004-001';
    
    const trackingRef1 = '12345678-999999';
    const trackingRef2 = '1725407123456';

    const segments = [
        `ISA*00*          *00*          *ZZ*${senderTPN} *ZZ*${receiverTPN} *${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${senderTPN}*${receiverTPN}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*0001*005010X279A1~`,
        `BHT*0022*13**${fullDateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${receiverTPN}~`,
        `HL*2*1*21*1~`,
        `NM1*1P*1*${patient.last}*${patient.first}***MD*34*1275348807~`,
        `HL*3*2*22*0~`,
        `TRN*1*${trackingRef1}*1275348807*ELIGIBILITY~`,
        `TRN*1*${trackingRef2}*${senderTPN}*REALTIME~`,
        `NM1*IL*1*${patient.last}*${patient.first}****MI*${patient.ssn}~`,
        `DMG*D8*${formattedDOB}*${patient.gender}~`,
        `DTP*291*RD8*${fullDateStr}-${fullDateStr}~`,
        `EQ*30~`,
        `SE*16*0001~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

function generateSampleSOAP(x12Payload) {
    const timestamp = '2025-09-03T22:52:00.000Z';
    const payloadID = '12345678-1234-4321-abcd-123456789012';

    return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<soap:Header>
<wsse:Security soap:mustUnderstand="true"
xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken wsu:Id="UsernameToken-12345678"
xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<wsse:Username>MoonlitProd</wsse:Username>
<wsse:Password
Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">[PASSWORD_HIDDEN]</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soap:Header>
<soap:Body>
<cor:COREEnvelopeRealTimeRequest>
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>HT009582-001</SenderID>
<ReceiverID>HT000004-001</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>${x12Payload}</Payload>
</cor:COREEnvelopeRealTimeRequest>
</soap:Body>
</soap:Envelope>`;
}

function generateSamples() {
    console.log('📄 Generating samples for UHIN review...\n');
    
    // Strategy 1: Our TPN
    console.log('🔍 STRATEGY 1: Our TPN (Standard Approach)');
    console.log('==========================================');
    const ourTPN_X12 = generateSampleX12_270(samplePatient, false);
    const ourTPN_SOAP = generateSampleSOAP(ourTPN_X12);
    
    console.log('X12 270 Payload (Our TPN: HT009582-001):');
    console.log('```');
    console.log(ourTPN_X12);
    console.log('```\n');
    
    console.log('Complete SOAP Envelope:');
    console.log('```xml');
    console.log(ourTPN_SOAP);
    console.log('```\n');
    
    // Strategy 2: Office Ally TPN
    console.log('🎭 STRATEGY 2: Office Ally TPN Masquerading');
    console.log('============================================');
    const officeAlly_X12 = generateSampleX12_270(samplePatient, true);
    const officeAlly_SOAP = generateSampleSOAP(officeAlly_X12);
    
    console.log('X12 270 Payload (Office Ally TPN: HT006842-001):');
    console.log('```');
    console.log(officeAlly_X12);
    console.log('```\n');
    
    console.log('Complete SOAP Envelope (same as above, X12 payload different):');
    console.log('```xml');
    console.log(officeAlly_SOAP);
    console.log('```\n');
    
    console.log('📧 EMAIL TO UHIN:');
    console.log('=================');
    console.log('Subject: Ready for CORE RT Eligibility Testing - Sample 270 Review');
    console.log('\nHi,\n');
    console.log('We are ready to begin testing our CORE RT Eligibility integration.');
    console.log('As requested, please find our sample 270 payloads below for review.\n');
    console.log('Account: MoonlitProd');
    console.log('TPN: HT009582-001');
    console.log('Provider NPI: 1275348807\n');
    console.log('We have two strategies we\'d like to test:');
    console.log('1. Standard approach using our TPN (HT009582-001)');
    console.log('2. Office Ally TPN masquerading (HT006842-001) for Utah Medicaid routing\n');
    console.log('Both samples are included above. Please let us know:');
    console.log('• If the formats look correct');
    console.log('• If our enrollment can be completed');
    console.log('• Which strategy you recommend for Utah Medicaid eligibility\n');
    console.log('Looking forward to testing!');
    console.log('\nBest regards,');
    console.log('Moonlit Development Team');
}

if (require.main === module) {
    generateSamples();
}

module.exports = { generateSamples };