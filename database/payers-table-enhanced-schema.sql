-- =====================================================
-- Enhanced Payers Table with Office Ally Transaction-Specific IDs
-- =====================================================
--
-- This schema handles the fact that Office Ally uses DIFFERENT payer IDs
-- for different transaction types (270/271, 837P, 835, etc.)
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Base Payers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core payer information
    name TEXT NOT NULL,
    display_name TEXT, -- Human-friendly version of name

    -- Classification
    payer_type TEXT CHECK (payer_type IN (
        'Medicaid',
        'Medicaid Managed Care',
        'Commercial',
        'Medicare',
        'Medicare Advantage',
        'Workers Comp',
        'Auto',
        'Other'
    )),
    state TEXT, -- Two-letter state code (e.g., 'UT')

    -- Office Ally transaction-specific payer IDs
    -- Different IDs for different transaction types!
    oa_eligibility_270_id TEXT,      -- For eligibility checks (270/271)
    oa_claim_status_276_id TEXT,     -- For claim status requests (276/277)
    oa_professional_837p_id TEXT,    -- For professional claims (837P)
    oa_institutional_837i_id TEXT,   -- For institutional claims (837I)
    oa_dental_837d_id TEXT,          -- For dental claims (837D)
    oa_remit_835_id TEXT,            -- For ERA/remittance (835)

    -- Transaction availability flags (from Office Ally data)
    supports_eligibility_270 BOOLEAN DEFAULT false,
    supports_claim_status_276 BOOLEAN DEFAULT false,
    supports_professional_837p BOOLEAN DEFAULT false,
    supports_institutional_837i BOOLEAN DEFAULT false,
    supports_dental_837d BOOLEAN DEFAULT false,
    supports_remit_835 BOOLEAN DEFAULT false,

    -- Enrollment requirements (from Office Ally data)
    requires_enrollment_837p BOOLEAN DEFAULT false,
    requires_enrollment_837i BOOLEAN DEFAULT false,
    requires_enrollment_837d BOOLEAN DEFAULT false,
    requires_enrollment_835 BOOLEAN DEFAULT false,

    -- Additional Office Ally metadata
    allows_non_par BOOLEAN DEFAULT false,        -- Non-participating provider allowed
    allows_secondary BOOLEAN DEFAULT false,       -- Secondary claims accepted
    allows_attachments BOOLEAN DEFAULT false,     -- Attachments supported
    specialty_type TEXT,                          -- 'Work Comp', 'Auto', etc.

    -- Administrative notes
    notes TEXT,
    office_ally_notes TEXT, -- Notes from Office Ally payer database

    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    is_tested BOOLEAN DEFAULT false,
    test_notes TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for common lookups
    CONSTRAINT unique_payer_name UNIQUE (name)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payers_state ON payers(state);
CREATE INDEX IF NOT EXISTS idx_payers_payer_type ON payers(payer_type);
CREATE INDEX IF NOT EXISTS idx_payers_oa_eligibility_270_id ON payers(oa_eligibility_270_id);
CREATE INDEX IF NOT EXISTS idx_payers_oa_professional_837p_id ON payers(oa_professional_837p_id);
CREATE INDEX IF NOT EXISTS idx_payers_oa_remit_835_id ON payers(oa_remit_835_id);
CREATE INDEX IF NOT EXISTS idx_payers_is_active ON payers(is_active);

-- Create composite index for Office Ally transaction lookups
CREATE INDEX IF NOT EXISTS idx_payers_office_ally_transaction_ids ON payers(
    oa_eligibility_270_id,
    oa_professional_837p_id,
    oa_remit_835_id
);

-- =====================================================
-- Helper View: Payers with Eligibility Support
-- =====================================================
CREATE OR REPLACE VIEW v_payers_eligibility_enabled AS
SELECT
    id,
    name,
    display_name,
    payer_type,
    state,
    oa_eligibility_270_id AS office_ally_payer_id,
    supports_eligibility_270,
    notes,
    is_tested,
    test_notes
FROM payers
WHERE supports_eligibility_270 = true
  AND oa_eligibility_270_id IS NOT NULL
  AND is_active = true
