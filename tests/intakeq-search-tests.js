#!/usr/bin/env node

/**
 * Test suite for IntakeQ patient search functionality
 * Tests the multi-word name search capability
 */

require('dotenv').config({ path: '.env.local' });
const { getCachedIntakeQClients } = require('../lib/intakeq-service');

// Test cases to verify multi-word search functionality
const testCases = [
    {
        search: 'Austin',
        expectedToFind: ['Austin Schneider'],
        description: 'Single word - should find patients with matching first name'
    },
    {
        search: 'Schneider',
        expectedToFind: ['Austin Schneider'],
        description: 'Single word - should find patients with matching last name'
    },
    {
        search: 'Austin Schneider',
        expectedToFind: ['Austin Schneider'],
        description: 'Full name - should find exact match (first last order)'
    },
    {
        search: 'Schneider Austin',
        expectedToFind: ['Austin Schneider'],
        description: 'Reverse order - should find match even with reversed name order'
    },
    {
        search: 'Aust Schn',
        expectedToFind: ['Austin Schneider'],
        description: 'Partial names - should find with partial first and last names'
    },
    {
        search: 'austin schneider',
        expectedToFind: ['Austin Schneider'],
        description: 'Case insensitive - should work with lowercase input'
    },
    {
        search: 'AUSTIN SCHNEIDER',
        expectedToFind: ['Austin Schneider'],
        description: 'Case insensitive - should work with uppercase input'
    },
    {
        search: 'Jeremy Montoya',
        expectedToFind: ['Jeremy Montoya'],
        description: 'Different patient - should find Jeremy Montoya'
    },
    {
        search: 'Montoya Jeremy',
        expectedToFind: ['Jeremy Montoya'],
        description: 'Different patient reversed - should find Jeremy with reversed order'
    },
    {
        search: 'Eleanor Hopkins',
        expectedToFind: ['Eleanor Hopkins'],
        description: 'Eleanor Hopkins - should find exact match'
    },
    {
        search: 'Hopkins Eleanor',
        expectedToFind: ['Eleanor Hopkins'],
        description: 'Eleanor Hopkins reversed - should find with reversed order'
    },
    {
        search: 'Nonexistent Patient',
        expectedToFind: [],
        description: 'Non-existent patient - should return empty array'
    },
    {
        search: '  Austin   Schneider  ',
        expectedToFind: ['Austin Schneider'],
        description: 'Extra spaces - should handle multiple spaces correctly'
    }
];

async function runTests() {
    console.log('🧪 Running IntakeQ Patient Search Tests\n');
    console.log('=' .repeat(80));

    let passedTests = 0;
    let failedTests = 0;
    const failedDetails = [];

    for (const testCase of testCases) {
        try {
            console.log(`\n📝 Test: ${testCase.description}`);
            console.log(`   Search query: "${testCase.search}"`);

            const results = await getCachedIntakeQClients({
                search: testCase.search,
                limit: 100
            });

            // Extract full names from results
            const foundNames = results.map(r => `${r.first_name} ${r.last_name}`);

            // Check if expected patients were found
            let testPassed = true;
            let failureReason = '';

            for (const expectedName of testCase.expectedToFind) {
                const found = foundNames.some(name =>
                    name.toLowerCase() === expectedName.toLowerCase()
                );

                if (!found) {
                    testPassed = false;
                    failureReason = `Expected to find "${expectedName}" but didn't`;
                    break;
                }
            }

            // For empty expected results, check that we got no results
            if (testCase.expectedToFind.length === 0 && results.length > 0) {
                testPassed = false;
                failureReason = `Expected no results but found ${results.length} patient(s): ${foundNames.join(', ')}`;
            }

            if (testPassed) {
                console.log(`   ✅ PASSED - Found ${results.length} result(s)`);
                if (results.length > 0) {
                    console.log(`   Found: ${foundNames.slice(0, 5).join(', ')}${results.length > 5 ? '...' : ''}`);
                }
                passedTests++;
            } else {
                console.log(`   ❌ FAILED - ${failureReason}`);
                console.log(`   Actual results: ${foundNames.length > 0 ? foundNames.join(', ') : 'None'}`);
                failedTests++;
                failedDetails.push({
                    test: testCase.description,
                    search: testCase.search,
                    reason: failureReason,
                    actualResults: foundNames
                });
            }

        } catch (error) {
            console.log(`   ❌ ERROR - ${error.message}`);
            failedTests++;
            failedDetails.push({
                test: testCase.description,
                search: testCase.search,
                reason: error.message,
                actualResults: []
            });
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(80));
    console.log(`✅ Passed: ${passedTests}/${testCases.length}`);
    console.log(`❌ Failed: ${failedTests}/${testCases.length}`);
    console.log(`📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('\n⚠️  FAILED TEST DETAILS:');
        console.log('-' .repeat(80));
        for (const failure of failedDetails) {
            console.log(`\nTest: ${failure.test}`);
            console.log(`Search: "${failure.search}"`);
            console.log(`Reason: ${failure.reason}`);
            if (failure.actualResults.length > 0) {
                console.log(`Actual Results: ${failure.actualResults.join(', ')}`);
            }
        }
    }

    if (passedTests === testCases.length) {
        console.log('\n🎉 All tests passed! The patient search is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the search implementation.');
    }

    console.log('\n' + '=' .repeat(80));

    // Return exit code based on test results
    process.exit(failedTests > 0 ? 1 : 0);
}

// Handle errors gracefully
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
});

// Run the tests
runTests().catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
});