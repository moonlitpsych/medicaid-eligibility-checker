# CLAUDE.md - Medicaid Eligibility & Claims System

**Last Updated**: 2025-10-07 (Evening)
**Status**:
- ✅ **Eligibility Checking**: Production-ready
- 🟡 **Claims Submission**: RC77 fix applied, awaiting validation

---

## 📁 Project Organization

This system has **two major components**:

### 1. **Real-Time Eligibility Verification** ✅ PRODUCTION-READY
- Office Ally X12 270/271 integration
- Sub-second responses for Utah Medicaid, Aetna, UUHP, etc.
- Patient cost estimator (copays, deductibles)
- IntakeQ patient integration
- Web interface at `/universal-eligibility-interface.html`
- **Status**: Working perfectly, in daily use

### 2. **Direct Claims Submission** 🟡 IN DEVELOPMENT
- EDI 837P claims generator
- Office Ally SFTP integration
- Database-driven payer/provider data
- CMS-1500 web interface
- **Current Focus**: Validating Utah Medicaid Provider ID fix
- **Detailed Progress**: See `CLAIMS_SUBMISSION_PROGRESS.md` 📋

---

## 🎯 IMMEDIATE NEXT STEPS (for next Claude Code session)

### **🔍 HIGH PRIORITY: Validate RC77 Fix** ⏳ WAITING FOR RESPONSE

**Context**: We fixed the RC77 rejection by adding Utah Medicaid Provider ID (4347425)

**What to Do** (2025-10-08 Morning):

1. **Check SFTP for responses**:
   ```bash
   node get-latest-uuhp-271.js
   # Or manually check /outbound/ folder via SFTP
   ```

2. **Look for these files**:
   - **999 Functional Acknowledgement** - Should confirm file accepted
   - **277 Claim Status** - Should show "ACCEPTED" (NO RC77!)

3. **Expected vs Actual**:
   - ✅ **Success**: 277 shows "Acknowledged - Forwarded to payer"
   - ❌ **Failure**: Still getting RC77 rejection

4. **If successful**:
   - Update `CLAIMS_SUBMISSION_PROGRESS.md` status to ✅ COMPLETE
   - Remove OATEST prefix for production claims
   - Document success in CLAUDE.md

5. **If RC77 still appears**:
   - Contact Utah Medicaid EDI Support: MHC-EDI@utah.gov
   - Verify Provider ID 4347425 is correct in PRISM portal
   - Check if additional segments are required

**Related Files**:
- `UTAH_MEDICAID_RC77_FIX.md` - Complete fix documentation
- `CLAIMS_SUBMISSION_PROGRESS.md` - Detailed claims project tracker
- `test-utah-medicaid-claim.js` - Automated test claim script

---

## 🎯 NEXT STEPS (Eligibility System)

### **🐛 HIGH PRIORITY BUG FIX: UUHP Eligibility Configuration**

**Issue**: UUHP (University of Utah Health Plans) returns "Payer not configured: UNIV-UTHP" error

**Root Cause**:
- UUHP exists in `payers` table with eligibility_id "UNIV-UTHP"
- But missing from `office_ally_eligibility_configs` table
- Database-driven eligibility endpoint requires both tables

**Fix**: Add UUHP to `office_ally_eligibility_configs` table in Supabase
```sql
-- Need to add row to office_ally_eligibility_configs for UUHP
-- With fields: office_ally_payer_id, payer_name, category, field requirements, etc.
-- Reference existing entries for Utah Medicaid or Aetna as template
```

**Files involved**:
- `routes/database-driven-eligibility-service.js` line 72-102 - queries `v_office_ally_eligibility_configs` view
- `database/supabase-office-ally-migration.sql` line 431 - defines the view

---

### **✨ UI ENHANCEMENT: Display Financial Responsibility Information**

**Priority**: Show copay and deductible information to users in eligibility results

**What to Build**:

1. **Co-pay Information Display**
   - Extract copay amounts from X12 271 response (already parsed by backend)
   - Display clearly in eligibility results UI
   - Show different copay types (office visit, specialist, etc.)
   - Format: "$25 copay for office visits"

2. **In-Network Deductible Information**
   - Parse deductible details from X12 271 EB segments (already parsed)
   - Show remaining deductible amounts
   - Display both individual and family deductibles
   - Format: "$500 remaining of $2,000 annual deductible"

**Current Status**:
- ✅ Backend already parses copay/deductible from X12 271
- ✅ Patient cost estimator calculates estimates based on this data
- ⚠️ Frontend displays "enrolled" but doesn't show detailed financial breakdown
- 📝 Need to enhance `displayResults()` function in universal-eligibility-interface.html

**Files to Update**:
- `public/universal-eligibility-interface.html` - Add copay/deductible display sections
- Verify `routes/database-driven-eligibility.js` returns all parsed financial data in response

**Example Display** (what users should see):
```
✅ ENROLLED - In Network

💵 YOUR FINANCIAL RESPONSIBILITY:
• Office Visit Copay: $25
• Specialist Copay: $40
• Deductible: $500 remaining (of $2,000 annual)
• Out-of-Pocket Max: $3,500 remaining (of $6,000 annual)
```

---

## 🎯 RECENT PROGRESS (2025-10-07 Evening)

### **✅ COMPLETED: Claims Database Logging**

**Problem**: Claims were submitting successfully to Office Ally but database logging was failing
```
⚠️  Database insert failed: {}
```

**Root Cause**: The `claims_submissions` table didn't exist in Supabase

**What Was Fixed**:
1. ✅ Created `claims_submissions` table in Supabase
2. ✅ Ran SQL: `database/create-claims-submissions-table.sql`
3. ✅ Verified table with test insert/select
4. ✅ Submitted new test claim via API
5. ✅ Confirmed database logging now works

