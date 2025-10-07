// lib/edi-835-parser.js - EDI 835 ERA (Electronic Remittance Advice) Parser

/**
 * Parse EDI 835 ERA (Electronic Remittance Advice)
 * Format: HIPAA 5010 X12 835 (Health Care Claim Payment/Advice)
 *
 * @param {String} edi835 - X12 835 formatted string
 * @returns {Object} Parsed remittance information
 */
function parse835(edi835) {
    // Split into segments
    const segments = edi835.split('~').filter(s => s.trim());

    const result = {
        transactionSetId: null,
        payer: null,
        payee: null,
        checkOrEFT: null,
        claims: []
    };

    let currentClaim = null;
    let currentServiceLine = null;

    for (const segment of segments) {
        const elements = segment.split('*');
        const segmentId = elements[0];

        switch (segmentId) {
            case 'ST':
                // Transaction Set Header
                result.transactionSetId = elements[2];
                break;

            case 'BPR':
                // Financial Information
                result.checkOrEFT = {
                    transactionHandlingCode: elements[1], // C=Check, I=ACH, etc.
                    paymentAmount: parseFloat(elements[2]),
                    creditDebitFlag: elements[3], // C=Credit, D=Debit
                    paymentMethod: elements[4],
                    paymentFormatCode: elements[5],
                    checkNumber: elements[7],
                    effectiveDate: elements[16]
                };
                break;

            case 'TRN':
                // Reassociation Trace Number
                result.traceNumber = {
                    type: elements[1],
                    number: elements[2],
                    originatorId: elements[3]
                };
                break;

            case 'DTM':
                // Production Date
                if (elements[1] === '405') {
                    result.productionDate = elements[2];
                }
                break;

            case 'N1':
                // Name - Payer or Payee
                const entityCode = elements[1];
                const name = {
                    entityCode: entityCode,
                    name: elements[2],
                    idQualifier: elements[3],
                    id: elements[4]
                };

                if (entityCode === 'PR') {
                    // Payer
                    result.payer = name;
                } else if (entityCode === 'PE') {
                    // Payee
                    result.payee = name;
                }
                break;

            case 'LX':
                // Header Number (starts new service line within claim)
                if (currentClaim) {
                    currentServiceLine = {
                        lineNumber: elements[1],
                        adjustments: []
                    };
                    currentClaim.serviceLines.push(currentServiceLine);
                }
                break;

            case 'CLP':
                // Claim Payment Information
                currentClaim = {
                    claimId: elements[1],
                    statusCode: elements[2],
                    chargeAmount: parseFloat(elements[3]),
                    paymentAmount: parseFloat(elements[4]),
                    patientResponsibility: parseFloat(elements[5]),
                    claimFilingIndicator: elements[6],
                    payerClaimControlNumber: elements[7],
                    facilityTypeCode: elements[8],
                    serviceLines: [],
                    adjustments: [],
                    dates: []
                };
                result.claims.push(currentClaim);
                break;

            case 'NM1':
                // Individual or Organizational Name
                if (currentClaim && !currentServiceLine) {
                    const entityType = elements[1];
                    if (entityType === 'QC') {
                        // Patient
                        currentClaim.patient = {
                            lastName: elements[3],
                            firstName: elements[4],
                            middleName: elements[5],
                            idQualifier: elements[8],
                            id: elements[9]
                        };
                    } else if (entityType === '82') {
                        // Rendering Provider
                        currentClaim.renderingProvider = {
                            lastName: elements[3],
                            firstName: elements[4],
                            npi: elements[9]
                        };
                    }
                }
                break;

            case 'SVC':
                // Service Payment Information
                if (currentServiceLine) {
                    currentServiceLine.procedureCode = elements[1];
                    currentServiceLine.chargeAmount = parseFloat(elements[2]);
                    currentServiceLine.paymentAmount = parseFloat(elements[3]);
                    currentServiceLine.units = elements[5];
                }
                break;

            case 'CAS':
                // Claims Adjustment
                const adjustmentGroup = {
                    groupCode: elements[1], // CO=Contractual, PR=Patient Responsibility, etc.
                    adjustments: []
                };

                // Process adjustment reason codes (can be multiple per CAS segment)
                for (let i = 2; i < elements.length; i += 3) {
                    if (elements[i]) {
                        adjustmentGroup.adjustments.push({
                            reasonCode: elements[i],
                            amount: parseFloat(elements[i + 1]),
                            quantity: elements[i + 2] ? parseFloat(elements[i + 2]) : null,
                            description: getAdjustmentDescription(elements[1], elements[i])
                        });
                    }
                }

                if (currentServiceLine) {
                    currentServiceLine.adjustments.push(adjustmentGroup);
                } else if (currentClaim) {
                    currentClaim.adjustments.push(adjustmentGroup);
                }
                break;

            case 'AMT':
                // Monetary Amount
                if (currentClaim) {
                    const qualifier = elements[1];
                    const amount = parseFloat(elements[2]);

                    if (qualifier === 'AU') {
                        currentClaim.coverageAmount = amount;
                    } else if (qualifier === 'B6') {
                        currentClaim.allowedAmount = amount;
                    }
                }
                break;
        }
    }

    return result;
}

