// routes/eligibility.js - Express route for eligibility checking
const { pool } = require('../api/_db');

// Provider Configuration - Office Ally or UHIN based on environment
function getEligibilityProvider() {
    return process.env.ELIGIBILITY_PROVIDER || 'office_ally';
}

// OFFICE ALLY CONFIG
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    receiverID: 'OFFALLY',
    senderID: '1161680', 
    username: 'moonlit',
    password: '***REDACTED-OLD-OA-PASSWORD***',
    providerNPI: process.env.PROVIDER_NPI || '1275348807',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC',
    isa06: '1161680',
    isa08: 'OFFALLY', 
    gs02: '1161680', 
    gs03: 'OFFALLY'
};

// Payer configurations for different insurance companies
const PAYER_CONFIGS = {
    // Utah Medicaid (default) - corrected based on working X12 271 response
    'UTMCD': { name: 'MEDICAID UTAH', displayName: 'Utah Medicaid' },
    'SKUT0': { name: 'MEDICAID UTAH', displayName: 'Utah Medicaid' },
    
    // Aetna configurations (from Office Ally official list)
    '60054': { name: 'AETNA HEALTHCARE', displayName: 'Aetna Healthcare' },
    'AETNA-LTC': { name: 'AETNA LONG TERM CARE', displayName: 'Aetna Long Term Care' },
    'AETNA-RETIREE': { name: 'AETNA RETIREE MEDICAL', displayName: 'Aetna Retiree Medical Plan' },
    'AETNA-USHC': { name: 'AETNA US HEALTHCARE', displayName: 'Aetna US Healthcare' },
    
    // Aetna Better Health state variants
    'ABH-CA': { name: 'AETNA BETTER HEALTH CA', displayName: 'Aetna Better Health California' },
    'ABH-FL': { name: 'AETNA BETTER HEALTH FL', displayName: 'Aetna Better Health Florida' },
    'ABH-IL': { name: 'AETNA BETTER HEALTH IL', displayName: 'Aetna Better Health Illinois' },
    'ABH-KS': { name: 'AETNA BETTER HEALTH KS', displayName: 'Aetna Better Health Kansas' },
    'ABH-KY': { name: 'AETNA BETTER HEALTH KY', displayName: 'Aetna Better Health Kentucky' },
    'ABH-LA': { name: 'AETNA BETTER HEALTH LA', displayName: 'Aetna Better Health Louisiana' },
    'ABH-MD': { name: 'AETNA BETTER HEALTH MD', displayName: 'Aetna Better Health Maryland' },
    'ABH-MI': { name: 'AETNA BETTER HEALTH MI', displayName: 'Aetna Better Health Michigan' },
    'ABH-NV': { name: 'AETNA BETTER HEALTH NV', displayName: 'Aetna Better Health Nevada' },
    'ABH-NJ': { name: 'AETNA BETTER HEALTH NJ', displayName: 'Aetna Better Health New Jersey' },
    'ABH-NY': { name: 'AETNA BETTER HEALTH NY', displayName: 'Aetna Better Health New York' },
    'ABH-OH': { name: 'AETNA BETTER HEALTH OH', displayName: 'Aetna Better Health Ohio' },
    'ABH-OK': { name: 'AETNA BETTER HEALTH OK', displayName: 'Aetna Better Health Oklahoma' },
    'ABH-PA': { name: 'AETNA BETTER HEALTH PA', displayName: 'Aetna Better Health Pennsylvania' },
    'ABH-TX': { name: 'AETNA BETTER HEALTH TX', displayName: 'Aetna Better Health Texas' },
    'ABH-VA': { name: 'AETNA BETTER HEALTH VA', displayName: 'Aetna Better Health Virginia' },
    'ABH-WV': { name: 'AETNA BETTER HEALTH WV', displayName: 'Aetna Better Health West Virginia' }
};