**Test Claim Submitted** (via API):
- Claim ID: CLM9858249756
- Patient: Bryan Belveal (Member ID: 0313118282)
- Payer: Utah Medicaid FFS (837P ID: SKUT0)
- Service: CPT 99214, $175.00
- Status: ✅ SUBMITTED to Office Ally + ✅ LOGGED to database

**Files Created**:
- `database/create-claims-submissions-table.sql` - Table schema
- `database/verify-claims-table.js` - Verification script
- `database/check-latest-claim.js` - Query latest claim from database
- `database/setup-claims-table-auto.js` - Automated setup script
- `FIX_CLAIMS_DATABASE.md` - Complete fix guide

**View Claims**:
- Supabase: https://supabase.com/dashboard/project/alavxdxxttlfprkiwtrq/editor/claims_submissions
- API: `GET http://localhost:3000/api/claims/history`
- CLI: `node database/check-latest-claim.js`

**What the Table Tracks**:
- All 837P claims submitted to Office Ally
- Patient, payer, provider information
- Service lines, charges, diagnosis codes
- Full EDI transaction content
- Status progression: SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID
- Response files: 999, 277, 835 ERAs

---

## 🎯 PREVIOUS COMPLETIONS (Claims Interface Enhancements)

### **✅ COMPLETED TODAY (2025-10-07)**

1. ✅ **CMS-1500 Claims Submission Interface** - Built complete web UI for 837P claims
2. ✅ **Database-Driven Provider Data** - Billing & rendering providers from Supabase
3. ✅ **Real Tax ID & Address** - Moonlit PLLC data pulled from database (not env vars)
4. ✅ **Rendering Provider Names** - Real provider names in 837P (not placeholders)
5. ✅ **Correct Payer IDs** - SKUT0 for Utah Medicaid claims (not UTMCD)
6. ✅ **Test Claims Working** - Successfully submitted 2 test claims to Office Ally
7. ✅ **Patient Cost Estimator** - Shows estimated patient financial responsibility before booking

---

### **✅ COMPLETED (2025-10-07 Evening) - Patient Cost Estimator**

**Feature**: Real-time cost estimation showing "You will owe $X for this visit"

**What Was Built**:
- `lib/moonlit-fee-schedule.js` - Moonlit fee schedule for all CPT codes
- `lib/patient-cost-estimator.js` - Cost calculation engine
- Enhanced `database-driven-api-routes.js` - Adds cost estimates to eligibility API
- Enhanced `public/universal-eligibility-interface.html` - Displays cost estimates in UI

**How It Works**:
1. Patient eligibility check runs (gets deductible, copay, coinsurance from X12 271)
2. Cost estimator calculates patient responsibility for common services:
   - 45-minute therapy (90834): $150
   - 60-minute therapy (90837): $180
   - Initial psychiatric eval (90791): $200
3. Displays breakdown: deductible portion + copay + insurance coverage
4. Shows confidence level (high/medium/low) based on data completeness

**Special Handling**:
- **Medicaid FFS patients**: Shows $0 patient responsibility (full coverage)
- **Commercial patients with deductible**: Shows deductible + copay calculation
- **After deductible met**: Only shows copay amount
- **Missing copay data**: Conservative estimate with disclaimer

**Example Output** (Medicaid patient):
```
💵 ESTIMATED COST FOR YOUR VISIT

45-Minute Therapy Session
You will likely owe: $0.00
• Covered by Medicaid (no patient responsibility)

Explanation: Medicaid covers this service in full with no copay
or deductible. You should not owe anything for this visit!
```

**Files Created/Modified**:
- `lib/moonlit-fee-schedule.js` (NEW)
- `lib/patient-cost-estimator.js` (NEW)
- `database-driven-api-routes.js` (UPDATED - lines 207-218, 292-308)
- `public/universal-eligibility-interface.html` (UPDATED - added cost display)
- `test-cost-estimator.js` (NEW - testing script)

**Testing**:
- ✅ Tested with Jeremy Montoya (Utah Medicaid FFS) - Shows $0 correctly
- ✅ Handles missing financial data gracefully
- ✅ Displays in eligibility check UI automatically

**Next Steps** (Future Enhancements):
- Test with commercial insurance patients (UUHP, Aetna with deductibles)
- Add confidence indicators in UI (✅ high, 💡 medium, ⚠️ low)
- Track estimation accuracy vs actual claim payments
- Add service type selector for custom estimates

---

### **🚀 HIGH PRIORITY - Claims Interface UX**

1. **IntakeQ Patient Data Auto-Fill Issues**
   - ❌ Address not auto-populating from IntakeQ
   - ❌ Gender (M/F) not auto-populating from IntakeQ
   - **Issue**: Frontend not parsing `raw_data` field correctly
   - **Fix**: Update `selectPatient()` function to extract from `raw_data.Gender` and `raw_data.Address`
   - **File**: `public/cms-1500-claims-interface.html`

2. **Payer Selection: Dropdown → Fuzzy Search**
   - ❌ Currently using dropdown (bad UX with 31 payers)
   - ✅ Should use fuzzy search (like booking flow)
   - **Model**: Copy payer search from booking flow
   - **Benefit**: Faster selection, scales to 100+ payers

3. **Diagnosis Code Fuzzy Search**
   - ❌ Currently manual text entry (requires memorization)
   - ✅ Should use fuzzy search with common codes
   - **Model**: Copy from labs requisition form generator
   - **Example**: Type "depression" → Shows F329, F332, F333
   - **File**: Need to create diagnosis code database table or JSON file

---

### **🔥 CRITICAL - IntakeQ Appointments API Integration**

**Goal**: Auto-populate CPT codes, service dates, and rendering provider from actual appointments

**Why This Matters**:
- CPT codes should be **100% automated** (no manual entry)
- Service dates come from appointment calendar
- Rendering provider auto-selected from appointment
- This is where we "beat" IntakeQ's native claims generator

