#!/usr/bin/env node
// ACO Transition Analysis - Probabilistic Rules for CM Program Eligibility
// Based on X12 271 response analysis comparing Jeremy Montoya vs Selena Partida

/**
 * DISCOVERY: Plan Type Indicators in X12 271 Responses
 * 
 * STABLE TRADITIONAL FFS (Good for CM Program):
 * - Plan: "TARGETED ADULT MEDICAID" 
 * - Status: Likely permanent or long-term Traditional FFS
 * - Example: Jeremy Montoya
 * 
 * TEMPORARY FFS (Risk for CM Program):
 * - Plan: "TRADITIONAL ADULT"
 * - Status: 2-3 week transitional period before ACO assignment
 * - May already show assigned ACO in same response
 * - Example: Selena Partida (shows SelectHealth assignment)
 */

// Moonlit's contracted ACO status (as of user input)
const MOONLIT_ACO_STATUS = {
    'MOLINA': { status: 'contracted', effective: true, description: 'Molina Health Choice Utah' },
    'HEALTH_CHOICE': { status: 'contracted', effective: true, description: 'Health Choice Utah' },
    'SELECTHEALTH': { status: 'pending', effective: false, description: 'SelectHealth Community Care' },
    'UUHP': { status: 'pending', effective: false, description: 'University of Utah Health Plans' },
    'OPTUM': { status: 'pending', effective: false, description: 'Optum Health Plan' }
};

function analyzeACOTransitionRisk(x12_271_response) {
    const lines = x12_271_response.split(/[~\n]/);
    
    let planType = null;
    let hasTargetedAdult = false;
    let hasTraditionalAdult = false;
    let assignedACOs = [];
    let hasManagedCare = false;
    
    // Extract all plan types and ACO assignments
    for (const line of lines) {
        // Look for plan type indicators
        if (line.includes('*MC*TARGETED ADULT MEDICAID')) {
            hasTargetedAdult = true;
            planType = 'TARGETED_ADULT_MEDICAID';
        }
        
        if (line.includes('*MC*TRADITIONAL ADULT')) {
            hasTraditionalAdult = true;
            if (!planType) planType = 'TRADITIONAL_ADULT';
        }
        
        // Look for managed care (HM) assignments indicating ACO enrollment
        if (line.includes('*HM*') && !line.includes('TRANSPORTATION')) {
            hasManagedCare = true;
        }
        
        // Extract specific ACO assignments
        if (line.includes('NM1*PR*2*SELECTHEALTH')) {
            assignedACOs.push('SELECTHEALTH');
        }
        if (line.includes('NM1*PR*2*MOLINA')) {
            assignedACOs.push('MOLINA');  
        }
        if (line.includes('HEALTH CHOICE') || line.includes('HEALTHCHOICE')) {
            assignedACOs.push('HEALTH_CHOICE');
        }
        if (line.includes('UUHP') || line.includes('UNIVERSITY OF UTAH')) {
            assignedACOs.push('UUHP');
        }
        if (line.includes('OPTUM')) {
            assignedACOs.push('OPTUM');
        }
    }
    
    return {
        planType,
        hasTargetedAdult,
        hasTraditionalAdult,
        assignedACOs,
        hasManagedCare,
        riskAssessment: calculateTransitionRisk(planType, assignedACOs, hasManagedCare)
    };
}

