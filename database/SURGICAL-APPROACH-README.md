# Surgical Payer Update - Office Ally Integration

## Overview

This is a **surgical approach** to add Office Ally payer IDs to your existing ~25 insurance payers. We're NOT importing thousands of payers - just updating the ones you already have.

---

## What You Have

**Existing payers table:**
- 31 total rows (25 insurance payers + 6 self-pay types)
- Columns: id, name, payer_type, state, effective_date, requires_attending, etc.
- **NO Office Ally columns yet**

**Key payers to update:**
- Utah Medicaid Fee-for-Service
- Aetna
- Regence BlueCross BlueShield
- Cigna
- United Healthcare
- Molina Utah
- HealthyU (UUHP)
- And 18 more...

---

## 3-Step Process

### Step 1: Add Office Ally Columns (30 seconds)

Run this in Supabase SQL Editor:

```bash
cat add-office-ally-columns.sql
```

**This adds 3 columns:**
- `oa_eligibility_270_id` - For eligibility checks (270/271)
- `oa_professional_837p_id` - For claims submission (837P)
- `oa_remit_835_id` - For ERAs (835)

**Why 3 columns?** Because Office Ally uses **DIFFERENT IDs** for different transactions!

**Example - Utah Medicaid:**
- Eligibility ID: `UTMCD`
- Claims ID: `SKUT0` ← **Different!**
- ERA ID: `SKUT0`

---

### Step 2: Match Your Payers (1 minute)

Run the matching script to see proposed matches:

```bash
cd database
node match-and-update-payers.js
```

**What it does:**
1. Fetches your 25 insurance payers from Supabase
2. Parses Office Ally CSV (~10,947 rows)
3. Fuzzy matches YOUR payers against Office Ally data
4. Shows you the proposed matches for review
5. Saves match data to `payer-matches.json`

**Example output:**
```
📋 PROPOSED MATCHES (Please Review)

1. Utah Medicaid Fee-for-Service (Medicaid, UT)
   🎯 MANUAL OVERRIDE
   📡 Eligibility Match: Medicaid Utah (100% confidence)
      270/271 ID: UTMCD
   📄 Claims Match: Medicaid Utah (100% confidence)
      837P ID: SKUT0
      835 ID: SKUT0

2. Aetna (Private, UT)
   📡 Eligibility Match: Aetna Healthcare (95% confidence)
      270/271 ID: 60054
   📄 Claims Match: Aetna Healthcare (95% confidence)
      837P ID: 60054
      835 ID: 60054

...

📊 SUMMARY
   ✅ Matched: 23 payers
   ⚠️  No match: 2 payers
```

**Review the matches carefully!** If something looks wrong, we can adjust the manual overrides.

---

### Step 3: Apply Updates (30 seconds)

After reviewing the matches, apply them:

```bash
node apply-payer-updates.js
```

**What it does:**
1. Reads `payer-matches.json`
2. Updates your existing payers with Office Ally IDs
3. Shows verification results

**Example output:**
```
🔄 Applying Office Ally Payer Updates

✅ Updated Utah Medicaid Fee-for-Service
✅ Updated Aetna
✅ Updated Regence BlueCross BlueShield
...

📊 UPDATE SUMMARY
   ✅ Successfully updated: 23 payers

📊 Payers with Office Ally IDs: 23

   • Aetna
     270/271: 60054
     837P: 60054
     835: 60054

   • Utah Medicaid Fee-for-Service
     270/271: UTMCD
     837P: SKUT0
     835: SKUT0
```

---

## Manual Overrides

The script has manual overrides for tricky name matches:

```javascript
{
    'Utah Medicaid Fee-for-Service': {
        eligibilityName: 'Medicaid Utah',
        claimsName: 'Medicaid Utah'
    },
    'HealthyU (UUHP)': {
        eligibilityName: 'University of Utah Health Plans',
        claimsName: 'University of Utah Health Plans'
    },
    'Regence BlueCross BlueShield': {
        eligibilityName: 'Regence BlueCross BlueShield of Utah',
        claimsName: 'Regence BlueCross BlueShield of Utah'
    }
}
```

**If a match looks wrong, tell me and I'll add it to the overrides!**

---

## Verification

After applying updates, check in Supabase:

```sql
-- See all payers with Office Ally IDs
SELECT
    name,
    oa_eligibility_270_id,
    oa_professional_837p_id,
    oa_remit_835_id
FROM payers
WHERE oa_eligibility_270_id IS NOT NULL
ORDER BY name;

-- Check Utah Medicaid specifically
SELECT * FROM payers
WHERE name = 'Utah Medicaid Fee-for-Service';

-- Expected:
-- oa_eligibility_270_id: UTMCD
-- oa_professional_837p_id: SKUT0
-- oa_remit_835_id: SKUT0
```

---

## Using the IDs in Code

### Eligibility Check (270/271)

```javascript
// Get payer for eligibility check
const { data: payer } = await supabase
    .from('payers')
    .select('oa_eligibility_270_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const eligibilityId = payer.oa_eligibility_270_id; // UTMCD
```

### Claims Submission (837P)

```javascript
// BEFORE (hardcoded - WRONG!)
const payerId = 'UTMCD'; // This is eligibility ID, not claims!

// AFTER (from database - CORRECT!)
const { data: payer } = await supabase
    .from('payers')
    .select('oa_professional_837p_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const payerId = payer.oa_professional_837p_id; // SKUT0 ✅
```

### ERA Processing (835)

```javascript
const { data: payer } = await supabase
    .from('payers')
    .select('oa_remit_835_id')
    .eq('name', 'Utah Medicaid Fee-for-Service')
    .single();

const eraId = payer.oa_remit_835_id; // SKUT0
```

---

## Expected Matches

Based on Office Ally CSV, here are some key expected matches:

| Your Payer | Office Ally Match | 270/271 | 837P | 835 |
|------------|-------------------|---------|------|-----|
| Utah Medicaid Fee-for-Service | Medicaid Utah | UTMCD | SKUT0 | SKUT0 |
| Aetna | Aetna Healthcare | 60054 | 60054 | 60054 |
| Regence BlueCross BlueShield | Regence BlueCross BlueShield of Utah | 52189 | 52189 | 52189 |
| Cigna | Cigna Healthcare | CIGNA | CIGNA | CIGNA |
| United Healthcare | United Healthcare | UHC | UHC | UHC |
| HealthyU (UUHP) | University of Utah Health Plans | UUHP | UUHP | UUHP |

*(Actual IDs may vary - run matching script to see real values)*

---

## Troubleshooting

### "No matches found for [payer]"

**Option 1:** Search Office Ally CSV manually:
```bash
grep -i "molina" "../payers (1).xlsx - Payers.csv"
```

**Option 2:** Add manual override to `match-and-update-payers.js`:
```javascript
'Molina Utah': {
    eligibilityName: 'Molina Healthcare of Utah',
    claimsName: 'Molina Healthcare of Utah'
}
```

### "Match confidence looks low"

Review the proposed match. If it's wrong:
1. Check Office Ally CSV for exact payer name
2. Add manual override
3. Re-run matching script

### "Already have oa_eligibility_270_id column"

That's fine! The SQL script uses `ADD COLUMN IF NOT EXISTS`, so it won't error.

---

## What NOT To Do

❌ **Don't import all 3,600 Office Ally payers** - You only need the 25 you work with
❌ **Don't manually update IDs** - Use the scripts to ensure consistency
❌ **Don't use eligibility IDs for claims** - They're different!
❌ **Don't skip the review step** - Always check matches before applying

---

## Next Steps After Update

1. ✅ Update claims generator to use `oa_professional_837p_id` (not eligibility ID)
2. ✅ Update eligibility checker to use `oa_eligibility_270_id`
3. ✅ Update ERA parser to use `oa_remit_835_id`
4. ✅ Test claim submission with correct payer ID (SKUT0 for Utah Medicaid)

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `add-office-ally-columns.sql` | Step 1: Add 3 columns to payers table |
| `match-and-update-payers.js` | Step 2: Match your payers against Office Ally CSV |
| `apply-payer-updates.js` | Step 3: Apply the matches to Supabase |
| `SURGICAL-APPROACH-README.md` | This file |
| `payer-matches.json` | (Generated) Match data for review |

---

**Ready?** Start with Step 1: `cat add-office-ally-columns.sql`

Let me know if any matches look wrong and I'll adjust the manual overrides!
