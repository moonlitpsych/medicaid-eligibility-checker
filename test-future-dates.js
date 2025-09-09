#!/usr/bin/env node
// test-future-dates.js - Test Utah Medicaid future date eligibility queries
require('dotenv').config({ path: '.env.local' });

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1275348807'
};

// Generate X12 270 with specific service date
function generateOfficeAllyX12_270WithDate(patient, serviceDate) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');
    
    // Format service date (CCYYMMDD) for DTP segment
    const serviceDateFormatted = serviceDate.replace(/-/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    const seg = [];
    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    
    // Fix: BHT02 must be '13' (Request), BHT04 needs '20' prefix, BHT05 is HHMM format
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);
    
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);
    seg.push(`HL*3*2*22*0`);
    
    // Fix: Single TRN format like working API
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}`);
    
    // KEY: Use the specific service date in the DTP segment for future eligibility query
    seg.push(`DTP*291*D8*${serviceDateFormatted}`);
    seg.push(`EQ*30`);

    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

// Generate SOAP envelope
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
    try {
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
    } catch (error) {
        console.error('Office Ally request failed:', error);
        throw error;
    }
}

// Parse SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    try {
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
        
        if (!payloadMatch) {
            console.log('🔍 SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
            throw new Error('No payload found in Office Ally SOAP response');
        }
        
        return payloadMatch[1].trim();
    } catch (error) {
        console.error('Office Ally SOAP parsing error:', error);
        throw error;
    }
}

// Test future dates
async function testFutureDates() {
    const patient = {
        first: 'Jeremy',
        last: 'Montoya', 
        dob: '1984-07-17'
    };
    
    console.log('🔮 Testing Utah Medicaid Future Date Eligibility Queries');
    console.log('=' * 60);
    console.log(`Patient: ${patient.first} ${patient.last} (DOB: ${patient.dob})`);
    console.log('');
    
    // Test dates: Today, 2 weeks, 3 weeks, 4 weeks, 6 weeks future
    const today = new Date();
    const testDates = [
        { label: 'Today', date: today },
        { label: '2 weeks future', date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) },
        { label: '3 weeks future', date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000) },
        { label: '4 weeks future', date: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000) },
        { label: '6 weeks future', date: new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000) }
    ];
    
    for (const test of testDates) {
        const serviceDate = test.date.toISOString().slice(0, 10).replace(/-/g, '');
        const displayDate = test.date.toISOString().slice(0, 10);
        
        console.log(`\n📅 Testing ${test.label} (${displayDate}):`);
        console.log('-'.repeat(40));
        
        try {
            const x12_270 = generateOfficeAllyX12_270WithDate(patient, serviceDate);
            const soapRequest = generateOfficeAllySOAPRequest(x12_270);
            
            console.log(`🔍 Querying Utah Medicaid for service date: ${serviceDate}`);
            
            const soapResponse = await sendOfficeAllyRequest(soapRequest);
            const x12_271 = parseOfficeAllySOAPResponse(soapResponse);
            
            // Look for plan types in response
            const planMatches = x12_271.match(/\*MC\*([^~]*)/g) || [];
            const plans = [...new Set(planMatches.map(m => m.replace('*MC*', '')))];
            
            const hasTraditional = plans.some(p => p.includes('TRADITIONAL'));
            const hasTargeted = plans.some(p => p.includes('TARGETED'));
            const hasManagedCare = x12_271.includes('*HM*') && !x12_271.includes('TRANSPORTATION');
            
            console.log(`✅ Response received (${x12_271.length} chars)`);
            console.log(`📋 Plan Types Found: ${plans.slice(0, 3).join(', ')}${plans.length > 3 ? '...' : ''}`);
            console.log(`🎯 Traditional FFS: ${hasTraditional || hasTargeted ? '✅ YES' : '❌ NO'}`);
            console.log(`🏥 Managed Care: ${hasManagedCare ? '⚠️ YES' : '✅ NO'}`);
            console.log(`📊 CM Program Eligible: ${(hasTraditional || hasTargeted) && !hasManagedCare ? '✅ YES' : '❌ NO'}`);
            
            // Save raw response for analysis
            require('fs').writeFileSync(`x12_271_future_${test.label.replace(/\s+/g, '_').toLowerCase()}_${serviceDate}.txt`, x12_271);
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        // Brief pause between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 Future date testing complete!');
    console.log('📁 Check generated x12_271_future_*.txt files for detailed analysis');
}

// Run the test
if (require.main === module) {
    testFutureDates().catch(console.error);
}

module.exports = { testFutureDates };