// Generate X12 270 for Office Ally with dynamic payer support
function generateOfficeAllyX12_270(patient, payerId = 'UTMCD') {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');
    const fullDateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');

    const trackingRef1 = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000000)}`;
    const trackingRef2 = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100000)}`;
    
    // Get payer configuration
    const payerConfig = PAYER_CONFIGS[payerId] || PAYER_CONFIGS['UTMCD'];
    const payerName = payerConfig.name;
    
    // Fix payer ID mapping based on Office Ally Companion Guide
    let actualPayerId = payerId;
    if (payerId === 'SKUT0' || payerId === 'UTMCD') {
        actualPayerId = 'UTMCD'; // Use correct Utah Medicaid payer ID
    }

    // WORKING FORMAT: Based on test-office-ally-final.js (Jeremy Montoya successful test)
    // Key: No SSN/Member ID, single TRN, DTP date segment, ST=0001
    return `ISA*00*          *00*          *ZZ*${OFFICE_ALLY_CONFIG.isa06.padEnd(15)}*01*${OFFICE_ALLY_CONFIG.isa08.padEnd(15)}*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~GS*HS*${OFFICE_ALLY_CONFIG.gs02}*${OFFICE_ALLY_CONFIG.gs03}*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X279A1~ST*270*0001*005010X279A1~BHT*0022*13*MOONLIT-${controlNumber}*${fullDateStr}*${timeStr}~HL*1**20*1~NM1*PR*2*${payerName}*****PI*${actualPayerId}~HL*2*1*21*1~NM1*1P*2*${OFFICE_ALLY_CONFIG.providerName}*****XX*${OFFICE_ALLY_CONFIG.providerNPI}~HL*3*2*22*0~TRN*1*${controlNumber}*${OFFICE_ALLY_CONFIG.providerNPI}*ELIGIBILITY~NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}~DMG*D8*${formattedDOB}*${patient.gender || 'U'}~DTP*291*D8*${fullDateStr}~EQ*30~SE*13*0001~GE*1*${controlNumber}~IEA*1*${controlNumber}~`;
}

// Generate SOAP envelope for Office Ally
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

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Send request to Office Ally
async function sendOfficeAllyRequest(soapRequest) {
    try {
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

        const responseText = await response.text();
        return responseText;
    } catch (error) {
        console.error('Office Ally request failed:', error);
        throw error;
    }
}

// Parse Office Ally SOAP response
function parseOfficeAllySOAPResponse(soapResponse) {
    try {
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/ns1:Payload>/s) ||
                             soapResponse.match(/<ns1:Payload[^>]*>(.*?)<\/ns1:Payload>/s);
        
        if (!payloadMatch) {
            console.log('🔍 Office Ally SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
            throw new Error('No payload found in Office Ally SOAP response');
        }
        
        return payloadMatch[1].trim();
    } catch (error) {
        console.error('Office Ally SOAP parsing error:', error);
        throw new Error('Unable to parse Office Ally SOAP response');
    }
}

// Enhanced X12 271 parser with multi-payer and copay support
function parseX12_271Enhanced(x12Data, payerId = 'UTMCD') {
    const lines = x12Data.split(/[~\n]/);
    
    try {
        const result = {
            enrolled: false,
            program: '',
            effectiveDate: '',
            details: '',
            verified: true,
            error: '',
            payerInfo: {
                payerId: payerId,
                payerName: PAYER_CONFIGS[payerId]?.displayName || 'Unknown Payer',
                payerType: payerId.startsWith('ABH-') ? 'MEDICAID' : 
                          payerId.includes('UTMCD') || payerId.includes('SKUT0') ? 'MEDICAID' : 'COMMERCIAL'
            },
            copayInfo: null
        };

        let hasActiveEligibility = false;
        let copayAmount = null;
        let deductible = null;
        let coinsurance = null;

        // Look for eligibility segments and benefits
        for (const line of lines) {
            // EB segments contain eligibility and benefit information
            if (line.startsWith('EB*')) {
                const segments = line.split('*');
                const eligibilityCode = segments[1];
                
                // Active eligibility codes: 1, 6, A, B, C, D
                if (['1', '6', 'A', 'B', 'C', 'D'].includes(eligibilityCode)) {
                    hasActiveEligibility = true;
                    result.enrolled = true;
                    
                    // Extract program name from payer config
                    result.program = PAYER_CONFIGS[payerId]?.displayName || 'Insurance Coverage';
                    result.details = `Active ${result.payerInfo.payerType.toLowerCase()} coverage`;
                }
                
                // Look for copay information in EB segments
                // Format: EB*1*IND*30**23*25.00 (copay amount)
                if (segments.length > 5 && segments[5]) {
                    const amount = parseFloat(segments[5]);
                    if (!isNaN(amount) && amount > 0) {
                        copayAmount = amount;
                    }
                }
                
                // Look for deductible information
                if (line.includes('*C1*') && segments.length > 5) {
                    const amount = parseFloat(segments[5]);
                    if (!isNaN(amount)) {
                        deductible = amount;
                    }
                }
                
                // Look for coinsurance percentage
                if (line.includes('*A7*') && segments.length > 4) {
                    const percent = parseFloat(segments[4]);
                    if (!isNaN(percent)) {
                        coinsurance = percent;
                    }
                }
            }
            
            // AAA segments indicate rejections
            if (line.startsWith('AAA*') && line.includes('*N*')) {
                result.enrolled = false;
                const payerName = result.payerInfo.payerName;
                result.error = `No active ${payerName} coverage found`;
            }
        }

        // Set copay information if found
        if (copayAmount || deductible || coinsurance) {
            result.copayInfo = {
                hasCopay: !!copayAmount,
                copayAmount: copayAmount,
                deductible: deductible,
                coinsurance: coinsurance
            };
        }

        // Default error message if no eligibility found
        if (!hasActiveEligibility && !result.error) {
            const payerName = result.payerInfo.payerName;
            result.error = `No active ${payerName} coverage found`;
        }

        return result;
    } catch (error) {
        console.error('X12 271 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            verified: true,
            payerInfo: {
                payerId: payerId,
                payerName: PAYER_CONFIGS[payerId]?.displayName || 'Unknown Payer'
            }
        };
    }
}

