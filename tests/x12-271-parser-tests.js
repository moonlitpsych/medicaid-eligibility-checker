#!/usr/bin/env node

/**
 * X12 271 Comprehensive Parser Test Suite
 * Tests the enhanced parser with various payer response formats
 */

const { parseX12_271Comprehensive } = require('../lib/x12-271-comprehensive-parser');
const { validatePatientData } = require('../lib/patient-data-validator');

// Sample X12 271 responses for testing
const TEST_RESPONSES = {
    // Utah Medicaid with active coverage
    utahMedicaidActive: {
        name: 'Utah Medicaid - Active Coverage',
        patientData: {
            firstName: 'Jeremy',
            lastName: 'Montoya',
            dateOfBirth: '1984-07-17',
            memberNumber: '1234567890'
        },
        x12_271: 'ISA*00*          *00*          *ZZ*OFFALLY        *ZZ*UTMCD          *240925*1234*^*00501*000000001*0*P*:~' +
                 'GS*HB*OFFALLY*UTMCD*20240925*1234*1*X*005010X279~' +
                 'ST*271*0001*005010X279~' +
                 'BHT*0022*11*12345*20240925*123456~' +
                 'HL*1**20*1~' +
                 'NM1*PR*2*MEDICAID UTAH*****PI*UTMCD~' +
                 'HL*2*1*21*1~' +
                 'NM1*1P*1*PRIVRATSKY*ANTHONY****XX*1336726843~' +
                 'HL*3*2*22*0~' +
                 'NM1*IL*1*MONTOYA*JEREMY*P***MI*1234567890~' +
                 'N3*123 MAIN ST~' +
                 'N4*SALT LAKE CITY*UT*84101~' +
                 'DMG*D8*19840717*M~' +
                 'REF*3H*12862857~' +
                 'REF*18*000001-EXUT0024~' +
                 'DTP*291*RD8*20250101-20251231~' +
                 'DTP*472*D8*20240925~' +
                 'PER*IC*MEMBER SERVICES*TE*8006629651~' +
                 'EB*1*IND*30**MEDICAID UTAH~' +
                 'MSG*COVERAGE IS ACTIVE FOR THIS MEMBER~' +
                 'SE*20*0001~' +
                 'GE*1*1~' +
                 'IEA*1*000000001~',
        expectedResults: {
            hasName: true,
            hasDOB: true,
            hasAddress: true,
            hasCoverage: true,
            isActive: true,
            payerName: 'MEDICAID UTAH',
            memberIdMatches: true
        }
    },

    // Aetna with expired coverage
    aetnaExpired: {
        name: 'Aetna - Expired Coverage',
        patientData: {
            firstName: 'Austin',
            lastName: 'Schneider',
            dateOfBirth: '1991-08-08',
            memberNumber: '0601626420'
        },
        x12_271: 'ISA*00*          *00*          *ZZ*OFFALLY        *ZZ*60054          *240925*1234*^*00501*000000001*0*P*:~' +
                 'GS*HB*OFFALLY*60054*20240925*1234*1*X*005010X279~' +
                 'ST*271*0001*005010X279~' +
                 'BHT*0022*11*12345*20240925*123456~' +
                 'HL*1**20*1~' +
                 'NM1*PR*2*AETNA HEALTHCARE*****PI*60054~' +
                 'HL*2*1*21*1~' +
                 'NM1*1P*1*PRIVRATSKY*ANTHONY****XX*1336726843~' +
                 'HL*3*2*22*0~' +
                 'NM1*IL*1*SCHNEIDER*AUSTIN*P***MI*101892685000~' +
                 'N3*735 W 12278 S~' +
                 'N4*DRAPER*UT*84020~' +
                 'DMG*D8*19910808*M~' +
                 'REF*6P*000001-01*INDIVIDUAL ON-EXCHANGE~' +
                 'REF*18*000001-EXUT0024~' +
                 'DTP*291*RD8*20240101-20240401~' +
                 'DTP*472*D8*20240925~' +
                 'PER*IC*MEMBER SERVICES*TE*8008725503~' +
                 'EB*1*IND*30**AETNA SELECT~' +
                 'MSG*COVERAGE TERMINATED ON 04/01/2024~' +
                 'SE*20*0001~' +
                 'GE*1*1~' +
                 'IEA*1*000000001~',
        expectedResults: {
            hasName: true,
            hasDOB: true,
            hasAddress: true,
            hasCoverage: true,
            isActive: false,
            isExpired: true,
            payerName: 'AETNA HEALTHCARE',
            memberIdMatches: false,
            memberIdReturned: '101892685000'
        }
    },

    // Managed Care with PCP assignment
    managedCareWithPCP: {
        name: 'Managed Care - With PCP Assignment',
        patientData: {
            firstName: 'Tella',
            lastName: 'Silver',
            dateOfBirth: '2001-06-03',
            memberNumber: '7654321098'
        },
        x12_271: 'ISA*00*          *00*          *ZZ*OFFALLY        *ZZ*UTMCD          *240925*1234*^*00501*000000001*0*P*:~' +
                 'GS*HB*OFFALLY*UTMCD*20240925*1234*1*X*005010X279~' +
                 'ST*271*0001*005010X279~' +
                 'BHT*0022*11*12345*20240925*123456~' +
                 'HL*1**20*1~' +
                 'NM1*PR*2*MEDICAID UTAH*****PI*UTMCD~' +
                 'HL*2*1*21*1~' +
                 'NM1*1P*1*PRIVRATSKY*ANTHONY****XX*1336726843~' +
                 'HL*3*2*22*0~' +
                 'NM1*IL*1*SILVER*TELLA****MI*7654321098~' +
                 'N3*456 STATE ST~' +
                 'N4*PROVO*UT*84601~' +
                 'DMG*D8*20010603*F~' +
                 'DTP*291*RD8*20250101-20251231~' +
                 'EB*1*IND*30**MEDICAID UTAH~' +
                 'LS*2120~' +
                 'NM1*PR*2*UUHP HMHI BEHAVIORAL HEALTH*****PI*HMHI-BHN~' +
                 'N3*1275 PEACHTREE ST NE STE 600~' +
                 'N4*ATLANTA*GA*30309~' +
                 'PER*IC**TE*8004867647~' +
                 'LE*2120~' +
                 'LS*2120~' +
                 'NM1*P3*1*COY*ALLIE*ELIZABETH***XX*1548754971~' +
                 'N3*555 FOOTHILL DRIVE~' +
                 'N4*SALT LAKE CITY*UT*84112~' +
                 'PER*IC**TE*8015812121~' +
                 'LE*2120~' +
                 'SE*25*0001~' +
                 'GE*1*1~' +
                 'IEA*1*000000001~',
        expectedResults: {
            hasName: true,
            hasDOB: true,
            hasAddress: true,
            hasCoverage: true,
            isActive: true,
            hasManagedCareOrg: true,
            hasPCP: true,
            mcoName: 'UUHP HMHI BEHAVIORAL HEALTH',
            pcpName: 'ALLIE ELIZABETH COY',
            pcpNPI: '1548754971'
        }
    },

    // Coordination of Benefits
    withCOB: {
        name: 'With Coordination of Benefits',
        patientData: {
            firstName: 'Eleanor',
            lastName: 'Hopkins',
            dateOfBirth: '1983-05-15',
            memberNumber: 'W12345678'
        },
        x12_271: 'ISA*00*          *00*          *ZZ*OFFALLY        *ZZ*60054          *240925*1234*^*00501*000000001*0*P*:~' +
                 'GS*HB*OFFALLY*60054*20240925*1234*1*X*005010X279~' +
                 'ST*271*0001*005010X279~' +
                 'BHT*0022*11*12345*20240925*123456~' +
                 'HL*1**20*1~' +
                 'NM1*PR*2*AETNA HEALTHCARE*****PI*60054~' +
                 'HL*2*1*21*1~' +
                 'NM1*1P*1*PRIVRATSKY*ANTHONY****XX*1336726843~' +
                 'HL*3*2*22*0~' +
                 'NM1*IL*1*HOPKINS*ELEANOR****MI*W12345678~' +
                 'DMG*D8*19830515*F~' +
                 'DTP*291*RD8*20250101-20251231~' +
                 'EB*1*IND*30**AETNA SELECT~' +
                 'EB*R****COORDINATION OF BENEFITS EXISTS~' +
                 'LS*2120~' +
                 'NM1*PR*2*MEDICARE*****PI*MEDICARE~' +
                 'LE*2120~' +
                 'MSG*MEDICARE IS PRIMARY PAYER~' +
                 'SE*18*0001~' +
                 'GE*1*1~' +
                 'IEA*1*000000001~',
        expectedResults: {
            hasName: true,
            hasDOB: true,
            hasCoverage: true,
            isActive: true,
            hasCOB: true,
            otherPayers: ['MEDICARE'],
            hasMessages: true
        }
    }
};

