# 🔄 WARM HANDOFF TO NEXT CLAUDE CODE SESSION

## 🚨 CRITICAL CONTEXT

You are inheriting a **working but broken** Office Ally X12 270/271 eligibility verification system. The user just rolled back all changes to preserve the working baseline, but there's an active X12 validation error that needs debugging.

## 📋 CURRENT STATUS

### ✅ What's Working
- **Command line tool**: `universal-eligibility-checker.js` connects to Office Ally successfully
- **Response times**: Fast (695-777ms) 
- **API connectivity**: Office Ally SOAP integration is live and responding
- **Multiple payers**: Supports both Utah Medicaid (UTMCD) and Aetna (60054)
- **Web interfaces**: `cpss-interface.html` for CM-specific checks exists

### ❌ Current Problem: X12 999 Validation Error

**Error Pattern (affects both Utah Medicaid and Aetna):**
```
🔍 999 ERROR DETAILS:
   SEGMENT ERROR: IK3*DMG*10**8
   ELEMENT ERROR: IK4*3*1068*7*U
   TXN SET ACK: IK5*R*5
   FUNCTIONAL GROUP ACK: AK9*R*1*1*0
```

**Root Cause**: Office Ally is rejecting the DMG (Demographics) segment, specifically the gender field value `*U` (Unknown). Error code 1068 suggests invalid gender code.

## 🎯 USER'S GOAL

Create a **universal eligibility checker web interface** that can:
1. Check Utah Medicaid (Jeremy Montoya test patient)
2. Check Aetna (Tella Silver test patient)  
3. Use different provider NPIs per payer:
   - Utah Medicaid: Moonlit PLLC (NPI: 1275348807)
   - Aetna: Travis Norseth (NPI: 1124778121)

## 🔧 DEBUGGING STRATEGY

### Step 1: Fix X12 DMG Segment
The issue is in `universal-eligibility-checker.js` line ~88:
```javascript
seg.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
```

**Try these fixes:**
1. **Remove gender entirely**: `DMG*D8*${dob}`
2. **Use valid codes**: `M`, `F`, or omit field
3. **Check Office Ally specs** for acceptable gender values

### Step 2: Test Known Working Patients
```bash
# These should work once DMG is fixed:
node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID
node universal-eligibility-checker.js Tella Silver 1990-05-15 AETNA
```

### Step 3: Build Web Interface (AFTER fixing X12)
Only proceed with web interface after command line tool works.

## 📁 KEY FILES

### Working Files (DO NOT MODIFY without extreme care)
- `routes/eligibility.js` - Office Ally integration (FRAGILE - just restored from git)
- `universal-eligibility-checker.js` - Command line tool (needs DMG fix)
- `server.js` - Express server setup
- `.env.local` - Office Ally credentials

### Interface Files
- `cpss-interface.html` - Working CM-specific interface
- `eligibility-test.html` - Basic Utah Medicaid interface

### Test Data
- **Jeremy Montoya**: DOB 1984-07-17, Medicaid ID 0900412827 (Utah Medicaid)
- **Tella Silver**: DOB 1990-05-15 (Aetna)

## ⚠️ CRITICAL WARNINGS

1. **NEVER modify `routes/eligibility.js`** without understanding X12 270/271 format completely
2. **Office Ally X12 format is EXTREMELY fragile** - one character wrong = 999 error
3. **Test command line first** before building web interfaces
4. **User prefers rolling back** to working state vs. broken features

## 🎯 SUCCESS CRITERIA

1. ✅ Jeremy Montoya returns enrolled status (not 999 error)
2. ✅ Tella Silver returns valid response (enrolled or not enrolled, but not 999 error)  
3. ✅ Web interface that can switch between payers
4. ✅ Different NPIs used per payer (Moonlit vs Travis Norseth)

## 🚀 QUICK START COMMANDS

```bash
# Test current state (will show 999 errors)
node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID

# Check working web interface
open cpss-interface.html
npm start  # starts server on port 3000

# Git status (should be clean after rollback)
git status
```

## 💡 DEBUGGING TIP

The X12 999 error is your immediate priority. Everything else works - this is just a field validation issue in the Demographics segment. Fix this first, then build the universal web interface.

## 📞 HANDOFF COMPLETE

The user has working Office Ally integration that just needs the DMG segment gender field debugged. Focus on the X12 validation error before building new features. Good luck! 🚀