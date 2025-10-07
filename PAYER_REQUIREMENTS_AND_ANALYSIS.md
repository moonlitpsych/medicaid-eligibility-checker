# 📋 Payer Requirements & X12 271 Response Analysis

**Last Updated**: 2025-10-06
**Status**: Based on production testing with Office Ally

---

## 1️⃣ MINIMUM VIABLE X12 270 REQUIREMENTS BY PAYER

### ✅ **Utah Medicaid (CONFIRMED WORKING)**

**Payer ID**: `UTMCD`
**Provider**: Moonlit PLLC (NPI: 1275348807)

**Minimum Required Fields**:
```
✅ First Name
✅ Last Name
✅ Date of Birth
❌ SSN - NOT required
❌ Medicaid ID - NOT required
❌ Gender - NOT required (causes 999 errors if included!)
```

**Working X12 270 Format**:
```
NM1*IL*1*MONTOYA*JEREMY
DMG*D8*19840717          ← NO GENDER FIELD!
DTP*291*D8*20250911
EQ*30
```

**Test Patient**: Jeremy Montoya (1984-07-17)
**Result**: ✅ Returns full eligibility with coverage details

---

### ⚠️ **Aetna (TESTED - PATIENT NOT FOUND)**

**Payer ID**: `60054`
**Provider**: Travis Norseth (NPI: 1124778121)

**Attempted Fields** (Patient not in system):
```
✅ First Name
✅ Last Name
✅ Date of Birth
❌ SSN - Unknown if required
❌ Member ID - Unknown if required
```

**X12 271 Response**:
```
AAA*N**71*C    ← Patient/Insured Not Found
```

**Status**: ⚠️ Need real Aetna patient to determine minimum requirements

**Recommendation**: Try testing with:
1. ✅ First + Last + DOB only (like Medicaid)
2. If that fails: First + Last + DOB + Member ID
3. If that fails: First + Last + DOB + SSN (last 4)

---

### 🔍 **UUHP (United Healthcare) - UNTESTED**

**Status**: No production testing yet
**Expected Requirements** (based on industry standards):
```
Likely Required:
- First Name
- Last Name
- Date of Birth
- Member ID OR SSN (at least last 4)

May Also Need:
- Gender (M/F)
- Subscriber relationship (self/spouse/child)
```

**Recommendation**: Start with same format as Utah Medicaid, then add fields as needed based on error responses.

---

### 📊 **Summary Table**

| Payer | Payer ID | Provider NPI | First Name | Last Name | DOB | Gender | SSN/ID | Status |
|-------|----------|--------------|------------|-----------|-----|--------|--------|--------|
| Utah Medicaid | UTMCD | 1275348807 | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Working |
| Aetna | 60054 | 1124778121 | ✅ | ✅ | ✅ | ❓ | ❓ | ⚠️ Need patient |
| UUHP | TBD | TBD | ❓ | ❓ | ❓ | ❓ | ❓ | ⬜ Untested |

**Legend**: ✅ Required | ❌ Not needed | ❓ Unknown

---

## 2️⃣ SIMPLE USER INTERFACE FOR TESTING

### ✅ **Available Interface**: `public/universal-eligibility-interface.html`

**Features**:
- ✅ Clean, professional UI with Moonlit branding
- ✅ Multi-payer dropdown (Utah Medicaid, Aetna, Aetna Better Health)
- ✅ Real-time Office Ally integration
- ✅ Response time display
- ✅ Color-coded results (green=enrolled, red=not enrolled)
- ✅ Detailed eligibility breakdown

**How to Use**:

1. **Start server**:
   ```bash
   npm start
   ```

2. **Open interface**:
   ```
   http://localhost:3000/universal-eligibility-interface.html
   ```

3. **Test with known patient**:
   - Payer: Utah Medicaid
   - First Name: Jeremy
   - Last Name: Montoya
   - DOB: 1984-07-17
   - Click "Check Eligibility"

**Screenshot-worthy features**:
- Shows response time (~625ms)
- Displays plan details
- Shows coverage information
- Clean error handling

---

## 3️⃣ X12 271 RESPONSE ANALYSIS - COMMERCIAL PAYERS

### 📊 **What's in an X12 271 Response?**

The X12 271 contains **EB (Eligibility/Benefit) segments** with detailed coverage info.

#### **EB Segment Structure**:
```
EB*[Status]*[Coverage]*[Service]*[Plan]*[Description]**[Copay]*[Percentage]*[Limit]
```

**Status Codes**:
- `1` = Active Coverage
- `3` = Not Active
- `6` = Inactive/Terminated
- `A` = Co-payment
- `B` = Co-insurance
- `C` = Deductible
- `G` = Out of Pocket (Stop Loss)

