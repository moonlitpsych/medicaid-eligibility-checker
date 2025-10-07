# Patient Copay Collection System - Strategic Vision

**Last Updated:** 2025-10-07
**Status:** Strategy & Planning Phase
**Owner:** Moonlit PLLC

---

## 📋 Executive Summary

Building an integrated **eligibility verification + cost estimation + copay collection** system as an internal tool for Moonlit PLLC. If successful, this could become a product offering for other medical practices.

**Core Philosophy:** Build to solve our own pain, not to sell. Productization is optional and depends on real-world success metrics.

---

## 🎯 The Problem

### **Patient Experience Problems:**

1. **Surprise Medical Bills** - 81% of Americans have received unexpected medical bills
2. **Cost Uncertainty** - Patients can't get straight answers about what they'll owe
3. **Frustrating Experience** - "Call your insurance" → 45 min hold → "We can't tell you until after"
4. **Booking Friction** - Uncertainty about costs creates hesitation to schedule

### **Practice Operations Problems:**

1. **Low Copay Collection Rate** - Practices collect only 60-70% of copays at time of service
2. **Revenue Cycle Inefficiency** - Chasing patients for $20-$50 copays costs MORE than the copay itself
3. **High No-Show Rates** - No financial commitment = 15-20% no-show rates
4. **Staff Time Waste** - Hours spent on phone with insurance, explaining costs, collecting late payments
5. **Poor Patient Experience** - Billing confusion leads to frustration and negative reviews

### **Current Solutions Are Incomplete:**

| What Exists | What's Missing |
|-------------|----------------|
| Eligibility verification (Availity, Waystar) | No cost transparency for patients |
| Payment collection (InstaMed, Cedar) | AFTER the visit, when it's too late |
| Booking systems (Zocdoc, Athena) | No real-time verification, estimates often wrong |
| Cost estimators (various) | Generic, inaccurate, not integrated with booking |

**The Gap:** No one does real-time verification → accurate cost estimate → instant copay collection in a seamless patient booking flow.

---

## 💡 The Solution

### **Core Value Proposition:**

**"Know What You'll Owe Before You Go"**

A three-part system that gives patients cost certainty and practices guaranteed copay collection:

### **1. Real-Time Eligibility Verification** ✅ (Already Built!)

- **Speed:** Sub-second response via Office Ally X12 270/271
- **Accuracy:** Direct from payer, authoritative data
- **Coverage:** All major payers (Medicaid, Aetna, UUHP/HMHI-BHN, etc.)

### **2. Intelligent Cost Estimation** ✅ (Mostly Built!)

- **Payer-Specific Logic:** Understands nuances like HMHI-BHN mental health carve-out
- **Self-Learning:** Improves accuracy by comparing estimates to actual ERA data
- **Confidence Levels:** "You'll owe $25" (high confidence) vs. "Estimated $20-30" (medium)
- **Service-Specific:** Different estimates for intake vs. follow-up visits

**Key Insights Already Discovered:**
- **HMHI-BHN:** Mental health visits = $20-$25 copay only, NO deductible (carve-out!)
- **Utah Medicaid FFS:** $0 patient responsibility (full coverage)
- **Aetna:** Variable based on deductible status + copay amount

### **3. Seamless Copay Collection** 🚧 (Needs Building)

- **Integrated Payment:** Collect copay during booking process (like Stripe checkout)
- **Patient-Friendly:** "Your copay is $25. Pay now to confirm your appointment."
- **Reconciliation:** Track estimate vs. actual, refund if we overcharged
- **No-Show Protection:** Prepaid copay = skin in the game

---

## 🏗️ Roadmap: Build for Moonlit First

### **Philosophy: Internal Tool → Proven Success → Optional Productization**

This is NOT a "build to sell" project. This is a "solve our own problem" project with optionality.

---

## **Phase 1: Perfect the Core (Months 1-6)**

**Goal:** Make the full flow work seamlessly for Moonlit patients

### **What to Build:**

#### **A. Complete the Copay Collection Integration**
- [x] Real-time eligibility check (DONE)
- [x] Accurate cost estimation (DONE)
- [ ] Stripe payment integration
- [ ] "Pay Copay Now" button in eligibility interface
- [ ] Payment confirmation workflow
- [ ] Receipt generation and email
- [ ] Database logging (copay collected, estimate, actual from ERA)

#### **B. Integrate with Booking Flow**
- [ ] Connect to IntakeQ (or current scheduling system)
- [ ] Patient self-service flow: Check eligibility → See cost → Pay copay → Book appointment
- [ ] Staff-assisted flow: Receptionist checks eligibility during phone call → Collects copay → Confirms booking

