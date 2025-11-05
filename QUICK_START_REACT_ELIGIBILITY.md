# Quick Start: Dynamic React Eligibility Checker

**TL;DR**: A modern React app that dynamically adapts form fields based on payer-specific requirements. Ready to use now!

---

## 🚀 Get Started in 3 Steps

### Step 1: Start Backend API Server
```bash
node api-server.js
```
✅ API runs on `http://localhost:3000`

### Step 2: Choose Your Mode

**Development Mode** (with hot reload):
```bash
cd public/react-eligibility
npm run dev
```
✅ React app runs on `http://localhost:5174`

**Production Mode** (served by Express):
```bash
# Already configured! Just visit:
# http://localhost:3000/eligibility
```

### Step 3: Test It Out

Visit the app and try checking eligibility for:

**Test Patient: Deanne Stookey**
1. Select Payer: "Regence BlueCross BlueShield"
2. First Name: Deanne
3. Last Name: Stookey
4. DOB: 1981-09-29
5. Member ID: PAM911050467
6. Click "Check Eligibility"
7. ✅ Result: IN_NETWORK, $20 copay

---

## 💡 What Makes This Different?

### Old HTML Interface
- Hardcoded field visibility
- No indication of which fields are required
- One-size-fits-all form

### New React Interface ⚡
- **Dynamic fields** based on selected payer
- **Color-coded** requirements (red=required, yellow=recommended)
- **IntakeQ auto-fill** from patient search
- **Smart validation** handles "OR" requirements (DOB OR Medicaid ID)
- **Graceful fallbacks** if payer not configured

---

## 🎯 Key Features

### 1. Payer Selection with Grouping
```
Medicaid
  ├─ Utah Medicaid ✅
  └─ Molina Healthcare

Commercial
  ├─ Aetna ✅
  ├─ Regence BCBS ✅
  └─ SelectHealth
```

### 2. Requirements Summary
After selecting a payer, see exactly what's needed:
- 🔴 Required fields (3)
- 🟡 Recommended fields (2)
- ⚪ Optional fields (5)

### 3. IntakeQ Integration
- Search patient by name/email
- Auto-fill all available fields
- Shows which required fields are still missing

### 4. Results Display
- ✅ Network status (IN/OUT of network)
- 💰 Copays (PCP, specialist, urgent care)
- 💵 Deductible status
- 📋 Estimated patient costs at Moonlit
- 📍 Patient address from payer

---

## 📂 Where Everything Lives

```
/public/react-eligibility/
├── dist/              ← Production build (already built!)
├── src/
│   ├── components/    ← React components
│   ├── hooks/         ← Custom hooks (usePayerConfig, etc.)
│   └── App.jsx        ← Main app
├── package.json
└── README.md          ← Detailed documentation
```

---

## 🔧 Common Tasks

### Rebuild Production Bundle
```bash
cd public/react-eligibility
npm run build
# Restart API server to serve new build
```

### Add a New Tested Payer
Edit `/src/components/PayerSelector.jsx` line 40:
```javascript
const testedPayers = new Set([
  'UTMCD',
  '60054',
  '00910',
  'YOUR-NEW-PAYER-ID'  // Add here
]);
```

### Change Provider NPI
Edit `/src/components/EligibilityChecker.jsx` line 132:
```javascript
providerNpi: '1336726843' // Change this
```

---

## 🐛 Troubleshooting

**Can't see React app in production?**
```bash
# Make sure you built it first:
cd public/react-eligibility
npm run build

# Restart API server:
pkill -f "node api-server.js"
node api-server.js
```

**IntakeQ search not working?**
```bash
# Check your .env.local has:
INTAKEQ_API_KEY=your-key-here
```

**Getting "Payer not configured" errors?**
- This is expected for new payers
- System shows graceful fallback with all fields
- Contact support to add payer to database

---

## 📖 More Documentation

- **Detailed Guide**: `/public/react-eligibility/README.md`
- **Project Summary**: `/DYNAMIC_ELIGIBILITY_CHECKER_COMPLETE.md`
- **API Documentation**: `/CLAUDE.md`

---

## ✨ What's Next?

The app is **ready to use**! Some ideas for future enhancements:

- [ ] Add provider NPI dropdown
- [ ] Save recent eligibility checks
- [ ] Export results to PDF
- [ ] Dark mode toggle
- [ ] Bulk eligibility checking

---

## 🎉 You're All Set!

The Dynamic React Eligibility Checker is:
- ✅ Built and optimized
- ✅ Integrated with Express
- ✅ Tested with real patients
- ✅ Production-ready

Just start the API server and you're good to go! 🚀

**Production URL**: `http://localhost:3000/eligibility`
**Development URL**: `http://localhost:5174`
