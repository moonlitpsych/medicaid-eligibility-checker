/**
 * Dynamic Field Requirements System
 * 
 * This system dynamically determines what fields should be displayed,
 * required, or hidden based on the selected payer in the universal
 * eligibility checker interface.
 */

const { 
    PAYER_CONFIGS, 
    FIELD_TYPES, 
    FIELD_CONFIG,
    getPayerConfig,
    getRequiredFields,
    getRecommendedFields,
    getOptionalFields 
} = require('./payer-config-library');

/**
 * Generate dynamic form configuration for a specific payer
 * @param {string} payerId - The payer ID from PAYER_CONFIGS
 * @returns {Object} Complete form configuration
 */
function generateDynamicFormConfig(payerId) {
    const payerConfig = getPayerConfig(payerId);
    
    if (!payerConfig) {
        throw new Error(`Invalid payer ID: ${payerId}`);
    }

    const formConfig = {
        payerId,
        payerName: payerConfig.displayName,
        category: payerConfig.category,
        notes: payerConfig.notes,
        fields: [],
        validationRules: {},
        submitRequirements: {
            required: getRequiredFields(payerId),
            recommended: getRecommendedFields(payerId),
            optional: getOptionalFields(payerId)
        }
    };

    // Generate field configurations
    Object.entries(payerConfig.fields).forEach(([fieldName, requirement]) => {
        if (requirement === FIELD_TYPES.NOT_NEEDED) {
            return; // Skip fields that aren't needed
        }

        const baseFieldConfig = FIELD_CONFIG[fieldName];
        if (!baseFieldConfig) {
            console.warn(`No base configuration found for field: ${fieldName}`);
            return;
        }

        const fieldConfig = {
            name: fieldName,
            label: baseFieldConfig.label,
            placeholder: baseFieldConfig.placeholder,
            helpText: baseFieldConfig.helpText,
            type: getFieldType(fieldName),
            requirement: requirement,
            isRequired: requirement === FIELD_TYPES.REQUIRED,
            isRecommended: requirement === FIELD_TYPES.RECOMMENDED,
            isOptional: requirement === FIELD_TYPES.OPTIONAL,
            validation: generateFieldValidation(fieldName, requirement, payerConfig),
            options: baseFieldConfig.options || null,
            // UI styling based on requirement
            className: getFieldClassName(requirement),
            priority: getFieldPriority(requirement)
        };

        formConfig.fields.push(fieldConfig);

        // Add to validation rules
        if (requirement === FIELD_TYPES.REQUIRED) {
            formConfig.validationRules[fieldName] = {
                required: true,
                message: `${baseFieldConfig.label} is required for ${payerConfig.displayName}`
            };
        }
    });

    // Sort fields by priority (required first, then recommended, then optional)
    formConfig.fields.sort((a, b) => b.priority - a.priority);

    return formConfig;
}

/**
 * Determine HTML input type for a field
 */
function getFieldType(fieldName) {
    const typeMap = {
        firstName: 'text',
        lastName: 'text', 
        dateOfBirth: 'date',
        gender: 'select',
        medicaidId: 'text',
        ssn: 'text',
        memberNumber: 'text',
        groupNumber: 'text',
        address: 'textarea'
    };
    
    return typeMap[fieldName] || 'text';
}

/**
 * Generate field validation rules
 */
function generateFieldValidation(fieldName, requirement, payerConfig) {
    const validation = {};

    if (requirement === FIELD_TYPES.REQUIRED) {
        validation.required = true;
    }

    // Field-specific validation
    switch (fieldName) {
        case 'dateOfBirth':
            validation.pattern = /^\d{4}-\d{2}-\d{2}$/;
            validation.message = 'Date must be in YYYY-MM-DD format';
            break;
        case 'ssn':
            validation.pattern = /^\d{3}-?\d{2}-?\d{4}$/;
            validation.message = 'SSN must be in XXX-XX-XXXX format';
            break;
        case 'gender':
            validation.options = ['M', 'F', 'U'];
            validation.message = 'Please select a valid gender option';
            break;
        case 'memberNumber':
            validation.minLength = 1;
            validation.message = 'Member number cannot be empty';
            break;
    }

    return validation;
}

/**
 * Get CSS class for field based on requirement level
 */
