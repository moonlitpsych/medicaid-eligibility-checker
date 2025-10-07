// test-office-ally-fixed.js - Test corrected X12 270 format (fixes all 5 critical 999 errors)
require('dotenv').config();

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD, // Fallback for testing
    senderID: process.env.OFFICE_ALLY_SENDER_ID,
    receiverID: 'OFFALLY',
    payerID: 'UTMCD'
};

// Fixed X12 270 Generator (implementing all 5 critical fixes)
function generateFixedX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');
    const id = patient.medicaidId?.trim();
    const ssn = patient.ssn?.replace(/\D/g,''); // 9 digits

    // Fix #4: Choose correct qualifier/id for subscriber
    let subIdQ, subId;
    if (id) { 
        subIdQ = 'MI'; 
        subId = id; 
    } else if (ssn && ssn.length >= 9) { 
        subIdQ = 'SY'; 
        subId = ssn; 
    } else { 
        subIdQ = null; 
        subId = null; 
    }

    // Fix #2: Pad ISA06/ISA08 to 15 characters with spaces
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('[REDACTED-SENDER-ID]');
    const ISA08 = pad15('OFFALLY');

    // Fix #1: Build segments WITHOUT trailing "~"; we'll join with "~" once
    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    
    // Fix #5: BHT02 must be '13' (Request) not '11' (Response)
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Payer (use OA payer code in NM109 with PI)
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // Fix #3: 2100B: Information Receiver (organization, not patient)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);

    // 2100C: Subscriber
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}*****${subIdQ?subIdQ:''}${subId?`*${subId}`:''}`);
    seg.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`);

    // SE count = segments from ST..SE inclusive
    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1; // +1 for SE itself
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    // Fix #1: Single "~" join + trailing "~" (no double tildes)
    return seg.join('~') + '~';
}

// Generate SOAP envelope for Office Ally
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = generateUUID();
    
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

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
    const fetch = (await import('node-fetch')).default;
    
    try {
        console.log('🌐 Sending request to Office Ally...');
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

        const responseText = await response.text();
        return responseText;
    } catch (error) {
        console.error('❌ Office Ally request failed:', error);
        throw error;
    }
}

// Parse Office Ally SOAP response
function parseSOAPResponse(soapResponse) {
    try {
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
        
        if (!payloadMatch) {
            console.log('🔍 SOAP Response (first 2000 chars):', soapResponse.substring(0, 2000));
            throw new Error('No payload found in SOAP response');
        }
        
        return payloadMatch[1].trim();
    } catch (error) {
        console.error('❌ SOAP parsing error:', error);
        throw error;
    }
}

// Test with Jeremy Montoya data
async function testFixed270() {
    const patient = {
        first: 'JEREMY',
        last: 'MONTOYA', 
        dob: '1984-07-17',
        ssn: '123456789', // Test SSN
        gender: 'M'
    };

    console.log('\n🔧 TESTING FIXED X12 270 FORMAT');
    console.log('='.repeat(50));
    console.log('Patient:', patient.first, patient.last);
    console.log('DOB:', patient.dob);
    console.log('Credential Source:', OFFICE_ALLY_CONFIG.password ? 'Environment Variable' : 'Hardcoded Fallback');

    try {
        // Generate fixed X12 270
        const x12_270 = generateFixedX12_270(patient);
        console.log('\n📋 Generated X12 270 (Fixed Format):');
        console.log(x12_270);
        
        // Show key fixes applied
        console.log('\n🔧 Applied Critical Fixes:');
        console.log('✅ Fix #1: Single ~ separators (no double tildes)');
        console.log('✅ Fix #2: ISA06/ISA08 padded to 15 characters');  
        console.log('✅ Fix #3: NM1*1P uses organization (entity type 2, XX qualifier)');
        console.log('✅ Fix #4: Subscriber ID uses SY qualifier for SSN');
        console.log('✅ Fix #5: BHT02 = 13 (Request) not 11 (Response)');

        // Generate SOAP envelope
        const soapRequest = generateSOAPRequest(x12_270);
        
        // Send request
        const startTime = Date.now();
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        const responseTime = Date.now() - startTime;
        
        console.log(`\n⏱️  Response Time: ${responseTime}ms`);
        
        // Parse response
        const x12_271 = parseSOAPResponse(soapResponse);
        console.log('\n📨 Received X12 271 Response:');
        console.log(x12_271);
        
        // Analyze response type
        if (x12_271.includes('999*')) {
            console.log('\n❌ STILL RECEIVING 999 VALIDATION ERRORS');
            console.log('Response indicates X12 format validation failure');
            
            // Extract specific error details
            const ik3Match = x12_271.match(/IK3\*([^~]*)/g);
            const ik4Match = x12_271.match(/IK4\*([^~]*)/g);
            
            if (ik3Match) {
                console.log('\n🔍 IK3 Segment Errors:', ik3Match);
            }
            if (ik4Match) {
                console.log('🔍 IK4 Data Element Errors:', ik4Match);
            }
        } else if (x12_271.includes('271*')) {
            console.log('\n✅ SUCCESS! Received valid 271 eligibility response');
            
            // Check for eligibility status
            if (x12_271.includes('EB*1*')) {
                console.log('🎉 ACTIVE MEDICAID COVERAGE FOUND');
            } else if (x12_271.includes('AAA*')) {
                console.log('ℹ️  Application-level message (AAA segment present)');
            } else {
                console.log('ℹ️  271 response received - analyzing coverage status...');
            }
        } else {
            console.log('\n❓ Unexpected response format - not 999 or 271');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.log('💡 Network connectivity issue - check internet connection');
        } else if (error.message.includes('401') || error.message.includes('403')) {
            console.log('💡 Authentication issue - check Office Ally credentials');
        } else if (error.message.includes('500')) {
            console.log('💡 Server error - may indicate format or processing issue');
        }
    }
}

// Main execution
if (require.main === module) {
    testFixed270();
}

module.exports = { generateFixedX12_270, generateSOAPRequest };