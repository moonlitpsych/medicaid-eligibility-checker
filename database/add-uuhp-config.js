#!/usr/bin/env node

/**
 * Add UUHP to Office Ally Eligibility Configs
 *
 * Fixes: "Payer not configured: UNIV-UTHP" error
 *
 * This script adds University of Utah Health Plans (UUHP) to the
 * payer_office_ally_configs table so it can be used for eligibility checking.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addUUHPConfig() {
    console.log('🔍 Adding UUHP to Office Ally eligibility configs...\n');

    try {
        // Step 1: Find UUHP in payers table
        console.log('Step 1: Finding UUHP in payers table...');
        const { data: payers, error: payerError } = await supabase
            .from('payers')
            .select('id, name, state')
            .or('name.ilike.%university of utah health%,name.ilike.%uuhp%,name.ilike.%healthyu%');

        if (payerError) {
            throw new Error(`Error finding UUHP: ${payerError.message}`);
        }

        if (!payers || payers.length === 0) {
            throw new Error('UUHP not found in payers table. Please ensure UUHP exists first.');
        }

        console.log(`   ✅ Found ${payers.length} matching payer(s):`);
        payers.forEach(p => console.log(`      - ${p.name} (${p.state})`));

        const uuhpPayer = payers[0]; // Use first match
        console.log(`   📌 Using: ${uuhpPayer.name}\n`);

        // Step 2: Check if UUHP config already exists
        console.log('Step 2: Checking if UUHP config already exists...');
        const { data: existingConfig, error: checkError } = await supabase
            .from('payer_office_ally_configs')
            .select('*')
            .eq('office_ally_payer_id', 'UNIV-UTHP')
            .maybeSingle();

        if (checkError) {
            throw new Error(`Error checking existing config: ${checkError.message}`);
        }

        if (existingConfig) {
            console.log('   ⚠️  UUHP config already exists!');
            console.log(`      Office Ally ID: ${existingConfig.office_ally_payer_id}`);
            console.log(`      Display Name: ${existingConfig.payer_display_name}`);
            console.log('   ℹ️  No changes needed.\n');
            return;
        }

        console.log('   ✅ No existing config found. Proceeding with insert...\n');

        // Step 3: Insert UUHP config
        console.log('Step 3: Inserting UUHP Office Ally config...');
        const { data: newConfig, error: insertError } = await supabase
            .from('payer_office_ally_configs')
            .insert([{
                payer_id: uuhpPayer.id,
                office_ally_payer_id: 'UNIV-UTHP',
                payer_display_name: 'University of Utah Health Plans (UUHP)',
                category: 'Medicaid Managed Care',
                required_fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
                recommended_fields: ['memberNumber'],
                optional_fields: ['groupNumber'],
                requires_gender_in_dmg: true,
                supports_member_id_in_nm1: true,
                dtp_format: 'D8',
                allows_name_only: false,
                is_tested: false,
                test_notes: 'Ready for testing - UUHP Medicaid Managed Care plan'
            }])
            .select()
            .single();

        if (insertError) {
            throw new Error(`Error inserting config: ${insertError.message}`);
        }

        console.log('   ✅ UUHP config added successfully!');
        console.log(`      Office Ally ID: ${newConfig.office_ally_payer_id}`);
        console.log(`      Display Name: ${newConfig.payer_display_name}`);
        console.log(`      Category: ${newConfig.category}\n`);

        // Step 4: Verify by querying the view
        console.log('Step 4: Verifying configuration via view...');
        const { data: viewData, error: viewError } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', 'UNIV-UTHP')
            .single();

        if (viewError) {
            console.log('   ⚠️  Could not verify via view:', viewError.message);
        } else {
            console.log('   ✅ Configuration verified in view!');
            console.log('      Payer Name:', viewData.payer_name);
            console.log('      Display Name:', viewData.payer_display_name);
            console.log('      Required Fields:', viewData.required_fields);
            console.log('      Recommended Fields:', viewData.recommended_fields);
        }

        console.log('\n🎉 UUHP configuration complete!');
        console.log('   You can now check eligibility for UUHP patients.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
addUUHPConfig()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
