/**
 * Database-Driven Eligibility Service
 * 
 * Replaces hardcoded payer configurations with Supabase database-driven
 * approach for Office Ally eligibility checking.
 * 
 * This service loads payer configurations and provider mappings from
 * the database and provides dynamic form generation and eligibility
 * checking based on stored configurations.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
    receiverID: 'OFFALLY'
};

/**
 * Get all available payers for dropdown options
 */
async function getPayerDropdownOptions() {
    try {
        const { data: configs, error } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .order('category, payer_display_name');

        if (error) throw error;

        // Group by category
        const categories = {};
        
        configs.forEach(config => {
            if (!categories[config.category]) {
                categories[config.category] = [];
            }
            
            categories[config.category].push({
                value: config.office_ally_payer_id,
                label: config.payer_display_name,
                description: config.test_notes,
                tested: config.is_tested
            });
        });

        // Convert to array format expected by frontend
        return Object.entries(categories).map(([category, payers]) => ({
            category,
            payers
        }));

    } catch (error) {
        console.error('Error fetching payer dropdown options:', error);
        return [];
    }
}

/**
 * Get payer configuration by Office Ally payer ID
 */
async function getPayerConfig(officeAllyPayerId) {
    try {
        const { data: config, error } = await supabase
            .from('v_office_ally_eligibility_configs')
            .select('*')
            .eq('office_ally_payer_id', officeAllyPayerId)
            .single();

        if (error) throw error;

        return {
            id: officeAllyPayerId,
            name: config.payer_name,
            displayName: config.payer_display_name,
            category: config.category,
            officeAllyPayerId: config.office_ally_payer_id,
            payerName: config.payer_display_name.toUpperCase(),
            fields: parseFieldRequirements(config),
            x12Specifics: {
                requiresGenderInDMG: config.requires_gender_in_dmg,
                supportsMemberIdInNM1: config.supports_member_id_in_nm1,
                dtpFormat: config.dtp_format,
                allowsNameOnly: config.allows_name_only
            },
            notes: config.test_notes,
            tested: config.is_tested
        };

    } catch (error) {
        console.error(`Error fetching config for payer ${officeAllyPayerId}:`, error);
        return null;
    }
}

/**
 * Parse field requirements from database JSON into form format
 */
function parseFieldRequirements(config) {
    const FIELD_TYPES = {
        REQUIRED: 'required',
        RECOMMENDED: 'recommended',
        OPTIONAL: 'optional'
    };

    const fields = {};
    const allFieldNames = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 
        'memberNumber', 'medicaidId', 'groupNumber', 'ssn', 'address'
    ];

    // Initialize all fields as not needed
    allFieldNames.forEach(fieldName => {
        fields[fieldName] = 'not_needed';
    });

    // Set required fields
    if (config.required_fields) {
        config.required_fields.forEach(fieldName => {
            fields[fieldName] = FIELD_TYPES.REQUIRED;
        });
    }

    // Set recommended fields
    if (config.recommended_fields) {
        config.recommended_fields.forEach(fieldName => {
            fields[fieldName] = FIELD_TYPES.RECOMMENDED;
        });
    }

    // Set optional fields
    if (config.optional_fields) {
        config.optional_fields.forEach(fieldName => {
            fields[fieldName] = FIELD_TYPES.OPTIONAL;
        });
    }

    return fields;
}

/**
 * Get preferred provider for a given Office Ally payer ID
 */
