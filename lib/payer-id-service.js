// lib/payer-id-service.js - Database-driven payer ID lookup service
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get Office Ally payer IDs for a specific payer
 * @param {string} payerName - Name of the payer (e.g., 'Utah Medicaid Fee-for-Service')
 * @returns {Promise<Object>} Payer IDs for different transaction types
 */
async function getPayerIds(payerName) {
    const { data, error } = await supabase
        .from('payers')
        .select('name, oa_eligibility_270_id, oa_professional_837p_id, oa_remit_835_id')
        .eq('name', payerName)
        .single();

    if (error) {
        throw new Error(`Failed to fetch payer IDs for "${payerName}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Payer not found: "${payerName}"`);
    }

    return {
        name: data.name,
        eligibility_270_271: data.oa_eligibility_270_id,
        claims_837p: data.oa_professional_837p_id,
        remittance_835: data.oa_remit_835_id
    };
}

/**
 * Get eligibility payer ID (270/271 transactions)
 * @param {string} payerName - Name of the payer
 * @returns {Promise<string>} Payer ID for eligibility checks
 */
async function getEligibilityPayerId(payerName) {
    const ids = await getPayerIds(payerName);
    if (!ids.eligibility_270_271) {
        throw new Error(`No eligibility payer ID configured for "${payerName}"`);
    }
    return ids.eligibility_270_271;
}

/**
 * Get claims payer ID (837P transactions)
 * @param {string} payerName - Name of the payer
 * @returns {Promise<string>} Payer ID for claims submission
 */
async function getClaimsPayerId(payerName) {
    const ids = await getPayerIds(payerName);
    if (!ids.claims_837p) {
        throw new Error(`No claims payer ID configured for "${payerName}"`);
    }
    return ids.claims_837p;
}

/**
 * Get remittance payer ID (835 transactions)
 * @param {string} payerName - Name of the payer
 * @returns {Promise<string>} Payer ID for ERA processing
 */
async function getRemittancePayerId(payerName) {
    const ids = await getPayerIds(payerName);
    if (!ids.remittance_835) {
        throw new Error(`No remittance payer ID configured for "${payerName}"`);
    }
    return ids.remittance_835;
}

/**
 * List all payers with Office Ally IDs configured
 * @returns {Promise<Array>} Array of payers with their IDs
 */
async function listConfiguredPayers() {
    const { data, error } = await supabase
        .from('payers')
        .select('name, payer_type, state, oa_eligibility_270_id, oa_professional_837p_id, oa_remit_835_id')
        .not('oa_eligibility_270_id', 'is', null)
        .order('name');

    if (error) {
        throw new Error(`Failed to list configured payers: ${error.message}`);
    }

    return data.map(payer => ({
        name: payer.name,
        type: payer.payer_type,
        state: payer.state,
        ids: {
            eligibility: payer.oa_eligibility_270_id,
            claims: payer.oa_professional_837p_id,
            remittance: payer.oa_remit_835_id
        }
    }));
}

module.exports = {
    getPayerIds,
    getEligibilityPayerId,
    getClaimsPayerId,
    getRemittancePayerId,
    listConfiguredPayers
};
