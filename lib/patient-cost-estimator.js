/**
 * Patient Financial Responsibility Estimator
 *
 * Calculates estimated patient out-of-pocket costs for services
 * based on eligibility data (deductibles, copays, coinsurance, etc.)
 *
 * Last Updated: 2025-10-07
 */

const feeSchedule = require('./moonlit-fee-schedule');

/**
 * Calculate patient financial responsibility for a service
 *
 * @param {Object} eligibilityData - Parsed eligibility response data
 * @param {Object} eligibilityData.copayInfo - Financial information from X12 271
 * @param {number} eligibilityData.copayInfo.deductibleRemaining - Amount left on deductible
 * @param {number} eligibilityData.copayInfo.deductibleMet - Amount already met
 * @param {number} eligibilityData.copayInfo.deductibleTotal - Total deductible amount
 * @param {number} eligibilityData.copayInfo.primaryCareCopay - Copay amount (if available)
 * @param {number} eligibilityData.copayInfo.mentalHealthCopay - Mental health copay (if available)
 * @param {number} eligibilityData.copayInfo.primaryCareCoinsurance - Coinsurance % (if available)
 * @param {boolean} eligibilityData.copayInfo.isInNetwork - Whether provider is in-network
 * @param {string} cptCode - The CPT code for the service
 * @returns {Object} - Detailed cost breakdown
 */
