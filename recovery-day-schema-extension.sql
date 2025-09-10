-- =====================================================
-- Recovery Day Demo - Patient Enrollment Schema Extension
-- =====================================================
-- 
-- This extends the existing Supabase schema to support:
-- 1. Patient enrollment tracking for Recovery Day demo
-- 2. SMS link generation and tracking
-- 3. Enhanced X12 271 data extraction
-- 4. Integration with reach-2-0 CM patient app
--
-- Run this in your Supabase SQL Editor AFTER the base migration
-- =====================================================

-- =====================================================
-- Table: Patient Enrollments (Enhanced for Recovery Day)
-- =====================================================
-- Tracks patient enrollment flow from CPSS onboarding to CM app access

CREATE TABLE IF NOT EXISTS patient_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic patient info (from eligibility check)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    
    -- Enhanced data from X12 271 response
    medicaid_id VARCHAR(50),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'U')),
    address JSONB, -- {street, city, state, zip} from X12 response
    
    -- Eligibility verification details
    eligibility_status VARCHAR(20) DEFAULT 'verified' CHECK (eligibility_status IN ('verified', 'pending', 'denied')),
    medicaid_program VARCHAR(100), -- "Targeted Adult Medicaid", etc.
    plan_type VARCHAR(50), -- "Traditional FFS", "Managed Care", etc.
    
    -- Enrollment process tracking
    enrollment_source VARCHAR(50) DEFAULT 'cpss_onboarding',
    enrolled_by_cpss_name VARCHAR(100), -- CPSS who enrolled the patient
    enrolled_at_location VARCHAR(100), -- "Emergency Department", "Inpatient Unit", etc.
    device_status VARCHAR(20) DEFAULT 'smartphone' CHECK (device_status IN ('smartphone', 'needs_help', 'device_needed')),
    
    -- SMS and app access tracking
    sms_phone_confirmed BOOLEAN DEFAULT false,
    sms_link_sent_at TIMESTAMP,
    sms_link_token VARCHAR(255), -- Secure token for enrollment link
    sms_link_expires_at TIMESTAMP,
    sms_link_clicked_at TIMESTAMP,
    
    -- Reach-2-0 CM app integration
    reach_app_registered_at TIMESTAMP,
    reach_app_user_id UUID, -- Links to reach-2-0 user table
    initial_points_awarded INTEGER DEFAULT 25, -- Welcome bonus
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional tracking for demo analytics
    demo_session_id VARCHAR(100), -- Track Recovery Day demo sessions
    cpss_workstation VARCHAR(50) -- Which tablet/station was used
);

