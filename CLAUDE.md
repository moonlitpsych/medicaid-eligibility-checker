# CLAUDE.md - Medicaid Eligibility & Claims System

**Last Updated**: 2025-11-05 (React Eligibility Checker + Validation Complete)
**Status**:
- ✅ **React Eligibility Checker**: Dynamic form fields, member ID validation, expired coverage detection
- ✅ **Eligibility Checking**: Production-ready (Utah Medicaid, Aetna, HMHI-BHN, First Health working)
- 🟡 **Claims Submission**: RC77 fix applied, awaiting validation
- ✅ **First Health Network**: Configuration fixed - API successfully querying payer

---

## 🎯 HIGH PRIORITY ROADMAP

### **1. Fix Patient Search - Allow Full Name Queries** 🔴

**Problem**: Patient search currently only works with partial names or single names (first OR last). Searching "Austin Schneider" returns no results, but "Austin" or "Schneider" work fine.

**Location**: `/lib/intakeq-service.js` - `getCachedIntakeQClients()` function (lines 200-240)

**Current Implementation**:
```javascript
if (search) {
    // Search by name
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
}
```

**The Issue**: This searches for the ENTIRE search string in first_name OR last_name, not for individual words across both fields.

**Required Fix**: Split the search query by spaces and search for each word independently across both first_name and last_name fields. Handle multiple combinations:
- "Austin" → Match first_name='Austin'
- "Schneider" → Match last_name='Schneider'
- "Austin Schneider" → Match first_name='Austin' AND last_name='Schneider'
- "Schneider Austin" → Match first_name='Austin' AND last_name='Schneider' (reverse order)
- "Aust Schne" → Match first_name LIKE 'Aust%' AND last_name LIKE 'Schne%'

**Suggested Approach**:
```javascript
if (search) {
    const searchTerms = search.trim().split(/\s+/); // Split by whitespace

    if (searchTerms.length === 1) {
        // Single word: search in either field
        query = query.or(`first_name.ilike.%${searchTerms[0]}%,last_name.ilike.%${searchTerms[0]}%`);
    } else {
        // Multiple words: try combinations
        // Option 1: first word = first name, second word = last name
        // Option 2: first word = last name, second word = first name
        // Option 3: all words in either field (fallback)

        const filters = [];
        filters.push(`first_name.ilike.%${searchTerms[0]}%,last_name.ilike.%${searchTerms[1]}%`);
        filters.push(`first_name.ilike.%${searchTerms[1]}%,last_name.ilike.%${searchTerms[0]}%`);

        query = query.or(filters.join(','));
    }
}
```

**Alternative Approach** (more flexible but complex):
Use Postgres full-text search with `tsquery` for natural language searching across concatenated first_name + last_name.

**Testing**:
- Test "Austin Schneider" → Should find Austin
- Test "Schneider Austin" → Should find Austin
- Test "Aust Schne" → Should find Austin
- Test "Austin" → Should still work
- Test "Schneider" → Should still work

**Files to Update**:
- `/lib/intakeq-service.js` - Update `getCachedIntakeQClients()` function

---

### **2. Comprehensive X12 271 Response Parsing & Patient Data Enrichment** 🔴🔴

**Problem**: We're only extracting a minimal subset of data from X12 271 responses (phone, medicaidId, gender, address). The 271 response contains much more valuable data that should be:
1. Stored in Supabase `intakeq_clients` table
2. Used to validate/correct IntakeQ patient data
3. Displayed to users for verification

**Current State**:
- **Parser Location**: `database-driven-eligibility-service.js` - `parseX12_271ForAutoPopulation()` function (lines 502-640)
- **Currently Extracted**: phone, medicaidId, gender, address, memberIdValidation, coveragePeriod
- **Database Schema**: `intakeq_clients` table in Supabase

**Required Analysis**:
The next Claude session should:

1. **Collect Raw X12 271 Samples**
   - Query `eligibility_checks` table for recent X12 271 responses from different payers
   - Focus on: Utah Medicaid (UTMCD), Aetna (60054), Regence (00910), HMHI-BHN, First Health (INT-BENE-ADMIN)
   ```sql
   SELECT office_ally_payer_id, raw_x12_271_response, created_at
   FROM eligibility_checks
   WHERE raw_x12_271_response IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Analyze X12 271 Segment Patterns Across Payers**

   **Known Segments to Parse**:
   - **NM1\*IL** - Insured/Patient Name (currently parsed for member ID only)
   - **NM1\*PR** - Payer Name (we should store this)
   - **N3** - Address Line (currently parsed)
   - **N4** - City/State/ZIP (currently parsed)
   - **DMG** - Demographics (gender, DOB) - currently parsing gender, should also parse DOB
   - **DTP\*291** - Coverage period (currently parsed)
   - **DTP\*307** - Coverage effective date
   - **DTP\*472** - Service date (date of inquiry)
   - **DTP\*356** - Eligibility begin date
   - **REF\*18** - Patient Account Number
   - **REF\*1L** - Group Number
   - **REF\*SY** - SSN (if provided)
   - **PER** - Contact Information (phone numbers, email?) - currently parsing phone
   - **EB** - Eligibility/Benefit Information (plan details, copays, deductibles)
   - **HSD** - Health Care Services Delivery (service type codes, limitations)
   - **MSG** - Messages (payer notes, instructions)
   - **LS\*2120 / NM1\*PR** - Managed Care Organization details

   **Potentially Available But Unexplored**:
   - Email address (might be in PER segment)
   - Subscriber name (if patient is dependent)
   - Subscriber relationship code
   - Prior authorization requirements
   - Network restrictions
   - Plan limitations/exclusions
   - Service-specific copay/coinsurance details
   - Coordination of benefits (COB) information

3. **Map X12 271 Data to Supabase Schema**

   **Current `intakeq_clients` table fields**:
   - id (uuid)
   - intakeq_client_id (text)
   - first_name, last_name (text)
   - date_of_birth (date)
   - email, phone (text)
   - street_address, city, state, zip_code (text)
   - primary_insurance_name (text)
   - primary_insurance_policy_number (text)
   - last_synced_at (timestamp)

   **Proposed New Fields** (add these based on what X12 271 contains):
   - `verified_phone` (text) - Phone from payer (more reliable than IntakeQ)
   - `verified_address_street`, `verified_address_city`, `verified_address_state`, `verified_address_zip` (text) - Address from payer
   - `verified_dob` (date) - DOB from payer (can compare to IntakeQ DOB)
   - `verified_gender` (text) - Gender from payer
   - `current_payer_name` (text) - Payer name from most recent eligibility check
   - `current_member_id` (text) - Current member ID from payer
   - `current_coverage_start_date`, `current_coverage_end_date` (date) - Coverage period
   - `subscriber_name` (text) - If patient is dependent
   - `subscriber_relationship` (text) - Relationship to subscriber
   - `last_eligibility_check` (timestamp) - When we last verified coverage
   - `eligibility_status` (text) - ACTIVE, EXPIRED, UNKNOWN
   - `managed_care_org` (text) - MCO name if applicable

4. **Create Data Validation & Comparison Logic**

   Compare X12 271 data with IntakeQ data and flag discrepancies:
   - DOB mismatch
   - Name spelling differences
   - Address differences
   - Phone number differences
   - Gender differences

   Store validation results in a new field: `data_quality_issues` (jsonb) containing:
   ```json
   {
     "dob_mismatch": {
       "intakeq_value": "1991-08-08",
       "payer_value": "1991-08-09",
       "severity": "CRITICAL"
     },
     "address_mismatch": {
       "intakeq_value": "123 Main St",
       "payer_value": "735 W 12278 S",
       "severity": "WARNING"
     }
   }
   ```

5. **Update UI to Display Validated Data**

   In `ResultsDisplay.jsx`, add a "Patient Data Verification" section showing:
   - ✅ Data that matches between IntakeQ and payer
   - ⚠️ Data that differs (with both values shown)
   - 📝 Data only available from payer (not in IntakeQ)

   Allow users to:
   - Click "Use Payer Data" to update IntakeQ fields
   - Mark discrepancies as "Reviewed"
   - Add notes about why data differs

6. **Create X12 271 Parsing Test Suite**

   Create `/tests/x12-271-parser-tests.js` with test cases for:
   - Each payer's response format
   - Different coverage scenarios (active, expired, COB)
   - Different patient types (subscriber, dependent)
   - Edge cases (missing fields, unusual formats)

**Expected Outcomes**:
- Comprehensive X12 271 parsing extracting ALL available data
- Supabase patient records automatically enriched with payer-verified data
- Data quality validation highlighting discrepancies
- UI displaying verification status and allowing corrections
- Reduced data entry errors by using payer data as source of truth

**Success Metrics**:
- 100% of X12 271 segments documented and parsed
- 90%+ of patient records have verified payer data
- Data discrepancies flagged within 24 hours of discovery
- Users can see "Verified by Payer" indicators on patient data

**Code References**:
- Parser: `database-driven-eligibility-service.js:502-640`
- Database: Supabase `intakeq_clients` table
- UI: `public/react-eligibility/src/components/ResultsDisplay.jsx`
- X12 Documentation: `/lib/x12-271-cob-parser.js` (has examples of COB parsing)

**Warning**: Be careful not to overwrite good IntakeQ data with incorrect payer data. Always show both values and let users confirm updates.

---

## ✅ RESOLVED: First Health Network Eligibility Configuration

### **The Problem (RESOLVED)**

**Patient**: Nicholas Smith
**Insurance**: American Life Insurance Co. via International Benefits Administrators (First Health Network)
**Member ID**: AFLMFEA684623879
**DOB**: 03/26/2004
**Effective Date**: 01/01/2025

**Original Symptom**: Eligibility check returns "Payer not configured: INT-BENE-ADMIN"
**Status**: ✅ **Configuration FIXED** - See FIRST_HEALTH_FIX_COMPLETE.md for details

### **What We've Verified**

✅ **Correct Office Ally Payer ID**: INT-BENE-ADMIN (confirmed via test)
✅ **Payer added to `payers` table**:
```sql
SELECT * FROM payers WHERE name = 'International Benefits Administrators (First Health Network)';
-- Returns: id = f8acacd5-8e2e-46fa-962d-b52c3c09f284, oa_eligibility_270_id = 'INT-BENE-ADMIN'
```

✅ **Payer added to `payer_office_ally_configs` table**:
```sql
SELECT * FROM payer_office_ally_configs
WHERE office_ally_payer_id = 'INT-BENE-ADMIN';
-- Returns: office_ally_payer_id = 'INT-BENE-ADMIN', payer_display_name = 'International Benefits Administrators (First Health Network)'
```

✅ **Anthony Privratsky configured as preferred provider**:
```sql
SELECT * FROM v_provider_office_ally_configs WHERE provider_npi = '1336726843';
-- Returns: is_preferred_for_payers = ["INT-BENE-ADMIN"], supported_office_ally_payer_ids = ["INT-BENE-ADMIN","UTMCD","60054"]
```

❌ **VIEW not returning payer config**:
```sql
SELECT * FROM v_office_ally_eligibility_configs WHERE office_ally_payer_id = 'INT-BENE-ADMIN';
-- Returns: NO ROWS (this is the issue!)
```

### **Root Cause**

The eligibility service queries `v_office_ally_eligibility_configs` VIEW to get payer configuration. This VIEW is returning NO ROWS for INT-BENE-ADMIN, even though the underlying `payer_office_ally_configs` table has the data.

**Code reference**: `database-driven-eligibility-service.js` lines 72-102
```javascript
async function getPayerConfig(officeAllyPayerId) {
    const { data: config, error } = await supabase
        .from('v_office_ally_eligibility_configs')  // ← This VIEW is the problem
        .select('*')
        .eq('office_ally_payer_id', officeAllyPayerId)
        .single();
    // ...
}
```

### **The Disconnect**

We've been adding data to `payer_office_ally_configs` table, but the VIEW `v_office_ally_eligibility_configs` appears to query a DIFFERENT table or has incompatible JOIN conditions.

**Hypothesis**: The VIEW was designed for a different table structure (possibly an older `office_ally_eligibility_configs` table mentioned in early documentation).

### **Why This Matters**

- **Moonlit is IN-NETWORK with First Health**: Verified on FirstHealthLBP.com - Anthony Privratsky shows as in-network provider
- **Patient has active coverage**: Effective date 01/01/2025
- **This is a real patient** trying to book appointments
- **This pattern will repeat**: Other First Health Network patients will have same issue

### **What Next Claude Code Should Do**

1. **Investigate the VIEW definition**:
   ```sql
   SELECT pg_get_viewdef('v_office_ally_eligibility_configs', true);
   ```
   This will show what table(s) the VIEW actually queries.

2. **Identify the mismatch**: Compare VIEW definition to what tables we've been populating.

3. **Choose a fix**:
   - **Option A**: Rebuild the VIEW to query `payer_office_ally_configs` table
   - **Option B**: Populate the table the VIEW is actually querying
   - **Option C**: Change `database-driven-eligibility-service.js` to query `payer_office_ally_configs` directly instead of the VIEW

4. **Test Nicholas Smith** with corrected configuration.

5. **Verify provider NPI selection**: Ensure the system uses Anthony Privratsky's NPI (1336726843) for First Health, not Travis Norseth's NPI.

### **Test Files Created**

- `/Users/macsweeney/medicaid-eligibility-checker/test-nicholas-smith.js` - Automated test for Nicholas
- `/tmp/nicholas-271.txt` - Raw X12 271 responses from testing

### **SQL Scripts Created**

- `/tmp/add-int-bene-admin-minimal.sql` - Add to payers table
- `/tmp/configure-anthony-for-first-health-with-npi.sql` - Configure Anthony as preferred provider
- `/tmp/restore-int-bene-admin.sql` - Restore correct payer ID after testing

---

## 🎯 OTHER IMMEDIATE PRIORITIES

### **1. Validate RC77 Fix** (Claims Submission)

**Context**: Fixed Utah Medicaid RC77 rejection by adding Provider ID 4347425

**Next Steps**:
1. Check Office Ally SFTP `/outbound/` folder for 277 response
2. Look for "Acknowledged" (success) vs "RC77" (still failing)
3. See `UTAH_MEDICAID_RC77_FIX.md` for full details

### **2. UUHP Eligibility Configuration**

**Issue**: UUHP returns "Payer not configured: UNIV-UTHP"
**Fix**: Same issue as First Health - need to add to the correct table/view

---

## 📋 PROJECT OVERVIEW

### **What This System Does**

1. **Real-Time Eligibility Verification** ✅
   - Office Ally X12 270/271 integration
   - Sub-second responses for Utah Medicaid, Aetna, commercial payers
   - Copay/deductible extraction from X12 271 responses
   - Patient cost estimation
   - IntakeQ patient integration

2. **Direct Claims Submission** 🟡
   - EDI 837P claims generator
   - Office Ally SFTP integration
   - CMS-1500 web interface
   - Database-driven payer/provider data

### **Key Components**

- **API Server**: `api-server.js` (runs on port 3000)
- **Eligibility Service**: `database-driven-eligibility-service.js`
- **Web Interface**: `/public/universal-eligibility-interface.html`
- **Database**: Supabase PostgreSQL

### **Database Architecture**

**Payers**:
- `payers` table - Basic payer info, Office Ally IDs
- `payer_office_ally_configs` table - Office Ally specific configuration
- `v_office_ally_eligibility_configs` VIEW - ⚠️ May not align with tables above

**Providers**:
- `providers` table - Basic provider info (NPI, name, etc.)
- `provider_office_ally_configs` table - Office Ally specific config, preferred payers
- `v_provider_office_ally_configs` VIEW - Used to select provider based on payer

**Patients**:
- `intakeq_clients` table - Cached patient data from IntakeQ

**Claims**:
- `claims_submissions` table - Tracks all submitted claims, responses, status

---

## 🔧 RECENT ENHANCEMENTS (2025-10-07)

### **✅ Enhanced Aetna Copay Parsing**

**Fixed**: Eleanor Hopkins (Aetna patient) was showing null copays despite service type codes

**Root Cause**: Two parsing bugs in `lib/x12-271-financial-parser.js`:
1. Amount position - Aetna uses position 7, parser only checked position 6
2. Eligibility code - Aetna uses `EB*B`, parser only checked insurance plan field

**Result**: Eleanor now shows PCP $20, Specialist $40, Urgent Care $50 correctly

**Commit**: f5affea

### **✅ Added Service Type Codes to X12 270 Requests**

**Enhancement**: Request multiple service types for detailed copay information

**Changes**:
- Added `EQ*30` (Health Benefit Plan Coverage - general)
- Added `EQ*98` (Professional Physician Visit - Office)
- Added `EQ*A8` (Psychiatric - Outpatient)

**Files Updated**:
- `api-universal-eligibility.js`
- `database-driven-eligibility-service.js`

### **✅ Patient Cost Estimator**

**Feature**: Shows estimated patient responsibility for common services

**Files**:
- `lib/moonlit-fee-schedule.js`
- `lib/patient-cost-estimator.js`

---

## 🚀 QUICK START

### **Start API Server**
```bash
node api-server.js
# Server runs on http://localhost:3000
```

### **Test Eligibility (Working Examples)**

**Utah Medicaid FFS** (works):
```bash
# Jeremy Montoya
curl -X POST http://localhost:3000/api/database-eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jeremy","lastName":"Montoya","dateOfBirth":"1984-07-17","payerId":"UTMCD"}'
```

**Aetna** (works):
```bash
# Eleanor Hopkins
curl -X POST http://localhost:3000/api/database-eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Eleanor","lastName":"Hopkins","dateOfBirth":"1983-05-15","memberNumber":"W12345678","payerId":"60054"}'
```

**First Health Network** (NOT working - see issue above):
```bash
node test-nicholas-smith.js
```

### **Web Interface**
```
http://localhost:3000/public/universal-eligibility-interface.html
```

---

## 📚 KEY DOCUMENTATION FILES

### **Immediate Issues**
- This file (`CLAUDE.md`) - Current status and First Health Network issue
- `UTAH_MEDICAID_RC77_FIX.md` - Claims submission RC77 rejection fix

### **Project Guides**
- `CLAIMS_SUBMISSION_PROGRESS.md` - Detailed claims project tracker
- `OFFICE_ALLY_CLAIMS_SUBMISSION_GUIDE.md` - Complete SFTP integration guide
- `PAYER_ID_USAGE_GUIDE.md` - How to use transaction-specific payer IDs
- `INTAKEQ_INTEGRATION_COMPLETE.md` - Patient data integration details

### **Security**
- `SECURITY_CLEANUP_COMPLETE.md` - Security audit results
- `.env.local` - Credentials (NOT in git)

---

## 🔐 ENVIRONMENT SETUP

Required environment variables in `.env.local`:

```bash
# Office Ally Real-time API
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc
OFFICE_ALLY_USERNAME=moonlit
OFFICE_ALLY_PASSWORD=[redacted]
OFFICE_ALLY_SENDER_ID=1161680
OFFICE_ALLY_PROVIDER_NPI=1275348807

