# Haley Tucker - Idaho Medicaid Coordination of Benefits (COB) Investigation

**Date**: 2025-10-18
**Patient**: Haley M Tucker
**DOB**: 04/30/2003
**Idaho Medicaid ID**: 0003082385
**Issue**: Claim denied - Idaho Medicaid requires primary insurance to be billed first

---

## Executive Summary

✅ **Eligibility Check Completed**: Successfully queried Idaho Medicaid
❌ **No Primary Insurance Found**: Idaho Medicaid does not have other insurance information on file for this patient
⚠️ **Action Required**: Patient must update their insurance information with Idaho Medicaid before secondary claims can be processed

---

## X12 271 Response Analysis

### Response Details

**Response Received**: 2025-10-18 at 07:48:23 UTC (3.3 second response time)
**Payer**: MEDICAID IDAHO (Office Ally ID: 10363)
**Provider NPI**: 1124778121 (TRAVIS NORSETH - fallback provider)
**Member ID Confirmed**: 0003082385
**EVC Number**: 25291M000007475 (Idaho Medicaid Electronic Verification Code)

### X12 271 Segments Breakdown

```
ISA*00*...*01*1161680...~
GS*HB*OFFALLY*1161680*20251018*0748*632744904*X*005010X279A1~
ST*271*632744904*005010X279A1~
BHT*0022*11*TRAVISNORSETH-798900554*20251018*074823~

HL*1**20*1~                                    # Payer Level
NM1*PR*2*MEDICAID IDAHO*****PI*10363~         # Payer: Idaho Medicaid

HL*2*1*21*1~                                   # Provider Level
NM1*1P*2*NORSETH*****XX*1124778121~           # Provider: Norseth
AAA*N**51*C~                                   # ⚠️ ERROR: "Additional Patient Information Required"

HL*3*2*22*0~                                   # Subscriber/Patient Level
TRN*1*732744904-20251018*9OFFICALLY~          # Trace Number
TRN*2*798900554*1124778121*ELIGIBILITY~       # Provider Trace
NM1*IL*1*TUCKER*HALEY****MI*0003082385~       # Patient: Haley Tucker, Member ID confirmed
REF*NQ*25291M000007475*EVC NUMBER~            # Electronic Verification Code
DTP*291*D8*20251018~                          # Service Date

SE*14*632744904~
GE*1*632744904~
IEA*1*632744904~
```

### Critical Findings

#### 1. AAA Segment - Error Code 51
**Segment**: `AAA*N**51*C`
**Interpretation**:
- **AAA01 = 'N'**: Request Validation - Not Valid
- **AAA03 = '51'**: **"Additional Patient Information Required"**
- **AAA04 = 'C'**: Category: Information Requested

**What This Means**:
Idaho Medicaid is indicating they need additional patient information to process the eligibility request fully. This may include:
- Other insurance information
- Additional demographic details
- Updated enrollment data

#### 2. No EB Segments Present
**Missing**: No `EB*` (Eligibility/Benefit) segments in response
**Significance**: Idaho Medicaid did not return any benefit information, only acknowledged the member ID

#### 3. No COB Information (Loop 2120)
**Missing**: No `LS*2120` or `EB*R*` segments
**Significance**: Idaho Medicaid does not have coordination of benefits information on file for this patient

---

## Root Cause Analysis

### Why Idaho Medicaid Denied the Claim

**Claim Denial Reason**: "Primary insurance must be billed first"

**Why This Happened**:
1. **Patient Has Primary Insurance**: Haley has another insurance carrier as primary
2. **Idaho Medicaid is Secondary**: Idaho Medicaid only pays after primary insurance
3. **Idaho Medicaid Database Missing COB**: Idaho Medicaid's system doesn't show the primary insurance
4. **Claim Submitted to Wrong Payer First**: Provider billed Idaho Medicaid directly instead of primary

### The COB Data Gap

Idaho Medicaid's X12 271 response shows:
- ✅ Patient is enrolled in Idaho Medicaid (Member ID verified)
- ✅ EVC Number issued (25291M000007475)
- ❌ **No primary insurance information in their system**
- ⚠️ Additional patient information required (AAA*N**51)

**This means**: Even though Haley has primary insurance, Idaho Medicaid doesn't have that information in their database.

---

## Alternative Methods to Identify Primary Insurance

Since the X12 271 eligibility check didn't return COB data, here are recommended next steps:

### Method 1: Direct Patient Contact ⭐ RECOMMENDED
**Action**: Call or email patient directly
**Ask For**:
- Name of primary insurance carrier
- Primary insurance member ID
- Group number (if applicable)
- Copy of insurance cards (front and back)