-- Index for fast lookups during demo
CREATE INDEX IF NOT EXISTS idx_patient_enrollments_sms_token ON patient_enrollments(sms_link_token);
CREATE INDEX IF NOT EXISTS idx_patient_enrollments_demo_session ON patient_enrollments(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_patient_enrollments_cpss ON patient_enrollments(enrolled_by_cpss_name, created_at);

-- =====================================================
-- Table: Enhanced X12 271 Data Cache
-- =====================================================
-- Stores parsed X12 271 response data for auto-population

CREATE TABLE IF NOT EXISTS x12_271_parsed_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links to eligibility_log for full X12 data
    eligibility_log_id UUID REFERENCES eligibility_log(id),
    
    -- Patient identifiers
    patient_first_name VARCHAR(100),
    patient_last_name VARCHAR(100),
    patient_dob DATE,
    
    -- Extracted contact information
    phone_number VARCHAR(20),
    address JSONB, -- Parsed address components
    gender CHAR(1),
    
    -- Insurance details
    medicaid_id VARCHAR(50),
    member_id VARCHAR(50),
    subscriber_id VARCHAR(50),
    group_number VARCHAR(50),
    
    -- Program details
    program_name VARCHAR(200), -- "TARGETED ADULT MEDICAID"
    plan_type VARCHAR(100), -- "Traditional FFS", "POS II", etc.
    coverage_effective_date DATE,
    coverage_termination_date DATE,
    
    -- Mental health carve-out detection
    mental_health_coverage VARCHAR(50), -- "FFS", "MANAGED_CARE", "MIXED"
    substance_use_coverage VARCHAR(50),
    cm_program_eligible BOOLEAN DEFAULT false,
    
    -- Copay information (for commercial payers)
    copay_info JSONB, -- {primary_care: 45, specialist: 70, emergency: 500}
    deductible_info JSONB,
    out_of_pocket_info JSONB,
    
    -- Parsing metadata
    parsed_segments INTEGER, -- Number of X12 segments processed
    parsing_errors TEXT[], -- Any errors encountered during parsing
    confidence_score DECIMAL(3,2), -- 0.0-1.0 confidence in parsed data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast patient lookups
CREATE INDEX IF NOT EXISTS idx_x12_parsed_patient ON x12_271_parsed_data(patient_first_name, patient_last_name, patient_dob);

-- =====================================================
-- Table: Recovery Day Demo Sessions
-- =====================================================
-- Track demo performance and analytics

CREATE TABLE IF NOT EXISTS recovery_day_demo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Demo session info
    session_id VARCHAR(100) UNIQUE NOT NULL, -- Tablet/workstation identifier
    cpss_name VARCHAR(100) NOT NULL,
    demo_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    demo_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    patients_enrolled INTEGER DEFAULT 0,
    avg_eligibility_check_time_ms INTEGER, -- Average response time
    avg_enrollment_time_seconds INTEGER, -- Time from start to SMS sent
    
    -- Demo audience and feedback
    audience_type VARCHAR(50), -- "case_managers", "administrators", "peers"
    audience_size INTEGER,
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    feedback_comments TEXT,
    
    -- Technical performance
    network_issues_count INTEGER DEFAULT 0,
    office_ally_timeouts INTEGER DEFAULT 0,
    successful_eligibility_checks INTEGER DEFAULT 0,
    failed_eligibility_checks INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Function: Enhanced X12 271 Parsing
-- =====================================================
-- Extracts patient data from X12 271 responses for auto-population

CREATE OR REPLACE FUNCTION parse_x12_271_for_patient_data(
    p_x12_271_data TEXT,
    p_patient_first_name VARCHAR(100),
    p_patient_last_name VARCHAR(100),
    p_patient_dob DATE,
    p_eligibility_log_id UUID
) RETURNS UUID AS $$
DECLARE
    parsed_record_id UUID;
    phone_match TEXT;
    address_parts TEXT[];
    medicaid_id_match TEXT;
    program_match TEXT;
    gender_match CHAR(1);
BEGIN
    -- Extract phone number (look for DMG segment with phone)
    phone_match := (
        SELECT regexp_replace(
            substring(p_x12_271_data FROM 'DMG\*[^~]*\*[^~]*\*[^~]*\*[^~]*\*([0-9]{10})[^~]*'),
            '[^0-9]', '', 'g'
        )
    );
    
    -- Extract gender from DMG segment
    gender_match := (
        SELECT substring(p_x12_271_data FROM 'DMG\*D8\*[0-9]{8}\*([MFU])')
    );
    
    -- Extract Medicaid ID from various possible locations
    medicaid_id_match := COALESCE(
        -- From NM1 segment
        substring(p_x12_271_data FROM 'NM1\*IL\*[^~]*\*[^~]*\*[^~]*\*[^~]*\*[^~]*\*MI\*([A-Z0-9]+)'),
        -- From REF segment  
        substring(p_x12_271_data FROM 'REF\*1L\*([A-Z0-9]+)')
    );
    
    -- Extract program name
    program_match := (
        SELECT substring(p_x12_271_data FROM 'EB\*[^~]*\*[^~]*\*[^~]*\*MC\*([^~]+)')
    );
    
    -- Insert parsed data
    INSERT INTO x12_271_parsed_data (
        eligibility_log_id,
        patient_first_name,
        patient_last_name, 
        patient_dob,
        phone_number,
        gender,
        medicaid_id,
        program_name,
        cm_program_eligible,
        confidence_score,
        parsed_segments
    ) VALUES (
        p_eligibility_log_id,
        p_patient_first_name,
        p_patient_last_name,
        p_patient_dob,
        CASE WHEN length(phone_match) = 10 THEN phone_match ELSE NULL END,
        gender_match,
        medicaid_id_match,
        program_match,
        CASE WHEN program_match ILIKE '%TARGETED ADULT%' OR program_match ILIKE '%MENTAL HEALTH%' THEN true ELSE false END,
        CASE 
            WHEN phone_match IS NOT NULL AND medicaid_id_match IS NOT NULL THEN 0.95
            WHEN phone_match IS NOT NULL OR medicaid_id_match IS NOT NULL THEN 0.75
            ELSE 0.50
        END,
        (length(p_x12_271_data) - length(replace(p_x12_271_data, '~', ''))) -- Count segments
    ) RETURNING id INTO parsed_record_id;
    
    RETURN parsed_record_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Generate SMS Enrollment Link
-- =====================================================
-- Creates secure enrollment links for patients

CREATE OR REPLACE FUNCTION generate_sms_enrollment_link(
    p_patient_enrollment_id UUID,
    p_phone_number VARCHAR(20)
) RETURNS TABLE(sms_token VARCHAR(255), enrollment_link TEXT) AS $$
DECLARE
    secure_token VARCHAR(255);
    base_url TEXT := 'https://reach-2-0-demo.vercel.app'; -- Update with actual reach-2-0 URL
BEGIN
    -- Generate secure token (UUID + random suffix)
    secure_token := gen_random_uuid()::text || '-' || floor(random() * 1000000)::text;
    
    -- Update patient enrollment record
    UPDATE patient_enrollments 
    SET 
        sms_link_token = secure_token,
        sms_link_sent_at = CURRENT_TIMESTAMP,
        sms_link_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
        sms_phone_confirmed = true
    WHERE id = p_patient_enrollment_id;
    
    -- Return token and formatted link
    RETURN QUERY SELECT 
        secure_token,
        base_url || '/enroll?token=' || secure_token AS enrollment_link;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: Recovery Day Demo Analytics
-- =====================================================
-- Real-time analytics for demo performance

CREATE OR REPLACE VIEW v_recovery_day_analytics AS
SELECT 
    s.session_id,
    s.cpss_name,
    s.demo_start_time,
    s.patients_enrolled,
    s.avg_eligibility_check_time_ms,
    s.avg_enrollment_time_seconds,
    s.successful_eligibility_checks,
    s.failed_eligibility_checks,
    
    -- Real-time enrollment counts
    COUNT(pe.id) as current_enrollments,
    
    -- Performance metrics
    CASE 
        WHEN s.successful_eligibility_checks > 0 THEN 
            ROUND((s.successful_eligibility_checks::decimal / (s.successful_eligibility_checks + s.failed_eligibility_checks)) * 100, 1)
        ELSE 0 
    END as success_rate_percent,
    
    -- SMS delivery tracking
    COUNT(pe.id) FILTER (WHERE pe.sms_link_sent_at IS NOT NULL) as sms_links_sent,
    COUNT(pe.id) FILTER (WHERE pe.sms_link_clicked_at IS NOT NULL) as sms_links_clicked,
    
    -- App registration tracking  
    COUNT(pe.id) FILTER (WHERE pe.reach_app_registered_at IS NOT NULL) as app_registrations

FROM recovery_day_demo_sessions s
LEFT JOIN patient_enrollments pe ON pe.demo_session_id = s.session_id
GROUP BY s.id, s.session_id, s.cpss_name, s.demo_start_time, s.patients_enrolled, 
         s.avg_eligibility_check_time_ms, s.avg_enrollment_time_seconds,
         s.successful_eligibility_checks, s.failed_eligibility_checks
ORDER BY s.demo_start_time DESC;

-- =====================================================
-- Sample Demo Data for Testing
-- =====================================================
-- Insert test demo session for Recovery Day

INSERT INTO recovery_day_demo_sessions (
    session_id,
    cpss_name,
    audience_type,
    audience_size
) VALUES (
    'RECOVERY_DAY_TABLET_01',
    'Demo CPSS',
    'mixed_audience',
    25
) ON CONFLICT (session_id) DO NOTHING;

-- =====================================================
-- Grant permissions for API access
-- =====================================================
-- Allow API to read/write enrollment data

-- Grant permissions to authenticated users (adjust based on your RLS policies)
GRANT SELECT, INSERT, UPDATE ON patient_enrollments TO authenticated;
GRANT SELECT, INSERT ON x12_271_parsed_data TO authenticated;
GRANT SELECT, INSERT, UPDATE ON recovery_day_demo_sessions TO authenticated;
GRANT SELECT ON v_recovery_day_analytics TO authenticated;

-- =====================================================
-- Row Level Security (RLS) - Optional
-- =====================================================
-- Uncomment if you want to add RLS policies

-- ALTER TABLE patient_enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE x12_271_parsed_data ENABLE ROW LEVEL SECURITY; 
-- ALTER TABLE recovery_day_demo_sessions ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your auth requirements):
-- CREATE POLICY "Allow all for authenticated users" ON patient_enrollments FOR ALL TO authenticated USING (true);

-- =====================================================
-- Completion
-- =====================================================

SELECT 'Recovery Day schema extension completed successfully!' as status;