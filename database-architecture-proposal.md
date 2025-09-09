# CM Database Architecture - Clean Separation Design

## Problem Statement
- Current: CM patients written directly to shared `patients` table (IntakeQ EMR)
- Need: Clean separation between Moonlit psychiatry patients and CM program patients
- Challenge: Handle dual-enrollment without duplication or data inconsistency

## Proposed Solution: Canonical Patient Identity with Service-Specific Tables

### Core Architecture

#### 1. **Canonical Patient Identity Table** (`patients_canonical`)
**Purpose**: Single source of truth for patient identity only
```sql
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
```

#### 2. **CM-Specific Patient Data** (`patients_cm`)
**Purpose**: All CM program-specific patient information
```sql
CREATE TABLE patients_cm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id),
  phone TEXT,
  email TEXT,
  insurance_primary TEXT,
  medicaid_id TEXT,
  enrollment_source TEXT, -- 'acute_care', 'outpatient', 'referral'
  consent_date TIMESTAMP WITH TIME ZONE,
  smartphone_access TEXT CHECK (smartphone_access IN ('yes', 'limited', 'no')),
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
```

#### 3. **IntakeQ Patient Link** (Optional Enhancement)
**Purpose**: Link canonical patients to existing IntakeQ records when they exist
```sql
CREATE TABLE patients_intakeq_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id),
  intakeq_patient_id UUID REFERENCES patients(id), -- existing IntakeQ table
  linked_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by UUID, -- provider who confirmed the match
  confidence_score DECIMAL(3,2), -- matching confidence 0.00-1.00
  
  UNIQUE(canonical_patient_id),
  UNIQUE(intakeq_patient_id)
);
```

#### 4. **CM Provider Separation** (`providers_cm`)
**Purpose**: CPSS staff separate from psychiatry providers
```sql
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
```

### Updated CM Program Tables

#### 5. **CM Enrollments** (Updated `cm_patients`)
```sql
CREATE TABLE cm_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_patient_id UUID REFERENCES patients_canonical(id),
  cm_patient_id UUID REFERENCES patients_cm(id),
  cm_program_id UUID REFERENCES contingency_management(id),
  cpss_provider_id UUID REFERENCES providers_cm(id),
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
```

## Data Flow Examples

### Scenario 1: New CM Patient (Acute Care)
```javascript
// 1. Create or find canonical patient
const canonical = await createOrFindCanonicalPatient({
  firstName: "Jessica",
  lastName: "Martinez", 
  dateOfBirth: "1992-03-22"
});

// 2. Create CM-specific patient record
const cmPatient = await createCMPatient({
  canonical_patient_id: canonical.id,
  phone: "(801) 555-0123",
  email: "jessica@email.com",
  insurance_primary: "Utah Medicaid",
  enrollment_source: "acute_care",
  smartphone_access: "yes"
});

// 3. Create CM enrollment
const enrollment = await createCMEnrollment({
  canonical_patient_id: canonical.id,
  cm_patient_id: cmPatient.id,
  cm_program_id: program.id,
  cpss_provider_id: cpss.id
});
```

### Scenario 2: Existing Moonlit Patient Enrolls in CM
```javascript
// 1. Find existing IntakeQ patient
const intakeqPatient = await findIntakeQPatient({
  firstName: "John",
  lastName: "Smith",
  dateOfBirth: "1985-06-15"
});

// 2. Create canonical patient record
const canonical = await createCanonicalPatient({
  first_name: intakeqPatient.first_name,
  last_name: intakeqPatient.last_name,
  date_of_birth: intakeqPatient.date_of_birth
});

// 3. Link to existing IntakeQ record
await createIntakeQLink({
  canonical_patient_id: canonical.id,
  intakeq_patient_id: intakeqPatient.id,
  confidence_score: 1.00
});

// 4. Create CM-specific data
const cmPatient = await createCMPatient({
  canonical_patient_id: canonical.id,
  phone: intakeqPatient.phone, // inherit from IntakeQ
  email: intakeqPatient.email,
  enrollment_source: "existing_patient"
});

// 5. Create CM enrollment
const enrollment = await createCMEnrollment({
  canonical_patient_id: canonical.id,
  cm_patient_id: cmPatient.id
});
```

## Query Patterns

### Get Complete Patient View
```javascript
async function getCompletePatientView(canonicalPatientId) {
  const canonical = await supabase
    .from('patients_canonical')
    .select('*')
    .eq('id', canonicalPatientId)
    .single();

  const cmData = await supabase
    .from('patients_cm')
    .select('*')
    .eq('canonical_patient_id', canonicalPatientId)
    .single();

  const intakeqLink = await supabase
    .from('patients_intakeq_link')
    .select('*, patients(*)')
    .eq('canonical_patient_id', canonicalPatientId)
    .maybeSingle();

  const cmEnrollment = await supabase
    .from('cm_enrollments')
    .select('*, providers_cm(*)')
    .eq('canonical_patient_id', canonicalPatientId)
    .single();

  return {
    identity: canonical,
    cm: cmData,
    intakeq: intakeqLink?.patients,
    enrollment: cmEnrollment
  };
}
```

### Detect Dual Enrollment
```sql
-- Find patients enrolled in both systems
SELECT 
  pc.first_name,
  pc.last_name,
  pc.date_of_birth,
  CASE WHEN pil.intakeq_patient_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_intakeq,
  CASE WHEN pcm.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_cm
FROM patients_canonical pc
LEFT JOIN patients_intakeq_link pil ON pc.id = pil.canonical_patient_id
LEFT JOIN patients_cm pcm ON pc.id = pcm.canonical_patient_id
WHERE pil.intakeq_patient_id IS NOT NULL AND pcm.id IS NOT NULL;
```

## Benefits

### 1. **Clean Separation**
- ✅ CM patients don't pollute IntakeQ EMR data
- ✅ CPSS staff separate from physician providers
- ✅ Each system maintains its own patient data model

### 2. **No Duplication Issues**
- ✅ Canonical identity prevents duplicate patient records
- ✅ Unique constraints enforce single records per person per system
- ✅ Clear linking mechanism for dual-enrolled patients

### 3. **Data Integrity**
- ✅ Foreign key constraints maintain referential integrity
- ✅ Check constraints ensure valid status values
- ✅ Timestamps track all changes

### 4. **Scalability**
- ✅ Can add additional service types (e.g., `patients_residential`)
- ✅ Provider separation allows independent role management
- ✅ Flexible linking supports future EMR integrations

### 5. **Operational Benefits**
- ✅ CPSS staff see only CM patients
- ✅ Psychiatry providers see only their patients
- ✅ Admin can see cross-system patient relationships
- ✅ Billing systems can access appropriate patient pools

## Migration Strategy

### Phase 1: Create New Tables
1. Create `patients_canonical` table
2. Create `patients_cm` table  
3. Create `providers_cm` table
4. Update `cm_enrollments` table

### Phase 2: Migrate Existing Data
1. Move existing CM patients from `patients` → `patients_canonical` + `patients_cm`
2. Create CPSS provider records in `providers_cm`
3. Update enrollment records with new foreign keys

### Phase 3: Update Application
1. Modify enrollment API to use new table structure
2. Update queries to use canonical patient identity
3. Add dual-enrollment detection logic

This architecture provides clean separation while elegantly handling the dual-enrollment scenario through canonical patient identity.