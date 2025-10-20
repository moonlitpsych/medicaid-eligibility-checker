#!/usr/bin/env node

/**
 * Fix INT-BENE-ADMIN Configuration
 *
 * This script fixes the First Health Network / International Benefits Administrators
 * configuration by properly adding records to both the payers table and the
 * payer_office_ally_configs table with correct foreign key relationships.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFix() {
    console.log('🔧 Fixing INT-BENE-ADMIN configuration...\n');

    try {
        // Step 1: Add/update payer in payers table
        console.log('Step 1: Adding/updating payer in payers table...');
        const { data: payerData, error: payerError } = await supabase
            .from('payers')
            .upsert({
                name: 'International Benefits Administrators (First Health Network)',
                payer_type: 'Commercial',
                state: null,
                oa_eligibility_270_id: 'INT-BENE-ADMIN',
                oa_professional_837p_id: '11329',
                oa_remit_835_id: '11329',
                status_code: 'active'
            }, {
                onConflict: 'name',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (payerError) {
            console.error('❌ Error adding payer:', payerError);
            throw payerError;
        }

        console.log('✅ Payer record:', payerData);
        const payerId = payerData.id;

        // Step 2: Add/update payer_office_ally_configs
        console.log('\nStep 2: Adding/updating payer_office_ally_configs...');
        const { data: configData, error: configError } = await supabase
            .from('payer_office_ally_configs')
            .upsert({
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
            }, {
                onConflict: 'office_ally_payer_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (configError) {
            console.error('❌ Error adding config:', configError);
            throw configError;
        }

        console.log('✅ Config record:', configData);

        // Step 3: Verify the VIEW returns data
        console.log('\nStep 3: Verifying v_office_ally_eligibility_configs VIEW...');
        const { data: viewData, error: viewError } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', 'INT-BENE-ADMIN')
            .single();

        if (viewError) {
            console.error('❌ Error querying VIEW:', viewError);
            throw viewError;
        }

        console.log('✅ VIEW returns data:', viewData);

        // Step 4: Verify Anthony Privratsky configuration
        console.log('\nStep 4: Verifying Anthony Privratsky provider config...');
        const { data: providerData, error: providerError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .eq('provider_npi', '1336726843')
            .single();

        if (providerError) {
            console.warn('⚠️ Anthony Privratsky not configured yet:', providerError.message);
            console.log('   You may need to configure him separately.');
        } else {
            console.log('✅ Anthony Privratsky config:', {
                name: providerData.office_ally_provider_name,
                npi: providerData.provider_npi,
                preferred_for: providerData.is_preferred_for_payers,
                supported: providerData.supported_office_ally_payer_ids
            });
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
