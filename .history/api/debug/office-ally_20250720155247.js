// api/debug/office-ally.js - Office Ally SFTP Connection Tester
const SftpClient = require('ssh2-sftp-client');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        overall: 'unknown'
    };

    // Test 1: Environment Variables
    const envTest = {
        name: 'Environment Variables',
        status: 'unknown',
        details: {}
    };

    const requiredEnvs = [
        'OFFICE_ALLY_SFTP_HOST',
        'OFFICE_ALLY_SFTP_USER',
        'OFFICE_ALLY_SFTP_PASS',
        'OFFICE_ALLY_TPN',
        'PROVIDER_NPI',
        'PROVIDER_NAME'
    ];

    requiredEnvs.forEach(env => {
        if (process.env[env]) {
            envTest.details[env] = '✅ Set';
        } else {
            envTest.details[env] = '❌ Missing';
        }
    });

    envTest.status = requiredEnvs.every(env => process.env[env]) ? 'pass' : 'fail';
    results.tests.push(envTest);

    // Test 2: SFTP Connection (only if env vars are set)
    if (envTest.status === 'pass') {
        const sftpTest = {
            name: 'SFTP Connection',
            status: 'unknown',
            details: {}
        };

        const sftp = new SftpClient();
        const sftpConfig = {
            host: process.env.OFFICE_ALLY_SFTP_HOST,
            port: parseInt(process.env.OFFICE_ALLY_SFTP_PORT) || 22,
            username: process.env.OFFICE_ALLY_SFTP_USER,
            password: process.env.OFFICE_ALLY_SFTP_PASS
        };

        try {
            const startTime = Date.now();
            await sftp.connect(sftpConfig);

            sftpTest.details.connection = '✅ Connected successfully';
            sftpTest.details.connectionTime = `${Date.now() - startTime}ms`;

            // Test directory listing
            try {
                const files = await sftp.list('/');
                sftpTest.details.rootDirectory = `✅ Listed ${files.length} items`;

                // Show some directory names (but not file contents for security)
                const dirNames = files
                    .filter(item => item.type === 'd')
                    .map(item => item.name)
                    .slice(0, 5);
                if (dirNames.length > 0) {
                    sftpTest.details.directories = dirNames.join(', ');
                }
            } catch (listError) {
                sftpTest.details.rootDirectory = `⚠️ List failed: ${listError.message}`;
            }

            // Check for standard Office Ally directories
            const standardDirs = ['incoming', 'outgoing', 'archive'];
            for (const dir of standardDirs) {
                try {
                    await sftp.list(`/${dir}`);
                    sftpTest.details[`${dir}Dir`] = '✅ Accessible';
                } catch (dirError) {
                    sftpTest.details[`${dir}Dir`] = `❌ ${dirError.message}`;
                }
            }

            sftpTest.status = 'pass';

        } catch (error) {
            sftpTest.details.error = `Connection failed: ${error.message}`;
            sftpTest.status = 'fail';
        } finally {
            try {
                await sftp.end();
            } catch (endError) {
                // Ignore cleanup errors
            }
        }

        results.tests.push(sftpTest);
    } else {
        results.tests.push({
            name: 'SFTP Connection',
            status: 'skipped',
            details: { reason: 'Missing environment variables' }
        });
    }

    // Test 3: X12 Generation
    const x12Test = {
        name: 'X12 Generation',
        status: 'unknown',
        details: {}
    };

    try {
        const testPatient = {
            first: 'John',
            last: 'Doe',
            dob: '1985-03-15',
            ssn: '123456789'
        };

        const controlNumber = Date.now().toString().slice(-9);
        const formattedDOB = testPatient.dob.replace(/-/g, '');
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);

        // Generate test X12 270
        const segments = [
            `ISA*00*          *00*          *ZZ*${process.env.OFFICE_ALLY_TPN || 'TESTMISSING'}*ZZ*UTMEDICAID*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}*^*00501*${controlNumber}*0*P*:~`,
            `GS*HS*${process.env.OFFICE_ALLY_TPN || 'TESTMISSING'}*UTMEDICAID*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}*${controlNumber}*X*005010X279A1~`,
            `ST*270*${controlNumber}*005010X279A1~`,
            `BHT*0022*13*${controlNumber}*${timestamp.slice(2, 8)}*${timestamp.slice(8, 12)}~`,
            `HL*1**20*1~`,
            `NM1*PR*2*UTAH MEDICAID*****PI*UTMEDICAID~`,
            `HL*2*1*21*1~`,
            `NM1*1P*2*${process.env.PROVIDER_NAME || 'TEST_PROVIDER'}*****XX*${process.env.PROVIDER_NPI || '1234567890'}~`,
            `HL*3*2*22*0~`,
            `TRN*1*${controlNumber}*${process.env.PROVIDER_NPI || '1234567890'}~`,
            `NM1*IL*1*${testPatient.last.toUpperCase()}*${testPatient.first.toUpperCase()}****MI*${testPatient.ssn}~`,
            `DMG*D8*${formattedDOB}~`,
            `EQ*30~`,
            `SE*12*${controlNumber}~`,
            `GE*1*${controlNumber}~`,
            `IEA*1*${controlNumber}~`
        ];

        const x12Content = segments.join('\n');

        x12Test.details.generated = '✅ X12 270 generated successfully';
        x12Test.details.controlNumber = controlNumber;
        x12Test.details.segments = segments.length;
        x12Test.details.size = `${x12Content.length} bytes`;
        x12Test.details.sampleSegment = segments[0].substring(0, 50) + '...';
        x12Test.status = 'pass';

    } catch (error) {
        x12Test.details.error = `Generation failed: ${error.message}`;
        x12Test.status = 'fail';
    }

    results.tests.push(x12Test);

    // Test 4: Database Connection
    const dbTest = {
        name: 'Database Connection',
        status: 'unknown',
        details: {}
    };

    try {
        const { pool } = require('../_db');

        const testQuery = await pool.query(`
      SELECT NOW() as timestamp, 
             COUNT(*) as total_checks,
             COUNT(CASE WHEN performed_at >= CURRENT_DATE THEN 1 END) as today_checks
      FROM eligibility_log
    `);

        dbTest.details.connection = '✅ Connected';
        dbTest.details.timestamp = testQuery.rows[0].timestamp;
        dbTest.details.totalChecks = testQuery.rows[0].total_checks;
        dbTest.details.todayChecks = testQuery.rows[0].today_checks;
        dbTest.status = 'pass';

    } catch (error) {
        dbTest.details.error = `Database error: ${error.message}`;
        dbTest.status = 'fail';
    }

    results.tests.push(dbTest);

    // Overall status
    const passCount = results.tests.filter(test => test.status === 'pass').length;
    const failCount = results.tests.filter(test => test.status === 'fail').length;
    const totalTests = results.tests.filter(test => test.status !== 'skipped').length;

    if (failCount === 0 && passCount === totalTests) {
        results.overall = 'ready';
        results.message = '🚀 All systems ready for Office Ally integration!';
    } else if (failCount > 0) {
        results.overall = 'not-ready';
        results.message = `❌ ${failCount} test(s) failed - fix issues before proceeding`;
    } else {
        results.overall = 'partial';
        results.message = '⚠️ Some tests skipped - check environment variables';
    }

    results.summary = {
        total: results.tests.length,
        passed: passCount,
        failed: failCount,
        skipped: results.tests.filter(test => test.status === 'skipped').length
    };

    // Set appropriate HTTP status
    const statusCode = results.overall === 'ready' ? 200 : (results.overall === 'not-ready' ? 500 : 206);

    res.status(statusCode).json(results);
};