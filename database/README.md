# Payers Database Setup

## Overview

This directory contains the enhanced payers database schema and import scripts for Office Ally integration.

**Key Insight**: Office Ally uses **DIFFERENT payer IDs for DIFFERENT transaction types**. The same payer may have:
- One ID for eligibility checks (270/271)
- A different ID for professional claims (837P)
- Another ID for ERAs (835)

**Example - Utah Medicaid:**
- `UTMCD` for Eligibility (270/271)
- `SKUT0` for Claims (837P) and ERAs (835)

---

## Files

| File | Purpose |
|------|---------|
| `payers-table-enhanced-schema.sql` | Enhanced payers table schema with transaction-specific Office Ally IDs |
| `import-payers-from-csv.js` | Node.js script to import ~3,600 payers from Office Ally CSV |
| `README.md` | This file |

---

## Schema Design

### Enhanced Payers Table

```sql
CREATE TABLE payers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    payer_type TEXT, -- 'Medicaid', 'Commercial', 'Medicare', etc.
    state TEXT,      -- Two-letter state code (e.g., 'UT')

    -- Office Ally transaction-specific payer IDs
    oa_eligibility_270_id TEXT,      -- For eligibility (270/271)
    oa_claim_status_276_id TEXT,     -- For claim status (276/277)
    oa_professional_837p_id TEXT,    -- For professional claims (837P)
    oa_institutional_837i_id TEXT,   -- For institutional claims (837I)
    oa_dental_837d_id TEXT,          -- For dental claims (837D)
    oa_remit_835_id TEXT,            -- For ERAs (835)

    -- Transaction availability flags
    supports_eligibility_270 BOOLEAN,
    supports_professional_837p BOOLEAN,
    supports_institutional_837i BOOLEAN,
    supports_dental_837d BOOLEAN,
    supports_remit_835 BOOLEAN,

    -- Enrollment requirements
    requires_enrollment_837p BOOLEAN,
    requires_enrollment_837i BOOLEAN,
    requires_enrollment_835 BOOLEAN,

    -- Additional metadata
    allows_non_par BOOLEAN,
    allows_secondary BOOLEAN,
    allows_attachments BOOLEAN,
    specialty_type TEXT,            -- 'Work Comp', 'Auto', etc.

    notes TEXT,
    office_ally_notes TEXT,

    is_active BOOLEAN,
    is_tested BOOLEAN,
    test_notes TEXT,

    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Helper Views

**`v_payers_eligibility_enabled`** - Payers supporting eligibility checks:
```sql
SELECT * FROM v_payers_eligibility_enabled WHERE state = 'UT';
```

**`v_payers_claims_enabled`** - Payers supporting claims submission:
```sql
SELECT * FROM v_payers_claims_enabled WHERE supports_professional_837p = true;
```

**`v_payers_era_enabled`** - Payers supporting ERAs:
```sql
SELECT * FROM v_payers_era_enabled;
```

### Helper Function

**`get_office_ally_payer_id()`** - Get correct payer ID for transaction type:
```sql
-- Get eligibility ID
SELECT get_office_ally_payer_id(payer_id, '270');

-- Get claims ID
SELECT get_office_ally_payer_id(payer_id, '837P');

-- Get ERA ID
SELECT get_office_ally_payer_id(payer_id, '835');
```

---

## Setup Instructions

### 1. Create the Enhanced Schema

Open Supabase SQL Editor and run:
```bash
cat payers-table-enhanced-schema.sql
```

This will:
- ✅ Create `payers` table with transaction-specific Office Ally IDs
- ✅ Create indexes for fast lookups
- ✅ Create helper views for eligibility, claims, and ERA
- ✅ Create helper function to get payer ID by transaction type
- ✅ Insert initial Utah Medicaid test data

### 2. Import Office Ally Payers CSV

**Prerequisites:**
- Supabase credentials in `.env.local`
- `payers (1).xlsx - Payers.csv` file in parent directory

**Run the import:**
```bash
cd database
node import-payers-from-csv.js
```

**What it does:**
1. Parses CSV file (~10,947 rows)
2. Groups rows by payer name (same payer, different transaction types)
3. Maps transaction types to appropriate database columns
4. Classifies payer types (Medicaid, Commercial, etc.)
5. Extracts state codes from payer names
6. Upserts records into Supabase in batches of 100

**Expected output:**
```
📊 Importing 3,648 payers in batches of 100...
🔄 Processing batch 1/37 (100 payers)...
   ✅ Batch 1 imported successfully
...
✅ Successfully imported: 3,648 payers
📈 Total payers in database: 3,648
```

### 3. Verify Import

```sql
-- Check total count
SELECT COUNT(*) FROM payers;

-- Check Utah payers
SELECT name, oa_eligibility_270_id, oa_professional_837p_id
FROM payers
WHERE state = 'UT'
ORDER BY name;

-- Check Utah Medicaid specifically
SELECT *
FROM payers
WHERE name LIKE '%Utah Medicaid%';

-- Expected result for Utah Medicaid Traditional FFS:
-- oa_eligibility_270_id: UTMCD
-- oa_professional_837p_id: SKUT0
-- oa_remit_835_id: SKUT0
```

### 4. Use in Code

**Get payer for eligibility check:**
```javascript
const { data: payer } = await supabase
    .from('payers')
    .select('*')
    .eq('oa_eligibility_270_id', 'UTMCD')
    .single();
