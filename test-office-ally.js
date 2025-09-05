#!/usr/bin/env node

// Test script for Office Ally eligibility integration
// This script tests the dual-provider functionality in simulation mode

console.log('🏥 Office Ally Medicaid Eligibility Test');
console.log('=======================================\n');

// Set environment variables for Office Ally
process.env.ELIGIBILITY_PROVIDER = 'office_ally';
process.env.SIMULATION_MODE = 'true';
process.env.PROVIDER_NPI = '1275348807';

const testPatients = [
    {
        name: 'Active Coverage Test',
        patient: {
            first: 'Sarah',
            last: 'Johnson',
            dob: '1985-06-15',
            ssn: '123456789'
        }
    },
    {
        name: 'Medicaid ID Test',
        patient: {
            first: 'Michael',
            last: 'Smith',
            dob: '1990-03-22',
            medicaidId: '1234567890'
        }
    },
    {
        name: 'Managed Care Test',
        patient: {
            first: 'Jennifer',
            last: 'Davis',
            dob: '1978-11-08',
            ssn: '987654321'
        }
    },
    {
        name: 'Coverage Suspended Test',
        patient: {
            first: 'Robert',
            last: 'Wilson',
            dob: '1992-01-30',
            ssn: '555666777'
        }
    }
];

async function testEligibilityCheck(testCase) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`   Patient: ${testCase.patient.first} ${testCase.patient.last}`);
    console.log(`   DOB: ${testCase.patient.dob}`);
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCase.patient)
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (result.enrolled) {
            console.log(`   ✅ ENROLLED: ${result.program}`);
            console.log(`   📅 Effective: ${result.effectiveDate}`);
            console.log(`   📝 Details: ${result.details}`);
        } else {
            console.log(`   ❌ NOT ENROLLED: ${result.error}`);
        }
        
        console.log(`   ⏱️  Response Time: ${duration}ms`);
        console.log(`   🔍 Verified: ${result.verified ? 'Real' : 'Simulation'}`);
        
    } catch (error) {
        console.log(`   💥 ERROR: ${error.message}`);
    }
}

async function runTests() {
    console.log('🔧 Configuration:');
    console.log(`   Provider: ${process.env.ELIGIBILITY_PROVIDER.toUpperCase()}`);
    console.log(`   Mode: ${process.env.SIMULATION_MODE === 'true' ? 'SIMULATION' : 'PRODUCTION'}`);
    console.log(`   NPI: ${process.env.PROVIDER_NPI}`);
    
    // Test each patient scenario
    for (const testCase of testPatients) {
        await testEligibilityCheck(testCase);
        
        // Add delay between requests to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏆 Office Ally Testing Complete!');
    console.log('\nNext Steps:');
    console.log('1. Obtain Office Ally credentials');
    console.log('2. Set OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD');
    console.log('3. Set SIMULATION_MODE=false for real testing');
    console.log('4. Test with real Utah Medicaid patients');
    
    // Test switching to UHIN
    console.log('\n🔄 Testing Provider Switch...');
    process.env.ELIGIBILITY_PROVIDER = 'uhin';
    console.log(`   Switched to: ${process.env.ELIGIBILITY_PROVIDER.toUpperCase()}`);
    
    await testEligibilityCheck({
        name: 'UHIN Provider Test',
        patient: {
            first: 'Test',
            last: 'Patient',
            dob: '1980-05-12',
            ssn: '111223333'
        }
    });
    
    console.log('\n✨ Dual-provider testing complete!');
}

// Only run if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testPatients };