#!/usr/bin/env node

/**
 * Fix INT-BENE-ADMIN Configuration (v2)
 *
 * Uses check-then-insert/update pattern instead of upsert
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFix() {
    console.log('🔧 Fixing INT-BENE-ADMIN configuration (v2)...\n');

    try {
        const payerName = 'International Benefits Administrators (First Health Network)';

        // Step 1: Check if payer exists
        console.log('Step 1: Checking if payer exists...');
        let { data: existingPayer, error: checkError } = await supabase
            .from('payers')
            .select('*')
            .eq('name', payerName)
            .maybeSingle();

        if (checkError) {
            console.error('❌ Error checking payer:', checkError);
            throw checkError;
        }

        let payerId;

        if (existingPayer) {
            console.log('✅ Payer already exists, updating...');
            const { data: updatedPayer, error: updateError } = await supabase
                .from('payers')
                .update({
                    payer_type: 'Commercial',
                    oa_eligibility_270_id: 'INT-BENE-ADMIN',
                    oa_professional_837p_id: '11329',
                    oa_remit_835_id: '11329'
                })
                .eq('id', existingPayer.id)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Error updating payer:', updateError);
                throw updateError;
            }

            payerId = updatedPayer.id;
            console.log('✅ Updated payer:', updatedPayer);
        } else {
            console.log('➕ Payer does not exist, creating...');
            const { data: newPayer, error: insertError } = await supabase
                .from('payers')
                .insert({
                    name: payerName,
                    payer_type: 'Commercial',
                    state: null,
                    oa_eligibility_270_id: 'INT-BENE-ADMIN',
                    oa_professional_837p_id: '11329',
                    oa_remit_835_id: '11329'
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ Error inserting payer:', insertError);
                throw insertError;
            }

            payerId = newPayer.id;
            console.log('✅ Created payer:', newPayer);
        }

        // Step 2: Check if config exists
        console.log('\nStep 2: Checking if payer_office_ally_configs exists...');
        let { data: existingConfig, error: configCheckError } = await supabase
            .from('payer_office_ally_configs')
            .select('*')
            .eq('office_ally_payer_id', 'INT-BENE-ADMIN')
            .maybeSingle();

        if (configCheckError) {
            console.error('❌ Error checking config:', configCheckError);
            throw configCheckError;
        }

        if (existingConfig) {
            console.log('✅ Config already exists, updating...');
            const { data: updatedConfig, error: updateConfigError } = await supabase
                .from('payer_office_ally_configs')
                .update({
                    payer_id: payerId,
                    payer_display_name: 'International Benefits Administrators (First Health Network)',
                    category: 'Commercial',
                    required_fields: ['firstName', 'lastName', 'dateOfBirth', 'memberNumber'],
                    recommended_fields: ['gender'],
                    optional_fields: ['groupNumber'],
                    requires_gender_in_dmg: false,
                    supports_member_id_in_nm1: true,
                    dtp_format: 'D8',
                    allows_name_only: false,
                    is_tested: false,
                    test_notes: 'Nicholas Smith patient - Member ID: AFLMFEA684623879, DOB: 03/26/2004, Effective: 01/01/2025'
                })
                .eq('id', existingConfig.id)
                .select()
                .single();

            if (updateConfigError) {
                console.error('❌ Error updating config:', updateConfigError);
                throw updateConfigError;
            }

            console.log('✅ Updated config:', updatedConfig);
        } else {
            console.log('➕ Config does not exist, creating...');
            const { data: newConfig, error: insertConfigError } = await supabase
                .from('payer_office_ally_configs')
                .insert({
                    payer_id: payerId,
                    office_ally_payer_id: 'INT-BENE-ADMIN',
                    payer_display_name: 'International Benefits Administrators (First Health Network)',
                    category: 'Commercial',
                    required_fields: ['firstName', 'lastName', 'dateOfBirth', 'memberNumber'],
                    recommended_fields: ['gender'],
                    optional_fields: ['groupNumber'],
                    requires_gender_in_dmg: false,
                    supports_member_id_in_nm1: true,
                    dtp_format: 'D8',
                    allows_name_only: false,
                    is_tested: false,
                    test_notes: 'Nicholas Smith patient - Member ID: AFLMFEA684623879, DOB: 03/26/2004, Effective: 01/01/2025'
                })
                .select()
                .single();

            if (insertConfigError) {
                console.error('❌ Error inserting config:', insertConfigError);
                throw insertConfigError;
            }

            console.log('✅ Created config:', newConfig);
        }

        // Step 3: Verify the VIEW returns data
        console.log('\nStep 3: Verifying v_office_ally_eligibility_configs VIEW...');
        const { data: viewData, error: viewError } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', 'INT-BENE-ADMIN')
            .maybeSingle();

        if (viewError) {
            console.error('❌ Error querying VIEW:', viewError);
            throw viewError;
        }

        if (viewData) {
            console.log('✅ VIEW returns data:');
            console.log('   Office Ally ID:', viewData.office_ally_payer_id);
            console.log('   Display Name:', viewData.payer_display_name);
            console.log('   Category:', viewData.category);
            console.log('   Tested:', viewData.is_tested);
        } else {
            console.log('❌ VIEW still returns no data - there may be a JOIN issue');
        }

        // Step 4: Verify Anthony Privratsky configuration
        console.log('\nStep 4: Verifying Anthony Privratsky provider config...');
        const { data: providerData, error: providerError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .eq('provider_npi', '1336726843')
            .maybeSingle();

        if (providerError || !providerData) {
            console.warn('⚠️ Anthony Privratsky not configured yet');
            console.log('   You may need to configure him separately.');
        } else {
            console.log('✅ Anthony Privratsky config:');
            console.log('   Name:', providerData.office_ally_provider_name);
            console.log('   NPI:', providerData.provider_npi);
            console.log('   Preferred for:', providerData.is_preferred_for_payers);
            console.log('   Supported:', providerData.supported_office_ally_payer_ids);
        }

        console.log('\n🎉 Fix completed successfully!');
        console.log('\nNext step: Test with Nicholas Smith:');
        console.log('  node test-nicholas-smith.js');

    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        process.exit(1);
    }
}

runFix();
