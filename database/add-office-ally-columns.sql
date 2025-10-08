-- =====================================================
-- Add Office Ally Columns to Existing Payers Table
-- =====================================================
--
-- Surgical approach: Add ONLY what we need for Office Ally integration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Office Ally transaction-specific payer ID columns
ALTER TABLE payers
ADD COLUMN IF NOT EXISTS oa_eligibility_270_id TEXT,
ADD COLUMN IF NOT EXISTS oa_professional_837p_id TEXT,
ADD COLUMN IF NOT EXISTS oa_remit_835_id TEXT;

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payers_oa_eligibility_270_id ON payers(oa_eligibility_270_id);
CREATE INDEX IF NOT EXISTS idx_payers_oa_professional_837p_id ON payers(oa_professional_837p_id);
CREATE INDEX IF NOT EXISTS idx_payers_oa_remit_835_id ON payers(oa_remit_835_id);

-- Add comments for documentation
COMMENT ON COLUMN payers.oa_eligibility_270_id IS 'Office Ally payer ID for eligibility checks (270/271 transactions)';
COMMENT ON COLUMN payers.oa_professional_837p_id IS 'Office Ally payer ID for professional claims (837P transactions)';
COMMENT ON COLUMN payers.oa_remit_835_id IS 'Office Ally payer ID for electronic remittance advice (835 transactions)';

-- Verify columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payers'
  AND column_name LIKE 'oa_%'
ORDER BY column_name;

SELECT '✅ Office Ally columns added successfully!' AS status;
