// lib/provider-service.js - Provider data service for billing

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get billing provider information (Moonlit PLLC)
 * @returns {Promise<Object>} Billing provider data
 */
async function getBillingProvider() {
    const { data, error } = await supabase
        .from('providers')
        .select('id, first_name, last_name, npi, taxonomy, tax_id, medicaid_provider_id, address, phone_number')
        .eq('first_name', 'MOONLIT')
        .eq('last_name', 'PLLC')
        .single();

    if (error) {
        console.error('Error fetching billing provider:', error);
        throw new Error('Failed to fetch billing provider from database');
    }

    if (!data) {
        throw new Error('Moonlit PLLC not found in providers table');
    }

    // Parse address into components
    const addressParts = parseAddress(data.address);

    return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        npi: data.npi,
        taxonomy: data.taxonomy,
        taxId: data.tax_id,
        medicaidProviderId: data.medicaid_provider_id,
        phone: data.phone_number,
        address: addressParts.street,
        city: addressParts.city,
        state: addressParts.state,
        zip: addressParts.zip
    };
}

/**
 * Get rendering provider by ID or NPI
 * @param {String} idOrNpi - Provider ID (UUID) or NPI
 * @returns {Promise<Object>} Rendering provider data
 */
async function getRenderingProvider(idOrNpi) {
    let query = supabase
        .from('providers')
        .select('id, first_name, last_name, npi, taxonomy');

    // Check if it's a UUID or NPI
    if (idOrNpi.includes('-')) {
        query = query.eq('id', idOrNpi);
    } else {
        query = query.eq('npi', idOrNpi);
    }

    const { data, error } = await query.single();

    if (error || !data) {
        console.warn(`Rendering provider not found: ${idOrNpi}`);
        return null;
    }

    return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        npi: data.npi,
        taxonomy: data.taxonomy
    };
}

/**
 * Get all active providers for dropdown
 * @returns {Promise<Array>} List of providers
 */
async function getActiveProviders() {
    const { data, error } = await supabase
        .from('providers')
        .select('id, first_name, last_name, npi, provider_type, is_active')
        .eq('is_active', true)
        .not('npi', 'is', null)
        .order('last_name');

    if (error) {
        console.error('Error fetching providers:', error);
        return [];
    }

    return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        npi: p.npi,
        type: p.provider_type
    }));
}

/**
 * Parse address string into components
 * @param {String} addressString - Full address (e.g., "1336 South 1100 E, Salt Lake City, UT 84105")
 * @returns {Object} Address components
 */
function parseAddress(addressString) {
    if (!addressString) {
        return { street: '', city: '', state: '', zip: '' };
    }

    // Split by comma
    const parts = addressString.split(',').map(p => p.trim());

    if (parts.length < 3) {
        return {
            street: parts[0] || '',
            city: '',
            state: '',
            zip: ''
        };
    }

    // Extract state and zip from last part (e.g., "UT 84105")
    const stateZip = parts[parts.length - 1].split(' ').filter(p => p);
    const state = stateZip[0] || '';
    const zip = stateZip[1] || '';

    return {
        street: parts[0] || '',
        city: parts[1] || '',
        state: state,
        zip: zip
    };
}

module.exports = {
    getBillingProvider,
    getRenderingProvider,
    getActiveProviders,
    parseAddress
};
