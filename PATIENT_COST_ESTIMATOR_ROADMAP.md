# Patient Financial Responsibility Estimator - Implementation Roadmap

**Status**: 📋 Planned (Not Yet Built)
**Priority**: High (After Claims Submission Complete)
**Goal**: Show patients "You will owe approximately $XX for this visit" before booking

---

## 🎯 User Experience Vision

### Current State ✅
```
✅ MOONLIT IS IN-NETWORK
Patient can use their insurance benefits at in-network rates.

💰 Financial Information:
Annual Deductible:
• Total: $1,250.00
• Met So Far: $1,192.00
• Remaining: $58.00

Out-of-Pocket Maximum:
• Total: $4,000.00
• Met So Far: $1,379.63
• Remaining: $2,620.37
```

### Desired State 🎯
```
✅ MOONLIT IS IN-NETWORK

💵 ESTIMATED COST FOR YOUR VISIT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You will likely owe: $58.00 for this appointment

Breakdown:
• Moonlit session fee: $150.00
• Your deductible remaining: $58.00 ← You pay this
• Insurance will cover: $92.00 (after deductible met)
• After this visit, you'll only pay $30 copays!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Financial Information:
[existing financial details...]
```

---

## 🧮 Cost Calculation Logic

### Input Data (Already Available)
From eligibility response, we have:
1. ✅ **Deductible Remaining**: `$58.00`
2. ✅ **Deductible Met**: `$1,192.00`
3. ✅ **Deductible Total**: `$1,250.00`
4. ✅ **OOP Max Remaining**: `$2,620.37`
5. ✅ **Network Status**: `IN_NETWORK`
6. ⚠️ **Copay Amount**: Not always present (need to handle)
7. ⚠️ **Coinsurance %**: Not always present (need to handle)

### What We Need to Add
1. **Moonlit Fee Schedule** (by service type)
   - Therapy session (90834): $150
   - Therapy session (90837): $180
   - Initial evaluation (90791): $200
   - Psychiatric evaluation (90792): $250
   - Med management (99214): $200
   - etc.

2. **Service Type Selector**
   - User picks: "Individual Therapy", "Initial Evaluation", etc.
   - System looks up corresponding CPT code and fee

### Calculation Algorithm

```javascript
function calculatePatientResponsibility(eligibilityData, serviceType) {
    const moonlitFee = MOONLIT_FEE_SCHEDULE[serviceType]; // e.g., $150 for 90834
    const deductibleRemaining = eligibilityData.copayInfo.deductibleRemaining; // $58
    const copay = eligibilityData.copayInfo.primaryCareCopay; // e.g., $30 (if present)
    const coinsurance = eligibilityData.copayInfo.primaryCareCoinsurance; // e.g., 20% (if present)

    let patientOwes = 0;
    let insuranceCovers = 0;
    let breakdown = [];

    // Step 1: Check if deductible has been met
    if (deductibleRemaining > 0) {
        // Patient pays toward deductible first
        const deductiblePayment = Math.min(moonlitFee, deductibleRemaining);
        patientOwes += deductiblePayment;
        breakdown.push({
            description: `Toward your deductible`,
            amount: deductiblePayment
        });

        // Remaining amount after deductible
        const remainingAfterDeductible = moonlitFee - deductiblePayment;

        if (remainingAfterDeductible > 0) {
            // After deductible is met, apply copay or coinsurance
            if (copay) {
                patientOwes += copay;
                insuranceCovers = remainingAfterDeductible - copay;
                breakdown.push({
                    description: `Copay (deductible met after this visit)`,
                    amount: copay
                });
            } else if (coinsurance) {
                const coinsuranceAmount = remainingAfterDeductible * (coinsurance / 100);
                patientOwes += coinsuranceAmount;
                insuranceCovers = remainingAfterDeductible - coinsuranceAmount;
                breakdown.push({
                    description: `Coinsurance (${coinsurance}%)`,
                    amount: coinsuranceAmount
                });
            } else {
                // No copay or coinsurance info - assume full coverage after deductible
                insuranceCovers = remainingAfterDeductible;
            }
        }
    } else {
        // Deductible already met - apply copay or coinsurance only
        if (copay) {
            patientOwes = copay;
            insuranceCovers = moonlitFee - copay;
            breakdown.push({
                description: `Copay`,
                amount: copay
            });
        } else if (coinsurance) {
            const coinsuranceAmount = moonlitFee * (coinsurance / 100);
            patientOwes = coinsuranceAmount;
            insuranceCovers = moonlitFee - coinsuranceAmount;
            breakdown.push({
                description: `Coinsurance (${coinsurance}%)`,
                amount: coinsuranceAmount
            });
        } else {
            // No copay or coinsurance info - conservative estimate
            patientOwes = 0;
            insuranceCovers = moonlitFee;
            breakdown.push({
                description: `Estimated insurance coverage (exact copay unknown)`,
                amount: 0,
                note: 'Your actual copay will be determined at checkout'
            });
        }
    }

    return {
        patientOwes: patientOwes.toFixed(2),
        insuranceCovers: insuranceCovers.toFixed(2),
        moonlitFee: moonlitFee.toFixed(2),
        breakdown,
        deductibleWillBeMet: deductibleRemaining > 0 && deductibleRemaining <= moonlitFee,
        futureVisitCost: copay ? copay.toFixed(2) : null
    };
}
```

