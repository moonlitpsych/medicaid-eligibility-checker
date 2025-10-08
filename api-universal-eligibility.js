/**
 * Universal Eligibility API - Enhanced Backend
 * 
 * This module provides the enhanced backend API for checking eligibility
 * across multiple payers with different X12 270 format requirements.
 * 
 * IMPORTANT: This is a NEW API endpoint that doesn't modify the existing
 * working services (api-server.js). It uses the payer config library
 * to generate the appropriate X12 270 format for each payer.
 */

require('dotenv').config({ path: '.env.local' });
const { 
    PAYER_CONFIGS, 
    PROVIDER_CONFIGS, 
    getPayerConfig, 
    getPreferredProvider 
} = require('./payer-config-library');

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680'
};

/**
 * Generate UUID for PayloadID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate X12 270 request for any payer using their specific requirements
 * @param {Object} patient - Patient data
 * @param {string} payerId - Payer ID from PAYER_CONFIGS
 * @returns {string} - Formatted X12 270 string
 */
function generateUniversalX12_270(patient, payerId) {
    const payerConfig = getPayerConfig(payerId);
    if (!payerConfig) {
        throw new Error(`Unsupported payer: ${payerId}`);
    }
    
    const providerInfo = getPreferredProvider(payerId);
    if (!providerInfo) {
        throw new Error(`No provider configuration found for payer: ${payerId}`);
    }
    
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);

    // Use LOCAL time for dates (not UTC) to avoid "future date" errors
    // When it's Oct 7 @ 6pm Mountain Time, UTC shows Oct 8 which payers reject
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const yymmdd = `${String(year).slice(2)}${month}${day}`;
    const hhmm = `${hours}${minutes}`;
    const ccyymmdd = `${year}${month}${day}`;
    const dob = (patient.dateOfBirth || '').replace(/-/g,'');

    // Pad ISA fields to 15 characters
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15(OFFICE_ALLY_CONFIG.senderID);
    const ISA08 = pad15(OFFICE_ALLY_CONFIG.receiverID);

    const seg = [];

    // ISA - Interchange Control Header
    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    
    // GS - Functional Group Header
    seg.push(`GS*HS*${OFFICE_ALLY_CONFIG.senderID}*${OFFICE_ALLY_CONFIG.receiverID}*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    
    // ST - Transaction Set Header
    seg.push(`ST*270*0001*005010X279A1`);
    
    // BHT - Beginning of Hierarchical Transaction
    seg.push(`BHT*0022*13*${providerInfo.name.replace(/\s/g, '')}-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Information Source (Payer)
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*${payerConfig.payerName}*****PI*${payerConfig.officeAllyPayerId}`);

    // 2100B: Information Receiver (Provider)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*${providerInfo.name}*****XX*${providerInfo.npi}`);

    // 2100C: Subscriber (Patient)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${providerInfo.npi}*ELIGIBILITY`);
    
    // NM1 - Patient Name segment with payer-specific requirements
    let nm1Segment = `NM1*IL*1*${(patient.lastName||'').toUpperCase()}*${(patient.firstName||'').toUpperCase()}`;
    
    // Add member ID if provided and supported by payer
    if (patient.memberNumber && payerConfig.x12Specifics.supportsMemberIdInNM1) {
        nm1Segment += `****MI*${patient.memberNumber}`;
    } else if (patient.medicaidId && payerConfig.x12Specifics.supportsMemberIdInNM1 && payerId.includes('MEDICAID')) {
        nm1Segment += `****MI*${patient.medicaidId}`;
    }
    
    seg.push(nm1Segment);
    
    // DMG - Demographics segment
    let dmgSegment = `DMG*D8*${dob}`;
    if (payerConfig.x12Specifics.requiresGenderInDMG && patient.gender) {
        const validGender = patient.gender.toUpperCase();
        if (['M', 'F'].includes(validGender)) {
            dmgSegment += `*${validGender}`;
        }
    }
    seg.push(dmgSegment);
    
    // DTP - Date segment with payer-specific format
    const dtpFormat = payerConfig.x12Specifics.dtpFormat || 'D8';
    if (dtpFormat === 'RD8') {
        // Range date format (used by Utah Medicaid)
        seg.push(`DTP*291*RD8*${ccyymmdd}-${ccyymmdd}`);
    } else {
        // Single date format (used by most commercial payers)
        seg.push(`DTP*291*D8*${ccyymmdd}`);
    }
    
    // EQ - Eligibility or Benefit Inquiry
    seg.push(`EQ*30`); // 30 = Health Benefit Plan Coverage

    // SE - Transaction Set Trailer
    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    
    // GE - Functional Group Trailer
    seg.push(`GE*1*${ctrl}`);
    
    // IEA - Interchange Control Trailer
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