// Main eligibility check handler
async function checkEligibility(req, res) {
    const startTime = Date.now();
    console.log(`🔍 Checking eligibility for ${req.body.first} ${req.body.last} via ${getEligibilityProvider().toUpperCase()}`);
    
    try {
        const { first, last, dob, ssn, medicaidId, gender, payerId, payerName, demoMode } = req.body;
        
        // Check if this is a demo request
        if (demoMode || (first === 'Alex' && last === 'Demo')) {
            console.log('🎭 Demo mode detected - returning successful eligibility response');
            return res.json({
                enrolled: true,
                verified: true,
                program: 'Utah Medicaid (Demo)',
                details: 'Demo patient - eligible for CM program',
                payerInfo: {
                    payerName: 'MEDICAID UTAH',
                    payerType: 'MEDICAID',
                    planType: 'Traditional FFS'
                },
                patientData: {
                    phone: req.body.participantPhone || '(385) 201-8161',
                    medicaidId: 'DEMO123456'
                },
                demoMode: true
            });
        }
        
        // Determine which payer to use (default to Utah Medicaid)
        const targetPayerId = payerId || 'UTMCD';
        console.log(`🔍 Using payer ID: ${targetPayerId} (${PAYER_CONFIGS[targetPayerId]?.displayName || 'Unknown Payer'})`);

        // Validate required fields
        if (!first || !last || !dob) {
            return res.status(400).json({
                error: 'Missing required fields: first, last, dob',
                enrolled: false,
                verified: false
            });
        }

        // Generate X12 270 request with dynamic payer
        const x12_270 = generateOfficeAllyX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            ssn: ssn?.replace(/\D/g, ''),
            medicaidId,
            gender: gender || 'U'
        }, targetPayerId);

        // Generate SOAP request
        const soapRequest = generateOfficeAllySOAPRequest(x12_270);
        
        console.log('🚀 Processing real OFFICE_ALLY eligibility check...');
        console.log('📡 Sending request to Office Ally...');
        
        // Send request
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        console.log('📨 Received response from Office Ally');
        
        // Parse response with enhanced parser
        const x12_271 = parseOfficeAllySOAPResponse(soapResponse);
        const eligibilityResult = parseX12_271Enhanced(x12_271, targetPayerId);
        
        // Log the X12 271 response for analysis
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const patientName = `${first.replace(/\s+/g, '_')}_${last.replace(/\s+/g, '_')}`;
        const filename = `raw_x12_271_${patientName}_${targetPayerId}_${timestamp}.txt`;
        console.log(`💾 Logging X12 271 response to: ${filename}`);
        
        // Write X12 271 to file for analysis (in background)
        const fs = require('fs').promises;
        fs.writeFile(filename, x12_271).catch(err => 
            console.log('Note: Could not save X12 271 file:', err.message)
        );

        // Log to database (if available)
        if (pool) {
            try {
                await pool.query(`
                    INSERT INTO eligibility_log (
                        patient_first_name, patient_last_name, patient_dob,
                        ssn_last_four, medicaid_id, raw_270, raw_271, sftp_filename,
                        result, is_enrolled, performed_at, processing_time_ms
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
                `, [
                    first.trim(), last.trim(), dob,
                    ssn ? ssn.replace(/\D/g, '').slice(-4) : null,
                    medicaidId || null,
                    x12_270, x12_271, `office_ally_${Date.now()}.xml`,
                    JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
                    Date.now() - startTime
                ]);
            } catch (dbError) {
                console.log('Database logging failed (continuing without):', dbError.message);
            }
        }

        console.log(`✅ OFFICE_ALLY eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);

        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ OFFICE_ALLY eligibility check failed:', error);
        
        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false
        });
    }
}

module.exports = checkEligibility;