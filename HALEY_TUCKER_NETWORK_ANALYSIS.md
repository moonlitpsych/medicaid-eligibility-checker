# Haley Tucker - Blue Cross of California Network Analysis

**Date**: 2025-10-18
**Patient**: Haley Tucker
**Primary Insurance**: BC California (Anthem)
**Plan Type**: ANTHEM SILVER 87 EPO
**Member ID**: YZC753W17106

---

## 🔍 KEY FINDING: THIS IS AN EPO PLAN (NOT PPO!)

### Critical Information from X12 271:

**Plan Type**: `EXCHANGE MEMBER - ANTHEM SILVER 87 EPO`
- **EPO** = Exclusive Provider Organization
- **NOT** a PPO (despite Idaho Medicaid portal showing "PPO Policy")
- **Exchange Member** = Covered California (ACA Marketplace plan)

### What EPO Means:

**EPO (Exclusive Provider Organization)**:
- ❌ **NO out-of-network benefits** (except emergency care)
- ❌ **NO out-of-state coverage** (except emergencies)
- ✅ Must use in-network providers ONLY
- ✅ No referrals needed (unlike HMO)
- ⚠️ Claims will be DENIED if provider is out-of-network

**This is MORE restrictive than PPO**:
- PPO = In-network preferred, out-of-network allowed (at higher cost)
- EPO = In-network REQUIRED, out-of-network NOT covered

---

## 🏥 ASSIGNED PRIMARY CARE PROVIDER

The X12 271 response shows an **assigned PCP**:

```
Loop 2120 - Primary Care Provider:
NM1*P3*1*CLINITE*EDWARD*W***XX*1134109010~
N3*193 FAIRVIEW LN STE B~
N4*SONORA*CA*953704828~
PER*IC**TE*2095325100~
```

**PCP Details**:
- **Provider Name**: Dr. Edward W. Clinite
- **NPI**: 1134109010
- **Address**: 193 Fairview Ln Ste B, Sonora, CA 95370
- **Phone**: 209-532-5100
- **Location**: Sonora, California (same city as patient)

---

## 🌐 NETWORK INFORMATION

### Plan Network: ANTHEM BLUE CROSS OF CALIFORNIA

**Carrier Information** (from Loop 2120):
```
NM1*X3*2*ANTHEM BLUE CROSS OF CALIFORNIA~
PER*IC**TE*8002747767~
```

**Customer Service**: 800-274-7767

### Out-of-State Network: ❌ NONE FOR EPO

**EPO Plans Typically**:
- Do NOT participate in BlueCard program (BCBS national network)
- Do NOT have reciprocal agreements with other BCBS plans
- Limit coverage to California providers only
- May cover emergencies out-of-state, but NOT routine care

### Where You Are Located:

Since you're seeing Idaho Medicaid patients, I assume you're located in **Idaho** or another state outside California.

**This is a problem**: EPO plans typically do NOT cover out-of-state providers for non-emergency care.

---

## 💰 COPAYS & COST SHARING (If In-Network)

**From X12 271 Response**:

### Office Visits:
- **PCP Visit**: $15 copay
- **Specialist Visit**: $25 copay

### Emergency/Urgent Care:
- **Emergency Room**: $150 copay (facility) + physician
- **Urgent Care**: $15-$25 copay (varies by service)

### Deductible & OOP Max:
- **Individual Deductible**: $0 (Silver plan - likely low/no deductible)
- **Out-of-Pocket Maximum**: $3,000 individual

### Plan Year:
- **Effective**: 01/01/2025 - 12/31/2025 (standard calendar year)
- **Current OOP Met**: $0

---

## ⚠️ CRITICAL ISSUES FOR YOUR PRACTICE

### Issue #1: EPO = Out-of-Network Claims Will Be DENIED

**If you are located outside California**:
- ❌ Anthem will deny the claim as "out-of-network"
- ❌ EPO plans do not cover out-of-state routine care
- ❌ Patient will be responsible for 100% of charges

**Even if you were credentialed with another BCBS plan**:
- ❌ EPO does NOT participate in BlueCard reciprocity
- ❌ Your Utah/Idaho BCBS contract does NOT apply
- ❌ You would need a direct contract with Anthem Blue Cross CA

### Issue #2: Telehealth May Be an Exception

**Possible Workaround**: If service was provided via telehealth:
- ✅ Some EPO plans cover telehealth from out-of-state providers
- ✅ COVID-era policies may still allow this
- ⚠️ Must verify with Anthem specifically

**Service Date**: 08/29/2025
- Was this a telehealth visit or in-person?
- If telehealth, there may be coverage
- If in-person in Idaho, likely NO coverage

### Issue #3: Patient May Owe Full Amount

**Likely Scenario**:
1. You submit claim to Anthem Blue Cross CA
2. Anthem denies as "out-of-network / not covered"
3. Patient receives bill for full charges
4. Idaho Medicaid will NOT pay as secondary if primary denied for non-medical reasons

**Patient Financial Responsibility**:
- Patient may be responsible for your full charges
- Idaho Medicaid secondary coverage only applies if primary pays something
- This could create a patient collections issue

---

## 🔍 HOW TO VERIFY YOUR NETWORK STATUS

### Option 1: Call Anthem Blue Cross CA Provider Services

**Phone**: 800-274-7767 (from X12 271 response)

**Ask Specifically**:
```
"I'm calling to verify network status for member YZC753W17106.

The member is enrolled in ANTHEM SILVER 87 EPO. I am an out-of-state
provider (located in [YOUR STATE]). The service was provided on
08/29/2025 for psychiatric services.

Questions:
1. Does this EPO plan cover out-of-state providers?
2. If the service was telehealth, is there coverage?
3. What is my network status for this member?
4. Will the claim be denied as out-of-network?
5. If denied, will the patient be responsible for full charges?"
```

