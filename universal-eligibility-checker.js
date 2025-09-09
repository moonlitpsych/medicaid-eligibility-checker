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
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***',
    senderID: '1161680',
    receiverID: 'OFFALLY',
    providerNPI: '1275348807',
    providerName: 'MOONLIT PLLC'
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
    seg.push(`NM1*1P*2*${OFFICE_ALLY_CONFIG.providerName}*****XX*${OFFICE_ALLY_CONFIG.providerNPI}`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
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

// Parse X12 271 response for any payer
function parseEligibilityResponse(x12_271, payerName) {
    try {
        const result = {
            enrolled: false,
            program: '',
            payer: payerName,
            responseTime: 0,
            error: '',
            copayInfo: null
        };

        // Check for X12 271 transaction
        if (!x12_271.includes('ST*271*')) {
            result.error = 'Invalid X12 271 response format';
            return result;
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

// Parse copay information from Aetna responses
function parseCopayInformation(x12_271) {
    const copayInfo = {
        officeCopay: null,
        specialistCopay: null,
        emergencyCopay: null,
        urgentCareCopay: null
    };
    
    // Look for copay segments (example patterns)
    const copayPattern = /EB\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*(\d+\.\d{2})/g;
    let match;
    
    while ((match = copayPattern.exec(x12_271)) !== null) {
        const amount = parseFloat(match[1]);
        
        // This is a simplified example - actual parsing would need to check service codes
        if (!copayInfo.officeCopay) {
            copayInfo.officeCopay = amount;
        } else if (!copayInfo.specialistCopay) {
            copayInfo.specialistCopay = amount;
        }
    }
    
    return Object.values(copayInfo).some(v => v !== null) ? copayInfo : null;
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