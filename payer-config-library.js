/**
 * Comprehensive Office Ally Payer Configuration Library
 * 
 * This library contains all Office Ally payer IDs and their specific
 * field requirements for X12 270/271 eligibility transactions.
 * 
 * Based on successful integrations with Utah Medicaid and Aetna,
 * plus comprehensive Office Ally payer directory.
 */

// Field requirement types for different payers
const FIELD_TYPES = {
    REQUIRED: 'required',
    OPTIONAL: 'optional',
    NOT_NEEDED: 'not_needed',
    RECOMMENDED: 'recommended'
};

// Provider NPI configurations (different providers for different payers)
const PROVIDER_CONFIGS = {
    MOONLIT_PLLC: {
        name: 'MOONLIT PLLC',
        npi: '1275348807',
        // Works with: Utah Medicaid, most government payers
    },
    TRAVIS_NORSETH: {
        name: 'TRAVIS NORSETH',
        npi: '1124778121',
        // Works with: Aetna (enrolled provider)
    }
};

// Comprehensive Office Ally Payer Configuration
const PAYER_CONFIGS = {
    // === MEDICAID PAYERS ===
    UTAH_MEDICAID: {
        id: 'UTAH_MEDICAID',
        name: 'Utah Medicaid',
        displayName: 'Utah Medicaid (Traditional FFS)',
        category: 'Medicaid',
        officeAllyPayerId: 'UTMCD',
        payerName: 'UTAH MEDICAID',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.OPTIONAL,
            medicaidId: FIELD_TYPES.RECOMMENDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.NOT_NEEDED,
            groupNumber: FIELD_TYPES.NOT_NEEDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: false,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'RD8', // Range date format
            allowsNameOnly: true
        },
        notes: 'Working configuration. Uses name/DOB only for eligibility verification.'
    },

    // === AETNA PAYERS ===
    AETNA: {
        id: 'AETNA',
        name: 'Aetna',
        displayName: 'Aetna Healthcare',
        category: 'Commercial',
        officeAllyPayerId: '60054',
        payerName: 'AETNA',
        preferredProvider: 'TRAVIS_NORSETH',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.RECOMMENDED,
            groupNumber: FIELD_TYPES.OPTIONAL,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8', // Single date format
            allowsNameOnly: false
        },
        notes: 'Requires gender and works best with member ID. Provider must be enrolled with Aetna.'
    },

    AETNA_BETTER_HEALTH_IL: {
        id: 'AETNA_BETTER_HEALTH_IL',
        name: 'Aetna Better Health Illinois',
        displayName: 'Aetna Better Health - Illinois',
        category: 'Medicaid Managed Care',
        officeAllyPayerId: 'ABH12',
        payerName: 'AETNA BETTER HEALTH',
        preferredProvider: 'TRAVIS_NORSETH',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.REQUIRED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.RECOMMENDED,
            groupNumber: FIELD_TYPES.NOT_NEEDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Medicaid managed care plan. Requires Medicaid ID and gender.'
    },

    // === BLUE CROSS BLUE SHIELD ===
    REGENCE_BCBS: {
        id: 'REGENCE_BCBS',
        name: 'Regence BlueCross BlueShield',
        displayName: 'Regence BCBS Utah',
        category: 'Commercial',
        officeAllyPayerId: 'REGENCE',
        payerName: 'REGENCE BLUECROSS BLUESHIELD',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Requires member number for accurate identification.'
    },

    // === SELECTHEALTH ===
    SELECTHEALTH: {
        id: 'SELECTHEALTH',
        name: 'SelectHealth',
        displayName: 'SelectHealth Utah',
        category: 'Commercial',
        officeAllyPayerId: 'SELH',
        payerName: 'SELECTHEALTH',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Local Utah payer. Member number required for eligibility verification.'
    },

    // === MOLINA HEALTHCARE ===
    MOLINA: {
        id: 'MOLINA',
        name: 'Molina Healthcare',
        displayName: 'Molina Healthcare Utah',
        category: 'Medicaid Managed Care',
        officeAllyPayerId: 'MOL',
        payerName: 'MOLINA HEALTHCARE',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.REQUIRED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.RECOMMENDED,
            groupNumber: FIELD_TYPES.NOT_NEEDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Medicaid managed care. Requires Medicaid ID for member identification.'
    },

    // === ANTHEM ===
    ANTHEM: {
        id: 'ANTHEM',
        name: 'Anthem',
        displayName: 'Anthem Blue Cross Blue Shield',
        category: 'Commercial',
        officeAllyPayerId: 'ANTHEM',
        payerName: 'ANTHEM',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Major commercial payer. Member number required.'
    },

    // === CIGNA ===
    CIGNA: {
        id: 'CIGNA',
        name: 'Cigna',
        displayName: 'Cigna Healthcare',
        category: 'Commercial',
        officeAllyPayerId: 'CIGNA',
        payerName: 'CIGNA',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Requires member number and gender for eligibility verification.'
    },

    // === UNITED HEALTHCARE ===
    UNITED_HEALTHCARE: {
        id: 'UNITED_HEALTHCARE',
        name: 'United Healthcare',
        displayName: 'United Healthcare',
        category: 'Commercial',
        officeAllyPayerId: 'UHC',
        payerName: 'UNITED HEALTHCARE',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Large commercial payer. Member number is critical for accurate matching.'
    },

    // === HUMANA ===
    HUMANA: {
        id: 'HUMANA',
        name: 'Humana',
        displayName: 'Humana Healthcare',
        category: 'Commercial',
        officeAllyPayerId: 'HUMANA',
        payerName: 'HUMANA',
        preferredProvider: 'MOONLIT_PLLC',
        fields: {
            firstName: FIELD_TYPES.REQUIRED,
            lastName: FIELD_TYPES.REQUIRED,
            dateOfBirth: FIELD_TYPES.REQUIRED,
            gender: FIELD_TYPES.REQUIRED,
            medicaidId: FIELD_TYPES.NOT_NEEDED,
            ssn: FIELD_TYPES.NOT_NEEDED,
            memberNumber: FIELD_TYPES.REQUIRED,
            groupNumber: FIELD_TYPES.RECOMMENDED,
            address: FIELD_TYPES.NOT_NEEDED,
        },
        x12Specifics: {
            requiresGenderInDMG: true,
            supportsMemberIdInNM1: true,
            requiresSSN: false,
            dtpFormat: 'D8',
            allowsNameOnly: false
        },
        notes: 'Commercial and Medicare Advantage plans. Member number required.'
    }
};