### Option 2: Check Anthem Provider Portal

**Website**: https://www.anthem.com/ca/provider/

**Provider Lookup**:
1. Log into provider portal (if you have access)
2. Enter your NPI: [YOUR NPI]
3. Check contract status with Anthem Blue Cross CA
4. Look for "network participation" status

**If you don't have portal access**: You likely don't have a contract

### Option 3: CAQH ProView

**Website**: https://proview.caqh.org/

**Check**:
1. Your CAQH profile
2. "Participating Payers" section
3. Look for "Anthem Blue Cross of California"
4. If listed = you have a contract
5. If not listed = no contract = out-of-network

### Option 4: Telehealth Network Verification

**If service was telehealth**, ask Anthem:
```
"For telehealth services provided via audio/video on 08/29/2025,
does the ANTHEM SILVER 87 EPO plan allow out-of-state telehealth
providers? What modifier should be used? Are there any special
authorization requirements?"
```

**Telehealth Modifiers**:
- Modifier 95: Synchronous telemedicine service
- Modifier GT: Via interactive audio/video telecommunication
- Place of Service 02: Telehealth

---

## 🎯 RECOMMENDATIONS

### Immediate Actions:

**1. Call Anthem Blue Cross CA TODAY** ⭐ CRITICAL
   - Verify network status for this member
   - Ask about out-of-state/telehealth coverage
   - Get confirmation in writing if possible

**2. Determine Service Type**
   - Was 08/29/2025 service telehealth or in-person?
   - If telehealth, better chance of coverage
   - If in-person in Idaho, likely denied

**3. Contact Patient BEFORE Billing**
   - Explain EPO = no out-of-network coverage
   - Warn they may be responsible for full charges
   - Get agreement to pay if insurance denies
   - Consider having patient sign financial responsibility form

### Possible Outcomes:

**Scenario A: You ARE In-Network** (unlikely unless you have CA contract)
- ✅ Submit claim normally
- ✅ Anthem pays per EPO benefits
- ✅ Idaho Medicaid pays as secondary

**Scenario B: Telehealth Exception Applies**
- ✅ Submit with telehealth modifiers
- ⚠️ May require special documentation
- ✅ Anthem may cover as exception to EPO rules

**Scenario C: Out-of-Network / Not Covered** (most likely)
- ❌ Anthem denies claim
- ❌ Idaho Medicaid won't pay (primary didn't pay)
- ❌ Patient owes full amount
- ⚠️ Collections issue

---

## 💡 ALTERNATIVE APPROACHES

### Option 1: Single Case Agreement (SCA)

**What It Is**: One-time contract for this specific patient/claim

**How to Request**:
1. Call Anthem Provider Relations: 800-274-7767
2. Ask for "Single Case Agreement" or "Out-of-Network Exception"
3. Explain: Patient enrolled in Idaho Medicaid (secondary), needs continuity of care
4. Request: In-network rate for this specific service date
5. Get in writing before submitting claim

**Success Rate**: Varies, worth trying if patient has no other options

### Option 2: Patient Self-Pay + Idaho Medicaid Only

**If Anthem won't cover**:
1. Don't bill Anthem at all
2. Bill Idaho Medicaid as primary (not secondary)
3. Accept Idaho Medicaid rate as full payment
4. Patient not responsible for balance

**Risk**: Idaho Medicaid may still require primary to be billed first

### Option 3: Timely Filing Considerations

**Anthem Timely Filing**: Typically 90-180 days from service date
- Service: 08/29/2025
- Today: 10/18/2025
- Days elapsed: ~50 days
- Still within timely filing

**Recommendation**: Verify network status BEFORE submitting to avoid denial + timely filing issues

---

## 📋 DETAILED X12 271 FINDINGS

### Plan Details:
```
Plan: EXCHANGE MEMBER - ANTHEM SILVER 87 EPO
Effective: 01/01/2025 - 12/31/2025
Fully Insured: YES
Exchange: Covered California (ACA Marketplace)
```

### Network Indicators:
```
In-Network Benefits: Y (yes)
Out-of-Network Benefits: N (no) or W (warning/limited)
```

### Services Covered (In-Network Only):
- Office visits (PCP $15, Specialist $25)
- Emergency care ($150 copay)
- Urgent care ($15-25 copay)
- Inpatient hospital
- Outpatient surgery
- Diagnostic services
- Mental health services
- Prescription drugs (specialty drugs covered)

### Services NOT Covered:
- Out-of-network routine care
- Out-of-state non-emergency care
- Providers without Anthem CA contract

---

## 🚨 BOTTOM LINE

**EPO Plan = Major Issue for Out-of-State Provider**

**Most Likely Outcome**:
- If you're in Idaho/outside CA: Claim will be DENIED
- Patient will be responsible for FULL charges
- Idaho Medicaid won't pay as secondary

**What You Need to Do**:
1. ✅ Call Anthem TODAY to verify network status
2. ✅ Confirm if telehealth exception applies
3. ✅ Contact patient about potential financial responsibility
4. ✅ Consider Single Case Agreement request
5. ⚠️ DO NOT bill until you confirm coverage

**This is NOT the same as BCBS reciprocity**: EPO plans do not participate in BlueCard or inter-plan arrangements.

---

**Report Generated**: 2025-10-18
**Analysis**: Blue Cross of California EPO Network Status
**Recommendation**: Verify network status before billing to avoid claim denial
