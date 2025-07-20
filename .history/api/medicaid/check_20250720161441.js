// api/medicaid/check.js - Real Office Ally Implementation with Simulation Toggle
const { pool } = require('../_db');
const SftpClient = require('ssh2-sftp-client');

// Office Ally SFTP Configuration
const sftpConfig = {
    host: process.env.OFFICE_ALLY_SFTP_HOST || 'sftp.officeally.com',
    port: parseInt(process.env.OFFICE_ALLY_SFTP_PORT) || 22,
    username: process.env.OFFICE_ALLY_SFTP_USER,
    password: process.env.OFFICE_ALLY_SFTP_PASS
};

// Generate X12 270 eligibility request
function generateX12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);

    // Real X12 270 format for Office Ally
    const segments = [
        `ISA*00*          *00*          *ZZ*${process.env.OFFICE_ALLY_TPN}*ZZ*UTMEDICAID*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${process.env.OFFICE_ALLY_TPN}*UTMEDICAID*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}*${controlNumber}*X*005010X279A1~`,
        `ST*270*${controlNumber}*005010X279A1~`,
        `BHT*0022*13*${controlNumber}*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID*****PI*UTMEDICAID~`,
        `HL*2*1*21*1~`,
        `NM1*1P*2*${process.env.PROVIDER_NAME || 'MOONLIT_PLLC'}*****XX*${process.env.PROVIDER_NPI}~`,
        `HL*3*2*22*0~`,
        `TRN*1*${controlNumber}*${process.env.PROVIDER_NPI}~`,
        `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.ssn || patient.medicaidId}~`,
        `DMG*D8*${formattedDOB}~`,
        `EQ*30~`, // 30 = Health Benefit Plan Coverage
        `SE*12*${controlNumber}~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Parse X12 271 eligibility response
function parseX12_271(x12Data) {
    const lines = x12Data.split('\n');

    try {
        // Look for EB segments (eligibility/benefit information)
        const ebSegments = lines.filter(line => line.startsWith('EB*'));

        if (ebSegments.length === 0) {
            return {
                enrolled: false,
                error: 'No eligibility information found in response',
                verified: true
            };
        }

        // Parse EB segments for eligibility status
        const ebParts = ebSegments[0].split('*');
        const eligibilityCode = ebParts[1];

        // X12 eligibility codes:
        // 1 = Active Coverage
        // 6 = Inactive
        // 7 = Pending
        const activeCodes = ['1', 'A', 'B', 'C'];
        const isEnrolled = activeCodes.includes(eligibilityCode);

        if (isEnrolled) {
            // Look for additional benefit details
            let program = 'Utah Medicaid';
            let details = 'Active coverage verified';

            // Check for specific program codes in EB segments
            ebSegments.forEach(segment => {
                if (segment.includes('*30*')) program += ' - Medical';
                if (segment.includes('*88*')) program += ' - Pharmacy';
            });

            return {
                enrolled: true,
                program,
                details,
                effectiveDate: new Date().toISOString().slice(0, 10),
                verified: true
            };
        } else {
            let errorMessage = 'No active Medicaid coverage found';

            // Parse specific error codes
            if (eligibilityCode === '6') errorMessage = 'Coverage terminated';
            if (eligibilityCode === '7') errorMessage = 'Coverage pending approval';

            return {
                enrolled: false,
                error: errorMessage,
                verified: true
            };
        }

    } catch (error) {
        console.error('X12 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            verified: false
        };
    }
}

// Upload file to Office Ally SFTP
async function uploadToOfficeAlly(filename, content) {
    const sftp = new SftpClient();

    try {
        await sftp.connect(sftpConfig);
        console.log('✅ Connected to Office Ally SFTP');

        // Upload to incoming directory
        const remotePath = `/inbound/${filename}`;
        await sftp.put(Buffer.from(content), remotePath);

        console.log(`📤 Uploaded ${filename} to Office Ally`);
        return true;

    } catch (error) {
        console.error('❌ SFTP upload failed:', error);
        throw new Error(`SFTP upload failed: ${error.message}`);
    } finally {
        await sftp.end();
    }
}

// Download response file from Office Ally SFTP
async function downloadFromOfficeAlly(filename) {
    const sftp = new SftpClient();

    try {
        await sftp.connect(sftpConfig);

        const remotePath = `/outbound/${filename}`;
        const buffer = await sftp.get(remotePath);

        console.log(`📥 Downloaded ${filename} from Office Ally`);
        return buffer.toString();

    } catch (error) {
        throw new Error(`File not ready: ${filename}`);
    } finally {
        await sftp.end();
    }
}

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

// SIMULATION MODE FUNCTIONS
function simulateEligibilityCheck() {
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

    for (const scenario of scenarios) {
        cumulativeWeight += scenario.weight;
        if (random <= cumulativeWeight) {
            return scenario.result;
        }
    }

    return scenarios[0].result; // fallback
}

module.exports = async function handler(req, res) {
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

        console.log(`🔍 Checking eligibility for ${first} ${last} (Mode: ${process.env.SIMULATION_MODE === 'true' ? 'SIMULATION' : 'REAL'})`);

        // Validate input data
        const validation = validatePatientData({ first, last, dob, ssn, medicaidId });
        if (!validation.valid) {
            return res.status(400).json({
                enrolled: false,
                error: validation.errors.join(', '),
                verified: false
            });
        }

        let eligibilityResult;

        // Check if we're in simulation mode
        if (process.env.SIMULATION_MODE === 'true') {
            console.log('⏳ Running in SIMULATION mode...');

            // Keep simulation for testing
            await new Promise(resolve => setTimeout(resolve, 2000));
            eligibilityResult = simulateEligibilityCheck();

            // Log simulation to database
            await pool.query(`
        INSERT INTO eligibility_log (
          patient_first_name, patient_last_name, patient_dob,
          ssn_last_four, medicaid_id, result, is_enrolled,
          performed_at, processing_time_ms, sftp_filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
      `, [
                first.trim(), last.trim(), dob,
                ssn ? ssn.replace(/\D/g, '').slice(-4) : null, medicaidId || null,
                JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
                Date.now() - startTime, `sim_${Date.now()}_${last.toLowerCase().replace(/[^a-z0-9]/g, '')}.txt`
            ]);

            console.log(`✅ Simulation complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);
            return res.json(eligibilityResult);
        }

        // REAL OFFICE ALLY IMPLEMENTATION
        console.log('🚀 Running REAL Office Ally integration...');

        // Generate X12 270 request
        const x12_270 = generateX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            ssn: ssn?.replace(/\D/g, ''),
            medicaidId
        });

        const filename = `270_${Date.now()}_${last.toLowerCase().replace(/[^a-z0-9]/g, '')}.txt`;

        // Upload to Office Ally SFTP
        await uploadToOfficeAlly(filename, x12_270);
        console.log(`📤 Uploaded ${filename} to Office Ally`);

        // Wait for response file (polling approach)
        const responseFilename = filename.replace('270_', '271_');
        let x12_271 = null;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes with 10-second intervals

        console.log(`⏳ Waiting for Office Ally response: ${responseFilename}`);

        while (attempts < maxAttempts && !x12_271) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            try {
                x12_271 = await downloadFromOfficeAlly(responseFilename);
                console.log(`📥 Downloaded response: ${responseFilename}`);
                break;
            } catch (downloadError) {
                attempts++;
                console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for Office Ally response...`);
            }
        }

        if (!x12_271) {
            throw new Error('Timeout waiting for Office Ally response after 5 minutes');
        }

        // Parse X12 271 response
        eligibilityResult = parseX12_271(x12_271);

        // Log to database with full audit trail
        await pool.query(`
      INSERT INTO eligibility_log (
        patient_first_name, patient_last_name, patient_dob,
        ssn_last_four, medicaid_id, raw_270, raw_271, sftp_filename,
        result, is_enrolled, performed_at, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)
    `, [
            first.trim(), last.trim(), dob,
            ssn ? ssn.replace(/\D/g, '').slice(-4) : null, medicaidId || null,
            x12_270, x12_271, filename,
            JSON.stringify(eligibilityResult), eligibilityResult.enrolled,
            Date.now() - startTime
        ]);

        console.log(`✅ Real eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`);

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
                req.body?.first || 'Unknown', req.body?.last || 'Unknown', req.body?.dob || null,
                JSON.stringify({ error: error.message }), false, error.message,
                Date.now() - startTime
            ]);
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify eligibility at this time. Please verify manually via PRISM.',
            verified: false
        });
    }
};