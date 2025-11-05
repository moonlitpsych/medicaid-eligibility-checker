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
const { parseX12_271Comprehensive } = require('./lib/x12-271-comprehensive-parser');
const { validatePatientData } = require('./lib/patient-data-validator');

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
        // Helper function to get TIN from providers table
        async function getTinForNPI(npi) {
            const { data: providerData } = await supabase
                .from('providers')
                .select('tax_id')
                .eq('npi', npi)
                .single();
            return providerData?.tax_id || null;
        }

        // First try to find a provider who has this payer as preferred
        const { data: preferredProvider, error: preferredError } = await supabase
            .from('v_provider_office_ally_configs')
            .select('*')
            .contains('is_preferred_for_payers', [officeAllyPayerId])
            .eq('is_active', true)
            .limit(1)
            .single();

        if (!preferredError && preferredProvider) {
            const tin = await getTinForNPI(preferredProvider.provider_npi);
            return {
                name: preferredProvider.office_ally_provider_name,
                npi: preferredProvider.provider_npi,
                tin: tin
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
            const tin = await getTinForNPI(supportingProvider.provider_npi);
            return {
                name: supportingProvider.office_ally_provider_name,
                npi: supportingProvider.provider_npi,
                tin: tin
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
            const tin = await getTinForNPI(fallbackProvider.provider_npi);
            return {
                name: fallbackProvider.office_ally_provider_name,
                npi: fallbackProvider.provider_npi,
                tin: tin
            };
        }

        throw new Error('No active providers found in database');

    } catch (error) {
        console.error(`Error finding provider for ${officeAllyPayerId}:`, error);

        // Hard fallback to known working providers with TINs
        if (officeAllyPayerId === '60054') { // Aetna
            return { name: 'TRAVIS NORSETH', npi: '1124778121', tin: '332185708' }; // Moonlit's TIN
        }
        return { name: 'MOONLIT PLLC', npi: '1275348807', tin: '332185708' }; // Moonlit's TIN
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

    // Use LOCAL time for dates (not UTC) to avoid "future date" errors
    // When it's Oct 7 @ 6pm Mountain Time, UTC shows Oct 8 which payers reject
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const yymmdd = `${String(year).slice(2)}${month}${day}`;
    const hhmm = `${hours}${minutes}`;

    // Use service date if provided (for historical eligibility checks)
    // Otherwise use today's date
    let ccyymmdd = `${year}${month}${day}`;
    if (patientData.serviceDate) {
        ccyymmdd = patientData.serviceDate.replace(/-/g, '');
    }

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

    // Determine if provider is individual (Type 1) or organization (Type 2)
    const isOrganization = /\b(PLLC|LLC|PC|INC|CORP|ASSOCIATES|GROUP|CENTER|CLINIC)\b/i.test(providerInfo.name);

    if (isOrganization) {
        // Type 2: Non-Person Entity (Organization)
        seg.push(`NM1*1P*2*${providerInfo.name}*****XX*${providerInfo.npi}`);
    } else {
        // Type 1: Person (Individual Provider)
        // Parse name: "ANTHONY_PRIVRATSKY" or "ANTHONY PRIVRATSKY" -> "PRIVRATSKY*ANTHONY"
        const nameParts = providerInfo.name.replace(/_/g, ' ').trim().split(/\s+/);
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            seg.push(`NM1*1P*1*${lastName}*${firstName}****XX*${providerInfo.npi}`);
        } else {
            // Fallback: use as-is with Type 1
            seg.push(`NM1*1P*1*${providerInfo.name}*****XX*${providerInfo.npi}`);
        }
    }

    // REF - Provider Tax ID (TIN) - Temporarily disabled due to X12 999 rejection
    // Some clearinghouses don't accept REF*EI in the 2100B loop
    // if (providerInfo.tin) {
    //     seg.push(`REF*EI*${providerInfo.tin}`);
    // }

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

    // DMG - Demographics segment (only include if we have DOB)
    if (dob) {
        let dmgSegment = `DMG*D8*${dob}`;
        if (payerConfig.x12Specifics.requiresGenderInDMG && patientData.gender) {
            const validGender = patientData.gender.toUpperCase();
            if (['M', 'F'].includes(validGender)) {
                dmgSegment += `*${validGender}`;
            }
        }
        seg.push(dmgSegment);
    }

    // DTP - Date segment for service/inquiry date
    // IMPORTANT: Most payers do NOT want a DTP segment in the request
    // Utah Medicaid specifically rejects requests with DTP segments (X12 999 error)
    // The DTP*291 in the RESPONSE tells us the coverage period
    // For now, we're NOT sending any DTP segment in requests
    //
    // TODO: Add payer-specific configuration for DTP requirements
    // Some commercial payers might need DTP*472 (Service Date)
    // But Utah Medicaid and others don't want it at all
    
    // EQ - Eligibility or Benefit Inquiry (Request multiple service types for detailed copay info)
    seg.push(`EQ*30`); // 30 = Health Benefit Plan Coverage (general)
    seg.push(`EQ*98`); // 98 = Professional (Physician) Visit - Office (gets PCP/specialist copays)
    seg.push(`EQ*A8`); // A8 = Psychiatric - Outpatient (mental health specific)

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
 * Now uses comprehensive parser to extract ALL available data
 */
async function parseX12_271ForAutoPopulation(x12_271, patientData) {
    try {
        // Use the comprehensive parser to extract all available data
        const comprehensiveData = parseX12_271Comprehensive(x12_271, patientData);

        // If we have IntakeQ patient data, validate against payer data
        let validationResults = null;
        if (patientData.intakeqClientId) {
            // Fetch the IntakeQ client data
            const { data: intakeqClient, error } = await supabase
                .from('intakeq_clients')
                .select('*')
                .eq('intakeq_client_id', patientData.intakeqClientId)
                .single();

            if (intakeqClient && !error) {
                // Validate the data
                validationResults = validatePatientData(intakeqClient, comprehensiveData);

                // Store validation results and verified data in database
                const updateData = {
                    // Update verified fields
                    verified_phone: comprehensiveData.phone,
                    verified_dob: comprehensiveData.dateOfBirth,
                    verified_gender: comprehensiveData.gender,
                    verified_first_name: comprehensiveData.patientName?.firstName,
                    verified_last_name: comprehensiveData.patientName?.lastName,
                    verified_middle_name: comprehensiveData.patientName?.middleName,

                    // Update verified address
                    verified_address_street: comprehensiveData.address?.street,
                    verified_address_city: comprehensiveData.address?.city,
                    verified_address_state: comprehensiveData.address?.state,
                    verified_address_zip: comprehensiveData.address?.zip,

                    // Update current payer information
                    current_payer_name: comprehensiveData.payerInfo?.name,
                    current_payer_id: comprehensiveData.payerInfo?.payerId,
                    current_member_id: comprehensiveData.medicaidId,
                    current_coverage_start_date: comprehensiveData.coveragePeriod?.startDate,
                    current_coverage_end_date: comprehensiveData.coveragePeriod?.endDate,
                    coverage_is_active: comprehensiveData.coveragePeriod?.isActive,

                    // Update reference numbers
                    case_number: comprehensiveData.references?.caseNumber,
                    patient_account_number: comprehensiveData.references?.patientAccountNumber,
                    group_number: comprehensiveData.references?.groupNumber,
                    policy_number: comprehensiveData.references?.policyNumber,
                    alternate_member_id: comprehensiveData.references?.alternateId,

                    // Update eligibility tracking
                    last_eligibility_check: new Date().toISOString(),
                    eligibility_status: comprehensiveData.coveragePeriod?.isActive ? 'ACTIVE' :
                                      comprehensiveData.coveragePeriod?.isExpired ? 'EXPIRED' : 'UNKNOWN',

                    // Update managed care and provider info
                    managed_care_org_name: comprehensiveData.managedCareOrg?.name,
                    managed_care_org_id: comprehensiveData.managedCareOrg?.payerId,
                    managed_care_org_type: comprehensiveData.managedCareOrg?.type,
                    primary_care_provider_name: comprehensiveData.primaryCareProvider?.name,
                    primary_care_provider_npi: comprehensiveData.primaryCareProvider?.npi,
                    primary_care_provider_phone: comprehensiveData.primaryCareProvider?.phone,

                    // Update COB information
                    has_other_insurance: comprehensiveData.otherInsurance?.hasOtherInsurance,
                    other_insurance_details: comprehensiveData.otherInsurance?.otherPayers?.length > 0 ?
                                           comprehensiveData.otherInsurance : null,

                    // Update payer messages
                    payer_messages: comprehensiveData.messages?.length > 0 ? comprehensiveData.messages : null,

                    // Store data quality issues
                    data_quality_issues: validationResults?.hasIssues ? validationResults.issues : null,
                    data_verification_source: 'X12_271',
                    data_verified_at: new Date().toISOString()
                };

                // Remove null/undefined values to avoid overwriting with null
                Object.keys(updateData).forEach(key => {
                    if (updateData[key] === undefined) {
                        delete updateData[key];
                    }
                });

                // Update the patient record
                const { error: updateError } = await supabase
                    .from('intakeq_clients')
                    .update(updateData)
                    .eq('intakeq_client_id', patientData.intakeqClientId);

                if (updateError) {
                    console.error('Failed to update patient with verified data:', updateError);
                } else {
                    console.log('✅ Patient data updated with payer-verified information');
                }
            }
        }

        // Add validation results to the comprehensive data
        comprehensiveData.dataValidation = validationResults;

        // Return comprehensive data (maintains backward compatibility)
        return comprehensiveData;

    } catch (error) {
        console.error('❌ Enhanced X12 271 parsing failed, falling back to basic parser:', error);

        // Fall back to the original basic parsing implementation
        const extractedData = {
            phone: null,
            medicaidId: null,
            gender: null,
            address: null,
            memberInfo: null,
            memberIdValidation: {
                sent: patientData.memberNumber || patientData.medicaidId || null,
                returned: null,
                matches: null,
                warnings: []
            },
            coveragePeriod: {
                startDate: null,
                endDate: null,
                isActive: null,
                isExpired: null,
                expirationDate: null
            }
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
                extractedData.memberIdValidation.returned = match[1];
                break;
            }
        }

        // Validate member ID matches what was sent
        if (extractedData.memberIdValidation.sent && extractedData.memberIdValidation.returned) {
            const sent = extractedData.memberIdValidation.sent.trim().toUpperCase();
            const returned = extractedData.memberIdValidation.returned.trim().toUpperCase();

            extractedData.memberIdValidation.matches = (sent === returned);

            if (!extractedData.memberIdValidation.matches) {
                extractedData.memberIdValidation.warnings.push({
                    severity: 'CRITICAL',
                    type: 'MEMBER_ID_MISMATCH',
                    message: `Member ID mismatch! You sent ${sent}, but payer returned ${returned}`,
                    details: `This may indicate: (1) Patient has coverage under a different member ID, (2) Wrong payer selected, or (3) Payer cross-referenced with another database`
                });
                console.log(`⚠️ CRITICAL: Member ID mismatch - sent: ${sent}, returned: ${returned}`);
            } else {
                console.log(`✅ Member ID validation passed: ${sent}`);
            }
        } else if (extractedData.memberIdValidation.sent && !extractedData.memberIdValidation.returned) {
            extractedData.memberIdValidation.warnings.push({
                severity: 'WARNING',
                type: 'NO_MEMBER_ID_RETURNED',
                message: `Payer did not return a member ID in the response`,
                details: `You sent member ID ${extractedData.memberIdValidation.sent}, but the payer's response doesn't include a member ID. This may be normal for some payers.`
            });
        }

        // Parse coverage dates from DTP segments
        // DTP*291 = Plan Begin/End Date (most important for determining if coverage is active)
        const planDateMatch = x12_271.match(/DTP\*291\*RD8\*([0-9]{8})-([0-9]{8})/i);
        if (planDateMatch) {
            const startDateStr = planDateMatch[1]; // YYYYMMDD format
            const endDateStr = planDateMatch[2];

            // Parse dates
            extractedData.coveragePeriod.startDate = `${startDateStr.substring(0,4)}-${startDateStr.substring(4,6)}-${startDateStr.substring(6,8)}`;
            extractedData.coveragePeriod.endDate = `${endDateStr.substring(0,4)}-${endDateStr.substring(4,6)}-${endDateStr.substring(6,8)}`;
            extractedData.coveragePeriod.expirationDate = extractedData.coveragePeriod.endDate;

            // Check if coverage has expired
            // Coverage that ends today is still valid for today
            // Use simple string comparison for YYYY-MM-DD format dates
            const todayStr = new Date().toISOString().split('T')[0]; // Format: "YYYY-MM-DD"

            // Coverage is expired if end date is before today (not including today)
            // We can compare the formatted endDate directly
            extractedData.coveragePeriod.isExpired = extractedData.coveragePeriod.endDate < todayStr;
            extractedData.coveragePeriod.isActive = !extractedData.coveragePeriod.isExpired;

            if (extractedData.coveragePeriod.isExpired) {
                const endDate = new Date(extractedData.coveragePeriod.endDate);
                const today = new Date(todayStr);
                const daysExpired = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
                const monthsExpired = Math.floor(daysExpired / 30);
                const yearsExpired = Math.floor(daysExpired / 365);

                let expiredDuration = '';
                if (yearsExpired > 0) {
                    expiredDuration = `${yearsExpired} year${yearsExpired > 1 ? 's' : ''} and ${monthsExpired % 12} month${monthsExpired % 12 !== 1 ? 's' : ''}`;
                } else if (monthsExpired > 0) {
                    expiredDuration = `${monthsExpired} month${monthsExpired > 1 ? 's' : ''}`;
                } else {
                    expiredDuration = `${daysExpired} day${daysExpired !== 1 ? 's' : ''}`;
                }

                extractedData.memberIdValidation.warnings.push({
                    severity: 'CRITICAL',
                    type: 'COVERAGE_EXPIRED',
                    message: `Coverage has EXPIRED! Last active date was ${extractedData.coveragePeriod.endDate}`,
                    details: `This coverage ended ${expiredDuration} ago. The payer returned historical eligibility data, not current active coverage. This patient likely needs to re-enroll or has switched to a different payer.`,
                    coveragePeriod: `${extractedData.coveragePeriod.startDate} to ${extractedData.coveragePeriod.endDate}`
                });
                console.log(`🚨 CRITICAL: Coverage expired ${expiredDuration} ago (ended ${extractedData.coveragePeriod.endDate})`);
            } else {
                console.log(`✅ Coverage is active: ${extractedData.coveragePeriod.startDate} to ${extractedData.coveragePeriod.endDate}`);
            }
        }

        // Also check for DTP*356 (Effective Date) as fallback
        if (!extractedData.coveragePeriod.startDate) {
            const effectiveDateMatch = x12_271.match(/DTP\*356\*D8\*([0-9]{8})/i);
            if (effectiveDateMatch) {
                const dateStr = effectiveDateMatch[1];
                extractedData.coveragePeriod.startDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
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