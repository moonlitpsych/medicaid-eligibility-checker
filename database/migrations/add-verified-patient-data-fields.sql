-- Migration: Add verified patient data fields to intakeq_clients table
-- Purpose: Store payer-verified data from X12 271 responses for data quality validation
-- Date: 2025-11-05

-- Add verified data columns from payer (X12 271)
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS verified_phone TEXT,
ADD COLUMN IF NOT EXISTS verified_address_street TEXT,
ADD COLUMN IF NOT EXISTS verified_address_city TEXT,
ADD COLUMN IF NOT EXISTS verified_address_state TEXT,
ADD COLUMN IF NOT EXISTS verified_address_zip TEXT,
ADD COLUMN IF NOT EXISTS verified_dob DATE,
ADD COLUMN IF NOT EXISTS verified_gender TEXT,
ADD COLUMN IF NOT EXISTS verified_first_name TEXT,
ADD COLUMN IF NOT EXISTS verified_last_name TEXT,
ADD COLUMN IF NOT EXISTS verified_middle_name TEXT;

-- Add current payer information
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS current_payer_name TEXT,
ADD COLUMN IF NOT EXISTS current_payer_id TEXT,
ADD COLUMN IF NOT EXISTS current_member_id TEXT,
ADD COLUMN IF NOT EXISTS current_coverage_start_date DATE,
ADD COLUMN IF NOT EXISTS current_coverage_end_date DATE,
ADD COLUMN IF NOT EXISTS coverage_is_active BOOLEAN DEFAULT NULL;

-- Add additional identifiers from payer
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS case_number TEXT,
ADD COLUMN IF NOT EXISTS patient_account_number TEXT,
ADD COLUMN IF NOT EXISTS group_number TEXT,
ADD COLUMN IF NOT EXISTS policy_number TEXT,
ADD COLUMN IF NOT EXISTS alternate_member_id TEXT;

-- Add eligibility tracking
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS last_eligibility_check TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS eligibility_status TEXT CHECK (eligibility_status IN ('ACTIVE', 'EXPIRED', 'UNKNOWN', 'PENDING')),
ADD COLUMN IF NOT EXISTS eligibility_check_count INTEGER DEFAULT 0;

-- Add managed care and provider information
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS managed_care_org_name TEXT,
ADD COLUMN IF NOT EXISTS managed_care_org_id TEXT,
ADD COLUMN IF NOT EXISTS managed_care_org_type TEXT,
ADD COLUMN IF NOT EXISTS primary_care_provider_name TEXT,
ADD COLUMN IF NOT EXISTS primary_care_provider_npi TEXT,
ADD COLUMN IF NOT EXISTS primary_care_provider_phone TEXT;

-- Add data quality tracking
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS data_quality_issues JSONB,
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
ADD COLUMN IF NOT EXISTS data_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_verification_source TEXT;

-- Add coordination of benefits information
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS has_other_insurance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS other_insurance_details JSONB;

-- Add payer messages and notes
ALTER TABLE intakeq_clients
ADD COLUMN IF NOT EXISTS payer_messages TEXT[],
ADD COLUMN IF NOT EXISTS payer_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intakeq_clients_eligibility_status
    ON intakeq_clients(eligibility_status)
    WHERE eligibility_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_current_member_id
    ON intakeq_clients(current_member_id)
    WHERE current_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_coverage_active
    ON intakeq_clients(coverage_is_active)
    WHERE coverage_is_active IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_case_number
    ON intakeq_clients(case_number)
    WHERE case_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_data_quality_score
    ON intakeq_clients(data_quality_score)
    WHERE data_quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakeq_clients_last_eligibility_check
    ON intakeq_clients(last_eligibility_check DESC)
    WHERE last_eligibility_check IS NOT NULL;

-- Create a GIN index for JSONB columns for faster queries
CREATE INDEX IF NOT EXISTS idx_intakeq_clients_data_quality_issues_gin
    ON intakeq_clients USING GIN (data_quality_issues)
    WHERE data_quality_issues IS NOT NULL;

-- Add comments to document column purposes
COMMENT ON COLUMN intakeq_clients.verified_phone IS 'Phone number verified from payer X12 271 response';
COMMENT ON COLUMN intakeq_clients.verified_dob IS 'Date of birth verified from payer DMG segment';
COMMENT ON COLUMN intakeq_clients.verified_gender IS 'Gender code (M/F/U) verified from payer DMG segment';
COMMENT ON COLUMN intakeq_clients.current_payer_name IS 'Current insurance payer name from most recent eligibility check';
COMMENT ON COLUMN intakeq_clients.current_member_id IS 'Current active member ID from payer';
COMMENT ON COLUMN intakeq_clients.coverage_is_active IS 'Whether coverage is currently active based on dates';
COMMENT ON COLUMN intakeq_clients.eligibility_status IS 'Current eligibility status: ACTIVE, EXPIRED, UNKNOWN, or PENDING';
COMMENT ON COLUMN intakeq_clients.data_quality_issues IS 'JSON object containing data discrepancies between IntakeQ and payer';
COMMENT ON COLUMN intakeq_clients.data_quality_score IS 'Score from 0 to 1 indicating data quality (1 = perfect match)';
COMMENT ON COLUMN intakeq_clients.managed_care_org_name IS 'Managed care organization name if patient is in managed care';
COMMENT ON COLUMN intakeq_clients.primary_care_provider_npi IS 'NPI of assigned primary care provider from payer';
COMMENT ON COLUMN intakeq_clients.has_other_insurance IS 'Whether patient has coordination of benefits with other insurance';
COMMENT ON COLUMN intakeq_clients.payer_messages IS 'Array of messages from payer MSG segments';

