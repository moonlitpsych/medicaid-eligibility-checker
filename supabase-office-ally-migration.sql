-- =====================================================
-- Office Ally Integration - Database Migration
-- =====================================================
-- 
-- This migration adds Office Ally specific configuration tables
-- to enable database-driven eligibility checking with dynamic
-- field requirements per payer.
--
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table 1: Office Ally Payer Configurations
-- =====================================================
-- Maps existing payers to Office Ally payer IDs and field requirements

CREATE TABLE IF NOT EXISTS payer_office_ally_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links to existing payers table
    payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
    
    -- Office Ally specific configuration
    office_ally_payer_id TEXT NOT NULL UNIQUE, -- 'UTMCD', '60054', etc.
    payer_display_name TEXT NOT NULL,          -- 'Utah Medicaid', 'Aetna Healthcare'
    category TEXT NOT NULL CHECK (category IN ('Medicaid', 'Commercial', 'Medicaid Managed Care')),
    
    -- Field Requirements for X12 270 transactions
    -- Stored as JSON arrays of field names
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- X12 270 Format Specifications
    requires_gender_in_dmg BOOLEAN NOT NULL DEFAULT false,
    supports_member_id_in_nm1 BOOLEAN NOT NULL DEFAULT true,
    dtp_format TEXT NOT NULL DEFAULT 'D8' CHECK (dtp_format IN ('D8', 'RD8')),
    allows_name_only BOOLEAN NOT NULL DEFAULT false,
    
    -- Testing and Status
    is_tested BOOLEAN NOT NULL DEFAULT false,
    test_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per payer
    CONSTRAINT unique_payer_office_ally UNIQUE (payer_id)
);

-- Add index for fast Office Ally payer ID lookups
CREATE INDEX IF NOT EXISTS idx_payer_office_ally_configs_payer_id 
ON payer_office_ally_configs(office_ally_payer_id);

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_payer_office_ally_configs_category 
ON payer_office_ally_configs(category);

-- =====================================================
-- Table 2: Provider Office Ally Configurations  
-- =====================================================
-- Maps providers to their Office Ally credentials and supported payers

CREATE TABLE IF NOT EXISTS provider_office_ally_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links to existing providers table
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Office Ally provider configuration
    office_ally_provider_name TEXT NOT NULL, -- 'MOONLIT PLLC', 'TRAVIS NORSETH'
    
    -- Provider NPI (redundant with providers table but cached for performance)
    provider_npi TEXT NOT NULL,
    
    -- Which Office Ally payers this provider can be used with
    supported_office_ally_payer_ids TEXT[] DEFAULT '{}',
    
    -- Provider preferences and notes
    is_preferred_for_payers TEXT[] DEFAULT '{}', -- Office Ally payer IDs where this provider is preferred
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per provider
    CONSTRAINT unique_provider_office_ally UNIQUE (provider_id)
);

-- Add index for fast provider lookups
CREATE INDEX IF NOT EXISTS idx_provider_office_ally_configs_provider_id 
ON provider_office_ally_configs(provider_id);

-- Add index for NPI lookups
CREATE INDEX IF NOT EXISTS idx_provider_office_ally_configs_npi 
ON provider_office_ally_configs(provider_npi);

-- =====================================================
-- Table 3: Enhanced Eligibility Log (if columns don't exist)
-- =====================================================
-- Add Office Ally specific columns to existing eligibility_log

-- Add payer reference if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eligibility_log' AND column_name = 'payer_id'
    ) THEN
        ALTER TABLE eligibility_log ADD COLUMN payer_id UUID REFERENCES payers(id);
    END IF;
END $$;

-- Add Office Ally payer ID if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eligibility_log' AND column_name = 'office_ally_payer_id'
    ) THEN
        ALTER TABLE eligibility_log ADD COLUMN office_ally_payer_id TEXT;
    END IF;
END $$;

-- Add provider NPI if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eligibility_log' AND column_name = 'provider_npi'
    ) THEN
        ALTER TABLE eligibility_log ADD COLUMN provider_npi TEXT;
    END IF;
END $$;

-- Add provider ID if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eligibility_log' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE eligibility_log ADD COLUMN provider_id UUID REFERENCES providers(id);
    END IF;
END $$;

