#!/usr/bin/env node
// Investigation: Selena Partida's Dual Coverage Configuration
// Address: Roy, UT (Davis County) - NOT Wasatch County
// Issue: SelectHealth ACO + Mental Health FFS + Non-PMHP county

// Let's analyze her full X12 271 response to understand the coverage structure

const selenaX12Response = `
EB*1*IND*30^60^MH*MC*MENTAL HEALTH INPATIENT~
EB*1*IND*30^60^98^MH*MC*MENTAL HEALTH OUTPATIENT~
EB*1*IND*30^60^AI*MC*SUBSTANCE USE DISORDER SERVICES~
EB*1*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*MC*TRADITIONAL ADULT~
EB*3*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*HM*MC MEDICAL~
NM1*PR*2*SELECTHEALTH*****PI*2000008~
EB*3*IND*30^60*HM*NON EMERGENCY TRANSPORTATION - MC~
NM1*PR*2*MODIVCARE*****PI*2000003~
EB*1*IND*30^35^60*MC*DENTAL PROGRAM FOR ADULTS~
`;

console.log('🔍 SELENA PARTIDA DUAL COVERAGE ANALYSIS');
console.log('Address: Roy, UT (Davis County)');
console.log('=' * 60);

function analyzeSelenasCoverage() {
    const lines = selenaX12Response.trim().split('\n');
    
    console.log('📋 **COVERAGE BREAKDOWN**:');
    
    // Mental Health Coverage Analysis
    console.log('\n🧠 **MENTAL HEALTH COVERAGE**:');
    const mhInpatient = lines.find(line => line.includes('MENTAL HEALTH INPATIENT'));
    const mhOutpatient = lines.find(line => line.includes('MENTAL HEALTH OUTPATIENT'));
    const substanceUse = lines.find(line => line.includes('SUBSTANCE USE DISORDER'));
    
    console.log(`  Inpatient MH: ${mhInpatient}`);
    console.log(`  Outpatient MH: ${mhOutpatient}`);
    console.log(`  Substance Use: ${substanceUse}`);
    
    // Key finding: All MH services are MC (Medicaid FFS), NOT HM (managed care)
    console.log('\n🔑 **CRITICAL FINDING**: Mental Health = MC (Medicaid FFS)');
    
    // Medical Coverage Analysis
    console.log('\n🏥 **MEDICAL COVERAGE**:');
    const traditionalAdult = lines.find(line => line.includes('TRADITIONAL ADULT'));
    const mcMedical = lines.find(line => line.includes('MC MEDICAL'));
    const selectHealth = lines.find(line => line.includes('SELECTHEALTH'));
    
    console.log(`  Traditional Adult: ${traditionalAdult}`);
    console.log(`  MC Medical: ${mcMedical}`);
    console.log(`  SelectHealth: ${selectHealth}`);
    
    console.log('\n🔑 **CRITICAL FINDING**: Medical = HM (SelectHealth ACO)');
    
    // Geographic Analysis
    console.log('\n🗺️ **GEOGRAPHIC ANALYSIS**:');
    console.log('  Address: Roy, UT = Davis County');
    console.log('  Expected: Davis County should have PMHP (not FFS)');
    console.log('  Actual: Mental Health shows as MC (FFS)');
    
    return {
        mentalHealthProvider: 'MEDICAID_FFS',
        medicalProvider: 'SELECTHEALTH_ACO',
        location: 'ROY_UT_DAVIS_COUNTY',
        anomaly: 'MH_FFS_IN_NON_PMHP_EXEMPT_COUNTY'
    };
}

function investigatePossibleCauses() {
    console.log('\n❓ **POSSIBLE EXPLANATIONS**:');
    
    console.log('\n1. **PMHP Carve-Out Exception**:');
    console.log('   - Certain providers may be carved out of PMHP');
    console.log('   - Specialty MH providers might remain FFS');
    console.log('   - Crisis services often carved out');
    
    console.log('\n2. **Provider Network Gaps**:');
    console.log('   - SelectHealth may not have MH network in Davis County');
    console.log('   - Utah defaults to FFS when ACO lacks network');
    
    console.log('\n3. **Service Type Carve-Out**:');
    console.log('   - Inpatient MH might be carved out of ACOs');
    console.log('   - Substance use services often remain FFS');
    
    console.log('\n4. **Transition Period Configuration**:');
    console.log('   - Patient in transition between plans');
    console.log('   - MH services lag behind medical assignment');
    
    console.log('\n5. **Address/County Mismatch**:');
    console.log('   - Address may be incorrect in system');
    console.log('   - Patient may have moved recently');
}

function analyzeForCMEligibility() {
    console.log('\n✅ **CM PROGRAM IMPLICATIONS**:');
    
    console.log('\n🎯 **KEY FINDING**: Mental Health = FFS = CM ELIGIBLE!');
    console.log('   - Mental Health Outpatient: MC (Medicaid FFS)');
    console.log('   - This means CM services CAN be billed to Traditional Medicaid');
    console.log('   - SelectHealth ACO assignment DOES NOT affect MH billing');
    
    console.log('\n📋 **RECOMMENDATION**: ENROLL IN CM PROGRAM');
    console.log('   - Mental health services remain in Traditional FFS');
    console.log('   - CM billing pathway is available');
    console.log('   - Medical ACO assignment is irrelevant for MH services');
    
    console.log('\n⚠️ **UPDATED BUSINESS RULE**:');
    console.log('   - Check MENTAL HEALTH service coverage specifically');
    console.log('   - MC code for MH services = CM eligible');
    console.log('   - HM code for MH services = CM not available');
    console.log('   - Medical coverage type is IRRELEVANT');
}

function generateUpdatedRules() {
    console.log('\n🔧 **UPDATED ACO ANALYSIS RULES**:');
    
    console.log('\nOLD RULE: "If ACO assigned = Do not enroll"');
    console.log('NEW RULE: "If MH services = FFS, enroll regardless of medical ACO"');
    
    console.log('\n```javascript');
    console.log('// Updated CM eligibility logic');
    console.log('function checkCMEligibility(x12_271) {');
    console.log('  // Look specifically for Mental Health service coverage');
    console.log('  const mhOutpatient = findEBSegment(x12_271, "MENTAL HEALTH OUTPATIENT");');
    console.log('  const mhInpatient = findEBSegment(x12_271, "MENTAL HEALTH INPATIENT");');
    console.log('  ');
    console.log('  // Check if MH services are FFS (MC) or managed care (HM)');
    console.log('  const mhIsFFS = mhOutpatient.includes("*MC*") || mhInpatient.includes("*MC*");');
    console.log('  const mhIsManagedCare = mhOutpatient.includes("*HM*") || mhInpatient.includes("*HM*");');
    console.log('  ');
    console.log('  if (mhIsFFS) {');
    console.log('    return { eligible: true, reason: "Mental Health services in Traditional FFS" };');
    console.log('  } else if (mhIsManagedCare) {');
    console.log('    return { eligible: false, reason: "Mental Health services in managed care" };');
    console.log('  }');
    console.log('}');
    console.log('```');
}

// Run the analysis
const result = analyzeSelenasCoverage();
investigatePossibleCauses();
analyzeForCMEligibility();
generateUpdatedRules();

console.log('\n🏁 **CONCLUSION**:');
console.log('Selena Partida IS eligible for CM program despite SelectHealth ACO assignment');
console.log('because her Mental Health services remain in Traditional Medicaid FFS.');
console.log('This is a critical exception that our system must account for!');