/**
 * Moonlit PLLC Fee Schedule
 *
 * Standard fees charged by Moonlit for common CPT codes.
 * These represent the "allowed amount" that will be charged to insurance
 * or the patient if self-pay.
 *
 * Last Updated: 2025-10-07
 */

module.exports = {
    // PATIENT-FACING SERVICE NAMES (what patients see)
    // Internal: These map to E/M codes + psychotherapy add-ons

    'INTAKE_VISIT': {
        cpt: '99205+90838', // or 99204+90838
        description: 'Intake Visit',
        patientDescription: 'Initial visit with psychiatrist (~60 minutes)',
        fee: 350, // Approximate combined fee for E/M + add-on
        category: 'intake'
    },
    'FOLLOWUP_BRIEF': {
        cpt: '99214+90833', // or 99215+90833
        description: 'Follow-up Visit (brief)',
        patientDescription: 'Follow-up with psychiatrist (~20 minutes)',
        fee: 200, // Approximate combined fee
        category: 'followup'
    },
    'FOLLOWUP_EXTENDED': {
        cpt: '99214+90836', // or 99215+90836
        description: 'Follow-up Visit (extended)',
        patientDescription: 'Follow-up with psychiatrist (~40 minutes)',
        fee: 250, // Approximate combined fee
        category: 'followup'
    },
    'FOLLOWUP_INTENSIVE': {
        cpt: '99215+90838',
        description: 'Follow-up Visit (intensive)',
        patientDescription: 'Extended follow-up with psychiatrist (~60 minutes)',
        fee: 350, // Approximate combined fee
        category: 'followup'
    },

    // Individual CPT codes (for internal use if needed)
    // E/M Codes
    '99204': {
        cpt: '99204',
        description: 'Office Visit - New Patient (Moderate)',
        fee: 225,
        category: 'em_code'
    },
    '99205': {
        cpt: '99205',
        description: 'Office Visit - New Patient (High)',
        fee: 275,
        category: 'em_code'
    },

    // Medication Management
    '99213': {
        cpt: '99213',
        description: 'Office Visit - Established (Low to Moderate)',
        fee: 150,
        category: 'medication_management'
    },
    '99214': {
        cpt: '99214',
        description: 'Office Visit - Established (Moderate)',
        fee: 200,
        category: 'medication_management'
    },
    '99215': {
        cpt: '99215',
        description: 'Office Visit - Established (High)',
        fee: 250,
        category: 'medication_management'
    },

    // Telehealth Add-ons (modifier codes)
    '95': {
        cpt: '95',
        description: 'Telehealth Synchronous (Audio/Video)',
        fee: 0, // Modifier, doesn't add cost
        category: 'modifier'
    },
    '93': {
        cpt: '93',
        description: 'Telehealth Audio Only',
        fee: 0, // Modifier, doesn't add cost
        category: 'modifier'
    },

    // Contingency Management (if applicable)
    'H0038': {
        cpt: 'H0038',
        description: 'Peer Support (per 15 min unit)',
        fee: 21.16,
        category: 'peer_support'
    }
};

/**
 * Helper function to get fee by CPT code
 * @param {string} cptCode - The CPT code to look up
 * @returns {number|null} - The fee amount or null if not found
 */
module.exports.getFee = function(cptCode) {
    const service = module.exports[cptCode];
    return service ? service.fee : null;
};

/**
 * Helper function to get service description
 * @param {string} cptCode - The CPT code to look up
 * @returns {string|null} - The description or null if not found
 */
module.exports.getDescription = function(cptCode) {
    const service = module.exports[cptCode];
    return service ? service.description : null;
};

/**
 * Get all services by category
 * @param {string} category - Category to filter by
 * @returns {Array} - Array of services in that category
 */
module.exports.getByCategory = function(category) {
    return Object.entries(module.exports)
        .filter(([key, value]) => value.category === category)
        .map(([key, value]) => value);
};
