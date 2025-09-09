/**
 * Database-Driven API Routes
 * 
 * Express routes that use Supabase database configurations
 * instead of hardcoded payer mappings for Office Ally eligibility checks.
 * 
 * Add these routes to your existing api-server.js
 */

const {
    getPayerDropdownOptions,
    getPayerConfig,
    generateDatabaseDrivenX12_270,
    logEligibilityCheck
} = require('./database-driven-eligibility-service');

// Import existing Office Ally utilities (we'll create minimal versions)
// Reuse SOAP handling logic from working system

/**
 * Generate SOAP request for Office Ally
 */
function generateOfficeAllySOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
    const OFFICE_ALLY_CONFIG = {
        username: process.env.OFFICE_ALLY_USERNAME,
        password: process.env.OFFICE_ALLY_PASSWORD,
        senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
        receiverID: 'OFFALLY'
    };
    
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
    const endpoint = process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc';
    
    const response = await fetch(endpoint, {
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
 * Database-driven universal eligibility check
 */
async function handleDatabaseDrivenEligibilityCheck(req, res) {
    const startTime = Date.now();
    
    try {
        const { 
            payerId, // This is now the Office Ally payer ID (e.g., 'UTMCD', '60054')
            firstName, 
            lastName, 
            dateOfBirth, 
            gender, 
            memberNumber, 
            medicaidId, 
            groupNumber, 
            ssn, 
            address 
        } = req.body;

        if (!payerId) {
            return res.status(400).json({
                error: 'Missing required field: payerId (Office Ally payer ID)',
                enrolled: false,
                verified: false
            });
        }

        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({
                error: 'Missing required fields: firstName, lastName, dateOfBirth',
                enrolled: false,
                verified: false
            });
        }

        console.log(`🔍 Database-driven eligibility check: ${firstName} ${lastName} with ${payerId}`);

        // Get payer configuration from database
        const payerConfig = await getPayerConfig(payerId);
        if (!payerConfig) {
            return res.status(400).json({
                error: `Payer not configured: ${payerId}`,
                enrolled: false,
                verified: false
            });
        }

        // Prepare patient data object
        const patientData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            gender: gender || 'U',
            memberNumber: memberNumber?.trim() || null,
            medicaidId: medicaidId?.trim() || null,
            groupNumber: groupNumber?.trim() || null,
            ssn: ssn?.replace(/\D/g, '') || null,
            address: address?.trim() || null
        };

        // Generate X12 270 using database configuration
        const x12_270 = await generateDatabaseDrivenX12_270(patientData, payerId);
        console.log(`📋 Generated database-driven X12 270 for ${payerId} (${x12_270.length} chars)`);

        // Generate SOAP request (reuse existing working code)
        const soapRequest = generateOfficeAllySOAPRequest(x12_270);

        // Send to Office Ally (reuse existing working code)
        console.log('📡 Sending request to Office Ally...');
        const soapResponse = await sendOfficeAllyRequest(soapRequest);
        console.log('📨 Received response from Office Ally');

        // Parse SOAP response (reuse existing working code)
        const x12_271 = parseOfficeAllySOAPResponse(soapResponse);

        // Parse eligibility result using database-aware logic
        const eligibilityResult = await parseDatabaseDrivenX12_271(x12_271, payerId, payerConfig);
        eligibilityResult.responseTime = Date.now() - startTime;

        // Log to database
        await logEligibilityCheck(patientData, payerId, x12_270, x12_271, eligibilityResult, Date.now() - startTime);

        console.log(`✅ Database-driven eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ Database-driven eligibility check failed:', error);

        res.status(500).json({
            enrolled: false,
            error: `Unable to verify eligibility: ${error.message}`,
            verified: false,
            responseTime: Date.now() - startTime
        });
    }
}

/**
 * Parse X12 271 response with database-driven payer-specific logic
 */
async function parseDatabaseDrivenX12_271(x12Data, officeAllyPayerId, payerConfig) {
    const result = {
        enrolled: false,
        program: '',
        planType: '',
        payer: payerConfig.displayName,
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

            // Database-driven payer-specific parsing
            if (payerConfig.category === 'Medicaid') {
                parseMedicaidResponse(x12Data, result, payerConfig);
            } else if (payerConfig.category === 'Commercial') {
                parseCommercialResponse(x12Data, result, payerConfig);
            } else if (payerConfig.category === 'Medicaid Managed Care') {
                parseMedicaidManagedCareResponse(x12Data, result, payerConfig);
            } else {
                result.program = payerConfig.displayName;
                result.planType = 'Standard';
                result.details = `Active coverage with ${payerConfig.displayName}`;
            }

            // Special handling for tested payers
            if (officeAllyPayerId === '60054') { // Aetna
                result.copayInfo = extractAetnaCopayInfo(x12Data);
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
 * Parse Medicaid responses
 */
function parseMedicaidResponse(x12Data, result, payerConfig) {
    if (x12Data.includes('TARGETED ADULT MEDICAID')) {
        result.program = 'Utah Medicaid - Targeted Adult (Traditional FFS)';
        result.planType = 'Traditional Fee-for-Service';
        result.details = 'Active traditional Medicaid coverage - eligible for CM Program';
    } else if (x12Data.includes('MENTAL HEALTH')) {
        result.program = 'Utah Medicaid - Mental Health Services';
        result.planType = 'Mental Health Carve-Out';
        result.details = 'Mental health services covered under traditional Medicaid FFS';
    } else {
        result.program = payerConfig.displayName;
        result.planType = 'Traditional FFS';
        result.details = 'Active Medicaid coverage';
    }
}

/**
 * Parse Commercial payer responses
 */
function parseCommercialResponse(x12Data, result, payerConfig) {
    // Determine plan type from X12 response
    if (x12Data.includes('HMO')) {
        result.planType = 'HMO';
    } else if (x12Data.includes('PPO')) {
        result.planType = 'PPO';
    } else if (x12Data.includes('POS')) {
        result.planType = 'POS';
    } else {
        result.planType = 'Commercial';
    }

    result.program = `${payerConfig.displayName} ${result.planType}`;
    result.details = `Active ${result.planType} coverage with ${payerConfig.displayName}`;
}

/**
 * Parse Medicaid Managed Care responses
 */
function parseMedicaidManagedCareResponse(x12Data, result, payerConfig) {
    result.program = payerConfig.displayName;
    result.planType = 'Managed Care';
    result.details = `Active managed care coverage through ${payerConfig.displayName}`;
}

/**
 * Extract copay information (reuse from existing code)
 */
function extractAetnaCopayInfo(x12Data) {
    const copayInfo = {};
    const segments = x12Data.split('~');
    
    // Look for EB segments with copay amounts
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
 * Parse X12 999 error details (reuse from existing code)
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
 * Get available payers from database
 */
async function handleGetPayers(req, res) {
    try {
        const payerOptions = await getPayerDropdownOptions();
        
        res.json({
            success: true,
            payers: payerOptions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to get payer options from database:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to load payer options from database',
            payers: []
        });
    }
}

/**
 * Get form configuration for a specific payer from database
 */
async function handleGetPayerConfig(req, res) {
    try {
        const { payerId } = req.params; // This is the Office Ally payer ID
        
        const { generateDynamicFormConfig } = require('./database-driven-eligibility-service');
        const formConfig = await generateDynamicFormConfig(payerId);
        
        res.json({
            success: true,
            config: formConfig,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Failed to get form config for ${req.params.payerId || 'unknown'}:`, error);
        res.status(400).json({
            success: false,
            error: error.message,
            config: null
        });
    }
}

// Export the route handlers
module.exports = {
    handleDatabaseDrivenEligibilityCheck,
    handleGetPayers,
    handleGetPayerConfig,
    parseDatabaseDrivenX12_271
};

// ============================================
// ADD THESE ROUTES TO YOUR api-server.js:
// ============================================
/*

// Import the database-driven handlers
const {
    handleDatabaseDrivenEligibilityCheck,
    handleGetPayers,
    handleGetPayerConfig
} = require('./database-driven-api-routes');

// Database-driven eligibility check endpoint
app.post('/api/database-eligibility/check', handleDatabaseDrivenEligibilityCheck);

// Get available payers from database
app.get('/api/database-eligibility/payers', handleGetPayers);

// Get form configuration for a specific payer from database  
app.get('/api/database-eligibility/payer/:payerId/config', handleGetPayerConfig);

*/