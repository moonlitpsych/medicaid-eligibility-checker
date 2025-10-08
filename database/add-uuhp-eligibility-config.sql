-- =====================================================
-- Add UUHP (University of Utah Health Plans) to Office Ally Eligibility Configs
-- =====================================================
--
-- This fixes the "Payer not configured: UNIV-UTHP" error by adding
-- UUHP to the payer_office_ally_configs table.
--
-- UUHP Details:
-- - Office Ally Eligibility ID: UNIV-UTHP
-- - Category: Medicaid Managed Care (ACO)
-- - Full Name: University of Utah Health Plans
--
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Insert Office Ally config for UUHP
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
    p.id,
    'UNIV-UTHP',
    'University of Utah Health Plans (UUHP)',
    'Medicaid Managed Care',
    '["firstName", "lastName", "dateOfBirth", "gender"]'::jsonb,
    '["memberNumber"]'::jsonb,
    '["groupNumber"]'::jsonb,
    true,              -- requires_gender_in_dmg (typical for managed care)
    true,              -- supports_member_id_in_nm1
    'D8',              -- dtp_format (standard date format)
    false,             -- allows_name_only (needs full info for managed care)
    false,             -- is_tested (not yet tested)
    'Ready for testing - UUHP Medicaid Managed Care plan'
FROM payers p
WHERE (LOWER(p.name) LIKE '%university of utah health%'
   OR LOWER(p.name) LIKE '%uuhp%'
   OR LOWER(p.name) LIKE '%healthyu%')
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs
    WHERE office_ally_payer_id = 'UNIV-UTHP'
  )
LIMIT 1;

-- Verify the insertion
SELECT
    poac.office_ally_payer_id,
    poac.payer_display_name,
    poac.category,
    poac.is_tested,
    p.name as payer_table_name
FROM payer_office_ally_configs poac
JOIN payers p ON p.id = poac.payer_id
WHERE poac.office_ally_payer_id = 'UNIV-UTHP';
