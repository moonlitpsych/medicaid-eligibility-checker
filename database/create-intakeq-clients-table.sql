-- =====================================================
-- Create IntakeQ Clients Table
-- =====================================================
--
-- Stores cached IntakeQ client data for:
-- 1. Durable patient data storage
-- 2. Offline access
-- 3. Fast lookups without repeated API calls
-- 4. Insurance mapping for eligibility checks
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create intakeq_clients table
CREATE TABLE IF NOT EXISTS intakeq_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intakeq_client_id TEXT UNIQUE NOT NULL,

  -- Basic patient information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT,
  phone TEXT,

  -- Primary insurance
  primary_insurance_name TEXT,
  primary_insurance_policy_number TEXT, -- Member ID for eligibility checks

  -- Secondary insurance (if applicable)
  secondary_insurance_name TEXT,
  secondary_insurance_policy_number TEXT,

  -- Address information
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Raw data from IntakeQ (for debugging and future use)
  raw_data JSONB,

  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_intakeq_clients_name
  ON intakeq_clients(last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_dob
  ON intakeq_clients(date_of_birth);

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_synced
  ON intakeq_clients(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_insurance
  ON intakeq_clients(primary_insurance_name);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_intakeq_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_intakeq_clients_updated_at ON intakeq_clients;
CREATE TRIGGER trigger_update_intakeq_clients_updated_at
  BEFORE UPDATE ON intakeq_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_intakeq_clients_updated_at();

-- Add comments for documentation
COMMENT ON TABLE intakeq_clients IS 'Cached IntakeQ client data for eligibility checking';
COMMENT ON COLUMN intakeq_clients.intakeq_client_id IS 'IntakeQ unique client ID (from API)';
COMMENT ON COLUMN intakeq_clients.primary_insurance_policy_number IS 'Member ID used for eligibility verification';
COMMENT ON COLUMN intakeq_clients.raw_data IS 'Complete JSON response from IntakeQ API';
COMMENT ON COLUMN intakeq_clients.last_synced_at IS 'Last time this record was synced from IntakeQ';

-- Verify table created
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'intakeq_clients'
ORDER BY ordinal_position;

SELECT '✅ intakeq_clients table created successfully!' AS status;
