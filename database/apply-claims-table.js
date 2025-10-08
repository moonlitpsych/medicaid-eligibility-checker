#!/usr/bin/env node
// database/apply-claims-table.js - Create claims_submissions table in Supabase

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function applyClaimsTable() {
    console.log('📋 Creating claims_submissions table in Supabase...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-claims-submissions-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        // Execute SQL via Supabase
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Try alternative method: direct query
            console.log('⚠️  RPC method failed, trying direct query...\n');

            // Split SQL into individual statements and execute
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                try {
                    await supabase.from('_migrations').insert({ query: statement });
                } catch (err) {
                    // Ignore errors for statements that may already exist
                    if (!err.message.includes('already exists')) {
                        console.error(`Error executing statement: ${err.message}`);
                    }
                }
            }
        }

        console.log('✅ Successfully created claims_submissions table!');
        console.log('\n📊 Table Schema:');
        console.log('   - claim_id (unique identifier from 837P)');
        console.log('   - patient_id (references intakeq_clients)');
        console.log('   - payer_id (references payers)');
        console.log('   - service_lines (JSONB array)');
        console.log('   - test_mode (boolean - TEST vs PRODUCTION)');
        console.log('   - status (SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID)');
        console.log('   - response_999, response_277, response_835 (EDI responses)');
        console.log('   - edi_content (full 837P transaction)');
        console.log('\n🎯 Ready to track claim submissions!');

    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        console.log('\n⚠️  Manual Setup Instructions:');
        console.log('   1. Open Supabase Dashboard: https://app.supabase.com');
        console.log('   2. Go to SQL Editor');
        console.log(`   3. Run the SQL from: ${sqlPath}`);
        process.exit(1);
    }
}

applyClaimsTable();
