/**
 * Patient Data Validator
 * Compares IntakeQ patient data with payer-verified data from X12 271 responses
 * Identifies discrepancies and data quality issues
 */

/**
 * Compare IntakeQ data with payer-verified data and flag discrepancies
 * @param {Object} intakeqData - Patient data from IntakeQ database
 * @param {Object} payerData - Verified data from X12 271 response
 * @returns {Object} Validation results with issues and summary
 */
function validatePatientData(intakeqData, payerData) {
    const issues = {};

    // Date of Birth validation
    if (intakeqData.date_of_birth && payerData.dateOfBirth) {
        // Normalize date formats for comparison
        const intakeqDOB = normalizeDate(intakeqData.date_of_birth);
        const payerDOB = normalizeDate(payerData.dateOfBirth);

        if (intakeqDOB !== payerDOB) {
            issues.dob_mismatch = {
                severity: 'CRITICAL',
                intakeq_value: intakeqData.date_of_birth,
                payer_value: payerData.dateOfBirth,
                message: 'Date of birth does not match payer records',
                action: 'Verify patient identity and update records'
            };
        }
    } else if (!intakeqData.date_of_birth && payerData.dateOfBirth) {
        issues.dob_missing = {
            severity: 'WARNING',
            intakeq_value: null,
            payer_value: payerData.dateOfBirth,
            message: 'Date of birth missing in IntakeQ, available from payer',
            action: 'Update IntakeQ with payer-verified DOB'
        };
    }

    // Gender validation
    if (intakeqData.gender && payerData.gender) {
        const normalizedIntakeq = normalizeGender(intakeqData.gender);
        const normalizedPayer = normalizeGender(payerData.gender);

        if (normalizedIntakeq !== normalizedPayer) {
            issues.gender_mismatch = {
                severity: 'WARNING',
                intakeq_value: intakeqData.gender,
                payer_value: payerData.gender,
                message: 'Gender does not match payer records',
                action: 'Verify and update gender information'
            };
        }
    } else if (!intakeqData.gender && payerData.gender) {
        issues.gender_missing = {
            severity: 'INFO',
            intakeq_value: null,
            payer_value: payerData.gender,
            message: 'Gender missing in IntakeQ, available from payer',
            action: 'Update IntakeQ with payer-verified gender'
        };
    }

    // Name validation
    if (payerData.patientName && payerData.patientName.firstName && payerData.patientName.lastName) {
        const intakeqFirstName = normalizeString(intakeqData.first_name);
        const payerFirstName = normalizeString(payerData.patientName.firstName);
        const intakeqLastName = normalizeString(intakeqData.last_name);
        const payerLastName = normalizeString(payerData.patientName.lastName);

        if (intakeqFirstName !== payerFirstName || intakeqLastName !== payerLastName) {
            // Check if it's just a spelling variation or completely different
            const firstNameSimilarity = calculateSimilarity(intakeqFirstName, payerFirstName);
            const lastNameSimilarity = calculateSimilarity(intakeqLastName, payerLastName);

            const severity = (firstNameSimilarity < 0.8 || lastNameSimilarity < 0.8) ? 'CRITICAL' : 'WARNING';

            issues.name_mismatch = {
                severity: severity,
                intakeq_value: `${intakeqData.first_name} ${intakeqData.last_name}`,
                payer_value: `${payerData.patientName.firstName} ${payerData.patientName.lastName}`,
                message: 'Patient name does not match payer records',
                action: severity === 'CRITICAL' ? 'Verify patient identity immediately' : 'Check for spelling variations',
                details: {
                    firstName: {
                        intakeq: intakeqData.first_name,
                        payer: payerData.patientName.firstName,
                        similarity: firstNameSimilarity
                    },
                    lastName: {
                        intakeq: intakeqData.last_name,
                        payer: payerData.patientName.lastName,
                        similarity: lastNameSimilarity
                    }
                }
            };
        }
    }

    // Phone validation
    if (intakeqData.phone && payerData.phone) {
        const cleanIntakeq = normalizePhone(intakeqData.phone);
        const cleanPayer = normalizePhone(payerData.phone);

        if (cleanIntakeq !== cleanPayer && cleanIntakeq.slice(-10) !== cleanPayer.slice(-10)) {
            issues.phone_mismatch = {
                severity: 'INFO',
                intakeq_value: intakeqData.phone,
                payer_value: payerData.phone,
                message: 'Phone number does not match payer records',
                action: 'Consider updating to payer-verified phone number'
            };
        }
    } else if (!intakeqData.phone && payerData.phone) {
        issues.phone_missing = {
            severity: 'INFO',
            intakeq_value: null,
            payer_value: payerData.phone,
            message: 'Phone missing in IntakeQ, available from payer',
            action: 'Add phone number from payer records'
        };
    }

    // Address validation
    if (intakeqData.address_street && payerData.address && payerData.address.street) {
        const intakeqAddress = normalizeAddress(intakeqData.address_street);
        const payerAddress = normalizeAddress(payerData.address.street);

        if (intakeqAddress !== payerAddress) {
            // Check if it's a minor variation or completely different
            const similarity = calculateSimilarity(intakeqAddress, payerAddress);
            const severity = similarity < 0.7 ? 'WARNING' : 'INFO';

            issues.address_mismatch = {
                severity: severity,
                intakeq_value: formatFullAddress(intakeqData),
                payer_value: formatFullAddress(payerData.address),
                message: 'Address does not match payer records',
                action: 'Verify current address with patient',
                details: {
                    street: {
                        intakeq: intakeqData.address_street,
                        payer: payerData.address.street,
                        similarity: similarity
                    },
                    city: {
                        intakeq: intakeqData.address_city,
                        payer: payerData.address.city
                    },
                    state: {
                        intakeq: intakeqData.address_state,
                        payer: payerData.address.state
                    },
                    zip: {
                        intakeq: intakeqData.address_zip,
                        payer: payerData.address.zip
                    }
                }
            };
        }
    } else if (!intakeqData.address_street && payerData.address && payerData.address.street) {
        issues.address_missing = {
            severity: 'INFO',
            intakeq_value: null,
            payer_value: formatFullAddress(payerData.address),
            message: 'Address missing in IntakeQ, available from payer',
            action: 'Add address from payer records'
        };
    }

    // Member ID validation
    if (intakeqData.primary_insurance_policy_number && payerData.medicaidId) {
        const intakeqMemberId = normalizeString(intakeqData.primary_insurance_policy_number);
        const payerMemberId = normalizeString(payerData.medicaidId);

        if (intakeqMemberId !== payerMemberId) {
            issues.member_id_mismatch = {
                severity: 'CRITICAL',
                intakeq_value: intakeqData.primary_insurance_policy_number,
                payer_value: payerData.medicaidId,
                message: 'Member ID does not match payer records',
                action: 'Update to correct member ID from payer'
            };
        }
    } else if (!intakeqData.primary_insurance_policy_number && payerData.medicaidId) {
        issues.member_id_missing = {
            severity: 'WARNING',
            intakeq_value: null,
            payer_value: payerData.medicaidId,
            message: 'Member ID missing in IntakeQ, available from payer',
            action: 'Add member ID from payer records'
        };
    }

    // Insurance name validation
    if (intakeqData.primary_insurance_name && payerData.payerInfo && payerData.payerInfo.name) {
        const intakeqInsurance = normalizeString(intakeqData.primary_insurance_name);
        const payerInsurance = normalizeString(payerData.payerInfo.name);

        // Only flag if significantly different (not just formatting differences)
        const similarity = calculateSimilarity(intakeqInsurance, payerInsurance);
        if (similarity < 0.6) {
            issues.insurance_name_mismatch = {
                severity: 'WARNING',
                intakeq_value: intakeqData.primary_insurance_name,
                payer_value: payerData.payerInfo.name,
                message: 'Insurance name differs from payer records',
                action: 'Verify correct insurance information',
                similarity: similarity
            };
        }
    }

    // Primary Care Provider information (new data from payer)
    if (!intakeqData.primary_care_provider_npi && payerData.primaryCareProvider) {
        issues.pcp_available = {
            severity: 'INFO',
            intakeq_value: null,
            payer_value: payerData.primaryCareProvider,
            message: 'Primary care provider information available from payer',
            action: 'Consider storing PCP information for care coordination'
        };
    }

    // Managed Care Organization information (new data from payer)
    if (!intakeqData.managed_care_org && payerData.managedCareOrg) {
        issues.mco_available = {
            severity: 'INFO',
            intakeq_value: null,
            payer_value: payerData.managedCareOrg,
            message: 'Managed care organization information available',
            action: 'Store MCO information for billing purposes'
        };
    }

    // Coverage status validation
    if (payerData.coveragePeriod && payerData.coveragePeriod.isExpired) {
        issues.coverage_expired = {
            severity: 'CRITICAL',
            intakeq_value: 'Unknown',
            payer_value: `Expired ${payerData.coveragePeriod.endDate}`,
            message: 'Patient coverage has expired',
            action: 'Do not submit claims - verify current coverage',
            coveragePeriod: `${payerData.coveragePeriod.startDate} to ${payerData.coveragePeriod.endDate}`
        };
    }

    // Coordination of Benefits
    if (payerData.otherInsurance && payerData.otherInsurance.hasOtherInsurance) {
        if (!intakeqData.secondary_insurance_name) {
            issues.other_insurance_found = {
                severity: 'WARNING',
                intakeq_value: 'No secondary insurance recorded',
                payer_value: payerData.otherInsurance.otherPayers,
                message: 'Patient has other insurance coverage not recorded in IntakeQ',
                action: 'Update secondary insurance information for COB'
            };
        }
    }

    // Generate summary and recommendations
    const summary = generateValidationSummary(issues);

    return {
        hasIssues: Object.keys(issues).length > 0,
        issues: issues,
        summary: summary,
        criticalCount: Object.values(issues).filter(i => i.severity === 'CRITICAL').length,
        warningCount: Object.values(issues).filter(i => i.severity === 'WARNING').length,
        infoCount: Object.values(issues).filter(i => i.severity === 'INFO').length,
        recommendations: generateRecommendations(issues)
    };
}

