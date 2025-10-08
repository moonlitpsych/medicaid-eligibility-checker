// database/setup-claims-table.js
// Script to create claims_submissions table in Supabase

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function setupClaimsTable() {
    console.log('🔧 Setting up claims_submissions table...\n');

    // 1. First check if table exists
    console.log('1️⃣ Checking if claims_submissions table exists...');
    const { data: existingTables, error: checkError } = await supabase
        .from('claims_submissions')
        .select('id')
        .limit(1);

    if (!checkError) {
        console.log('✅ Table already exists! Checking if insert works...\n');

        // Try a test insert to see what the actual error is
        console.log('2️⃣ Testing insert with dummy data...');
        const testData = {
            claim_id: `TEST_${Date.now()}`,
            patient_name: 'Test Patient',
            patient_dob: '1990-01-01',
            payer_id: null, // This might be causing the issue
            payer_name: 'Test Payer',
            payer_837p_id: 'TEST',
            billing_provider_npi: '1234567890',
            service_date_from: '2025-10-07',
            service_date_to: '2025-10-07',
            total_charge: 100.00,
            total_units: 1,
            diagnosis_codes: ['F32.9'],
            service_lines: [{ cptCode: '99214', charge: 100, units: 1 }],
            test_mode: true,
            filename: 'TEST.txt',
            edi_content: 'TEST EDI CONTENT',
            status: 'SUBMITTED',
            submitted_at: new Date().toISOString()
        };

        const { data: testResult, error: testError } = await supabase
            .from('claims_submissions')
            .insert([testData])
            .select()
            .single();

        if (testError) {
            console.error('❌ Test insert failed with error:');
            console.error(JSON.stringify(testError, null, 2));
            console.error('\nError details:');
            console.error('  Code:', testError.code);
            console.error('  Message:', testError.message);
            console.error('  Details:', testError.details);
            console.error('  Hint:', testError.hint);

            // Delete the test record if it was created
            if (testResult?.id) {
                await supabase
                    .from('claims_submissions')
                    .delete()
                    .eq('id', testResult.id);
                console.log('\n✅ Cleaned up test record');
            }

            process.exit(1);
        } else {
            console.log('✅ Test insert successful!');
            console.log('   Test record ID:', testResult.id);

            // Clean up test record
            await supabase
                .from('claims_submissions')
                .delete()
                .eq('id', testResult.id);

            console.log('✅ Cleaned up test record\n');
            console.log('🎉 Table is working correctly!');
            process.exit(0);
        }
    }

    // Table doesn't exist, create it
    console.log('❌ Table does not exist. Creating it now...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-claims-submissions-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('2️⃣ Running SQL script...');
    console.log('   SQL file:', sqlPath);

    // Execute the SQL using Supabase RPC or direct query
    // Note: Supabase doesn't allow direct DDL via the client, so we need to use the SQL Editor
    console.log('\n⚠️  Cannot create table via Supabase client.');
    console.log('📋 Please run this SQL in Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/_/sql\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter running the SQL, run this script again to verify.');
}

setupClaimsTable().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
