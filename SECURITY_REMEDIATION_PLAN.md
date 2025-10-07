# 🔒 SECURITY REMEDIATION PLAN
## Medicaid Eligibility Checker - Credential Exposure Cleanup

**Date Created**: 2025-10-06
**Severity**: CRITICAL
**Status**: IN PROGRESS

---

## 📊 EXECUTIVE SUMMARY

**Total Exposed Credentials Found**: 21+ files containing hardcoded secrets
**Git Commits Affected**: 5+ commits with exposed credentials
**Credential Types Exposed**:
- Office Ally API credentials (username: `moonlit`, password: `[REDACTED]`)
- UHIN credentials (username: `MoonlitProd`, password: `[REDACTED]`)
- Supabase API keys (anon key, service role key)
- IntakeQ API key (`[REDACTED]`)
- Notifyre SMS tokens (in some files)

---

## 🎯 REMEDIATION PHASES

### PHASE 1: IMMEDIATE PREVENTION (Stop the Bleeding)
**Goal**: Prevent any future commits from exposing credentials

#### Task 1.1: Update .gitignore
- Add `.history/` (VS Code local history extension)
- Add `*.local` files
- Add common credential file patterns
- Add test files with `-live` suffix
- Verify `.env` and `.env.local` already ignored

#### Task 1.2: Create .env.example Template
- Create sanitized template showing required env vars
- Use placeholder values only
- Document what each credential is for
- Include instructions for obtaining credentials

---

### PHASE 2: FILE CLEANSING (Remove All Hardcoded Secrets)
**Goal**: Systematically remove all hardcoded credentials from tracked files

#### Task 2.1: Core Application Files
**Files to cleanse**:
- `routes/eligibility.js` - Office Ally credentials
- `routes/utah-medicaid-working.js` - Office Ally credentials
- `universal-eligibility-checker.js` - Office Ally credentials
- `utah-medicaid-service.js` - Office Ally credentials
- `utah-medicaid-working-service.js` - Office Ally credentials

**Actions**:
- Replace hardcoded `username: 'moonlit'` with `process.env.OFFICE_ALLY_USERNAME`
- Replace hardcoded `password: '[REDACTED]'` with `process.env.OFFICE_ALLY_PASSWORD`
- Replace hardcoded `senderID: '1161680'` with `process.env.OFFICE_ALLY_SENDER_ID`
- Replace hardcoded NPI values with `process.env.PROVIDER_NPI`
- Add validation to check env vars are set

#### Task 2.2: Test Files
**Files to cleanse**:
- `test-office-ally-advanced.js`
- `test-office-ally-exhaustive.js`
- `test-office-ally-final.js`
- `test-office-ally-fixed.js`
- `test-office-ally-nm1-fix.js`
- `test-tella-detailed.js`
- `test-utah-simple.js`
- `debug-uhin-500.js`
- `debug-x12-270-format.js`
- `debug-x12-comparison.js`

**Actions**:
- Replace all hardcoded credentials with env var references
- Add `require('dotenv').config()` to load .env.local
- Add runtime checks for required env vars

#### Task 2.3: Documentation Files
**Files to cleanse**:
- `CLAUDE.md`
- `CM_APP_DEVELOPMENT_ROADMAP.md`
- `HANDOFF_PROMPT_FOR_NEXT_CLAUDE.md`
- `HANDOFF_TO_NEXT_CLAUDE.md`
- `RECOVERY_DAY_DEMO_HANDOFF.md`

**Actions**:
- Replace real credentials with `[REDACTED]` or `your-credential-here`
- Update code examples to show env var usage
- Add notes about obtaining credentials from .env.local

#### Task 2.4: Sample/Debug Files
**Files to cleanse or delete**:
- `jeremy-montoya-soap-sample.xml` - Contains auth tokens
- `.history/.env_20250905175643.local` - Full env file exposure
- `.history/CLAUDE_20250909205622.md` - Credentials in history

