// lib/x12-277-parser.js - X12 277 Claims Status Response Parser

/**
 * X12 277 Claims Status Response Parser
 *
 * Parses X12 277 responses to extract claim status information.
 * The 277 is the response to a 276 claim status inquiry.
 *
 * Key segments:
 * - ST/SE: Transaction set header/trailer
 * - BHT: Beginning of hierarchical transaction
 * - HL: Hierarchical level (Information Source, Receiver, Service Provider, Subscriber)
 * - NM1: Entity name
 * - TRN: Trace number
 * - STC: Status information with codes and dates
 * - REF: Reference information
 * - DTP: Date/time periods
 * - AMT: Claim amounts
 */

/**
 * X12 277 Status Category Codes (STC01)
 * First position indicates the status category
 */
const STATUS_CATEGORY_CODES = {
    'A0': 'Acknowledgement/Forwarded',
    'A1': 'Acknowledgement/Receipt',
    'A2': 'Acknowledgement/Acceptance into adjudication system',
    'A3': 'Acknowledgement/Returned as unprocessable claim',
    'A4': 'Acknowledgement/Not Found',
    'A5': 'Acknowledgement/Split Claim',
    'A6': 'Acknowledgement/Rejection',
    'A7': 'Acknowledgement/Duplicate',
    'P0': 'Pending',
    'P1': 'Pending/In Process',
    'P2': 'Pending/Suspended',
    'P3': 'Pending/Re-submission Requested',
    'P4': 'Pending/Other',
    'F0': 'Finalized',
    'F1': 'Finalized/Payment',
    'F2': 'Finalized/Denial',
    'F3': 'Finalized/Reversal of Previous Payment',
    'F4': 'Finalized/Other',
    'E0': 'Error',
    'R0': 'Request for Additional Information'
};

/**
 * X12 277 Status Codes (STC01-1)
 * More detailed status within each category
 */
const CLAIM_STATUS_CODES = {
    // Acknowledgement codes (A series)
    '1': 'For more detailed information, see remittance advice',
    '2': 'More detailed information in letter',
    '3': 'Claim/encounter has been forwarded to entity',
    '4': 'Additional information requested from patient',
    '5': 'Claim/encounter received; please resubmit with changes',
    '10': 'Entire claim/encounter rejected',
    '15': 'Claim/encounter not found',
    '16': 'Claim/encounter was not processed',
    '19': 'Entity submitting claim received acknowledgment',
    '20': 'Accepted for processing',

    // Pending codes (P series)
    '25': 'Predetermination',
    '26': 'Reviewed/decision pending',
    '27': 'Pending: Review',
    '28': 'Pending: In Process',
    '29': 'Pending: Suspended',
    '30': 'Pending: Under review',

    // Finalized codes (F series)
    '31': 'Request for medical documentation',
    '32': 'Request for explanation',
    '33': 'Claim/encounter denied',
    '34': 'Partially paid',
    '35': 'Paid in full',
    '36': 'Claim/encounter adjusted',
    '37': 'Claim reversed/voided',

    // Common processing status
    '38': 'Claim paid with error',
    '39': 'Claim overpaid',
    '40': 'Claim underpaid'
};

/**
 * Entity Type Codes for NM1 segments
 */
const ENTITY_TYPE_CODES = {
    'PR': 'Payer',
    '41': 'Submitter',
    '1P': 'Provider',
    'IL': 'Insured/Subscriber',
    'QC': 'Patient'
};

/**
 * Parse X12 277 Claims Status Response
 *
 * @param {string} x12_277 - Raw X12 277 response
 * @returns {Object} Parsed claim status information
 */
