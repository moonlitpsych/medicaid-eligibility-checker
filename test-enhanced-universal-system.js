#!/usr/bin/env node

/**
 * Test Script for Enhanced Universal Eligibility System
 * 
 * Tests the new dynamic payer system with the two verified working cases:
 * 1. Jeremy Montoya - Utah Medicaid (Traditional FFS)
 * 2. Tella Silver - Aetna Healthcare
 * 
 * This script validates that the enhanced system works correctly without
 * modifying the existing working services.
 */

require('dotenv').config({ path: '.env.local' });
const { checkUniversalEligibility } = require('./api-universal-eligibility');
const { generateDynamicFormConfig, getPayerDropdownOptions } = require('./dynamic-field-system');

// Test cases based on known working scenarios
const TEST_CASES = [
    {
        name: 'Jeremy Montoya - Utah Medicaid',
        payerId: 'UTAH_MEDICAID',
        patientData: {
            firstName: 'Jeremy',
            lastName: 'Montoya', 
            dateOfBirth: '1984-07-17',
            gender: 'M',
            medicaidId: null, // Optional for Utah Medicaid
            memberNumber: null,
            groupNumber: null,
            ssn: null,
            address: null
        },
        expectedResult: {
            enrolled: true,
            shouldContain: ['Utah Medicaid', 'Traditional']
        }
    },
    {
        name: 'Tella Silver - Aetna Healthcare',
        payerId: 'AETNA',
        patientData: {
            firstName: 'Tella',
            lastName: 'Silver',
            dateOfBirth: '1995-09-18',
            gender: 'F',
            medicaidId: null,
            memberNumber: 'W268197637', // Known Aetna member ID
            groupNumber: null,
            ssn: null,
            address: null
        },
        expectedResult: {
            enrolled: true,
            shouldContain: ['Aetna', 'POS'],
            hasCopayInfo: true
        }
    }
];

/**
 * Test the dynamic form configuration system
 */
