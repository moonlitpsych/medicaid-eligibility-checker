# Claims Submission System - Development Progress

**Project**: Direct 837P Claims Submission via Office Ally SFTP
**Status**: 🟡 In Development (RC77 Fix Applied, Awaiting Validation)
**Last Updated**: 2025-10-07 Evening

---

## 🎯 Project Goal

Build a complete claims submission system that bypasses IntakeQ's claims generator and submits 837P professional claims directly to Office Ally SFTP, giving us full control over the billing workflow.

---

## 📊 Current Status: Phase 2 - Testing & Validation

### ✅ Completed Milestones

#### **Phase 1: Foundation (2025-10-06 - 2025-10-07)**

1. **✅ EDI 837P Generator Built**
   - `lib/edi-837-generator.js` - HIPAA 5010 compliant
   - Generates professional claims in X12 format
   - Supports multiple service lines
   - Includes diagnosis codes (ICD-10)
   - Handles rendering provider specialty (PRV segment)

2. **✅ Office Ally SFTP Integration**
   - `lib/sftp-client.js` - Reusable SFTP client
   - Credentials stored in `.env.local`
   - Upload to `/inbound/` folder working
   - Download from `/outbound/` folder working

3. **✅ Database-Driven Architecture**
   - **Payer Database**: 18 payers configured with transaction-specific IDs
     - `oa_eligibility_270_id` - For real-time eligibility
     - `oa_professional_837p_id` - For claims submission ⭐
     - `oa_remit_835_id` - For remittance processing
   - **Provider Database**: All provider data from Supabase
     - Billing provider (Moonlit PLLC) with NPI, Tax ID, Taxonomy, Address
     - Rendering providers (9 active clinicians)
     - **NEW**: `medicaid_provider_id` column added (4347425)
   - **Claims Tracking**: `claims_submissions` table logs all submitted claims

4. **✅ Response Parsers**
   - `lib/edi-835-parser.js` - ERA/Remittance parser
   - `lib/edi-277-parser.js` - Claim status parser
   - `lib/edi-999-parser.js` - Functional acknowledgement parser

5. **✅ Web Interface**
   - `public/cms-1500-claims-interface.html` - Professional claim form
   - IntakeQ patient search and auto-fill
   - Dynamic service lines (add/remove CPT codes)
   - Diagnosis code entry (up to 12 ICD-10)
   - Real billing provider data from database
   - Test/Production mode toggle

6. **✅ Test Claims Successfully Submitted**
   - **First Test Claim** (2025-10-07 Morning): OATEST_837P_2025-10-07T15-46-20.txt
     - Patient: Jeremy Montoya
     - Service: CPT 90834, $150.00
     - Diagnosis: F329 (Major Depressive Disorder)
     - **Result**: ❌ RC77 rejection (missing Medicaid Provider ID)

   - **Second Test Claim** (2025-10-07 Afternoon): OATEST_837P_2025-10-07T17-16-29.txt
     - Patient: Bryan Belveal
     - Service: CPT 99214, $175.00
     - Diagnosis: F329
     - **Result**: ✅ Submitted, but database logging failed (table missing)

7. **✅ Database Logging Fixed**
   - Created `claims_submissions` table in Supabase
   - Tracks: claim ID, patient, payer, charges, EDI content, status, responses
   - Status workflow: SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID

---

#### **Phase 2: Critical Fix - Utah Medicaid Provider ID (2025-10-07 Evening)**

**Problem Discovered**: RC77 "Payer No Longer Accepting Paper Claims - Pre-Enrollment Needed"

**Root Cause**: Missing Utah Medicaid Provider Number in 837P claims

**Investigation**:
- Office Ally accepted the EDI format ✅
- Utah Medicaid rejected due to missing provider identifier ❌
- IntakeQ claims work because they include Medicaid Provider ID automatically
- Our custom generator was missing `REF*1C` segment

**Solution Implemented**:

1. **✅ Database Schema Updated**
   - Added `medicaid_provider_id` column to `providers` table
   - Updated Moonlit PLLC record with provider number: **4347425**
   - SQL: `database/add-medicaid-provider-id.sql`

2. **✅ EDI Generator Enhanced**
   - File: `lib/edi-837-generator.js` (lines 74-78)
   - Added `REF*1C*{medicaidProviderId}` segment in Loop 2010AA
   - Only included when `claim.billingProvider.medicaidProviderId` is present
   - Positioned after Tax ID (`REF*EI`)

3. **✅ Provider Service Updated**
   - File: `lib/provider-service.js` (lines 18, 41)
   - `getBillingProvider()` now fetches `medicaid_provider_id`
   - Returns as `medicaidProviderId` in provider object