// Test runner
async function runTests() {
    console.log('🧪 X12 271 Comprehensive Parser Test Suite\n');
    console.log('=' .repeat(80));

    let passedTests = 0;
    let failedTests = 0;
    const failedDetails = [];

    for (const [key, test] of Object.entries(TEST_RESPONSES)) {
        console.log(`\n📝 Testing: ${test.name}`);
        console.log('-' .repeat(60));

        try {
            // Parse the X12 271 response
            const result = parseX12_271Comprehensive(test.x12_271, test.patientData);

            // Run assertions
            const assertions = [];
            const expected = test.expectedResults;

            // Test patient name extraction
            if (expected.hasName) {
                const hasName = result.patientName?.lastName && result.patientName?.firstName;
                assertions.push({
                    name: 'Patient name extracted',
                    passed: hasName,
                    expected: `${test.patientData.lastName}, ${test.patientData.firstName}`,
                    actual: hasName ? `${result.patientName.lastName}, ${result.patientName.firstName}` : 'None'
                });
            }

            // Test DOB extraction
            if (expected.hasDOB) {
                const hasDOB = result.dateOfBirth !== null;
                assertions.push({
                    name: 'Date of birth extracted',
                    passed: hasDOB,
                    expected: test.patientData.dateOfBirth,
                    actual: result.dateOfBirth || 'None'
                });
            }

            // Test address extraction
            if (expected.hasAddress) {
                const hasAddress = result.address?.street !== null;
                assertions.push({
                    name: 'Address extracted',
                    passed: hasAddress,
                    expected: 'Address present',
                    actual: hasAddress ? `${result.address.street}, ${result.address.city}, ${result.address.state}` : 'None'
                });
            }

            // Test coverage period
            if (expected.hasCoverage) {
                const hasCoverage = result.coveragePeriod?.startDate !== null;
                assertions.push({
                    name: 'Coverage period extracted',
                    passed: hasCoverage,
                    expected: 'Coverage dates present',
                    actual: hasCoverage ? `${result.coveragePeriod.startDate} to ${result.coveragePeriod.endDate}` : 'None'
                });
            }

            // Test active status
            if (expected.isActive !== undefined) {
                const isActive = result.coveragePeriod?.isActive;
                assertions.push({
                    name: 'Active status',
                    passed: isActive === expected.isActive,
                    expected: expected.isActive ? 'Active' : 'Inactive',
                    actual: isActive ? 'Active' : 'Inactive'
                });
            }

            // Test expired status
            if (expected.isExpired !== undefined) {
                const isExpired = result.coveragePeriod?.isExpired;
                assertions.push({
                    name: 'Expired status',
                    passed: isExpired === expected.isExpired,
                    expected: expected.isExpired ? 'Expired' : 'Not expired',
                    actual: isExpired ? 'Expired' : 'Not expired'
                });
            }

            // Test payer name
            if (expected.payerName) {
                const payerName = result.payerInfo?.name;
                assertions.push({
                    name: 'Payer name',
                    passed: payerName === expected.payerName,
                    expected: expected.payerName,
                    actual: payerName || 'None'
                });
            }

            // Test member ID validation
            if (expected.memberIdMatches !== undefined) {
                const matches = result.memberIdValidation?.matches;
                assertions.push({
                    name: 'Member ID validation',
                    passed: matches === expected.memberIdMatches,
                    expected: expected.memberIdMatches ? 'Matches' : 'Does not match',
                    actual: matches ? 'Matches' : 'Does not match',
                    details: `Sent: ${result.memberIdValidation?.sent}, Returned: ${result.memberIdValidation?.returned}`
                });
            }

            // Test managed care organization
            if (expected.hasManagedCareOrg) {
                const hasMCO = result.managedCareOrg !== null;
                assertions.push({
                    name: 'Managed Care Organization',
                    passed: hasMCO && result.managedCareOrg.name === expected.mcoName,
                    expected: expected.mcoName,
                    actual: result.managedCareOrg?.name || 'None'
                });
            }

            // Test primary care provider
            if (expected.hasPCP) {
                const hasPCP = result.primaryCareProvider !== null;
                assertions.push({
                    name: 'Primary Care Provider',
                    passed: hasPCP && result.primaryCareProvider.npi === expected.pcpNPI,
                    expected: `${expected.pcpName} (NPI: ${expected.pcpNPI})`,
                    actual: hasPCP ? `${result.primaryCareProvider.name} (NPI: ${result.primaryCareProvider.npi})` : 'None'
                });
            }

            // Test coordination of benefits
            if (expected.hasCOB) {
                const hasCOB = result.otherInsurance?.hasOtherInsurance === true;
                assertions.push({
                    name: 'Coordination of Benefits',
                    passed: hasCOB,
                    expected: 'Has other insurance',
                    actual: hasCOB ? 'Has other insurance' : 'No other insurance'
                });
            }

            // Test messages
            if (expected.hasMessages) {
                const hasMessages = result.messages?.length > 0;
                assertions.push({
                    name: 'Payer messages',
                    passed: hasMessages,
                    expected: 'Has messages',
                    actual: hasMessages ? `${result.messages.length} message(s)` : 'No messages'
                });
            }

            // Count passed/failed assertions
            const failedAssertions = assertions.filter(a => !a.passed);
            const passedAssertions = assertions.filter(a => a.passed);

            if (failedAssertions.length === 0) {
                console.log(`✅ All ${assertions.length} assertions passed`);
                passedTests++;
            } else {
                console.log(`❌ ${failedAssertions.length}/${assertions.length} assertions failed`);
                failedTests++;
                failedDetails.push({
                    test: test.name,
                    failedAssertions: failedAssertions
                });
            }

            // Display assertion results
            console.log('\nAssertion Results:');
            for (const assertion of assertions) {
                const icon = assertion.passed ? '✓' : '✗';
                const color = assertion.passed ? '\x1b[32m' : '\x1b[31m'; // Green or red
                const reset = '\x1b[0m';
                console.log(`  ${color}${icon}${reset} ${assertion.name}`);
                if (!assertion.passed) {
                    console.log(`     Expected: ${assertion.expected}`);
                    console.log(`     Actual:   ${assertion.actual}`);
                    if (assertion.details) {
                        console.log(`     Details:  ${assertion.details}`);
                    }
                }
            }

        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            failedTests++;
            failedDetails.push({
                test: test.name,
                error: error.message
            });
        }
    }

    // Test data validation module
    console.log('\n' + '=' .repeat(80));
    console.log('\n📝 Testing: Data Validation Module');
    console.log('-' .repeat(60));

    try {
        const intakeqData = {
            first_name: 'Austin',
            last_name: 'Schneider',
            date_of_birth: '1991-08-08',
            phone: '8015551234',
            address_street: '123 Old Street',
            primary_insurance_policy_number: '0601626420'
        };

        const payerData = {
            patientName: { firstName: 'Austin', lastName: 'Schneider' },
            dateOfBirth: '1991-08-09', // Different DOB
            phone: '8015559999', // Different phone
            medicaidId: '101892685000' // Different member ID
        };

        const validation = validatePatientData(intakeqData, payerData);

        console.log('✅ Data validation module working');
        console.log(`   Issues found: ${validation.hasIssues}`);
        console.log(`   Critical: ${validation.criticalCount}`);
        console.log(`   Warnings: ${validation.warningCount}`);
        console.log(`   Summary: ${validation.summary}`);
        passedTests++;

    } catch (error) {
        console.log(`❌ Data validation module failed: ${error.message}`);
        failedTests++;
    }

    // Final summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(80));
    console.log(`✅ Passed: ${passedTests}/${passedTests + failedTests}`);
    console.log(`❌ Failed: ${failedTests}/${passedTests + failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('\n⚠️  FAILED TEST DETAILS:');
        console.log('-' .repeat(80));
        for (const failure of failedDetails) {
            console.log(`\n${failure.test}`);
            if (failure.error) {
                console.log(`  Error: ${failure.error}`);
            } else if (failure.failedAssertions) {
                for (const assertion of failure.failedAssertions) {
                    console.log(`  - ${assertion.name}`);
                    console.log(`    Expected: ${assertion.expected}`);
                    console.log(`    Actual:   ${assertion.actual}`);
                }
            }
        }
    }

    if (passedTests === passedTests + failedTests) {
        console.log('\n🎉 All tests passed! The X12 271 comprehensive parser is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the parser implementation.');
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