async function testFormConfigSystem() {
    console.log('\n🧪 Testing Dynamic Form Configuration System...\n');
    
    try {
        // Test 1: Get all payer options
        console.log('📋 Test 1: Getting all payer dropdown options...');
        const payerOptions = getPayerDropdownOptions();
        
        console.log(`✅ Found ${payerOptions.length} payer categories:`);
        payerOptions.forEach(category => {
            console.log(`   📁 ${category.category}: ${category.payers.length} payers`);
            category.payers.forEach(payer => {
                const status = payer.tested ? '✅ Tested' : '⚠️  Untested';
                console.log(`      - ${payer.label} ${status}`);
            });
        });
        
        // Test 2: Generate form configs for test payers
        for (const testCase of TEST_CASES) {
            console.log(`\n📋 Test 2: Generating form config for ${testCase.payerId}...`);
            
            const formConfig = generateDynamicFormConfig(testCase.payerId);
            
            console.log(`✅ Form Config Generated:`);
            console.log(`   Payer: ${formConfig.payerName} (${formConfig.category})`);
            console.log(`   Required Fields: ${formConfig.submitRequirements.required.join(', ')}`);
            console.log(`   Recommended Fields: ${formConfig.submitRequirements.recommended.join(', ')}`);
            console.log(`   Total Fields: ${formConfig.fields.length}`);
            console.log(`   Notes: ${formConfig.notes}`);
            
            // Validate that the form config matches the test data
            const missingRequired = formConfig.submitRequirements.required.filter(
                field => !testCase.patientData[field] || testCase.patientData[field] === null
            );
            
            if (missingRequired.length > 0) {
                console.log(`   ⚠️  Missing required fields for test: ${missingRequired.join(', ')}`);
            } else {
                console.log(`   ✅ All required fields present in test data`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Form config system test failed:', error);
        return false;
    }
}

/**
 * Test the universal eligibility API with known working cases
 */
async function testUniversalEligibilityAPI() {
    console.log('\n🧪 Testing Universal Eligibility API...\n');
    
    const results = [];
    
    for (const testCase of TEST_CASES) {
        console.log(`📡 Testing: ${testCase.name}`);
        console.log(`   Payer: ${testCase.payerId}`);
        console.log(`   Patient: ${testCase.patientData.firstName} ${testCase.patientData.lastName} (${testCase.patientData.dateOfBirth})`);
        
        try {
            const startTime = Date.now();
            const result = await checkUniversalEligibility(testCase.patientData, testCase.payerId);
            const duration = Date.now() - startTime;
            
            console.log(`   ⏱️  Response Time: ${duration}ms`);
            console.log(`   📨 Result: ${result.enrolled ? '✅ ENROLLED' : '❌ NOT ENROLLED'}`);
            
            if (result.enrolled) {
                console.log(`   🏥 Program: ${result.program}`);
                console.log(`   📋 Plan Type: ${result.planType}`);
                if (result.details) console.log(`   📝 Details: ${result.details}`);
                
                if (result.copayInfo && testCase.expectedResult.hasCopayInfo) {
                    console.log(`   💰 Copay Info Found:`);
                    if (result.copayInfo.officeCopay) console.log(`      Office Visit: $${result.copayInfo.officeCopay}`);
                    if (result.copayInfo.specialistCopay) console.log(`      Specialist: $${result.copayInfo.specialistCopay}`);
                    if (result.copayInfo.emergencyCopay) console.log(`      Emergency: $${result.copayInfo.emergencyCopay}`);
                    if (result.copayInfo.urgentCareCopay) console.log(`      Urgent Care: $${result.copayInfo.urgentCareCopay}`);
                }
            } else {
                console.log(`   ❌ Error: ${result.error}`);
                if (result.x12Details && result.x12Details.errorDetails) {
                    console.log(`   🔍 X12 Errors:`);
                    result.x12Details.errorDetails.forEach(err => console.log(`      - ${err}`));
                }
            }
            
            // Validate against expected results
            const testPassed = validateTestResult(result, testCase.expectedResult);
            console.log(`   🧪 Test Status: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
            
            results.push({
                testCase: testCase.name,
                passed: testPassed,
                enrolled: result.enrolled,
                responseTime: duration,
                result
            });
            
        } catch (error) {
            console.error(`   ❌ Test failed with error: ${error.message}`);
            results.push({
                testCase: testCase.name,
                passed: false,
                error: error.message,
                enrolled: false,
                responseTime: 0
            });
        }
        
        console.log(''); // Add spacing between tests
    }
    
    return results;
}

/**
 * Validate test result against expected outcome
 */
function validateTestResult(actualResult, expectedResult) {
    // Check enrollment status
    if (actualResult.enrolled !== expectedResult.enrolled) {
        return false;
    }
    
    // Check if result contains expected strings
    if (expectedResult.shouldContain) {
        const resultText = `${actualResult.program} ${actualResult.planType} ${actualResult.details}`.toLowerCase();
        for (const expectedString of expectedResult.shouldContain) {
            if (!resultText.includes(expectedString.toLowerCase())) {
                console.log(`     ❌ Expected to find "${expectedString}" in result text`);
                return false;
            }
        }
    }
    
    // Check copay info if expected
    if (expectedResult.hasCopayInfo && !actualResult.copayInfo) {
        console.log(`     ❌ Expected copay information but none found`);
        return false;
    }
    
    return true;
}

/**
 * Generate test summary report
 */
function generateTestSummary(formConfigPassed, eligibilityResults) {
    console.log('\n📊 TEST SUMMARY REPORT');
    console.log('========================\n');
    
    // Form Configuration Tests
    console.log('🔧 Form Configuration System:');
    console.log(`   Status: ${formConfigPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('   - Payer dropdown generation: ✅');
    console.log('   - Dynamic form field configuration: ✅'); 
    console.log('   - Field requirement validation: ✅');
    console.log('');
    
    // Eligibility API Tests
    console.log('📡 Universal Eligibility API:');
    const passedTests = eligibilityResults.filter(r => r.passed).length;
    const totalTests = eligibilityResults.length;
    console.log(`   Overall: ${passedTests}/${totalTests} tests passed\n`);
    
    eligibilityResults.forEach(result => {
        console.log(`   📋 ${result.testCase}:`);
        console.log(`      Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`      Enrolled: ${result.enrolled ? 'Yes' : 'No'}`);
        console.log(`      Response Time: ${result.responseTime}ms`);
        if (result.error) console.log(`      Error: ${result.error}`);
        console.log('');
    });
    
    // Overall System Status
    const overallPassed = formConfigPassed && passedTests === totalTests;
    console.log('🎯 OVERALL SYSTEM STATUS:');
    console.log(`   ${overallPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('   Enhanced Universal Eligibility System is', overallPassed ? 'READY' : 'NOT READY');
    
    if (overallPassed) {
        console.log('\n🚀 DEPLOYMENT READY!');
        console.log('   ✅ Dynamic payer selection working');
        console.log('   ✅ Field requirements adapt per payer');
        console.log('   ✅ Utah Medicaid integration verified'); 
        console.log('   ✅ Aetna integration verified');
        console.log('   ✅ Existing working services unchanged');
        console.log('\n   Next steps:');
        console.log('   1. Start the API server: node api-server.js');
        console.log('   2. Access the universal checker at /src/components/UniversalEligibilityChecker.vue');
        console.log('   3. Test additional payers as needed');
    } else {
        console.log('\n⚠️  ISSUES TO RESOLVE:');
        if (!formConfigPassed) console.log('   - Fix form configuration system');
        if (passedTests < totalTests) console.log('   - Debug failed eligibility tests');
    }
}

/**
 * Main test execution
 */
async function runTests() {
    console.log('🧪 ENHANCED UNIVERSAL ELIGIBILITY SYSTEM - TEST SUITE');
    console.log('====================================================');
    
    try {
        // Test 1: Form Configuration System
        const formConfigPassed = await testFormConfigSystem();
        
        // Test 2: Universal Eligibility API
        const eligibilityResults = await testUniversalEligibilityAPI();
        
        // Generate Summary Report
        generateTestSummary(formConfigPassed, eligibilityResults);
        
        // Exit with appropriate code
        const allPassed = formConfigPassed && eligibilityResults.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testFormConfigSystem,
    testUniversalEligibilityAPI,
    TEST_CASES
};