/**
 * Get human-readable description for adjustment reason codes
 */
function getAdjustmentDescription(groupCode, reasonCode) {
    const descriptions = {
        // Common CARC (Claim Adjustment Reason Codes)
        '1': 'Deductible Amount',
        '2': 'Coinsurance Amount',
        '3': 'Co-payment Amount',
        '4': 'The procedure code is inconsistent with the modifier used',
        '5': 'The procedure code/modifier is inconsistent with the patient age',
        '11': 'The diagnosis is inconsistent with the procedure',
        '16': 'Claim/service lacks information or has submission/billing error',
        '18': 'Exact duplicate claim/service',
        '22': 'Payment adjusted because this care may be covered by another payer',
        '23': 'Impact of prior payer(s) adjudication',
        '24': 'Charges are covered under a capitation agreement',
        '29': 'The time limit for filing has expired',
        '45': 'Charge exceeds fee schedule/maximum allowable',
        '50': 'These are non-covered services',
        '96': 'Non-covered charge(s)',
        '97': 'The benefit for this service is included in the payment/allowance for another service',
        '109': 'Claim/service not covered by this payer/contractor',
        '119': 'Benefit maximum for this time period or occurrence has been reached',
        '151': 'Payment adjusted because the payer deems the information submitted does not support this level of service',
        '197': 'Precertification/authorization/notification absent'
    };

    return descriptions[reasonCode] || `Adjustment reason code: ${reasonCode}`;
}

/**
 * Format parsed 835 data for human-readable output
 */
function format835Summary(parsed) {
    let summary = '';

    summary += '═══════════════════════════════════════════════════\n';
    summary += '     EDI 835 ELECTRONIC REMITTANCE ADVICE\n';
    summary += '═══════════════════════════════════════════════════\n\n';

    if (parsed.checkOrEFT) {
        summary += `Payment Method: ${parsed.checkOrEFT.paymentMethod}\n`;
        summary += `Payment Amount: $${parsed.checkOrEFT.paymentAmount.toFixed(2)}\n`;
        summary += `Check/Reference Number: ${parsed.checkOrEFT.checkNumber || 'N/A'}\n`;
        summary += `Effective Date: ${parsed.checkOrEFT.effectiveDate}\n\n`;
    }

    if (parsed.payer) {
        summary += `Payer: ${parsed.payer.name}\n`;
        summary += `Payer ID: ${parsed.payer.id}\n\n`;
    }

    if (parsed.payee) {
        summary += `Payee: ${parsed.payee.name}\n`;
        summary += `Payee ID: ${parsed.payee.id}\n\n`;
    }

    summary += '───────────────────────────────────────────────────\n';
    summary += `Claims Included: ${parsed.claims.length}\n`;
    summary += '───────────────────────────────────────────────────\n\n';

    parsed.claims.forEach((claim, idx) => {
        summary += `CLAIM #${idx + 1}\n`;
        summary += `Claim ID: ${claim.claimId}\n`;
        summary += `Status: ${getClaimStatusDescription(claim.statusCode)}\n`;

        if (claim.patient) {
            summary += `Patient: ${claim.patient.lastName}, ${claim.patient.firstName}\n`;
        }

        summary += `\nFinancials:\n`;
        summary += `  Charged: $${claim.chargeAmount.toFixed(2)}\n`;
        summary += `  Paid: $${claim.paymentAmount.toFixed(2)}\n`;
        summary += `  Patient Responsibility: $${claim.patientResponsibility.toFixed(2)}\n`;

        if (claim.adjustments.length > 0) {
            summary += `\nAdjustments:\n`;
            claim.adjustments.forEach(adj => {
                summary += `  Group: ${adj.groupCode}\n`;
                adj.adjustments.forEach(a => {
                    summary += `    • ${a.description}: $${a.amount.toFixed(2)}\n`;
                });
            });
        }

        if (claim.serviceLines.length > 0) {
            summary += `\nService Lines (${claim.serviceLines.length}):\n`;
            claim.serviceLines.forEach((line, lineIdx) => {
                summary += `  Line ${lineIdx + 1}: ${line.procedureCode}\n`;
                summary += `    Charged: $${line.chargeAmount.toFixed(2)} | Paid: $${line.paymentAmount.toFixed(2)}\n`;
            });
        }

        summary += '\n';
    });

    return summary;
}

/**
 * Get claim status description
 */
function getClaimStatusDescription(code) {
    const statuses = {
        '1': 'Processed as Primary',
        '2': 'Processed as Secondary',
        '3': 'Processed as Tertiary',
        '4': 'Denied',
        '19': 'Processed as Primary, Forwarded to Additional Payer(s)',
        '20': 'Processed as Secondary, Forwarded to Additional Payer(s)',
        '21': 'Processed as Tertiary, Forwarded to Additional Payer(s)',
        '22': 'Reversal of Previous Payment',
        '23': 'Not Our Claim, Forwarded to Additional Payer(s)'
    };

    return statuses[code] || `Status code: ${code}`;
}

module.exports = {
    parse835,
    format835Summary,
    getAdjustmentDescription,
    getClaimStatusDescription
};
