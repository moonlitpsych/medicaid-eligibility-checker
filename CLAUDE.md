# CLAUDE.md - Medicaid Eligibility & Claims System

**Last Updated**: 2025-10-08 (Evening - Configuration Fix Complete)
**Status**:
- ✅ **Eligibility Checking**: Production-ready (Utah Medicaid, Aetna, HMHI-BHN, First Health working)
- 🟡 **Claims Submission**: RC77 fix applied, awaiting validation
- ✅ **First Health Network**: Configuration fixed - API successfully querying payer

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

## ✅ WHAT'S WORKING

- ✅ Utah Medicaid FFS eligibility (Jeremy Montoya, Tella Silver, Bryan Belveal)
- ✅ Aetna eligibility with copay details (Eleanor Hopkins)
- ✅ HMHI-BHN (Hayden-Moore Health Innovations) eligibility
- ✅ IntakeQ patient search and auto-fill
- ✅ Patient cost estimation for Medicaid patients
- ✅ Copay/deductible extraction from X12 271
- ✅ Claims submission to Office Ally SFTP
- ✅ Database logging of claims

## ⚠️ NEEDS FIXING

- 🔴 **First Health Network eligibility** (Nicholas Smith) - VIEW configuration issue
- 🟡 **UUHP eligibility** - Same VIEW configuration issue
- 🟡 **RC77 claims rejection** - Awaiting validation of fix
- ⚠️ **Provider NPI selection** - May not be using correct provider per payer

---

**For the next Claude Code session**: Start with investigating `v_office_ally_eligibility_configs` VIEW definition and fixing the First Health Network configuration mismatch. This is blocking a real patient from getting care.