**Actions**:
- For sample files: Replace auth tokens with `[REDACTED]`
- For .history files: Delete entire .history directory (it's VS Code local only)

---

### PHASE 3: ENVIRONMENT VARIABLE MIGRATION
**Goal**: Ensure all files properly use environment variables

#### Task 3.1: Verify .env.local Structure
Check that `.env.local` contains all required vars:
```bash
# Office Ally
OFFICE_ALLY_ENDPOINT=
OFFICE_ALLY_USERNAME=
OFFICE_ALLY_PASSWORD=
OFFICE_ALLY_SENDER_ID=
OFFICE_ALLY_RECEIVER_ID=

# UHIN
UHIN_USERNAME=
UHIN_PASSWORD=

# Provider Info
PROVIDER_NPI=
PROVIDER_NAME=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# IntakeQ
INTAKEQ_API_KEY=
INTAKEQ_PRACTITIONER_ID=
INTAKEQ_SERVICE_ID=
INTAKEQ_LOCATION_ID=

# Notifyre
NOTIFYRE_AUTH_TOKEN=
NOTIFYRE_FROM_NUMBER=
```

#### Task 3.2: Add Env Var Validation
Create `utils/env-validator.js` to check required vars at startup:
```javascript
function validateEnv() {
  const required = [
    'OFFICE_ALLY_USERNAME',
    'OFFICE_ALLY_PASSWORD',
    // ... etc
  ];

  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

---

### PHASE 4: GIT HISTORY CLEANUP
**Goal**: Purge all sensitive data from git history

#### Task 4.1: Create Backup
```bash
# Create backup branch before history rewrite
git branch backup-before-history-cleanup
```

#### Task 4.2: Use BFG Repo-Cleaner or git-filter-repo
**Option A: BFG (Recommended - faster, safer)**
```bash
# Install BFG
brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with secrets to remove
cat > secrets.txt <<EOF
[REDACTED]
[REDACTED]
[REDACTED]
***REDACTED-SUPABASE-ANON-KEY***
***REDACTED-SUPABASE-SERVICE-KEY***
EOF

# Run BFG to replace secrets
bfg --replace-text secrets.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Option B: git-filter-repo (More control)**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove files entirely from history
git filter-repo --path .history --invert-paths
git filter-repo --path .env.local --invert-paths

# Or use callbacks to replace content
git filter-repo --replace-text secrets.txt
```

#### Task 4.3: Force Push (DANGER ZONE)
```bash
# WARNING: This rewrites history - coordinate with team first!
git push origin --force --all
git push origin --force --tags
```

---

### PHASE 5: CREDENTIAL ROTATION
**Goal**: Replace all exposed credentials with new ones

#### Task 5.1: Office Ally Credentials
- [ ] Contact Office Ally support
- [ ] Request password reset for account `moonlit`
- [ ] Update `.env.local` with new password
- [ ] Test eligibility check still works
- [ ] Document new credentials in password manager

#### Task 5.2: UHIN Credentials
- [ ] Contact UHIN support
- [ ] Request password reset for `MoonlitProd`
- [ ] Update `.env.local` with new password
- [ ] Test UHIN connectivity (if applicable)

#### Task 5.3: Supabase Keys
- [ ] Log into Supabase dashboard
- [ ] Navigate to Settings > API
- [ ] Reset `anon` key
- [ ] Reset `service_role` key
- [ ] Update `.env.local` with new keys
- [ ] Test database connectivity

#### Task 5.4: IntakeQ API Key
- [ ] Log into IntakeQ dashboard
- [ ] Navigate to API settings
- [ ] Revoke old key `[REDACTED]`
- [ ] Generate new API key
- [ ] Update `.env.local`
- [ ] Test IntakeQ integration

#### Task 5.5: Notifyre SMS Token
- [ ] Check if Notifyre token was exposed
- [ ] If yes, contact Notifyre to rotate token
- [ ] Update `.env.local`
- [ ] Test SMS functionality

---

### PHASE 6: VERIFICATION & MONITORING
**Goal**: Confirm no secrets remain and prevent future exposure

#### Task 6.1: Final Security Scan
```bash
# Use truffleHog or gitleaks
brew install gitleaks
gitleaks detect --source . --verbose

# Or use truffleHog
pip install truffleHog
trufflehog filesystem . --json
```

#### Task 6.2: Setup Pre-commit Hooks
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing secrets
if git diff --cached | grep -E "(password|secret|api_key|token).*=.*['\"][^'\"]{8,}"; then
  echo "🚨 ERROR: Potential secret detected in staged changes!"
  exit 1
fi
```

#### Task 6.3: Add GitHub Secret Scanning (if using GitHub)
- Enable secret scanning in repo settings
- Enable push protection
- Review any alerts

---

## 📋 EXECUTION CHECKLIST

### Pre-Flight Checks
- [ ] Backup repo: `git branch backup-before-cleanup`
- [ ] Verify `.env.local` exists and has all current credentials
- [ ] Verify application currently works with `.env.local`
- [ ] Close any running servers to avoid conflicts

### Execution Order
1. [ ] Phase 1: Update .gitignore and create .env.example
2. [ ] Phase 2: Cleanse all files of hardcoded credentials
3. [ ] Phase 3: Verify env var migration works
4. [ ] Phase 4: Clean git history (AFTER file cleansing)
5. [ ] Phase 5: Rotate all exposed credentials
6. [ ] Phase 6: Final verification and monitoring setup

### Post-Execution
- [ ] Test all functionality still works
- [ ] Verify `npm start` runs without errors
- [ ] Test eligibility check with Jeremy Montoya
- [ ] Review git log to confirm no secrets
- [ ] Run security scanner
- [ ] Update team on credential changes

---

## 🚨 CRITICAL WARNINGS

1. **DO NOT commit .env.local** - It should remain only on local machine
2. **Coordinate force-push** - History rewrite affects all collaborators
3. **Test before rotating** - Ensure env vars work before killing old credentials
4. **Backup first** - Create backup branch before any history rewrite
5. **Rotate after cleanup** - Clean git history first, THEN rotate credentials

---

## 📞 SUPPORT CONTACTS

**Office Ally Support**:
- Email: Sheila.Odeen@officeally.com
- Phone: (360) 975-7000 option 1

**UHIN Support**:
- Phone: (877) 693-3071

**Supabase**:
- Dashboard: https://app.supabase.com
- Docs: https://supabase.com/docs

**IntakeQ**:
- Dashboard: https://intakeq.com
- Support: support@intakeq.com

---

## 📊 SUCCESS METRICS

**Phase 1-3 Complete When**:
- ✅ All 21+ files cleansed of hardcoded credentials
- ✅ All files use environment variables
- ✅ `.env.example` template created
- ✅ Application runs successfully with env vars
- ✅ No secrets in `git grep` search

**Phase 4 Complete When**:
- ✅ Git history contains no secrets
- ✅ BFG/git-filter-repo executed successfully
- ✅ Force push completed (if applicable)

**Phase 5 Complete When**:
- ✅ All exposed credentials rotated
- ✅ Old credentials confirmed disabled
- ✅ Application tested with new credentials

**Phase 6 Complete When**:
- ✅ Security scanner shows 0 secrets
- ✅ Pre-commit hooks installed
- ✅ Team trained on secret management

---

## 🎓 LESSONS LEARNED

**Never Again**:
1. Never hardcode credentials in any file
2. Always use environment variables for secrets
3. Add `.history/` to .gitignore immediately
4. Use pre-commit hooks to catch secrets
5. Regular security scans (weekly/monthly)
6. Use password managers for credential storage
7. Rotate credentials on schedule (quarterly)

---

**END OF REMEDIATION PLAN**