### Example Calculations

**Hayden Cook's Scenario (from actual data):**
- Deductible remaining: $58
- Deductible total: $1,250
- Service: Individual Therapy (90834) = $150 fee

```
Calculation:
1. Patient pays first $58 toward deductible
2. Deductible is now met! ($58 out of $58 remaining)
3. Remaining visit cost: $150 - $58 = $92
4. If copay is $30: Patient pays $30 more
5. Insurance covers: $92 - $30 = $62

Total patient owes: $58 + $30 = $88
```

**Patient with Deductible Already Met:**
- Deductible remaining: $0
- Copay: $30
- Service: Individual Therapy (90834) = $150 fee

```
Calculation:
1. Deductible already met
2. Patient pays copay only: $30
3. Insurance covers: $150 - $30 = $120

Total patient owes: $30
```

**Patient with Coinsurance Instead of Copay:**
- Deductible remaining: $0
- Coinsurance: 20%
- Service: Initial Evaluation (90791) = $200 fee

```
Calculation:
1. Deductible already met
2. Patient pays 20% coinsurance: $200 × 0.20 = $40
3. Insurance covers: $200 - $40 = $160

Total patient owes: $40
```

---

## 📋 Implementation Steps

### 1. Create Moonlit Fee Schedule (15 minutes)
**File**: `lib/moonlit-fee-schedule.js`

```javascript
module.exports = {
    // Psychotherapy Services
    '90832': { cpt: '90832', description: 'Psychotherapy 30 min', fee: 120 },
    '90834': { cpt: '90834', description: 'Psychotherapy 45 min', fee: 150 },
    '90837': { cpt: '90837', description: 'Psychotherapy 60 min', fee: 180 },
    '90846': { cpt: '90846', description: 'Family Therapy w/o Patient', fee: 150 },
    '90847': { cpt: '90847', description: 'Family Therapy w/ Patient', fee: 180 },

    // Diagnostic Services
    '90791': { cpt: '90791', description: 'Psychiatric Diagnostic Evaluation', fee: 200 },
    '90792': { cpt: '90792', description: 'Psych Eval w/ Medical Services', fee: 250 },

    // Medication Management
    '99214': { cpt: '99214', description: 'Office Visit - Established (Moderate)', fee: 200 },
    '99215': { cpt: '99215', description: 'Office Visit - Established (High)', fee: 250 },

    // Contingency Management (if applicable)
    'H0038': { cpt: 'H0038', description: 'Peer Support (per 15 min unit)', fee: 21.16 }
};
```

### 2. Create Cost Estimator Function (30 minutes)
**File**: `lib/patient-cost-estimator.js`

Implement the `calculatePatientResponsibility()` function from above with:
- All calculation logic
- Edge case handling (missing copay data, etc.)
- Conservative estimates when data is incomplete
- Clear messaging about what's guaranteed vs estimated

### 3. Update Database-Driven Eligibility API (15 minutes)
**File**: `database-driven-api-routes.js`

Add cost estimation to the eligibility check response:

```javascript
// After extracting financial info
if (eligibilityResult.copayInfo && eligibilityResult.copayInfo.isInNetwork) {
    const { calculatePatientResponsibility } = require('./lib/patient-cost-estimator');

    // Calculate for most common service types
    eligibilityResult.estimatedCosts = {
        therapy45min: calculatePatientResponsibility(eligibilityResult, '90834'),
        therapy60min: calculatePatientResponsibility(eligibilityResult, '90837'),
        initialEval: calculatePatientResponsibility(eligibilityResult, '90791')
    };
}
```

### 4. Update UI to Display Cost Estimate (45 minutes)
**File**: `public/universal-eligibility-interface.html`

Add new section after network status banner:

```html
${data.estimatedCosts ? `
    <div class="mt-4 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
        <p class="text-lg font-bold text-blue-900 mb-2">
            💵 ESTIMATED COST FOR YOUR VISIT
        </p>

        <div class="space-y-3">
            ${renderCostEstimate(data.estimatedCosts.therapy45min, '45-Minute Therapy Session')}
            ${renderCostEstimate(data.estimatedCosts.therapy60min, '60-Minute Therapy Session')}
            ${renderCostEstimate(data.estimatedCosts.initialEval, 'Initial Evaluation')}
        </div>

        <p class="text-xs text-blue-600 mt-3">
            💡 These are estimates based on your current benefits.
            Actual costs confirmed at checkout.
        </p>
    </div>
` : ''}
```

### 5. Add Service Type Selector for Detailed Estimate (Optional) (30 minutes)
Allow user to select specific service type for more personalized estimate:

```html
<select id="serviceTypeSelector">
    <option value="90834">Individual Therapy (45 min)</option>
    <option value="90837">Individual Therapy (60 min)</option>
    <option value="90791">Initial Evaluation</option>
    <option value="99214">Medication Management</option>
</select>
<button onclick="showDetailedEstimate()">Calculate My Cost</button>
```

---

## 🎨 UI/UX Enhancements

### Visual Design Principles
1. **Bold, Clear Numbers** - Patient should see "$58" immediately
2. **Positive Framing** - "After this visit, you'll only pay $30 copays!"
3. **Simple Breakdown** - Show math but keep it digestible
4. **Confidence Indicator** - Show when estimate is guaranteed vs approximate

### Messaging Guidelines

**When Deductible Remaining:**
```
✅ You will likely owe $88 for this visit

Here's why:
• $58 goes toward your deductible (only $58 left!)
• $30 copay after deductible is met
• After this visit, you'll only pay $30 copays! 🎉
```

**When Deductible Met:**
```
✅ You will owe $30 for this visit

Your deductible is already met, so you only pay your copay!
```

**When Copay Data Missing:**
```
💡 Estimated cost: $0 - $50 for this visit

Your insurance will cover most or all of this visit since your
deductible is met. We'll confirm your exact copay at checkout.
```

**When Out-of-Network:**
```
⚠️ Estimated cost: $150 - $200 for this visit (out-of-network rates)

Moonlit may not be in-network with your plan. You may have higher
out-of-pocket costs. We recommend verifying network status.
```

---

## 🧪 Testing Scenarios

### Test Case 1: Hayden Cook (UUHP)
**Input:**
- Deductible remaining: $58
- Copay: Unknown (need to check for mental health copay in X12 271)
- Service: 90834 ($150)

**Expected Output:**
- Patient owes: $58 (if copay found, add it)
- Deductible will be met after visit
- Future visits: Show copay amount

### Test Case 2: Patient with Deductible Met
**Input:**
- Deductible remaining: $0
- Copay: $30
- Service: 90834 ($150)

**Expected Output:**
- Patient owes: $30
- Simple, clear message

### Test Case 3: Patient with High Deductible
**Input:**
- Deductible remaining: $5,000
- Service: 90834 ($150)

**Expected Output:**
- Patient owes: $150 (full session fee toward deductible)
- Show progress: "You'll have $4,850 deductible remaining"

### Test Case 4: Commercial Payer with Coinsurance
**Input:**
- Deductible remaining: $0
- Coinsurance: 20%
- Service: 90791 ($200)

**Expected Output:**
- Patient owes: $40 (20% of $200)
- Show: "You pay 20%, insurance covers 80%"

---

## 🚀 Rollout Strategy

### Phase 1: Staff-Facing (Low Risk)
- Deploy cost estimator in eligibility checker
- Train staff to use it during phone intake
- Collect feedback on accuracy
- Refine calculations based on actual claim payments