#### **C. ERA Reconciliation System**
- [ ] Automatically compare cost estimates to actual ERA payments
- [ ] Track accuracy metrics per payer
- [ ] Flag discrepancies for review
- [ ] Auto-refund if overestimated (e.g., said $25, actually $20)
- [ ] Improve estimation algorithm based on actual data

#### **D. Edge Case Handling**
- [ ] What if estimate is wrong? (Refund policy)
- [ ] What if patient has no coverage? (Display full self-pay rate)
- [ ] What if eligibility check fails? (Manual verification process)
- [ ] What if patient cancels? (Refund policy)

### **Success Metrics to Track:**

| Metric | Baseline (Current) | Target (6 Months) |
|--------|-------------------|-------------------|
| **Copay Collection Rate** | ~60-70% | >90% |
| **Estimate Accuracy** | N/A | >85% within $5 |
| **No-Show Rate** | ~15-20% | <10% |
| **Staff Time on Insurance Calls** | ~5-10 hrs/week | <2 hrs/week |
| **Patient Satisfaction (NPS)** | Unknown | >50 |
| **Revenue Cycle Time** | 30-60 days | <30 days |

### **Questions to Answer:**

- Do patients prefer to pay copay at booking or at visit?
- Does showing deductible/cost info upfront increase or decrease booking rate?
- Which payers have the most estimation errors? (Prioritize fixes)
- What's the ideal messaging? "You'll owe $25" vs. "Estimated $20-25"?
- How often do we need to refund due to wrong estimates?

---

## **Phase 2: Optimize & Refine (Months 6-12)**

**Goal:** Make it so smooth that staff and patients barely think about it

### **What to Refine:**

#### **A. Patient-Facing UX**
- [ ] A/B test messaging variants
- [ ] Mobile-friendly interface (most patients book on phones)
- [ ] Spanish language support (if relevant to patient population)
- [ ] Accessibility compliance (WCAG 2.1)

#### **B. Payer Coverage Expansion**
- [ ] Add more payers based on patient volume
- [ ] Improve logic for top 5 payers (most patients)
- [ ] Handle edge cases: dual coverage, Medicare + secondary, etc.