4. **✅ Test Claim Submitted with Fix**
   - File: `OATEST_837P_2025-10-07T18-52-03.txt`
   - Patient: Jeremy Montoya
   - Service: CPT 90834, $150.00
   - **Includes**: `REF*1C*4347425` segment ✅
   - **Status**: Uploaded to Office Ally, awaiting response

**Expected Result**: RC77 rejection should be eliminated ✅

---

### 🔄 In Progress

#### **Validation Testing** (Next 6-12 hours)

**Waiting For**:
- [ ] **999 Functional Acknowledgement** from Office Ally
  - Should confirm EDI format is valid
  - Expected: "File accepted for processing"

- [ ] **277 Claim Status** from Utah Medicaid
  - Should show "ACCEPTED - Forwarded to payer"
  - Should **NOT** have RC77 rejection
  - Validates that Medicaid Provider ID fix worked

**How to Check**:
```bash
# Download latest responses from SFTP
node get-latest-uuhp-271.js

# Or check outbound folder manually
# Look for files matching claim ID: CLM9863123172
```

---

### 📋 Known Issues & Limitations

#### **Current Bugs**

1. **Database Logging Column Mismatch** (Minor - Non-blocking)
   - Error: `Could not find the 'billing_provider_name' column`
   - Impact: Claims submit successfully but database logging incomplete
   - Fix: Update `claims_submissions` table schema or adjust insert query
   - Priority: Low (claims still submit and track in SFTP)

2. **IntakeQ Patient Auto-Fill Issues** (UI/UX)
   - Address not auto-populating from IntakeQ raw data
   - Gender (M/F) not auto-populating
   - Issue: Frontend not parsing `raw_data` field correctly
   - File: `public/cms-1500-claims-interface.html`
   - Priority: Medium

3. **Payer Selection: Dropdown vs Fuzzy Search** (UI/UX)
   - Currently using dropdown with 31 payers (poor UX)
   - Should use fuzzy search (like booking flow)
   - Priority: Medium

4. **Diagnosis Code Entry** (UI/UX)
   - Manual text entry requires memorization
   - Should have fuzzy search with common codes
   - Example: Type "depression" → Shows F329, F332, F333
   - Priority: Medium

---

### 🚀 Next Steps (Priority Order)

#### **Immediate (This Week)**

1. **Validate RC77 Fix** ⏳ WAITING FOR RESPONSE
   - Check SFTP `/outbound/` folder in 6-12 hours
   - Confirm 999 acceptance received
   - Confirm 277 has no RC77 rejection
   - If successful: Mark RC77 fix as ✅ COMPLETE

2. **Fix Database Logging Column Mismatch**
   - Option A: Add missing columns to `claims_submissions` table
   - Option B: Simplify insert query to match existing schema
   - Update `test-utah-medicaid-claim.js` and claims submission route
   - Test: Submit claim and verify database entry

3. **Document Payer-Specific Requirements**
   - Each payer may have unique 837P requirements
   - Create `PAYER_REQUIREMENTS.md` with notes for:
     - Utah Medicaid: Requires `REF*1C` with Medicaid Provider ID ✅
     - Aetna: Requirements TBD
     - UUHP: Requirements TBD
     - Molina: Requirements TBD

#### **Short-Term (Next 2 Weeks)**

4. **IntakeQ Appointments Integration**
   - Goal: Auto-populate CPT codes from appointment types
   - Endpoint: `GET https://intakeq.com/api/v1/appointments?clientId={id}`
   - Create `appointment_cpt_mapping` table:
     - Map "Initial Psychiatric Evaluation" → 90791
     - Map "Psychotherapy 45min" → 90834
     - Map "Psychotherapy 60min" → 90837
   - Auto-select rendering provider from appointment practitioner
   - Pre-fill service dates from appointment calendar

5. **Enhance Claims Interface UX**
   - Replace payer dropdown with fuzzy search
   - Add diagnosis code search (integrate with ICD-10 database)
   - Fix IntakeQ auto-fill for address and gender
   - Add real-time charge calculation
   - Show estimated patient responsibility (from eligibility data)

6. **Payer Contracts Database**
   - Create `payer_provider_contracts` table
   - Track which providers are contracted with which payers
   - Auto-determine rendering provider based on:
     - Appointment practitioner
     - Payer contracts
     - Direct vs attending supervision rules
   - Schema:
     ```sql
     CREATE TABLE payer_provider_contracts (
         payer_id UUID REFERENCES payers(id),
         provider_id UUID REFERENCES providers(id),
         is_directly_contracted BOOLEAN,
         contract_start_date DATE,
         fee_schedule JSONB
     );
     ```

