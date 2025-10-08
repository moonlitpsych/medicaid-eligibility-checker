// List all unique insurance names in IntakeQ database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function listInsuranceNames() {
    console.log('🔍 Fetching all insurance names from database...\n');

    const { data: patients, error } = await supabase
        .from('intakeq_clients')
        .select('primary_insurance_name, first_name, last_name')
        .not('primary_insurance_name', 'is', null)
        .order('primary_insurance_name');

    if (error) {
        console.error('❌ Error querying database:', error);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('⚠️  No patients with insurance found in database');
        console.log('💡 Tip: Run `curl -X POST http://localhost:3000/api/intakeq/clients/sync` to sync from IntakeQ');
        return;
    }

    // Group by insurance name
    const insuranceMap = {};
    patients.forEach(patient => {
        const name = patient.primary_insurance_name;
        if (!insuranceMap[name]) {
            insuranceMap[name] = [];
        }
        insuranceMap[name].push(`${patient.first_name} ${patient.last_name}`);
    });

    console.log(`✅ Found ${Object.keys(insuranceMap).length} unique insurance names:\n`);

    Object.entries(insuranceMap).sort().forEach(([insuranceName, patientList]) => {
        console.log(`\n📋 ${insuranceName} (${patientList.length} patient${patientList.length > 1 ? 's' : ''})`);
        patientList.forEach(name => {
            console.log(`   • ${name}`);
        });
    });

    console.log('\n');
}

listInsuranceNames();
