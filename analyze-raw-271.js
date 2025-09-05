// analyze-raw-271.js - Extract detailed Utah Medicaid plan information from raw X12 271 data

// Sample raw 271 data from Office Ally (Jeremy Montoya)
const sampleX12_271 = `ISA*00*          *00*          *ZZ*OFFALLY        *01*1161680        *250905*1029*^*00501*601202146*0*P*:~GS*HB*OFFALLY*1161680*20250905*1029*601202146*X*005010X279A1~ST*271*601202146*005010X279A1~BHT*0022*11*MOONLIT-093384104*20250905*102948~HL*1**20*1~NM1*PR*2*MEDICAID UTAH*****PI*UTMCD~PER*IC*DIVISION OF MEDICAID AND HEALTH FINANCING*TE*8006629651*TE*8015386155~HL*2*1*21*1~NM1*1P*2*MOONLIT PLLC*****XX*1275348807~HL*3*2*22*0~TRN*1*701202146-20250905*9OFFICALLY~TRN*2*093384104*1275348807*ELIGIBILITY~NM1*IL*1*MONTOYA*JEREMY****MI*0900412827~REF*3H*980225~N3*PO BOX 1290~N4*SALT LAKE CITY*UT*84110~DMG*D8*19840717*M~DTP*291*RD8*20250905-20250905~EB*1*IND*30^60^MH*MC*MENTAL HEALTH INPATIENT~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE. SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFO~EB*A*IND*30*MC*MENTAL HEALTH INPATIENT***0~DTP*291*RD8*20250905-20250905~EB*B*IND*30*MC*MENTAL HEALTH INPATIENT**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*MC*MENTAL HEALTH INPATIENT**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*MC*MENTAL HEALTH INPATIENT*29*0~DTP*291*RD8*20250905-20250905~EB*1*IND*30^60^98^MH*MC*MENTAL HEALTH OUTPATIENT~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE. SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFO~EB*A*IND*30*MC*MENTAL HEALTH OUTPATIENT***0~DTP*291*RD8*20250905-20250905~EB*B*IND*30*MC*MENTAL HEALTH OUTPATIENT**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*MC*MENTAL HEALTH OUTPATIENT**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*MC*MENTAL HEALTH OUTPATIENT*29*0~DTP*291*RD8*20250905-20250905~EB*1*IND*30^60^AI*MC*SUBSTANCE USE DISORDER SERVICES~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE. SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFO~EB*A*IND*30*MC*SUBSTANCE USE DISORDER SERVICES***0~DTP*291*RD8*20250905-20250905~EB*B*IND*30*MC*SUBSTANCE USE DISORDER SERVICES**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*MC*SUBSTANCE USE DISORDER SERVICES**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*MC*SUBSTANCE USE DISORDER SERVICES*29*0~DTP*291*RD8*20250905-20250905~EB*1*IND*30^1^45^47^48^50^54^60^86^88^98^AL^UC*MC*TARGETED ADULT MEDICAID~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE. SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFO~MSG*CO-PAY, COINSURANCE, DEDUCTIBLE OR OUT OF POCKET AMOUNTS ARE FOR THE DATE OF INQUIRY ONLY. AMOUNTS ARE APPLIED TO THE CLAIM AT TIME OF ADJUDICATION AND MAY VARY FROM DATA GIVEN IN THIS TRANSACTION~EB*A*IND*30*MC*TARGETED ADULT MEDICAID***0~DTP*291*RD8*20250905-20250905~EB*B*IND*47*MC*TARGETED ADULT MEDICAID**0~DTP*291*RD8*20250905-20250905~EB*B*IND*30^1^45^48^50^54^60^86^88^98^AL^UC*MC*TARGETED ADULT MEDICAID**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*MC*TARGETED ADULT MEDICAID**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*MC*TARGETED ADULT MEDICAID*29*0~DTP*291*RD8*20250905-20250905~EB*3*IND*30^60*HM*NON EMERGENCY TRANSPORTATION - MC~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE. SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFO~LS*2120~NM1*PR*2*MODIVCARE*****PI*2000003~N3*1275 PEACHTREE ST NE STE 600~N4*ATLANTA*GA*30309~PER*IC**TE*8004867647~LE*2120~EB*A*IND*30*HM*NON EMERGENCY TRANSPORTATION - MC***0~DTP*291*RD8*20250905-20250905~EB*B*IND*30^60*HM*NON EMERGENCY TRANSPORTATION - MC**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*HM*NON EMERGENCY TRANSPORTATION - MC**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*HM*NON EMERGENCY TRANSPORTATION - MC*29*0~DTP*291*RD8*20250905-20250905~EB*1*IND*30^35^60*MC*DENTAL PROGRAM FOR ADULTS~DTP*291*RD8*20250905-20250905~MSG*INFORMATION CONTAINED IN THIS RESPONSE IS FOR ELIGIBILITY VERIFICATION ONLY AND DOES NOT GUARANTEE BENEFIT COVERAGE.  SEE PROVIDER MANUALS AND ADMINISTRATIVE RULES AVAILABLE THROUGH {MEDICAID.UTAH.GOV}~MSG*FOR CODE SPECIFIC REQUIREMENTS REFER TO THE COVERAGE AND REIMBURSEMENT LOOKUP TOOL AT {WWW.HEALTH.UTAH.GOV/STPLAN/LOOKUP/COVERAGELOOKUP.PHP}~MSG*TELEPHONE HOURS ARE 8 AM - 5 PM, MONDAY Medicaid THROUGH FRIDAY. ON TUESDAY, WE BEGIN TAKING CALLS AT 11 AM. PLEASE CALL (801) 538-6155 OR (800) 662-9651, IF YOU HAVE ANY QUESTIONS ABOUT THIS ELIGIBILITY INFORMATION.~MSG*CO-PAY MAY APPLY TO AN ORAL SURGEON OFFICE VISIT. CO-PAY, COINSURANCE, DEDUCTIBLE OR OUT OF POCKET AMOUNTS ARE FOR THE DATE OF INQUIRY ONLY.  AMOUNTS ARE APPLIED TO THE CLAIM AT TIME OF ADJUDICATION AND MAY VARY FROM DATA GIVEN IN THIS TRANSACTION.~EB*A*IND*30*MC*DENTAL PROGRAM FOR ADULTS***0~DTP*291*RD8*20250905-20250905~EB*B*IND*30*MC*DENTAL PROGRAM FOR ADULTS**0~DTP*291*RD8*20250905-20250905~EB*C*IND*30*MC*DENTAL PROGRAM FOR ADULTS**0~DTP*291*RD8*20250905-20250905~EB*G*IND*30*MC*DENTAL PROGRAM FOR ADULTS*29*0~DTP*291*RD8*20250905-20250905~EB*I*IND*33~DTP*291*RD8*20250905-20250905~SE*107*601202146~GE*1*601202146~IEA*1*601202146~`;

