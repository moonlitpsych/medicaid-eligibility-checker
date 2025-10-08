#!/usr/bin/env node

/**
 * Debug runtime differences between files
 */

require('dotenv').config();

// Test working version
async function testWorking() {
    console.log('🔍 TESTING WORKING VERSION (test-office-ally-final.js approach)');
    
    const { testEligibility } = require('./test-office-ally-final');
    
    const patient = {
        first: 'Jeremy',
        last: 'Montoya',
        dob: '1984-07-17',
        gender: 'M'
    };
    
    try {
        const result = await testEligibility(patient);
        console.log('✅ Working result:', result);
    } catch (error) {
        console.error('❌ Working error:', error.message);
    }
}

// Test universal version
async function testUniversal() {
    console.log('\n🔍 TESTING UNIVERSAL VERSION');
    
    const { checkUniversalEligibility } = require('./universal-eligibility-checker');
    
    const patient = {
        first: 'Jeremy',
        last: 'Montoya',
        dob: '1984-07-17',
        gender: 'M'
    };
    
    try {
        const result = await checkUniversalEligibility(patient, 'UTAH_MEDICAID');
        console.log('✅ Universal result:', result);
    } catch (error) {
        console.error('❌ Universal error:', error.message);
    }
}

async function main() {
    await testWorking();
    await testUniversal();
}

if (require.main === module) {
    main().catch(console.error);
}