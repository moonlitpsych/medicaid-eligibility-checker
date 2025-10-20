# Hyrum Bay - DMBA Claim Status Search Results

**Date**: 2025-10-18
**Patient**: Hyrum Bay (Dependent)
**Primary Insured**: Stephen Bay
**DOB**: 09/19/1967 (Stephen Bay's DOB)
**Insurance**: DMBA (Deseret Mutual Benefits Administration)
**Member ID**: 000119985
**Service Date**: 09/07/2025

---

## 🔍 Database Search Results

### Claims Submissions Table: ❌ NOT FOUND

**Searched For**:
- Patient name: "Hyrum Bay"
- Patient name: "Bay"
- Service date: 09/07/2025
- Payer: DMBA / Deseret

**Result**: **No claims found in local database**

**What This Means**:
- The claim was either:
  1. ❌ Not yet submitted to DMBA
  2. ❌ Submitted outside of this system (different software/manually)
  3. ❌ Not logged to the `claims_submissions` database table
  4. ✅ Submitted but not tracked in this eligibility checker system

---

### Eligibility Log Table: ❌ NOT FOUND

**Searched For**:
- Patient names: Hyrum Bay, Stephen Bay
- Any DMBA eligibility checks

**Result**: **No eligibility checks found**

**What This Means**:
- No eligibility verification was run through this system for:
  - Hyrum Bay
  - Stephen Bay
  - DMBA payer

---

### DMBA Payer Configuration: ✅ FOUND

**Payer Record**:
```
Name: DMBA
Payer ID: 8bd0bedb-226e-4253-bfeb-46ce835ef2a8
Status: Approved
```

**Office Ally Configuration**:
- ❌ Eligibility 270 ID: **NOT CONFIGURED**
- ❌ Claims 837 ID: **NOT CONFIGURED**
- ✅ Remit 835 ID: **SX105** (you provided this)

**What This Means**:
- DMBA exists in the payer database
- But Office Ally transaction IDs are not configured
- Can't run automated eligibility or claims status checks without payer IDs
- Only 835 remittance ID (SX105) is known

---

## 🎯 CONCLUSION

**The claim for Hyrum Bay (09/07/2025) is NOT in this system's database.**

This means:
1. The claim was likely submitted through a **different system or method**
2. If submitted via Office Ally, it wasn't logged to your local database
3. The claim may have been submitted manually (paper or via Office Ally web portal)
4. This eligibility checker system hasn't been used for DMBA claims tracking

---

## 🔧 HOW TO FIND THE CLAIM STATUS

Since the claim isn't in the local database, here are your options:

### Option 1: Office Ally Web Portal ⭐ RECOMMENDED

**Steps**:
1. Log into Office Ally provider portal: https://www.officeally.com/
2. Go to "Claims" → "Claim Status" or "Search Claims"
3. Search by:
   - Patient name: Hyrum Bay
   - Service date: 09/07/2025
   - Or claim control number (if you have it)

**What You'll Find**:
- Current claim status (pending, paid, denied)
- Payer response
- Payment amount (if paid)
- Denial codes (if denied)
- 835 remittance details

**This is the fastest and most reliable method** ✅

---

### Option 2: Office Ally SFTP - Check 835 Remittance Files

**Steps**:
1. Connect to Office Ally SFTP server
   - Host: ftp10.officeally.com
   - Username: moonlit
   - Password: [from .env.local]

2. Navigate to `/outbound/` folder

3. Look for 835 remittance files with DMBA (SX105)
   - Files typically named with date and payer ID
   - Search for "SX105" in filename or file content

4. Download and parse 835 files for Hyrum Bay

5. Look for:
   - Service date: 09/07/2025
   - Patient name: Hyrum Bay or Stephen Bay
   - Payment amount or denial codes

**Tools to Parse 835**:
- Office Ally portal has 835 viewer
- Text editor to search for patient name
- X12 EDI parser (if needed)

---

### Option 3: Contact Office Ally Support

**If you can't find the claim in portal or SFTP**:

**Contact**:
- Phone: (360) 975-7000, option 1
- Email: Sheila.Odeen@officeally.com

**Ask**:
```
"I'm trying to locate claim status for patient Hyrum Bay (dependent
of Stephen Bay, member ID 000119985) with DMBA payer for service
date 09/07/2025.

Can you help me:
1. Confirm if the claim was submitted through Office Ally
2. Check current claim status
3. See if there's an 835 remittance available
4. Get claim control/tracking number"
```

---

### Option 4: Contact DMBA Directly

**DMBA Contact Information**:
- **Website**: https://www.dmba.com/
- **Provider Services**: Check website for provider phone number
- **Claims Department**: Usually available on provider portal

**What to Ask**:
```
"I'm calling to check the status of a claim for:
- Patient: Hyrum Bay (dependent)
- Primary Insured: Stephen Bay
- Member ID: 000119985
- Date of Birth: 09/19/1967
- Service Date: 09/07/2025
- Provider: [YOUR PRACTICE NAME]
- Provider NPI: [YOUR NPI]

Questions:
1. Was the claim received?
2. What is the current status?
3. Has it been paid or denied?
4. If denied, what are the denial codes?
5. When can I expect payment or EOB?"
```

---

### Option 5: Check Your Practice Management System

**If you use a separate billing/PM system**:
- Check your main practice management software
- Search for Hyrum Bay claims
- Look at claim status reports
- Review patient account ledger

The claim might be tracked there instead of in this eligibility checker database.

---

## 🛠️ TO ENABLE DMBA IN THIS SYSTEM (Future Use)

If you want to track DMBA claims in this eligibility checker system going forward, you need to:

### 1. Get Office Ally Payer IDs for DMBA

**Contact Office Ally** and ask for:
- **Eligibility (270/271) Payer ID** for DMBA
- **Claims Submission (837P) Payer ID** for DMBA
- **Claims Status (276/277) Payer ID** for DMBA (may be same as 837P)

**Currently Known**:
- ✅ Remittance (835) ID: SX105
- ❌ Eligibility ID: Unknown
- ❌ Claims/Status ID: Unknown

### 2. Configure in Database

Once you have the payer IDs, add them to the database:

```sql
UPDATE payers
SET
  oa_eligibility_270_id = '[ELIGIBILITY_ID]',
  oa_professional_837p_id = '[CLAIMS_ID]',
  oa_remit_835_id = 'SX105'
WHERE name = 'DMBA';
```

### 3. Add to payer_office_ally_configs Table

```sql
INSERT INTO payer_office_ally_configs (
  payer_id,
  office_ally_payer_id,
  payer_display_name,
  category,
  required_fields,
  recommended_fields,
  optional_fields,
  requires_gender_in_dmg,
  supports_member_id_in_nm1,
  dtp_format,
  allows_name_only,
  is_tested
) VALUES (
  '8bd0bedb-226e-4253-bfeb-46ce835ef2a8',
  '[ELIGIBILITY_PAYER_ID]',
  'DMBA (Deseret Mutual Benefits Administration)',
  'Commercial',
  ARRAY['firstName', 'lastName', 'dateOfBirth', 'memberNumber'],
  ARRAY['groupNumber', 'gender'],
  ARRAY[],
  true,
  true,
  'D8',
  false,
  false
);
```

### 4. Test Eligibility Check

Once configured, you can run:
```bash
node test-eligibility-check.js \
  --first-name Hyrum \
  --last-name Bay \
  --dob 1967-09-19 \
  --member-id 000119985 \
  --payer-id [DMBA_PAYER_ID]
```

---

## 📊 SUMMARY

| Item | Status |
|------|--------|
| Claim in local database | ❌ NOT FOUND |
| Eligibility checks logged | ❌ NONE |
| DMBA payer configured | ⚠️ PARTIAL (only 835 ID) |
| **Recommended Action** | **Check Office Ally portal** |

---

## ✅ NEXT STEPS

**Immediate (to find this claim)**:
1. ⭐ Log into Office Ally web portal
2. Search for Hyrum Bay, service date 09/07/2025
3. Check claim status and 835 remittance
4. If not found, call DMBA: member ID 000119985

**Long-term (for future DMBA claims)**:
1. Get DMBA Office Ally payer IDs from Office Ally support
2. Configure DMBA in the database properly
3. Use this system for eligibility checks before service
4. Use this system for claims submissions
5. Track all DMBA claims in the database

---

## 📁 FILES & RESOURCES

**Relevant Documentation**:
- Office Ally login: https://www.officeally.com/
- DMBA website: https://www.dmba.com/
- Office Ally support: Sheila.Odeen@officeally.com

**Database Tables**:
- `payers` - DMBA record exists (ID: 8bd0bedb-226e-4253-bfeb-46ce835ef2a8)
- `claims_submissions` - No DMBA claims logged
- `eligibility_log` - No DMBA checks logged

---

**Report Generated**: 2025-10-18
**Search**: Hyrum Bay DMBA Claim (09/07/2025)
**Result**: Not found in local database - check Office Ally portal
**Recommendation**: Use Office Ally web portal for claim status lookup