// Utah Medicaid Plan Types and ACO/MCO Mapping
const UTAH_MEDICAID_PLANS = {
    // ACO/MCO Organizations
    'HEALTHCHOICE': { name: 'Health Choice Utah', type: 'Managed Care', category: 'ACO' },
    'MOLINA': { name: 'Molina Healthcare of Utah', type: 'Managed Care', category: 'MCO' },
    'SELECTHEALTH': { name: 'SelectHealth Community Care', type: 'Managed Care', category: 'MCO' },
    'UUHP': { name: 'University of Utah Health Plans', type: 'Managed Care', category: 'ACO' },
    'PMHP': { name: 'Optum (PMHP)', type: 'Managed Care', category: 'MCO' },
    
    // Traditional/FFS Programs
    'TRADITIONAL': { name: 'Traditional Medicaid (Fee-for-Service)', type: 'Fee-for-Service', category: 'Traditional' },
    'TARGETED_ADULT': { name: 'Targeted Adult Medicaid', type: 'Fee-for-Service', category: 'Expansion' },
    'PCIP': { name: 'Primary Care Network (PCN)', type: 'Fee-for-Service', category: 'Network' },
    
    // Special Programs
    'DUAL_ELIGIBLE': { name: 'Dual Eligible Special Needs Plan', type: 'Special', category: 'Dual' },
    'LTSS': { name: 'Long Term Services & Supports', type: 'Waiver', category: 'LTSS' }
};

// Service Type Codes
const SERVICE_TYPES = {
    '1': 'Medical Care',
    '30': 'Health Benefit Plan Coverage', 
    '33': 'Chiropractic',
    '35': 'Dental Care',
    '45': 'Hospice',
    '47': 'Hospital - Room and Board',
    '48': 'Hospital - Inpatient',
    '50': 'Hospital - Outpatient',
    '54': 'Long Term Care',
    '60': 'Hospital',
    '86': 'Emergency Services',
    '88': 'Pharmacy',
    '98': 'Professional Services',
    'AI': 'Substance Use Disorder',
    'AL': 'Vision',
    'MH': 'Mental Health',
    'UC': 'Urgent Care',
    'HM': 'Transportation'
};