```

**Get correct payer ID for claims:**
```javascript
const { data } = await supabase
    .rpc('get_office_ally_payer_id', {
        p_payer_id: payerId,
        p_transaction_type: '837P'
    });

// Returns: 'SKUT0' for Utah Medicaid
```

**List all payers supporting eligibility in Utah:**
```javascript
const { data: payers } = await supabase
    .from('v_payers_eligibility_enabled')
    .select('*')
    .eq('state', 'UT');
```

---

## CSV Data Structure

### Source File: `payers (1).xlsx - Payers.csv`

**Format:**
```
PAYER NAME, PAYER ID, TRANSACTION, AVAILABLE, NON PAR, ENROLLMENT, SECONDARY, ATTACHMENT, WC / AUTO, NOTES
```

**Example rows for same payer:**
```
Utah Medicaid,UTMCD,Eligibility 270 / 271,Yes,No,No,No,No,,
Utah Medicaid,SKUT0,Professional Claims 837P,Yes,No,No,No,No,,
Utah Medicaid,SKUT0,Remits 835,Yes,No,Yes,No,No,,
```

**How it's processed:**
1. All rows with same `PAYER NAME` are grouped together
2. Each `TRANSACTION` type maps to a different database column
3. The `PAYER ID` for each transaction type is stored in the appropriate column

---

## Data Statistics

After import, expect:
- **~3,600 unique payers** (from ~10,947 CSV rows)
- **Payer breakdown by type:**
  - Commercial: ~2,800
  - Medicaid Managed Care: ~300
  - Medicaid: ~200
  - Medicare Advantage: ~200
  - Medicare: ~50
  - Workers Comp: ~30
  - Auto: ~20

---

## Updating the Claims Generator

After importing payers, update the claims generator to use the correct payer ID:

```javascript
// lib/edi-837-generator.js

// BEFORE (hardcoded):
const claimPayerId = 'UTMCD'; // Wrong! This is eligibility ID

// AFTER (from database):
const { data: payer } = await supabase
    .from('payers')
    .select('oa_professional_837p_id')
    .eq('name', 'Utah Medicaid Traditional FFS')
    .single();

const claimPayerId = payer.oa_professional_837p_id; // SKUT0 (correct!)
```

---

## Testing

### Test Eligibility ID vs Claims ID

```javascript
// Check Utah Medicaid IDs
const { data: payer } = await supabase
    .from('payers')
    .select('*')
    .ilike('name', '%utah medicaid%')
    .eq('payer_type', 'Medicaid')
    .single();

console.log('Eligibility ID (270/271):', payer.oa_eligibility_270_id); // UTMCD
console.log('Claims ID (837P):', payer.oa_professional_837p_id);       // SKUT0
console.log('ERA ID (835):', payer.oa_remit_835_id);                   // SKUT0
```

### Test Helper Function

```sql
-- Get correct payer IDs for Utah Medicaid
SELECT
    name,
    get_office_ally_payer_id(id, '270') AS eligibility_id,
    get_office_ally_payer_id(id, '837P') AS claims_id,
    get_office_ally_payer_id(id, '835') AS era_id
FROM payers
WHERE name LIKE '%Utah Medicaid%'
  AND payer_type = 'Medicaid';

-- Expected:
-- eligibility_id: UTMCD
-- claims_id: SKUT0
-- era_id: SKUT0
```

---

## Troubleshooting

### Import fails with "payers table does not exist"
Run the schema SQL first: `payers-table-enhanced-schema.sql`

### Import fails with "column does not exist"
Make sure you ran the enhanced schema (not the old one)

### Import succeeds but counts don't match
Check for:
- Duplicate payer names in CSV (script uses upsert on `name`)
- CSV parsing errors (script logs these)
- Supabase RLS policies blocking inserts

### Can't find Utah Medicaid after import
```sql
SELECT * FROM payers WHERE name ILIKE '%utah%medicaid%';
```

If not found, check CSV has Utah Medicaid entries.

---

## Next Steps

After successful import:
1. ✅ Update eligibility checker to use database payer lookup
2. ✅ Update claims generator to use `oa_professional_837p_id` (SKUT0)
3. ✅ Build payer selection UI with autocomplete
4. ✅ Add payer configuration management interface
5. ✅ Test claims submission with correct payer ID

---

## Schema Migration Notes

If you have existing `payer_office_ally_configs` table, you can migrate:

```sql
-- Migrate from old config table to new enhanced payers table
INSERT INTO payers (
    name,
    oa_eligibility_270_id,
    payer_type,
    supports_eligibility_270,
    is_tested,
    test_notes
)
SELECT DISTINCT
    poc.payer_display_name,
    poc.office_ally_payer_id,
    poc.category,
    true,
    poc.is_tested,
    poc.test_notes
FROM payer_office_ally_configs poc
ON CONFLICT (name) DO NOTHING;
```

---

**Last Updated**: 2025-10-07
**Status**: Ready for import
**Next**: Run `node import-payers-from-csv.js`
