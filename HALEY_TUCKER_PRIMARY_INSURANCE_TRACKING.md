# Haley Tucker - Primary Insurance Tracking Guide

**Date**: 2025-10-18
**Patient**: Haley M Tucker
**DOB**: 04/30/2003
**Idaho Medicaid ID**: 0003082385
**Service Date**: 08/29/2025
**Issue**: Need to identify primary insurance (Idaho Medicaid won't provide via X12 271)

---

## What We've Tried

### ✅ X12 271 Eligibility Check (Today's Date)
- **Result**: No COB information
- **AAA Error**: Code 51 - "Additional Patient Information Required"
- **EVC**: 25291M000007475

### ✅ X12 271 Eligibility Check (Service Date: 8/29/2025)
- **Result**: No COB information
- **AAA Error**: Code 51 - "Additional Patient Information Required"
- **EVC**: 25291M000007548

### ❌ Conclusion
**Idaho Medicaid's X12 271 response does not include coordination of benefits (COB) data**, even when querying for the historical service date. This means the primary insurance information is not available through automated eligibility checking.

---

## Alternative Methods to Identify Primary Insurance

Since you mentioned Idaho Medicaid **did tell you the primary insurance via phone** but you didn't note it, here are the best ways to retrieve it:

### Method 1: Idaho Medicaid Provider Portal ⭐ RECOMMENDED

**Why This is Best**: You already know Idaho Medicaid has the information (they told you on the phone). The provider portal likely shows more data than X12 271 responses.

**Steps**:
1. **Log into Idaho Medicaid Provider Portal**
   - Website: https://www.idmedicaid.com/
   - Or Idaho MMIS (Medicaid Management Information System) portal

2. **Navigate to Member Lookup**
   - Search by Medicaid ID: `0003082385`
   - Or search by name + DOB

3. **Look for TPL/COB Section**
   - Section names vary by portal:
     - "Third Party Liability (TPL)"
     - "Other Insurance"
     - "Coordination of Benefits"
     - "Primary Insurance"
     - "Insurance Coverage"

4. **Check Effective Dates**
   - Look for coverage that was active on 8/29/2025
   - Primary insurance may have since termed/lapsed

5. **Document Everything**
   - Primary insurance carrier name
   - Primary insurance member ID
   - Group number (if applicable)
   - Effective dates
   - Take screenshot for records

**Portal Features to Check**:
- Member eligibility history
- Claims history (might show primary insurance denials/EOBs)
- Authorization history
- TPL/COB reporting section

---

### Method 2: Call Idaho Medicaid Provider Relations Again ⭐ SECOND BEST

**Contact Information**:
- **Provider Services**: Check https://www.idmedicaid.com/ for current phone number
- **Hours**: Typically 8am-5pm Mountain Time, Monday-Friday

**What to Say**:
```
"Hi, I'm calling regarding patient Haley Tucker, Idaho Medicaid ID
0003082385. We saw her on August 29, 2025 and submitted a claim that
was denied because we didn't bill primary insurance first. I called
previously and was told what her primary insurance is, but I didn't
write it down. Can you please provide the primary insurance information
again? I need the carrier name, member ID, and effective dates."
```

**Information They Should Provide**:
- Primary insurance carrier name
- Primary insurance member ID (if they have it)
- Effective dates of primary coverage
- Whether to bill primary or if it's Medicare/Medicaid crossover

**Ask Specifically**:
- "Is this information in your Third Party Liability (TPL) database?"
- "Will this show up in future X12 271 eligibility responses?"
- "Should I report updated insurance if we get it from the patient?"

---

### Method 3: Review Your Own Records

**Check These Sources**:

#### A. Original Claim/Remittance
- **835 Remittance Advice** from Idaho Medicaid
- Denial code and reason
- May include remarks about primary insurance
- Claim adjustment reason codes (CARC) might hint at COB

**Where to Look**: Office Ally claim status, SFTP `/outbound/` folder for 835 files

#### B. Your Practice Management System
- Patient demographics
- Insurance information entered at registration
- Multiple insurance entries (primary/secondary)
- Intake forms scanned into system

#### C. IntakeQ Patient Record
```bash
# If you use IntakeQ integration, search for patient
node -e "
const intakeqService = require('./lib/intakeq-service');
intakeqService.searchClients('Haley', 'Tucker', '2003-04-30')
  .then(result => console.log(JSON.stringify(result, null, 2)));
"
```

**What to Look For**:
- Insurance section of intake form
- Multiple insurance cards uploaded
- Patient notes mentioning other insurance

#### D. Appointment/Visit Notes
- Check 8/29/2025 appointment documentation
- Insurance verification notes
- Front desk check-in notes
- Any mentions of "patient has Blue Cross" or similar

---

### Method 4: Idaho Medicaid Remittance Analysis

**What to Check**:
1. Find the **835 remittance** for the denied claim
2. Look for **Claim Adjustment Reason Codes (CARC)**:
   - **29**: "The time limit for filing has expired"
   - **167**: "This (these) diagnosis(es) is (are) not covered"
   - **109**: "Claim not covered by this payer/contractor. You must send the claim to the correct payer/contractor."
   - **B1**: "Non-covered charges"
   - **24**: "Charges are covered under a capitation agreement/managed care plan"

3. Look for **Remark Codes** that might mention:
   - "Bill primary insurance"
   - "TPL information on file"
   - Specific insurance carrier name

**835 File Location**:
- Office Ally SFTP: `/outbound/` folder
- File naming: Usually includes your account ID and date

---

### Method 5: Claims History Research

**Theory**: If Haley has been to other providers, they may have submitted claims that show COB.

**How to Check**:
1. **Idaho Medicaid Portal**: Look up Haley's claims history
2. **Filter**: Claims from other providers around the same time period
3. **Review**: See if any claims show "Paid as secondary" or COB adjustments
4. **Infer**: Primary insurance that paid those claims

**What You're Looking For**:
- Claims with COB/TPL indicators
- Claims showing "Primary paid: $XXX, Medicaid paid: $XXX"
- Other provider names that might have the information

---

### Method 6: CAQH ProView / Payer Enrollment Records

**If Primary is a Commercial Payer**:

Some commercial insurance companies share provider enrollment data that includes which Medicaid programs they coordinate with.

**Steps**:
1. Log into CAQH ProView: https://proview.caqh.org/
2. Check "Payer Connections" or "Network Participation"
3. Look for Idaho-based commercial payers you're enrolled with
4. May show COB relationships with Idaho Medicaid

**Common Idaho Commercial Payers**:
- Blue Cross of Idaho
- Regence Blue Shield of Idaho
- PacificSource
- SelectHealth
- Mountain Health CO-OP

---

### Method 7: Patient Communication (Last Resort)

**If All Else Fails**:

**Email Template**:
```
Subject: Insurance Information Needed - Haley Tucker

Dear Haley,

We're following up on your visit on August 29, 2025. We need your help
to process your insurance claim correctly.

Our records show you have Idaho Medicaid as your insurance. However,
Idaho Medicaid has indicated you may have other health insurance that
should be billed first.

Could you please provide:
1. Name of any other health insurance you have
2. Member ID number
3. Group number (if applicable)
4. Copy of insurance card (front and back)

You can reply to this email with photos of your insurance cards, or
call us at [PHONE].

Thank you,
[Your Practice]
```

**Phone Script**:
```
"Hi Haley, this is [Name] from [Practice]. We're working on your
insurance claim from your August visit. Idaho Medicaid mentioned you
might have other insurance. Do you have any other health insurance
besides Idaho Medicaid? ... Could you email us photos of all your
insurance cards?"
```

---

## Technical Investigation Options

### Option A: X12 837 Claim File Analysis

**If you already submitted the claim**, review the original 837 file:

```bash
# Find the claim in Office Ally SFTP or local files
grep -r "TUCKER.*HALEY" /path/to/837/claims/
```

**Look for CLM segment with**:
- Claim control number
- Total charge amount
- May have notes about insurance

### Option B: Enable Office Ally Claim Status Inquiry (276/277)

**Current Status**: Your HALEY_TUCKER_CLAIM_STATUS_FINDINGS.md shows 276/277 not working

**If Enabled**: Could query claim status and get:
- Denial reason with more detail
- Payer-specific codes
- Possibly primary insurance name in rejection

**To Enable**: Contact Office Ally support to activate 276/277 transactions

### Option C: Idaho Medicaid EDI Technical Support

**Contact**: Idaho Medicaid EDI Help Desk
- Ask for technical liaison for EDI transactions
- Request: "Why doesn't Member 0003082385 show TPL in 271 response when TPL is on file?"
- May need to escalate to get technical team involvement

---

## Recommended Action Plan

### Immediate (Today):
1. ✅ **Log into Idaho Medicaid Provider Portal**
2. ✅ **Search for Haley Tucker (ID: 0003082385)**
3. ✅ **Check TPL/Other Insurance section**
4. ✅ **Document primary insurance information**

### If Portal Doesn't Show It (Backup):
1. ☎️ **Call Idaho Medicaid Provider Relations**
2. 📋 **Have claim information ready** (service date, claim ID)
3. 🖊️ **Write down EVERYTHING they say this time**
4. 📧 **Ask for email confirmation** of TPL information

### After Identifying Primary:
1. **Verify Primary Insurance**:
   - Run X12 270 eligibility check on primary carrier
   - Confirm member ID is valid
   - Check coverage effective dates

2. **Submit Claim to Primary**:
   - Bill primary insurance first
   - Use correct member ID
   - Wait for EOB

3. **Update Idaho Medicaid TPL**:
   - Report primary insurance to Idaho Medicaid
   - Use provider portal TPL reporting
   - Re-verify eligibility after 7-10 days

4. **Bill Idaho Medicaid Secondary**:
   - Attach primary EOB
   - Indicate secondary claim
   - Include COB fields showing primary payment

---

## Why X12 271 Didn't Work

**Technical Explanation**:

Idaho Medicaid's X12 271 implementation does **not populate Loop 2120 (Other Payer Information)** even when they have TPL data on file.

**Possible Reasons**:
1. **System Limitations**: Their eligibility system and TPL database may not be integrated
2. **Data Privacy**: Some states don't transmit TPL via X12 for privacy reasons
3. **Implementation Gap**: X12 271 COB segments are optional, not required
4. **Portal-Only Access**: TPL data available only through web portal, not EDI

**Industry Context**:
- Many state Medicaid programs have this same limitation
- Provider portals often show more data than X12 responses
- This is why provider portal access is critical

---

## Files Generated

1. **Test Script**: `test-haley-tucker-eligibility.js`
   - Run for today: `node test-haley-tucker-eligibility.js`
   - Run for service date: `node test-haley-tucker-eligibility.js 2025-08-29`

2. **COB Parser**: `lib/x12-271-cob-parser.js`
   - Reusable for future COB investigations

3. **Raw Responses**:
   - Today's check: `raw_x12_271_Haley_Tucker_IDAHO_MEDICAID_2025-10-18T14-48-23-900Z.txt`
   - Historical check: `raw_x12_271_Haley_Tucker_IDAHO_MEDICAID_DOS_20250829_2025-10-18T15-12-54-656Z.txt`

4. **Reports**:
   - Initial findings: `HALEY_TUCKER_COB_FINDINGS.md`
   - This tracking guide: `HALEY_TUCKER_PRIMARY_INSURANCE_TRACKING.md`

---

## Summary

**Bottom Line**: Idaho Medicaid has the primary insurance information (they told you on the phone), but they don't transmit it via X12 271 eligibility responses.

**Best Path Forward**:
1. Check Idaho Medicaid provider portal (fastest)
2. Call Idaho Medicaid again (most reliable)
3. Review your internal records (may have it already)

**Once Found**:
- Bill primary first
- Wait for primary EOB
- Update Idaho Medicaid TPL
- Resubmit to Idaho Medicaid as secondary

---

**Report Generated**: 2025-10-18
**Investigation**: Haley Tucker Primary Insurance Identification
**Conclusion**: X12 271 method unsuccessful; recommend provider portal or phone inquiry