function calculatePatientResponsibility(eligibilityData, cptCode) {
    // Get Moonlit's fee for this service
    const moonlitFee = feeSchedule.getFee(cptCode);
    if (!moonlitFee) {
        throw new Error(`Unknown CPT code: ${cptCode}`);
    }

    // Extract financial information from eligibility data
    const copayInfo = eligibilityData.copayInfo || {};
    const deductibleRemaining = parseFloat(copayInfo.deductibleRemaining) || 0;
    const deductibleTotal = parseFloat(copayInfo.deductibleTotal) || 0;
    const deductibleMet = parseFloat(copayInfo.deductibleMet) || 0;
    const isInNetwork = copayInfo.isInNetwork !== false; // Default to true if not specified

    // Try to get mental health copay first, fallback to primary care copay
    let copay = parseFloat(copayInfo.mentalHealthOutpatient) || parseFloat(copayInfo.mentalHealthCopay) || parseFloat(copayInfo.primaryCareCopay) || null;
    let coinsurance = parseFloat(copayInfo.primaryCareCoinsurance) || null;

    // SMART RULE: Detect HMHI-BHN (Huntsman Mental Health Institute - Behavioral Health Network)
    // HMHI-BHN is UUHP's carved-out behavioral health network
    // CRITICAL INSIGHT: Mental health visits are CARVED OUT - no deductible required!
    // Copay only: $20-$25 (verified from ERA files 10/7/2025)
    const isHMHIBHN = detectHMHIBHN(eligibilityData);
    if (isHMHIBHN) {
        // Override copay if not already set (use $25 as conservative estimate)
        if (!copay) {
            copay = 25; // Conservative estimate (actual is $20-$25)
            console.log('✅ HMHI-BHN detected: Applying $25 copay estimate for behavioral health visits');
        }
        // CRITICAL: Override deductible data - mental health is carved out!
        // Patients never hit deductible for our psychiatric services
        copayInfo.deductibleRemaining = 0;
        copayInfo.deductibleTotal = 0;
        copayInfo.deductibleMet = 0;
        console.log('✅ HMHI-BHN mental health carve-out: Deductible bypassed');
    }

    // Check if this is likely Medicaid (no deductible, no copay, no coinsurance)
    const isMedicaid = deductibleRemaining === 0 && deductibleTotal === 0 && !copay && !coinsurance;

    // Initialize calculation variables
    let patientOwes = 0;
    let insuranceCovers = 0;
    let breakdown = [];
    let deductibleWillBeMet = false;
    let explanation = [];

    // SCENARIO 0: Medicaid FFS (full coverage, no patient responsibility)
    if (isMedicaid && isInNetwork) {
        insuranceCovers = moonlitFee;
        explanation.push('Medicaid covers this service in full with no copay or deductible.');
        explanation.push('You should not owe anything for this visit!');

        return {
            patientOwes: '0.00',
            insuranceCovers: insuranceCovers.toFixed(2),
            moonlitFee: moonlitFee.toFixed(2),
            breakdown: [{
                description: 'Covered by Medicaid (no patient responsibility)',
                amount: 0
            }],
            deductibleWillBeMet: false,
            futureVisitCost: '0.00',
            confidence: 'high',
            explanation: explanation.join(' '),
            serviceDescription: feeSchedule.getDescription(cptCode),
            deductibleInfo: {
                remaining: '0.00',
                met: '0.00',
                total: '0.00'
            }
        };
    }

    // If out of network, patient typically pays more
    if (!isInNetwork) {
        patientOwes = moonlitFee;
        insuranceCovers = 0;
        breakdown.push({
            description: 'Out-of-network service (full charge)',
            amount: moonlitFee
        });
        explanation.push('Moonlit may not be in-network with your plan.');
        explanation.push('You may need to file for out-of-network reimbursement.');

        return {
            patientOwes: patientOwes.toFixed(2),
            insuranceCovers: insuranceCovers.toFixed(2),
            moonlitFee: moonlitFee.toFixed(2),
            breakdown,
            deductibleWillBeMet: false,
            futureVisitCost: null,
            confidence: 'low',
            explanation: explanation.join(' ')
        };
    }

    // SCENARIO 1: Deductible has NOT been met yet
    if (deductibleRemaining > 0) {
        // Patient pays toward deductible first
        const deductiblePayment = Math.min(moonlitFee, deductibleRemaining);
        patientOwes += deductiblePayment;
        breakdown.push({
            description: 'Toward your deductible',
            amount: deductiblePayment
        });

        // Check if deductible will be met with this visit
        if (deductiblePayment >= deductibleRemaining) {
            deductibleWillBeMet = true;
            explanation.push(`Great news! This payment will complete your deductible.`);
        }

        // Calculate remaining amount after deductible payment
        const remainingAfterDeductible = moonlitFee - deductiblePayment;

        if (remainingAfterDeductible > 0) {
            // After deductible portion is applied, apply copay or coinsurance
            if (copay) {
                patientOwes += copay;
                insuranceCovers = remainingAfterDeductible - copay;
                breakdown.push({
                    description: 'Copay (after deductible portion)',
                    amount: copay
                });
                explanation.push(`After this visit, you'll only pay $${copay.toFixed(2)} copays for future visits!`);
            } else if (coinsurance) {
                const coinsuranceAmount = remainingAfterDeductible * (coinsurance / 100);
                patientOwes += coinsuranceAmount;
                insuranceCovers = remainingAfterDeductible - coinsuranceAmount;
                breakdown.push({
                    description: `Coinsurance (${coinsurance}%)`,
                    amount: coinsuranceAmount
                });
                explanation.push(`You pay ${coinsurance}% coinsurance on the remaining amount.`);
            } else {
                // No copay or coinsurance data - assume insurance covers the rest
                insuranceCovers = remainingAfterDeductible;
                explanation.push('Your insurance should cover the remaining cost after deductible.');
            }
        }
    }
    // SCENARIO 2: Deductible is already met
    else {
        if (copay) {
            patientOwes = copay;
            insuranceCovers = moonlitFee - copay;
            breakdown.push({
                description: isHMHIBHN ? 'Copay (mental health visits are covered separately)' : 'Copay',
                amount: copay
            });

            // Special messaging for HMHI-BHN carve-out
            if (isHMHIBHN) {
                explanation.push(`Great news! Mental health visits with HMHI-BHN only require a copay (typically $20-$25).`);
                explanation.push(`No deductible required - behavioral health is covered separately!`);
            } else {
                explanation.push(`Your deductible is met, so you only pay your copay of $${copay.toFixed(2)}.`);
            }
        } else if (coinsurance) {
            const coinsuranceAmount = moonlitFee * (coinsurance / 100);
            patientOwes = coinsuranceAmount;
            insuranceCovers = moonlitFee - coinsuranceAmount;
            breakdown.push({
                description: `Coinsurance (${coinsurance}%)`,
                amount: coinsuranceAmount
            });
            explanation.push(`Your deductible is met. You pay ${coinsurance}% coinsurance.`);
        } else {
            // No copay or coinsurance info - conservative estimate
            patientOwes = 0;
            insuranceCovers = moonlitFee;
            breakdown.push({
                description: 'Estimated insurance coverage',
                amount: 0,
                note: 'Your exact copay will be determined at checkout'
            });
            explanation.push('Your deductible is met. Insurance should cover most or all of this visit.');
            explanation.push('Your exact copay will be confirmed at checkout.');
        }
    }

    // Determine confidence level
    let confidence = 'high';
    if (!copay && !coinsurance && deductibleRemaining === 0) {
        confidence = 'medium'; // Missing copay/coinsurance data
    } else if (!copay && !coinsurance) {
        confidence = 'low'; // Missing cost-sharing data entirely
    }

    // If HMHI-BHN was detected and copay applied, we have high confidence
    if (isHMHIBHN && copay === 25) {
        confidence = 'high';
    }

    // Future visit cost (for messaging)
    let futureVisitCost = null;
    if (deductibleWillBeMet && copay) {
        futureVisitCost = copay.toFixed(2);
    } else if (deductibleRemaining === 0 && copay) {
        futureVisitCost = copay.toFixed(2);
    }

    return {
        patientOwes: patientOwes.toFixed(2),
        insuranceCovers: insuranceCovers.toFixed(2),
        moonlitFee: moonlitFee.toFixed(2),
        breakdown,
        deductibleWillBeMet,
        futureVisitCost,
        confidence, // 'high', 'medium', 'low'
        explanation: explanation.join(' '),
        serviceDescription: feeSchedule.getDescription(cptCode),
        deductibleInfo: {
            remaining: deductibleRemaining.toFixed(2),
            met: deductibleMet.toFixed(2),
            total: deductibleTotal.toFixed(2)
        }
    };
}

