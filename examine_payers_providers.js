// examine_payers_providers.js - Examine Payer and Provider Data (READ-ONLY)

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function examinePayersAndProviders() {
    console.log('🔍 EXAMINING PAYERS AND PROVIDERS DATA (READ-ONLY)');
    console.log('='.repeat(65));
    
    try {
        // Examine PAYERS table
        console.log('\n💰 PAYERS TABLE (30 rows):');
        console.log('='.repeat(30));
        
        const { data: payers, error: payersError } = await supabase
            .from('payers')
            .select('*')
            .limit(5);
            
        if (payersError) {
            console.error('Error reading payers:', payersError);
        } else if (payers && payers.length > 0) {
            console.log('📋 Column structure:');
            console.log(Object.keys(payers[0]).join(', '));
            console.log('\n📊 Sample payer data:');
            payers.forEach((payer, index) => {
                console.log(`\n--- Payer ${index + 1} ---`);
                console.log(JSON.stringify(payer, null, 2));
            });
            
            // Look for Utah Medicaid specifically
            const { data: utahMedicaid, error: utahError } = await supabase
                .from('payers')
                .select('*')
                .ilike('name', '%medicaid%')
                .limit(5);
                
            if (!utahError && utahMedicaid && utahMedicaid.length > 0) {
                console.log('\n🎯 FOUND MEDICAID PAYERS:');
                utahMedicaid.forEach((payer, index) => {
                    console.log(`\n--- Medicaid Payer ${index + 1} ---`);
                    console.log(JSON.stringify(payer, null, 2));
                });
            }
        }
        
        // Examine PROVIDERS table
        console.log('\n\n👨‍⚕️ PROVIDERS TABLE (12 rows):');
        console.log('='.repeat(32));
        
        const { data: providers, error: providersError } = await supabase
            .from('providers')
            .select('*')
            .limit(5);
            
        if (providersError) {
            console.error('Error reading providers:', providersError);
        } else if (providers && providers.length > 0) {
            console.log('📋 Column structure:');
            console.log(Object.keys(providers[0]).join(', '));
            console.log('\n📊 Sample provider data:');
            providers.forEach((provider, index) => {
                console.log(`\n--- Provider ${index + 1} ---`);
                console.log(JSON.stringify(provider, null, 2));
            });
            
            // Look for NPIs specifically
            const npiColumns = Object.keys(providers[0]).filter(col => 
                col.toLowerCase().includes('npi') || 
                col.toLowerCase().includes('number') ||
                col.toLowerCase().includes('identifier')
            );
            
            if (npiColumns.length > 0) {
                console.log(`\n🔍 Found potential NPI columns: ${npiColumns.join(', ')}`);
            }
        }
        
        // Check if there are any contract/network relationships
        console.log('\n\n🤝 CHECKING CONTRACT RELATIONSHIPS:');
        console.log('='.repeat(40));
        
        const contractTables = ['contracts', 'networks', 'payer_providers', 'provider_networks'];
        
        for (const tableName of contractTables) {
            try {
                const { data, error, count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact' })
                    .limit(3);
                
                if (!error && data) {
                    console.log(`\n✅ ${tableName.toUpperCase()} (${count || 0} rows):`);
                    if (data.length > 0) {
                        console.log('📋 Columns:', Object.keys(data[0]).join(', '));
                        console.log('📊 Sample data:');
                        console.log(JSON.stringify(data[0], null, 2));
                    } else {
                        console.log('   (No data yet)');
                    }
                }
            } catch (e) {
                // Table doesn't exist
            }
        }
        
        // Summary for Office Ally integration
        console.log('\n\n🎯 OFFICE ALLY INTEGRATION ANALYSIS:');
        console.log('='.repeat(45));
        console.log('Based on the raw X12 271 response, we found:');
        console.log('• Utah Medicaid payer ID: UTMCD');
        console.log('• Transportation provider: MODIVCARE (ID: 2000003)');
        console.log('• Service codes: 30 (Medical), 60 (Hospital), MH (Mental Health), etc.');
        console.log('\nNext step: Cross-reference Office Ally payers with your contracted payers');
        
    } catch (error) {
        console.error('Examination error:', error);
    }
}

examinePayersAndProviders()
    .then(() => {
        console.log('\n✅ Payer and provider examination complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Examination failed:', error);
        process.exit(1);
    });