**Why This Works**: Patient is the most reliable source of current insurance information

### Method 2: Idaho Medicaid Provider Portal
**Website**: https://www.idmedicaid.com/ (or Idaho MMIS portal)
**Action**:
1. Log into Idaho Medicaid provider portal
2. Look up patient by Medicaid ID: 0003082385
3. Check "Other Insurance" or "TPL" (Third Party Liability) section
4. COB information may be visible in portal but not transmitted via X12

**Why This Might Help**: Web portals sometimes show more data than X12 responses

### Method 3: Idaho Medicaid EDI Help Desk
**Contact**: Idaho Medicaid EDI Support
**Phone**: Check https://www.idmedicaid.com/ for current contact
**Ask**:
- "Does patient 0003082385 have other insurance on file?"
- "What is the Third Party Liability (TPL) status for this member?"
- "How do we update COB information for this patient?"

**Why This Might Help**: EDI support can look up TPL database directly

### Method 4: Claims Denial Documentation
**Action**: Review the original claim denial from Idaho Medicaid
**Look For**:
- Denial code (likely related to TPL or COB)
- Any mention of primary insurance name in denial message
- Remittance advice (835) may have more details than claim status

**Why This Might Help**: Claim denials sometimes include hints about primary payer

### Method 5: Patient's Medical Records
**Action**: Review intake forms and registration documents
**Check**:
- Initial patient registration paperwork
- Insurance information collected at first visit
- Any updated insurance information on file

**Why This Might Help**: Patient may have disclosed primary insurance during registration

### Method 6: IntakeQ Patient Record
**Action**: Check IntakeQ system for Haley Tucker's intake form
**Look For**:
- Insurance section of intake form
- Multiple insurance entries
- Any notes about primary vs. secondary coverage

**Why This Might Help**: If patient filled out IntakeQ form, insurance info may be there

---

## Correcting the COB Data Gap

### For Future Patients

To avoid this issue with other patients, implement these processes:

#### 1. Enhanced Patient Registration
**Required Fields**:
- ✅ Primary insurance name and ID
- ✅ Secondary insurance name and ID
- ✅ Copy of ALL insurance cards
- ✅ Coordination of benefits statement signed

#### 2. Pre-Service Eligibility Verification
**Before Each Appointment**:
1. Run eligibility check on PRIMARY insurance first
2. Verify active coverage and benefits
3. Run eligibility check on SECONDARY insurance (Medicaid)
4. Confirm COB is properly documented

#### 3. Medicaid COB Reporting
**When Patient Has Medicaid as Secondary**:
1. Report primary insurance to state Medicaid
2. Most states have online portals for TPL updates
3. Update within 30 days of discovering new insurance
4. Re-verify after reporting to confirm update

---

## Idaho Medicaid TPL (Third Party Liability) Process

### Reporting Other Insurance to Idaho Medicaid

**Idaho Medicaid requires providers to report other insurance** when known:

#### Online Reporting
- **Portal**: Idaho MMIS Provider Portal
- **Section**: Third Party Liability (TPL) or Other Insurance
- **Required Info**:
  - Patient Medicaid ID
  - Other insurance carrier name
  - Other insurance member ID
  - Effective dates
  - Whether primary or secondary

#### Phone Reporting
- Contact Idaho Medicaid Provider Relations
- Have patient Medicaid ID and insurance details ready
- Request TPL update

#### Why This Matters
- Idaho Medicaid can only coordinate benefits if they know about other insurance
- Reporting TPL helps prevent claim denials
- Required by federal Medicaid regulations (42 CFR 433.138)

---

## Billing Workflow Correction for Haley Tucker

### Current Situation
1. ❌ Claim submitted to Idaho Medicaid (secondary) first
2. ❌ Denied because primary not billed
3. ❓ Primary insurance unknown

### Correct Workflow (Once Primary is Identified)

#### Step 1: Identify Primary Insurance
Use methods above to determine primary carrier

#### Step 2: Bill Primary Insurance
1. Submit claim to primary insurance with:
   - All services rendered
   - Full charges
   - No mention of Medicaid
2. Wait for primary insurance EOB (Explanation of Benefits)
3. Note amount paid and amount denied/adjusted

#### Step 3: Report Primary to Idaho Medicaid
1. Update Idaho Medicaid TPL database with primary insurance info
2. Wait 7-10 days for system update
3. Re-verify eligibility to confirm COB appears