/**
 * Calculate estimates for multiple common service types at once
 *
 * @param {Object} eligibilityData - Parsed eligibility response data
 * @returns {Object} - Estimates for common services
 */
function calculateCommonServices(eligibilityData) {
    // Patient-facing service types (not raw CPT codes)
    const commonServices = ['INTAKE_VISIT', 'FOLLOWUP_BRIEF', 'FOLLOWUP_EXTENDED'];
    const estimates = {};

    for (const serviceCode of commonServices) {
        try {
            estimates[serviceCode] = calculatePatientResponsibility(eligibilityData, serviceCode);
        } catch (error) {
            console.error(`Error calculating estimate for ${serviceCode}:`, error.message);
        }
    }

    return estimates;
}

/**
 * Format a cost estimate for display
 *
 * @param {Object} estimate - The estimate object from calculatePatientResponsibility
 * @returns {string} - Human-readable formatted estimate
 */
function formatEstimate(estimate) {
    const parts = [];

    // Main cost message
    if (estimate.confidence === 'high') {
        parts.push(`You will owe $${estimate.patientOwes} for this visit.`);
    } else if (estimate.confidence === 'medium') {
        parts.push(`You will likely owe $${estimate.patientOwes} for this visit.`);
    } else {
        parts.push(`Estimated cost: $0 - $${estimate.patientOwes} for this visit.`);
    }

    // Add explanation
    if (estimate.explanation) {
        parts.push(estimate.explanation);
    }

    // Add breakdown
    if (estimate.breakdown && estimate.breakdown.length > 0) {
        parts.push('\nBreakdown:');
        estimate.breakdown.forEach(item => {
            parts.push(`• ${item.description}: $${item.amount.toFixed(2)}`);
            if (item.note) {
                parts.push(`  (${item.note})`);
            }
        });
    }

    return parts.join('\n');
}

/**
 * Detect if patient is covered by HMHI-BHN (Huntsman Mental Health Institute - Behavioral Health Network)
 * HMHI-BHN is UUHP's carved-out behavioral health network with $25 copay standard
 *
 * @param {Object} eligibilityData - Parsed eligibility response data
 * @returns {boolean} - True if HMHI-BHN coverage detected
 */
function detectHMHIBHN(eligibilityData) {
    // Check payer name
    if (eligibilityData.payer && eligibilityData.payer.includes('HMHI')) {
        return true;
    }

    // Check program name
    if (eligibilityData.program && eligibilityData.program.includes('HMHI')) {
        return true;
    }

    // Check raw X12 response if available
    if (eligibilityData.x12Details && eligibilityData.x12Details.rawResponse) {
        const raw = eligibilityData.x12Details.rawResponse;
        if (raw.includes('HMHI-BHN') || raw.includes('HMHI BHN')) {
            return true;
        }
    }

    // Check raw benefits array
    if (eligibilityData.copayInfo && eligibilityData.copayInfo.rawBenefits) {
        const rawBenefits = JSON.stringify(eligibilityData.copayInfo.rawBenefits);
        if (rawBenefits.includes('HMHI')) {
            return true;
        }
    }

    return false;
}

module.exports = {
    calculatePatientResponsibility,
    calculateCommonServices,
    formatEstimate
};