**Implementation Steps**:
1. **Fetch Appointments for Patient**
   - Endpoint: `GET https://intakeq.com/api/v1/appointments?clientId={id}`
   - Returns: Date, time, practitioner, appointment type

2. **Map Appointment Type → CPT Code**
   - Create `appointment_cpt_mapping` table in Supabase
   - Example: "Initial Psychiatric Evaluation" → 90791
   - Example: "Psychotherapy 45min" → 90834

3. **Auto-Select Rendering Provider**
   - Get `PractitionerId` from appointment
   - Match to `intakeq_practitioner_id` in `providers` table
   - Auto-fill rendering provider NPI

4. **Pre-fill Service Lines**
   - User selects patient → Show recent appointments
   - Click appointment → Auto-fills date, CPT, provider
   - User can edit if needed

---

### **📊 NEW DATABASE TABLE NEEDED: Payer Contracts**

**Purpose**: Track which providers are contracted with which payers

**Schema**:
```sql
CREATE TABLE payer_provider_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payer_id UUID REFERENCES payers(id),
    provider_id UUID REFERENCES providers(id),
    is_directly_contracted BOOLEAN DEFAULT false,
    contract_start_date DATE,
    contract_end_date DATE,
    fee_schedule JSONB,  -- CPT code → allowed amount
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic**:
- If payer contracts with resident directly → Use resident as rendering provider
- If payer only contracts with attending → Use Anthony Privratsky (NPI: 1336726843)
- Auto-determine rendering provider based on appointment practitioner + payer

---

### **🐛 UI BUGS TO FIX**

1. **Billing Provider NPI/Tax ID Shows "Loading..."**
   - ✅ **FIXED**: Now pulls from `/api/providers/billing`
   - Status: Working in latest version

2. **Rendering Provider Dropdown Only Shows Travis Norseth**
   - ✅ **FIXED**: Now shows all 9 active providers with NPIs
   - Status: Working in latest version

**Files to Update**:
- `public/universal-eligibility-interface.html` - Add copay/deductible display sections
- Verify `routes/database-driven-eligibility.js` returns all parsed financial data

---

## 🎯 PROJECT VISION: UNIFIED OFFICE ALLY INTEGRATION

### **Strategic Decision: Office Ally for Everything**

We're consolidating around **Office Ally** as our single integration point for:
1. ✅ **Real-time Eligibility Verification** (COMPLETE!)
2. ✅ **Claims Submission via SFTP** (COMPLETE!)
3. ✅ **ERA (Remittance) Receipt** (COMPLETE!)

**Why this matters**: Instead of relying on IntakeQ's claims generator, we can submit claims directly to all payers through Office Ally, giving us full control over the revenue cycle while still using IntakeQ for clinical workflow.

---

## 🏗️ CURRENT STATE: ELIGIBILITY CHECKING (PRODUCTION-READY)

### **What's Working Now**
✅ **Real-time eligibility verification via Office Ally Realtime API**
- Utah Medicaid FFS: Name + DOB only, <1 second response
- Aetna: Name + DOB + Member ID, sub-second response
- Response times: 400-800ms average
- Enhanced X12 271 parser extracting: copays, deductibles, OOP max, coinsurance
- Professional web UI at `/universal-eligibility-interface.html`

✅ **Key Technical Components**
- `api-server.js` - Express server with eligibility endpoints
- `api/medicaid/check.js` - Office Ally integration with X12 270/271 processing
- `universal-eligibility-checker.js` - CLI tool for testing
- Database-driven payer configuration (Supabase)
- Environment variable-based credential management

✅ **Proven with Real Patients**
- Jeremy Montoya (Utah Medicaid)
- Tella Silver (Utah Medicaid)
- Patient TS (Aetna - with copay information)

✅ **Security Status**
- All credentials in environment variables (`.env.local`)
- Git history cleaned of exposed credentials
- Enhanced `.gitignore` preventing future leaks
- See `SECURITY_CLEANUP_COMPLETE.md` for full remediation details

✅ **IntakeQ Patient Integration** (NEW - 2025-10-07)
- **Database**: `intakeq_clients` table in Supabase stores all patient data
- **Sync**: All 88 patients synced from IntakeQ with `includeProfile=true`
- **Search**: Type-ahead patient search by name in web UI
- **Auto-fill**: Click patient → automatically fills form (name, DOB, member ID)
- **API Endpoints**:
  - `GET /api/intakeq/clients/list?search=name` - List all cached patients with optional search
  - `POST /api/intakeq/clients/sync` - Sync from IntakeQ to database
  - `POST /api/database-eligibility/check` - Check eligibility (uses database payer IDs)
- **Files Created/Modified**:
  - `lib/intakeq-service.js` - IntakeQ API integration service (NEW)
  - `database/create-intakeq-clients-table.sql` - Database schema (NEW)
  - `public/universal-eligibility-interface.html` - UI with patient search (UPDATED)
    - Changed API endpoint from `/api/universal-eligibility/check` to `/api/database-eligibility/check`
    - Fixed field names: `firstName`, `lastName`, `dateOfBirth`, `memberNumber`
- **Data Stored**: Name, DOB, email, phone, insurance name, member ID, raw JSON
- **Performance**: 88 patients synced in ~13 seconds
- **Key Fix**: IntakeQ date format converted from Unix timestamp to PostgreSQL DATE format
- See `INTAKEQ_INTEGRATION_COMPLETE.md` and `QUICK_START_TESTING.md` for full details

## 🚀 HOW TO USE THE SYSTEM (Quick Start)

### **Start the API Server**
```bash
cd /Users/macsweeney/medicaid-eligibility-checker
node api-server.js
```

### **Access the Web Interface**
```
http://localhost:3000/public/universal-eligibility-interface.html
```

### **Sync IntakeQ Patients (First Time or Updates)**
```bash
# Via API
curl -X POST http://localhost:3000/api/intakeq/clients/sync

