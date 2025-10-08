// Quick script to find Aetna/First Health Network patients in IntakeQ database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function findAetnaPatients() {
    console.log('🔍 Searching for Aetna/First Health Network patients...\n');

    const { data: patients, error } = await supabase
        .from('intakeq_clients')
        .select('first_name, last_name, date_of_birth, primary_insurance_name, primary_insurance_policy_number, email')
        .or('primary_insurance_name.ilike.%aetna%,primary_insurance_name.ilike.%first health%')
        .order('last_name');

    if (error) {
        console.error('❌ Error querying database:', error);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('⚠️  No Aetna or First Health Network patients found in database');
        return;
    }

    console.log(`✅ Found ${patients.length} patient(s) with Aetna/First Health Network:\n`);

    patients.forEach((patient, index) => {
        console.log(`\n${index + 1}. ${patient.first_name} ${patient.last_name}`);
        console.log(`   DOB: ${patient.date_of_birth}`);
        console.log(`   Insurance: ${patient.primary_insurance_name}`);
        console.log(`   Member ID: ${patient.primary_insurance_policy_number || 'Not provided'}`);
        console.log(`   Email: ${patient.email || 'Not provided'}`);
    });

    console.log('\n---\n');
    console.log('📋 Ready to test! Access the local eligibility interface at:');
    console.log('   http://localhost:3000/public/universal-eligibility-interface.html');
    console.log('\n');
}

findAetnaPatients();
