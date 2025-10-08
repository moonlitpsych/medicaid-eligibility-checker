-- Add Utah Medicaid Provider Number to Moonlit PLLC
-- Provider Number: 4347425
-- Date: 2025-10-07

-- Step 1: Add column if it doesn't exist
ALTER TABLE providers ADD COLUMN IF NOT EXISTS medicaid_provider_id TEXT;

-- Step 2: Update Moonlit PLLC with Utah Medicaid Provider Number
UPDATE providers
SET medicaid_provider_id = '4347425'
WHERE npi = '1275348807';

-- Step 3: Verify the update
SELECT
    first_name,
    last_name,
    npi,
    tax_id,
    medicaid_provider_id,
    address
FROM providers
WHERE npi = '1275348807';
