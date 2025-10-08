// database/match-and-update-payers.js
// Surgically match YOUR 25 payers against Office Ally CSV and update IDs
//
// This script:
// 1. Reads your existing 25 payers from Supabase
// 2. Fuzzy matches them against Office Ally CSV
// 3. Shows you the proposed matches for review
// 4. Updates ONLY your existing payers (no mass import)

require('dotenv').config({ path: '../.env.local' });
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Fuzzy match payer names
function fuzzyMatch(dbName, csvName) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const db = normalize(dbName);
    const csv = normalize(csvName);

    // Exact match after normalization
    if (db === csv) return 100;

    // Check if one contains the other
    if (csv.includes(db) || db.includes(csv)) return 90;

    // Check for key words
    const dbWords = dbName.toLowerCase().split(/\s+/);
    const csvWords = csvName.toLowerCase().split(/\s+/);

    let matchedWords = 0;
    for (const dbWord of dbWords) {
        if (dbWord.length > 3 && csvWords.some(csvWord => csvWord.includes(dbWord) || dbWord.includes(csvWord))) {
            matchedWords++;
        }
    }

    return (matchedWords / Math.max(dbWords.length, csvWords.length)) * 80;
}

// Manual override mappings for tricky cases
// Based on manual verification against Office Ally CSV
const MANUAL_OVERRIDES = {
    // Utah Medicaid - CRITICAL
    'Utah Medicaid Fee-for-Service': {
        eligibilityName: 'Medicaid Utah',
        claimsName: 'Medicaid Utah'
    },

    // UUHP - Two variations in your database
    'HealthyU (UUHP)': {
        eligibilityName: 'University of Utah Health Plans',
        claimsName: 'University of Utah Health Plans'
    },
    'University of Utah Health Plans (UUHP)': {
        eligibilityName: 'University of Utah Health Plans',
        claimsName: 'University of Utah Health Plans'
    },

    // Regence - Specify Utah version (ID 00910, NOT Oregon 00851)
    'Regence BlueCross BlueShield': {
        eligibilityName: 'BCBS Utah (Regence)',
        claimsName: 'BCBS Utah (Regence)'
    },

    // Molina Utah - IMPORTANT
    'Molina Utah': {
        eligibilityName: 'Molina Healthcare of Utah',
        claimsName: 'Molina Healthcare of Utah'
    },

    // Idaho Medicaid - Was incorrectly matching to "Medica"
    'Idaho Medicaid': {
        eligibilityName: 'Medicaid Idaho',
        claimsName: 'Medicaid Idaho'
    },

    // SelectHealth - Important Utah payer
    'SelectHealth Integrated': {
        eligibilityName: 'Select Health of Utah',
        claimsName: 'Select Health of Utah'
    },

    // Optum - Was incorrectly matching to "Medica"
    'Optum Salt Lake and Tooele County Medicaid Network': {
        eligibilityName: 'Optum / Salt Lake County (Medicaid)',
        claimsName: 'Optum / Salt Lake County (Medicaid)'
    },

    // Optum Commercial - Behavioral health specific
    'Optum Commercial Behavioral Health': {
        eligibilityName: 'Optum United Health Behavioral Solutions',
        claimsName: 'Optum United Health Behavioral Solutions'
    },

    // Aetna - Make sure we get exact match
    'Aetna': {
        eligibilityName: 'Aetna Healthcare',
        claimsName: 'Aetna Healthcare'
    },

    // United Healthcare - Ensure proper match
    'United Healthcare': {
        eligibilityName: 'United Healthcare',
        claimsName: 'United Healthcare'
    }
};

// Parse CSV line
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Parse Office Ally CSV
async function parseOfficeAllyCSV(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });
            data.push(row);
        }
    }
    return data;
}

// Group Office Ally CSV by payer name
function groupOfficeAllyData(csvRows) {
    const payerMap = new Map();

    for (const row of csvRows) {
        const payerName = row['PAYER NAME'];
        const payerId = row['PAYER ID'];
        const transaction = row['TRANSACTION'];

        if (!payerMap.has(payerName)) {
            payerMap.set(payerName, {
                name: payerName,
                ids: {}
            });
        }

        const payer = payerMap.get(payerName);

        // Map transaction types to our column names
        if (transaction === 'Eligibility 270 / 271') {
            payer.ids.oa_eligibility_270_id = payerId;
        } else if (transaction === 'Professional Claims 837P') {
            payer.ids.oa_professional_837p_id = payerId;
        } else if (transaction === 'Remits 835') {
            payer.ids.oa_remit_835_id = payerId;
        }
    }

    return payerMap;
}