#### **C. Automation**
- [ ] Auto-send eligibility check 48 hrs before appointment (verify coverage didn't change)
- [ ] Auto-remind unpaid copays (if patient didn't pay at booking)
- [ ] Auto-reconcile ERAs to estimates (no manual work)

#### **D. Reporting & Analytics**
- [ ] Dashboard: Copay collection rate, estimate accuracy, revenue metrics
- [ ] Payer performance: Which payers are most profitable? Most accurate?
- [ ] Patient insights: Which demographics have highest booking conversion?

### **Success Metrics (Update):**

- **Copay Collection Rate:** Maintain >90%
- **Estimate Accuracy:** Improve to >90% within $5
- **Staff Time Saved:** Quantify hours/week saved
- **Patient Satisfaction:** Survey scores, NPS, online reviews

---

## **Phase 3: Decision Point (Month 12)**

**Goal:** Decide what to do with this tool

### **Three Key Questions:**

#### **1. Did it work for Moonlit?**

✅ **Success Indicators:**
- Copay collection rate >90%
- Cost estimates accurate >85% of the time
- Staff time saved >5 hours/week
- Patients love it (NPS >50)
- Reduced no-show rates
- Faster revenue cycle

❌ **Warning Signs:**
- Estimate accuracy <70% (too many refunds/complaints)
- Patients confused or frustrated by upfront costs
- More work for staff, not less
- Technical issues cause booking delays

#### **2. Do other practices want it?**

✅ **Positive Signals:**
- Colleagues ask "How do you do that?"
- Practice managers excited when you explain it
- Other practices volunteer to beta test
- Industry peers say "I'd pay for that"

❌ **Negative Signals:**
- Other practices don't see the value
- "That's too complicated for our patients"
- Insurance variability makes them skeptical

#### **3. What's your gut feeling?**

✅ **Productize if:**
- You enjoy building this (energizing, not draining)
- Helping other practices feels rewarding
- You have time/interest to support customers
- Revenue potential is attractive ($5-50M/year business possible)

❌ **Keep Internal if:**
- It's a distraction from clinical work
- Supporting other practices sounds exhausting
- You just want a competitive advantage for Moonlit
- Building a software business doesn't excite you

---

## 🎯 Potential Paths Forward (Month 12+)

### **Option A: Keep as Internal Competitive Advantage**

**What it means:**
- Tool remains proprietary to Moonlit
- Competitive edge in patient experience + operations
- No customer support burden
- Lower copay collection costs than competitors

**Pros:**
- Focus on clinical practice
- No distraction of product business
- Unique selling point for Moonlit ("We tell you what you'll owe upfront!")

**Cons:**
- Miss revenue opportunity
- Other practices build similar tools eventually

---

### **Option B: Minimal Productization (Low-Effort SaaS)**

**What it means:**
- White-label widget for other practices
- Self-service onboarding
- Minimal support (documentation only)
- $99-$299/month pricing

**Effort Required:**
- 10-20 hrs/month ongoing maintenance
- Documentation + video tutorials
- Stripe for payments, Supabase for multi-tenant data

**Revenue Potential:**
- 20 practices × $199/month = $48K/year
- 100 practices × $199/month = $240K/year

**Pros:**
- Passive income stream
- Helps colleagues
- Validates your expertise

**Cons:**
- Some support required
- Compliance burden (HIPAA BAAs)
- Distracts from clinical practice

---

### **Option C: Sell the IP to Existing Player**

**What it means:**
- Approach Kareo, Tebra, Zocdoc, etc.
- Sell the technology/IP outright
- They integrate into their platform
- One-time payment or royalty

**Potential Buyers:**
- Practice management systems (Kareo, Athena, Tebra)
- Booking platforms (Zocdoc, Solv)
- Clearinghouses (Waystar, Change Healthcare)

**Pros:**
- Cash payout (could be $100K-$500K+)
- No ongoing support burden
- Someone else productizes it

**Cons:**
- Lose control over the product
- Competitors get access to your advantage
- Might not get built the way you'd want

---

### **Option D: Full-Time Software Business**

**What it means:**
- Hire team (engineers, support, sales)
- Raise funding ($500K-$2M seed round)
- Go all-in on building $10M+ ARR company
- You become CEO, not just clinician

**Effort Required:**
- 40-60 hrs/week on software business
- Reduce clinical hours or stop practicing
- Fundraising, hiring, sales, operations

**Revenue Potential:**
- 1,000 practices × $299/month = $3.6M ARR
- 5,000 practices × $299/month = $18M ARR

**Pros:**
- Massive impact (help thousands of practices)
- Build valuable company ($50M+ exit possible)
- Solve huge healthcare problem

**Cons:**
- All-consuming (goodbye clinical practice)
- Fundraising is hard
- High risk (most startups fail)

---

## 🎯 Recommended Path (Right Now)

### **Focus on Phase 1: Build for Moonlit**

**Next 6 months:**
1. ✅ Complete eligibility + cost estimation (DONE!)
2. 🚧 Build Stripe copay collection integration
3. 🚧 Integrate with booking flow (IntakeQ or custom)
4. 🚧 Track metrics religiously (copay rate, accuracy, satisfaction)
5. 🚧 Iterate based on real patient/staff feedback

**Decision point at Month 6:**
- Review success metrics
- Gauge external interest (do colleagues ask about it?)
- Assess your energy level (excited to keep building or ready to move on?)

**Then decide:** Keep internal, productize minimally, sell IP, or go big.

**No commitment required now.** Just build a great tool for Moonlit and see what happens.

---

## 📊 Success Metrics Dashboard (To Build)

Track these metrics monthly to measure success:

### **Financial Metrics:**
- **Copay Collection Rate:** % of expected copays collected at time of service
- **Revenue Cycle Time:** Days from service date to payment received
- **Bad Debt Rate:** % of copays never collected
- **Staff Cost Savings:** Hours saved × average staff hourly rate

### **Operational Metrics:**
- **Estimate Accuracy:** % of estimates within $5 of actual copay (from ERA)
- **Eligibility Check Success Rate:** % of checks that return valid data
- **No-Show Rate:** % of appointments where patient doesn't show
- **Booking Conversion Rate:** % of eligibility checks → booked appointments

### **Patient Experience Metrics:**
- **Net Promoter Score (NPS):** "How likely are you to recommend Moonlit?"
- **Patient Satisfaction:** Post-visit survey scores
- **Booking Drop-Off Rate:** % of patients who check cost but don't book
- **Online Reviews:** Mentions of cost transparency in reviews

### **Payer-Specific Metrics:**
- **Accuracy by Payer:** Which payers have most accurate estimates?
- **Response Time by Payer:** Which payers are fastest?
- **Error Rate by Payer:** Which payers have most eligibility check failures?

---

## 🔬 Learning Agenda (Questions to Answer)

As we build and test, we need to answer these questions:

### **Patient Behavior:**
- Do patients book MORE when they know the cost upfront?
- Or does showing the cost scare some patients away?
- Do patients prefer to pay at booking or at visit?
- What messaging works best? ("You'll owe $25" vs. "Your insurance covers this with a $25 copay")

### **Payer Intelligence:**
- **HMHI-BHN:** Mental health carve-out confirmed ($20-25 copay, no deductible)
- **Aetna:** When do they require deductible vs. just copay?
- **Utah Medicaid FFS:** Always $0? Any exceptions?
- **Other payers:** What patterns can we detect from ERAs?

### **Operational:**
- How long does a complete eligibility check + copay collection take?
- Does it add time to the booking process or save time overall?
- What % of estimates need manual review?
- What % of payments need refunds due to inaccurate estimates?

### **Technical:**
- Can we achieve <1 second end-to-end response time (eligibility + cost)?
- Can we handle peak load (e.g., Monday morning when everyone calls to book)?
- Can we maintain 99.9% uptime?
- Can we make it mobile-friendly?

---

## 🛠️ Technical Architecture (High-Level)

### **Current Stack:**
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Eligibility API:** Office Ally X12 270/271
- **Hosting:** Render (deployed and working!)

### **To Add:**
- **Payment Processing:** Stripe (PCI-compliant, easy integration)
- **Scheduling Integration:** IntakeQ API (if using IntakeQ) or custom booking system
- **Monitoring:** Track uptime, response times, error rates
- **Analytics:** Track all success metrics in dashboard

### **Security & Compliance:**
- **HIPAA Compliance:** Supabase BAA, Office Ally BAA, Stripe BAA
- **PCI Compliance:** Stripe handles card data (we never touch it)
- **Data Encryption:** At rest (Supabase) and in transit (TLS)
- **Access Control:** RBAC for staff, patient data isolation

---

## 💭 Long-Term Vision (5 Years Out)

**If this succeeds beyond Moonlit...**

### **The Dream Scenario:**

A world where **every patient knows what they'll owe before they go** to any medical appointment.

- **1,000+ practices** using this system
- **Millions of patients** getting cost transparency
- **Surprise medical bills** drastically reduced
- **Healthcare becomes more like every other service** (know the price upfront)

### **How Moonlit Benefits (Even if We Productize):**

- **Revenue:** $200-500K/year passive income from SaaS (if we go Option B)
- **Impact:** Help thousands of practices improve patient experience
- **Brand:** Moonlit becomes known as innovator in healthcare technology
- **Recruiting:** Attract top clinical talent who want to work at innovative practice
- **Competitive Advantage:** Even if others use it, we built it and know it best

### **How Healthcare Benefits:**

- **Patients:** Cost certainty reduces anxiety and surprise bills
- **Practices:** Higher copay collection, lower no-shows, happier patients
- **Payers:** Fewer billing disputes, faster claims processing
- **System:** Transparency reduces administrative waste

---

## ✅ Immediate Next Steps

**What to do this week:**
1. ✅ Document this vision (DONE - you're reading it!)
2. ✅ Refine HMHI-BHN cost estimation logic (DONE - deployed!)
3. 📋 Review and discuss this roadmap
4. 🎯 Decide: Do we start building the Stripe integration?

**What to do this month:**
- Set up metrics tracking dashboard (simple spreadsheet to start)
- Begin collecting baseline data (current copay collection rate, no-show rate)
- Design the patient-facing copay collection UI (mockups)
- Research Stripe integration requirements

**What to do this quarter (Q4 2025):**
- Build and test Stripe copay collection
- Integrate with booking flow
- Test with first 10-20 Moonlit patients
- Gather feedback and iterate

---

## 🎯 Decision Framework

**When someone asks "Should we productize this?"**

Use this framework to decide:

```
IF (Moonlit metrics are great)
  AND (Other practices are asking for it)
  AND (You're energized by building it)
  AND (You have time/resources to support it)
THEN
  Consider productization
ELSE
  Keep it internal and enjoy the competitive advantage
```

**No pressure to productize.** The internal tool alone is incredibly valuable.

---

## 📝 Notes & Observations

### **Key Insights Discovered (2025-10-07):**

1. **HMHI-BHN Mental Health Carve-Out:**
   - ERA analysis reveals mental health visits bypass deductible entirely
   - Copay only: $20-$25
   - This is HUGE for cost estimation accuracy
   - Patients with HMHI-BHN will love the certainty

2. **Deployment Success:**
   - System deployed to Render and working perfectly
   - Sub-second eligibility checks in production
   - Patient-facing interface is clean and functional

3. **Real-World Value:**
   - Checked Hayden's eligibility - showed deductible info accurately
   - System already providing value for Moonlit patients
   - This proves the concept works in production

### **Questions to Explore:**

- Can we extract copay amount directly from X12 271 for HMHI-BHN?
- Or do we need to hardcode $20-$25 estimate based on ERA analysis?
- How often does HMHI-BHN copay vary ($20 vs $25)? Can we predict it?

---

**End of Document**

---

*This is a living document. Update as we learn, build, and make decisions.*
