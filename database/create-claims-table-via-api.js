// database/create-claims-table-via-api.js
// Creates claims_submissions table in Supabase via SQL execution

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function createClaimsTable() {
    console.log('🔧 Creating claims_submissions table in Supabase...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-claims-submissions-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('❌ Missing Supabase credentials');
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
        console.error('   SUPABASE_SERVICE_KEY:', !!serviceKey);
        process.exit(1);
    }

    console.log('1️⃣ Executing SQL via Supabase REST API...');
    console.log(`   URL: ${supabaseUrl}/rest/v1/rpc/exec_sql\n`);

    // Supabase doesn't have a direct SQL execution endpoint in the REST API
    // We need to use the PostgREST admin API or create an RPC function
    // Let me try a different approach using fetch to the SQL endpoint

    console.log('⚠️  Supabase REST API does not support direct DDL execution.');
    console.log('📋 You need to run the SQL in Supabase Dashboard:\n');
    console.log('1. Go to: https://app.supabase.com/project/_/sql/new');
    console.log('2. Copy and paste the SQL below:');
    console.log('3. Click "Run" to execute\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n✅ After running the SQL, test the table with:');
    console.log('   node database/setup-claims-table.js\n');
}

createClaimsTable().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
