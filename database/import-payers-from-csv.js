// database/import-payers-from-csv.js
// Import Office Ally payers CSV into Supabase payers table
//
// Handles the fact that same payer has DIFFERENT Office Ally IDs for different transaction types

require('dotenv').config({ path: '../.env.local' });
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Transaction type mappings to database columns
const TRANSACTION_TYPE_MAP = {
    'Eligibility 270 / 271': {
        idColumn: 'oa_eligibility_270_id',
        supportColumn: 'supports_eligibility_270'
    },
    'Claim Status 276 / 277': {
        idColumn: 'oa_claim_status_276_id',
        supportColumn: 'supports_claim_status_276'
    },
    'Professional Claims 837P': {
        idColumn: 'oa_professional_837p_id',
        supportColumn: 'supports_professional_837p',
        enrollmentColumn: 'requires_enrollment_837p'
    },
    'Institutional Claims 837I': {
        idColumn: 'oa_institutional_837i_id',
        supportColumn: 'supports_institutional_837i',
        enrollmentColumn: 'requires_enrollment_837i'
    },
    'Dental Claims 837D': {
        idColumn: 'oa_dental_837d_id',
        supportColumn: 'supports_dental_837d',
        enrollmentColumn: 'requires_enrollment_837d'
    },
    'Remits 835': {
        idColumn: 'oa_remit_835_id',
        supportColumn: 'supports_remit_835',
        enrollmentColumn: 'requires_enrollment_835'
    }
};

// Classify payer type based on name
function classifyPayerType(payerName, wcAuto, notes) {
    const name = payerName.toLowerCase();
    const allNotes = `${wcAuto || ''} ${notes || ''}`.toLowerCase();

    if (allNotes.includes('work') && allNotes.includes('comp')) {
        return 'Workers Comp';
    }
    if (allNotes.includes('auto')) {
        return 'Auto';
    }
    if (name.includes('medicaid') && !name.includes('advantage') && !name.includes('complete')) {
        // Check if it's managed care
        if (name.includes('molina') || name.includes('amerigroup') ||
            name.includes('selecthealth') || name.includes('anthem') ||
            name.includes('uhc community') || name.includes('united healthcare community')) {
            return 'Medicaid Managed Care';
        }
        return 'Medicaid';
    }
    if (name.includes('medicare')) {
        if (name.includes('advantage') || name.includes('complete') ||
            name.includes('hmo') || name.includes('ppo')) {
            return 'Medicare Advantage';
        }
        return 'Medicare';
    }
    return 'Commercial';
}

// Extract state from payer name if possible
function extractState(payerName) {
    const statePatterns = [
        /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/gi
    ];

    for (const pattern of statePatterns) {
        const match = payerName.match(pattern);
        if (match) {
            return match[0].toUpperCase();
        }
    }

    // Check for full state names
    if (payerName.toLowerCase().includes('utah')) return 'UT';
    if (payerName.toLowerCase().includes('california')) return 'CA';
    if (payerName.toLowerCase().includes('texas')) return 'TX';
    if (payerName.toLowerCase().includes('florida')) return 'FL';
    if (payerName.toLowerCase().includes('new york')) return 'NY';

    return null;
}

// Parse CSV line (handles quoted fields with commas)
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