function parseX12_277(x12_277) {
    const result = {
        transactionSetControlNumber: null,
        interchangeDate: null,
        interchangeTime: null,
        claims: [],
        rawResponse: x12_277
    };

    const segments = x12_277.split('~').filter(seg => seg.trim());

    let currentClaim = null;
    let currentHL = null;
    let currentEntity = null;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i].trim();
        const parts = segment.split('*');
        const segmentType = parts[0];

        switch (segmentType) {
            case 'ST':
                // ST*277*0001*005010X212
                result.transactionSetControlNumber = parts[2];
                break;

            case 'BHT':
                // BHT*0085*08*123456*20251010*1430
                result.transactionSetPurpose = parts[1];
                result.transactionSetReferenceNumber = parts[3];
                result.interchangeDate = parts[4];
                result.interchangeTime = parts[5];
                break;

            case 'HL':
                // HL*1**20*1 (Information Source - Payer)
                // HL*2*1*21*1 (Information Receiver - Provider)
                // HL*3*2*19*1 (Service Provider)
                // HL*4*3*22*0 (Subscriber/Patient)
                currentHL = {
                    id: parts[1],
                    parentId: parts[2],
                    level: parts[3],
                    hasChildren: parts[4] === '1'
                };
                break;

            case 'NM1':
                // NM1*PR*2*UTAH MEDICAID*****PI*UTMCD
                // NM1*1P*1*LASTNAME*FIRSTNAME****XX*1275348807
                // NM1*IL*1*PATIENTLAST*PATIENTFIRST****MI*MEMBERID
                const entityType = parts[1];
                const entityTypeCode = parts[2]; // 1=Person, 2=Non-Person

                currentEntity = {
                    type: entityType,
                    typeName: ENTITY_TYPE_CODES[entityType] || entityType,
                    isOrganization: entityTypeCode === '2',
                    name: null,
                    identifier: null,
                    identifierType: null
                };

                if (entityTypeCode === '2') {
                    // Organization
                    currentEntity.name = parts[3];
                } else {
                    // Person
                    currentEntity.name = {
                        lastName: parts[3],
                        firstName: parts[4],
                        middleName: parts[5]
                    };
                }

                // Identifier (NPI, Member ID, etc.)
                if (parts[9]) {
                    currentEntity.identifierType = parts[8]; // XX=NPI, MI=Member ID, etc.
                    currentEntity.identifier = parts[9];
                }

                // Store entity based on type
                if (entityType === 'PR') {
                    result.payer = currentEntity;
                } else if (entityType === '1P') {
                    result.provider = currentEntity;
                } else if (entityType === 'IL' || entityType === 'QC') {
                    if (!currentClaim) {
                        currentClaim = {
                            patient: currentEntity,
                            statuses: [],
                            traceNumbers: [],
                            references: [],
                            amounts: [],
                            dates: []
                        };
                    } else {
                        currentClaim.patient = currentEntity;
                    }
                }
                break;

            case 'TRN':
                // TRN*1*123456789*1275348807
                // TRN*2*CLAIM123*1275348807
                const traceType = parts[1]; // 1=Current transaction, 2=Referenced transaction
                const traceNumber = parts[2];
                const traceOriginatorId = parts[3];

                if (currentClaim) {
                    currentClaim.traceNumbers.push({
                        type: traceType,
                        number: traceNumber,
                        originatorId: traceOriginatorId
                    });
                } else {
                    result.primaryTraceNumber = traceNumber;
                }
                break;

            case 'STC':
                // STC*A1:20:35*20251010*2500.00
                // Status codes are hierarchical: Category:Status:Entity
                const statusInfo = parts[1].split(':');
                const statusCategory = statusInfo[0]; // A1, P1, F1, etc.
                const statusCode = statusInfo[1]; // Detailed status code
                const entityCode = statusInfo[2]; // Optional entity identifier

                const effectiveDate = parts[2];
                const claimAmount = parts[3] ? parseFloat(parts[3]) : null;

                const statusEntry = {
                    statusCategory: statusCategory,
                    statusCategoryDescription: STATUS_CATEGORY_CODES[statusCategory] || statusCategory,
                    statusCode: statusCode,
                    statusCodeDescription: CLAIM_STATUS_CODES[statusCode] || `Code ${statusCode}`,
                    entityCode: entityCode,
                    effectiveDate: effectiveDate ? formatDate(effectiveDate) : null,
                    claimAmount: claimAmount,
                    rawStatus: parts[1]
                };

                // Additional status codes (STC02-STC12 can contain more status codes)
                for (let j = 4; j <= 12; j++) {
                    if (parts[j]) {
                        const additionalStatus = parts[j].split(':');
                        if (!statusEntry.additionalStatuses) {
                            statusEntry.additionalStatuses = [];
                        }
                        statusEntry.additionalStatuses.push({
                            category: additionalStatus[0],
                            code: additionalStatus[1],
                            description: CLAIM_STATUS_CODES[additionalStatus[1]] || `Code ${additionalStatus[1]}`
                        });
                    }
                }

                if (currentClaim) {
                    currentClaim.statuses.push(statusEntry);
                } else {
                    // Status outside of claim context (shouldn't happen normally)
                    if (!result.globalStatuses) result.globalStatuses = [];
                    result.globalStatuses.push(statusEntry);
                }
                break;

            case 'REF':
                // REF*D9*CLAIMCONTROLNUMBER
                // REF*1K*POLICYID
                const refQualifier = parts[1];
                const refValue = parts[2];

                if (currentClaim) {
                    currentClaim.references.push({
                        qualifier: refQualifier,
                        value: refValue,
                        description: getReferenceDescription(refQualifier)
                    });

                    // Store claim control number specifically
                    if (refQualifier === 'D9') {
                        currentClaim.claimControlNumber = refValue;
                    }
                }
                break;

            case 'DTP':
                // DTP*472*D8*20251010 (Service date)
                const dateQualifier = parts[1];
                const dateFormat = parts[2]; // D8=CCYYMMDD, RD8=range
                const dateValue = parts[3];

                if (currentClaim) {
                    currentClaim.dates.push({
                        qualifier: dateQualifier,
                        format: dateFormat,
                        value: dateValue,
                        formattedDate: formatDate(dateValue),
                        description: getDateQualifierDescription(dateQualifier)
                    });

                    // Store service date specifically
                    if (dateQualifier === '472') {
                        currentClaim.serviceDate = formatDate(dateValue);
                    }
                }
                break;

            case 'AMT':
                // AMT*T3*2500.00 (Claim amount)
                const amountQualifier = parts[1];
                const amountValue = parseFloat(parts[2]);

                if (currentClaim) {
                    currentClaim.amounts.push({
                        qualifier: amountQualifier,
                        value: amountValue,
                        description: getAmountQualifierDescription(amountQualifier)
                    });

                    // Store claim amount specifically
                    if (amountQualifier === 'T3') {
                        currentClaim.claimAmount = amountValue;
                    }
                }
                break;

            case 'SE':
                // End of claim, save if we have one
                if (currentClaim) {
                    result.claims.push(currentClaim);
                    currentClaim = null;
                }
                break;
        }
    }

    // If we still have a current claim at the end, add it
    if (currentClaim) {
        result.claims.push(currentClaim);
    }

    // Generate summary
    result.summary = generateSummary(result);

    return result;
}

