#!/usr/bin/env node

/**
 * Update v_provider_office_ally_configs VIEW to include tax_id
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateView() {
    console.log('🔧 Updating v_provider_office_ally_configs VIEW to include tax_id...\n');

    const sql = `
        CREATE OR REPLACE VIEW v_provider_office_ally_configs AS
        SELECT
            proac.id AS config_id,
            proac.provider_id,
            p.first_name,
            p.last_name,
            p.npi,
            p.tax_id,
            proac.office_ally_provider_name,
            proac.provider_npi,
            proac.supported_office_ally_payer_ids,
            proac.is_preferred_for_payers,
            proac.notes,
            proac.is_active,
            proac.created_at,
            proac.updated_at
        FROM provider_office_ally_configs proac
        JOIN providers p ON p.id = proac.provider_id
        WHERE proac.is_active = true
        ORDER BY p.last_name, p.first_name;
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { query: sql });

        if (error) {
            // Try direct query if RPC doesn't exist
            console.log('Trying direct SQL execution...');
            const { error: directError } = await supabase.from('_sql').select().eq('query', sql);

            if (directError) {
                console.error('❌ Could not update VIEW via Supabase client');
                console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
                console.log('=====================================');
                console.log(sql);
                console.log('=====================================\n');
                return;
            }
        }

        console.log('✅ VIEW updated successfully!');

        // Verify it worked
        const { data, error: verifyError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('tax_id')
            .eq('provider_npi', '1275348807')
            .single();

        if (verifyError) {
            console.warn('⚠️ Could not verify UPDATE - check manually');
        } else if (data && data.tax_id) {
            console.log('✅ Verified: tax_id is now in VIEW');
            console.log('   Moonlit PLLC TIN:', data.tax_id);
        } else {
            console.warn('⚠️ tax_id not found in VIEW - may need to run SQL manually');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
        console.log('=====================================');
        console.log(sql);
        console.log('=====================================\n');
    }
}

updateView();