// Parse CSV file
async function parseCSV(filepath) {
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

// Convert 'Yes'/'No' to boolean
function yesNoToBool(value) {
    return value?.trim().toLowerCase() === 'yes';
}

// Group CSV rows by payer name (same payer, different transaction types)
function groupByPayer(csvRows) {
    const payerMap = new Map();

    for (const row of csvRows) {
        const payerName = row['PAYER NAME'];
        const payerId = row['PAYER ID'];
        const transactionType = row['TRANSACTION'];

        if (!payerMap.has(payerName)) {
            payerMap.set(payerName, {
                name: payerName,
                transactions: [],
                wcAuto: row['WC / AUTO'],
                notes: row['NOTES']
            });
        }

        const payer = payerMap.get(payerName);
        payer.transactions.push({
            type: transactionType,
            payerId: payerId,
            available: yesNoToBool(row['AVAILABLE']),
            nonPar: yesNoToBool(row['NON PAR']),
            enrollment: yesNoToBool(row['ENROLLMENT']),
            secondary: yesNoToBool(row['SECONDARY']),
            attachment: yesNoToBool(row['ATTACHMENT'])
        });
    }

    return Array.from(payerMap.values());
}

// Convert grouped payer data to database record format
function payerToDBRecord(payerData) {
    const record = {
        name: payerData.name,
        display_name: payerData.name,
        payer_type: classifyPayerType(payerData.name, payerData.wcAuto, payerData.notes),
        state: extractState(payerData.name),
        specialty_type: payerData.wcAuto || null,
        office_ally_notes: payerData.notes || null,
        is_active: true
    };

    // Set transaction-specific fields
    for (const transaction of payerData.transactions) {
        const mapping = TRANSACTION_TYPE_MAP[transaction.type];
        if (mapping) {
            // Set Office Ally payer ID for this transaction type
            record[mapping.idColumn] = transaction.payerId;

            // Set support flag
            record[mapping.supportColumn] = transaction.available;

            // Set enrollment requirement if applicable
            if (mapping.enrollmentColumn) {
                record[mapping.enrollmentColumn] = transaction.enrollment;
            }

            // Set metadata flags (from first transaction that has them)
            if (transaction.nonPar && !record.allows_non_par) {
                record.allows_non_par = transaction.nonPar;
            }
            if (transaction.secondary && !record.allows_secondary) {
                record.allows_secondary = transaction.secondary;
            }
            if (transaction.attachment && !record.allows_attachments) {
                record.allows_attachments = transaction.attachment;
            }
        }
    }

    return record;
}

// Import payers in batches
async function importPayers(payers, batchSize = 100) {
    console.log(`📊 Importing ${payers.length} payers in batches of ${batchSize}...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < payers.length; i += batchSize) {
        const batch = payers.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(payers.length / batchSize);

        console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} payers)...`);

        const { data, error } = await supabase
            .from('payers')
            .upsert(batch, {
                onConflict: 'name',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
            errorCount += batch.length;
            errors.push({ batch: batchNum, error: error.message });
        } else {
            console.log(`   ✅ Batch ${batchNum} imported successfully`);
            successCount += batch.length;
        }

        // Small delay to avoid rate limiting
        if (i + batchSize < payers.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return { successCount, errorCount, errors };
}

// Main import function
async function main() {
    console.log('🏥 Office Ally Payers Import\n');
    console.log('═'.repeat(60));

    try {
        // 1. Parse CSV
        console.log('\n1️⃣  Parsing CSV file...');
        const csvPath = '../payers (1).xlsx - Payers.csv';
        const csvRows = await parseCSV(csvPath);
        console.log(`   ✅ Parsed ${csvRows.length} CSV rows`);

        // 2. Group by payer name
        console.log('\n2️⃣  Grouping by payer name...');
        const groupedPayers = groupByPayer(csvRows);
        console.log(`   ✅ Found ${groupedPayers.length} unique payers`);

        // Show example of grouped data
        const example = groupedPayers.find(p => p.name.includes('Utah Medicaid'));
        if (example) {
            console.log('\n   📋 Example: Utah Medicaid');
            example.transactions.forEach(t => {
                console.log(`      - ${t.type}: ${t.payerId}`);
            });
        }

        // 3. Convert to database records
        console.log('\n3️⃣  Converting to database records...');
        const dbRecords = groupedPayers.map(payerToDBRecord);
        console.log(`   ✅ Prepared ${dbRecords.length} database records`);

        // Show example record
        const exampleRecord = dbRecords.find(r => r.name.includes('Utah Medicaid'));
        if (exampleRecord) {
            console.log('\n   📋 Example Record:');
            console.log(`      Name: ${exampleRecord.name}`);
            console.log(`      Type: ${exampleRecord.payer_type}`);
            console.log(`      State: ${exampleRecord.state}`);
            console.log(`      Eligibility ID: ${exampleRecord.oa_eligibility_270_id}`);
            console.log(`      Claims ID: ${exampleRecord.oa_professional_837p_id}`);
            console.log(`      ERA ID: ${exampleRecord.oa_remit_835_id}`);
        }

        // 4. Verify Supabase connection
        console.log('\n4️⃣  Verifying Supabase connection...');
        const { count, error: countError } = await supabase
            .from('payers')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            throw new Error(`Supabase connection failed: ${countError.message}`);
        }
        console.log(`   ✅ Connected to Supabase (current payers: ${count || 0})`);

        // 5. Import payers
        console.log('\n5️⃣  Importing payers to Supabase...');
        const { successCount, errorCount, errors } = await importPayers(dbRecords);

        // 6. Results
        console.log('\n' + '═'.repeat(60));
        console.log('📊 IMPORT RESULTS\n');
        console.log(`   ✅ Successfully imported: ${successCount} payers`);
        if (errorCount > 0) {
            console.log(`   ❌ Failed: ${errorCount} payers`);
            console.log('\n   Error details:');
            errors.forEach(e => {
                console.log(`      Batch ${e.batch}: ${e.error}`);
            });
        }

        // 7. Verification query
        console.log('\n6️⃣  Verification...');
        const { count: finalCount } = await supabase
            .from('payers')
            .select('*', { count: 'exact', head: true });

        console.log(`   📈 Total payers in database: ${finalCount}`);

        // Count by type
        const { data: byType } = await supabase
            .from('payers')
            .select('payer_type')
            .not('payer_type', 'is', null);

        if (byType) {
            const typeCounts = {};
            byType.forEach(p => {
                typeCounts[p.payer_type] = (typeCounts[p.payer_type] || 0) + 1;
            });
            console.log('\n   📊 Payers by type:');
            Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    console.log(`      ${type}: ${count}`);
                });
        }

        console.log('\n✅ Import complete!');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('\n❌ Import failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run import
main();
