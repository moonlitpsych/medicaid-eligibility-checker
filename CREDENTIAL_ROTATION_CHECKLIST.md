# 🔐 CREDENTIAL ROTATION CHECKLIST

**Date Needed**: ASAP (after git history cleanup)
**Reason**: Credentials exposed in git commits and pushed to remote

---

## 📋 ROTATION PRIORITY ORDER

### 🔴 CRITICAL - Rotate Immediately

#### 1. Office Ally Credentials
**Status**: ⚠️ EXPOSED in 21+ git commits

- [ ] **Contact**: Sheila.Odeen@officeally.com or call (360) 975-7000 option 1
- [ ] **Request**: Password reset for account username `moonlit`
- [ ] **Provide**: Account verification (company name, NPI, etc.)
- [ ] **Receive**: New password
- [ ] **Update**: `.env.local` with new `OFFICE_ALLY_PASSWORD`
- [ ] **Test**: Run eligibility check with Jeremy Montoya
  ```bash
  node universal-eligibility-checker.js Jeremy Montoya 1984-07-17 UTAH_MEDICAID
  ```
- [ ] **Verify**: Response shows enrolled status (not 999 error)
- [ ] **Document**: Store new password in password manager (1Password/LastPass)
- [ ] **Notify**: Team members who need credentials

**Current Exposed Credentials**:
- Username: `moonlit`
- Password: `[REDACTED]` ⚠️ COMPROMISED
- Sender ID: `1161680` (not sensitive, can keep)

---

#### 2. Supabase API Keys
**Status**: ⚠️ EXPOSED in documentation and env files

- [ ] **Login**: https://app.supabase.com
- [ ] **Navigate**: Project Settings → API
- [ ] **Rotate**: Anon key (public)
  - Click "Reset" next to anon/public key
  - Copy new key
  - Update `.env.local`: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Rotate**: Service role key (private)
  - Click "Reset" next to service_role key
  - Copy new key
  - Update `.env.local`: `SUPABASE_SERVICE_KEY`
- [ ] **Test**: Database connectivity
  ```bash
  # Test query using new keys
  curl -X POST 'https://alavxdxxttlfprkiwtrq.supabase.co/rest/v1/rpc/your_function' \
    -H "apikey: NEW_ANON_KEY" \
    -H "Authorization: Bearer NEW_ANON_KEY"
  ```
- [ ] **Update**: Any deployed apps (Vercel, Heroku, etc.)
- [ ] **Verify**: No database errors in application logs

**Current Exposed Keys**:
- Anon key: `[REDACTED]` ⚠️ COMPROMISED
- Service key: `[REDACTED]` ⚠️ COMPROMISED

---

### 🟡 HIGH PRIORITY - Rotate Soon

#### 3. IntakeQ API Key
**Status**: ⚠️ EXPOSED in env files

- [ ] **Login**: https://intakeq.com
- [ ] **Navigate**: Settings → API Keys
- [ ] **Revoke**: Old key `[REDACTED]`
- [ ] **Generate**: New API key
- [ ] **Copy**: New key
- [ ] **Update**: `.env.local` with new `INTAKEQ_API_KEY`
- [ ] **Test**: IntakeQ integration
  ```bash
  curl -X GET 'https://intakeq.com/api/v1/practitioners' \
    -H "X-Auth-Key: NEW_API_KEY"
  ```
- [ ] **Verify**: EMR data sync still working

**Current Exposed Key**:
- API Key: `[REDACTED]` ⚠️ COMPROMISED

---

#### 4. UHIN Credentials
**Status**: ⚠️ EXPOSED in env files (if used in production)

- [ ] **Contact**: UHIN Support at (877) 693-3071
- [ ] **Request**: Password reset for account `MoonlitProd`
- [ ] **Verify**: Account access after reset
- [ ] **Update**: `.env.local` with new `UHIN_PASSWORD`
- [ ] **Test**: UHIN connectivity (if applicable)
- [ ] **Document**: Store new password securely

**Current Exposed Credentials**:
- Username: `MoonlitProd` (can keep)
- Password: `[REDACTED]` ⚠️ COMPROMISED

---

### 🟢 OPTIONAL - Consider Rotating

#### 5. Notifyre SMS Token
**Status**: ℹ️ Check if exposed in code

- [ ] **Review**: Search codebase for Notifyre tokens
  ```bash
  grep -r "NOTIFYRE_AUTH_TOKEN" .
  ```
- [ ] **If exposed**: Contact Notifyre support to rotate
- [ ] **Update**: `.env.local` if rotated
- [ ] **Test**: Send test SMS

---

## 🔧 POST-ROTATION VERIFICATION

### Test All Services
After rotating all credentials:

- [ ] **Office Ally Eligibility Check**
  ```bash
  curl -X POST http://localhost:3000/api/medicaid/check \
    -H "Content-Type: application/json" \
    -d '{"first":"Jeremy","last":"Montoya","dob":"1984-07-17","medicaidId":"0900412827"}'
  ```