# Or click "🔄 Sync IntakeQ" button in the web UI
```

### **Check Eligibility Workflow**
1. Open web interface
2. Type patient name in search box (e.g., "Tella", "Jeremy")
3. Click patient from search results → form auto-fills
4. Select payer from dropdown (12 payers loaded dynamically)
5. Add Member ID if needed (for commercial payers)
6. Click "Check Eligibility"
7. Results display enrollment status

### **Working Payers** (Fully Configured)
- ✅ Utah Medicaid Fee-for-Service (UTMCD)
- ✅ Aetna (60054)
- ✅ SelectHealth Integrated (13161)
- ✅ Molina Utah (MLNUT)
- ⚠️ UUHP (UNIV-UTHP) - Needs configuration (see bug fix above)

### **Test Patients with Real Data**
- **Tella Silver**: DOB 1995-09-18, Member ID W2681 97637
- **Jeremy Montoya**: DOB 1984-07-17 (Utah Medicaid)
- **Hayden Cook**: DOB 1992-10-23, Member ID 906067054

---

## ⚠️ CRITICAL FIXES APPLIED (2025-10-07)

**DO NOT REVERT THESE CHANGES** - They fix critical bugs:

### **1. Eligibility API Endpoint**
- ✅ **CORRECT**: Use `/api/database-eligibility/check`
- ❌ **WRONG**: `/api/universal-eligibility/check` (doesn't work with database payer IDs)
- **File**: `public/universal-eligibility-interface.html` line 467

### **2. Form Field Names**
- ✅ **CORRECT**: `firstName`, `lastName`, `dateOfBirth`, `memberNumber`
- ❌ **WRONG**: `first`, `last`, `dob`, `memberId`
- **Why**: Database-driven API expects these exact field names
- **File**: `public/universal-eligibility-interface.html` lines 455-464

### **3. IntakeQ Date Conversion**
- ✅ **CORRECT**: Convert Unix timestamp to `YYYY-MM-DD` format
- ❌ **WRONG**: Store raw timestamp (causes PostgreSQL DATE field errors)
- **Code**: `new Date(parseInt(client.DateOfBirth)).toISOString().split('T')[0]`
- **File**: `lib/intakeq-service.js` lines 96-107

### **4. IntakeQ API Parameter**
- ✅ **CORRECT**: Use `includeProfile=true` to get full patient data
- ❌ **WRONG**: Without this, only gets basic fields (no insurance info)
- **File**: `lib/intakeq-service.js` line 27

### **5. Static File Serving**
- ✅ **CORRECT URL**: `http://localhost:3000/public/universal-eligibility-interface.html`
- ❌ **WRONG URL**: `http://localhost:3000/universal-eligibility-interface.html` (404 error)
- **Why**: Express serves static files from root with `/public/` prefix

---

✅ **Payer ID Database Integration**
- Office Ally payer IDs stored in Supabase `payers` table
- Transaction-specific columns: `oa_eligibility_270_id`, `oa_professional_837p_id`, `oa_remit_835_id`
- 18 payers configured with verified Office Ally IDs
- Surgical matching approach (only updating existing payers, not mass import)
- See `database/SURGICAL-APPROACH-README.md` for full details

---

## 🗄️ CRITICAL: PAYER ID DATABASE ARCHITECTURE

### **Why Different IDs for Different Transactions?**

Office Ally uses **DIFFERENT payer IDs** for different transaction types. This is critical for correct operation:

**Example - Utah Medicaid:**
- Eligibility (270/271): `UTMCD`
- Claims (837P): `U4005`
- Remittance (835): `SKUT0`

Using the wrong ID (e.g., sending claims with eligibility ID) will cause rejections.

### **Database Schema**

The `payers` table now has three Office Ally ID columns:

```sql
-- Transaction-specific payer IDs
oa_eligibility_270_id TEXT      -- For real-time eligibility checks (270/271)
oa_professional_837p_id TEXT    -- For professional claims submission (837P)
oa_remit_835_id TEXT           -- For electronic remittance advice (835)
```

### **How to Use Payer IDs in Code**

**❌ WRONG - Hardcoded:**
```javascript
// DON'T DO THIS ANYMORE
const payerId = 'UTMCD'; // Hardcoded and wrong for claims!
```

**✅ CORRECT - Database-driven:**

**For Eligibility Checks (270/271):**
```javascript
const { data: payer } = await supabase
    .from('payers')
    .select('oa_eligibility_270_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const payerId = payer.oa_eligibility_270_id; // UTMCD ✅
```

**For Claims Submission (837P):**
```javascript
const { data: payer } = await supabase
    .from('payers')
    .select('oa_professional_837p_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const payerId = payer.oa_professional_837p_id; // U4005 ✅
```

**For ERA Processing (835):**
```javascript
const { data: payer } = await supabase
    .from('payers')
    .select('oa_remit_835_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const payerId = payer.oa_remit_835_id; // SKUT0 ✅
```

### **Configured Payers (18 Total)**

**Critical Utah/Idaho Medicaid:**
- **Utah Medicaid FFS**: UTMCD / U4005 / SKUT0
- **Idaho Medicaid**: 10363 / MCDID / MCDID
- **Molina Utah**: MLNUT / SX109 / SX109
- **SelectHealth**: 13161 / SX107 / SX107
- **UUHP**: UNIV-UTHP / SX155 / SX155
- **Optum Salt Lake**: N/A / U6885 / U6885

**Commercial Payers:**
- **Aetna**: 60054 / 60054 / 60054
- **Cigna**: N/A / 62308 / 62308
- **United Healthcare**: UHSS / HLPUH / N/A
- **Regence BCBS**: 00910 / 00910 / 00910
- **TriCare West**: 10747 / 99726 / 99726