/**
 * Generate a summary of validation issues
 */
function generateValidationSummary(issues) {
    if (Object.keys(issues).length === 0) {
        return 'All patient data matches payer records perfectly.';
    }

    const critical = Object.values(issues).filter(i => i.severity === 'CRITICAL');
    const warning = Object.values(issues).filter(i => i.severity === 'WARNING');
    const info = Object.values(issues).filter(i => i.severity === 'INFO');

    let summary = [];

    if (critical.length > 0) {
        summary.push(`${critical.length} critical issue${critical.length > 1 ? 's' : ''} requiring immediate attention`);
    }
    if (warning.length > 0) {
        summary.push(`${warning.length} warning${warning.length > 1 ? 's' : ''} to review`);
    }
    if (info.length > 0) {
        summary.push(`${info.length} informational item${info.length > 1 ? 's' : ''} available`);
    }

    return summary.join(', ') + '.';
}

/**
 * Generate actionable recommendations based on issues
 */
function generateRecommendations(issues) {
    const recommendations = [];

    // Critical issues first
    if (issues.coverage_expired) {
        recommendations.push({
            priority: 1,
            action: 'STOP - Do not submit claims',
            reason: 'Coverage has expired',
            details: 'Verify current insurance before proceeding'
        });
    }

    if (issues.dob_mismatch) {
        recommendations.push({
            priority: 1,
            action: 'Verify patient identity',
            reason: 'Date of birth mismatch',
            details: 'Confirm DOB with patient and update records'
        });
    }

    if (issues.member_id_mismatch) {
        recommendations.push({
            priority: 1,
            action: 'Update member ID',
            reason: 'Member ID does not match payer records',
            details: `Change from ${issues.member_id_mismatch.intakeq_value} to ${issues.member_id_mismatch.payer_value}`
        });
    }

    // Warnings
    if (issues.name_mismatch && issues.name_mismatch.severity === 'CRITICAL') {
        recommendations.push({
            priority: 2,
            action: 'Verify patient name',
            reason: 'Significant name discrepancy',
            details: 'Ensure correct patient is being treated'
        });
    }

    if (issues.other_insurance_found) {
        recommendations.push({
            priority: 2,
            action: 'Update secondary insurance',
            reason: 'Other insurance coverage detected',
            details: 'Add secondary payer for coordination of benefits'
        });
    }

    // Info items
    if (issues.phone_missing || issues.phone_mismatch) {
        recommendations.push({
            priority: 3,
            action: 'Update phone number',
            reason: 'Phone number needs updating',
            details: `Use payer-verified number: ${issues.phone_missing?.payer_value || issues.phone_mismatch?.payer_value}`
        });
    }

    if (issues.address_missing || issues.address_mismatch) {
        recommendations.push({
            priority: 3,
            action: 'Update address',
            reason: 'Address needs verification',
            details: 'Use payer-verified address for claims'
        });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
}

// === Helper Functions ===

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(date) {
    if (!date) return null;
    // Handle various date formats
    const dateStr = date.toString();
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // Convert MM/DD/YYYY to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    // Try to parse as Date object
    const dateObj = new Date(date);
    if (!isNaN(dateObj)) {
        return dateObj.toISOString().split('T')[0];
    }
    return date;
}

/**
 * Normalize gender to single character
 */
function normalizeGender(gender) {
    if (!gender) return null;
    const g = gender.toString().toUpperCase();
    if (g.startsWith('M')) return 'M';
    if (g.startsWith('F')) return 'F';
    if (g === 'U' || g.startsWith('U')) return 'U';
    return g;
}

/**
 * Normalize phone number to digits only
 */
function normalizePhone(phone) {
    if (!phone) return null;
    return phone.toString().replace(/\D/g, '');
}

/**
 * Normalize string for comparison
 */
function normalizeString(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address) {
    if (!address) return '';
    return address.toString()
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\bstreet\b/g, 'st')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\broad\b/g, 'rd')
        .replace(/\blane\b/g, 'ln')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bsuite\b/g, 'ste')
        .trim();
}

/**
 * Format full address from components
 */
function formatFullAddress(data) {
    if (!data) return null;

    // Handle both IntakeQ format and payer format
    if (data.street) {
        // Payer format
        return `${data.street}, ${data.city}, ${data.state} ${data.zip}`;
    } else if (data.address_street) {
        // IntakeQ format
        return `${data.address_street}, ${data.address_city}, ${data.address_state} ${data.address_zip}`;
    }

    return null;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);

    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

module.exports = {
    validatePatientData,
    generateValidationSummary,
    generateRecommendations,
    normalizeDate,
    normalizeGender,
    normalizePhone,
    normalizeString,
    normalizeAddress,
    formatFullAddress,
    calculateSimilarity
};