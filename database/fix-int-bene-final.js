#!/usr/bin/env node

/**
 * Fix INT-BENE-ADMIN - Final Fix
 *
 * Simply update the existing config to use the correct Office Ally payer ID
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixConfig() {
    console.log('🔧 Fixing INT-BENE-ADMIN configuration - Final Fix\n');

    try {
        // Get the payer ID
        const { data: payer } = await supabase
            .from('payers')
            .select('id')
            .eq('name', 'International Benefits Administrators (First Health Network)')
            .single();

        const payerId = payer.id;
        console.log('Payer ID:', payerId);

        // Update the config to use INT-BENE-ADMIN instead of 11329
        console.log('\nUpdating config to use correct Office Ally payer ID...');
        const { data: updatedConfig, error: updateError } = await supabase
            .from('payer_office_ally_configs')
            .update({
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
                test_notes: 'Nicholas Smith patient - Member ID: AFLMFEA684623879, DOB: 03/26/2004, Effective: 01/01/2025. Changed from 11329 to INT-BENE-ADMIN (correct Office Ally eligibility ID).'
            })
            .eq('payer_id', payerId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating config:', updateError);
            throw updateError;
        }

        console.log('✅ Config updated successfully:');
        console.log('   Office Ally ID:', updatedConfig.office_ally_payer_id);
        console.log('   Display Name:', updatedConfig.payer_display_name);

        // Verify VIEW now returns data
        console.log('\n🔍 Verifying VIEW returns data...');
        const { data: viewData, error: viewError } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', 'INT-BENE-ADMIN')
            .single();

        if (viewError) {
            console.error('❌ VIEW query failed:', viewError);
            throw viewError;
        }

        console.log('✅ VIEW returns data:');
        console.log('   Office Ally ID:', viewData.office_ally_payer_id);
        console.log('   Display Name:', viewData.payer_display_name);
        console.log('   Category:', viewData.category);
        console.log('   Payer Name:', viewData.payer_name);
        console.log('   Required Fields:', viewData.required_fields);

        // Verify eligibility service will find it
        console.log('\n🔍 Testing eligibility service lookup...');
        const { data: serviceTest, error: serviceError } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', 'INT-BENE-ADMIN')
            .single();

        if (serviceError) {
            console.error('❌ Service lookup failed:', serviceError);
            throw serviceError;
        }

        console.log('✅ Eligibility service will find this payer');

        console.log('\n🎉 Fix completed successfully!\n');
        console.log('Next steps:');
        console.log('1. Test with Nicholas Smith: node test-nicholas-smith.js');
        console.log('2. If that works, test via API: node api-server.js');

    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        process.exit(1);
    }
}

fixConfig();