---

### 💰 **COPAY & DEDUCTIBLE INFORMATION**

#### **Example from Utah Medicaid Response**:

**1. Co-payment Info**:
```
EB*A*IND*30*MC*MENTAL HEALTH INPATIENT***0
     ↑                                    ↑
   Copay                            $0 copay
```

**2. Co-insurance Info**:
```
EB*B*IND*30*MC*MENTAL HEALTH INPATIENT**0
     ↑                                   ↑
Co-insurance                          0%
```

**3. Deductible Info**:
```
EB*C*IND*30*MC*MENTAL HEALTH INPATIENT**0
     ↑                                   ↑
Deductible                           $0
```

**4. Out-of-Pocket Maximum**:
```
EB*G*IND*30*MC*MENTAL HEALTH OUTPATIENT*29*0
     ↑                                  ↑   ↑
Out-of-Pocket                    Time  Amount
                                Period
```

---

### 🏥 **COMMERCIAL PAYER EXAMPLES**

#### **Typical Commercial Insurance EB Segments**:

**Active Coverage with Copay**:
```
EB*1*FAM*30**Health Benefit Plan Coverage
EB*A*IND*30***35        ← $35 copay for office visit
EB*B*IND*30**20         ← 20% coinsurance
EB*C*IND*30**1500       ← $1,500 deductible
EB*G*IND*30**5000       ← $5,000 out-of-pocket max
```

**Deductible Progress** (if payer provides):
```
EB*C*IND*30**1500*****750    ← $1,500 deductible, $750 met
                              (Patient owes $750 more)
```

**In-Network vs Out-of-Network**:
```
EB*1*IND*30*IN***25          ← In-network: $25 copay
EB*1*IND*30*ON***50          ← Out-of-network: $50 copay
```

---

### 📈 **WHAT COMMERCIAL PAYERS TYPICALLY INCLUDE**

Based on industry standards (actual data varies by payer):

| Information | Utah Medicaid | Commercial (Typical) | Notes |
|-------------|---------------|---------------------|-------|
| **Active Coverage** | ✅ Yes | ✅ Yes | All payers |
| **Copay Amount** | ✅ Yes ($0) | ✅ Yes ($10-75) | EB*A segment |
| **Coinsurance %** | ✅ Yes (0%) | ✅ Yes (10-50%) | EB*B segment |
| **Deductible** | ✅ Yes ($0) | ✅ Yes ($500-$10K) | EB*C segment |
| **Deductible Met/Remaining** | ❌ No | ⚠️ Sometimes | Varies by payer |
| **Out-of-Pocket Max** | ✅ Yes ($0) | ✅ Yes ($2K-$15K) | EB*G segment |
| **Out-of-Pocket Met** | ❌ No | ⚠️ Sometimes | Varies by payer |
| **In-Network Status** | ✅ Yes | ✅ Yes | IN/ON codes |
| **Prior Auth Required** | ⚠️ Via MSG | ✅ Usually | EB*R segment |
| **Service Limits** | ⚠️ Via MSG | ✅ Often | Visit limits, etc |

---

### 🔍 **PARSING COPAY/DEDUCTIBLE DATA**

#### **Code to Extract Financial Info**:

```javascript
function parseFinancialInfo(x12_271) {
    const segments = x12_271.split('~');
    const financialInfo = {
        copay: null,
        coinsurance: null,
        deductible: {
            total: null,
            met: null,
            remaining: null
        },
        outOfPocket: {
            max: null,
            met: null,
            remaining: null
        }
    };

    segments.forEach(seg => {
        const parts = seg.split('*');

        if (parts[0] === 'EB') {
            const status = parts[1];
            const amount = parts[7];  // Monetary amount
            const percentage = parts[8]; // Percentage

            // Copay
            if (status === 'A' && amount) {
                financialInfo.copay = parseFloat(amount);
            }

            // Coinsurance percentage
            if (status === 'B' && percentage) {
                financialInfo.coinsurance = parseFloat(percentage);
            }

            // Deductible
            if (status === 'C' && amount) {
                financialInfo.deductible.total = parseFloat(amount);
                // Some payers include met amount in parts[11]
                if (parts[11]) {
                    financialInfo.deductible.met = parseFloat(parts[11]);
                    financialInfo.deductible.remaining =
                        financialInfo.deductible.total - financialInfo.deductible.met;
                }
            }

            // Out-of-Pocket Max
            if (status === 'G' && amount) {
                financialInfo.outOfPocket.max = parseFloat(amount);
                if (parts[11]) {
                    financialInfo.outOfPocket.met = parseFloat(parts[11]);
                    financialInfo.outOfPocket.remaining =
                        financialInfo.outOfPocket.max - financialInfo.outOfPocket.met;
                }
            }
        }
    });

    return financialInfo;
}
```