#### Step 4: Bill Idaho Medicaid (Secondary)
1. Submit claim to Idaho Medicaid with:
   - Same services as primary claim
   - Copy of primary insurance EOB attached
   - Indicate "Secondary Claim" or use COB indicators
   - Amount paid by primary in COB fields
2. Idaho Medicaid will pay:
   - Remaining patient responsibility (up to Medicaid allowed amount)
   - May pay coinsurance, copay, or deductible
   - Will not pay more than their allowed amount

---

## Technical Notes

### X12 271 AAA Segment Codes

**AAA Segment Structure**: `AAA*[Valid?]*[Agency]*[Code]*[Category]`

Common AAA03 Codes (Reject Reason):
- **51**: Additional Patient Information Required
- **52**: Special Program Information Required
- **53**: Requested Information Not Received
- **54**: Primary Care Provider Not On File
- **56**: Inappropriate Product/Service ID Qualifier
- **57**: Inappropriate Diagnosis Code Qualifier
- **63**: Provider Not Primary

**Haley's Code (51)**: System needs more patient data, likely COB information

### Why COB Appears in Some X12 271 Responses But Not Others

**Loop 2120 (Other Insurance) appears when**:
- Payer has other insurance on file
- Patient has reported other coverage
- State Medicaid TPL database has been updated
- Previous claims triggered TPL investigation

**Loop 2120 missing when**:
- Payer has no other insurance on file (Haley's case)
- Patient hasn't disclosed other insurance
- TPL database hasn't been updated
- Patient is only enrolled in one insurance

---

## Recommendations

### Immediate Actions (Haley Tucker)

1. ⭐ **Contact Patient** (PRIORITY)
   - Request all current insurance cards
   - Ask which insurance is primary
   - Get member IDs for all coverage

2. **Review Intake Documents**
   - Check registration forms
   - Review IntakeQ submission
   - Check claims history for patterns

3. **Contact Idaho Medicaid**
   - Call Provider Relations
   - Ask about TPL status for member 0003082385
   - Request guidance on updating COB

4. **Once Primary Identified**
   - Submit claim to primary first
   - Wait for EOB
   - Report primary to Idaho Medicaid TPL
   - Re-submit as secondary claim

### Long-Term Process Improvements

1. **Mandatory COB Collection**
   - Require patients to list ALL insurance at registration
   - Copy front and back of ALL insurance cards
   - Have patient sign COB statement

2. **Multi-Payer Eligibility Checks**
   - Run eligibility on all reported insurance
   - Verify primary vs. secondary status
   - Check for COB data in X12 271 responses

3. **TPL Reporting Workflow**
   - When Medicaid patient has other insurance:
     - Report to state Medicaid immediately
     - Re-verify after 10 days
     - Confirm COB appears before billing

4. **Staff Training**
   - Train on COB rules
   - Educate on primary vs. secondary billing
   - Emphasize importance of complete insurance collection

---

## Files Generated

1. **Test Script**: `/Users/macsweeney/medicaid-eligibility-checker/test-haley-tucker-eligibility.js`
2. **Raw X12 271**: `/Users/macsweeney/medicaid-eligibility-checker/raw_x12_271_Haley_Tucker_IDAHO_MEDICAID_2025-10-18T14-48-23-900Z.txt`
3. **This Report**: `/Users/macsweeney/medicaid-eligibility-checker/HALEY_TUCKER_COB_FINDINGS.md`

---

## Summary

### What We Learned

✅ **Idaho Medicaid Eligibility System is Working**
- Patient is enrolled (Member ID: 0003082385)
- EVC issued (25291M000007475)
- System responds correctly

❌ **COB Data Not Available via X12 271**
- Idaho Medicaid doesn't have primary insurance on file
- AAA*N**51 indicates additional patient info needed
- No Loop 2120 (other insurance) segments returned

⚠️ **Provider Must Obtain Primary Insurance Info**
- Cannot rely on X12 271 for COB in this case
- Must use alternative methods to identify primary
- Patient contact is most reliable approach

### Next Steps

1. **Contact Haley Tucker** - Get current insurance information
2. **Identify primary insurance** - Determine carrier, member ID, group number
3. **Bill primary first** - Submit claim to primary insurance
4. **Update Idaho Medicaid TPL** - Report primary insurance to state
5. **Re-submit to Idaho Medicaid** - As secondary payer with primary EOB

### Key Takeaway

**X12 271 coordination of benefits data is only as good as the payer's database.** When a state Medicaid program doesn't have other insurance on file, providers must proactively collect and report this information to ensure proper claims processing.

---

**Report Generated**: 2025-10-18
**Author**: Claude Code Eligibility System
**Purpose**: Investigate COB for denied Idaho Medicaid claim
