#!/usr/bin/env node

/**
 * Universal Eligibility Checker for Multiple Payers
 * Supports Utah Medicaid, Aetna, and other major payers
 * 
 * Usage: node universal-eligibility-checker.js <first> <last> <dob> <payer>
 * Example: node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 AETNA
 */

require('dotenv').config();

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME || process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD || '[REDACTED-PASSWORD]',
    senderID: process.env.OFFICE_ALLY_SENDER_ID,
    receiverID: 'OFFALLY',
    providerNPI: '1124778121',  // Travis Norseth - enrolled with Aetna
    providerName: 'TRAVIS NORSETH'
};

// Comprehensive Aetna Payer ID Directory (from Office Ally official list)
const AETNA_PAYER_IDS = {
    'AETNA': '60054',           // Standard Aetna
    'AETNA_BETTER_HEALTH': 'ABH12',    // Aetna Better Health - Illinois  
    'AETNA_BETTER_HEALTH_FL': 'ABH13',  // Aetna Better Health - Florida
    'AETNA_BETTER_HEALTH_KY': 'ABH14',  // Aetna Better Health - Kentucky
    'AETNA_BETTER_HEALTH_LA': 'ABH15',  // Aetna Better Health - Louisiana
    'AETNA_BETTER_HEALTH_MD': 'ABH16',  // Aetna Better Health - Maryland
    'AETNA_BETTER_HEALTH_NJ': 'ABH17',  // Aetna Better Health - New Jersey
    'AETNA_BETTER_HEALTH_NY': 'ABH18',  // Aetna Better Health - New York
    'AETNA_BETTER_HEALTH_OH': 'ABH19',  // Aetna Better Health - Ohio
    'AETNA_BETTER_HEALTH_PA': 'ABH20',  // Aetna Better Health - Pennsylvania
    'AETNA_BETTER_HEALTH_TX': 'ABH21',  // Aetna Better Health - Texas
    'AETNA_BETTER_HEALTH_VA': 'ABH22',  // Aetna Better Health - Virginia
    'AETNA_BETTER_HEALTH_WV': 'ABH23'   // Aetna Better Health - West Virginia
};

const PAYER_CONFIGS = {
    'UTAH_MEDICAID': {
        payerName: 'UTAH MEDICAID',
        payerId: 'UTMCD',
        providerNPI: '1275348807',  // Moonlit PLLC
        providerName: 'MOONLIT PLLC'
    },
    'AETNA': {
        payerName: 'AETNA',
        payerId: AETNA_PAYER_IDS.AETNA,
        providerNPI: '1124778121',  // Travis Norseth
        providerName: 'TRAVIS NORSETH'
    },
    'AETNA_BETTER_HEALTH': {
        payerName: 'AETNA BETTER HEALTH',
        payerId: AETNA_PAYER_IDS.AETNA_BETTER_HEALTH,
        providerNPI: '1124778121',  // Travis Norseth
        providerName: 'TRAVIS NORSETH'
    },
    // Add more as needed
};

// Generate X12 270 for any payer using working format
function generateX12_270(patient, payerConfig) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15(OFFICE_ALLY_CONFIG.senderID);
    const ISA08 = pad15(OFFICE_ALLY_CONFIG.receiverID);

    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*${OFFICE_ALLY_CONFIG.senderID}*${OFFICE_ALLY_CONFIG.receiverID}*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Payer
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*${payerConfig.payerName}*****PI*${payerConfig.payerId}`);

    // 2100B: Information Receiver (organization)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*${payerConfig.providerName}*****XX*${payerConfig.providerNPI}`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${payerConfig.providerNPI}*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`); // General eligibility only - same as working version

    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

// Generate SOAP request
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
    return `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