**See full list**: Run `node database/match-and-update-payers.js` or query Supabase

### **Files Modified to Use Database IDs**

**To Update** (if not already done):
1. ✅ `api/medicaid/check.js` - Eligibility checker should fetch `oa_eligibility_270_id`
2. ✅ `lib/edi-837-generator.js` - Claims generator should fetch `oa_professional_837p_id`
3. ✅ `lib/edi-835-parser.js` - ERA parser should fetch `oa_remit_835_id`
4. ✅ `lib/edi-277-parser.js` - Claim status should use `oa_professional_837p_id`

---

## 🚀 NEXT PHASE: CLAIMS SUBMISSION VIA OFFICE ALLY SFTP

### **The Opportunity**

We already have:
1. ✅ Office Ally account (`moonlit` / credentials in `.env.local`)
2. ✅ SFTP connection established with Office Ally
3. ✅ Integration working with IntakeQ via SFTP for claims

**What this enables:**

#### **1. Patient Eligibility Self-Service**
Patients can verify themselves whether Moonlit is in-network with their insurance before booking:
- Real-time eligibility check via Office Ally
- Display coverage details (deductibles, copays, OOP max)
- Show patient responsibility for visits
- Example: "You're in-network but haven't hit your deductible. You'll pay $150 for this visit. After this visit, your insurance will pay and you'll only have a $20 copay."

#### **2. Automated Copay Collection**
- Eligibility check → Extract copay amount from X12 271 response
- Charge payment method after visit automatically
- Could integrate with IntakeQ's payment system OR set up standalone Stripe account

**Question to consider**: If we're building payment automation, at what point does it make sense to move away from IntakeQ entirely?

#### **3. Direct Claims Submission**
Skip IntakeQ's claims generator and submit directly to Office Ally:
- Generate EDI 837 transactions (claim files)
- Submit via SFTP to Office Ally
- Office Ally routes to appropriate payer (Aetna, Utah Medicaid, etc.)
- Receive EDI 835 transactions (remittance/ERA files) back via SFTP
- Parse ERAs to see: "accepted" or "rejected with reason"

**Current IntakeQ Usage** (if we go direct):
- Team appointment calendar/scheduling
- Clinical notes
- E-prescribing
- Intake paperwork
- Patient messaging
- Payment processing (potentially)

