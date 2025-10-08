-- Add billing-related fields to providers table

-- Add taxonomy column (NPI taxonomy codes for specialty)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS taxonomy TEXT;

-- Add tax_id column (Federal Tax ID / EIN for billing)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Add comments
COMMENT ON COLUMN providers.taxonomy IS 'NPI taxonomy code (e.g., 2084P0800X for Psychiatry)';
COMMENT ON COLUMN providers.tax_id IS 'Federal Tax ID (EIN) for claims billing';

-- Update Moonlit PLLC with correct values
UPDATE providers
SET
    taxonomy = '2084P0800X',  -- Psychiatry & Neurology, Psychiatry
    tax_id = '332185708'       -- Moonlit PLLC Federal Tax ID
WHERE first_name = 'MOONLIT' AND last_name = 'PLLC';

-- Verify update
SELECT
    id,
    first_name,
    last_name,
    npi,
    taxonomy,
    tax_id,
    address,
    phone_number
FROM providers
WHERE first_name = 'MOONLIT' AND last_name = 'PLLC';
