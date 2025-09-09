-- Update Utah Medicaid configuration to use practice Type 2 NPI (1275348807)
-- As requested by user: "We use our practice Type 2 NPI, you should see it in the database but it's 1275348807"

-- First, let's see what provider configurations we currently have
SELECT 
    id,
    provider_npi,
    first_name,
    last_name,
    provider_type,
    is_active
FROM provider_office_ally_configs 
ORDER BY provider_npi;

-- Update the Utah Medicaid configuration to use the practice Type 2 NPI
-- Find the current Utah Medicaid config and update it
UPDATE payer_office_ally_configs 
SET preferred_provider_npi = '1275348807'
WHERE office_ally_payer_id = 'UTMCD';

-- Verify the update
SELECT 
    payer_display_name,
    office_ally_payer_id,
    preferred_provider_npi,
    category
FROM payer_office_ally_configs 
WHERE office_ally_payer_id = 'UTMCD';

-- Also need to ensure we have a provider config for the practice NPI
-- Add practice Type 2 NPI if it doesn't exist
INSERT INTO provider_office_ally_configs (
    provider_npi,
    first_name,
    last_name,
    provider_type,
    taxonomy_code,
    office_ally_sender_id,
    is_active,
    notes
) VALUES (
    '1275348807',
    'MOONLIT',
    'PLLC',
    'Type 2 - Practice',
    '261QP2300X',  -- Group Mental Health Provider
    '1161680',
    true,
    'Practice Type 2 NPI for Utah Medicaid - Primary NPI for eligibility checks'
) 
ON CONFLICT (provider_npi) DO UPDATE SET
    is_active = true,
    notes = 'Practice Type 2 NPI for Utah Medicaid - Primary NPI for eligibility checks';

-- Final verification - show the complete Utah Medicaid configuration
SELECT 
    p.payer_display_name,
    p.office_ally_payer_id,
    p.preferred_provider_npi,
    pr.first_name,
    pr.last_name,
    pr.provider_type,
    pr.is_active as provider_active
FROM payer_office_ally_configs p
LEFT JOIN provider_office_ally_configs pr ON p.preferred_provider_npi = pr.provider_npi
WHERE p.office_ally_payer_id = 'UTMCD';