// Eligibility Status Codes
const ELIGIBILITY_CODES = {
    '1': 'Active Coverage',
    '2': 'Active - Full Risk Capitation',
    '3': 'Active - Services Capitated to Primary Care Provider', 
    '4': 'Active - Services Capitated to Mental Health Organization',
    '5': 'Active - Services Capitated to Mental Health Care Carve-Out',
    '6': 'Inactive',
    '7': 'Inactive - Pending Eligibility Update',
    '8': 'Inactive - Pending Investigation',
    'A': 'Active',
    'B': 'Unknown',
    'C': 'Unknown',
    'G': 'Unknown',
    'I': 'Inactive'
};

function analyzeUtahMedicaidDetails(x12_271) {
    console.log('🔍 ANALYZING UTAH MEDICAID ELIGIBILITY DETAILS');
    console.log('='.repeat(60));
    
    // Parse segments
    const segments = x12_271.split('~').filter(seg => seg.trim());
    
    // Extract key information
    const analysis = {
        patient: {},
        payer: {},
        plans: [],
        coverage: [],
        transportation: null,
        messages: []
    };
    
    // Parse patient information
    const nmilSegment = segments.find(seg => seg.startsWith('NM1*IL*'));
    if (nmilSegment) {
        const parts = nmilSegment.split('*');
        analysis.patient.name = `${parts[4]} ${parts[3]}`;
        if (parts[9]) analysis.patient.medicaidId = parts[9];
    }
    
    // Parse address
    const n3Segment = segments.find(seg => seg.startsWith('N3*'));
    const n4Segment = segments.find(seg => seg.startsWith('N4*'));
    if (n3Segment && n4Segment) {
        const n3Parts = n3Segment.split('*');
        const n4Parts = n4Segment.split('*');
        analysis.patient.address = {
            street: n3Parts[1],
            city: n4Parts[1],
            state: n4Parts[2],
            zip: n4Parts[3]
        };
    }
    
    // Parse demographics
    const dmgSegment = segments.find(seg => seg.startsWith('DMG*'));
    if (dmgSegment) {
        const parts = dmgSegment.split('*');
        const dob = parts[2];
        analysis.patient.dateOfBirth = `${dob.slice(4,6)}/${dob.slice(6,8)}/${dob.slice(0,4)}`;
        analysis.patient.gender = parts[3] || 'Not specified';
    }
    
    // Parse payer information
    const nm1PrSegment = segments.find(seg => seg.startsWith('NM1*PR*'));
    if (nm1PrSegment) {
        const parts = nm1PrSegment.split('*');
        analysis.payer.name = parts[3];
        analysis.payer.id = parts[9];
    }
    
    // Parse eligibility benefits (EB segments) - THE KEY DATA!
    const ebSegments = segments.filter(seg => seg.startsWith('EB*'));
    
    console.log(`\n📋 Found ${ebSegments.length} Eligibility Benefit (EB) segments:`);
    
    ebSegments.forEach((eb, index) => {
        const parts = eb.split('*');
        const eligibilityCode = parts[1]; // 1=Active, A=Active, etc.
        const serviceTypes = parts[3] ? parts[3].split('^') : ['30']; // Service types
        const planCode = parts[4]; // Plan code (MC, HM, etc.)
        const planDescription = parts[5]; // Plan name/description
        
        const status = ELIGIBILITY_CODES[eligibilityCode] || `Unknown (${eligibilityCode})`;
        
        console.log(`\n   ${index + 1}. EB*${eligibilityCode}*IND*${parts[3]}*${planCode}*${planDescription}`);
        console.log(`      Status: ${status}`);
        console.log(`      Plan Code: ${planCode}`);
        console.log(`      Plan Description: ${planDescription}`);
        
        serviceTypes.forEach(serviceType => {
            const serviceName = SERVICE_TYPES[serviceType] || `Unknown Service (${serviceType})`;
            console.log(`      Service: ${serviceName} (${serviceType})`);
        });
        
        // Categorize the plan
        let planCategory = 'Unknown';
        let planType = 'Unknown';
        let acoMco = null;
        
        if (planDescription) {
            const desc = planDescription.toUpperCase();
            
            if (desc.includes('TARGETED ADULT MEDICAID')) {
                planCategory = 'Targeted Adult Medicaid (ACA Expansion)';
                planType = 'Fee-for-Service';
            } else if (desc.includes('MENTAL HEALTH')) {
                planCategory = 'Mental Health Services';
                planType = desc.includes('INPATIENT') ? 'Inpatient Mental Health' : 'Outpatient Mental Health';
            } else if (desc.includes('SUBSTANCE USE')) {
                planCategory = 'Substance Use Disorder Treatment';
                planType = 'Behavioral Health';
            } else if (desc.includes('TRANSPORTATION')) {
                planCategory = 'Non-Emergency Medical Transportation';
                planType = 'Ancillary Service';
            } else if (desc.includes('DENTAL')) {
                planCategory = 'Adult Dental Program';
                planType = 'Limited Dental Benefits';
            }
        }
        
        analysis.coverage.push({
            status,
            eligibilityCode,
            planCode,
            planDescription,
            planCategory,
            planType,
            services: serviceTypes.map(st => ({
                code: st,
                name: SERVICE_TYPES[st] || `Unknown (${st})`
            })),
            isActive: ['1', 'A', '2', '3', '4', '5'].includes(eligibilityCode)
        });
    });
    
    // Look for MCO information in LS/LE loops
    const lsSegments = segments.filter((seg, index) => {
        if (seg.startsWith('LS*')) {
            // Find matching LE
            const leIndex = segments.findIndex((leSeg, leIdx) => 
                leIdx > index && leSeg.startsWith('LE*')
            );
            if (leIndex > index) {
                // Get NM1*PR within this loop
                const loopSegments = segments.slice(index, leIndex + 1);
                const mcoSegment = loopSegments.find(s => s.startsWith('NM1*PR*'));
                if (mcoSegment) {
                    const parts = mcoSegment.split('*');
                    analysis.transportation = {
                        company: parts[3],
                        id: parts[9]
                    };
                }
            }
        }
        return false;
    });
    
    // Parse informational messages
    const msgSegments = segments.filter(seg => seg.startsWith('MSG*'));
    analysis.messages = msgSegments.map(seg => seg.substring(4));
    
    return analysis;
}

