#!/usr/bin/env node

// 🔬 ADVANCED Office Ally X12 270 Format Testing - Phase 2
// Testing even more advanced variations

console.log('🔬 ADVANCED Office Ally X12 270 Testing - Phase 2');
console.log('===============================================\n');

const testResults = [];

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: '1161680',
    username: 'moonlit',
    password: '***REDACTED-OLD-OA-PASSWORD***',
    providerNPI: '1275348807',
    providerName: 'MOONLIT_PLLC',
    payerID: 'UTMCD'
};

// Test patient data
const testPatient = {
    first: 'Jeremy',
    last: 'Montoya',
    dob: '1984-07-17',
    ssn: '123456789'
};

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Base structure helper
function generateBaseX12Structure() {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = testPatient.dob.replace(/-/g, '');
    const timestamp = new Date();
    
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
    
    const trackingRef = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 100000)}`;
    
    return {
        controlNumber,
        formattedDOB,
        dateStr,
        timeStr,
        fullDateStr,
        trackingRef
    };
}

// Test Variation 6: Different ISA segment with ZZ for both sender and receiver
function generateX12_Variation6() {
    const base = generateBaseX12Structure();
    
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ',
        'ZZ', OFFICE_ALLY_CONFIG.senderID.padEnd(15).substring(0, 15),
        'ZZ', 'OFFALLY        ', // Try ZZ instead of 01
        base.dateStr, base.timeStr, '^', '00501', base.controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    const gsSegment = [
        'GS', 'HS', OFFICE_ALLY_CONFIG.senderID, 'OFFALLY',
        base.fullDateStr, base.timeStr, base.controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    const stSegment = `ST*270*${base.controlNumber}*005010X279A1~`;
    const bhtSegment = `BHT*0022*13**${base.fullDateStr}*${base.timeStr}~`;
    
    const hl1Segment = 'HL*1**20*1~';
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~';
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~';
    const trnSegment = `TRN*1*${base.trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 7: Try different NM1 entity type codes
function generateX12_Variation7() {
    const base = generateBaseX12Structure();
    
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ',
        'ZZ', OFFICE_ALLY_CONFIG.senderID.padEnd(15).substring(0, 15),
        '01', 'OFFALLY        ',
        base.dateStr, base.timeStr, '^', '00501', base.controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    const gsSegment = [
        'GS', 'HS', OFFICE_ALLY_CONFIG.senderID, 'OFFALLY',
        base.fullDateStr, base.timeStr, base.controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    const stSegment = `ST*270*${base.controlNumber}*005010X279A1~`;
    const bhtSegment = `BHT*0022*13**${base.fullDateStr}*${base.timeStr}~`;
    
    const hl1Segment = 'HL*1**20*1~';
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~';
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~';
    const trnSegment = `TRN*1*${base.trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    // Try IL with entity type code 2
    const nm1SubscriberSegment = `NM1*IL*2*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 8: Add REF segment for additional identification
function generateX12_Variation8() {
    const base = generateBaseX12Structure();
    
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ',
        'ZZ', OFFICE_ALLY_CONFIG.senderID.padEnd(15).substring(0, 15),
        '01', 'OFFALLY        ',
        base.dateStr, base.timeStr, '^', '00501', base.controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    const gsSegment = [
        'GS', 'HS', OFFICE_ALLY_CONFIG.senderID, 'OFFALLY',
        base.fullDateStr, base.timeStr, base.controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    const stSegment = `ST*270*${base.controlNumber}*005010X279A1~`;
    const bhtSegment = `BHT*0022*13**${base.fullDateStr}*${base.timeStr}~`;
    
    const hl1Segment = 'HL*1**20*1~';
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~';
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    // Add REF segment for provider
    const refProviderSegment = `REF*EI*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~';
    const trnSegment = `TRN*1*${base.trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, refProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 9: Try PN1 instead of NM1 for subscriber
function generateX12_Variation9() {
    const base = generateBaseX12Structure();
    
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ',
        'ZZ', OFFICE_ALLY_CONFIG.senderID.padEnd(15).substring(0, 15),
        '01', 'OFFALLY        ',
        base.dateStr, base.timeStr, '^', '00501', base.controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    const gsSegment = [
        'GS', 'HS', OFFICE_ALLY_CONFIG.senderID, 'OFFALLY',
        base.fullDateStr, base.timeStr, base.controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    const stSegment = `ST*270*${base.controlNumber}*005010X279A1~`;
    const bhtSegment = `BHT*0022*13**${base.fullDateStr}*${base.timeStr}~`;
    
    const hl1Segment = 'HL*1**20*1~';
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~';
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~';
    const trnSegment = `TRN*1*${base.trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    // Try PN1 instead of NM1 for subscriber name
    const pn1SubscriberSegment = `PN1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, pn1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 10: Try different BHT segment values
function generateX12_Variation10() {
    const base = generateBaseX12Structure();
    
    const isaSegment = [
        'ISA', '00', '          ', '00', '          ',
        'ZZ', OFFICE_ALLY_CONFIG.senderID.padEnd(15).substring(0, 15),
        '01', 'OFFALLY        ',
        base.dateStr, base.timeStr, '^', '00501', base.controlNumber, '0', 'P', ':'
    ].join('*') + '~';
    
    const gsSegment = [
        'GS', 'HS', OFFICE_ALLY_CONFIG.senderID, 'OFFALLY',
        base.fullDateStr, base.timeStr, base.controlNumber, 'X', '005010X279A1'
    ].join('*') + '~';
    
    const stSegment = `ST*270*${base.controlNumber}*005010X279A1~`;
    // Try different BHT values
    const bhtSegment = `BHT*0022*11*${base.trackingRef}*${base.fullDateStr}*${base.timeStr}~`;
    
    const hl1Segment = 'HL*1**20*1~';
    const nm1PrSegment = `NM1*PR*2*UTAH MEDICAID*****PI*${OFFICE_ALLY_CONFIG.payerID}~`;
    
    const hl2Segment = 'HL*2*1*21*1~';
    const nm1ProviderSegment = `NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    
    const hl3Segment = 'HL*3*2*22*0~';
    const trnSegment = `TRN*1*${base.trackingRef}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~`;
    
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Generate SOAP envelope
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\\.\\d{3}Z$/, 'Z');
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

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
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

// Parse Office Ally SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
    
    if (!payloadMatch) {
        return null;
    }
    
    return payloadMatch[1].trim();
}

// Test a specific variation
async function testVariation(variationName, generator) {
    console.log(`\\n🧪 Testing ${variationName}:`);
    console.log('='.repeat(50));
    
    try {
        const startTime = Date.now();
        const x12_270 = generator();
        const soapRequest = generateSOAPRequest(x12_270);
        
        console.log('📋 X12 270 Request:');
        console.log(x12_270);
        console.log('\\n📡 Sending to Office Ally...');
        
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        const x12Response = parseOfficeAllySOAPResponse(soapResponse);
        const duration = Date.now() - startTime;
        
        console.log(`\\n📨 Response received (${duration}ms):`);
        console.log(x12Response || 'No payload found');
        
        let result = {
            variation: variationName,
            duration: duration,
            success: false,
            responseType: 'UNKNOWN',
            x12Request: x12_270,
            x12Response: x12Response || 'No payload'
        };
        
        if (x12Response) {
            if (x12Response.includes('X12_271_Response')) {
                result.success = true;
                result.responseType = 'X12_271_SUCCESS';
                console.log('✅ SUCCESS: Received X12 271 eligibility response!');
            } else if (x12Response.includes('X12_999_Response')) {
                result.responseType = 'X12_999_VALIDATION_ERROR';
                console.log('❌ X12 999 Validation Error');
            } else {
                result.responseType = 'UNKNOWN_RESPONSE';
                console.log('⚠️  Unknown response format');
            }
        } else {
            result.responseType = 'NO_PAYLOAD';
            console.log('❌ No payload found in response');
        }
        
        testResults.push(result);
        return result;
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        const result = {
            variation: variationName,
            duration: 0,
            success: false,
            responseType: 'ERROR',
            x12Request: 'Failed to generate',
            x12Response: 'Error occurred'
        };
        testResults.push(result);
        return result;
    }
}

// Main advanced testing function
async function runAdvancedTesting() {
    console.log('Starting advanced X12 270 format testing...\\n');
    
    const testVariations = [
        { name: 'Variation 6: ISA with ZZ/ZZ', generator: generateX12_Variation6 },
        { name: 'Variation 7: NM1 Entity Type Code 2', generator: generateX12_Variation7 },
        { name: 'Variation 8: With REF Segment', generator: generateX12_Variation8 },
        { name: 'Variation 9: PN1 Instead of NM1', generator: generateX12_Variation9 },
        { name: 'Variation 10: Different BHT Values', generator: generateX12_Variation10 }
    ];
    
    for (const variation of testVariations) {
        await testVariation(variation.name, variation.generator);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate report
    console.log('\\n\\n📊 ADVANCED TESTING SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\\nTotal additional variations tested: ${testResults.length}`);
    console.log(`Successful requests: ${testResults.filter(r => r.success).length}`);
    console.log(`Validation errors: ${testResults.filter(r => r.responseType === 'X12_999_VALIDATION_ERROR').length}`);
    console.log(`Other errors: ${testResults.filter(r => r.responseType === 'ERROR').length}`);
    
    testResults.forEach((result, index) => {
        console.log(`\\n${index + 1}. ${result.variation}`);
        console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Response: ${result.responseType}`);
        console.log(`   Duration: ${result.duration}ms`);
    });
    
    return testResults;
}

if (require.main === module) {
    runAdvancedTesting().catch(console.error);
}

module.exports = { runAdvancedTesting };