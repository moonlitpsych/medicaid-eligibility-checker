# Payer ID Usage Guide

## ⚠️ CRITICAL: Different IDs for Different Transactions

Office Ally uses **DIFFERENT payer IDs** for different transaction types. Using the wrong ID will cause rejections.

**Example - Utah Medicaid:**
```
Eligibility (270/271): UTMCD
Claims (837P):         U4005   ← DIFFERENT!
Remittance (835):      SKUT0   ← DIFFERENT!
```

## ❌ DON'T: Hardcode Payer IDs

```javascript
// WRONG - Hardcoded and potentially incorrect
const payerId = 'UTMCD';
const claim = {
    payer: {
        id: 'UTMCD' // This is eligibility ID - WRONG for claims!
    }
};
```

## ✅ DO: Use Database-Driven Payer IDs

### Import the Service

```javascript
const {
    getPayerIds,
    getEligibilityPayerId,
    getClaimsPayerId,
    getRemittancePayerId,
    listConfiguredPayers
} = require('./lib/payer-id-service');
```

### For Eligibility Checks (270/271)

```javascript
// Get eligibility payer ID
const payerId = await getEligibilityPayerId('Utah Medicaid Fee-for-Service');
// Returns: 'UTMCD'

// Use in X12 270 request
const x12_270 = `NM1*PR*2*MEDICAID UTAH*****PI*${payerId}~`;
```

### For Claims Submission (837P)

```javascript
// Get claims payer ID
const payerId = await getClaimsPayerId('Utah Medicaid Fee-for-Service');
// Returns: 'U4005'

// Use in claim generation
const claim = {
    payer: {
        name: 'MEDICAID UTAH',
        id: payerId // ✅ CORRECT claims ID
    }
};

const edi837 = generate837P(claim);
```

### For ERA Processing (835)

```javascript
// Get remittance payer ID
const payerId = await getRemittancePayerId('Utah Medicaid Fee-for-Service');
// Returns: 'SKUT0'

// Use when parsing ERA files
const era = parse835(eraFile);
if (era.payerId === payerId) {
    // Process Utah Medicaid remittance
}
```

### Get All Payer IDs at Once

```javascript
// Get all IDs for a payer
const ids = await getPayerIds('Utah Medicaid Fee-for-Service');

console.log(ids);
// {
//     name: 'Utah Medicaid Fee-for-Service',
//     eligibility_270_271: 'UTMCD',
//     claims_837p: 'U4005',
//     remittance_835: 'SKUT0'
// }
```

### List All Configured Payers

```javascript
// See all payers with Office Ally IDs
const payers = await listConfiguredPayers();

payers.forEach(payer => {
    console.log(`${payer.name} (${payer.type}, ${payer.state})`);
    console.log(`  Eligibility: ${payer.ids.eligibility}`);
    console.log(`  Claims: ${payer.ids.claims}`);
    console.log(`  Remittance: ${payer.ids.remittance}`);
});
```

## 📋 Configured Payers (18 Total)

**Utah/Idaho Medicaid:**
- Utah Medicaid Fee-for-Service: `UTMCD` / `U4005` / `SKUT0`
- Idaho Medicaid: `10363` / `MCDID` / `MCDID`
- Molina Utah: `MLNUT` / `SX109` / `SX109`
- SelectHealth Integrated: `13161` / `SX107` / `SX107`
- UUHP: `UNIV-UTHP` / `SX155` / `SX155`
- Optum Salt Lake: `N/A` / `U6885` / `U6885`

**Commercial Payers:**
- Aetna: `60054` / `60054` / `60054`
- Cigna: `N/A` / `62308` / `62308`
- United Healthcare: `UHSS` / `HLPUH` / `N/A`
- Regence BCBS: `00910` / `00910` / `00910`
- TriCare West: `10747` / `99726` / `99726`
- And 7 more...

Run `node -e "require('./lib/payer-id-service').listConfiguredPayers().then(console.log)"` to see the full list.

## 🔍 Error Handling

```javascript
try {
    const payerId = await getClaimsPayerId('Unknown Payer');
} catch (error) {
    // Handle missing payer
    console.error(error.message);
    // "Payer not found: Unknown Payer"
}

try {
    const payerId = await getEligibilityPayerId('Cigna');
} catch (error) {
    // Handle missing ID for this transaction type
    console.error(error.message);
    // "No eligibility payer ID configured for Cigna"
}
```

## 📝 Code Examples

### Example 1: Submit Claim with Database ID

```javascript
const { getClaimsPayerId } = require('./lib/payer-id-service');
const { generate837P } = require('./lib/edi-837-generator');

async function submitClaim(patient, services) {
    // Fetch correct payer ID from database
    const payerId = await getClaimsPayerId('Utah Medicaid Fee-for-Service');

    const claim = {
        patient,
        payer: {
            name: 'MEDICAID UTAH',
            id: payerId // ✅ Database-driven
        },
        serviceLines: services
    };

    const edi837 = generate837P(claim);
    // Upload to Office Ally SFTP...
}
```

### Example 2: Check Eligibility with Database ID

```javascript
const { getEligibilityPayerId } = require('./lib/payer-id-service');

async function checkEligibility(firstName, lastName, dob) {
    // Fetch correct payer ID from database
    const payerId = await getEligibilityPayerId('Utah Medicaid Fee-for-Service');

    const x12_270 = generateX12_270({
        payerId, // ✅ Database-driven
        firstName,
        lastName,
        dateOfBirth: dob
    });

    const response = await officeAlly.send(x12_270);
    return parseX12_271(response);
}
```

### Example 3: Process ERA with Database ID

```javascript
const { getRemittancePayerId } = require('./lib/payer-id-service');

async function processERA(eraFile) {
    const era = parse835(eraFile);

    // Fetch expected payer ID from database
    const expectedPayerId = await getRemittancePayerId('Utah Medicaid Fee-for-Service');

    if (era.payerId === expectedPayerId) {
        console.log('✅ ERA is for Utah Medicaid');
        // Process ERA...
    }
}
```

## 🛠️ Testing

### Test the Payer ID Service

```bash
# List all configured payers
node -e "
const { listConfiguredPayers } = require('./lib/payer-id-service');
listConfiguredPayers().then(payers => {
    payers.forEach(p => console.log(p.name, '-', p.ids));
});
"

# Get Utah Medicaid IDs
node -e "
const { getPayerIds } = require('./lib/payer-id-service');
getPayerIds('Utah Medicaid Fee-for-Service').then(console.log);
"

# Submit test claim with database ID
node submit-test-claim-db.js
```

## 📚 Related Documentation

- **Database Schema**: `database/add-office-ally-columns.sql`
- **Matching Script**: `database/match-and-update-payers.js`
- **Surgical Approach**: `database/SURGICAL-APPROACH-README.md`
- **Main Documentation**: `CLAUDE.md` (see "PAYER ID DATABASE ARCHITECTURE" section)

## ⚡ Quick Reference

| Transaction | Use Function | Column | Example (UT Medicaid) |
|-------------|--------------|--------|----------------------|
| Eligibility (270/271) | `getEligibilityPayerId()` | `oa_eligibility_270_id` | `UTMCD` |
| Claims (837P) | `getClaimsPayerId()` | `oa_professional_837p_id` | `U4005` |
| Remittance (835) | `getRemittancePayerId()` | `oa_remit_835_id` | `SKUT0` |

---

**Remember**: ALWAYS fetch payer IDs from the database. Never hardcode them!
