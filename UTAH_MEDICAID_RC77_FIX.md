# Utah Medicaid RC77 Rejection - SOLVED

**Date**: 2025-10-07
**Issue**: RC77 "Payer No Longer Accepting Paper Claims - Pre-Enrollment Needed"
**Root Cause**: Missing Utah Medicaid Provider Number in 837P claims

---

## The Problem

Your test claim was rejected with error **RC77** because Utah Medicaid requires a **Medicaid Provider Number** (in addition to NPI) in the 837P transaction.

Office Ally accepted the claim format, but Utah Medicaid rejected it because:
- ❌ Missing `REF*1C` segment with Medicaid Provider ID
- ✅ NPI was present
- ✅ Tax ID was present
- ✅ File format was valid

---

## Why Your Daily Claims Work

Your IntakeQ-generated claims likely include the Medicaid Provider ID automatically. Our custom claims interface was missing this field.

---

## The Fix

### Step 1: Find Your Utah Medicaid Provider Number

This is **different** from your NPI (1275348807). It's the ID Utah Medicaid assigned when you enrolled.

**Where to find it:**
1. **PRISM Portal**: https://medicaid.utah.gov/prism/
   - Log in → Provider Profile → Provider Number
2. **Enrollment Letter**: Check your Utah Medicaid enrollment confirmation
3. **Call Provider Enrollment**: (800) 662-9651

**Format**: Usually 7-10 digits (e.g., `3000670` - but verify your actual number)

---

### Step 2: Add Column to Database

Run this in **Supabase SQL Editor**:

```sql
-- Add medicaid_provider_id column to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS medicaid_provider_id TEXT;

-- Update Moonlit PLLC with YOUR Utah Medicaid Provider Number
UPDATE providers
SET medicaid_provider_id = 'YOUR_MEDICAID_PROVIDER_NUMBER_HERE'  -- ⚠️ REPLACE WITH ACTUAL NUMBER
WHERE npi = '1275348807';

-- Verify it saved
SELECT first_name, last_name, npi, medicaid_provider_id
FROM providers
WHERE npi = '1275348807';
```

---

### Step 3: Code Changes (Already Applied ✅)

**Files Updated:**

1. **`lib/edi-837-generator.js`** (lines 74-78)
   - Added `REF*1C` segment for Medicaid Provider Number
   - Only included when `claim.billingProvider.medicaidProviderId` is present

2. **`lib/provider-service.js`** (lines 18, 41)
   - Updated `getBillingProvider()` to fetch `medicaid_provider_id`
   - Returns as `medicaidProviderId` in provider object

---

### Step 4: Test the Fix

**Submit a new test claim:**

```bash
# Start the API server
node api-server.js

# Open the claims interface
open http://localhost:3000/public/cms-1500-claims-interface.html

# Submit a test claim for Utah Medicaid with OATEST prefix
```

**What to expect:**
- ✅ Claim should be ACCEPTED by Utah Medicaid (not RC77)
- ✅ EDI file will include: `REF*1C*{your_medicaid_provider_id}~`

---

## Verification Checklist

Before submitting production claims:

- [ ] **Utah Medicaid Provider Number obtained** from PRISM/enrollment letter
- [ ] **Database updated** with `medicaid_provider_id` in Supabase
- [ ] **Test claim submitted** with OATEST prefix
- [ ] **No RC77 rejection** received
- [ ] **999 Acceptance** received from Office Ally
- [ ] **277 Acknowledgement** shows no errors

---

## What the EDI Now Includes

**Before (Missing Medicaid ID):**
```
NM1*85*2*MOONLIT_PLLC*****XX*1275348807~
N3*1336 South 1100 E~
N4*Salt Lake City*UT*84105~
REF*EI*332185708~                           ← Only Tax ID
HL*2*1*22*0~
```

**After (With Medicaid ID):**
```
NM1*85*2*MOONLIT_PLLC*****XX*1275348807~
N3*1336 South 1100 E~
N4*Salt Lake City*UT*84105~
REF*EI*332185708~                           ← Tax ID
REF*1C*{medicaid_provider_id}~              ← ✅ Medicaid Provider Number (NEW!)
HL*2*1*22*0~
```

---

## Reference: REF Segment Qualifiers

Common provider identifier qualifiers in 837P:

| Qualifier | Description | Required For |
|-----------|-------------|--------------|
| `EI` | Employer/Tax ID | All claims |
| `1C` | **Medicaid Provider Number** | **Utah Medicaid** |
| `G2` | Provider Commercial Number | Some payers |
| `0B` | State License Number | Some states |
| `SY` | Social Security Number | Individual providers |

---

## Next Steps

1. **Get your Medicaid Provider Number** from PRISM
2. **Update the database** with the SQL above
3. **Submit a test claim** to verify RC77 is resolved
4. **Check outbound folder** for 999/277 responses
5. **If still rejected**, contact Utah Medicaid EDI Support: **MHC-EDI@utah.gov**

---

## Additional Resources

- **Utah Medicaid EDI Support**: MHC-EDI@utah.gov
- **PRISM Portal**: https://medicaid.utah.gov/prism/
- **Provider Enrollment**: (800) 662-9651
- **Utah Medicaid 837P Companion Guide**: https://medicaid-documents.dhhs.utah.gov/Documents/pdfs/CE-Health Care Claim Professional Encounter Companion Guide (837P-ENC) SFY25Q1.pdf

---

## Success Indicator

When you see this in the 277 response (not RC77), you're fixed:

```
✅ CLAIM ACCEPTED
Payer: Utah Medicaid (SKUT0)
Status: Acknowledged - Forwarded to payer
```

Good luck! 🎉
