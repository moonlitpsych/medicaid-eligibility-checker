-- Add International Benefits Administrators (First Health Network TPA)
-- Based on Nicholas Smith's insurance card
-- Insurer: American Life Insurance Co.
-- Network: First Health Network
-- Administrator: International Benefits Administrators

INSERT INTO payers (
    name,
    display_name,
    category,
    oa_eligibility_270_id,
    oa_professional_837p_id,
    oa_remit_835_id,
    requires_member_id,
    supports_real_time_eligibility,
    notes
) VALUES (
    'International Benefits Administrators',
    'International Benefits Administrators (First Health Network)',
    'Commercial',
    'INT-BENE-ADMIN',
    '11329',  -- EDI Payor ID from insurance card
    '11329',  -- Assuming same for remittance
    true,
    true,
    'TPA for American Life Insurance Co. using First Health Network. Also accepts payer ID 11329 (EDI Payor ID from card).'
)
ON CONFLICT (name) DO UPDATE SET
    oa_eligibility_270_id = EXCLUDED.oa_eligibility_270_id,
    oa_professional_837p_id = EXCLUDED.oa_professional_837p_id,
    oa_remit_835_id = EXCLUDED.oa_remit_835_id,
    display_name = EXCLUDED.display_name,
    notes = EXCLUDED.notes;

-- Also add eligibility configuration
INSERT INTO office_ally_eligibility_configs (
    office_ally_payer_id,
    payer_name,
    category,
    requires_member_id,
    requires_gender,
    dtp_format,
    special_requirements
) VALUES (
    'INT-BENE-ADMIN',
    'International Benefits Administrators (First Health Network)',
    'Commercial',
    true,
    false,
    'D8',
    'TPA for American Life Insurance Co. Member ID format: AFLMFEA######## (letters + numbers)'
)
ON CONFLICT (office_ally_payer_id) DO UPDATE SET
    payer_name = EXCLUDED.payer_name,
    requires_member_id = EXCLUDED.requires_member_id,
    special_requirements = EXCLUDED.special_requirements;
