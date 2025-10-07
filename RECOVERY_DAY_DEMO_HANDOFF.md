# 🎯 Recovery Day Demo - CPSS Onboarding System
## Next Claude Code Session Handoff

### 🎯 **Mission: Complete CPSS Onboarding POC for Recovery Day**

You are continuing work on a **Contingency Management (CM) patient onboarding system** that CPSSs will demo at Recovery Day using a tablet. The goal is to create a seamless patient enrollment experience that showcases real-time Medicaid eligibility verification and instant patient onboarding.

---

## 📋 **What's Already Built (Completed)**

### ✅ **Database-Driven Eligibility System**
- **Real-time Office Ally integration** with Utah Medicaid (400-800ms response times)
- **Supabase database configurations** for payers and providers
- **Enhanced X12 271 parsing** that extracts:
  - Medicaid ID, phone number, address, gender from X12 response
  - Program type (Targeted Adult Medicaid vs Traditional Adult)  
  - Mental health coverage type (FFS vs Managed Care)
- **API endpoints ready**:
  - `POST /api/database-eligibility/check` - Database-driven eligibility verification
  - `GET /api/database-eligibility/payers` - Dynamic payer dropdown options
  - `GET /api/database-eligibility/payer/:payerId/config` - Payer-specific form configurations

### ✅ **Test Cases Verified Working**
- **Jeremy Montoya** (DOB: 1984-07-17) - Returns ENROLLED with "Targeted Adult Medicaid"
- **Tella Silver** (DOB: 1995-09-18) - Returns ENROLLED with Aetna copay information
- **Practice Type 2 NPI** (1275348807) properly configured for Utah Medicaid

---

## 🎯 **What Needs to Be Built (Your Mission)**

### **Phase 1: UI/UX Enhancement for Recovery Day Demo**

The current system has a basic admin interface, but Recovery Day requires a **polished, tablet-optimized CPSS onboarding flow** that demonstrates these "wow" features:

#### **1. Enhanced Eligibility Checker Interface**
- **Tablet-optimized design** with large touch targets  
- **Real-time eligibility verification** showing "ELIGIBLE" status prominently
- **Auto-populated fields** from X12 271 response data:
  - Phone number (editable, confirm with patient)
  - Medicaid ID (for claims submission)
  - Address and gender (extracted from eligibility response)

#### **2. Patient Pre-filling & Confirmation Flow**
```
Step 1: Basic Info Entry (Name + DOB) 
    ↓
Step 2: Real-time Eligibility Check (400-800ms)
    ↓  
Step 3: Pre-filled Patient Data Review
    ↓
Step 4: Phone Number Confirmation ("Is this current smartphone number?")
    ↓
Step 5: SMS Link Generation & Send
```

#### **3. SMS Integration**
- **Send text message** to confirmed phone number with secure link
- **Link contains**:
  - Consent/Terms screen with "I Agree" button
  - Identity verification (explore secure options)
  - Direct connection to **reach-2-0 CM patient app**

---

## 🔧 **Technical Architecture (Database-First)**

### **Database Integration Pattern**
Follow the established **database-first approach** from previous session:

1. **Supabase as source of truth** for all configurations
2. **API routes query database** instead of hardcoded mappings  
3. **Database logging** for all eligibility checks and patient interactions
4. **UUID-based relationships** with proper foreign key constraints

### **File Organization**
```
medicaid-eligibility-checker/
├── database-driven-eligibility-service.js ✅ (Ready to use)
├── database-driven-api-routes.js ✅ (Ready to use)  
├── supabase-office-ally-migration.sql ✅ (Already applied)
├── src/components/
│   ├── CPSSOnboardingFlow.vue (NEW - Your main component)
│   ├── EligibilityChecker.vue (ENHANCE existing)
│   └── PatientDataConfirmation.vue (NEW)
├── api-server.js ✅ (Enhanced with error handling)
└── CLAUDE.md ✅ (Contains all database-first patterns)
```

---

## 📱 **User Stories from reach-2-0 Analysis**

Based on the reach-2-0 repository review, here are the **patient user stories** for the CM app that your SMS link will connect to:

### **Primary Patient Journey (reach-2-0)**
1. **As a patient**, I want to **log in with simple credentials** so that I can access my CM program securely
2. **As a patient**, I want to **see my care team** (MSW Cam Rodriguez, CPSS Zach Thompson) so I know who's supporting me
3. **As a patient**, I want to **complete daily drug tests with video guidance** so I can earn points while being supported
4. **As a patient**, I want to **earn points for negative tests** (+15 points) so I'm incentivized to stay clean
5. **As a patient**, I want to **spin a roulette wheel for real cash** ($5-$30) when I earn 25+ points so I get immediate rewards
6. **As a patient**, I want to **track my progress and points** so I can see my recovery journey
7. **As a patient**, I want **guided video test sessions** with CPSS so I feel supported during testing

### **Advanced Patient Features (reach-2-0)**
- **Video call interface** with CPSS during drug testing
- **QR code verification** for tamper-proof test kits
- **Real-time coaching** and encouragement during test wait times
- **Cash reward roulette** with visual spinning wheel animation
- **Pod-based support** with 8-patient cohorts
- **Group therapy attendance** tracking with additional points
- **Mobile-first design** optimized for smartphones

---

## 🎨 **Demo Flow Requirements**

