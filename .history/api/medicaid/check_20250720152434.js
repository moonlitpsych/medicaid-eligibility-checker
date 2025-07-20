// api/medicaid/check.js - Fixed for Vercel
const { pool } = require('../_db');

// Validate patient data
function validatePatientData(data) {
    const errors = [];

    if (!data.first?.trim()) errors.push('First name is required');
    if (!data.last?.trim()) errors.push('Last name is required');
    if (!data.dob) errors.push('Date of birth is required');

    if (data.dob) {
        const dob = new Date(data.dob);
        const now = new Date();
        if (dob > now) errors.push('Date of birth cannot be in the future');
        if (now.getFullYear() - dob.getFullYear() > 120) errors.push('Invalid date of birth');
    }

    if (!data.ssn && !data.medicaidId) {
        errors.push('Either SSN or Medicaid ID is required');
    }

    if (data.ssn) {
        const cleanSSN = data.ssn.replace(/\D/g, '');
        if (cleanSSN.length !== 9) errors.push('SSN must be 9 digits');
        if (cleanSSN === '000000000') errors.push('Invalid SSN');
    }

    if (data.medicaidId) {
        const cleanId = data.medicaidId.replace(/\D/g, '');
        if (cleanId.length !== 10) errors.push('Utah Medicaid ID must be 10 digits');
    }

    return { valid: errors.length === 0, errors };
}

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();

    try {
        const { first, last, dob, ssn, medicaidId } = req.body || {};

        console.log('📝 Received request:', { first, last, dob, ssn: ssn ? 'XXX-XX-' + ssn.slice(-4) : null, medicaidId });

        // Validate input data
        const validation = validatePatientData({ first, last, dob, ssn, medicaidId });
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.errors);
            return res.status(400).json({
                enrolled: false,
                error: validation.errors.join(', '),
                verified: false
            });
        }

        console.log(`🔍 Checking eligibility for ${first} ${last}`);

        // SIMULATION MODE (replace with real Office Ally integration later)
        console.log('⏳ Simulating Office Ally check...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

        // Simulate realistic eligibility responses
        const scenarios = [
            {
                weight: 0.6, // 60% chance
                result: {
                    enrolled: true,
                    program: 'Utah Medicaid Traditional',
                    details: 'Active coverage verified - Primary coverage',
                    effectiveDate: new Date().toISOString().slice(0, 10),
                    verified: false // Mark as simulation
                }
            },
            {
                weight: 0.2, // 20% chance
                result: {
                    enrolled: true,
                    program: 'Utah Medicaid Expansion',
                    details: 'Active coverage verified - Medicaid Expansion',
                    effectiveDate: '2024-01-01',
                    verified: false
                }
            },
            {
                weight: 0.15, // 15% chance
                result: {
                    enrolled: false,
                    error: 'No active Medicaid coverage found',
                    details: 'Patient may be eligible for other programs',
                    verified: false
                }
            },
            {
                weight: 0.05, // 5% chance
                result: {
                    enrolled: false,
                    error: 'Coverage terminated as of last month',
                    details: 'Patient should reapply for coverage',
                    verified: false
                }
            }
        ];

        // Select scenario based on weights
        const random = Math.random();
        let cumulativeWeight = 0;
        let selectedScenario = scenarios[0];

        for (const scenario of scenarios) {
            cumulativeWeight += scenario.weight;
            if (random <= cumulativeWeight) {
                selectedScenario = scenario;
                break;
            }
        }

        const eligibilityResult = selectedScenario.result;

        // Log to database with improved error handling
        const processingTime = Date.now() - startTime;

        try {
            await pool.query(`
        INSERT INTO eligibility_log (
          patient_first_name, patient_last_name, patient_dob,
          ssn_last_four, medicaid_id, result, is_enrolled,
          performed_at, processing_time_ms, sftp_filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
      `, [
                first.trim(),
                last.trim(),
                dob,
                ssn ? ssn.replace(/\D/g, '').slice(-4) : null,
                medicaidId || null,
                JSON.stringify(eligibilityResult),
                eligibilityResult.enrolled || false,
                processingTime,
                `sim_${Date.now()}_${last.toLowerCase().replace(/[^a-z0-9]/g, '')}.txt`
            ]);

            console.log('✅ Successfully logged to database');
        } catch (dbError) {
            console.error('⚠️ Database logging failed (continuing anyway):', dbError.message);
            // Don't fail the whole request if logging fails
        }

        console.log(`✅ Eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'} (${processingTime}ms)`);

        // Return result
        res.status(200).json(eligibilityResult);

    } catch (error) {
        console.error('❌ Eligibility check failed:', error);

        // Try to log error to database
        try {
            await pool.query(`
        INSERT INTO eligibility_log (
          patient_first_name, patient_last_name, patient_dob,
          result, is_enrolled, error_message, performed_at, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      `, [
                req.body?.first || 'Unknown',
                req.body?.last || 'Unknown',
                req.body?.dob || null,
                JSON.stringify({ error: error.message }),
                false,
                error.message,
                Date.now() - startTime
            ]);
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false,
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};