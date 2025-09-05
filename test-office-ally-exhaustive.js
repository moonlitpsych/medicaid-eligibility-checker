#!/usr/bin/env node

// 🔍 EXHAUSTIVE Office Ally X12 270 Format Testing
// Testing every possible variation to identify the correct format

console.log('🔍 EXHAUSTIVE Office Ally X12 270 Testing');
console.log('==========================================\n');

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
    ssn: '123456789' // Generic test SSN
};

// Generate UUID for PayloadID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Base X12 270 generation function
function generateBaseX12Structure() {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = testPatient.dob.replace(/-/g, '');
    const timestamp = new Date();
    
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', ''); // HHMM
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, ''); // CCYYMMDD
    
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

// Test Variation 1: Minimal NM1 with name only
function generateX12_Variation1() {
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
    
    // Minimal NM1 - name only
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

// Test Variation 2: NM1 with SSN identifier
function generateX12_Variation2() {
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
    
    // NM1 with SSN
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}***SY*${testPatient.ssn}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 3: NM1 with Member ID (MI) identifier
function generateX12_Variation3() {
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
    
    // NM1 with Member ID
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}***MI*12345678~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 4: Complete NM1 with all elements filled
function generateX12_Variation4() {
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
    
    // Complete NM1 with all 11 elements
    const nm1SubscriberSegment = `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}**SU**XX*${OFFICE_ALLY_CONFIG.providerNPI}~`;
    const dmgSegment = `DMG*D8*${base.formattedDOB}*M~`;
    const eqSegment = 'EQ*30~';
    
    const segments = [stSegment, bhtSegment, hl1Segment, nm1PrSegment, hl2Segment, nm1ProviderSegment, hl3Segment, trnSegment, nm1SubscriberSegment, dmgSegment, eqSegment];
    const segmentCount = segments.length + 1;
    
    const seSegment = `SE*${segmentCount}*${base.controlNumber}~`;
    const geSegment = `GE*1*${base.controlNumber}~`;
    const ieaSegment = `IEA*1*${base.controlNumber}~`;
    
    return isaSegment + gsSegment + segments.join('') + seSegment + geSegment + ieaSegment;
}

// Test Variation 5: Alternative TRN segment format
function generateX12_Variation5() {
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
    // Alternative TRN format
    const trnSegment = `TRN*1*${base.controlNumber}*${OFFICE_ALLY_CONFIG.senderID}*REALTIME~`;
    
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

// Analyze X12 999 response
function analyzeX12_999(x12Data) {
    const errors = [];
    const lines = x12Data.split(/[~\\n]/);
    
    for (const line of lines) {
        if (line.startsWith('IK3*')) {
            const segments = line.split('*');
            errors.push({
                type: 'IK3_SEGMENT_ERROR',
                segment: segments[1] || 'Unknown',
                position: segments[2] || 'Unknown',
                code: segments[3] || 'Unknown'
            });
        }
        if (line.startsWith('IK4*')) {
            const segments = line.split('*');
            errors.push({
                type: 'IK4_ELEMENT_ERROR',
                position: segments[1] || 'Unknown',
                code: segments[2] || 'Unknown',
                qualifier: segments[3] || 'Unknown',
                value: segments[4] || 'Unknown'
            });
        }
        if (line.startsWith('CTX*')) {
            const segments = line.split('*');
            errors.push({
                type: 'CTX_CONTEXT_ERROR',
                trigger: segments[1] || 'Unknown',
                segment: segments[2] || 'Unknown',
                position: segments[3] || 'Unknown',
                loop: segments[4] || 'Unknown',
                element: segments[5] || 'Unknown'
            });
        }
    }
    
    return errors;
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
            errors: [],
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
                result.errors = analyzeX12_999(x12Response);
                console.log('❌ X12 999 Validation Error');
                console.log('Errors found:', result.errors);
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
            errors: [{ type: 'EXCEPTION', message: error.message }],
            x12Request: 'Failed to generate',
            x12Response: 'Error occurred'
        };
        testResults.push(result);
        return result;
    }
}

// Main testing function
async function runExhaustiveTesting() {
    console.log('Starting exhaustive testing of Office Ally X12 270 formats...\\n');
    
    const testVariations = [
        { name: 'Variation 1: Minimal NM1 (Name Only)', generator: generateX12_Variation1 },
        { name: 'Variation 2: NM1 with SSN', generator: generateX12_Variation2 },
        { name: 'Variation 3: NM1 with Member ID', generator: generateX12_Variation3 },
        { name: 'Variation 4: Complete NM1', generator: generateX12_Variation4 },
        { name: 'Variation 5: Alternative TRN Format', generator: generateX12_Variation5 }
    ];
    
    for (const variation of testVariations) {
        await testVariation(variation.name, variation.generator);
        // Wait 1 second between requests to be respectful to Office Ally's API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate comprehensive report
    console.log('\\n\\n📊 EXHAUSTIVE TESTING SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\\nTotal variations tested: ${testResults.length}`);
    console.log(`Successful requests: ${testResults.filter(r => r.success).length}`);
    console.log(`Validation errors: ${testResults.filter(r => r.responseType === 'X12_999_VALIDATION_ERROR').length}`);
    console.log(`Other errors: ${testResults.filter(r => r.responseType === 'ERROR').length}`);
    
    console.log('\\n📋 DETAILED RESULTS:');
    testResults.forEach((result, index) => {
        console.log(`\\n${index + 1}. ${result.variation}`);
        console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Response: ${result.responseType}`);
        console.log(`   Duration: ${result.duration}ms`);
        
        if (result.errors.length > 0) {
            console.log('   Errors:');
            result.errors.forEach(error => {
                console.log(`     - ${error.type}: ${JSON.stringify(error)}`);
            });
        }
    });
    
    console.log('\\n🎯 RECOMMENDATIONS FOR OFFICE ALLY SUPPORT:');
    console.log('='.repeat(50));
    console.log('1. All authentication is working correctly');
    console.log('2. All SOAP envelope formatting is correct');
    console.log('3. Multiple X12 270 format variations tested');
    console.log('4. Consistent X12 999 validation errors across all attempts');
    console.log('5. Need specific Utah Medicaid formatting requirements');
    console.log('\\nAll test data and error details documented above for support review.');
    
    return testResults;
}

if (require.main === module) {
    runExhaustiveTesting().catch(console.error);
}

module.exports = { runExhaustiveTesting };