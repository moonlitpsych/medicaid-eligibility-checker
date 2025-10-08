// database/apply-payer-updates.js
// Apply Office Ally payer ID updates to Supabase after reviewing matches

require('dotenv').config({ path: '../.env.local' });
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function main() {
    console.log('🔄 Applying Office Ally Payer Updates\n');
    console.log('═'.repeat(80));

    try {
        // 1. Load match data
        console.log('\n1️⃣  Loading match data...');
        const matchData = JSON.parse(await fs.readFile('payer-matches.json', 'utf-8'));
        const { matches } = matchData;

        if (!matches || matches.length === 0) {
            console.log('   ⚠️  No matches found. Run match-and-update-payers.js first.');
            return;
        }

        console.log(`   ✅ Loaded ${matches.length} payer matches`);

        // 2. Prepare updates
        console.log('\n2️⃣  Preparing updates...');
        const updates = [];

        for (const match of matches) {
            const update = {
                id: match.dbPayer.id,
                name: match.dbPayer.name
            };

            // Get eligibility ID
            if (match.matches.eligibility?.ids?.oa_eligibility_270_id) {
                update.oa_eligibility_270_id = match.matches.eligibility.ids.oa_eligibility_270_id;
            }

            // Get claims/ERA IDs
            if (match.matches.claims?.ids?.oa_professional_837p_id) {
                update.oa_professional_837p_id = match.matches.claims.ids.oa_professional_837p_id;
            }
            if (match.matches.claims?.ids?.oa_remit_835_id) {
                update.oa_remit_835_id = match.matches.claims.ids.oa_remit_835_id;
            }

            // Only add if we have at least one ID
            if (update.oa_eligibility_270_id || update.oa_professional_837p_id || update.oa_remit_835_id) {
                updates.push(update);
            }
        }

        console.log(`   ✅ Prepared ${updates.length} updates`);

        // 3. Show what will be updated
        console.log('\n3️⃣  Updates to be applied:\n');
        updates.forEach((update, idx) => {
            console.log(`   ${idx + 1}. ${update.name}`);
            if (update.oa_eligibility_270_id) {
                console.log(`      → oa_eligibility_270_id: ${update.oa_eligibility_270_id}`);
            }
            if (update.oa_professional_837p_id) {
                console.log(`      → oa_professional_837p_id: ${update.oa_professional_837p_id}`);
            }
            if (update.oa_remit_835_id) {
                console.log(`      → oa_remit_835_id: ${update.oa_remit_835_id}`);
            }
        });

        // 4. Apply updates
        console.log('\n4️⃣  Applying updates to Supabase...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const update of updates) {
            try {
                const { error } = await supabase
                    .from('payers')
                    .update({
                        oa_eligibility_270_id: update.oa_eligibility_270_id || null,
                        oa_professional_837p_id: update.oa_professional_837p_id || null,
                        oa_remit_835_id: update.oa_remit_835_id || null
                    })
                    .eq('id', update.id);

                if (error) {
                    console.error(`   ❌ Failed to update ${update.name}:`, error.message);
                    errorCount++;
                } else {
                    console.log(`   ✅ Updated ${update.name}`);
                    successCount++;
                }
            } catch (error) {
                console.error(`   ❌ Error updating ${update.name}:`, error.message);
                errorCount++;
            }
        }

        // 5. Summary
        console.log('\n' + '═'.repeat(80));
        console.log('📊 UPDATE SUMMARY\n');
        console.log(`   ✅ Successfully updated: ${successCount} payers`);
        if (errorCount > 0) {
            console.log(`   ❌ Failed: ${errorCount} payers`);
        }
        console.log('═'.repeat(80));

        // 6. Verification query
        console.log('\n5️⃣  Verifying updates...\n');
        const { data: verifyData, error: verifyError } = await supabase
            .from('payers')
            .select('name, oa_eligibility_270_id, oa_professional_837p_id, oa_remit_835_id')
            .not('oa_eligibility_270_id', 'is', null)
            .order('name');

        if (verifyError) {
            console.error('   ⚠️  Verification failed:', verifyError.message);
        } else {
            console.log(`   📊 Payers with Office Ally IDs: ${verifyData.length}\n`);
            verifyData.forEach(payer => {
                console.log(`   • ${payer.name}`);
                if (payer.oa_eligibility_270_id) {
                    console.log(`     270/271: ${payer.oa_eligibility_270_id}`);
                }
                if (payer.oa_professional_837p_id) {
                    console.log(`     837P: ${payer.oa_professional_837p_id}`);
                }
                if (payer.oa_remit_835_id) {
                    console.log(`     835: ${payer.oa_remit_835_id}`);
                }
            });
        }

        console.log('\n✅ Update complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