# Office Ally SFTP (claims)
OFFICE_ALLY_SFTP_HOST=ftp10.officeally.com
OFFICE_ALLY_SFTP_USERNAME=moonlit
OFFICE_ALLY_SFTP_PASSWORD=[redacted]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=[redacted]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[redacted]
SUPABASE_SERVICE_KEY=[redacted]

# IntakeQ
INTAKEQ_API_KEY=[redacted]
```

---

## 📞 SUPPORT CONTACTS

**Office Ally**:
- Support: Sheila.Odeen@officeally.com
- Phone: (360) 975-7000 option 1
- Account: `moonlit` (Sender ID: 1161680)

**Utah Medicaid EDI Support**:
- Email: MHC-EDI@utah.gov

---

## 🎉 COMPLETED THIS SESSION (2025-11-05)

### **React-Based Dynamic Eligibility Checker**
**Status**: ✅ Production Ready

Built a complete React application (`/public/react-eligibility/`) replacing the static HTML interface with:

**Features Implemented**:
1. **Dynamic Form Fields** - Form fields automatically show/hide based on selected payer's X12 270 requirements
2. **Color-Coded Requirements** - Red (required), Yellow (recommended), Gray (optional) visual indicators
3. **IntakeQ Patient Search** - Auto-fill patient data from IntakeQ database with real-time search
4. **IntakeQ Database Sync** - Automatic sync of 100 patients on server startup + manual "🔄 Sync IntakeQ" button
5. **Payer Configuration System** - Database-driven field requirements loaded from `/api/database-eligibility/payer/:payerId/config`
6. **Requirements Summary Panel** - Shows exactly which fields are needed after payer selection
7. **Smart Validation** - Handles flexible "OR" requirements (e.g., "DOB OR Medicaid ID")
8. **Graceful Fallback** - 1-hour localStorage caching, offline mode support

**Validation & Data Quality** (NEW):
1. **Member ID Validation** ✅
   - Compares member ID sent vs. returned by payer
   - Detects when payer cross-references to different member ID
   - Example: Austin Schneider sent `0601626420` (Medicaid), Aetna returned `101892685000` (marketplace)
   - Code: `database-driven-eligibility-service.js:510-577`

2. **Coverage Date Validation** ✅
   - Parses DTP\*291 segments to extract coverage start/end dates
   - Compares end date against current date to detect expired coverage
   - Overrides `enrolled: true` to `enrolled: false` if coverage has expired
   - Calculates expiration duration (e.g., "1 year and 7 months ago")
   - Example: Austin's Aetna coverage expired April 1, 2024 (1.5 years ago)
   - Code: `database-driven-eligibility-service.js:586-640`, `database-driven-api-routes.js:243-249`

3. **Warning System** ✅
   - Two severity levels: CRITICAL (red) and WARNING (yellow)
   - Displayed prominently before all other results
   - Shows both sent and returned values for comparison
   - Types: MEMBER_ID_MISMATCH, COVERAGE_EXPIRED, NO_MEMBER_ID_RETURNED

4. **Coverage Period Display** ✅
   - Shows coverage dates with color-coded indicators (green=active, red=expired)
   - Example: "1/1/2024 - 4/1/2024 [ EXPIRED ]"
   - Code: `ResultsDisplay.jsx:77-138`

**Technical Stack**:
- React 18 + Vite 6 (dev server on port 5174)
- Tailwind CSS for styling
- Custom hooks: `usePayerConfig`, `useIntakeQSearch`, `useEligibilityCheck`
- Production build served at `/eligibility` endpoint
- API proxy in vite.config.js for `/api/*` requests

**Files Created/Modified**:
- `/public/react-eligibility/` - Complete React app structure
- `/database-driven-eligibility-service.js:502-640` - Enhanced X12 271 parsing with validation
- `/database-driven-api-routes.js:243-249` - Coverage expiration override logic
- `/public/react-eligibility/src/components/ResultsDisplay.jsx` - Warning and coverage period UI
- `/api-server.js:1080-1089` - Automatic IntakeQ sync on startup

**Test Cases Verified**:
- ✅ Austin Schneider + Aetna → Member ID mismatch + Expired coverage detected
- ✅ IntakeQ sync → 100 patients synced successfully
- ✅ Patient search → Auto-fill from database (snake_case fields)
- ✅ Dynamic fields → Payer-specific requirements displayed correctly

---

## ✅ WHAT'S WORKING

- ✅ **React Eligibility Checker** - Dynamic forms, validation, warnings (NEW)
- ✅ **Member ID Validation** - Detects mismatches between sent/returned IDs (NEW)
- ✅ **Coverage Date Validation** - Detects expired coverage (NEW)
- ✅ **IntakeQ Database Sync** - Automatic + manual sync (NEW)
- ✅ Utah Medicaid FFS eligibility (Jeremy Montoya, Tella Silver, Bryan Belveal)
- ✅ Aetna eligibility with copay details (Eleanor Hopkins)
- ✅ HMHI-BHN (Hayden-Moore Health Innovations) eligibility
- ✅ IntakeQ patient search and auto-fill
- ✅ Patient cost estimation for Medicaid patients
- ✅ Copay/deductible extraction from X12 271
- ✅ Claims submission to Office Ally SFTP
- ✅ Database logging of claims

## ⚠️ NEEDS FIXING

- 🔴 **Patient Search Full Name** - "Austin Schneider" doesn't work, only "Austin" or "Schneider" (see HIGH PRIORITY ROADMAP #1)
- 🔴 **X12 271 Comprehensive Parsing** - Only extracting minimal data (see HIGH PRIORITY ROADMAP #2)
- 🟡 **UUHP eligibility** - VIEW configuration issue
- 🟡 **RC77 claims rejection** - Awaiting validation of fix
- ⚠️ **Provider NPI selection** - May not be using correct provider per payer

---

**For the next Claude Code session**:
1. **HIGH PRIORITY**: Fix patient search to allow full name queries (see roadmap item #1 above)
2. **HIGH PRIORITY**: Comprehensive X12 271 parsing and patient data enrichment (see roadmap item #2 above)