-- =====================================================
-- Insert Initial Data - Based on Working Configurations
-- =====================================================

-- First, let's find the existing payers that match our known working cases
-- Note: You may need to adjust the payer names to match your exact data

-- Insert Office Ally config for Utah Medicaid (if exists)
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
    'UTMCD',
    'Utah Medicaid (Traditional FFS)',
    'Medicaid',
    '["firstName", "lastName", "dateOfBirth"]'::jsonb,
    '["medicaidId"]'::jsonb,
    '["gender"]'::jsonb,
    false,
    true,
    'RD8',
    true,
    true,
    'Tested and working with Jeremy Montoya (1984-07-17)'
FROM payers p
WHERE LOWER(p.name) LIKE '%medicaid%' 
  AND p.state = 'UT'
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs 
    WHERE office_ally_payer_id = 'UTMCD'
  )
LIMIT 1;

-- Insert Office Ally configs for known commercial payers
-- Aetna (if exists in your payers table)
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
    '60054',
    'Aetna Healthcare',
    'Commercial',
    '["firstName", "lastName", "dateOfBirth", "gender"]'::jsonb,
    '["memberNumber"]'::jsonb,
    '["groupNumber"]'::jsonb,
    true,
    true,
    'D8',
    false,
    true,
    'Tested and working with Tella Silver (1995-09-18), shows copay info'
FROM payers p
WHERE LOWER(p.name) LIKE '%aetna%'
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs 
    WHERE office_ally_payer_id = '60054'
  )
LIMIT 1;

-- Regence BCBS (from your data)
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
    is_tested
) 
SELECT 
    p.id,
    'REGENCE',
    'Regence BlueCross BlueShield Utah',
    'Commercial',
    '["firstName", "lastName", "dateOfBirth", "gender"]'::jsonb,
    '["memberNumber"]'::jsonb,
    '["groupNumber"]'::jsonb,
    true,
    true,
    'D8',
    false,
    false
FROM payers p
WHERE LOWER(p.name) LIKE '%regence%'
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs 
    WHERE office_ally_payer_id = 'REGENCE'
  )
LIMIT 1;

-- Cigna (from your data)
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
    is_tested
) 
SELECT 
    p.id,
    'CIGNA',
    'Cigna Healthcare',
    'Commercial',
    '["firstName", "lastName", "dateOfBirth", "gender"]'::jsonb,
    '["memberNumber"]'::jsonb,
    '["groupNumber"]'::jsonb,
    true,
    true,
    'D8',
    false,
    false
FROM payers p
WHERE LOWER(p.name) LIKE '%cigna%'
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs 
    WHERE office_ally_payer_id = 'CIGNA'
  )
LIMIT 1;

-- United Healthcare (from your data)
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
    is_tested
) 
SELECT 
    p.id,
    'UHC',
    'United Healthcare',
    'Commercial',
    '["firstName", "lastName", "dateOfBirth", "gender"]'::jsonb,
    '["memberNumber"]'::jsonb,
    '["groupNumber"]'::jsonb,
    true,
    true,
    'D8',
    false,
    false
FROM payers p
WHERE LOWER(p.name) LIKE '%united%'
  AND NOT EXISTS (
    SELECT 1 FROM payer_office_ally_configs 
    WHERE office_ally_payer_id = 'UHC'
  )
LIMIT 1;

-- =====================================================
-- Insert Provider Office Ally Configurations
-- =====================================================

-- Travis Norseth - Works with Aetna (tested)
INSERT INTO provider_office_ally_configs (
    provider_id,
    office_ally_provider_name,
    provider_npi,
    supported_office_ally_payer_ids,
    is_preferred_for_payers,
    notes,
    is_active
)
SELECT 
    p.id,
    'TRAVIS NORSETH',
    p.npi,
    ARRAY['60054', 'REGENCE', 'CIGNA', 'UHC'], -- Commercial payers
    ARRAY['60054'], -- Preferred for Aetna (tested)
    'Enrolled with Aetna and other commercial payers. Tested successfully with Aetna.',
    true
FROM providers p
WHERE p.first_name = 'Travis' 
  AND p.last_name = 'Norseth'
  AND p.npi IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM provider_office_ally_configs 
    WHERE provider_id = p.id
  );