---

### 🎯 **REAL EXAMPLE: Jeremy Montoya (Utah Medicaid)**

**Parsed Data**:
```json
{
  "program": "TARGETED ADULT MEDICAID",
  "copay": {
    "mentalHealthInpatient": 0,
    "mentalHealthOutpatient": 0,
    "substanceUseDisorder": 0
  },
  "coinsurance": {
    "mentalHealthInpatient": 0,
    "mentalHealthOutpatient": 0
  },
  "deductible": {
    "mentalHealthInpatient": 0,
    "mentalHealthOutpatient": 0
  },
  "outOfPocketMax": 0,
  "coverage": {
    "mentalHealthInpatient": "ACTIVE",
    "mentalHealthOutpatient": "ACTIVE",
    "substanceUseDisorder": "ACTIVE",
    "dentalAdult": "ACTIVE"
  }
}
```

**Key Finding**: Utah Medicaid has $0 copay, $0 deductible for mental health services! 🎉

---

### 💡 **COMMERCIAL PAYER EXPECTATIONS**

Based on typical commercial insurance:

**Aetna/BCBS/UHC Typical Response**:
```
EB*1*IND*30**Mental Health Outpatient
EB*A*IND*30***40                    ← $40 copay per visit
EB*B*IND*30**20                     ← 20% coinsurance after deductible
EB*C*IND*30**2000                   ← $2,000 annual deductible
EB*G*IND*30**6000                   ← $6,000 out-of-pocket max
```

**What This Means for Patient**:
- First visit: Pay full cost until $2,000 deductible met
- After deductible: Pay $40 copay + 20% of remaining cost
- Once $6,000 out-of-pocket reached: Insurance pays 100%

---

## 🚀 **NEXT STEPS FOR TESTING**

### **Phase 1: Get Real Commercial Patient Data**
1. Find patient with active Aetna coverage
2. Get their consent + demographics
3. Test with minimal fields (Name + DOB)
4. Document what additional fields are required

### **Phase 2: Parse Enhanced Financial Data**
1. Update `parseEligibilityResponse()` to extract:
   - Copay amounts
   - Deductible total & remaining
   - Out-of-pocket max & remaining
   - Visit limits
   - Prior auth requirements

2. Display in UI:
   ```
   💰 Patient Financial Responsibility:
   - Copay: $40 per visit
   - Deductible: $750 remaining (of $2,000)
   - Out-of-Pocket: $1,200 remaining (of $6,000)
   - Estimated patient cost: $40-$125 per visit
   ```

### **Phase 3: Multi-Payer Comparison**
1. Build payer comparison table
2. Show which payers require SSN/Member ID
3. Document copay/deductible patterns
4. Create provider guide

---

## 📚 **RESOURCES**

### **X12 271 Specification**:
- [WEDI SNIP Type 3](https://www.wedi.org/resource/resmgr/snips/snip_type_3_eligibility_inqu.pdf)
- EB Segment codes: Appendix A

### **Office Ally Documentation**:
- See: `Realtime EDI Companion Guide.pdf` (in project root)
- Payer-specific requirements may vary

### **Testing Endpoints**:
- **Live Test**: `http://localhost:3000/universal-eligibility-interface.html`
- **API Endpoint**: `POST /api/medicaid/check`
- **Command Line**: `node universal-eligibility-checker.js <first> <last> <dob> <payer>`

---

## ✅ **SUMMARY**

**Question 1**: Minimum requirements per payer
- ✅ **Utah Medicaid**: First + Last + DOB (CONFIRMED)
- ⚠️ **Aetna**: Need real patient to test
- ⬜ **UUHP**: Untested - start with Name + DOB + Member ID

**Question 2**: Simple UI for testing
- ✅ **Available**: `public/universal-eligibility-interface.html`
- ✅ **Works with**: Utah Medicaid, Aetna (dropdown selection)

**Question 3**: Copay/Deductible in X12 271
- ✅ **Yes, available** in EB segments
- ✅ **Utah Medicaid**: Shows $0 copay/$0 deductible
- ⚠️ **Commercial**: Need real Aetna patient to see actual amounts
- ✅ **Can extract**: Copay, Coinsurance %, Deductible, Out-of-Pocket Max
- ⚠️ **Deductible met/remaining**: Varies by payer (not all include)

**Recommended Next Action**:
1. Test UI with Utah Medicaid (Jeremy Montoya) ✅ Ready now
2. Find real Aetna patient for testing
3. Implement enhanced financial data parsing
4. Build patient cost estimator based on benefits

---

**Ready to test?** Start server and visit:
`http://localhost:3000/universal-eligibility-interface.html`
