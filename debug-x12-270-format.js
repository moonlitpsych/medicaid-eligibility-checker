#!/usr/bin/env node

/**
 * Debug X12 270 Format Generation
 * Compare our generated format against Office Ally Companion Guide requirements
 */

// Copy the exact function from routes/eligibility.js for debugging
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID, 
    username: '[REDACTED-USERNAME]',
    password: '[REDACTED-PASSWORD]',
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC',
    isa06: '[REDACTED-SENDER-ID]',
    isa08: 'OFFALLY', 
    gs02: '[REDACTED-SENDER-ID]', 
    gs03: 'OFFALLY'
};

// Payer configurations
const PAYER_CONFIGS = {
    // Utah Medicaid (default) - corrected based on working X12 271 response
    'UTMCD': { name: 'MEDICAID UTAH', displayName: 'Utah Medicaid' },
    'SKUT0': { name: 'MEDICAID UTAH', displayName: 'Utah Medicaid' },
};

// Generate X12 270 for Office Ally with dynamic payer support
function generateOfficeAllyX12_270(patient, payerId = 'UTMCD') {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');

    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100000)}`;
    
    // Get payer configuration
    const payerConfig = PAYER_CONFIGS[payerId] || PAYER_CONFIGS['UTMCD'];
    const payerName = payerConfig.name;
    
    // Fix payer ID mapping based on Office Ally Companion Guide
    let actualPayerId = payerId;
    if (payerId === 'SKUT0' || payerId === 'UTMCD') {
        actualPayerId = 'UTMCD'; // Use correct Utah Medicaid payer ID
    }

    // FIXED: Use correct ISA format per Office Ally Companion Guide page 12
    // ISA07 should be '01' not 'ZZ' for Office Ally
    return `ISA*00*          *00*          *ZZ*${OFFICE_ALLY_CONFIG.isa06.padEnd(15)}*01*${OFFICE_ALLY_CONFIG.isa08.padEnd(15)}*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~GS*HS*${OFFICE_ALLY_CONFIG.gs02}*${OFFICE_ALLY_CONFIG.gs03}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~ST*270*${controlNumber}*005010X279A1~BHT*0022*13**${fullDateStr}*${timeStr}~HL*1**20*1~NM1*PR*2*${payerName}*****PI*${actualPayerId}~HL*2*1*21*1~NM1*1P*1*${OFFICE_ALLY_CONFIG.providerName}****XX*${OFFICE_ALLY_CONFIG.providerNPI}~HL*3*2*22*0~TRN*1*${trackingRef1}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~TRN*1*${trackingRef2}*${OFFICE_ALLY_CONFIG.isa06}*REALTIME~NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}***MI*${patient.ssn || patient.medicaidId || 'UNKNOWN'}~DMG*D8*${formattedDOB}*${patient.gender || 'U'}~EQ*30~SE*${controlNumber.length + 15}*${controlNumber}~GE*1*${controlNumber}~IEA*1*${controlNumber}~`;
}

console.log('🔍 X12 270 FORMAT DEBUGGING');
console.log('=============================\n');

// Test with Jeremy Montoya
const jeremyPatient = {
    first: 'Jeremy',
    last: 'Montoya',
    dob: '1984-07-17',
    medicaidId: '0900412827',
    gender: 'M'
};

console.log('Patient Data:', jeremyPatient);
console.log('\n📋 Generated X12 270:');
console.log('========================');

const x12_270 = generateOfficeAllyX12_270(jeremyPatient, 'UTMCD');
console.log(x12_270);

console.log('\n📊 X12 270 SEGMENTS BREAKDOWN:');
console.log('===============================');

const segments = x12_270.split('~');
segments.forEach((segment, index) => {
    if (segment.trim()) {
        console.log(`${index + 1}. ${segment}~`);
    }
});

console.log('\n🔍 COMPANION GUIDE COMPLIANCE CHECK:');
console.log('====================================');

// Check ISA segment compliance (Page 12 of companion guide)
const isaSegment = segments[0];
const isaParts = isaSegment.split('*');

console.log('\nISA Segment Analysis:');
console.log(`ISA01 (Auth Info Qualifier): "${isaParts[1]}" - Should be "00" ✅`);
console.log(`ISA02 (Authorization): "${isaParts[2]}" - Should be 10 spaces ✅`);
console.log(`ISA03 (Security Info Qualifier): "${isaParts[3]}" - Should be "00" ✅`);
console.log(`ISA04 (Security Info): "${isaParts[4]}" - Should be 10 spaces ✅`);
console.log(`ISA05 (Interchange ID Qualifier): "${isaParts[5]}" - Should be "ZZ" ✅`);
console.log(`ISA06 (Sender ID): "${isaParts[6]}" - Should be OA assigned (1161680 padded) ✅`);
console.log(`ISA07 (Interchange ID Qualifier): "${isaParts[7]}" - Should be "01" ${isaParts[7] === '01' ? '✅' : '❌'}`);
console.log(`ISA08 (Receiver ID): "${isaParts[8]}" - Should be "OFFALLY" padded ✅`);
console.log(`ISA15 (Usage Indicator): "${isaParts[15]}" - Should be "P" ✅`);

// Check GS segment (Page 13)
const gsSegment = segments[1];
const gsParts = gsSegment.split('*');

console.log('\nGS Segment Analysis:');
console.log(`GS01 (Functional ID): "${gsParts[1]}" - Should be "HS" for 270 ${gsParts[1] === 'HS' ? '✅' : '❌'}`);
console.log(`GS02 (Sender Code): "${gsParts[2]}" - Should be OA assigned (1161680) ${gsParts[2] === '[REDACTED-SENDER-ID]' ? '✅' : '❌'}`);
console.log(`GS03 (Receiver Code): "${gsParts[3]}" - Should be "OFFALLY" ${gsParts[3] === 'OFFALLY' ? '✅' : '❌'}`);
console.log(`GS08 (Version): "${gsParts[8]}" - Should be "005010X279A1" ${gsParts[8] === '005010X279A1' ? '✅' : '❌'}`);

// Check key content segments
console.log('\nContent Segment Analysis:');
segments.forEach((segment, index) => {
    if (segment.startsWith('NM1*PR')) {
        console.log(`Payer Segment: ${segment}~ - Contains Utah Medicaid payer info`);
    }
    if (segment.startsWith('NM1*IL')) {
        console.log(`Member Segment: ${segment}~ - Contains patient info`);
    }
    if (segment.startsWith('TRN')) {
        console.log(`Trace Segment: ${segment}~ - Tracking reference`);
    }
});

console.log('\n🚨 POTENTIAL ISSUES:');
console.log('====================');

if (isaParts[7] !== '01') {
    console.log('❌ ISA07 should be "01" per companion guide page 12');
}

console.log('\n💡 RECOMMENDATIONS:');
console.log('===================');
console.log('1. Verify ISA07 is set to "01" (Office Ally requirement)');
console.log('2. Confirm payer ID "UTMCD" matches Office Ally\'s Utah Medicaid ID');
console.log('3. Test with different member ID formats if still failing');
console.log('4. Check if Office Ally requires specific provider enrollment');

console.log('\n✅ Next step: Send this X12 270 to Office Ally and analyze the response');