-- database/create-claims-submissions-table.sql
-- Claims Submissions Table - Track all 837P claims submitted to Office Ally

CREATE TABLE IF NOT EXISTS claims_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Claim Identification
    claim_id TEXT NOT NULL UNIQUE, -- CLM control number from 837P

    -- Patient Reference
    patient_id UUID REFERENCES intakeq_clients(id),
    patient_name TEXT NOT NULL,
    patient_dob DATE NOT NULL,
    patient_member_id TEXT,

    -- Payer Reference
    payer_id UUID REFERENCES payers(id),
    payer_name TEXT NOT NULL,
    payer_837p_id TEXT NOT NULL, -- Office Ally payer ID used

    -- Provider Information
    billing_provider_npi TEXT NOT NULL,
    rendering_provider_npi TEXT,
    rendering_provider_name TEXT,

    -- Claim Details
    service_date_from DATE NOT NULL,
    service_date_to DATE NOT NULL,
    total_charge DECIMAL(10,2) NOT NULL,
    total_units INTEGER NOT NULL,
    diagnosis_codes TEXT[], -- Array of ICD-10 codes

    -- Service Lines (JSON array)
    service_lines JSONB NOT NULL,
    -- Example: [{"cptCode": "90834", "charge": 150.00, "units": 1, "serviceDate": "2025-10-07", "placeOfService": "11"}]

    -- Submission Details
    test_mode BOOLEAN DEFAULT true, -- TEST (OATEST prefix) vs PRODUCTION
    filename TEXT NOT NULL, -- 837P filename submitted
    file_size INTEGER, -- Bytes
    remote_path TEXT, -- SFTP path on Office Ally server

    -- EDI Content
    edi_content TEXT NOT NULL, -- Full 837P EDI transaction

    -- Status Tracking
    status TEXT DEFAULT 'SUBMITTED',
    -- SUBMITTED: Uploaded to Office Ally SFTP
    -- ACKNOWLEDGED: Received 999 acknowledgment
    -- ACCEPTED: Received 277CA acceptance
    -- REJECTED: Received 277CA rejection
    -- PAID: Received 835 ERA with payment
    -- DENIED: Received 835 ERA with denial

    -- Response Files
    response_999 TEXT, -- 999 acknowledgment (transaction accepted/rejected)
    response_277 TEXT, -- 277CA claim status response
    response_835 TEXT, -- 835 ERA remittance advice

    -- Error Tracking
    rejection_reason TEXT,
    denial_reason TEXT,
    last_error TEXT,

    -- Timestamps
    submitted_at TIMESTAMP DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    accepted_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT valid_status CHECK (status IN ('SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'PAID', 'DENIED'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims_submissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_payer_id ON claims_submissions(payer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims_submissions(status);
CREATE INDEX IF NOT EXISTS idx_claims_service_date ON claims_submissions(service_date_from);
CREATE INDEX IF NOT EXISTS idx_claims_submitted_at ON claims_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_claim_id ON claims_submissions(claim_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claims_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_claims_submissions_timestamp
    BEFORE UPDATE ON claims_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_claims_submissions_updated_at();

-- Comments for documentation
COMMENT ON TABLE claims_submissions IS 'Tracks all 837P professional claims submitted to Office Ally clearinghouse';
COMMENT ON COLUMN claims_submissions.claim_id IS 'CLM segment control number from 837P transaction';
COMMENT ON COLUMN claims_submissions.test_mode IS 'true = TEST claim with OATEST prefix, false = PRODUCTION claim';
COMMENT ON COLUMN claims_submissions.status IS 'Current status: SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID (or REJECTED/DENIED)';
COMMENT ON COLUMN claims_submissions.service_lines IS 'JSON array of service line details including CPT codes, charges, units';
COMMENT ON COLUMN claims_submissions.response_999 IS 'X12 999 functional acknowledgment from Office Ally';
COMMENT ON COLUMN claims_submissions.response_277 IS 'X12 277CA claim status response from payer';
COMMENT ON COLUMN claims_submissions.response_835 IS 'X12 835 ERA electronic remittance advice with payment details';
