// routes/universal-eligibility-enhanced.js - Enhanced eligibility checker with detailed copay parsing
const { checkUniversalEligibility, PAYER_CONFIGS } = require('../universal-eligibility-checker-enhanced.js');

async function handleEnhancedEligibilityCheck(req, res) {
    const startTime = Date.now();
    
    try {
        const { first, last, dob, payerType } = req.body;
        
        // Validate required fields
        if (!first || !last || !dob || !payerType) {
            return res.status(400).json({
                error: 'Missing required fields: first, last, dob, payerType',
                enrolled: false,
                responseTime: Date.now() - startTime
            });
        }
        
        // Validate payer type
        if (!PAYER_CONFIGS[payerType]) {
            return res.status(400).json({
                error: `Unsupported payer type: ${payerType}. Supported: ${Object.keys(PAYER_CONFIGS).join(', ')}`,
                enrolled: false,
                responseTime: Date.now() - startTime
            });
        }
        
        // Create patient object
        const patient = {
            first: first.trim(),
            last: last.trim(),
            dob: dob
        };
        
        console.log(`🔬 ENHANCED eligibility check requested: ${patient.first} ${patient.last} (${patient.dob}) - ${payerType}`);
        
        // Call the enhanced eligibility checker
        const result = await checkUniversalEligibility(patient, payerType);
        
        // Add API metadata
        result.apiResponseTime = Date.now() - startTime;
        result.timestamp = new Date().toISOString();
        result.payerType = payerType;
        result.providerInfo = {
            name: PAYER_CONFIGS[payerType].providerName,
            npi: PAYER_CONFIGS[payerType].providerNPI
        };
        result.enhanced = true; // Flag to indicate this used the enhanced parser
        
        console.log(`✅ ENHANCED eligibility check completed in ${result.apiResponseTime}ms: ${result.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        
        if (result.copayInfo) {
            console.log(`💰 Copay information extracted: ${JSON.stringify(result.copayInfo, null, 2)}`);
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Enhanced eligibility check error:', error);
        
        res.status(500).json({
            error: 'Internal server error during enhanced eligibility check',
            enrolled: false,
            responseTime: Date.now() - startTime,
            details: error.message,
            enhanced: true
        });
    }
}

module.exports = handleEnhancedEligibilityCheck;