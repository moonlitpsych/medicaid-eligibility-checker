/**
 * X12 271 Coordination of Benefits (COB) Parser
 *
 * Extracts other insurance / primary payer information from X12 271
 * eligibility responses.
 *
 * Used to identify primary insurance when a secondary payer (like Medicaid)
 * requires primary to be billed first.
 *
 * Looks for:
 * - EB*R* segments (Other/Additional Payer indicator)
 * - Loop 2120 (Other Payer Details)
 * - NM1*PR* segments (Payer Name)
 * - AAA segments (Error/Rejection codes)
 */

/**
 * AAA Segment Rejection Reason Codes
 * https://www.stedi.com/edi/x12/segment/AAA
 */
const AAA_REJECT_CODES = {
    '42': 'Unable to Respond at Current Time',
    '43': 'Invalid or Missing Provider Identification',
    '44': 'Invalid or Missing Provider Name',
    '45': 'Invalid or Missing Provider Specialty',
    '46': 'Invalid or Missing Provider Phone Number',
    '47': 'Invalid or Missing Department of Transportation Number',
    '48': 'Invalid or Missing Reference Identification',
    '51': 'Additional Patient Information Required',
    '52': 'Special Program Information Required',
    '53': 'Requested Information Not Received',
    '54': 'Primary Care Provider Not On File',
    '56': 'Inappropriate Product/Service ID Qualifier',
    '57': 'Inappropriate Diagnosis Code Qualifier',
    '58': 'Invalid or Missing Diagnosis Code Qualifier',
    '60': 'Date of Birth Follows Date of Service',
    '61': 'Date of Death Precedes Date of Service',
    '62': 'Date of Service Not Within Provider Plan Enrollment',
    '63': 'Provider Not Primary',
    '64': 'Concurrent Care Not Allowed',
    '65': 'Inconsistent with Patient Gender',
    '71': 'Patient Birth Date Mismatch',
    '72': 'Invalid/Missing Subscriber/Insured ID',
    '73': 'Invalid/Missing Subscriber/Insured Name',
    '74': 'Invalid/Missing Subscriber/Insured Gender',
    '75': 'Subscriber/Insured Not Found',
    '76': 'Duplicate Subscriber/Insured ID Number',
    '77': 'Subscriber/Insured Not in Group/Plan Identified',
    '78': 'Patient Not Eligible',
    '79': 'Invalid Participant Identification',
    'T4': 'Payer Name or Identifier Missing',
    'T5': 'Certification Information Missing',
    'T6': 'Claim Does Not Match Prior Authorization'
};

/**
 * Parse X12 271 for Coordination of Benefits (COB) information
 *
 * @param {string} x12_271 - Raw X12 271 response
 * @returns {object} - COB information including other payers and errors
 */
function parseX12_271_COB(x12_271) {
    const cobInfo = {
        hasOtherInsurance: false,
        otherPayers: [],
        errors: [],
        warnings: [],
        memberInfo: {}
    };

    const segments = x12_271.split('~').filter(seg => seg.trim());

    let inLoop2120 = false;
    let currentPayer = null;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i].trim();
        const parts = segment.split('*');

        // Extract member information
        if (segment.startsWith('NM1*IL*')) {
            // NM1*IL*1*LASTNAME*FIRSTNAME****MI*MEMBER_ID
            cobInfo.memberInfo.lastName = parts[3] || null;
            cobInfo.memberInfo.firstName = parts[4] || null;
            cobInfo.memberInfo.memberId = parts[9] || null;
        }

        // Extract reference numbers (like EVC)
        if (segment.startsWith('REF*')) {
            if (!cobInfo.memberInfo.references) {
                cobInfo.memberInfo.references = [];
            }
            cobInfo.memberInfo.references.push({
                qualifier: parts[1],
                value: parts[2],
                description: parts[3] || null
            });
        }

        // Check for AAA segment (errors/rejections)
        if (segment.startsWith('AAA*')) {
            // AAA*[Valid?]*[Agency]*[Reject Code]*[Category]
            const isValid = parts[1];
            const rejectCode = parts[3];
            const category = parts[4];

            if (isValid === 'N' && rejectCode) {
                cobInfo.errors.push({
                    code: rejectCode,
                    description: AAA_REJECT_CODES[rejectCode] || 'Unknown Error',
                    category: category,
                    raw: segment
                });
            }
        }

        // Check for EB*R (Other/Additional Payer indicator)
        if (segment.startsWith('EB*R')) {
            cobInfo.hasOtherInsurance = true;
            cobInfo.warnings.push({
                message: 'Other insurance indicator found (EB*R)',
                segment: segment
            });
        }

        // Start of Loop 2120 (Other Payer Details)
        if (segment === 'LS*2120') {
            inLoop2120 = true;
            currentPayer = {};
            continue;
        }

        // End of Loop 2120
        if (segment === 'LE*2120') {
            if (currentPayer && Object.keys(currentPayer).length > 0) {
                cobInfo.otherPayers.push(currentPayer);
                cobInfo.hasOtherInsurance = true;
            }
            inLoop2120 = false;
            currentPayer = null;
            continue;
        }

        // Parse segments within Loop 2120
        if (inLoop2120) {
            if (segment.startsWith('NM1*PR*')) {
                // NM1*PR*[Entity Type]*[Name]*****[ID Qualifier]*[Payer ID]
                currentPayer.name = parts[3] || 'Unknown Payer';
                currentPayer.entityType = parts[2]; // 1=Person, 2=Non-person entity
                currentPayer.idQualifier = parts[8];
                currentPayer.payerId = parts[9] || null;
            }

            if (segment.startsWith('N3*')) {
                // N3*[Address Line 1]*[Address Line 2]
                currentPayer.address = parts[1] || null;
                if (parts[2]) {
                    currentPayer.address += ', ' + parts[2];
                }
            }

            if (segment.startsWith('N4*')) {
                // N4*[City]*[State]*[ZIP]
                currentPayer.city = parts[1] || null;
                currentPayer.state = parts[2] || null;
                currentPayer.zip = parts[3] || null;
            }

            if (segment.startsWith('PER*')) {
                // PER*[Function Code]*[Name]*[Communication Type]*[Communication Number]
                if (!currentPayer.contacts) {
                    currentPayer.contacts = [];
                }

                const contact = {
                    type: parts[3],
                    value: parts[4]
                };

                if (parts[3] === 'TE') contact.label = 'Phone';
                if (parts[3] === 'UR') contact.label = 'Website';
                if (parts[3] === 'EM') contact.label = 'Email';
                if (parts[3] === 'FX') contact.label = 'Fax';

                currentPayer.contacts.push(contact);
            }

            if (segment.startsWith('REF*')) {
                // REF*[Qualifier]*[ID]
                if (!currentPayer.references) {
                    currentPayer.references = [];
                }
                currentPayer.references.push({
                    qualifier: parts[1],
                    value: parts[2]
                });
            }
        }
    }

    return cobInfo;
}