<soapenv:Header>
<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken>
<wsse:Username>${OFFICE_ALLY_CONFIG.username}</wsse:Username>
<wsse:Password>${OFFICE_ALLY_CONFIG.password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soapenv:Header>
<soapenv:Body>
<ns1:COREEnvelopeRealTimeRequest xmlns:ns1="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${OFFICE_ALLY_CONFIG.senderID}</SenderID>
<ReceiverID>${OFFICE_ALLY_CONFIG.receiverID}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>
<![CDATA[${x12Payload}]]>
</Payload>
</ns1:COREEnvelopeRealTimeRequest>
</soapenv:Body>
</soapenv:Envelope>`;
}

// Parse 999 error details
function parse999(x12) {
    const segs = x12.split('~');
    const errs = [];
    for (const s of segs) {
        if (s.startsWith('IK3*') || s.startsWith('AK3*')) errs.push(`SEGMENT ERROR: ${s}`);
        if (s.startsWith('IK4*') || s.startsWith('AK4*')) errs.push(`ELEMENT ERROR: ${s}`);
        if (s.startsWith('IK5*') || s.startsWith('AK5*')) errs.push(`TXN SET ACK: ${s}`);
        if (s.startsWith('AK9*')) errs.push(`FUNCTIONAL GROUP ACK: ${s}`);
        if (s.startsWith('AAA*')) errs.push(`APPLICATION ERROR: ${s}`);
    }
    return errs;
}

// Parse X12 271 response for any payer
function parseEligibilityResponse(x12_271, payerName) {
    try {
        const result = {
            enrolled: false,
            program: '',
            payer: payerName,
            responseTime: 0,
            error: '',
            copayInfo: null,
            x12Details: null
        };

        // Check for X12 271 transaction
        if (!x12_271.includes('ST*271*')) {
            // Check if it's a 999 error response
            if (x12_271.includes('999')) {
                const errorDetails = parse999(x12_271);
                result.error = 'X12 999 validation error';
                result.x12Details = {
                    responseType: '999',
                    errorDetails: errorDetails,
                    rawResponse: x12_271.substring(0, 300) + '...'
                };
                console.log('🔍 999 ERROR DETAILS:');
                if (errorDetails.length > 0) {
                    errorDetails.forEach(err => console.log('   ' + err));
                } else {
                    console.log('   No specific error segments found');
                }
                return result;
            } else {
                result.error = 'Invalid X12 271 response format';
                return result;
            }
        }

        // Parse eligibility benefits (EB segments)
        const ebSegments = x12_271.match(/EB\*([^~]*)/g) || [];
        
        if (ebSegments.length > 0) {
            result.enrolled = true;
            result.program = payerName;
            
            // Enhanced parsing for specific payer types
            if (payerName === 'UTAH MEDICAID') {
                if (x12_271.includes('TARGETED ADULT MEDICAID')) {
                    result.program = 'Utah Medicaid - Targeted Adult';
                } else if (x12_271.includes('MENTAL HEALTH')) {
                    result.program = 'Utah Medicaid - Mental Health';
                }
            } else if (payerName.includes('AETNA')) {
                // Parse Aetna specific information
                if (x12_271.includes('HMO')) {
                    result.program = 'Aetna HMO';
                } else if (x12_271.includes('PPO')) {
                    result.program = 'Aetna PPO';
                } else if (x12_271.includes('POS')) {
                    result.program = 'Aetna POS';
                }
                
                // Look for copay information in EB segments
                result.copayInfo = parseCopayInformation(x12_271);
            }
            
        } else {
            // Check for AAA rejection messages
            const aaaSegments = x12_271.match(/AAA\*([^~]*)/g) || [];
            if (aaaSegments.length > 0) {
                result.enrolled = false;
                result.error = `No active ${payerName} coverage found`;
            } else {
                result.enrolled = false;
                result.error = 'Unable to determine eligibility status';
            }
        }

        return result;
    } catch (error) {
        console.error('X12 271 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            payer: payerName,
            responseTime: 0
        };
    }
}

// Comprehensive X12 271 benefit parser that extracts all available information
function parseCopayInformation(x12_271) {
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
        // Basic copay information
        copays: {},
        coinsurance: {},
        deductibles: {},
        outOfPocketLimits: {},
        
        // Detailed service coverage
        serviceCoverage: [],
        
        // Messages and additional info
        messages: [],
        
        // Raw benefit details for debugging
        rawBenefits: [],
        
        // Summary flags
        hasCopayInfo: false,
        hasCoinsuranceInfo: false,
        hasDeductibleInfo: false,
        
        // Legacy fields for backwards compatibility
        officeCopay: null,
        specialistCopay: null,
        emergencyCopay: null,
        urgentCareCopay: null,
        deductible: null,
        outOfPocketMax: null,
        coinsurance: null,
        details: []
    };
    
    try {
        console.log('\n🔍 COMPREHENSIVE X12 271 BENEFIT PARSER');
        console.log('=======================================');
        
        // Split into segments for analysis
        const segments = x12_271.split(/[~\n]/);
        
        let currentServiceGroup = null;
        
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
                            
                            // Set legacy fields for backwards compatibility
                            switch (serviceType) {
                                case '1':
                                case '98':
                                    benefitInfo.officeCopay = amount;
                                    break;
                                case '86':
                                    benefitInfo.emergencyCopay = amount;
                                    break;
                                case 'UC':
                                    benefitInfo.urgentCareCopay = amount;
                                    break;
                            }
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
                            
                            // Set legacy field
                            if (serviceType === '30') {
                                benefitInfo.deductible = amount;
                            }
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
                            
                            // Set legacy field
                            if (serviceType === '30') {
                                benefitInfo.outOfPocketMax = amount;
                            }
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
                        
                        // Set legacy field
                        if (benefit.serviceTypes.includes('30')) {
                            benefitInfo.coinsurance = percent;
                        }
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
                
                // Look for copay information in messages
                const copayMatch = message.match(/COPAY\s*\$?(\d+\.?\d*)/i);
                if (copayMatch) {
                    const amount = parseFloat(copayMatch[1]);
                    benefitInfo.details.push(`Message indicated copay: $${amount}`);
                    if (!benefitInfo.officeCopay) {
                        benefitInfo.officeCopay = amount;
                    }
                }
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
        
        // Build summary details for legacy compatibility
        Object.entries(benefitInfo.copays).forEach(([serviceType, copays]) => {
            copays.forEach(copay => {
                benefitInfo.details.push(`${copay.description} Copay: $${copay.amount}`);
            });
        });
        
        Object.entries(benefitInfo.coinsurance).forEach(([serviceType, coinsurances]) => {
            coinsurances.forEach(coins => {
                benefitInfo.details.push(`${coins.description} Coinsurance: ${coins.percentage}%`);
            });
        });
        
        Object.entries(benefitInfo.deductibles).forEach(([serviceType, deductibles]) => {
            deductibles.forEach(ded => {
                benefitInfo.details.push(`${ded.description} Deductible (${ded.timeDescription}): $${ded.amount}`);
            });
        });
        
        Object.entries(benefitInfo.outOfPocketLimits).forEach(([serviceType, limits]) => {
            limits.forEach(limit => {
                benefitInfo.details.push(`${limit.description} Out of Pocket Max (${limit.timeDescription}): $${limit.amount}`);
            });
        });
        
        // Log comprehensive results
        console.log('\n💰 COMPREHENSIVE BENEFIT EXTRACTION RESULTS:');
        console.log('============================================');
        
        if (Object.keys(benefitInfo.copays).length > 0) {
            console.log('📋 COPAYS:');
            Object.entries(benefitInfo.copays).forEach(([serviceType, copays]) => {
                copays.forEach(copay => {
                    console.log(`   ${copay.description}: $${copay.amount}`);
                });
            });
        }
        
        if (Object.keys(benefitInfo.coinsurance).length > 0) {
            console.log('📋 COINSURANCE:');
            Object.entries(benefitInfo.coinsurance).forEach(([serviceType, coinsurances]) => {
                coinsurances.forEach(coins => {
                    console.log(`   ${coins.description}: ${coins.percentage}%`);
                });
            });
        }
        
        if (Object.keys(benefitInfo.deductibles).length > 0) {
            console.log('📋 DEDUCTIBLES:');
            Object.entries(benefitInfo.deductibles).forEach(([serviceType, deductibles]) => {
                deductibles.forEach(ded => {
                    console.log(`   ${ded.description} (${ded.timeDescription}): $${ded.amount}`);
                });
            });
        }
        
        if (Object.keys(benefitInfo.outOfPocketLimits).length > 0) {
            console.log('📋 OUT OF POCKET LIMITS:');
            Object.entries(benefitInfo.outOfPocketLimits).forEach(([serviceType, limits]) => {
                limits.forEach(limit => {
                    console.log(`   ${limit.description} (${limit.timeDescription}): $${limit.amount}`);
                });
            });
        }
        
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
        
        console.log(`📊 SUMMARY: Found ${benefitInfo.rawBenefits.length} benefit segments`);
        console.log(`   Copay Info: ${benefitInfo.hasCopayInfo ? 'YES' : 'NO'}`);
        console.log(`   Coinsurance Info: ${benefitInfo.hasCoinsuranceInfo ? 'YES' : 'NO'}`);
        console.log(`   Deductible Info: ${benefitInfo.hasDeductibleInfo ? 'YES' : 'NO'}`);
        console.log('============================================\n');
        
    } catch (error) {
        console.error('❌ Error parsing comprehensive benefit information:', error);
    }
    
    // Return benefit info if we found any useful data
    const hasData = benefitInfo.rawBenefits.length > 0 || 
                   benefitInfo.hasCopayInfo || 
                   benefitInfo.hasCoinsuranceInfo || 
                   benefitInfo.hasDeductibleInfo;
    
    return hasData ? benefitInfo : null;
}

// Check eligibility for any payer
async function checkUniversalEligibility(patient, payerType) {
    const fetch = (await import('node-fetch')).default;
    
    const payerConfig = PAYER_CONFIGS[payerType];
    if (!payerConfig) {
        throw new Error(`Unsupported payer type: ${payerType}. Supported: ${Object.keys(PAYER_CONFIGS).join(', ')}`);
    }
    
    const x12_270 = generateX12_270(patient, payerConfig);
    const soapRequest = generateSOAPRequest(x12_270);
    
    console.log(`🔍 Checking ${payerConfig.payerName} eligibility: ${patient.first} ${patient.last} (${patient.dob})`);
    console.log(`📋 Payer ID: ${payerConfig.payerId}`);
    
    const startTime = Date.now();
    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });
    
    const responseTime = Date.now() - startTime;
    const soapResponse = await response.text();
    
    // Parse X12 271 response
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
    
    if (!payloadMatch) {
        throw new Error('No payload found in SOAP response');
    }
    
    const x12_271 = payloadMatch[1].trim();
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📨 Response Type: ${x12_271.includes('X12_271_Response') ? 'X12 271 ✅' : 'X12 999 ❌'}`);
    
    const result = parseEligibilityResponse(x12_271, payerConfig.payerName);
    result.responseTime = responseTime;
    
    if (result.enrolled) {
        console.log(`✅ ENROLLED: ${result.program}`);
        if (result.copayInfo) {
            console.log(`💰 Copay Info:`, JSON.stringify(result.copayInfo, null, 2));
        }
    } else {
        console.log(`❌ NOT ENROLLED: ${result.error}`);
    }
    
    // Save raw X12 271 for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const patientName = `${patient.first.replace(/\s+/g, '_')}_${patient.last.replace(/\s+/g, '_')}`;
    const filename = `raw_x12_271_${patientName}_${payerType}_${timestamp}.txt`;
    
    const fs = require('fs').promises;
    fs.writeFile(filename, x12_271).catch(err => 
        console.log('Note: Could not save X12 271 file:', err.message)
    );
    
    return result;
}

// Command line usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log('Universal Eligibility Checker');
        console.log('Usage: node universal-eligibility-checker.js <first> <last> <dob> <payer>');
        console.log('');
        console.log('Supported Payers:');
        Object.keys(PAYER_CONFIGS).forEach(payer => {
            console.log(`  ${payer} - ${PAYER_CONFIGS[payer].payerName} (${PAYER_CONFIGS[payer].payerId})`);
        });
        console.log('');
        console.log('Examples:');
        console.log('  node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID');
        console.log('  node universal-eligibility-checker.js John Doe 1990-01-15 AETNA');
        console.log('  node universal-eligibility-checker.js Jane Smith 1985-12-25 AETNA_BETTER_HEALTH');
        process.exit(1);
    }
    
    const patient = {
        first: args[0],
        last: args[1],
        dob: args[2],
        gender: args[4] || 'U'
    };
    
    const payerType = args[3].toUpperCase();
    
    try {
        const result = await checkUniversalEligibility(patient, payerType);
        console.log('\n📊 FINAL RESULT:', JSON.stringify(result, null, 2));
        
        if (result.enrolled) {
            console.log(`\n🎉 SUCCESS: Patient is enrolled in ${result.program}!`);
            process.exit(0);
        } else {
            console.log('\n⚠️  Patient is not enrolled or coverage not found');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} else {
    module.exports = { checkUniversalEligibility, PAYER_CONFIGS };
}