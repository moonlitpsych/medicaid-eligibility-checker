// lib/edi-277-parser.js - EDI 277 Claim Status Response Parser

/**
 * Parse EDI 277 claim status response
 * Format: HIPAA 5010 X12 277 (Claim Status Notification)
 *
 * @param {String} edi277 - X12 277 formatted string
 * @returns {Object} Parsed claim status information
 */
function parse277(edi277) {
    // Split into segments
    const segments = edi277.split('~').filter(s => s.trim());

    const result = {
        transactionSetId: null,
        payer: null,
        submitter: null,
        provider: null,
        claims: []
    };

    let currentClaim = null;
    let currentLevel = null;

    for (const segment of segments) {
        const elements = segment.split('*');
        const segmentId = elements[0];

        switch (segmentId) {
            case 'ST':
                // Transaction Set Header
                result.transactionSetId = elements[2];
                break;

            case 'BHT':
                // Beginning of Hierarchical Transaction
                result.transactionDate = elements[4];
                result.transactionTime = elements[5];
                break;

            case 'HL':
                // Hierarchical Level
                currentLevel = elements[3]; // 20=payer, 21=provider, 19=billing provider, PT=patient
                break;

            case 'NM1':
                // Name
                const entityType = elements[1];
                const name = {
                    type: entityType,
                    organizationName: elements[3],
                    firstName: elements[4],
                    lastName: elements[5],
                    idQualifier: elements[8],
                    id: elements[9]
                };

                if (entityType === 'PR') {
                    // Payer
                    result.payer = name;
                } else if (entityType === '41') {
                    // Submitter
                    result.submitter = name;
                } else if (entityType === '85') {
                    // Billing provider
                    result.provider = name;
                } else if (entityType === 'QC') {
                    // Patient
                    if (currentClaim) {
                        currentClaim.patient = name;
                    }
                }
                break;

            case 'TRN':
                // Trace Number
                const traceType = elements[1];
                const traceNumber = elements[2];

                if (traceType === '1') {
                    // Payer claim control number - start new claim
                    currentClaim = {
                        traceNumber: traceNumber,
                        statusCodes: [],
                        dates: [],
                        amounts: [],
                        references: []
                    };
                    result.claims.push(currentClaim);
                } else if (traceType === '2' && currentClaim) {
                    currentClaim.originatingTraceNumber = traceNumber;
                }
                break;

            case 'STC':
                // Status Category Code
                if (currentClaim) {
                    const statusCode = elements[1]; // e.g., "A1:19:AY"
                    const statusDate = elements[2];
                    const actionCode = elements[3]; // e.g., "WQ"
                    const totalAmount = elements[4];

                    currentClaim.statusCodes.push({
                        code: statusCode,
                        date: statusDate,
                        actionCode: actionCode,
                        amount: totalAmount,
                        description: getStatusCodeDescription(statusCode)
                    });
                }
                break;

            case 'DTP':
                // Date or Time Period
                if (currentClaim) {
                    currentClaim.dates.push({
                        qualifier: elements[1],
                        format: elements[2],
                        date: elements[3]
                    });
                }
                break;

            case 'QTY':
                // Quantity
                if (currentClaim) {
                    currentClaim.quantity = {
                        qualifier: elements[1],
                        value: elements[2]
                    };
                }
                break;

            case 'AMT':
                // Monetary Amount
                if (currentClaim) {
                    currentClaim.amounts.push({
                        qualifier: elements[1],
                        amount: parseFloat(elements[2])
                    });
                }
                break;

            case 'REF':
                // Reference Identifier
                if (currentClaim) {
                    currentClaim.references.push({
                        qualifier: elements[1],
                        reference: elements[2]
                    });
                }
                break;
        }
    }

    return result;
}

/**
 * Get human-readable description of status codes
 * Based on X12 277 implementation guide
 */
function getStatusCodeDescription(statusCode) {
    const codes = statusCode.split(':');
    const primaryCode = codes[0];
    const secondaryCode = codes[1];

    const descriptions = {
        // Primary Status Codes
        'A0': 'Acknowledgement/Forwarded',
        'A1': 'Acknowledgement/Receipt',
        'A2': 'Acknowledgement/Acceptance into adjudication system',
        'A3': 'Acknowledgement/Returned as unprocessable claim',
        'A4': 'Acknowledgement/Not found',
        'A5': 'Acknowledgement/Split claim',
        'A6': 'Acknowledgement/Re-sent claim',
        'A7': 'Acknowledgement/Deferred',

        // Secondary Status Codes (Claim Level)
        '19': 'Claim is under review',
        '20': 'Claim has been adjudicated and is awaiting payment',
        '21': 'Claim has been denied',
        '22': 'Claim has been adjusted',
        '23': 'Claim has been paid',

        // Entity Codes
        'AY': 'Claim/Line',
        'WQ': 'Claim Submitter'
    };

    let description = descriptions[primaryCode] || `Unknown code: ${primaryCode}`;
    if (secondaryCode && descriptions[secondaryCode]) {
        description += ` - ${descriptions[secondaryCode]}`;
    }

    return description;
}

/**
 * Format parsed 277 data for human-readable output
 */
function format277Summary(parsed) {
    let summary = '';

    summary += '═══════════════════════════════════════════════════\n';
    summary += '        EDI 277 CLAIM STATUS REPORT\n';
    summary += '═══════════════════════════════════════════════════\n\n';

    summary += `Transaction Date: ${parsed.transactionDate}\n`;
    summary += `Transaction Time: ${parsed.transactionTime}\n\n`;

    if (parsed.payer) {
        summary += `Payer: ${parsed.payer.organizationName}\n`;
        summary += `Payer ID: ${parsed.payer.id}\n\n`;
    }

    if (parsed.submitter) {
        summary += `Submitter: ${parsed.submitter.organizationName}\n`;
        summary += `Submitter ID: ${parsed.submitter.id}\n\n`;
    }

    if (parsed.provider) {
        summary += `Provider: ${parsed.provider.organizationName}\n`;
        summary += `Provider NPI: ${parsed.provider.id}\n\n`;
    }

    summary += '───────────────────────────────────────────────────\n';
    summary += `Claims Included: ${parsed.claims.length}\n`;
    summary += '───────────────────────────────────────────────────\n\n';

    parsed.claims.forEach((claim, idx) => {
        summary += `CLAIM #${idx + 1}\n`;
        summary += `Trace Number: ${claim.traceNumber}\n`;

        if (claim.patient) {
            summary += `Patient: ${claim.patient.lastName}, ${claim.patient.firstName}\n`;
            summary += `Patient ID: ${claim.patient.id}\n`;
        }

        if (claim.statusCodes.length > 0) {
            summary += '\nStatus:\n';
            claim.statusCodes.forEach(status => {
                summary += `  • ${status.code}: ${status.description}\n`;
                if (status.amount) {
                    summary += `    Amount: $${status.amount}\n`;
                }
            });
        }

        if (claim.amounts.length > 0) {
            summary += '\nAmounts:\n';
            claim.amounts.forEach(amt => {
                summary += `  • ${amt.qualifier}: $${amt.amount.toFixed(2)}\n`;
            });
        }

        summary += '\n';
    });

    return summary;
}

module.exports = {
    parse277,
    format277Summary,
    getStatusCodeDescription
};
