// database/setup-claims-table-auto.js
// Automatically creates claims_submissions table using direct PostgreSQL connection

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupTable() {
    console.log('🔧 Auto-setup claims_submissions table\n');

    // Extract project ref and password from Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
        process.exit(1);
    }

    // Extract project reference from URL
    // Format: https://[PROJECT_REF].supabase.co
    const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!projectRefMatch) {
        console.error('❌ Could not extract project reference from Supabase URL');
        console.error(`   URL: ${supabaseUrl}`);
        process.exit(1);
    }

    const projectRef = projectRefMatch[1];
    console.log(`✅ Project reference: ${projectRef}`);

    // Prompt user for database password
    console.log('\n⚠️  To create the table, we need your Supabase database password.');
    console.log('📋 Find it in: Supabase Dashboard → Settings → Database → Connection string\n');
    console.log('Choose one option:\n');
    console.log('OPTION 1: Add DATABASE_URL to .env.local');
    console.log('----------------------------------------');
    console.log('Add this line to your .env.local file:');
    console.log(`DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres\n`);
    console.log('Then run: node database/setup-claims-table-auto.js\n');

    console.log('OPTION 2: Run SQL manually in Supabase Dashboard');
    console.log('--------------------------------------------------');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Copy the SQL from: database/create-claims-submissions-table.sql');
    console.log('3. Paste and click "Run"\n');

    console.log('OPTION 3: Use this script with temporary connection');
    console.log('----------------------------------------------------');
    console.log('Run this command (replace [YOUR_PASSWORD]):');
    console.log(`DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" node database/setup-claims-table-auto.js\n`);

    // Check if DATABASE_URL is configured
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl === 'postgresql://user:pass@host:5432/database') {
        console.log('❌ DATABASE_URL not configured in .env.local');
        console.log('   Please use one of the options above.\n');
        process.exit(0);
    }

    console.log('✅ DATABASE_URL found, attempting to create table...\n');

    // Create PostgreSQL pool
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, 'create-claims-submissions-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('1️⃣ Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected\n');

        console.log('2️⃣ Executing SQL script...');
        await client.query(sql);
        console.log('✅ Table created successfully!\n');

        // Test the table
        console.log('3️⃣ Testing table with dummy insert...');
        const testData = {
            claim_id: `TEST_${Date.now()}`,
            patient_name: 'Test Patient',
            patient_dob: '1990-01-01',
            payer_name: 'Test Payer',
            payer_837p_id: 'TEST',
            billing_provider_npi: '1234567890',
            service_date_from: '2025-10-07',
            service_date_to: '2025-10-07',
            total_charge: 100.00,
            total_units: 1,
            diagnosis_codes: '{F32.9}',
            service_lines: JSON.stringify([{ cptCode: '99214', charge: 100, units: 1 }]),
            test_mode: true,
            filename: 'TEST.txt',
            edi_content: 'TEST EDI CONTENT',
            status: 'SUBMITTED'
        };

        const insertResult = await client.query(`
            INSERT INTO claims_submissions (
                claim_id, patient_name, patient_dob, payer_name, payer_837p_id,
                billing_provider_npi, service_date_from, service_date_to,
                total_charge, total_units, diagnosis_codes, service_lines,
                test_mode, filename, edi_content, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, claim_id
        `, [
            testData.claim_id, testData.patient_name, testData.patient_dob,
            testData.payer_name, testData.payer_837p_id, testData.billing_provider_npi,
            testData.service_date_from, testData.service_date_to,
            testData.total_charge, testData.total_units, testData.diagnosis_codes,
            testData.service_lines, testData.test_mode, testData.filename,
            testData.edi_content, testData.status
        ]);

        console.log('✅ Test insert successful!');
        console.log('   Record ID:', insertResult.rows[0].id);

        // Clean up test record
        await client.query('DELETE FROM claims_submissions WHERE claim_id = $1', [testData.claim_id]);
        console.log('✅ Test record cleaned up\n');

        client.release();
        await pool.end();

        console.log('🎉 Setup complete! The claims_submissions table is ready.\n');
        console.log('Next steps:');
        console.log('1. Restart your API server: node api-server.js');
        console.log('2. Submit a test claim via the UI');
        console.log('3. Check the database for the claim record\n');

    } catch (error) {
        console.error('\n❌ Error during setup:', error.message);
        console.error('   Code:', error.code);
        console.error('   Detail:', error.detail);
        console.error('   Hint:', error.hint);
        await pool.end();
        process.exit(1);
    }
}

setupTable().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
