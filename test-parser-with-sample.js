#!/usr/bin/env node

const fs = require('fs');

// Import the enhanced parser function
const { parseCopayInformation } = require('./universal-eligibility-checker-enhanced.js');

// Create a standalone version of the parser for testing
function parseCopayInformation_Test(x12_271) {
    // Service Type Code mapping (from X12 standards and Office Ally documentation)
    const SERVICE_TYPES = {
        '1': 'Medical Care',
        '30': 'Health Benefit Plan Coverage',
        '33': 'Chiropractic',
        '35': 'Dental Care',
        '47': 'Hospital - Inpatient',
        '48': 'Hospital - Outpatient',
        '50': 'Hospice',
        '54': 'Long Term Care',
        '60': 'General Benefits',
        '86': 'Emergency Services',
        '88': 'Pharmacy',
        '98': 'Professional (Physician) Visit',
        'AI': 'Air Transportation',
        'AL': 'Ambulance',
        'MH': 'Mental Health',
        'UC': 'Urgent Care',
        'HM': 'Health Maintenance Organization'
    };

    // Eligibility/Benefit Status Codes
    const ELIGIBILITY_CODES = {
        '1': 'Active Coverage',
        'A': 'Co-pay',
        'B': 'Co-insurance',
        'C': 'Deductible',
        'G': 'Out of Pocket (Stop Loss)',
        'I': 'Benefit Description',
        'N': 'Not Applicable',
        'U': 'Unknown',
        '3': 'Not Covered'
    };

    // Time Period Qualifiers
    const TIME_QUALIFIERS = {
        '23': 'Calendar Year',
        '24': 'Year to Date',
        '25': 'Contract',
        '26': 'Episode',
        '27': 'Visit',
        '29': 'Remaining'
    };

    const benefitInfo = {
        copays: {},
        coinsurance: {},
        deductibles: {},
        outOfPocketLimits: {},
        serviceCoverage: [],
        messages: [],
        rawBenefits: [],
        hasCopayInfo: false,
        hasCoinsuranceInfo: false,
        hasDeductibleInfo: false,
        details: []
    };
    
    try {
        console.log('\n🔍 COMPREHENSIVE X12 271 BENEFIT PARSER - SAMPLE DATA TEST');
        console.log('=========================================================');
        
        // Split into segments for analysis
        const segments = x12_271.split(/[~\n]/);
        
        for (const segment of segments) {
            const trimmed = segment.trim();
            if (!trimmed) continue;
            
            // Parse EB (Eligibility/Benefit Information) segments
            if (trimmed.startsWith('EB*')) {
                console.log(`\n📋 EB Segment: ${trimmed}`);
                
                const parts = trimmed.split('*');
                const benefit = {
                    eligibilityCode: parts[1] || '',
                    coverageLevel: parts[2] || '',
                    serviceTypes: (parts[3] || '').split('^'),
                    insuranceType: parts[4] || '',
                    planCoverage: parts[5] || '',
                    timeQualifier: parts[6] || '',
                    monetaryAmount: parts[7] || '',
                    percentageQualifier: parts[8] || '',
                    percentageAmount: parts[9] || '',
                    description: ''
                };
                
                // Add human-readable descriptions
                benefit.eligibilityDescription = ELIGIBILITY_CODES[benefit.eligibilityCode] || benefit.eligibilityCode;
                benefit.timeDescription = TIME_QUALIFIERS[benefit.timeQualifier] || benefit.timeQualifier;
                benefit.serviceDescriptions = benefit.serviceTypes.map(type => SERVICE_TYPES[type] || type);
                
                console.log(`   Status: ${benefit.eligibilityDescription} (${benefit.eligibilityCode})`);
                console.log(`   Coverage: ${benefit.coverageLevel}`);
                console.log(`   Services: ${benefit.serviceDescriptions.join(', ')}`);
                console.log(`   Amount: $${benefit.monetaryAmount || 'N/A'}`);
                console.log(`   Percentage: ${benefit.percentageAmount || 'N/A'}%`);
                console.log(`   Time Period: ${benefit.timeDescription} (${benefit.timeQualifier})`);
                
                benefitInfo.rawBenefits.push(benefit);
                
                // Extract specific benefit types
                if (benefit.monetaryAmount && !isNaN(parseFloat(benefit.monetaryAmount))) {
                    const amount = parseFloat(benefit.monetaryAmount);
                    
                    // Copay information (Status code 'A')
                    if (benefit.eligibilityCode === 'A' && amount > 0) {
                        benefitInfo.hasCopayInfo = true;
                        benefit.serviceTypes.forEach(serviceType => {
                            if (!benefitInfo.copays[serviceType]) benefitInfo.copays[serviceType] = [];
                            benefitInfo.copays[serviceType].push({
                                amount: amount,
                                description: SERVICE_TYPES[serviceType] || serviceType,
                                timeQualifier: benefit.timeQualifier
                            });
                        });
                    }
                    
                    // Deductible information (Status code 'C')
                    if (benefit.eligibilityCode === 'C') {
                        benefitInfo.hasDeductibleInfo = true;
                        benefit.serviceTypes.forEach(serviceType => {
                            if (!benefitInfo.deductibles[serviceType]) benefitInfo.deductibles[serviceType] = [];
                            benefitInfo.deductibles[serviceType].push({
                                amount: amount,
                                description: SERVICE_TYPES[serviceType] || serviceType,
                                timeQualifier: benefit.timeQualifier,
                                timeDescription: benefit.timeDescription
                            });
                        });
                    }
                    
                    // Out of Pocket Maximum (Status code 'G')
                    if (benefit.eligibilityCode === 'G') {
                        benefit.serviceTypes.forEach(serviceType => {
                            if (!benefitInfo.outOfPocketLimits[serviceType]) benefitInfo.outOfPocketLimits[serviceType] = [];
                            benefitInfo.outOfPocketLimits[serviceType].push({
                                amount: amount,
                                description: SERVICE_TYPES[serviceType] || serviceType,
                                timeQualifier: benefit.timeQualifier,
                                timeDescription: benefit.timeDescription
                            });
                        });
                    }
                }
                
                // Extract coinsurance information
                if (benefit.percentageAmount && !isNaN(parseFloat(benefit.percentageAmount))) {
                    const percent = parseFloat(benefit.percentageAmount);
                    
                    if (benefit.eligibilityCode === 'B' && percent > 0) {
                        benefitInfo.hasCoinsuranceInfo = true;
                        benefit.serviceTypes.forEach(serviceType => {
                            if (!benefitInfo.coinsurance[serviceType]) benefitInfo.coinsurance[serviceType] = [];
                            benefitInfo.coinsurance[serviceType].push({
                                percentage: percent,
                                description: SERVICE_TYPES[serviceType] || serviceType,
                                timeQualifier: benefit.timeQualifier
                            });
                        });
                    }
                }
                
                // Create service coverage summary
                if (benefit.eligibilityCode === '1') {
                    const coverage = {
                        status: 'Active',
                        services: benefit.serviceDescriptions,
                        insuranceType: benefit.insuranceType,
                        planCoverage: benefit.planCoverage
                    };
                    benefitInfo.serviceCoverage.push(coverage);
                }
            }
            
            // Parse MSG segments for additional information
            if (trimmed.startsWith('MSG*')) {
                const message = trimmed.substring(4);
                console.log(`📝 Message: ${message}`);
                benefitInfo.messages.push(message);
            }
            
            // Parse patient demographics
            if (trimmed.startsWith('NM1*IL*')) {
                const parts = trimmed.split('*');
                console.log(`👤 Patient: ${parts[4]} ${parts[3]} (ID: ${parts[9]})`);
            }
            
            // Parse payer information
            if (trimmed.startsWith('NM1*PR*')) {
                const parts = trimmed.split('*');
                console.log(`🏥 Payer: ${parts[3]} (ID: ${parts[9]})`);
            }
        }
        
        // Log comprehensive results
        console.log('\n💰 COMPREHENSIVE BENEFIT EXTRACTION RESULTS:');
        console.log('============================================');
        
        console.log(`📊 SUMMARY: Found ${benefitInfo.rawBenefits.length} benefit segments`);
        console.log(`   Copay Info: ${benefitInfo.hasCopayInfo ? 'YES' : 'NO'}`);
        console.log(`   Coinsurance Info: ${benefitInfo.hasCoinsuranceInfo ? 'YES' : 'NO'}`);
        console.log(`   Deductible Info: ${benefitInfo.hasDeductibleInfo ? 'YES' : 'NO'}`);
        
        if (benefitInfo.serviceCoverage.length > 0) {
            console.log('📋 ACTIVE COVERAGE:');
            benefitInfo.serviceCoverage.forEach(coverage => {
                console.log(`   ${coverage.services.join(', ')} (${coverage.insuranceType})`);
            });
        }
        
        if (benefitInfo.messages.length > 0) {
            console.log('📋 ADDITIONAL MESSAGES:');
            benefitInfo.messages.forEach(msg => {
                console.log(`   ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
            });
        }
        
        console.log('============================================\n');
        
    } catch (error) {
        console.error('❌ Error parsing comprehensive benefit information:', error);
    }
    
    return benefitInfo;
}

// Test with the Jeremy Montoya sample
console.log('🧪 TESTING COMPREHENSIVE PARSER WITH JEREMY MONTOYA SAMPLE DATA');
console.log('================================================================');

try {
    const sampleData = fs.readFileSync('raw_x12_271_jeremy_montoya_sample.txt', 'utf8');
    const result = parseCopayInformation_Test(sampleData);
    
    console.log('\n🎯 FINAL PARSED RESULT:');
    console.log('========================');
    console.log(JSON.stringify(result, null, 2));
    
} catch (error) {
    console.error('Error reading sample file:', error);
}