// api/debug.js - Simple system check endpoint
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
        environment: process.env.NODE_ENV || 'unknown',
        tests: {}
    };

    // Test 1: Environment Variables
    results.tests.environment = {
        DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
        NODE_ENV: process.env.NODE_ENV || 'Not Set'
    };

    // Test 2: Database Connection
    try {
        const { pool } = require('./_db');
        const testQuery = await pool.query('SELECT NOW() as timestamp, version() as pg_version');

        results.tests.database = {
            status: '✅ Connected',
            timestamp: testQuery.rows[0].timestamp,
            version: testQuery.rows[0].pg_version.split(' ')[0] + ' ' + testQuery.rows[0].pg_version.split(' ')[1]
        };

        // Check if eligibility_log table exists
        try {
            const tableCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'eligibility_log'
        ORDER BY ordinal_position
      `);

            if (tableCheck.rows.length > 0) {
                results.tests.eligibility_table = {
                    status: '✅ Table exists',
                    columns: tableCheck.rows.length
                };
            } else {
                results.tests.eligibility_table = {
                    status: '❌ Table missing',
                    note: 'Run database migration to create eligibility_log table'
                };
            }
        } catch (tableError) {
            results.tests.eligibility_table = {
                status: '⚠️ Check failed',
                error: tableError.message
            };
        }

    } catch (dbError) {
        results.tests.database = {
            status: '❌ Connection failed',
            error: dbError.message
        };
    }

    // Test 3: Basic API functionality
    results.tests.api = {
        status: '✅ Responding',
        method: req.method,
        url: req.url,
        headers: Object.keys(req.headers).length
    };

    // Overall status
    const hasErrors = Object.values(results.tests).some(test =>
        typeof test === 'object' && (test.status?.includes('❌') || test.status?.includes('⚠️'))
    );

    results.overall = hasErrors ? 'Issues detected' : 'All systems operational';

    // Set appropriate HTTP status
    const statusCode = hasErrors ? 500 : 200;

    res.status(statusCode).json(results);
};