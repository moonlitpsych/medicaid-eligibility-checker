// lib/intakeq-service.js - IntakeQ Client API Integration
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const INTAKEQ_API_BASE = 'https://intakeq.com/api/v1';
const INTAKEQ_API_KEY = process.env.INTAKEQ_API_KEY;

/**
 * Fetch all clients from IntakeQ API
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of clients to fetch (default: 100, max: 500)
 * @param {string} options.status - Filter by status: 'active' or 'inactive' (optional)
 * @returns {Promise<Array>} Array of client objects
 */
async function fetchAllIntakeQClients(options = {}) {
    const { limit = 100, status } = options;

    try {
        const url = new URL(`${INTAKEQ_API_BASE}/clients`);
        url.searchParams.append('limit', limit);
        url.searchParams.append('includeProfile', 'true'); // Get full client details including insurance
        if (status) url.searchParams.append('status', status);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-Auth-Key': INTAKEQ_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`IntakeQ API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('Failed to fetch IntakeQ clients:', error.message);
        throw error;
    }
}

/**
 * Fetch single client from IntakeQ API
 * @param {string} clientId - IntakeQ client ID
 * @returns {Promise<Object>} Client object
 */
async function fetchIntakeQClient(clientId) {
    try {
        const response = await fetch(`${INTAKEQ_API_BASE}/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'X-Auth-Key': INTAKEQ_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`IntakeQ API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch IntakeQ client ${clientId}:`, error.message);
        throw error;
    }
}

/**
 * Transform IntakeQ client data to our database format
 * @param {Object} client - Raw IntakeQ client object
 * @returns {Object} Transformed client data
 */
function transformIntakeQClient(client) {
    // IntakeQ's individual client endpoint returns different field names than the list endpoint
    // Use ClientId (or Id) as the unique identifier
    const clientId = String(client.ClientId || client.Id || client.ClientNumber || '');

    // Split full name if FirstName/LastName not provided
    let firstName = client.FirstName || '';
    let lastName = client.LastName || '';

    if (!firstName && !lastName && client.Name) {
        const nameParts = client.Name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
    }

    // Convert IntakeQ timestamp (milliseconds) to PostgreSQL DATE format
    let dateOfBirth = null;
    if (client.DateOfBirth) {
        try {
            const date = new Date(parseInt(client.DateOfBirth));
            if (!isNaN(date.getTime())) {
                dateOfBirth = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
        } catch (e) {
            console.warn(`Invalid date for client ${clientId}:`, client.DateOfBirth);
        }
    }

    return {
        intakeq_client_id: clientId,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        email: client.Email || null,
        phone: client.Phone || null,
        primary_insurance_name: client.PrimaryInsuranceName || null,
        primary_insurance_policy_number: client.PrimaryInsurancePolicyNumber || null,
        secondary_insurance_name: client.SecondaryInsuranceName || null,
        secondary_insurance_policy_number: client.SecondaryInsurancePolicyNumber || null,
        address_street: client.Street || null,
        address_city: client.City || null,
        address_state: client.State || null,
        address_zip: client.ZipCode || null,
        raw_data: client,
        last_synced_at: new Date().toISOString()
    };
}

/**
 * Sync IntakeQ clients to database
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results { total, inserted, updated, errors }
 */
async function syncIntakeQClientsToDatabase(options = {}) {
    console.log('📥 Starting IntakeQ clients sync...');

    try {
        // Fetch all clients from IntakeQ (with includeProfile=true for full details)
        const clients = await fetchAllIntakeQClients(options);
        console.log(`   Fetched ${clients.length} clients from IntakeQ`);

        const results = {
            total: clients.length,
            inserted: 0,
            updated: 0,
            errors: []
        };

        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            try {
                const transformedClient = transformIntakeQClient(client);

                // Upsert to database
                const { data, error } = await supabase
                    .from('intakeq_clients')
                    .upsert(transformedClient, {
                        onConflict: 'intakeq_client_id',
                        ignoreDuplicates: false
                    })
                    .select()
                    .single();

                if (error) {
                    results.errors.push({
                        client_number: client.ClientNumber,
                        name: client.Name,
                        error: error.message
                    });
                } else {
                    results.updated++;
                }

                // Log progress every 10 clients
                if ((i + 1) % 10 === 0 || i === clients.length - 1) {
                    console.log(`   Progress: ${i + 1}/${clients.length} clients synced`);
                }
            } catch (error) {
                results.errors.push({
                    client_number: client.ClientNumber,
                    name: client.Name,
                    error: error.message
                });
            }
        }

        console.log(`✅ Sync complete: ${results.updated} clients synced, ${results.errors.length} errors`);
        return results;
    } catch (error) {
        console.error('❌ Sync failed:', error.message);
        throw error;
    }
}

/**
 * Get all cached IntakeQ clients from database
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of cached clients
 */
async function getCachedIntakeQClients(options = {}) {
    const { limit = 100, search } = options;

    let query = supabase
        .from('intakeq_clients')
        .select('*')
        .order('last_name', { ascending: true })
        .limit(limit);

    if (search) {
        const searchTerm = search.trim();

        // Split by whitespace (handles multiple spaces, tabs, etc.)
        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);

        if (searchWords.length === 1) {
            // Single word: search in EITHER first_name OR last_name
            query = query.or(`first_name.ilike.%${searchWords[0]}%,last_name.ilike.%${searchWords[0]}%`);
        }
        else if (searchWords.length === 2) {
            // Two words: Try both combinations
            // Option 1: word1=first_name AND word2=last_name
            // Option 2: word1=last_name AND word2=first_name
            const [word1, word2] = searchWords;

            // Build complex OR query with multiple AND conditions
            // Format: (first LIKE word1 AND last LIKE word2) OR (first LIKE word2 AND last LIKE word1)
            query = query.or(
                `and(first_name.ilike.%${word1}%,last_name.ilike.%${word2}%),` +
                `and(first_name.ilike.%${word2}%,last_name.ilike.%${word1}%)`
            );
        }
        else {
            // Three+ words: Try various combinations
            const firstWord = searchWords[0];
            const lastWord = searchWords[searchWords.length - 1];

            // Try various combinations:
            // 1. First word in first_name, last word in last_name
            // 2. Last word in first_name, first word in last_name
            // 3. All words in either field (compound names like "Mary Jane" or "Van der Berg")
            query = query.or(
                `and(first_name.ilike.%${firstWord}%,last_name.ilike.%${lastWord}%),` +
                `and(first_name.ilike.%${lastWord}%,last_name.ilike.%${firstWord}%),` +
                `first_name.ilike.%${searchTerm}%,` +
                `last_name.ilike.%${searchTerm}%`
            );
        }
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch cached clients: ${error.message}`);
    }

    return data || [];
}