-- Rufus Sweeney - Default provider for Utah Medicaid and general use
INSERT INTO provider_office_ally_configs (
    provider_id,
    office_ally_provider_name,
    provider_npi,
    supported_office_ally_payer_ids,
    is_preferred_for_payers,
    notes,
    is_active
)
SELECT 
    p.id,
    'MOONLIT PLLC',
    p.npi,
    ARRAY['UTMCD', 'REGENCE', 'CIGNA', 'UHC'], -- Medicaid + Commercial
    ARRAY['UTMCD'], -- Preferred for Utah Medicaid
    'Primary provider for Utah Medicaid eligibility checks.',
    true
FROM providers p
WHERE p.first_name = 'Rufus' 
  AND p.last_name = 'Sweeney'
  AND p.npi IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM provider_office_ally_configs 
    WHERE provider_id = p.id
  );

-- =====================================================
-- Add update triggers for updated_at columns
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at on record changes
CREATE TRIGGER update_payer_office_ally_configs_updated_at 
    BEFORE UPDATE ON payer_office_ally_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_office_ally_configs_updated_at 
    BEFORE UPDATE ON provider_office_ally_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Create helpful views for easy data access
-- =====================================================

-- View: All Office Ally configurations with payer and provider names
CREATE OR REPLACE VIEW v_office_ally_eligibility_configs AS
SELECT 
    poac.id AS config_id,
    poac.office_ally_payer_id,
    poac.payer_display_name,
    poac.category,
    p.name AS payer_name,
    p.payer_type,
    p.state,
    poac.required_fields,
    poac.recommended_fields,
    poac.optional_fields,
    poac.requires_gender_in_dmg,
    poac.supports_member_id_in_nm1,
    poac.dtp_format,
    poac.allows_name_only,
    poac.is_tested,
    poac.test_notes,
    poac.created_at,
    poac.updated_at
FROM payer_office_ally_configs poac
JOIN payers p ON p.id = poac.payer_id
ORDER BY 
    CASE poac.category 
        WHEN 'Medicaid' THEN 1 
        WHEN 'Commercial' THEN 2 
        WHEN 'Medicaid Managed Care' THEN 3 
        ELSE 4 
    END,
    poac.payer_display_name;

-- View: Provider Office Ally configurations with provider details
CREATE OR REPLACE VIEW v_provider_office_ally_configs AS
SELECT 
    proac.id AS config_id,
    proac.provider_id,
    p.first_name,
    p.last_name,
    p.npi,
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

-- =====================================================
-- Row Level Security (Optional - Enable if needed)
-- =====================================================

-- Enable RLS on new tables (uncomment if you use RLS)
-- ALTER TABLE payer_office_ally_configs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE provider_office_ally_configs ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your auth system)
-- CREATE POLICY "Allow all for authenticated users" ON payer_office_ally_configs
--     FOR ALL USING (auth.role() = 'authenticated');
    
-- CREATE POLICY "Allow all for authenticated users" ON provider_office_ally_configs
--     FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check what was created
SELECT 'Payer Office Ally Configs Created:' AS status, COUNT(*) AS count 
FROM payer_office_ally_configs
UNION ALL
SELECT 'Provider Office Ally Configs Created:', COUNT(*) 
FROM provider_office_ally_configs
UNION ALL
SELECT 'Total Eligible Payers:', COUNT(*) 
FROM v_office_ally_eligibility_configs;

-- Show the configurations created
SELECT 
    'PAYER CONFIG' AS type,
    payer_display_name AS name,
    office_ally_payer_id AS office_ally_id,
    category,
    CASE WHEN is_tested THEN 'TESTED ✅' ELSE 'UNTESTED ⚠️' END AS status
FROM v_office_ally_eligibility_configs
UNION ALL
SELECT 
    'PROVIDER CONFIG' AS type,
    first_name || ' ' || last_name AS name,
    office_ally_provider_name AS office_ally_id,
    'Provider' AS category,
    CASE WHEN is_active THEN 'ACTIVE ✅' ELSE 'INACTIVE ❌' END AS status
FROM v_provider_office_ally_configs
ORDER BY type, name;

-- =====================================================
-- Migration Complete!
-- =====================================================

SELECT 
    '🎉 Office Ally Database Migration Complete!' AS message,
    NOW() AS completed_at;