### Phase 2: Patient Portal (High Impact)
- Add to patient-facing eligibility page
- Show during booking flow
- Collect payment upfront if confident in estimate
- A/B test messaging ("You will owe" vs "Estimated cost")

### Phase 3: Automated Payment Collection (Ultimate Goal)
- Charge card on file for estimated amount
- Adjust after claim is paid (refund if overcharged)
- Reduce no-shows (patients prepaid)
- Faster revenue cycle

---

## 🎯 Success Metrics

**Staff Efficiency:**
- ✅ Reduce "how much will this cost?" calls by 80%
- ✅ Staff can answer cost questions in <30 seconds

**Patient Experience:**
- ✅ Patients know their financial responsibility before booking
- ✅ No surprise bills after appointments
- ✅ Higher satisfaction scores

**Business Impact:**
- ✅ Reduce bad debt (patients know cost upfront)
- ✅ Improve collections (prepayment)
- ✅ Reduce no-shows (financial commitment)

---

## ⚠️ Important Considerations

### Accuracy Guarantees
**Never say** "You will owe exactly $XX" if:
- Copay amount is not in X12 271 response
- Claims could be processed differently
- Network status is uncertain

**Always say** "Estimated" or "Likely" when:
- Missing copay/coinsurance data
- First time using this payer
- Complex benefit structures

### Legal/Compliance
- Include disclaimer: "Estimates based on current benefits. Actual costs confirmed at checkout."
- Don't guarantee costs unless 100% certain
- Log all estimates for audit trail
- Update fee schedule when rates change

### Edge Cases to Handle
1. **Patient has secondary insurance** - We only check primary
2. **Benefit year changes mid-appointment** - Deductible resets
3. **Claims denied** - Patient owes full amount
4. **Out-of-network surprise** - Much higher cost
5. **Service not covered** - Full patient responsibility

---

## 🔗 Integration Points

### With IntakeQ (Current Workflow)
- Pull patient eligibility before booking confirmation
- Show cost estimate in appointment confirmation email
- Store estimate in patient record

### With Claims System (Future)
- Compare estimate vs actual claim payment
- Refine calculation algorithm based on actuals
- Track estimation accuracy per payer

### With Payment Processing (Future)
- Charge estimated amount at booking
- Adjust after claim is paid
- Refund overpayments automatically

---

## 📚 Related Files & Documentation

**New Files to Create:**
1. `lib/moonlit-fee-schedule.js` - CPT codes and fees
2. `lib/patient-cost-estimator.js` - Calculation logic
3. `test/patient-cost-estimator.test.js` - Unit tests

**Files to Modify:**
1. `database-driven-api-routes.js` - Add cost estimates to response
2. `public/universal-eligibility-interface.html` - Display estimates
3. `CLAUDE.md` - Update with cost estimator feature

**Documentation:**
1. This file (`PATIENT_COST_ESTIMATOR_ROADMAP.md`)
2. User guide for staff
3. Patient-facing FAQ: "Understanding Your Estimated Cost"

---

## 💭 Future Enhancements

### Smart Estimation (Machine Learning)
- Track actual vs estimated costs
- Learn payer-specific quirks
- Improve accuracy over time

### Multi-Session Packages
- "If you book 10 sessions today, total cost: $300"
- Show savings for prepayment
- Automatic billing per session

### Sliding Scale Integration
- Check financial assistance eligibility
- Show discounted rate if qualified
- Apply sliding scale to estimate

### Insurance Optimizer
- "You've met your deductible! Book more sessions now before year-end"
- "You're close to OOP max ($200 left). After that, visits are free!"
- Financial planning for patients

---

## ✅ Ready to Build When You Are!

**Estimated Build Time:** 2-3 hours total
- ✅ All data already available from X12 271 response
- ✅ UI framework already in place
- ✅ Just needs calculation logic + display

**Dependencies:**
- None! Can build immediately after claims system is done

**Risk Level:** Low
- Conservative estimates when data is missing
- Clear disclaimers about accuracy
- Easy to refine based on real-world feedback

---

**Next Focus:** Claims Submission (SFTP + EDI 837/835 Parsing) 🚀

Let me know when you're ready to build this - it'll be quick and impactful!
