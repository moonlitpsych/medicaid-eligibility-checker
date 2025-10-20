-- Update v_provider_office_ally_configs VIEW to include tax_id
-- This is needed for payers like First Health/IBA that require TIN in X12 270

CREATE OR REPLACE VIEW v_provider_office_ally_configs AS
SELECT
    proac.id AS config_id,
    proac.provider_id,
    p.first_name,
    p.last_name,
    p.npi,
    p.tax_id,  -- ADD THIS LINE
    proac.office_ally_provider_name,
    proac.provider_npi,
    proac.supported_office_ally_payer_ids,
    proac.is_preferred_for_payers,
    proac.notes,
    proac.is_active,
    proac.created_at,
    proac.updated_at
FROM provider_office_ally_configs proac
JOIN providers p ON p.id = proac.provider_id
WHERE proac.is_active = true
ORDER BY p.last_name, p.first_name;