async function getPreferredProvider(officeAllyPayerId) {
    try {
        // First try to find a provider who has this payer as preferred
        const { data: preferredProvider, error: preferredError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .contains('is_preferred_for_payers', [officeAllyPayerId])
            .eq('is_active', true)
            .limit(1)
            .single();

        if (!preferredError && preferredProvider) {
            return {
                name: preferredProvider.office_ally_provider_name,
                npi: preferredProvider.provider_npi
            };
        }

        // Fallback: Find any provider that supports this payer
        const { data: supportingProvider, error: supportError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .contains('supported_office_ally_payer_ids', [officeAllyPayerId])
            .eq('is_active', true)
            .limit(1)
            .single();

        if (!supportError && supportingProvider) {
            return {
                name: supportingProvider.office_ally_provider_name,
                npi: supportingProvider.provider_npi
            };
        }

        // Final fallback: Use first active provider
        const { data: fallbackProvider, error: fallbackError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (!fallbackError && fallbackProvider) {
            console.warn(`No specific provider found for ${officeAllyPayerId}, using fallback: ${fallbackProvider.office_ally_provider_name}`);
            return {
                name: fallbackProvider.office_ally_provider_name,
                npi: fallbackProvider.provider_npi
            };
        }

        throw new Error('No active providers found in database');

    } catch (error) {
        console.error(`Error finding provider for ${officeAllyPayerId}:`, error);
        
        // Hard fallback to known working providers
        if (officeAllyPayerId === '60054') { // Aetna
            return { name: 'TRAVIS NORSETH', npi: '1124778121' };
        }
        return { name: 'MOONLIT PLLC', npi: '1023711348' }; // Rufus Sweeney
    }
}

/**
 * Generate dynamic form configuration for frontend
 */
async function generateDynamicFormConfig(officeAllyPayerId) {
    const payerConfig = await getPayerConfig(officeAllyPayerId);
    if (!payerConfig) {
        throw new Error(`Invalid payer ID: ${officeAllyPayerId}`);
    }

    // Field labels and configurations
    const FIELD_CONFIG = {
        firstName: {
            label: 'First Name',
            placeholder: 'Enter first name',
            helpText: 'Patient\'s legal first name',
            type: 'text'
        },
        lastName: {
            label: 'Last Name',
            placeholder: 'Enter last name',
            helpText: 'Patient\'s legal last name',
            type: 'text'
        },
        dateOfBirth: {
            label: 'Date of Birth',
            placeholder: 'YYYY-MM-DD',
            helpText: 'Patient\'s date of birth (required for all payers)',
            type: 'date'
        },
        gender: {
            label: 'Gender',
            placeholder: 'Select gender',
            helpText: 'M = Male, F = Female (required for most commercial payers)',
            type: 'select',
            options: [
                { value: 'M', label: 'Male' },
                { value: 'F', label: 'Female' },
                { value: 'U', label: 'Unknown' }
            ]
        },
        medicaidId: {
            label: 'Medicaid ID',
            placeholder: 'Enter Medicaid ID',
            helpText: 'State Medicaid identification number',
            type: 'text'
        },
        memberNumber: {
            label: 'Member ID',
            placeholder: 'Enter member number',
            helpText: 'Insurance member/subscriber ID from insurance card',
            type: 'text'
        },
        groupNumber: {
            label: 'Group Number',
            placeholder: 'Enter group number',
            helpText: 'Group/employer ID from insurance card',
            type: 'text'
        },
        ssn: {
            label: 'Social Security Number',
            placeholder: 'XXX-XX-XXXX',
            helpText: 'Patient\'s SSN (rarely needed for eligibility)',
            type: 'text'
        },
        address: {
            label: 'Address',
            placeholder: 'Enter address',
            helpText: 'Patient\'s current address',
            type: 'textarea'
        }
    };

    const formConfig = {
        payerId: officeAllyPayerId,
        payerName: payerConfig.displayName,
        category: payerConfig.category,
        notes: payerConfig.notes,
        fields: [],
        submitRequirements: {
            required: [],
            recommended: [],
            optional: []
        }
    };

    // Generate field configurations
    Object.entries(payerConfig.fields).forEach(([fieldName, requirement]) => {
        if (requirement === 'not_needed') return;

        const baseFieldConfig = FIELD_CONFIG[fieldName];
        if (!baseFieldConfig) return;

        const fieldConfig = {
            name: fieldName,
            ...baseFieldConfig,
            requirement: requirement,
            isRequired: requirement === 'required',
            isRecommended: requirement === 'recommended',
            isOptional: requirement === 'optional'
        };

        formConfig.fields.push(fieldConfig);

        // Add to appropriate requirement list
        if (requirement === 'required') {
            formConfig.submitRequirements.required.push(fieldName);
        } else if (requirement === 'recommended') {
            formConfig.submitRequirements.recommended.push(fieldName);
        } else if (requirement === 'optional') {
            formConfig.submitRequirements.optional.push(fieldName);
        }
    });

    // Sort fields by priority (required first, then recommended, then optional)
    formConfig.fields.sort((a, b) => {
        const priorityMap = { required: 3, recommended: 2, optional: 1 };
        return priorityMap[b.requirement] - priorityMap[a.requirement];
    });

    return formConfig;
}

/**
 * Generate X12 270 request using database-driven configuration
 */
async function generateDatabaseDrivenX12_270(patientData, officeAllyPayerId) {
    const payerConfig = await getPayerConfig(officeAllyPayerId);
    const providerInfo = await getPreferredProvider(officeAllyPayerId);

    if (!payerConfig || !providerInfo) {
        throw new Error(`Configuration not found for payer: ${officeAllyPayerId}`);
    }

    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patientData.dateOfBirth || '').replace(/-/g,'');

    // Pad ISA fields to 15 characters
    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15(OFFICE_ALLY_CONFIG.senderID);
    const ISA08 = pad15(OFFICE_ALLY_CONFIG.receiverID);

    const seg = [];

    // ISA - Interchange Control Header
    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    
    // GS - Functional Group Header
    seg.push(`GS*HS*${OFFICE_ALLY_CONFIG.senderID}*${OFFICE_ALLY_CONFIG.receiverID}*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    
    // ST - Transaction Set Header
    seg.push(`ST*270*0001*005010X279A1`);
    
    // BHT - Beginning of Hierarchical Transaction
    seg.push(`BHT*0022*13*${providerInfo.name.replace(/\s/g, '')}-${ctrl}*20${yymmdd}*${hhmm}`);

    // 2100A: Information Source (Payer)
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*${payerConfig.payerName}*****PI*${payerConfig.officeAllyPayerId}`);

    // 2100B: Information Receiver (Provider)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*${providerInfo.name}*****XX*${providerInfo.npi}`);

    // 2100C: Subscriber (Patient)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*${providerInfo.npi}*ELIGIBILITY`);
    
    // NM1 - Patient Name segment with payer-specific requirements
    let nm1Segment = `NM1*IL*1*${(patientData.lastName||'').toUpperCase()}*${(patientData.firstName||'').toUpperCase()}`;
    
    // Add member ID if provided and supported by payer
    if (patientData.memberNumber && payerConfig.x12Specifics.supportsMemberIdInNM1) {
        nm1Segment += `****MI*${patientData.memberNumber}`;
    } else if (patientData.medicaidId && payerConfig.x12Specifics.supportsMemberIdInNM1) {
        nm1Segment += `****MI*${patientData.medicaidId}`;
    }
    
    seg.push(nm1Segment);
    
    // DMG - Demographics segment
    let dmgSegment = `DMG*D8*${dob}`;
    if (payerConfig.x12Specifics.requiresGenderInDMG && patientData.gender) {
        const validGender = patientData.gender.toUpperCase();
        if (['M', 'F'].includes(validGender)) {
            dmgSegment += `*${validGender}`;
        }
    }
    seg.push(dmgSegment);
    
    // DTP - Date segment with payer-specific format
    if (payerConfig.x12Specifics.dtpFormat === 'RD8') {
        // Range date format (used by Utah Medicaid)
        seg.push(`DTP*291*RD8*${ccyymmdd}-${ccyymmdd}`);
    } else {
        // Single date format (used by most commercial payers)
        seg.push(`DTP*291*D8*${ccyymmdd}`);
    }
    
    // EQ - Eligibility or Benefit Inquiry
    seg.push(`EQ*30`); // 30 = Health Benefit Plan Coverage

    // SE - Transaction Set Trailer
    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    
    // GE - Functional Group Trailer
    seg.push(`GE*1*${ctrl}`);
    
    // IEA - Interchange Control Trailer
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

/**
 * Enhanced X12 271 parsing for auto-population
 */
async function parseX12_271ForAutoPopulation(x12_271, patientData) {
    try {
        const extractedData = {
            phone: null,
            medicaidId: null,
            gender: null,
            address: null,
            memberInfo: null
        };

        // Extract phone number from various possible segments
        // Look in PER segments for phone numbers
        const perPhoneMatch = x12_271.match(/PER\*[^~]*\*[^~]*\*TE\*([0-9]{10})[^~]*/i);
        if (perPhoneMatch) {
            extractedData.phone = perPhoneMatch[1];
        } else {
            // Alternative phone extraction from DMG or other segments
            const phoneMatch = x12_271.match(/([0-9]{10})/);
            if (phoneMatch) {
                extractedData.phone = phoneMatch[1];
            }
        }

        // Extract gender from DMG segment
        const genderMatch = x12_271.match(/DMG\*D8\*[0-9]{8}\*([MFU])/i);
        if (genderMatch) {
            extractedData.gender = genderMatch[1].toUpperCase();
        }

        // Extract Medicaid ID from various segments
        const medicaidMatches = [
            x12_271.match(/NM1\*IL\*[^~]*\*[^~]*\*[^~]*\*[^~]*\*[^~]*\*MI\*([A-Z0-9]+)/i),
            x12_271.match(/REF\*1L\*([A-Z0-9]+)/i),
            x12_271.match(/REF\*SY\*([A-Z0-9]+)/i)
        ];
        
        for (const match of medicaidMatches) {
            if (match && match[1]) {
                extractedData.medicaidId = match[1];
                break;
            }
        }

        // Extract address from N3/N4 segments
        const addressMatch = x12_271.match(/N3\*([^~]+)~N4\*([^~]+)\*([^~]+)\*([^~]+)/i);
        if (addressMatch) {
            extractedData.address = {
                street: addressMatch[1],
                city: addressMatch[2],
                state: addressMatch[3],
                zip: addressMatch[4]
            };
        }

        // Extract member information from additional segments
        const memberIdMatch = x12_271.match(/REF\*0F\*([A-Z0-9]+)/i);
        if (memberIdMatch) {
            extractedData.memberInfo = {
                subscriberId: memberIdMatch[1]
            };
        }

        console.log('📋 Extracted data from X12 271:', extractedData);
        return extractedData;

    } catch (error) {
        console.error('❌ X12 271 parsing failed:', error);
        return {
            phone: null,
            medicaidId: null,
            gender: null,
            address: null,
            memberInfo: null
        };
    }
}

/**
 * Log eligibility check to database with enhanced parsing
 */
async function logEligibilityCheck(patientData, officeAllyPayerId, x12_270, x12_271, result, responseTime) {
    try {
        // Get payer and provider info for logging
        const payerConfig = await getPayerConfig(officeAllyPayerId);
        const providerInfo = await getPreferredProvider(officeAllyPayerId);
        
        // Get the actual payer UUID from the payer_office_ally_configs table
        const { data: payerRecord, error: payerError } = await supabase
            .from('payer_office_ally_configs')
            .select('payer_id')
            .eq('office_ally_payer_id', officeAllyPayerId)
            .single();
        
        // Get the actual provider UUID from the provider_office_ally_configs table
        const { data: providerRecord, error: providerError } = await supabase
            .from('provider_office_ally_configs')
            .select('provider_id')
            .eq('provider_npi', providerInfo?.npi)
            .single();
        
        // Log to eligibility_log table
        const { data: logEntry, error: logError } = await supabase
            .from('eligibility_log')
            .insert([{
                patient_first_name: patientData.firstName?.trim(),
                patient_last_name: patientData.lastName?.trim(),
                patient_dob: patientData.dateOfBirth,
                ssn_last_four: patientData.ssn ? patientData.ssn.replace(/\D/g, '').slice(-4) : null,
                medicaid_id: patientData.medicaidId || patientData.memberNumber || null,
                raw_270: x12_270,
                raw_271: x12_271,
                sftp_filename: `database_driven_${officeAllyPayerId}_${Date.now()}.json`,
                result: JSON.stringify(result),
                is_enrolled: result.enrolled,
                processing_time_ms: responseTime,
                payer_id: payerRecord?.payer_id || null,
                office_ally_payer_id: officeAllyPayerId,
                provider_npi: providerInfo?.npi,
                provider_id: providerRecord?.provider_id || null
            }])
            .select()
            .single();

        if (logError) {
            console.error('Database logging failed:', logError);
            return null;
        }

        // If successful and enrolled, parse X12 271 for extracted data
        if (result.enrolled && x12_271) {
            const extractedData = await parseX12_271ForAutoPopulation(x12_271, patientData);
            
            // Store parsed data using database function
            const { data: parsedData, error: parseError } = await supabase
                .rpc('parse_x12_271_for_patient_data', {
                    p_x12_271_data: x12_271,
                    p_patient_first_name: patientData.firstName?.trim(),
                    p_patient_last_name: patientData.lastName?.trim(),
                    p_patient_dob: patientData.dateOfBirth,
                    p_eligibility_log_id: logEntry.id
                });

            if (parseError) {
                console.warn('⚠️ X12 271 parsing function failed:', parseError.message);
            } else {
                console.log('✅ X12 271 data parsed and stored successfully');
                
                // Add extracted data to result for frontend use
                result.extractedData = extractedData;
            }
        }

        console.log('✅ Database-driven eligibility check logged successfully');
        return logEntry;
        
    } catch (error) {
        console.error('Error logging eligibility check:', error);
        return null;
    }
}

module.exports = {
    getPayerDropdownOptions,
    getPayerConfig,
    getPreferredProvider,
    generateDynamicFormConfig,
    generateDatabaseDrivenX12_270,
    logEligibilityCheck,
    parseX12_271ForAutoPopulation,
    supabase
};