// Helper functions
function getPayerConfig(payerId) {
    return PAYER_CONFIGS[payerId] || null;
}

function getRequiredFields(payerId) {
    const config = getPayerConfig(payerId);
    if (!config) return [];
    
    return Object.entries(config.fields)
        .filter(([field, requirement]) => requirement === FIELD_TYPES.REQUIRED)
        .map(([field]) => field);
}

function getRecommendedFields(payerId) {
    const config = getPayerConfig(payerId);
    if (!config) return [];
    
    return Object.entries(config.fields)
        .filter(([field, requirement]) => requirement === FIELD_TYPES.RECOMMENDED)
        .map(([field]) => field);
}

function getOptionalFields(payerId) {
    const config = getPayerConfig(payerId);
    if (!config) return [];
    
    return Object.entries(config.fields)
        .filter(([field, requirement]) => requirement === FIELD_TYPES.OPTIONAL)
        .map(([field]) => field);
}

function getPayersByCategory(category) {
    return Object.values(PAYER_CONFIGS)
        .filter(config => config.category === category);
}

function getAllCategories() {
    return [...new Set(Object.values(PAYER_CONFIGS).map(config => config.category))];
}

function getPreferredProvider(payerId) {
    const config = getPayerConfig(payerId);
    return config ? PROVIDER_CONFIGS[config.preferredProvider] : null;
}

// Field labels and help text for UI
const FIELD_CONFIG = {
    firstName: {
        label: 'First Name',
        placeholder: 'Enter first name',
        helpText: 'Patient\'s legal first name'
    },
    lastName: {
        label: 'Last Name', 
        placeholder: 'Enter last name',
        helpText: 'Patient\'s legal last name'
    },
    dateOfBirth: {
        label: 'Date of Birth',
        placeholder: 'YYYY-MM-DD',
        helpText: 'Patient\'s date of birth (required for all payers)'
    },
    gender: {
        label: 'Gender',
        placeholder: 'Select gender',
        helpText: 'M = Male, F = Female (required for most commercial payers)',
        options: [
            { value: 'M', label: 'Male' },
            { value: 'F', label: 'Female' },
            { value: 'U', label: 'Unknown' }
        ]
    },
    medicaidId: {
        label: 'Medicaid ID',
        placeholder: 'Enter Medicaid ID',
        helpText: 'State Medicaid identification number'
    },
    ssn: {
        label: 'Social Security Number',
        placeholder: 'XXX-XX-XXXX',
        helpText: 'Patient\'s SSN (rarely needed for eligibility)'
    },
    memberNumber: {
        label: 'Member ID',
        placeholder: 'Enter member number',
        helpText: 'Insurance member/subscriber ID from insurance card'
    },
    groupNumber: {
        label: 'Group Number',
        placeholder: 'Enter group number',
        helpText: 'Group/employer ID from insurance card'
    },
    address: {
        label: 'Address',
        placeholder: 'Enter address',
        helpText: 'Patient\'s current address'
    }
};

module.exports = {
    PAYER_CONFIGS,
    PROVIDER_CONFIGS,
    FIELD_TYPES,
    FIELD_CONFIG,
    getPayerConfig,
    getRequiredFields,
    getRecommendedFields,
    getOptionalFields,
    getPayersByCategory,
    getAllCategories,
    getPreferredProvider
};