// Run analysis
const analysis = analyzeUtahMedicaidDetails(sampleX12_271);

console.log('\n📊 UTAH MEDICAID ELIGIBILITY ANALYSIS RESULTS');
console.log('='.repeat(60));

console.log('\n👤 PATIENT INFORMATION:');
console.log(`Name: ${analysis.patient.name}`);
console.log(`Medicaid ID: ${analysis.patient.medicaidId}`);
console.log(`Date of Birth: ${analysis.patient.dateOfBirth}`);
console.log(`Gender: ${analysis.patient.gender}`);
if (analysis.patient.address) {
    console.log(`Address: ${analysis.patient.address.street}`);
    console.log(`         ${analysis.patient.address.city}, ${analysis.patient.address.state} ${analysis.patient.address.zip}`);
}

console.log('\n🏥 PAYER INFORMATION:');
console.log(`Payer: ${analysis.payer.name}`);
console.log(`Payer ID: ${analysis.payer.id}`);

console.log('\n📋 COVERAGE SUMMARY:');
const activePrograms = analysis.coverage.filter(c => c.isActive);
const inactivePrograms = analysis.coverage.filter(c => !c.isActive);

console.log(`✅ Active Programs: ${activePrograms.length}`);
console.log(`❌ Inactive Programs: ${inactivePrograms.length}`);

console.log('\n📊 DETAILED COVERAGE BREAKDOWN:');
activePrograms.forEach((coverage, index) => {
    console.log(`\n   ${index + 1}. ${coverage.planCategory}`);
    console.log(`      Type: ${coverage.planType}`);
    console.log(`      Status: ${coverage.status}`);
    console.log(`      Plan Code: ${coverage.planCode}`);
    
    if (coverage.services.length > 0) {
        console.log(`      Services: ${coverage.services.map(s => s.name).join(', ')}`);
    }
});

if (analysis.transportation) {
    console.log('\n🚗 TRANSPORTATION PROVIDER:');
    console.log(`Company: ${analysis.transportation.company}`);
    console.log(`Provider ID: ${analysis.transportation.id}`);
}

console.log('\n📝 SUMMARY FOR PROVIDER:');
console.log('Jeremy Montoya is enrolled in Utah Medicaid with the following active benefits:');

// Determine primary program
const primaryProgram = activePrograms.find(p => p.planCategory.includes('TARGETED ADULT')) || activePrograms[0];
if (primaryProgram) {
    console.log(`\n🎯 PRIMARY PROGRAM: ${primaryProgram.planCategory}`);
    console.log(`   This appears to be Traditional/Fee-for-Service Medicaid`);
    console.log(`   NOT enrolled in an ACO/MCO (Health Choice, Molina, SelectHealth, etc.)`);
}

console.log('\n🔍 KEY INSIGHTS:');
console.log('• Patient has TRADITIONAL MEDICAID (Fee-for-Service)');
console.log('• Not enrolled in managed care (ACO/MCO)');
console.log('• Covered services include Mental Health, Substance Use, Dental, Transportation');
console.log('• This is likely ACA Medicaid Expansion population');

// Export for use in main application
module.exports = { analyzeUtahMedicaidDetails, UTAH_MEDICAID_PLANS, SERVICE_TYPES, ELIGIBILITY_CODES };