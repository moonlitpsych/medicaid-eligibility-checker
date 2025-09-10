# 🎯 Recovery Day Demo - CPSS Onboarding System
**Copy-paste this prompt to start your next Claude Code session**

---

## Mission: Complete CPSS Onboarding POC for Recovery Day Demo

You are building a **tablet-optimized patient enrollment system** for Recovery Day where CPSSs will demonstrate seamless Medicaid eligibility verification and instant patient onboarding into a Contingency Management program.

### What's Already Built ✅
- **Real-time Office Ally eligibility API** (400-800ms response times)
- **Database-driven configuration system** with Supabase integration  
- **Enhanced X12 271 parsing** extracting phone, address, Medicaid ID from responses
- **Working test cases**: Jeremy Montoya (ENROLLED), Tella Silver (Aetna with copays)
- **Production API endpoints**: `/api/database-eligibility/check`, `/api/database-eligibility/payers`

### What Needs to Be Built 🎯
1. **Tablet-optimized Vue.js interface** with large touch targets for CPSS use
2. **Auto-populated patient data** from X12 271 eligibility responses
3. **Phone number confirmation flow** ("Is XXX-XXX-XXXX your current smartphone?")
4. **SMS integration** sending secure enrollment link to patient
5. **Connection bridge** to reach-2-0 CM patient app (separate repo in `../reach-2-0`)

### Demo Flow Target
```
CPSS enters: Name + DOB → Real-time eligibility check (<1s) → 
Patient data pre-fills → Phone confirmation → SMS sent → 
Patient clicks link → Consent screen → Identity verification → 
CM app tutorial → Patient earning rewards
```

### Key Requirements
- **Database-first development** (follow patterns in CLAUDE.md)
- **Error handling** for network issues and edge cases
- **Analytics logging** for demo performance tracking
- **Supabase schema extension** for patient enrollment tracking
- **SMS service integration** (Twilio or similar)

### Critical Files
- `RECOVERY_DAY_DEMO_HANDOFF.md` - Complete implementation guide
- `CLAUDE.md` - Database-first patterns and all technical context
- `database-driven-eligibility-service.js` - Ready for enhancement
- `../reach-2-0/` - Patient CM app (analyze but don't modify)

### Success Metrics
- ✅ Patient enrollment in under 2 minutes
- ✅ Zero manual data entry (all auto-populated)
- ✅ Real-time Medicaid verification demonstrable
- ✅ SMS → consent → CM app flow seamless

**Read `RECOVERY_DAY_DEMO_HANDOFF.md` first for complete technical specifications and implementation guide.**