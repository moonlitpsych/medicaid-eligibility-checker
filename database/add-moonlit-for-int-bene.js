#!/usr/bin/env node

/**
 * Add Moonlit PLLC as preferred provider for INT-BENE-ADMIN
 * (temporarily, to test if org NPI works better than individual NPI)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMoonlitForIntBene() {
    console.log('🏥 Adding Moonlit PLLC as preferred for INT-BENE-ADMIN...\n');

    // Find Moonlit PLLC (NPI 1275348807)
    const { data: moonlit } = await supabase
        .from('providers')
        .select('id')
        .eq('npi', '1275348807')
        .single();

    console.log('Moonlit Provider ID:', moonlit.id);

    // Check if config exists
    const { data: existingConfig } = await supabase
        .from('provider_office_ally_configs')
        .select('*')
        .eq('provider_npi', '1275348807')
        .single();

    if (existingConfig) {
        console.log('✅ Config exists, updating...');

        // Add INT-BENE-ADMIN to both arrays
        const updatedSupported = [...new Set([...(existingConfig.supported_office_ally_payer_ids || []), 'INT-BENE-ADMIN'])];
        const updatedPreferred = [...new Set([...(existingConfig.is_preferred_for_payers || []), 'INT-BENE-ADMIN'])];

        const { data: updated, error } = await supabase
            .from('provider_office_ally_configs')
            .update({
                supported_office_ally_payer_ids: updatedSupported,
                is_preferred_for_payers: updatedPreferred
            })
            .eq('id', existingConfig.id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Updated config:');
            console.log('   Supported:', updated.supported_office_ally_payer_ids);
            console.log('   Preferred:', updated.is_preferred_for_payers);
        }
    } else {
        console.log('➕ No config exists, creating...');
        const { data: newConfig, error } = await supabase
            .from('provider_office_ally_configs')
            .insert({
                provider_id: moonlit.id,
                office_ally_provider_name: 'MOONLIT PLLC',
                provider_npi: '1275348807',
                supported_office_ally_payer_ids: ['INT-BENE-ADMIN'],
                is_preferred_for_payers: ['INT-BENE-ADMIN'],
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Created config:', newConfig);
        }
    }

    // Remove Anthony as preferred (temporarily)
    console.log('\n🔄 Updating Anthony to NOT be preferred (temporarily)...');
    const { data: anthonyConfig } = await supabase
        .from('provider_office_ally_configs')
        .select('*')
        .eq('provider_npi', '1336726843')
        .single();

    if (anthonyConfig) {
        const updatedPreferred = (anthonyConfig.is_preferred_for_payers || []).filter(p => p !== 'INT-BENE-ADMIN');
        await supabase
            .from('provider_office_ally_configs')
            .update({
                is_preferred_for_payers: updatedPreferred
            })
            .eq('id', anthonyConfig.id);

        console.log('✅ Anthony now preferred for:', updatedPreferred);
    }

    console.log('\n🎯 Moonlit PLLC is now preferred for INT-BENE-ADMIN');
    console.log('   Test with: node test-nicholas-smith.js');
}

addMoonlitForIntBene();