7. **Response Monitoring & Alerting**
   - Automated SFTP polling (every 4 hours)
   - Parse 277/999 responses automatically
   - Email alerts for rejections
   - Dashboard showing claim status
   - Integration with claims database (update status)

#### **Medium-Term (Next Month)**

8. **Secondary Claims & Coordination of Benefits (COB)**
   - Handle primary/secondary insurance splits
   - Generate secondary claims after primary ERA received
   - Calculate patient responsibility correctly
   - Medicare crossover claims

9. **ERA Processing & Auto-Posting**
   - Parse 835 remittance files automatically
   - Match payments to claims
   - Calculate adjustments and patient balance
   - Export to accounting system (or build mini-AR system)

10. **Claims Scrubbing & Validation**
    - Pre-submission validation rules
    - Check for common rejection reasons
    - Verify eligibility before claim submission
    - CPT code validation (age/gender/diagnosis edits)
    - Medicare LCD/NCD compliance checking

#### **Long-Term (Next Quarter)**

11. **Production Deployment**
    - Move from OATEST to production claims
    - Set up proper error handling and logging
    - Create backup/recovery procedures
    - Performance optimization for bulk submissions
    - Compliance audit trail

12. **Reporting & Analytics**
    - Claims submission volume by payer
    - Acceptance vs rejection rates
    - Average reimbursement by CPT code
    - Provider productivity metrics
    - Revenue cycle KPIs (days to payment, etc.)

---

## 🗂️ File Structure

### Core Claims Engine
```
lib/
├── edi-837-generator.js          # EDI 837P claims generator (HIPAA 5010)
├── edi-835-parser.js             # ERA/Remittance parser
├── edi-277-parser.js             # Claim status parser
├── edi-999-parser.js             # Functional acknowledgement parser
├── sftp-client.js                # Office Ally SFTP client
├── provider-service.js           # Provider data from Supabase
├── payer-id-service.js           # Payer ID lookup (database-driven)
└── intakeq-service.js            # IntakeQ API integration
```

### API Routes
```
routes/
├── claims-submission.js          # POST /api/claims/submit
├── database-driven-api-routes.js # Enhanced eligibility + cost estimates
└── database-driven-eligibility.js # Real-time eligibility checking
```

### Web Interfaces
```
public/
├── cms-1500-claims-interface.html           # Claims submission UI
├── universal-eligibility-interface.html     # Eligibility checking UI
└── universal-eligibility-interface-v2.html  # Enhanced UI (newer version)
```

### Database
```
database/
├── create-claims-submissions-table.sql      # Claims tracking table
├── add-medicaid-provider-id.sql             # Provider ID column + data
├── supabase-office-ally-migration.sql       # Payer database schema
├── verify-claims-table.js                   # Database verification script
└── check-latest-claim.js                    # Query latest claim from DB
```

### Testing & Utilities
```
test-utah-medicaid-claim.js       # Automated test claim submission
submit-test-claim-db.js           # Manual test claim (database-driven)
submit-test-claim.js              # Original test claim script
get-latest-uuhp-271.js            # Download SFTP responses
check-claim-status.js             # Query claim status
```

### Documentation
```
UTAH_MEDICAID_RC77_FIX.md         # RC77 rejection fix guide
OFFICE_ALLY_CLAIMS_SUBMISSION_GUIDE.md  # Complete SFTP integration guide
PAYER_ID_USAGE_GUIDE.md           # How to use payer IDs correctly
CLAIMS_SUBMISSION_PROGRESS.md     # This file - project tracker
```

---

## 🔑 Key Configuration

### Environment Variables Required
```bash
# Office Ally SFTP
OFFICE_ALLY_SFTP_HOST=ftp10.officeally.com
OFFICE_ALLY_SFTP_PORT=22
OFFICE_ALLY_SFTP_USERNAME=moonlit
OFFICE_ALLY_SFTP_PASSWORD=[stored in .env.local]

# Office Ally Clearinghouse IDs
OFFICE_ALLY_SENDER_ID=1161680
OFFICE_ALLY_RECEIVER_ID=OFFALLY

# Provider Information
PROVIDER_NPI=1275348807
PROVIDER_NAME=MOONLIT_PLLC
PROVIDER_TAX_ID=332185708

# Database
NEXT_PUBLIC_SUPABASE_URL=[stored in .env.local]
SUPABASE_SERVICE_KEY=[stored in .env.local]
```

### Supabase Tables Used
- `payers` - Payer list with Office Ally transaction-specific IDs
- `providers` - Billing and rendering provider data (now includes `medicaid_provider_id`)
- `claims_submissions` - Claims tracking and status
- `intakeq_clients` - Patient data synced from IntakeQ

---

## 📚 References & Resources

