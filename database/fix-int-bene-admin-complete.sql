-- =====================================================
-- Fix International Benefits Administrators (First Health Network)
-- Complete fix to add payer to both tables correctly
-- =====================================================

-- Step 1: Add to payers table (if not exists)
INSERT INTO payers (
    name,
    display_name,
    payer_type,
    state,
    oa_eligibility_270_id,
    oa_professional_837p_id,
    oa_remit_835_id,
    supports_eligibility_270,
    supports_professional_837p,
    is_active,
    notes
) VALUES (
    'International Benefits Administrators (First Health Network)',
    'International Benefits Administrators (First Health Network)',
    'Commercial',
    NULL, -- Multi-state network
    'INT-BENE-ADMIN',
    '11329',
    '11329',
    true,
    true,
    true,
    'TPA for American Life Insurance Co. using First Health Network. Office Ally uses INT-BENE-ADMIN for eligibility, 11329 for claims.'
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    oa_eligibility_270_id = EXCLUDED.oa_eligibility_270_id,
    oa_professional_837p_id = EXCLUDED.oa_professional_837p_id,
    oa_remit_835_id = EXCLUDED.oa_remit_835_id,
    supports_eligibility_270 = EXCLUDED.supports_eligibility_270,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Step 2: Add to payer_office_ally_configs with proper foreign key
-- Use INSERT...ON CONFLICT to handle both new inserts and updates
INSERT INTO payer_office_ally_configs (
    payer_id,
    office_ally_payer_id,
    payer_display_name,
    category,
    required_fields,
    recommended_fields,
    optional_fields,
    requires_gender_in_dmg,
    supports_member_id_in_nm1,
    dtp_format,
    allows_name_only,
    is_tested,
    test_notes
)
SELECT
    p.id, -- Get the payer_id from the payers table
    'INT-BENE-ADMIN',
    'International Benefits Administrators (First Health Network)',
    'Commercial',
    '["firstName", "lastName", "dateOfBirth", "memberNumber"]'::jsonb,
    '["gender"]'::jsonb,
    '["groupNumber"]'::jsonb,
    false,
    true,
    'D8',
    false,
    false,
    'Nicholas Smith patient - Member ID: AFLMFEA684623879, DOB: 03/26/2004, Effective: 01/01/2025'
FROM payers p
WHERE p.name = 'International Benefits Administrators (First Health Network)'
ON CONFLICT (office_ally_payer_id) DO UPDATE SET
    payer_id = EXCLUDED.payer_id,
    payer_display_name = EXCLUDED.payer_display_name,
    category = EXCLUDED.category,
    required_fields = EXCLUDED.required_fields,
    recommended_fields = EXCLUDED.recommended_fields,
    optional_fields = EXCLUDED.optional_fields,
    requires_gender_in_dmg = EXCLUDED.requires_gender_in_dmg,
    supports_member_id_in_nm1 = EXCLUDED.supports_member_id_in_nm1,
    dtp_format = EXCLUDED.dtp_format,
    allows_name_only = EXCLUDED.allows_name_only,
    test_notes = EXCLUDED.test_notes,
    updated_at = NOW();

-- Step 3: Verify the VIEW now returns the config
SELECT
    '✅ INT-BENE-ADMIN Configuration' AS status,
    office_ally_payer_id,
    payer_display_name,
    category,
    is_tested
FROM v_office_ally_eligibility_configs
WHERE office_ally_payer_id = 'INT-BENE-ADMIN';

-- Step 4: Verify payer_office_ally_configs table has the record
SELECT
    '✅ payer_office_ally_configs record' AS status,
    office_ally_payer_id,
    payer_display_name,
    payer_id
FROM payer_office_ally_configs
WHERE office_ally_payer_id = 'INT-BENE-ADMIN';

-- Step 5: Verify Anthony Privratsky is configured as preferred provider
SELECT
    '✅ Anthony Privratsky config' AS status,
    office_ally_provider_name,
    provider_npi,
    is_preferred_for_payers,
    supported_office_ally_payer_ids
FROM v_provider_office_ally_configs
WHERE provider_npi = '1336726843';