ORDER BY
    CASE payer_type
        WHEN 'Medicaid' THEN 1
        WHEN 'Commercial' THEN 2
        WHEN 'Medicare' THEN 3
        ELSE 4
    END,
    state,
    name;

-- =====================================================
-- Helper View: Payers with Claims Support
-- =====================================================
CREATE OR REPLACE VIEW v_payers_claims_enabled AS
SELECT
    id,
    name,
    display_name,
    payer_type,
    state,
    oa_professional_837p_id AS office_ally_837p_id,
    oa_institutional_837i_id AS office_ally_837i_id,
    supports_professional_837p,
    supports_institutional_837i,
    requires_enrollment_837p,
    allows_non_par,
    notes
FROM payers
WHERE (supports_professional_837p = true OR supports_institutional_837i = true)
  AND is_active = true
ORDER BY name;

-- =====================================================
-- Helper View: Payers with ERA Support
-- =====================================================
CREATE OR REPLACE VIEW v_payers_era_enabled AS
SELECT
    id,
    name,
    display_name,
    payer_type,
    state,
    oa_remit_835_id AS office_ally_835_id,
    supports_remit_835,
    requires_enrollment_835,
    notes
FROM payers
WHERE supports_remit_835 = true
  AND oa_remit_835_id IS NOT NULL
  AND is_active = true
ORDER BY name;

-- =====================================================
-- Helper Function: Get Office Ally Payer ID by Transaction Type
-- =====================================================
CREATE OR REPLACE FUNCTION get_office_ally_payer_id(
    p_payer_id UUID,
    p_transaction_type TEXT -- '270', '837P', '835', etc.
)
RETURNS TEXT AS $$
DECLARE
    v_office_ally_id TEXT;
BEGIN
    SELECT
        CASE p_transaction_type
            WHEN '270' THEN oa_eligibility_270_id
            WHEN '271' THEN oa_eligibility_270_id
            WHEN '276' THEN oa_claim_status_276_id
            WHEN '277' THEN oa_claim_status_276_id
            WHEN '837P' THEN oa_professional_837p_id
            WHEN '837I' THEN oa_institutional_837i_id
            WHEN '837D' THEN oa_dental_837d_id
            WHEN '835' THEN oa_remit_835_id
            ELSE NULL
        END INTO v_office_ally_id
    FROM payers
    WHERE id = p_payer_id;

    RETURN v_office_ally_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Update Trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_payers_updated_at
    BEFORE UPDATE ON payers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert Initial Test Data (Utah Medicaid)
-- =====================================================
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
    supports_remit_835,
    is_tested,
    test_notes
) VALUES (
    'Utah Medicaid Traditional FFS',
    'Utah Medicaid (Traditional Fee-for-Service)',
    'Medicaid',
    'UT',
    'UTMCD',        -- Eligibility ID
    'SKUT0',        -- Claims ID (DIFFERENT!)
    'SKUT0',        -- ERA ID (same as claims)
    true,
    true,
    true,
    true,
    'Tested with Jeremy Montoya (1984-07-17). CRITICAL: Use UTMCD for eligibility (270/271), SKUT0 for claims (837P) and ERAs (835).'
)
ON CONFLICT (name) DO UPDATE SET
    oa_eligibility_270_id = EXCLUDED.oa_eligibility_270_id,
    oa_professional_837p_id = EXCLUDED.oa_professional_837p_id,
    oa_remit_835_id = EXCLUDED.oa_remit_835_id,
    is_tested = EXCLUDED.is_tested,
    test_notes = EXCLUDED.test_notes,
    updated_at = NOW();

-- =====================================================
-- Verification Query
-- =====================================================
SELECT
    '✅ Payers table created successfully!' AS message,
    NOW() AS completed_at;

SELECT
    'Total payers:' AS metric,
    COUNT(*)::TEXT AS value
FROM payers
UNION ALL
SELECT
    'Eligibility enabled:',
    COUNT(*)::TEXT
FROM v_payers_eligibility_enabled
UNION ALL
SELECT
    'Claims enabled:',
    COUNT(*)::TEXT
FROM v_payers_claims_enabled
UNION ALL
SELECT
    'ERA enabled:',
    COUNT(*)::TEXT
FROM v_payers_era_enabled;
