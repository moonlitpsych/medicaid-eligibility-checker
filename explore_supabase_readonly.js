// explore_supabase_readonly.js - STRICT READ-ONLY Database Exploration
// This script will safely explore the Supabase database structure without making any changes

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for full read access
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function exploreDatabase() {
    console.log('🔍 SUPABASE DATABASE EXPLORATION (READ-ONLY)');
    console.log('='.repeat(60));
    
    try {
        // First, let's see what tables exist by querying the information_schema
        console.log('\n📋 DISCOVERING TABLE STRUCTURE...\n');
        
        // Query to get all tables and their columns
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name, table_schema')
            .eq('table_schema', 'public');
            
        if (tablesError) {
            console.error('Error querying tables:', tablesError);
            
            // Fallback: Try to query some common table names that might exist
            console.log('\n🔍 TRYING COMMON TABLE NAMES...\n');
            
            const commonTables = [
                'payers', 'insurance_payers', 'contracts', 'providers', 
                'npis', 'provider_npis', 'networks', 'plans', 
                'users', 'appointments', 'patients', 'eligibility'
            ];
            
            for (const tableName of commonTables) {
                try {
                    const { data, error, count } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    if (!error) {
                        console.log(`✅ Found table: ${tableName} (${count} rows)`);
                    }
                } catch (e) {
                    // Table doesn't exist, continue silently
                }
            }
            return;
        }
        
        if (tables && tables.length > 0) {
            console.log(`Found ${tables.length} tables in public schema:\n`);
            
            for (const table of tables) {
                console.log(`📊 TABLE: ${table.table_name}`);
                
                // Get row count for each table
                const { count, error: countError } = await supabase
                    .from(table.table_name)
                    .select('*', { count: 'exact', head: true });
                    
                if (!countError) {
                    console.log(`   📈 Rows: ${count}`);
                }
                
                // Get first few column names by querying the table structure
                try {
                    const { data: sample, error: sampleError } = await supabase
                        .from(table.table_name)
                        .select('*')
                        .limit(1);
                        
                    if (!sampleError && sample && sample.length > 0) {
                        const columns = Object.keys(sample[0]);
                        console.log(`   📋 Columns: ${columns.join(', ')}`);
                    }
                } catch (e) {
                    console.log(`   ❌ Could not read columns for ${table.table_name}`);
                }
                console.log('');
            }
        } else {
            console.log('No tables found in public schema');
        }
        
        // Look for payer-related data specifically
        console.log('\n🎯 SEARCHING FOR PAYER/INSURANCE DATA...\n');
        
        const payerTables = ['payers', 'insurance_payers', 'contracts', 'plans', 'networks'];
        
        for (const tableName of payerTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(3);
                
                if (!error && data && data.length > 0) {
                    console.log(`✅ FOUND PAYER DATA in ${tableName}:`);
                    console.log('Sample data:');
                    console.log(JSON.stringify(data[0], null, 2));
                    console.log('');
                }
            } catch (e) {
                // Table doesn't exist
            }
        }
        
        // Look for provider NPI data
        console.log('\n👨‍⚕️ SEARCHING FOR PROVIDER/NPI DATA...\n');
        
        const providerTables = ['providers', 'npis', 'provider_npis', 'practitioners'];
        
        for (const tableName of providerTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(3);
                
                if (!error && data && data.length > 0) {
                    console.log(`✅ FOUND PROVIDER DATA in ${tableName}:`);
                    console.log('Sample data:');
                    console.log(JSON.stringify(data[0], null, 2));
                    console.log('');
                }
            } catch (e) {
                // Table doesn't exist
            }
        }
        
    } catch (error) {
        console.error('Database exploration error:', error);
    }
}

// Run the exploration
exploreDatabase()
    .then(() => {
        console.log('\n✅ Database exploration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Exploration failed:', error);
        process.exit(1);
    });