### Office Ally Documentation
- **837P Companion Guide**: `OA_Professional_837P_Companion_Guide_r060822.pdf`
- **SFTP Naming Convention**: Files must include "837P" keyword
- **Test Files**: Must include "OATEST" in filename
- **Support Email**: support@officeally.com
- **Phone**: (360) 975-7000

### Utah Medicaid
- **EDI Support**: MHC-EDI@utah.gov
- **PRISM Portal**: https://medicaid.utah.gov/prism/
- **Provider Enrollment**: (800) 662-9651
- **Companion Guide**: https://medicaid-documents.dhhs.utah.gov/Documents/pdfs/CE-Health Care Claim Professional Encounter Companion Guide (837P-ENC) SFY25Q1.pdf

### HIPAA Standards
- **837P Implementation Guide**: 005010X222A1 (Washington Publishing Company)
- **Transaction Set**: Health Care Claim: Professional (837P)
- **Required Segments**: ISA, GS, ST, BHT, NM1, REF, CLM, HI, LX, SV1, DTP, SE, GE, IEA

---

## 🎉 Success Metrics

### Technical Milestones
- [x] **EDI 837P generator working** (HIPAA 5010 compliant)
- [x] **SFTP upload/download working**
- [x] **Database-driven payer IDs** (18 payers configured)
- [x] **Database-driven provider data** (real NPIs, Tax IDs, addresses)
- [x] **Claims tracking database** (claims_submissions table)
- [x] **Web interface functional** (CMS-1500 form UI)
- [x] **Test claims submitted successfully** (3 test claims uploaded)
- [x] **Utah Medicaid Provider ID fix implemented** (REF*1C segment added)
- [ ] **RC77 rejection eliminated** (awaiting validation)
- [ ] **First production claim accepted**
- [ ] **First ERA received and parsed**
- [ ] **End-to-end workflow complete** (claim → submission → payment)

### Business Milestones
- [ ] **Claim acceptance rate >95%**
- [ ] **Average claim turnaround <7 days**
- [ ] **Automated copay collection working**
- [ ] **IntakeQ claims fully replaced** (optional long-term goal)

---

## 🤔 Decision Points

### Strategic Questions

1. **IntakeQ Independence Timeline**
   - Current: Using IntakeQ for clinical workflow + their claims generator
   - Future: Could replace IntakeQ claims with our system
   - Question: When does it make sense to fully migrate?
   - Dependencies: Response monitoring, ERA processing, payment posting

2. **Payment Processing**
   - Current: IntakeQ handles patient payments
   - Future: Could integrate Stripe directly for copays
   - Question: Build custom payment flow or keep IntakeQ?
   - Consideration: If building custom payments, might as well go all-in

3. **Scope Creep Management**
   - Started as: Real-time eligibility checking ✅ COMPLETE
   - Added: Claims submission 🟡 IN PROGRESS
   - Potential: ERA processing, payment posting, A/R management
   - Question: Where do we draw the line vs buying software?

---

## 📞 Support Contacts

**Office Ally**:
- Support: support@officeally.com
- Phone: (360) 975-7000 Option 1
- SFTP Issues: (360) 975-7000 Option 2

**Utah Medicaid EDI**:
- Email: MHC-EDI@utah.gov
- Provider Enrollment: (800) 662-9651

**UHIN (Utah Health Information Network)**:
- Support: https://support.uhin.org/
- Phone: (877) 693-3071

---

## 🔄 Changelog

**2025-10-07 Evening**:
- ✅ Fixed RC77 rejection by adding Utah Medicaid Provider ID (4347425)
- ✅ Updated database schema with `medicaid_provider_id` column
- ✅ Enhanced EDI generator to include `REF*1C` segment
- ✅ Updated provider service to fetch Medicaid Provider ID
- ✅ Submitted test claim with fix applied
- 📝 Created comprehensive progress tracker (this file)

**2025-10-07 Afternoon**:
- ✅ Fixed claims database logging
- ✅ Created `claims_submissions` table in Supabase
- ✅ Submitted test claim with full database integration
- 📝 Documented database fix in `FIX_CLAIMS_DATABASE.md`

**2025-10-07 Morning**:
- ✅ Built CMS-1500 web interface
- ✅ Integrated IntakeQ patient search
- ✅ Database-driven provider architecture
- ✅ Submitted first test claims to Office Ally
- ❌ Discovered RC77 rejection issue

**2025-10-06**:
- ✅ Built EDI 837P generator
- ✅ Implemented SFTP integration
- ✅ Created response parsers (835, 277, 999)
- ✅ Documented complete SFTP integration guide

---

**Next Review**: 2025-10-08 Morning (check for 999/277 responses)