### **Recovery Day Booth Scenario**
**Setting**: USARA booth with tablet  
**Audience**: Case managers, peer support specialists, clinicians  
**Goal**: Show seamless onboarding of StimUD patients

### **Demo Script**
```
CPSS: "Let me show you how we can instantly verify Medicaid eligibility and enroll patients"

1. Enter patient name + DOB on tablet
2. System calls Office Ally → Shows "ELIGIBLE" in <1 second  
3. Patient data auto-populates from Medicaid database
4. CPSS confirms phone number with patient
5. System sends SMS with secure link
6. Patient opens link → consent → identity verification → CM app tutorial

CPSS: "Patient is now enrolled and can start earning rewards immediately"
```

### **"Wow" Factors to Highlight**
✨ **Sub-second eligibility verification** (vs manual processes)  
✨ **Auto-populated patient data** from Medicaid database  
✨ **Instant SMS onboarding** with secure link  
✨ **Real-time integration** with Office Ally EDI system  
✨ **Database-driven configuration** (easy to add new payers)

---

## 🔧 **Implementation Guide**

### **Step 1: Database Schema Extension (30 minutes)**
Add patient enrollment tracking to Supabase:
```sql
-- Add to existing schema
CREATE TABLE patient_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    medicaid_id VARCHAR(50),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address JSONB,
    eligibility_status VARCHAR(20) DEFAULT 'verified',
    enrollment_source VARCHAR(50) DEFAULT 'cpss_onboarding',
    sms_link_sent_at TIMESTAMP,
    sms_link_clicked_at TIMESTAMP,
    reach_app_registered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) -- CPSS name/identifier
);
```

### **Step 2: Enhanced Vue.js Frontend (60 minutes)**
Create `CPSSOnboardingFlow.vue` with:
- Large, tablet-friendly input fields
- Real-time eligibility status display  
- Pre-filled data review screen
- Phone confirmation with edit capability
- SMS sending with success confirmation

### **Step 3: SMS Integration (45 minutes)**
Implement SMS service using Twilio or similar:
- Generate secure enrollment links with expiration
- Template-based SMS with enrollment instructions
- Link tracking for demo analytics

### **Step 4: Integration with reach-2-0 (30 minutes)**  
Create bridge between onboarding and patient app:
- Secure token-based patient authentication
- Auto-populate patient data in reach-2-0
- Seamless handoff from enrollment to CM program

---

## 📊 **Database-First Development Patterns (Critical)**

### **Follow Established Patterns**
Reference `/CLAUDE.md` sections on database-first development:

1. **Query Supabase first** for all configurations
2. **Log all interactions** to database for analytics  
3. **Use UUID foreign keys** for proper relationships
4. **Graceful error handling** for database connection issues
5. **Database views** for complex API queries
6. **Environment-based configuration** for development vs production

### **Error Handling Patterns**
```javascript
// From database-driven-eligibility-service.js
try {
    const config = await getPayerConfig(payerId);
    if (!config) {
        throw new Error(`Payer configuration not found: ${payerId}`);
    }
    // Continue with eligibility check
} catch (error) {
    console.error('Database query failed:', error);
    // Graceful fallback or user-friendly error
}
```

---

## 🚀 **Success Criteria for Recovery Day**

### **Demo Must Demonstrate**
✅ **CPSS can verify patient eligibility in real-time** (<1 second response)  
✅ **Patient data auto-populates** from Medicaid X12 271 response  
✅ **SMS link sends successfully** to patient phone number  
✅ **Patient opens link** and reaches consent/identity verification  
✅ **Seamless connection** to reach-2-0 CM patient app  
✅ **Database tracks entire flow** for analytics and follow-up

### **Technical Requirements**
✅ **Tablet-optimized interface** with large touch targets  
✅ **Error handling** for network issues and edge cases  
✅ **Analytics logging** for demo performance metrics  
✅ **Offline capability** for poor venue wifi (optional)

---

## ⚠️ **Critical Dependencies & Constraints**

### **Office Ally Integration**
- **Working credentials**: `[REDACTED-USERNAME]` / `[REDACTED-PASSWORD]`  
- **Test patients verified**: Jeremy Montoya, Tella Silver
- **Response time**: 400-800ms average
- **Utah Medicaid payer ID**: `UTMCD` 
- **Practice NPI**: `1275348807` (Type 2 - Practice)

### **Supabase Database** 
- **Migration applied**: `supabase-office-ally-migration.sql`
- **Views created**: `v_office_ally_eligibility_configs`, `v_provider_office_ally_configs`
- **Connection string**: In `.env.local` (do not commit)

### **reach-2-0 Integration**
- **Separate repository**: `../reach-2-0` (do not modify during this session)
- **API endpoint**: Will need secure patient authentication
- **Database**: PostgreSQL with UUID-based schema

---

## 🎯 **Next Session Objectives**

1. **Build tablet-optimized onboarding UI** with real-time eligibility verification
2. **Implement SMS link generation** with secure enrollment tokens  
3. **Create patient data pre-filling** from X12 271 responses
4. **Test complete flow** with Jeremy Montoya test case
5. **Polish demo presentation** for Recovery Day booth setup

**Timeline**: 3-4 hours of development for full demo-ready system

**Key Success Metric**: CPSS can enroll a patient from eligibility check to CM app access in under 2 minutes with zero manual data entry.

---

*This handoff continues the database-first architecture established in the previous session. All patterns, error handling, and database integration approaches are documented in `/CLAUDE.md` for reference.*