// Find best Office Ally match for a database payer
function findBestMatch(dbPayer, officeAllyMap) {
    // Check manual overrides first (normalize name by trimming)
    const normalizedName = dbPayer.name.trim();
    const override = MANUAL_OVERRIDES[normalizedName];
    if (override) {
        // Look for ALL matching entries (including variations like "aka")
        const eligibilityMatches = Array.from(officeAllyMap.entries())
            .filter(([name]) => name.toLowerCase().includes(override.eligibilityName.toLowerCase()));

        const claimsMatches = Array.from(officeAllyMap.entries())
            .filter(([name]) => name.toLowerCase().includes(override.claimsName.toLowerCase()));

        // Merge IDs from all matching variations
        const mergedEligibilityIds = {};
        const mergedClaimsIds = {};

        eligibilityMatches.forEach(([name, data]) => {
            Object.assign(mergedEligibilityIds, data.ids);
        });

        claimsMatches.forEach(([name, data]) => {
            Object.assign(mergedClaimsIds, data.ids);
        });

        if (eligibilityMatches.length > 0 || claimsMatches.length > 0) {
            return {
                dbPayer,
                matches: {
                    eligibility: eligibilityMatches.length > 0 ? {
                        name: eligibilityMatches[0][0],
                        ids: mergedEligibilityIds,
                        score: 100
                    } : null,
                    claims: claimsMatches.length > 0 ? {
                        name: claimsMatches[0][0],
                        ids: mergedClaimsIds,
                        score: 100
                    } : null
                },
                isManualOverride: true
            };
        }
    }

    // Fuzzy match
    let bestMatch = null;
    let bestScore = 0;

    for (const [oaName, oaData] of officeAllyMap.entries()) {
        const score = fuzzyMatch(dbPayer.name, oaName);
        if (score > bestScore && score >= 70) { // Minimum 70% confidence
            bestScore = score;
            bestMatch = { name: oaName, ids: oaData.ids, score };
        }
    }

    return bestMatch ? {
        dbPayer,
        matches: {
            eligibility: bestMatch,
            claims: bestMatch // Usually same match for both
        },
        isManualOverride: false
    } : null;
}

// Main function
async function main() {
    console.log('🔍 Office Ally Payer Matching Tool\n');
    console.log('═'.repeat(80));

    try {
        // 1. Fetch existing payers from Supabase
        console.log('\n1️⃣  Fetching your existing payers from Supabase...');
        const { data: dbPayers, error: fetchError } = await supabase
            .from('payers')
            .select('*')
            .neq('payer_type', 'self_pay')
            .order('name');

        if (fetchError) throw fetchError;

        console.log(`   ✅ Found ${dbPayers.length} insurance payers in database`);

        // 2. Parse Office Ally CSV
        console.log('\n2️⃣  Parsing Office Ally CSV...');
        const csvPath = '../payers (1).xlsx - Payers.csv';
        const csvRows = await parseOfficeAllyCSV(csvPath);
        const officeAllyMap = groupOfficeAllyData(csvRows);
        console.log(`   ✅ Parsed ${officeAllyMap.size} unique payers from Office Ally CSV`);

        // 3. Match each database payer
        console.log('\n3️⃣  Matching your payers against Office Ally data...\n');
        const matches = [];
        const noMatches = [];

        for (const dbPayer of dbPayers) {
            const match = findBestMatch(dbPayer, officeAllyMap);
            if (match) {
                matches.push(match);
            } else {
                noMatches.push(dbPayer);
            }
        }

        // 4. Display matches for review
        console.log('═'.repeat(80));
        console.log('📋 PROPOSED MATCHES (Please Review)\n');
        console.log('═'.repeat(80));

        matches.forEach((match, idx) => {
            console.log(`\n${idx + 1}. ${match.dbPayer.name} (${match.dbPayer.payer_type}, ${match.dbPayer.state})`);

            if (match.isManualOverride) {
                console.log(`   🎯 MANUAL OVERRIDE`);
            }

            if (match.matches.eligibility) {
                console.log(`   📡 Eligibility Match: ${match.matches.eligibility.name} (${match.matches.eligibility.score}% confidence)`);
                console.log(`      270/271 ID: ${match.matches.eligibility.ids.oa_eligibility_270_id || 'N/A'}`);
            }

            if (match.matches.claims) {
                console.log(`   📄 Claims Match: ${match.matches.claims.name} (${match.matches.claims.score}% confidence)`);
                console.log(`      837P ID: ${match.matches.claims.ids.oa_professional_837p_id || 'N/A'}`);
                console.log(`      835 ID: ${match.matches.claims.ids.oa_remit_835_id || 'N/A'}`);
            }
        });

        if (noMatches.length > 0) {
            console.log('\n' + '═'.repeat(80));
            console.log('⚠️  NO MATCHES FOUND FOR:\n');
            noMatches.forEach((payer, idx) => {
                console.log(`   ${idx + 1}. ${payer.name} (${payer.payer_type}, ${payer.state})`);
            });
        }

        // 5. Show summary
        console.log('\n' + '═'.repeat(80));
        console.log('📊 SUMMARY\n');
        console.log(`   ✅ Matched: ${matches.length} payers`);
        console.log(`   ⚠️  No match: ${noMatches.length} payers`);
        console.log('═'.repeat(80));

        // 6. Prompt for confirmation
        console.log('\n❓ Review the matches above.');
        console.log('   To apply these updates, run: node apply-payer-updates.js');
        console.log('   (Saving match data to: payer-matches.json)');

        // 7. Save matches to file for the apply script
        await fs.writeFile(
            'payer-matches.json',
            JSON.stringify({ matches, noMatches }, null, 2)
        );

        console.log('\n✅ Match data saved to payer-matches.json');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