/**
 * Map IntakeQ insurance name to our payer database
 * Uses fuzzy matching and common variations
 * @param {string} intakeqInsuranceName - Insurance name from IntakeQ
 * @returns {Promise<Object|null>} Matched payer or null
 */
async function mapIntakeQInsuranceToPayer(intakeqInsuranceName) {
    if (!intakeqInsuranceName) return null;

    const normalized = intakeqInsuranceName.toLowerCase().trim();

    // Manual mappings for common variations
    const manualMappings = {
        'utah medicaid': 'Utah Medicaid Fee-for-Service',
        'medicaid utah': 'Utah Medicaid Fee-for-Service',
        'medicaid': 'Utah Medicaid Fee-for-Service',
        'aetna': 'Aetna',
        'aetna better health': 'Aetna',
        'selecthealth': 'SelectHealth Integrated',
        'select health': 'SelectHealth Integrated',
        'molina': 'Molina Utah',
        'molina healthcare': 'Molina Utah',
        'university of utah health plans': 'University of Utah Health Plans (UUHP)',
        'uuhp': 'University of Utah Health Plans (UUHP)',
        'healthyu': 'HealthyU (UUHP)',
        'regence': 'Regence BlueCross BlueShield',
        'regence blue cross': 'Regence BlueCross BlueShield',
        'united healthcare': 'United Healthcare',
        'united': 'United Healthcare',
        'cigna': 'Cigna',
        'tricare': 'TriCare West',
        'idaho medicaid': 'Idaho Medicaid',
        'medicaid idaho': 'Idaho Medicaid',
        'optum': 'Optum Salt Lake and Tooele County Medicaid Network'
    };

    // Check manual mappings first
    for (const [key, payerName] of Object.entries(manualMappings)) {
        if (normalized.includes(key)) {
            const { data } = await supabase
                .from('payers')
                .select('id, name, payer_type, state, oa_eligibility_270_id, oa_professional_837p_id')
                .eq('name', payerName)
                .single();

            if (data) return data;
        }
    }

    // Fuzzy search in database
    const { data } = await supabase
        .from('payers')
        .select('id, name, payer_type, state, oa_eligibility_270_id, oa_professional_837p_id')
        .ilike('name', `%${intakeqInsuranceName}%`)
        .limit(1);

    return data && data.length > 0 ? data[0] : null;
}

/**
 * Get IntakeQ client by ID with mapped payer information
 * @param {string} clientId - IntakeQ client ID
 * @returns {Promise<Object>} Client with mapped payer
 */
async function getIntakeQClientWithPayer(clientId) {
    const { data: client, error } = await supabase
        .from('intakeq_clients')
        .select('*')
        .eq('intakeq_client_id', clientId)
        .single();

    if (error) {
        throw new Error(`Failed to fetch client: ${error.message}`);
    }

    // Map insurance to payer
    const mappedPayer = await mapIntakeQInsuranceToPayer(client.primary_insurance_name);

    return {
        ...client,
        mapped_payer: mappedPayer
    };
}

module.exports = {
    fetchAllIntakeQClients,
    fetchIntakeQClient,
    syncIntakeQClientsToDatabase,
    getCachedIntakeQClients,
    mapIntakeQInsuranceToPayer,
    getIntakeQClientWithPayer
};
