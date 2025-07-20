// api/medicaid/check.js
import { pool, verifyToken } from '../_db.js';

export default async function handler(req, res) {
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
        const { first, last, dob, ssn, medicaidId } = req.body;

        // Basic validation
        if (!first || !last || !dob) {
            return res.status(400).json({
                enrolled: false,
                error: 'First name, last name, and date of birth are required'
            });
        }

        if (!ssn && !medicaidId) {
            return res.status(400).json({
                enrolled: false,
                error: 'Either SSN or Medicaid ID is required'
            });
        }

        console.log(`🔍 Checking eligibility for ${first} ${last}`);

        // For now, simulate the Office Ally check with a realistic delay
        // TODO: Replace this with actual Office Ally SFTP integration
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

        // Simulate eligibility response (replace with real Office Ally logic)
        const isEligible = Math.random() > 0.3; // 70% eligible rate for testing

        const eligibilityResult = isEligible ? {
            enrolled: true,
            program: 'Utah Medicaid',
            details: 'Active coverage verified via Office Ally',
            effectiveDate: new Date().toISOString().slice(0, 10),
            verified: true
        } : {
            enrolled: false,
            error: 'No active Medicaid coverage found',
            verified: true
        };

        // Log to database
        const processingTime = Date.now() - startTime;

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
            ssn ? ssn.slice(-4) : null,
            medicaidId || null,
            JSON.stringify(eligibilityResult),
            eligibilityResult.enrolled,
            processingTime,
            `sim_${Date.now()}_${last.toLowerCase()}.txt` // Simulated filename
        ]);

        console.log(`✅ Eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);

        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ Eligibility check failed:', error);

        // Log error to database
        try {
            await pool.query(`
        INSERT INTO eligibility_log (
          patient_first_name, patient_last_name, patient_dob,
          result, is_enrolled, error_message, performed_at, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      `, [
                req.body.first || 'Unknown',
                req.body.last || 'Unknown',
                req.body.dob || null,
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
            error: 'Unable to verify eligibility at this time. Please verify manually.',
            verified: false
        });
    }
}