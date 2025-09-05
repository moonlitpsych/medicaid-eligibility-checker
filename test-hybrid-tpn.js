#!/usr/bin/env node

// Test hybrid TPN approach: Office Ally TPN for Medicaid routing
// Our TPN for UHIN authentication

console.log('🎭 Hybrid TPN Test - Masquerading as Office Ally to Utah Medicaid');
console.log('================================================================\n');

// Mock Office Ally TPN (we'll need to find the real one)
const OFFICE_ALLY_TPN_UTAH = 'HT??????-???'; // Need to discover this
const OUR_TPN = 'HT009582-001';
const UTAH_MEDICAID_TPN = 'HT000004-001';

function generateHybridX12_270(patient, useOfficeAllyTPN = false) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');

    // Choose TPN based on strategy
    const senderTPN = useOfficeAllyTPN ? OFFICE_ALLY_TPN_UTAH : OUR_TPN;
    
    console.log(`📋 X12 Strategy: ${useOfficeAllyTPN ? 'Office Ally TPN' : 'Our TPN'}`);
    console.log(`   Sender: ${senderTPN}`);
    console.log(`   Receiver: ${UTAH_MEDICAID_TPN}`);

    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString()}${Math.floor(Math.random() * 1000)}`;

    const segments = [
        `ISA*00*          *00*          *ZZ*${senderTPN}*ZZ*${UTAH_MEDICAID_TPN}*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${senderTPN}*${UTAH_MEDICAID_TPN}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*0001*005010X279A1~`,
        `BHT*0022*13**${fullDateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID FFS*****46*${UTAH_MEDICAID_TPN}~`,
        `HL*2*1*21*1~`,
        `NM1*1P*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}***MD*34*1275348807~`, // Use our NPI
        `HL*3*2*22*0~`,
        `TRN*1*${trackingRef1}*1275348807*ELIGIBILITY~`, // Our NPI in tracking
        `TRN*1*${trackingRef2}*${senderTPN}*REALTIME~`, // TPN in tracking
        `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.ssn || patient.medicaidId}~`,
        `DMG*D8*${formattedDOB}*${patient.gender || 'U'}~`,
        `DTP*291*RD8*${fullDateStr}-${fullDateStr}~`,
        `EQ*30~`,
        `SE*16*0001~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

function generateHybridSOAPRequest(x12Payload, useOfficeAllyTPN = false) {
    const timestamp = new Date().toISOString();
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    // SOAP envelope always uses our TPN for UHIN authentication
    const soapSenderTPN = OUR_TPN;
    const soapReceiverTPN = UTAH_MEDICAID_TPN;

    console.log(`📬 SOAP Strategy: Always use our TPN for UHIN auth`);
    console.log(`   SOAP Sender: ${soapSenderTPN}`);
    console.log(`   SOAP Receiver: ${soapReceiverTPN}`);

    return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<soap:Header>
<wsse:Security soap:mustUnderstand="true"
xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken wsu:Id="UsernameToken-${Math.floor(Math.random() * 100000000)}"
xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<wsse:Username>MoonlitProd</wsse:Username>
<wsse:Password
Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">your_uhin_password</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soap:Header>
<soap:Body>
<cor:COREEnvelopeRealTimeRequest>
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${soapSenderTPN}</SenderID>
<ReceiverID>${soapReceiverTPN}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>${x12Payload}</Payload>
</cor:COREEnvelopeRealTimeRequest>
</soap:Body>
</soap:Envelope>`;
}

async function testHybridApproach() {
    console.log('🧪 Testing Hybrid TPN Strategies...\n');

    const testPatient = {
        first: 'Test',
        last: 'Patient',
        dob: '1985-01-01',
        ssn: '123456789'
    };

    // Strategy 1: Our TPN everywhere (current approach)
    console.log('🔍 STRATEGY 1: Our TPN Everywhere');
    console.log('================================');
    const normalX12 = generateHybridX12_270(testPatient, false);
    const normalSOAP = generateHybridSOAPRequest(normalX12, false);
    console.log('Result: Standard approach (what we\'ve been doing)\n');

    // Strategy 2: Office Ally TPN in X12, our TPN in SOAP
    console.log('🎭 STRATEGY 2: Office Ally TPN Masquerade');
    console.log('========================================');
    if (OFFICE_ALLY_TPN_UTAH.includes('?')) {
        console.log('⚠️  Need to discover Office Ally\'s actual TPN for Utah Medicaid');
        console.log('   Possible sources:');
        console.log('   • Office Ally documentation');
        console.log('   • Utah Medicaid companion guide');
        console.log('   • Office Ally support can provide it');
    } else {
        const hybridX12 = generateHybridX12_270(testPatient, true);
        const hybridSOAP = generateHybridSOAPRequest(hybridX12, true);
        console.log('Result: X12 uses Office Ally TPN, SOAP uses our TPN');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Find Office Ally\'s TPN for Utah Medicaid');
    console.log('2. Test Strategy 2 with real UHIN connection');
    console.log('3. See if Utah Medicaid accepts the Office Ally routing');
    
    console.log('\n📞 Questions for Office Ally Support:');
    console.log('• "What is your Trading Partner Number (TPN) for Utah Medicaid eligibility?"');
    console.log('• "What identifier should we use in X12 ISA segments for Utah routing?"');
}

if (require.main === module) {
    testHybridApproach().catch(console.error);
}

module.exports = { generateHybridX12_270, generateHybridSOAPRequest };