function calculateTransitionRisk(planType, assignedACOs, hasManagedCare) {
    const assessment = {
        cmEligible: false,
        riskLevel: 'unknown',
        recommendation: '',
        reasoning: '',
        adminAction: null
    };
    
    // Case 1: TARGETED ADULT MEDICAID - Stable Traditional FFS
    if (planType === 'TARGETED_ADULT_MEDICAID' && !hasManagedCare) {
        assessment.cmEligible = true;
        assessment.riskLevel = 'low';
        assessment.recommendation = 'ENROLL_IN_CM';
        assessment.reasoning = 'Stable Targeted Adult Medicaid (Traditional FFS) - low risk of ACO transition';
        return assessment;
    }
    
    // Case 2: TRADITIONAL ADULT with no ACO assignment yet
    if (planType === 'TRADITIONAL_ADULT' && !hasManagedCare && assignedACOs.length === 0) {
        assessment.cmEligible = true;
        assessment.riskLevel = 'medium';
        assessment.recommendation = 'ENROLL_WITH_MONITORING';
        assessment.reasoning = 'Traditional Adult plan (2-3 week FFS period) - monitor for ACO assignment';
        assessment.adminAction = 'SCHEDULE_FOLLOWUP_CHECK';
        return assessment;
    }
    
    // Case 3: TRADITIONAL ADULT with ACO assignment to contracted plan
    if (planType === 'TRADITIONAL_ADULT' && assignedACOs.length > 0) {
        const contractedACOs = assignedACOs.filter(aco => 
            MOONLIT_ACO_STATUS[aco]?.status === 'contracted' && 
            MOONLIT_ACO_STATUS[aco]?.effective
        );
        
        if (contractedACOs.length > 0) {
            assessment.cmEligible = true;
            assessment.riskLevel = 'low';
            assessment.recommendation = 'ENROLL_IN_CM';
            assessment.reasoning = `ACO assignment to contracted plan: ${contractedACOs[0]} - CM services available`;
            return assessment;
        }
        
        // ACO assignment to non-contracted plan
        assessment.cmEligible = false;
        assessment.riskLevel = 'high';
        assessment.recommendation = 'DO_NOT_ENROLL';
        assessment.reasoning = `ACO assignment to non-contracted plan: ${assignedACOs[0]} - CM services not available`;
        assessment.adminAction = 'PROVIDE_ACO_GUIDANCE';
        return assessment;
    }
    
    // Case 4: Already in managed care
    if (hasManagedCare) {
        const contractedACOs = assignedACOs.filter(aco => 
            MOONLIT_ACO_STATUS[aco]?.status === 'contracted' && 
            MOONLIT_ACO_STATUS[aco]?.effective
        );
        
        if (contractedACOs.length > 0) {
            assessment.cmEligible = true;
            assessment.riskLevel = 'low';
            assessment.recommendation = 'ENROLL_IN_CM';
            assessment.reasoning = `Already enrolled in contracted ACO: ${contractedACOs[0]}`;
            return assessment;
        }
        
        assessment.cmEligible = false;
        assessment.riskLevel = 'high';
        assessment.recommendation = 'DO_NOT_ENROLL';
        assessment.reasoning = 'Already enrolled in non-contracted managed care plan';
        assessment.adminAction = 'PROVIDE_ACO_GUIDANCE';
        return assessment;
    }
    
    // Default case
    assessment.cmEligible = false;
    assessment.riskLevel = 'unknown';
    assessment.recommendation = 'MANUAL_REVIEW';
    assessment.reasoning = 'Unable to determine plan type - manual review required';
    assessment.adminAction = 'ESCALATE_TO_ADMIN';
    
    return assessment;
}

function generateACOGuidanceMessage(assignedACOs) {
    const contractedPlans = [];
    const pendingPlans = [];
    
    for (const aco of assignedACOs) {
        const status = MOONLIT_ACO_STATUS[aco];
        if (status?.status === 'contracted' && status.effective) {
            contractedPlans.push(status.description);
        } else if (status?.status === 'pending') {
            pendingPlans.push(status.description);
        }
    }
    
    let message = "🏥 **ACO ENROLLMENT GUIDANCE FOR MOONLIT ACCESS**\n\n";
    
    if (contractedPlans.length > 0) {
        message += "✅ **CURRENTLY AVAILABLE**: You can access Moonlit services through:\n";
        contractedPlans.forEach(plan => message += `   • ${plan}\n`);
        message += "\n";
    }
    
    message += "⏳ **CONTRACTS IN PROGRESS**: The following plans are being added:\n";
    message += "   • SelectHealth Community Care\n";
    message += "   • University of Utah Health Plans (UUHP)\n";
    message += "   • Optum Health Plan\n\n";
    
    if (contractedPlans.length === 0) {
        message += "📞 **RECOMMENDED ACTION**: Consider switching to one of our contracted plans:\n";
        message += "   • Molina Health Choice Utah\n";
        message += "   • Health Choice Utah\n\n";
        message += "Contact Utah Medicaid at (800) 662-9651 to discuss ACO options.\n";
    }
    
    return message;
}

// Export for use in main eligibility API
module.exports = {
    analyzeACOTransitionRisk,
    calculateTransitionRisk,
    generateACOGuidanceMessage,
    MOONLIT_ACO_STATUS
};

// CLI usage example
if (require.main === module) {
    // Example usage with Jeremy's response (should show low risk)
    console.log('🔍 Testing ACO Transition Analysis\n');
    
    const jeremyResponse = `EB*1*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*MC*TARGETED ADULT MEDICAID~`;
    const selenaResponse = `EB*1*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*MC*TRADITIONAL ADULT~EB*3*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*HM*MC MEDICAL~NM1*PR*2*SELECTHEALTH*****PI*2000008~`;
    
    console.log('📊 **JEREMY MONTOYA ANALYSIS**:');
    const jeremyAnalysis = analyzeACOTransitionRisk(jeremyResponse);
    console.log(JSON.stringify(jeremyAnalysis, null, 2));
    
    console.log('\n📊 **SELENA PARTIDA ANALYSIS**:');
    const selenaAnalysis = analyzeACOTransitionRisk(selenaResponse);
    console.log(JSON.stringify(selenaAnalysis, null, 2));
    
    if (selenaAnalysis.adminAction === 'PROVIDE_ACO_GUIDANCE') {
        console.log('\n💬 **PATIENT GUIDANCE MESSAGE**:');
        console.log(generateACOGuidanceMessage(selenaAnalysis.assignedACOs));
    }
}