- [ ] **Supabase Database Query**
  ```bash
  npm test  # Or your test suite
  ```

- [ ] **IntakeQ EMR Sync**
  ```bash
  # Run your IntakeQ integration test
  ```

- [ ] **Full Application Startup**
  ```bash
  npm start
  # Verify no credential errors in console
  ```

---

## 📝 .env.local Update Template

After rotating all credentials, your `.env.local` should look like:

```bash
# Office Ally (NEW CREDENTIALS)
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc
OFFICE_ALLY_USERNAME=moonlit
OFFICE_ALLY_PASSWORD=NEW_PASSWORD_FROM_OFFICE_ALLY
OFFICE_ALLY_SENDER_ID=1161680
OFFICE_ALLY_RECEIVER_ID=OFFALLY

# UHIN (NEW CREDENTIALS)
UHIN_USERNAME=MoonlitProd
UHIN_PASSWORD=NEW_PASSWORD_FROM_UHIN

# Provider Info (no change needed)
PROVIDER_NPI=1275348807
PROVIDER_NAME=MOONLIT_PLLC

# Supabase (NEW KEYS)
NEXT_PUBLIC_SUPABASE_URL=https://alavxdxxttlfprkiwtrq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=NEW_ANON_KEY_FROM_SUPABASE
SUPABASE_SERVICE_KEY=NEW_SERVICE_KEY_FROM_SUPABASE

# IntakeQ (NEW KEY)
INTAKEQ_API_KEY=NEW_API_KEY_FROM_INTAKEQ
INTAKEQ_PRACTITIONER_ID=685ee0c8bf742b8ede28f37e
INTAKEQ_SERVICE_ID=137bcec9-6d59-4cd8-910f-a1d9c0616319
INTAKEQ_LOCATION_ID=4

# Other (no change needed)
DATABASE_URL=postgresql://user:pass@host:5432/database
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
PORT=3000
SIMULATION_MODE=false
```

---

## 🔒 POST-ROTATION SECURITY

### Update Password Manager
- [ ] Add all new credentials to 1Password/LastPass/etc.
- [ ] Use "Secure Notes" section for sensitive keys
- [ ] Share only with team members who need access
- [ ] Set reminders for quarterly rotation

### Update Deployment Environments
If using Vercel/Heroku/AWS:

- [ ] **Vercel**: Dashboard → Project → Settings → Environment Variables
- [ ] **Heroku**: Dashboard → App → Settings → Config Vars
- [ ] **AWS**: Systems Manager → Parameter Store

### Document Changes
- [ ] Update team wiki with rotation date
- [ ] Notify team of new credential locations
- [ ] Schedule next rotation (3-6 months)

---

## 📞 SUPPORT CONTACTS

### Office Ally
- **Email**: Sheila.Odeen@officeally.com
- **Phone**: (360) 975-7000 option 1
- **Hours**: M-F 8AM-5PM Pacific

### UHIN
- **Phone**: (877) 693-3071
- **Email**: support@uhin.org
- **Hours**: M-F 8AM-5PM Mountain

### Supabase
- **Dashboard**: https://app.supabase.com
- **Docs**: https://supabase.com/docs/guides/platform/access-control#api-keys
- **Support**: support@supabase.com

### IntakeQ
- **Dashboard**: https://intakeq.com
- **Support**: support@intakeq.com
- **Docs**: https://support.intakeq.com/article/45-api-documentation

---

## ✅ COMPLETION CHECKLIST

- [ ] All credentials rotated
- [ ] New credentials tested
- [ ] `.env.local` updated
- [ ] Password manager updated
- [ ] Team notified
- [ ] Deployment environments updated
- [ ] Application verified working
- [ ] Old credentials confirmed disabled
- [ ] Documentation updated
- [ ] Next rotation scheduled

---

## 🎯 ESTIMATED TIME

- **Office Ally**: 15-30 minutes (includes wait for support)
- **Supabase**: 5-10 minutes (instant rotation)
- **IntakeQ**: 5-10 minutes (instant rotation)
- **UHIN**: 15-30 minutes (includes wait for support)
- **Testing**: 30-60 minutes (thorough testing)

**Total**: 1-2 hours

---

## 🚨 IMPORTANT NOTES

1. **Do not rotate credentials until AFTER git history cleanup**
   - Git history cleanup removes exposure from commits
   - Then rotating makes old credentials useless
   - Doing it in reverse order leaves window of vulnerability

2. **Test immediately after rotation**
   - Don't wait to discover broken integrations
   - Have rollback plan ready

3. **Coordinate with team**
   - Notify team before rotation
   - They may need to update local .env.local files
   - Schedule during low-traffic period

4. **Keep old credentials temporarily**
   - Store in secure location for 24-48 hours
   - In case rollback needed
   - Delete permanently after confirmed working

---

**Last Updated**: 2025-10-06
**Next Review**: After git history cleanup complete
