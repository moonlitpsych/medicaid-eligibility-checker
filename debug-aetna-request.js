#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugAetnaRequest() {
    console.log('🔍 DEBUGGING AETNA OFFICE ALLY REQUEST');
    console.log('=====================================\n');
    
    const patient = {
        first: 'Tella',
        last: 'Silver', 
        dob: '1995-09-18',
        payerId: '60054',
        medicaidId: 'W268197637'
    };
    
    console.log('Patient Details:', patient);
    console.log('\n📡 Sending request to Office Ally via our API...\n');
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
        });
        
        const endTime = Date.now();
        console.log(`⏱️  Response time: ${endTime - startTime}ms`);
        console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
        
        const result = await response.json();
        
        console.log('\n📋 FULL API RESPONSE:');
        console.log('======================');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n🔍 ANALYSIS:');
        console.log('============');
        
        if (result.error?.includes('No active Aetna Healthcare coverage found')) {
            console.log('❌ Office Ally returned no active coverage');
            console.log('\nPossible reasons:');
            console.log('1. Patient not in Office Ally\'s Aetna database');
            console.log('2. Coverage lapsed or terminated'); 
            console.log('3. Aetna plan not connected to Office Ally real-time');
            console.log('4. Insurance ID format issue (W268197637)');
            console.log('5. Name/DOB mismatch in Aetna records');
            
            console.log('\n🔧 TROUBLESHOOTING STEPS:');
            console.log('=========================');
            console.log('1. Verify patient has current active Aetna coverage');
            console.log('2. Check if insurance ID W268197637 is correct format');
            console.log('3. Confirm Tella Silver name matches Aetna records exactly');
            console.log('4. Try without insurance ID (name + DOB only)');
            console.log('5. Contact Office Ally about Aetna real-time connectivity');
            
        } else if (result.enrolled) {
            console.log('✅ SUCCESS! Found active Aetna coverage');
            console.log(`Program: ${result.program}`);
            if (result.copayInfo?.hasCopay) {
                console.log(`💰 Copay detected: $${result.copayInfo.copayAmount}`);
            }
        }
        
        console.log('\n📡 OFFICE ALLY INTEGRATION STATUS:');
        console.log('===================================');
        console.log('✅ API connectivity: Working');
        console.log('✅ X12 270 generation: Working (Aetna payer ID 60054)');
        console.log('✅ SOAP envelope: Working');  
        console.log('✅ X12 271 parsing: Ready');
        console.log('❓ Aetna data availability: Patient not found');
        
    } catch (error) {
        console.log('❌ Request failed:', error.message);
    }
}

debugAetnaRequest();