-- Create a view for patients with data quality issues
CREATE OR REPLACE VIEW v_patients_with_data_issues AS
SELECT
    ic.id,
    ic.intakeq_client_id,
    ic.first_name,
    ic.last_name,
    ic.date_of_birth,
    ic.primary_insurance_name,
    ic.eligibility_status,
    ic.data_quality_score,
    ic.data_quality_issues,
    ic.last_eligibility_check,
    CASE
        WHEN ic.data_quality_issues IS NOT NULL THEN
            jsonb_array_length(
                COALESCE(
                    jsonb_path_query_array(ic.data_quality_issues, '$.*.severity ? (@ == "CRITICAL")'),
                    '[]'::jsonb
                )
            )
        ELSE 0
    END as critical_issues_count,
    CASE
        WHEN ic.data_quality_issues IS NOT NULL THEN
            jsonb_array_length(
                COALESCE(
                    jsonb_path_query_array(ic.data_quality_issues, '$.*.severity ? (@ == "WARNING")'),
                    '[]'::jsonb
                )
            )
        ELSE 0
    END as warning_issues_count
FROM intakeq_clients ic
WHERE ic.data_quality_issues IS NOT NULL
ORDER BY
    critical_issues_count DESC,
    warning_issues_count DESC,
    ic.last_eligibility_check DESC;

COMMENT ON VIEW v_patients_with_data_issues IS 'View of patients with data quality issues requiring review';

-- Create a view for patients with expired coverage
CREATE OR REPLACE VIEW v_patients_expired_coverage AS
SELECT
    ic.id,
    ic.intakeq_client_id,
    ic.first_name,
    ic.last_name,
    ic.primary_insurance_name,
    ic.current_payer_name,
    ic.current_member_id,
    ic.current_coverage_end_date,
    CURRENT_DATE - ic.current_coverage_end_date as days_expired,
    ic.last_eligibility_check
FROM intakeq_clients ic
WHERE ic.coverage_is_active = FALSE
   OR (ic.current_coverage_end_date IS NOT NULL AND ic.current_coverage_end_date < CURRENT_DATE)
ORDER BY ic.current_coverage_end_date DESC;

COMMENT ON VIEW v_patients_expired_coverage IS 'View of patients with expired insurance coverage';

-- Create a function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_data_quality_score(patient_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 1.0;
    issues JSONB;
    critical_count INTEGER;
    warning_count INTEGER;
    info_count INTEGER;
BEGIN
    -- Get data quality issues for the patient
    SELECT data_quality_issues INTO issues
    FROM intakeq_clients
    WHERE id = patient_id;

    -- If no issues, perfect score
    IF issues IS NULL OR issues = '{}'::jsonb THEN
        RETURN 1.0;
    END IF;

    -- Count issues by severity
    SELECT
        COUNT(*) FILTER (WHERE value->>'severity' = 'CRITICAL'),
        COUNT(*) FILTER (WHERE value->>'severity' = 'WARNING'),
        COUNT(*) FILTER (WHERE value->>'severity' = 'INFO')
    INTO critical_count, warning_count, info_count
    FROM jsonb_each(issues);

    -- Calculate score based on severity
    -- Each critical issue reduces score by 0.20
    -- Each warning reduces score by 0.10
    -- Each info reduces score by 0.05
    score := score - (critical_count * 0.20);
    score := score - (warning_count * 0.10);
    score := score - (info_count * 0.05);

    -- Ensure score doesn't go below 0
    IF score < 0 THEN
        score := 0;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_data_quality_score IS 'Calculate data quality score based on number and severity of issues';

-- Create a trigger to update data quality score when issues change
CREATE OR REPLACE FUNCTION update_data_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_quality_issues IS DISTINCT FROM OLD.data_quality_issues THEN
        NEW.data_quality_score := calculate_data_quality_score(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_data_quality_score
    BEFORE UPDATE ON intakeq_clients
    FOR EACH ROW
    WHEN (NEW.data_quality_issues IS DISTINCT FROM OLD.data_quality_issues)
    EXECUTE FUNCTION update_data_quality_score();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON intakeq_clients TO authenticated;
GRANT SELECT ON v_patients_with_data_issues TO authenticated;
GRANT SELECT ON v_patients_expired_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_data_quality_score TO authenticated;

-- Add sample data quality issue for testing (commented out for production)
/*
UPDATE intakeq_clients
SET data_quality_issues = '{
    "dob_mismatch": {
        "severity": "CRITICAL",
        "intakeq_value": "1991-08-08",
        "payer_value": "1991-08-09",
        "message": "Date of birth does not match payer records"
    },
    "phone_mismatch": {
        "severity": "INFO",
        "intakeq_value": "8015551234",
        "payer_value": "8015559999",
        "message": "Phone number does not match payer records"
    }
}'::jsonb
WHERE first_name = 'Austin' AND last_name = 'Schneider'
LIMIT 1;
*/

-- Migration completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added % new columns to intakeq_clients table', 35;
    RAISE NOTICE 'Created 2 new views for data quality monitoring';
    RAISE NOTICE 'Added function and trigger for automatic data quality scoring';
END $$;