/**
 * Format date from CCYYMMDD to YYYY-MM-DD
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

/**
 * Get reference qualifier description
 */
function getReferenceDescription(qualifier) {
    const descriptions = {
        'D9': 'Claim Control Number',
        '1K': 'Policy Number',
        'EA': 'Medical Record Number',
        'SY': 'Social Security Number',
        '1L': 'Group or Policy Number'
    };
    return descriptions[qualifier] || qualifier;
}

/**
 * Get date qualifier description
 */
function getDateQualifierDescription(qualifier) {
    const descriptions = {
        '472': 'Service Date',
        '232': 'Claim Statement Period Start',
        '233': 'Claim Statement Period End',
        '050': 'Received Date',
        '009': 'Process Date'
    };
    return descriptions[qualifier] || qualifier;
}

/**
 * Get amount qualifier description
 */
function getAmountQualifierDescription(qualifier) {
    const descriptions = {
        'T3': 'Claim Amount',
        'AU': 'Coverage Amount',
        'T': 'Approved Amount',
        'B6': 'Allowed Amount',
        'DY': 'Per Day Limit',
        'F5': 'Patient Responsibility'
    };
    return descriptions[qualifier] || qualifier;
}

/**
 * Generate human-readable summary of claim status
 */
function generateSummary(parsedResult) {
    const summary = {
        totalClaims: parsedResult.claims.length,
        claimStatuses: {},
        overallStatus: null,
        message: null
    };

    // Count claims by status category
    parsedResult.claims.forEach(claim => {
        claim.statuses.forEach(status => {
            const category = status.statusCategory;
            if (!summary.claimStatuses[category]) {
                summary.claimStatuses[category] = 0;
            }
            summary.claimStatuses[category]++;
        });
    });

    // Determine overall status
    if (summary.claimStatuses['F1']) {
        summary.overallStatus = 'PAID';
        summary.message = `${summary.claimStatuses['F1']} claim(s) paid`;
    } else if (summary.claimStatuses['F2']) {
        summary.overallStatus = 'DENIED';
        summary.message = `${summary.claimStatuses['F2']} claim(s) denied`;
    } else if (summary.claimStatuses['P1'] || summary.claimStatuses['P0']) {
        summary.overallStatus = 'PENDING';
        summary.message = 'Claim(s) pending processing';
    } else if (summary.claimStatuses['A2']) {
        summary.overallStatus = 'ACKNOWLEDGED';
        summary.message = 'Claim(s) acknowledged and accepted';
    } else if (summary.claimStatuses['A6']) {
        summary.overallStatus = 'REJECTED';
        summary.message = 'Claim(s) rejected';
    } else if (summary.claimStatuses['A1']) {
        summary.overallStatus = 'RECEIVED';
        summary.message = 'Claim(s) received';
    } else {
        summary.overallStatus = 'UNKNOWN';
        summary.message = 'Status information available';
    }

    return summary;
}

/**
 * Extract simple claim status for display
 * Returns a simplified version focused on key information
 */
function extractSimpleStatus(parsedResult) {
    return parsedResult.claims.map(claim => {
        const primaryStatus = claim.statuses[0]; // First status is usually primary

        return {
            patientName: claim.patient?.name,
            claimControlNumber: claim.claimControlNumber,
            serviceDate: claim.serviceDate,
            claimAmount: claim.claimAmount,
            status: primaryStatus?.statusCategoryDescription,
            statusDetail: primaryStatus?.statusCodeDescription,
            effectiveDate: primaryStatus?.effectiveDate,
            traceNumber: claim.traceNumbers[0]?.number
        };
    });
}

module.exports = {
    parseX12_277,
    extractSimpleStatus,
    STATUS_CATEGORY_CODES,
    CLAIM_STATUS_CODES,
    ENTITY_TYPE_CODES
};