/**
 * Format COB results as human-readable text
 *
 * @param {object} cobInfo - COB information from parseX12_271_COB
 * @returns {string} - Formatted report
 */
function formatCOBReport(cobInfo) {
    let report = [];

    report.push('='.repeat(70));
    report.push('COORDINATION OF BENEFITS (COB) ANALYSIS');
    report.push('='.repeat(70));
    report.push('');

    // Member Information
    if (cobInfo.memberInfo.firstName || cobInfo.memberInfo.lastName) {
        report.push(`Patient: ${cobInfo.memberInfo.firstName || ''} ${cobInfo.memberInfo.lastName || ''}`);
    }
    if (cobInfo.memberInfo.memberId) {
        report.push(`Member ID: ${cobInfo.memberInfo.memberId}`);
    }
    if (cobInfo.memberInfo.references && cobInfo.memberInfo.references.length > 0) {
        cobInfo.memberInfo.references.forEach(ref => {
            const desc = ref.description ? ` (${ref.description})` : '';
            report.push(`${ref.qualifier}: ${ref.value}${desc}`);
        });
    }
    report.push('');

    // Errors
    if (cobInfo.errors.length > 0) {
        report.push('⚠️  ERRORS/WARNINGS FROM PAYER:');
        report.push('-'.repeat(70));
        cobInfo.errors.forEach(error => {
            report.push(`Code ${error.code}: ${error.description}`);
            if (error.category) {
                report.push(`  Category: ${error.category}`);
            }
        });
        report.push('');
    }

    // COB Status
    if (!cobInfo.hasOtherInsurance) {
        report.push('❌ NO OTHER INSURANCE FOUND');
        report.push('   The payer does not have other insurance on record.');
        report.push('');
        report.push('NEXT STEPS:');
        report.push('1. Contact patient to obtain primary insurance information');
        report.push('2. Update payer\'s COB/TPL database with primary insurance');
        report.push('3. Re-verify eligibility after 7-10 days');
        report.push('4. Bill primary insurance first, then secondary');
    } else {
        report.push('✅ OTHER INSURANCE DETECTED');
        report.push(`   Number of other payers found: ${cobInfo.otherPayers.length}`);
        report.push('');

        cobInfo.otherPayers.forEach((payer, index) => {
            report.push('-'.repeat(70));
            report.push(`PRIMARY INSURANCE #${index + 1}:`);
            report.push('-'.repeat(70));
            report.push(`Name:      ${payer.name || 'N/A'}`);
            report.push(`Payer ID:  ${payer.payerId || 'N/A'}`);

            if (payer.address || payer.city || payer.state || payer.zip) {
                if (payer.address) {
                    report.push(`Address:   ${payer.address}`);
                }
                const cityState = [payer.city, payer.state, payer.zip].filter(Boolean).join(', ');
                if (cityState) {
                    report.push(`           ${cityState}`);
                }
            }

            if (payer.contacts && payer.contacts.length > 0) {
                payer.contacts.forEach(contact => {
                    report.push(`${contact.label || contact.type}: ${contact.value}`);
                });
            }

            if (payer.references && payer.references.length > 0) {
                payer.references.forEach(ref => {
                    report.push(`${ref.qualifier}: ${ref.value}`);
                });
            }

            report.push('');
        });

        report.push('='.repeat(70));
        report.push('BILLING RECOMMENDATION:');
        report.push('='.repeat(70));
        report.push('✅ Bill PRIMARY insurance FIRST (listed above)');
        report.push('✅ Bill secondary payer AFTER receiving primary EOB');
        report.push('✅ Include primary EOB when submitting secondary claim');
    }

    report.push('='.repeat(70));

    return report.join('\n');
}

/**
 * Extract just the primary payer name(s) from COB info
 *
 * @param {object} cobInfo - COB information from parseX12_271_COB
 * @returns {array} - Array of primary payer names
 */
function getPrimaryPayerNames(cobInfo) {
    return cobInfo.otherPayers.map(payer => payer.name);
}

/**
 * Check if patient has other insurance
 *
 * @param {string} x12_271 - Raw X12 271 response
 * @returns {boolean} - True if other insurance found
 */
function hasOtherInsurance(x12_271) {
    const cobInfo = parseX12_271_COB(x12_271);
    return cobInfo.hasOtherInsurance;
}

module.exports = {
    parseX12_271_COB,
    formatCOBReport,
    getPrimaryPayerNames,
    hasOtherInsurance,
    AAA_REJECT_CODES
};