/**
 * Generate SOAP envelope for Office Ally with any X12 270 payload
 */
function generateOfficeAllySOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = generateUUID();
    
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

/**
 * Send SOAP request to Office Ally
 */
async function sendOfficeAllyRequest(soapRequest) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });

    if (!response.ok) {
        throw new Error(`Office Ally API error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
}

/**
 * Parse Office Ally SOAP response to extract X12 271
 */
function parseOfficeAllySOAPResponse(soapResponse) {
    const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                         soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                         soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
    
    if (!payloadMatch) {
        console.log('🔍 Office Ally SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
        throw new Error('No payload found in Office Ally SOAP response');
    }
    
    return payloadMatch[1].trim();
}

/**
 * Parse X12 999 error details
 */
function parse999Errors(x12Data) {
    const segments = x12Data.split('~');
    const errors = [];
    
    for (const segment of segments) {
        if (segment.startsWith('IK3*') || segment.startsWith('AK3*')) {
            errors.push(`SEGMENT ERROR: ${segment}`);
        }
        if (segment.startsWith('IK4*') || segment.startsWith('AK4*')) {
            errors.push(`ELEMENT ERROR: ${segment}`);
        }
        if (segment.startsWith('IK5*') || segment.startsWith('AK5*')) {
            errors.push(`TRANSACTION SET ACK: ${segment}`);
        }
        if (segment.startsWith('AK9*')) {
            errors.push(`FUNCTIONAL GROUP ACK: ${segment}`);
        }
        if (segment.startsWith('AAA*')) {
            errors.push(`APPLICATION ERROR: ${segment}`);
        }
    }
    
    return errors;
}

/**
 * Parse X12 271 response with payer-specific logic
 */
function parseUniversalX12_271(x12Data, payerId) {
    const payerConfig = getPayerConfig(payerId);
    const result = {
        enrolled: false,
        program: '',
        planType: '',
        payer: payerConfig ? payerConfig.displayName : payerId,
        error: '',
        details: '',
        copayInfo: null,
        responseTime: 0,
        x12Details: {
            responseType: '',
            segments: [],
            rawResponse: x12Data.substring(0, 500) + (x12Data.length > 500 ? '...' : '')
        }
    };

    // Check for X12 271 vs 999 response
    if (x12Data.includes('ST*271*')) {
        result.x12Details.responseType = '271';
        console.log('✅ Received X12 271 eligibility response');
        
        const segments = x12Data.split('~').filter(seg => seg.trim());
        
        // Parse eligibility benefits (EB segments)
        const ebSegments = segments.filter(seg => seg.startsWith('EB*'));
        
        if (ebSegments.length > 0) {
            result.enrolled = true;
            
            // Payer-specific parsing
            if (payerId === 'UTAH_MEDICAID') {
                parseUtahMedicaidResponse(x12Data, result);
            } else if (payerId === 'AETNA') {
                parseAetnaResponse(x12Data, result);
            } else {
                parseGenericCommercialResponse(x12Data, result, payerConfig);
            }
        } else {
            // Check for AAA rejection segments
            const aaaSegments = segments.filter(seg => seg.startsWith('AAA*'));
            result.enrolled = false;
            result.error = aaaSegments.length > 0 ? 
                `No active coverage found with ${payerConfig.displayName}` : 
                'Unable to determine eligibility status';
        }
    } else if (x12Data.includes('999') || x12Data.includes('ST*999*')) {
        result.x12Details.responseType = '999';
        result.enrolled = false;
        result.error = 'X12 format validation error';
        
        const errorDetails = parse999Errors(x12Data);
        result.x12Details.errorDetails = errorDetails;
        
        console.log('❌ Received X12 999 validation error:');
        errorDetails.forEach(err => console.log('   ' + err));
    } else {
        result.error = 'Invalid response format from Office Ally';
        console.log('❌ Unknown response format received');
    }

    return result;
}

/**
 * Utah Medicaid specific parsing
 */
function parseUtahMedicaidResponse(x12Data, result) {
    if (x12Data.includes('TARGETED ADULT MEDICAID')) {
        result.program = 'Utah Medicaid - Targeted Adult (Traditional FFS)';
        result.planType = 'Traditional Fee-for-Service';
        result.details = 'Active traditional Medicaid coverage - eligible for CM Program';
    } else if (x12Data.includes('MENTAL HEALTH')) {
        result.program = 'Utah Medicaid - Mental Health Services';
        result.planType = 'Mental Health Carve-Out';
        result.details = 'Mental health services covered under traditional Medicaid FFS';
    } else {
        result.program = 'Utah Medicaid';
        result.planType = 'Traditional FFS';
        result.details = 'Active Utah Medicaid coverage';
    }
}

/**
 * Aetna specific parsing with copay extraction
 */
function parseAetnaResponse(x12Data, result) {
    // Determine plan type
    if (x12Data.includes('HMO')) {
        result.planType = 'HMO';
    } else if (x12Data.includes('PPO')) {
        result.planType = 'PPO';
    } else if (x12Data.includes('POS')) {
        result.planType = 'POS';
    } else {
        result.planType = 'Commercial';
    }
    
    result.program = `Aetna ${result.planType}`;
    
    // Extract copay information from EB segments
    const copayInfo = extractAetnaCopayInfo(x12Data);
    if (copayInfo) {
        result.copayInfo = copayInfo;
        result.details = 'Active Aetna coverage with copay information available';
    } else {
        result.details = 'Active Aetna coverage';
    }
}

/**
 * Generic commercial payer parsing
 */
function parseGenericCommercialResponse(x12Data, result, payerConfig) {
    result.program = payerConfig.displayName;
    result.planType = 'Commercial';
    result.details = `Active coverage with ${payerConfig.displayName}`;
}

/**
 * Extract copay information from Aetna X12 271 responses
 */
function extractAetnaCopayInfo(x12Data) {
    const copayInfo = {};
    const segments = x12Data.split('~');
    
    // Look for EB segments with copay amounts
    // This is a simplified implementation - actual parsing would be more complex
    segments.forEach(segment => {
        if (segment.startsWith('EB*')) {
            const parts = segment.split('*');
            // Look for monetary amounts in EB segments
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] && /^\d+\.\d{2}$/.test(parts[i])) {
                    const amount = parseFloat(parts[i]);
                    
                    // Assign copays based on position and context
                    if (!copayInfo.officeCopay && amount > 0 && amount < 100) {
                        copayInfo.officeCopay = amount;
                    } else if (!copayInfo.specialistCopay && amount > copayInfo.officeCopay) {
                        copayInfo.specialistCopay = amount;
                    } else if (!copayInfo.emergencyCopay && amount > 100) {
                        copayInfo.emergencyCopay = amount;
                    }
                }
            }
        }
    });
    
    return Object.keys(copayInfo).length > 0 ? copayInfo : null;
}

/**
 * Main eligibility checking function
 */
async function checkUniversalEligibility(patientData, payerId) {
    console.log(`🔍 Checking ${payerId} eligibility: ${patientData.firstName} ${patientData.lastName}`);
    
    const startTime = Date.now();
    
    try {
        // Validate payer
        const payerConfig = getPayerConfig(payerId);
        if (!payerConfig) {
            throw new Error(`Unsupported payer: ${payerId}`);
        }
        
        // Generate X12 270 with payer-specific formatting
        const x12_270 = generateUniversalX12_270(patientData, payerId);
        console.log(`📋 Generated ${payerId} X12 270 (${x12_270.length} chars)`);
        
        // Generate SOAP request
        const soapRequest = generateOfficeAllySOAPRequest(x12_270);
        
        // Send to Office Ally
        console.log('📡 Sending request to Office Ally...');
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        console.log('📨 Received response from Office Ally');
        
        // Parse response
        const x12_271 = parseOfficeAllySOAPResponse(soapResponse);
        const eligibilityResult = parseUniversalX12_271(x12_271, payerId);
        
        // Add response time
        eligibilityResult.responseTime = Date.now() - startTime;
        
        // Log raw responses for debugging
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const patientName = `${patientData.firstName}_${patientData.lastName}`.replace(/\s+/g, '_');
        
        const fs = require('fs').promises;
        try {
            await fs.writeFile(`raw_270_${payerId}_${patientName}_${timestamp}.txt`, x12_270);
            await fs.writeFile(`raw_271_${payerId}_${patientName}_${timestamp}.txt`, x12_271);
        } catch (fileError) {
            console.log('Note: Could not save debug files:', fileError.message);
        }
        
        console.log(`✅ ${payerId} eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        return eligibilityResult;
        
    } catch (error) {
        console.error(`❌ ${payerId} eligibility check failed:`, error);
        
        return {
            enrolled: false,
            error: `Unable to verify eligibility with ${payerId}: ${error.message}`,
            payer: payerId,
            responseTime: Date.now() - startTime,
            verified: false
        };
    }
}

module.exports = {
    checkUniversalEligibility,
    generateUniversalX12_270,
    parseUniversalX12_271,
    OFFICE_ALLY_CONFIG
};