function getFieldClassName(requirement) {
    const baseClass = 'form-field';
    
    switch (requirement) {
        case FIELD_TYPES.REQUIRED:
            return `${baseClass} field-required`;
        case FIELD_TYPES.RECOMMENDED:
            return `${baseClass} field-recommended`;
        case FIELD_TYPES.OPTIONAL:
            return `${baseClass} field-optional`;
        default:
            return baseClass;
    }
}

/**
 * Get priority for field ordering (higher = displayed first)
 */
function getFieldPriority(requirement) {
    switch (requirement) {
        case FIELD_TYPES.REQUIRED:
            return 3;
        case FIELD_TYPES.RECOMMENDED:
            return 2;
        case FIELD_TYPES.OPTIONAL:
            return 1;
        default:
            return 0;
    }
}

/**
 * Validate form data against payer requirements
 * @param {Object} formData - The form data to validate
 * @param {string} payerId - The selected payer ID
 * @returns {Object} Validation result with errors
 */
function validateFormData(formData, payerId) {
    const formConfig = generateDynamicFormConfig(payerId);
    const errors = [];
    const warnings = [];

    // Check required fields
    formConfig.submitRequirements.required.forEach(fieldName => {
        if (!formData[fieldName] || formData[fieldName].trim() === '') {
            errors.push(`${FIELD_CONFIG[fieldName].label} is required for ${formConfig.payerName}`);
        }
    });

    // Check recommended fields (warnings only)
    formConfig.submitRequirements.recommended.forEach(fieldName => {
        if (!formData[fieldName] || formData[fieldName].trim() === '') {
            warnings.push(`${FIELD_CONFIG[fieldName].label} is recommended for best results with ${formConfig.payerName}`);
        }
    });

    // Field-specific validation
    if (formData.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
        errors.push('Date of birth must be in YYYY-MM-DD format');
    }

    if (formData.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(formData.ssn)) {
        errors.push('SSN must be in XXX-XX-XXXX format');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        canSubmit: errors.length === 0
    };
}

/**
 * Get all available payers grouped by category for dropdown
 */
function getPayerDropdownOptions() {
    const categories = {};
    
    Object.values(PAYER_CONFIGS).forEach(config => {
        if (!categories[config.category]) {
            categories[config.category] = [];
        }
        
        categories[config.category].push({
            value: config.id,
            label: config.displayName,
            description: config.notes,
            tested: config.id === 'UTAH_MEDICAID' || config.id === 'AETNA' // Mark tested payers
        });
    });

    // Sort categories and options
    const sortedCategories = Object.keys(categories).sort();
    const result = [];

    sortedCategories.forEach(category => {
        // Sort payers within category (tested first)
        categories[category].sort((a, b) => {
            if (a.tested && !b.tested) return -1;
            if (!a.tested && b.tested) return 1;
            return a.label.localeCompare(b.label);
        });

        result.push({
            category,
            payers: categories[category]
        });
    });

    return result;
}

/**
 * Get field requirements summary for display
 */
function getFieldRequirementsSummary(payerId) {
    const required = getRequiredFields(payerId);
    const recommended = getRecommendedFields(payerId);
    const optional = getOptionalFields(payerId);
    
    return {
        required: required.map(field => FIELD_CONFIG[field].label),
        recommended: recommended.map(field => FIELD_CONFIG[field].label),
        optional: optional.map(field => FIELD_CONFIG[field].label),
        total: required.length + recommended.length + optional.length
    };
}

/**
 * Generate help text for payer selection
 */
function getPayerHelpText(payerId) {
    const config = getPayerConfig(payerId);
    if (!config) return '';

    const summary = getFieldRequirementsSummary(payerId);
    const tested = payerId === 'UTAH_MEDICAID' || payerId === 'AETNA';
    
    let helpText = `${config.displayName} (${config.category}):\n`;
    helpText += `Required fields: ${summary.required.join(', ')}\n`;
    
    if (summary.recommended.length > 0) {
        helpText += `Recommended: ${summary.recommended.join(', ')}\n`;
    }
    
    if (config.notes) {
        helpText += `\nNotes: ${config.notes}`;
    }
    
    if (tested) {
        helpText += '\n✅ This payer configuration has been tested and verified.';
    } else {
        helpText += '\n⚠️  This payer configuration is based on Office Ally documentation but not yet tested.';
    }
    
    return helpText;
}

module.exports = {
    generateDynamicFormConfig,
    validateFormData,
    getPayerDropdownOptions,
    getFieldRequirementsSummary,
    getPayerHelpText,
    FIELD_TYPES
};