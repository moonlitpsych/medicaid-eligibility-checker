#!/usr/bin/env node

/**
 * Comprehensive Aetna Integration Testing
 * Using official Office Ally payer IDs from their 270/271 eligibility list
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Official Aetna payer IDs from Office Ally 270/271 eligibility list
const OFFICIAL_AETNA_PAYERS = [
    { id: '60054', name: 'Aetna Healthcare', type: 'Commercial' },
    { id: 'AETNA-LTC', name: 'Aetna Long Term Care', type: 'Specialized' },
    { id: 'AETNA-RETIREE', name: 'Aetna Retiree Medical Plan', type: 'Retiree' },
    { id: 'AETNA-USHC', name: 'Aetna US Healthcare', type: 'Commercial' },
    // State-specific Aetna Better Health plans
    { id: 'ABH-CA', name: 'Aetna Better Health California', type: 'Medicaid' },
    { id: 'ABH-FL', name: 'Aetna Better Health Florida', type: 'Medicaid' },
    { id: 'ABH-IL', name: 'Aetna Better Health Illinois', type: 'Medicaid' },
    { id: 'ABH-KS', name: 'Aetna Better Health Kansas', type: 'Medicaid' },
    { id: 'ABH-KY', name: 'Aetna Better Health Kentucky', type: 'Medicaid' },
    { id: 'ABH-LA', name: 'Aetna Better Health Louisiana', type: 'Medicaid' },
    { id: 'ABH-MD', name: 'Aetna Better Health Maryland', type: 'Medicaid' },
    { id: 'ABH-MI', name: 'Aetna Better Health Michigan', type: 'Medicaid' },
    { id: 'ABH-NV', name: 'Aetna Better Health Nevada', type: 'Medicaid' },
    { id: 'ABH-NJ', name: 'Aetna Better Health New Jersey', type: 'Medicaid' },
    { id: 'ABH-NY', name: 'Aetna Better Health New York', type: 'Medicaid' },
    { id: 'ABH-OH', name: 'Aetna Better Health Ohio', type: 'Medicaid' },
    { id: 'ABH-OK', name: 'Aetna Better Health Oklahoma', type: 'Medicaid' },
    { id: 'ABH-PA', name: 'Aetna Better Health Pennsylvania', type: 'Medicaid' },
    { id: 'ABH-TX', name: 'Aetna Better Health Texas', type: 'Medicaid' },
    { id: 'ABH-VA', name: 'Aetna Better Health Virginia', type: 'Medicaid' },
    { id: 'ABH-WV', name: 'Aetna Better Health West Virginia', type: 'Medicaid' }
];

// Test patients - need patients who may have active Aetna coverage
const TEST_PATIENTS = [
    {
        name: 'Jeremy Montoya (Known Utah Medicaid)',
        patient: { first: 'Jeremy', last: 'Montoya', dob: '1984-07-17' },
        expectation: 'Should work with Utah Medicaid but fail with Aetna'
    },
    {
        name: 'Tella Silver (Previous Test Case)',
        patient: { first: 'Tella', last: 'Silver', dob: '1995-09-18' },
        expectation: 'Previously tested with Aetna 60054 - no coverage found'
    },
    {
        name: 'Sample Patient A',
        patient: { first: 'John', last: 'Smith', dob: '1985-03-15' },
        expectation: 'Generic test case'
    }
];

async function testAetnaPayerID(payerConfig, patientData, testDescription) {
    console.log(`\n🔍 Testing: ${payerConfig.name} (${payerConfig.id})`);
    console.log(`   Patient: ${patientData.first} ${patientData.last} (${patientData.dob})`);
    console.log(`   Type: ${payerConfig.type}`);
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...patientData,
                payerId: payerConfig.id,
                payerName: payerConfig.name
            })
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`   ⏱️  Response time: ${responseTime}ms`);
        
        if (!response.ok) {
            console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
            return { success: false, error: `HTTP ${response.status}`, payerId: payerConfig.id };
        }
        
        const result = await response.json();
        
        if (result.enrolled) {
            console.log(`   ✅ FOUND COVERAGE! ${payerConfig.name}`);
            console.log(`      Program: ${result.program || 'N/A'}`);
            console.log(`      Payer: ${result.payerInfo?.payerName || 'Unknown'}`);
            
            if (result.copayInfo?.hasCopay) {
                console.log(`      🚨 COPAY DETECTED: $${result.copayInfo.copayAmount}`);
            }
            
            // This is our success case!
            console.log(`\n🎉 SUCCESS! We found active Aetna coverage!`);
            console.log(`   Full response:`, JSON.stringify(result, null, 2));
            
            return { 
                success: true, 
                enrolled: true, 
                payerId: payerConfig.id,
                payerName: payerConfig.name,
                result: result
            };
            
        } else {
            console.log(`   ℹ️  No coverage: ${result.error || 'Unknown reason'}`);
            return { 
                success: true, 
                enrolled: false, 
                payerId: payerConfig.id,
                error: result.error 
            };
        }
        
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        return { success: false, error: error.message, payerId: payerConfig.id };
    }
}

async function runComprehensiveAetnaTest() {
    console.log('🚀 COMPREHENSIVE AETNA INTEGRATION TEST');
    console.log('=====================================');
    console.log(`Testing ${OFFICIAL_AETNA_PAYERS.length} official Office Ally Aetna payer IDs`);
    console.log(`with ${TEST_PATIENTS.length} test patients\n`);
    
    const results = {
        totalTests: 0,
        successfulTests: 0,
        foundCoverage: 0,
        noCoverage: 0,
        errors: 0,
        coverageFindings: []
    };
    
    // Test each payer ID with each patient
    for (const patient of TEST_PATIENTS) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`TESTING PATIENT: ${patient.name}`);
        console.log(`Expectation: ${patient.expectation}`);
        console.log(`${'='.repeat(60)}`);
        
        for (const payer of OFFICIAL_AETNA_PAYERS) {
            results.totalTests++;
            
            const testResult = await testAetnaPayerID(payer, patient.patient, patient.name);
            
            if (!testResult.success) {
                results.errors++;
            } else if (testResult.enrolled) {
                results.foundCoverage++;
                results.coverageFindings.push({
                    patient: patient.name,
                    payer: payer.name,
                    payerId: payer.id,
                    result: testResult.result
                });
                
                // If we find coverage, this is a breakthrough!
                console.log(`\n🎯 BREAKTHROUGH FINDING!`);
                console.log(`Patient: ${patient.name}`);
                console.log(`Payer: ${payer.name} (${payer.id})`);
                break; // Move to next patient once we find coverage
                
            } else {
                results.noCoverage++;
            }
            
            results.successfulTests++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    // Final Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Successful API calls: ${results.successfulTests}`);
    console.log(`Coverage found: ${results.foundCoverage}`);
    console.log(`No coverage: ${results.noCoverage}`);
    console.log(`Errors: ${results.errors}`);
    
    if (results.coverageFindings.length > 0) {
        console.log(`\n✅ COVERAGE FINDINGS:`);
        results.coverageFindings.forEach((finding, index) => {
            console.log(`${index + 1}. ${finding.patient} → ${finding.payer} (${finding.payerId})`);
        });
        
        console.log(`\n🎯 NEXT STEPS:`);
        console.log(`1. Focus on successful payer IDs for copay detection implementation`);
        console.log(`2. Test additional patients with these working payer IDs`);
        console.log(`3. Implement copay parsing from X12 271 responses`);
        
    } else {
        console.log(`\n❌ NO AETNA COVERAGE FOUND`);
        console.log(`\nPossible explanations:`);
        console.log(`1. Test patients don't have active Aetna coverage`);
        console.log(`2. Office Ally may require specific Aetna enrollment`);
        console.log(`3. Real-time eligibility may be limited for certain plans`);
        console.log(`4. Patient identifiers may need additional fields (SSN, member ID)`);
        
        console.log(`\n🔧 RECOMMENDED ACTIONS:`);
        console.log(`1. Contact Office Ally support about Aetna real-time eligibility requirements`);
        console.log(`2. Test with patients who recently used Aetna insurance`);
        console.log(`3. Try additional patient identifier formats`);
        console.log(`4. Verify Aetna plan types supported by Office Ally`);
    }
    
    return results;
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        });
        return true;
    } catch (error) {
        console.error('❌ Server not accessible. Please ensure the API server is running on port 3000.');
        console.error('   Start with: npm start or node server.js');
        return false;
    }
}

async function main() {
    console.log('🔧 Checking server status...');
    const serverOnline = await checkServerStatus();
    
    if (!serverOnline) {
        process.exit(1);
    }
    
    console.log('✅ Server is online. Starting comprehensive Aetna tests...\n');
    
    const results = await runComprehensiveAetnaTest();
    
    console.log(`\n🏁 Test completed. Found ${results.foundCoverage} coverage matches.`);
    
    if (results.foundCoverage > 0) {
        console.log(`✅ SUCCESS: Office Ally Aetna integration is working!`);
    } else {
        console.log(`⚠️  No coverage found - investigation needed`);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveAetnaTest };