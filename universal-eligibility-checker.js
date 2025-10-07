#!/usr/bin/env node

/**
 * Universal Eligibility Checker for Multiple Payers
 * Supports Utah Medicaid, Aetna, and other major payers
 * 
 * Usage: node universal-eligibility-checker.js <first> <last> <dob> <payer>
 * Example: node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 AETNA
 */

require('dotenv').config({ path: '.env.local' });

const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    senderID: process.env.OFFICE_ALLY_SENDER_ID,
    receiverID: process.env.OFFICE_ALLY_RECEIVER_ID || 'OFFALLY',
    providerNPI: process.env.PROVIDER_NPI,
    providerName: process.env.PROVIDER_NAME
};

// Validate credentials before running
if (!OFFICE_ALLY_CONFIG.username || !OFFICE_ALLY_CONFIG.password || !OFFICE_ALLY_CONFIG.senderID) {
    console.error('❌ ERROR: Missing Office Ally credentials!');
    console.error('   Please set the following in .env.local:');
    console.error('   - OFFICE_ALLY_USERNAME');
    console.error('   - OFFICE_ALLY_PASSWORD');
    console.error('   - OFFICE_ALLY_SENDER_ID');
    console.error('   - PROVIDER_NPI');
    console.error('   - PROVIDER_NAME');
    console.error('\n   See .env.example for template.');
    process.exit(1);
}

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
        payerId: 'UTMCD'
    },
    'AETNA': {
        payerName: 'AETNA',
        payerId: AETNA_PAYER_IDS.AETNA
    },
    'AETNA_BETTER_HEALTH': {
        payerName: 'AETNA BETTER HEALTH',
        payerId: AETNA_PAYER_IDS.AETNA_BETTER_HEALTH
    },
    // Add more as needed
};

// Generate X12 270 for any payer using working format
function generateX12_270(patient, payerConfig) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);

    // Use LOCAL date instead of UTC to avoid timezone issues
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const yymmdd = year.slice(2) + month + day;
    const hhmm = hours + minutes;
    const ccyymmdd = year + month + day;
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
    seg.push(`NM1*1P*2*${OFFICE_ALLY_CONFIG.providerName}*****XX*${OFFICE_ALLY_CONFIG.providerNPI}`);

    // 2100C: Subscriber (Name/DOB, with optional Member ID for commercial payers)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY`);

    // Include Member ID if provided (required for Aetna, not needed for Medicaid)
    if (patient.memberId) {
        seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}****MI*${patient.memberId}`);
    } else {
        seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    }

    seg.push(`DMG*D8*${dob}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`);

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
            planType: '',
            managedCareOrg: null,
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

        // CHECK AAA REJECTION CODES FIRST (before checking EB segments)
        const aaaSegments = x12_271.match(/AAA\*([^~]*)/g) || [];
        const msgSegments = x12_271.match(/MSG\*([^~]*)/g) || [];

        if (aaaSegments.length > 0) {
            // Parse rejection code
            const aaaContent = aaaSegments[0];
            const msgContent = msgSegments.length > 0 ? msgSegments[0].replace('MSG*', '') : '';

            if (aaaContent.includes('AAA*N')) {
                result.enrolled = false;
                result.error = msgContent || 'Patient not found or not eligible';
                console.log(`❌ AAA Rejection: ${aaaContent} - ${msgContent}`);
                return result;
            }
        }

        // Parse eligibility benefits (EB segments)
        const ebSegments = x12_271.match(/EB\*([^~]*)/g) || [];

        // Check for ACTIVE eligibility (EB*1* means active coverage)
        const activeEB = ebSegments.filter(seg => seg.includes('EB*1*'));

        if (activeEB.length > 0) {
            result.enrolled = true;

            // Extract program name from EB segments (format: EB*1*IND*30*MC*PROGRAM NAME)
            const programMatch = x12_271.match(/EB\*1\*[^*]*\*[^*]*\*[^*]*\*([^~*]+)/);
            if (programMatch && programMatch[1]) {
                result.program = programMatch[1].trim();
            } else {
                result.program = payerName;
            }

            // Enhanced parsing for Utah Medicaid
            if (payerName === 'UTAH MEDICAID') {
                // Check for managed care indicators
                if (x12_271.includes('SELECTHEALTH') || x12_271.includes('SELECT HEALTH')) {
                    result.managedCareOrg = 'SelectHealth';
                    result.planType = 'Managed Care (HMO)';
                } else if (x12_271.includes('MOLINA')) {
                    result.managedCareOrg = 'Molina Healthcare';
                    result.planType = 'Managed Care (HMO)';
                } else if (x12_271.includes('OPTUM') || x12_271.includes('UNITED')) {
                    result.managedCareOrg = 'Optum/UnitedHealthcare';
                    result.planType = 'Managed Care (PMHP)';
                } else if (x12_271.includes('TARGETED ADULT MEDICAID')) {
                    result.program = 'Targeted Adult Medicaid';
                    result.planType = 'Traditional Fee-for-Service';
                } else {
                    // Default to FFS if no managed care detected
                    result.planType = 'Traditional Fee-for-Service';
                }

                // Look for copay information in EB segments
                result.copayInfo = parseMedicaidCopayInfo(x12_271);

            } else if (payerName.includes('AETNA')) {
                // Parse Aetna specific information
                if (x12_271.includes('HMO')) {
                    result.planType = 'HMO';
                } else if (x12_271.includes('PPO')) {
                    result.planType = 'PPO';
                } else if (x12_271.includes('POS')) {
                    result.planType = 'POS';
                }

                // Look for copay information in EB segments
                result.copayInfo = parseCopayInformation(x12_271);
            }

        } else {
            result.enrolled = false;
            result.error = `No active ${payerName} coverage found`;
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

// Parse copay information from Medicaid responses
function parseMedicaidCopayInfo(x12_271) {
    const copayInfo = {
        mentalHealthInpatient: null,
        mentalHealthOutpatient: null,
        substanceUse: null,
        coinsurance: null,
        deductible: null
    };

    // Parse copay (EB*A) segments
    const copayMatches = x12_271.match(/EB\*A\*[^*]*\*[^*]*\*[^*]*\*([^*]*)\*[^*]*\*[^*]*\*(\d+)/g);
    if (copayMatches) {
        copayMatches.forEach(match => {
            const amountMatch = match.match(/\*(\d+)$/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1]);
                if (match.includes('MENTAL HEALTH INPATIENT')) {
                    copayInfo.mentalHealthInpatient = amount;
                } else if (match.includes('MENTAL HEALTH OUTPATIENT')) {
                    copayInfo.mentalHealthOutpatient = amount;
                } else if (match.includes('SUBSTANCE')) {
                    copayInfo.substanceUse = amount;
                }
            }
        });
    }

    // Parse coinsurance (EB*B) segments
    const coinsuranceMatch = x12_271.match(/EB\*B\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*(\d+)/);
    if (coinsuranceMatch) {
        copayInfo.coinsurance = parseFloat(coinsuranceMatch[1]);
    }

    // Parse deductible (EB*C) segments
    const deductibleMatch = x12_271.match(/EB\*C\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*(\d+)/);
    if (deductibleMatch) {
        copayInfo.deductible = parseFloat(deductibleMatch[1]);
    }

    return Object.values(copayInfo).some(v => v !== null) ? copayInfo : null;
}

// Parse copay information from commercial payer responses (Aetna, etc.)
function parseCopayInformation(x12_271) {
    const financialInfo = {
        // Deductible information
        deductibleTotal: null,
        deductibleRemaining: null,
        deductibleMet: null,

        // Out-of-pocket maximum
        oopMaxTotal: null,
        oopMaxRemaining: null,
        oopMaxMet: null,

        // Copays by service type
        primaryCareCopay: null,
        specialistCopay: null,
        emergencyCopay: null,
        urgentCareCopay: null,

        // Coinsurance percentages
        primaryCareCoinsurance: null,
        specialistCoinsurance: null
    };

    const segments = x12_271.split('~');

    for (const segment of segments) {
        if (!segment.startsWith('EB*')) continue;

        const parts = segment.split('*');
        const benefitType = parts[1]; // A=copay, B=coinsurance, C=deductible, G=OOP max
        const serviceType = parts[3]; // 98=office visit, UC=urgent care, 86=emergency, etc.
        const timePeriodQualifier = parts[5]; // 23=total/annual, 29=remaining
        const percentageAmount = parts[6]; // Percentage for coinsurance
        const monetaryAmount = parts[7]; // Dollar amount

        // Parse DEDUCTIBLE (EB*C)
        if (benefitType === 'C' && monetaryAmount) {
            const amount = parseFloat(monetaryAmount);
            if (timePeriodQualifier === '23') {
                // Total annual deductible
                financialInfo.deductibleTotal = amount;
            } else if (timePeriodQualifier === '29') {
                // Remaining deductible
                financialInfo.deductibleRemaining = amount;
                // Calculate met amount if we have total
                if (financialInfo.deductibleTotal) {
                    financialInfo.deductibleMet = financialInfo.deductibleTotal - amount;
                }
            }
        }

        // Parse OUT-OF-POCKET MAX (EB*G)
        if (benefitType === 'G' && monetaryAmount) {
            const amount = parseFloat(monetaryAmount);
            if (timePeriodQualifier === '23') {
                // Total annual OOP max
                financialInfo.oopMaxTotal = amount;
            } else if (timePeriodQualifier === '29') {
                // Remaining OOP max
                financialInfo.oopMaxRemaining = amount;
                // Calculate met amount if we have total
                if (financialInfo.oopMaxTotal) {
                    financialInfo.oopMaxMet = financialInfo.oopMaxTotal - amount;
                }
            }
        }

        // Parse COPAY (EB*A)
        if (benefitType === 'A' && monetaryAmount) {
            const amount = parseFloat(monetaryAmount);

            if (serviceType === '98') {
                // Primary care/office visit
                if (!financialInfo.primaryCareCopay) {
                    financialInfo.primaryCareCopay = amount;
                }
            } else if (serviceType.includes('UC')) {
                // Urgent care
                financialInfo.urgentCareCopay = amount;
            } else if (serviceType === '86') {
                // Emergency
                financialInfo.emergencyCopay = amount;
            }
        }

        // Parse COINSURANCE (EB*B)
        if (benefitType === 'B' && percentageAmount) {
            const percentage = parseFloat(percentageAmount);

            if (serviceType === '98') {
                // Primary care/office visit coinsurance
                if (!financialInfo.primaryCareCoinsurance) {
                    financialInfo.primaryCareCoinsurance = percentage;
                }
            }
        }
    }

    // Return null if no financial info found
    return Object.values(financialInfo).some(v => v !== null) ? financialInfo : null;
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