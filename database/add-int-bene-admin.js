// Add International Benefits Administrators to Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addInternationalBenefitsAdmin() {
    console.log('🔧 Adding International Benefits Administrators to payers table...\n');

    // Add to payers table
    const { data: payerData, error: payerError } = await supabase
        .from('payers')
        .upsert({
            name: 'International Benefits Administrators',
            display_name: 'International Benefits Administrators (First Health Network)',
            payer_type: 'Commercial',
            oa_eligibility_270_id: 'INT-BENE-ADMIN',
            oa_professional_837p_id: '11329',
            oa_remit_835_id: '11329',
            requires_member_id: true,
            supports_real_time_eligibility: true,
            notes: 'TPA for American Life Insurance Co. using First Health Network. Also accepts payer ID 11329 (EDI Payor ID from card).'
        }, {
            onConflict: 'name'
        })
        .select();

    if (payerError) {
        console.error('❌ Error adding to payers table:', payerError);
        return;
    }

    console.log('✅ Added to payers table:', payerData);

    // Add to office_ally_eligibility_configs table
    const { data: configData, error: configError } = await supabase
        .from('office_ally_eligibility_configs')
        .upsert({
            office_ally_payer_id: 'INT-BENE-ADMIN',
            payer_name: 'International Benefits Administrators (First Health Network)',
            category: 'Commercial',
            requires_member_id: true,
            requires_gender: false,
            dtp_format: 'D8',
            special_requirements: 'TPA for American Life Insurance Co. Member ID format: AFLMFEA######## (letters + numbers)'
        }, {
            onConflict: 'office_ally_payer_id'
        })
        .select();

    if (configError) {
        console.error('❌ Error adding to eligibility configs:', configError);
        return;
    }

    console.log('✅ Added to eligibility configs:', configData);

    console.log('\n🎉 International Benefits Administrators configured successfully!');
    console.log('\nYou can now check eligibility for Nicholas Smith using payer ID: INT-BENE-ADMIN');
}

addInternationalBenefitsAdmin();
