// routes/universal-eligibility.js - Universal eligibility checker API endpoint
const { checkUniversalEligibility, PAYER_CONFIGS } = require('../universal-eligibility-checker.js');

async function handleUniversalEligibilityCheck(req, res) {
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

        // Add Member ID if provided (for commercial payers like Aetna)
        if (req.body.memberId) {
            patient.memberId = req.body.memberId.trim();
        }

        console.log(`🔍 Universal eligibility check requested: ${patient.first} ${patient.last} (${patient.dob}) - ${payerType}${patient.memberId ? ' [Member ID: ' + patient.memberId + ']' : ''}`);
        
        // Call the universal eligibility checker
        const result = await checkUniversalEligibility(patient, payerType);
        
        // Add API metadata
        result.apiResponseTime = Date.now() - startTime;
        result.timestamp = new Date().toISOString();
        result.payerType = payerType;
        result.providerInfo = {
            name: PAYER_CONFIGS[payerType].providerName,
            npi: PAYER_CONFIGS[payerType].providerNPI
        };
        
        console.log(`✅ Universal eligibility check completed in ${result.apiResponseTime}ms: ${result.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Universal eligibility check error:', error);
        
        res.status(500).json({
            error: 'Internal server error during eligibility check',
            enrolled: false,
            responseTime: Date.now() - startTime,
            details: error.message
        });
    }
}

module.exports = handleUniversalEligibilityCheck;