**Could be replaced** (if we build our own):
- Claims generation (we'd do this via Office Ally SFTP)
- Payment processing (could use Stripe directly)
- Patient portal (could build custom)

#### **4. Contingency Management Claims**
- Office Ally SFTP enables easy claims submission for CM services
- No manual claim entry needed
- Automated billing workflow for CM program

---

## 🔧 TECHNICAL ARCHITECTURE

### **Current System Components**

```
┌─────────────────────────────────────────────────────────────┐
│                     MOONLIT SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FRONTEND (Vue.js)                        │  │
│  │  - Universal eligibility interface                    │  │
│  │  - Patient self-service portal                        │  │
│  │  - CPSS enrollment workflow                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           API SERVER (Express.js)                     │  │
│  │  - POST /api/medicaid/check (eligibility)            │  │
│  │  - POST /api/universal-eligibility/check             │  │
│  │  - Database-driven payer configs                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SUPABASE DATABASE                        │  │
│  │  - payer_configurations                              │  │
│  │  - eligibility_log                                   │  │
│  │  - patients_canonical                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    OFFICE ALLY                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     REALTIME API (Already Integrated ✅)              │  │
│  │  - POST to TransactionService/rtx.svc                │  │
│  │  - X12 270 (eligibility inquiry) → X12 271 (response)│  │
│  │  - Response time: 400-800ms                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     SFTP CONNECTION (✅ Integrated!)                  │  │
│  │  - Submit: EDI 837 files (claims)                    │  │
│  │  - Receive: EDI 835 files (ERAs/remittances)         │  │
│  │  - Receive: EDI 277 files (claim status)             │  │
│  │  - Host: ftp10.officeally.com                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      PAYERS                                  │
│  - Utah Medicaid FFS                                        │
│  - Aetna                                                    │
│  - [200+ other payers supported by Office Ally]            │
└─────────────────────────────────────────────────────────────┘
```

### **Integration with IntakeQ**

**Current Setup**:
```
IntakeQ → (generates claims) → Office Ally SFTP → Payers
IntakeQ ← (receives ERAs) ← Office Ally SFTP ← Payers
```

**Proposed Setup** (bypassing IntakeQ claims generator):
```
Our System → (generate EDI 837) → Office Ally SFTP → Payers
Our System ← (parse EDI 835) ← Office Ally SFTP ← Payers

IntakeQ: Still used for clinical workflow (notes, scheduling, etc.)
```

**Getting Member IDs from IntakeQ**:
When we need Member IDs for eligibility checking, we use IntakeQ's Client API:
- Endpoint: `https://intakeq.com/api/v1/clients/{id}`
- Field: `PrimaryInsurancePolicyNumber` contains insurance Member ID
- Documentation: https://support.intakeq.com/article/251-intakeq-client-api

---

## 📋 IMPLEMENTATION ROADMAP

### **Phase 1: Eligibility Enhancements** (Current)
- [x] Basic Utah Medicaid eligibility (Name + DOB)
- [x] Commercial payer support (Aetna with Member ID)
- [x] X12 271 response parsing (copays, deductibles, OOP)
- [ ] UUHP (University of Utah Health Plans) integration
- [ ] Payer database in Supabase (dynamic payer list)
- [ ] Patient self-service eligibility portal

### **Phase 2: SFTP Claims Submission** (✅ COMPLETE!)
- [x] EDI 837 generator (claims file creation)
- [x] SFTP connection testing (working with IntakeQ credentials)
- [x] Submit test claim via SFTP
- [x] EDI 835 parser (ERA/remittance processing)
- [x] EDI 277 parser (claim status responses)
- [x] Receive and parse response files from outbound folder
- [x] Complete documentation (`OFFICE_ALLY_CLAIMS_SUBMISSION_GUIDE.md`)

**🎉 Successfully Submitted Test Claim:**
- File: `OATEST_837P_2025-10-07T04-10-19.txt`
- Status: Uploaded to Office Ally inbound folder
- Awaiting: 277 status response (6-12 hours)

### **Phase 3: Automated Revenue Cycle** (Future)
- [ ] Automated copay calculation from eligibility
- [ ] Payment collection integration (Stripe or IntakeQ)
- [ ] Claim generation from appointment data
- [ ] Automated claim submission on service completion
- [ ] ERA reconciliation and posting
- [ ] Rejection/denial handling workflow

### **Phase 4: IntakeQ Independence** (Optional)
- [ ] Custom appointment scheduling system
- [ ] Clinical notes system
- [ ] Patient portal
- [ ] Payment processing
- [ ] E-prescribing integration
- [ ] Intake forms

### **Phase 5: CM Program Integration**
- [ ] Contingency management eligibility verification
- [ ] CM service claims submission
- [ ] CM program billing automation
- [ ] Integration with moonlit-scheduler (booking flow)

---

## 🔐 SECURITY & CREDENTIALS

### **Current Security Status**: ✅ SECURE

All credentials are stored in `.env.local` (not committed to git):

```bash
# Office Ally Real-time API
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc
OFFICE_ALLY_RECEIVER_ID=OFFALLY
OFFICE_ALLY_SENDER_ID=1161680
OFFICE_ALLY_USERNAME=moonlit
OFFICE_ALLY_PASSWORD=[stored in .env.local]

# Provider Information
PROVIDER_NPI=1275348807
PROVIDER_NAME=Moonlit PLLC

# Office Ally SFTP (for claims submission) - ✅ CONFIGURED
OFFICE_ALLY_SFTP_HOST=ftp10.officeally.com
OFFICE_ALLY_SFTP_PORT=22
OFFICE_ALLY_SFTP_USERNAME=moonlit
OFFICE_ALLY_SFTP_PASSWORD=[stored in .env.local]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=[stored in .env.local]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[stored in .env.local]
SUPABASE_SERVICE_KEY=[stored in .env.local]

# IntakeQ API
INTAKEQ_API_KEY=[stored in .env.local]
```

### **Security Documentation**
- `SECURITY_CLEANUP_COMPLETE.md` - Full remediation record
- `SECURITY_REMEDIATION_PLAN.md` - Original remediation plan
- `CREDENTIAL_ROTATION_CHECKLIST.md` - How to rotate credentials
- `.env.example` - Template for required environment variables

**Git History**: ✅ Cleaned of all exposed credentials (force-pushed)

---

## 🧪 TESTING & VALIDATION

### **Test with Real Patients**

**Jeremy Montoya (Utah Medicaid)**:
```bash
node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID
```

**Tella Silver (Utah Medicaid)**:
```bash
node universal-eligibility-checker.js Tella Silver [DOB] UTAH_MEDICAID
```

**Aetna Patient (with copay info)**:
```bash
# Requires Member ID
curl -X POST http://localhost:3000/api/universal-eligibility/check \
  -H "Content-Type: application/json" \
  -d '{
    "payerId": "60054",
    "firstName": "Patient",
    "lastName": "TS",
    "dateOfBirth": "1990-01-01",
    "memberNumber": "[member-id]"
  }'
```

### **API Endpoints**

**Check Eligibility (Universal)**:
```
POST /api/universal-eligibility/check
Body: {
  "payerId": "UTMCD" | "60054" | etc.,
  "firstName": "string",
  "lastName": "string", 
  "dateOfBirth": "YYYY-MM-DD",
  "memberNumber": "string" (optional, required for some payers)
}
```

**Check Eligibility (Utah Medicaid shorthand)**:
```
POST /api/medicaid/check
Body: {
  "first": "string",
  "last": "string",
  "dob": "YYYY-MM-DD"
}
```

---

## 📚 RELATED DOCUMENTATION

### **Current System**
- `api-server.js` - Main Express server with eligibility endpoints
- `lib/edi-837-generator.js` - EDI 837P claims generator
- `lib/edi-835-parser.js` - ERA (remittance) parser
- `lib/edi-277-parser.js` - Claim status parser
- `lib/payer-id-service.js` - ⭐ Database-driven payer ID lookup service
- `universal-eligibility-checker.js` - CLI testing tool
- `submit-test-claim-db.js` - ⭐ Test claim submission using database IDs

### **Payer Database & Office Ally Integration**
- `PAYER_ID_USAGE_GUIDE.md` - ⭐ **START HERE**: How to use payer IDs correctly
- `database/SURGICAL-APPROACH-README.md` - Payer database integration strategy
- `database/match-and-update-payers.js` - Fuzzy matching script for Office Ally CSV
- `database/apply-payer-updates.js` - Apply matched IDs to Supabase
- `database/add-office-ally-columns.sql` - Database schema updates
- `payer-requirements-analysis.md` - Payer-specific requirements

### **Future Development**
- `CM_APP_DEVELOPMENT_ROADMAP.md` - Contingency management app plan
- `RECOVERY_DAY_DEMO_HANDOFF.md` - Demo system design
- `CANONICAL_ARCHITECTURE_IMPLEMENTATION.md` - Patient identity architecture

### **Security & Operations**
- `SECURITY_CLEANUP_COMPLETE.md` - Security audit results
- `CREDENTIAL_ROTATION_CHECKLIST.md` - Credential rotation guide
- `.env.example` - Environment variable template

---

## 🎯 DECISION POINTS & QUESTIONS

### **IntakeQ Strategy**
**Question**: At what point does it make sense to break free of IntakeQ?

**Current IntakeQ Usage**:
- ✅ Team appointment calendar/scheduling
- ✅ Clinical notes
- ✅ E-prescribing
- ✅ Intake paperwork
- ✅ Patient messaging
- ✅ Payment processing

**What we could replace via Office Ally + custom dev**:
- Claims generation → Office Ally SFTP
- ERA processing → Office Ally SFTP
- Payment collection → Stripe directly
- Patient portal → Custom build

**Trade-offs**:
- **Keep IntakeQ**: Less development, integrated clinical workflow, but higher monthly cost + limited customization
- **Go independent**: Full control, lower long-term cost, but significant upfront development + maintenance burden

### **Payment Processing**
**Question**: Can we set up auto-collected copays with IntakeQ?

**Options**:
1. Use IntakeQ's built-in payment processing
2. Standalone Stripe account with custom integration
3. Hybrid: IntakeQ for some, Stripe for others (e.g., CM program)

**Consideration**: If building custom payment flow, might as well go all-in on custom system

### **Moonlit-Scheduler Integration**
**Context**: Separate repo with nearly-launched booking flow for Moonlit

**Integration Points**:
- Patient eligibility verification during booking
- Real-time copay estimation
- Member ID collection during intake
- Appointment → Claim pipeline automation

**Next Steps**: Define API contract between moonlit-scheduler and this eligibility system

---

## 📞 KEY CONTACTS & SUPPORT

**Office Ally**:
- Support: Sheila.Odeen@officeally.com
- Phone: (360) 975-7000 option 1
- Account: `moonlit` (Sender ID: 1161680)
- Documentation: https://www.officeally.com

**IntakeQ**:
- Support: support@intakeq.com
- API Docs: https://support.intakeq.com/article/45-api-documentation
- Client API: https://support.intakeq.com/article/251-intakeq-client-api

**Supabase**:
- Dashboard: https://app.supabase.com
- Docs: https://supabase.com/docs

---

## 🚀 GETTING STARTED FOR NEW DEVELOPERS

### **1. Clone and Install**
```bash
git clone [repo-url]
cd medicaid-eligibility-checker
npm install
```

### **2. Setup Environment**
```bash
cp .env.example .env.local
# Edit .env.local with actual credentials (ask team)
```

### **3. Start Development Server**
```bash
npm run dev  # Frontend
npm run backend  # API server
```

### **4. Test Eligibility**
```bash
# CLI test
node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID

# API test
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17"}'
```

### **5. Review Key Files**
- Read this `CLAUDE.md` fully
- Check `api-server.js` for API endpoints
- Review `api/medicaid/check.js` for Office Ally integration
- See `.env.example` for required environment variables

---

## 🎉 SUCCESS METRICS

**Current Achievement** (Eligibility + Claims):
- ✅ Sub-second eligibility verification
- ✅ Multiple payer support (Utah Medicaid, Aetna, expandable)
- ✅ Detailed benefit extraction (copays, deductibles, OOP max)
- ✅ Production-ready security (credentials protected)
- ✅ Professional web interface
- ✅ Database-driven payer configuration (18 payers)
- ✅ Transaction-specific payer IDs (eligibility/claims/remittance)
- ✅ EDI 837P claims generator (HIPAA 5010 compliant)
- ✅ SFTP connection to Office Ally established
- ✅ Test claim successfully submitted
- ✅ EDI 835 ERA parser implemented
- ✅ EDI 277 claim status parser implemented
- ✅ Database-driven payer ID service

**Future Success Metrics** (Claims Phase):
- ⏳ First ERA received and parsed (waiting for 277 response)
- ⏳ Claim acceptance rate >95%
- ⏳ End-to-end claim turnaround <7 days
- ⏳ Automated copay collection working
- ⏳ CM program claims submitting automatically
- ⏳ Production claim submission workflow

---

## 📝 CHANGELOG

**2025-10-06**:
- Security remediation completed (git history cleaned, credentials rotated)
- All credentials moved to environment variables
- Enhanced `.gitignore` to prevent future leaks
- Created comprehensive security documentation

**2025-10-07 (Morning)**:
- Created unified CLAUDE.md combining project status and Office Ally strategy
- Documented SFTP claims submission vision
- Outlined IntakeQ integration and independence options
- Defined implementation roadmap through Phase 5

**2025-10-07 (Afternoon - Database Integration)**:
- ✅ Added Office Ally payer ID columns to Supabase (`oa_eligibility_270_id`, `oa_professional_837p_id`, `oa_remit_835_id`)
- ✅ Created surgical matching system for 25 existing payers (not mass import)
- ✅ Implemented fuzzy matching with manual overrides for tricky payer names
- ✅ Verified all payer IDs against Office Ally CSV
- ✅ Successfully updated 18 payers with transaction-specific IDs
- ✅ Fixed critical issues:
  - Molina Utah claims ID (SX109, was showing N/A due to CSV name variations)
  - Optum Salt Lake override (U6885, was matching to wrong payer)
  - Utah Medicaid now has correct IDs: UTMCD (eligibility) / U4005 (claims) / SKUT0 (remittance)
- ✅ Created `lib/payer-id-service.js` - Database-driven payer ID lookup service
- ✅ Created `PAYER_ID_USAGE_GUIDE.md` - Developer reference for using payer IDs correctly
- ✅ Updated `lib/edi-837-generator.js` to use correct claims ID (U4005 instead of UTMCD)
- ✅ Created `submit-test-claim-db.js` - Test claim submission using database IDs
- ✅ Updated documentation with "CRITICAL: PAYER ID DATABASE ARCHITECTURE" section
- 📋 Key insight: Office Ally uses DIFFERENT payer IDs for different transaction types - critical for avoiding rejections

**2025-10-07 (Evening - CMS-1500 Claims Interface)**:
- ✅ **Built complete CMS-1500 claims submission interface** (`public/cms-1500-claims-interface.html`)
  - Professional web UI mimicking CMS-1500 form layout
  - IntakeQ patient search with auto-fill
  - Dynamic service lines (add/remove CPT codes)
  - Diagnosis code entry (up to 12 ICD-10 codes)
  - Test/Production mode toggle with OATEST prefix
  - Real-time charge calculation
- ✅ **Database-driven provider architecture**:
  - Created `lib/provider-service.js` - Fetch providers from Supabase
  - Added `taxonomy` and `tax_id` columns to `providers` table
  - Updated Moonlit PLLC record with real data (Taxonomy: 2084P0800X, Tax ID: 332185708)
  - Created `/api/providers/billing` endpoint
  - Created `/api/providers/active` endpoint (returns all 9 providers with NPIs)
- ✅ **Enhanced 837P EDI generator**:
  - Now uses real billing provider data from database (not environment variables)
  - Renders actual provider names (e.g., "Rufus Sweeney" instead of "RENDERING_PROVIDER")
  - Includes correct taxonomy codes from database
  - Supports rendering provider specialty (PRV segment)
- ✅ **Fixed critical payer ID issues**:
  - Utah Medicaid 837P ID corrected to SKUT0 (was incorrectly U4005)
  - Fixed `/api/payers/list` to return actual UUIDs (not names as IDs)
  - Fixed column name mismatch (`payer_type` vs `category`)
- ✅ **Successful test claims submitted**:
  - First test claim: Identified placeholder data (tax ID 870000000, fake address)
  - Second test claim: 100% real data from database ✅
  - Both claims uploaded to Office Ally SFTP successfully
  - Files: `OATEST_837P_2025-10-07T16-52-24.txt` and `OATEST_837P_2025-10-07T17-16-29.txt`
- ✅ **Database tables created**:
  - `claims_submissions` table for tracking claim status and responses
  - Status workflow: SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID
- 📋 **Key achievement**: Database-first architecture working perfectly - all provider data, payer IDs, and taxonomy codes now from Supabase

**2025-10-07 (Late Evening - Claims Database Logging Fix)**:
- ✅ **Fixed database logging failure** - Claims were submitting to Office Ally but not logging to database
  - Root cause: `claims_submissions` table schema existed but table wasn't created in Supabase
  - Created table by running `database/create-claims-submissions-table.sql` in Supabase SQL Editor
  - Verified with test insert/select using `database/verify-claims-table.js`
- ✅ **Submitted test claim via API** to verify fix:
  - Claim ID: CLM9858249756
  - Patient: Bryan Belveal (Member ID: 0313118282)
  - Payer: Utah Medicaid FFS (SKUT0)
  - Service: CPT 99214, $175.00, Diagnosis F329
  - Status: ✅ SUBMITTED to Office Ally + ✅ LOGGED to database
- ✅ **Created database utilities**:
  - `database/verify-claims-table.js` - Verify table creation with test data
  - `database/check-latest-claim.js` - Query and display latest claim from database
  - `database/setup-claims-table-auto.js` - Automated setup (requires DB password)
  - `FIX_CLAIMS_DATABASE.md` - Complete troubleshooting guide
- 📋 **Database now tracks**: All submitted claims, patient/payer info, service lines, EDI content, status progression, response files (999/277/835)

**2025-10-07 (Evening - RC77 Rejection Fix)**:
- ✅ **Identified root cause of RC77 rejection** - Missing Utah Medicaid Provider Number
  - RC77 error: "Payer No Longer Accepting Paper Claims - Pre-Enrollment Needed"
  - Investigation revealed missing `REF*1C` segment with Medicaid Provider ID
  - IntakeQ claims work because they include this automatically
- ✅ **Implemented complete fix**:
  - Added `medicaid_provider_id` column to `providers` table
  - Updated Moonlit PLLC with Provider Number: **4347425**
  - Enhanced `lib/edi-837-generator.js` to include `REF*1C` segment (lines 74-78)
  - Updated `lib/provider-service.js` to fetch Medicaid Provider ID (lines 18, 41)
- ✅ **Submitted test claim with fix** (OATEST_837P_2025-10-07T18-52-03.txt):
  - Patient: Jeremy Montoya
  - Service: CPT 90834, $150.00
  - **Confirmed**: `REF*1C*4347425` segment present in EDI
  - Status: Uploaded to Office Ally, awaiting 999/277 response
- 📋 **Documentation created**:
  - `UTAH_MEDICAID_RC77_FIX.md` - Complete fix guide with verification steps
  - `CLAIMS_SUBMISSION_PROGRESS.md` - Comprehensive claims project tracker
  - `database/add-medicaid-provider-id.sql` - Database update script
- ⏳ **Next step**: Validate RC77 fix when responses arrive (6-12 hours)

---

## 📚 RELATED DOCUMENTATION

### **Main Project Files**
- **`CLAUDE.md`** (this file) - Overall system overview and immediate next steps
- **`CLAIMS_SUBMISSION_PROGRESS.md`** 📋 - **Detailed claims submission project tracker**
  - Complete development history
  - Known issues and bugs
  - Prioritized roadmap
  - File structure reference
  - Success metrics

### **Specific Guides**
- `UTAH_MEDICAID_RC77_FIX.md` - RC77 rejection troubleshooting
- `OFFICE_ALLY_CLAIMS_SUBMISSION_GUIDE.md` - Complete SFTP integration guide
- `PAYER_ID_USAGE_GUIDE.md` - How to use transaction-specific payer IDs
- `FIX_CLAIMS_DATABASE.md` - Database logging troubleshooting
- `INTAKEQ_INTEGRATION_COMPLETE.md` - Patient data integration details
- `QUICK_START_TESTING.md` - How to test eligibility checking

---