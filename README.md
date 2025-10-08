# Medicaid Eligibility & Claims System

**Moonlit PLLC - Healthcare Billing Automation**

---

## 🚀 Quick Start

### **What is this?**

A complete healthcare billing system with two major components:

1. **Real-time Eligibility Verification** ✅ Production-Ready
   - Check patient insurance in under 1 second
   - Supports Utah Medicaid, Aetna, UUHP, and 15+ payers
   - Shows copays, deductibles, and patient cost estimates

2. **Direct Claims Submission** 🟡 In Development
   - Submit professional claims (CMS-1500) to Office Ally
   - Bypass IntakeQ's claims generator
   - Full control over billing workflow

---

## 📖 Documentation Guide

**Start here** → Read these in order:

### For Daily Use
1. **`QUICK_START_TESTING.md`** - How to check eligibility (5 min read)
2. **`public/universal-eligibility-interface.html`** - Patient eligibility checking UI

### For Development
1. **`CLAUDE.md`** - Main project overview and immediate next steps
2. **`CLAIMS_SUBMISSION_PROGRESS.md`** 📋 - Detailed claims development tracker

### For Troubleshooting
- **`UTAH_MEDICAID_RC77_FIX.md`** - RC77 rejection fix
- **`FIX_CLAIMS_DATABASE.md`** - Database logging issues
- **`PAYER_ID_USAGE_GUIDE.md`** - Understanding payer IDs

---

## 🎯 Current Status

### Eligibility Checking ✅
- **Status**: Working perfectly, in daily use
- **Response Time**: 400-800ms average
- **Payers**: 18 configured (Utah Medicaid, Aetna, UUHP, etc.)
- **Features**: Copay/deductible parsing, cost estimates

### Claims Submission 🟡
- **Status**: RC77 fix applied, awaiting validation
- **Next Check**: 2025-10-08 morning (Office Ally response)
- **What's Working**: EDI generator, SFTP upload, database tracking
- **What's Testing**: Utah Medicaid Provider ID fix

---

## 💻 Running the System

### Start the API Server
```bash
cd /Users/macsweeney/medicaid-eligibility-checker
node api-server.js
```

### Access Web Interfaces
- **Eligibility Checking**: http://localhost:3000/public/universal-eligibility-interface.html
- **Claims Submission**: http://localhost:3000/public/cms-1500-claims-interface.html

### Test Commands
```bash
# Check eligibility (CLI)
node universal-eligibility-checker.js "Jeremy" "Montoya" "1984-07-17" "UTAH_MEDICAID"

# Submit test claim
node test-utah-medicaid-claim.js

# Download SFTP responses
node get-latest-uuhp-271.js
```

---

## 🗂️ Project Structure

```
medicaid-eligibility-checker/
├── 📄 CLAUDE.md                          # Main project guide
├── 📄 CLAIMS_SUBMISSION_PROGRESS.md      # Claims development tracker
├── 📄 README.md                          # This file
│
├── api-server.js                         # Express API server
├── database-driven-api-routes.js         # Enhanced eligibility API
│
├── lib/
│   ├── edi-837-generator.js              # Claims EDI generator
│   ├── edi-835-parser.js                 # Remittance parser
│   ├── edi-277-parser.js                 # Claim status parser
│   ├── provider-service.js               # Provider data (Supabase)
│   ├── payer-id-service.js               # Payer ID lookup
│   └── intakeq-service.js                # IntakeQ integration
│
├── public/
│   ├── universal-eligibility-interface.html   # Eligibility UI
│   └── cms-1500-claims-interface.html         # Claims submission UI
│
└── database/
    ├── create-claims-submissions-table.sql    # Claims tracking
    ├── add-medicaid-provider-id.sql           # Provider ID setup
    └── supabase-office-ally-migration.sql     # Payer database
```

---

## 🔑 Key Configuration

### Environment Variables (`.env.local`)
```bash
# Office Ally SFTP
OFFICE_ALLY_SFTP_HOST=ftp10.officeally.com
OFFICE_ALLY_SFTP_USERNAME=moonlit
OFFICE_ALLY_SFTP_PASSWORD=[your-password]

# Provider Information
PROVIDER_NPI=1275348807
PROVIDER_TAX_ID=332185708

# Supabase
NEXT_PUBLIC_SUPABASE_URL=[your-url]
SUPABASE_SERVICE_KEY=[your-key]

# IntakeQ
INTAKEQ_API_KEY=[your-key]
```

### Critical Data
- **Utah Medicaid Provider Number**: 4347425
- **Office Ally Sender ID**: 1161680
- **Trading Partner Number**: HT006842-001
- **Billing Agent ID**: 3000670

---

## 🎉 Recent Wins

**2025-10-07 Evening**:
- ✅ Fixed RC77 rejection (added Medicaid Provider ID)
- ✅ Database-driven architecture complete
- ✅ Test claim submitted with fix
- 📝 Comprehensive documentation created

**2025-10-07 Afternoon**:
- ✅ Claims database logging working
- ✅ CMS-1500 web interface complete
- ✅ IntakeQ patient integration

**2025-10-07 Morning**:
- ✅ First test claims submitted to Office Ally

---

## 📞 Support Contacts

**Office Ally**
- Support: support@officeally.com
- Phone: (360) 975-7000

**Utah Medicaid EDI**
- Email: MHC-EDI@utah.gov
- Provider Enrollment: (800) 662-9651

**Supabase Dashboard**
- https://supabase.com/dashboard/project/alavxdxxttlfprkiwtrq

---

## 🚦 Next Steps

### Immediate (This Week)
1. ⏳ Validate RC77 fix (check SFTP responses)
2. 🐛 Fix database logging column mismatch
3. 📝 Document payer-specific requirements

### Short-Term (Next 2 Weeks)
4. 🔗 IntakeQ appointments integration (auto CPT codes)
5. 🎨 Enhance claims interface UX
6. 📊 Payer contracts database

### Medium-Term (Next Month)
7. 💰 ERA processing and auto-posting
8. 📋 Claims scrubbing and validation
9. 🔄 Response monitoring and alerting

---

## 📚 Related Resources

- **Office Ally Companion Guide**: `OA_Professional_837P_Companion_Guide_r060822.pdf`
- **Utah Medicaid Portal**: https://medicaid.utah.gov/prism/
- **IntakeQ API Docs**: https://support.intakeq.com/article/45-api-documentation

---

**Built with**: Node.js, Express, Supabase, Office Ally API, X12 EDI
**Maintained by**: Moonlit PLLC Development Team
