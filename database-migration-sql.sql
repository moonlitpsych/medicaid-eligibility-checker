-- CM Database Architecture Migration - Canonical Patient Identity
-- Execute these commands in your Supabase SQL Editor

-- 1. CANONICAL PATIENT IDENTITY TABLE
-- Single source of truth for patient identity
CREATE TABLE patients_canonical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one canonical record per person
  UNIQUE(first_name, last_name, date_of_birth)
);

-- Add indexes for performance
CREATE INDEX idx_patients_canonical_name ON patients_canonical(first_name, last_name);
CREATE INDEX idx_patients_canonical_dob ON patients_canonical(date_of_birth);

-- 2. CM-SPECIFIC PATIENT DATA TABLE  
-- All CM program-specific patient information
CREATE TABLE patients_cm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  insurance_primary TEXT,
  medicaid_id TEXT,
  enrollment_source TEXT DEFAULT 'acute_care' CHECK (enrollment_source IN ('acute_care', 'outpatient', 'referral', 'existing_patient')),
  consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  smartphone_access TEXT DEFAULT 'yes' CHECK (smartphone_access IN ('yes', 'limited', 'no')),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT DEFAULT 'UT',
  address_zip TEXT,
  preferred_language TEXT DEFAULT 'English',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'graduated', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(canonical_patient_id) -- One CM record per canonical patient
);

-- Add indexes for performance
CREATE INDEX idx_patients_cm_canonical ON patients_cm(canonical_patient_id);
CREATE INDEX idx_patients_cm_status ON patients_cm(status);
CREATE INDEX idx_patients_cm_phone ON patients_cm(phone);

-- 3. INTAKEQ PATIENT LINKING TABLE
-- Links canonical patients to existing IntakeQ records when they exist
CREATE TABLE patients_intakeq_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id) ON DELETE CASCADE,
  intakeq_patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  linked_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by UUID, -- provider who confirmed the match
  confidence_score DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  notes TEXT,
  
  UNIQUE(canonical_patient_id),
  UNIQUE(intakeq_patient_id)
);

-- Add indexes for performance
CREATE INDEX idx_intakeq_link_canonical ON patients_intakeq_link(canonical_patient_id);
CREATE INDEX idx_intakeq_link_intakeq ON patients_intakeq_link(intakeq_patient_id);

-- 4. CM PROVIDER SEPARATION TABLE
-- CPSS staff separate from psychiatry providers
CREATE TABLE providers_cm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_provider_id UUID, -- References providers(id) if they're dual-role
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'cpss' CHECK (role IN ('cpss', 'supervisor', 'admin')),
  credentials TEXT, -- 'CPSS-I', 'CPSS-II', etc.
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  max_caseload INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_providers_cm_status ON providers_cm(status);
CREATE INDEX idx_providers_cm_name ON providers_cm(first_name, last_name);
CREATE INDEX idx_providers_cm_email ON providers_cm(email);

-- 5. UPDATE CM ENROLLMENTS TABLE (rename from cm_patients)
-- First, create the new structure
CREATE TABLE cm_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id) ON DELETE CASCADE,
  cm_patient_id UUID REFERENCES patients_cm(id) ON DELETE CASCADE,
  cm_program_id UUID REFERENCES contingency_management(id) ON DELETE CASCADE,
  cpss_provider_id UUID REFERENCES providers_cm(id) ON DELETE SET NULL,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'graduated', 'withdrawn')),
  medicaid_verification JSONB,
  pod_assignment TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(canonical_patient_id, cm_program_id)
);

-- Add indexes for performance
CREATE INDEX idx_cm_enrollments_canonical ON cm_enrollments(canonical_patient_id);
CREATE INDEX idx_cm_enrollments_cm_patient ON cm_enrollments(cm_patient_id);
CREATE INDEX idx_cm_enrollments_cpss ON cm_enrollments(cpss_provider_id);
CREATE INDEX idx_cm_enrollments_status ON cm_enrollments(status);

-- 6. UPDATE POINTS TRANSACTIONS TABLE
-- Rename and update foreign keys
ALTER TABLE cm_points_transactions 
  ADD COLUMN canonical_patient_id UUID REFERENCES patients_canonical(id) ON DELETE CASCADE,
  ADD COLUMN cm_enrollment_id UUID REFERENCES cm_enrollments(id) ON DELETE CASCADE;

-- Add indexes for new foreign keys
CREATE INDEX idx_points_canonical ON cm_points_transactions(canonical_patient_id);
CREATE INDEX idx_points_enrollment ON cm_points_transactions(cm_enrollment_id);

-- 7. CREATE SAMPLE CPSS PROVIDER
-- Insert a default CPSS provider for testing
INSERT INTO providers_cm (first_name, last_name, email, role, credentials) VALUES 
('Test', 'CPSS', 'test.cpss@moonlit.com', 'cpss', 'CPSS-I');

-- 8. UTILITY FUNCTIONS

-- Function to create or find canonical patient
CREATE OR REPLACE FUNCTION create_or_find_canonical_patient(
  p_first_name TEXT,
  p_last_name TEXT, 
  p_date_of_birth DATE
)
RETURNS UUID AS $$
DECLARE
  patient_id UUID;
BEGIN
  -- Try to find existing canonical patient
  SELECT id INTO patient_id
  FROM patients_canonical
  WHERE first_name ILIKE p_first_name
    AND last_name ILIKE p_last_name
    AND date_of_birth = p_date_of_birth;
    
  -- If not found, create new canonical patient
  IF patient_id IS NULL THEN
    INSERT INTO patients_canonical (first_name, last_name, date_of_birth)
    VALUES (p_first_name, p_last_name, p_date_of_birth)
    RETURNING id INTO patient_id;
  END IF;
  
  RETURN patient_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get complete patient view
CREATE OR REPLACE FUNCTION get_complete_patient_view(p_canonical_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'canonical', pc.*,
    'cm_data', pcm.*,
    'intakeq_link', pil.*,
    'enrollment', ce.*,
    'cpss_provider', prc.*
  ) INTO result
  FROM patients_canonical pc
  LEFT JOIN patients_cm pcm ON pc.id = pcm.canonical_patient_id
  LEFT JOIN patients_intakeq_link pil ON pc.id = pil.canonical_patient_id
  LEFT JOIN cm_enrollments ce ON pc.id = ce.canonical_patient_id
  LEFT JOIN providers_cm prc ON ce.cpss_provider_id = prc.id
  WHERE pc.id = p_canonical_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. ENABLE ROW LEVEL SECURITY (Optional - for production)
-- ALTER TABLE patients_canonical ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patients_cm ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patients_intakeq_link ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE providers_cm ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cm_enrollments ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'CM Database Architecture Migration Complete!' as status;