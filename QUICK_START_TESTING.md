# 🚀 Quick Start Testing Guide

**For**: IntakeQ Integration & Dynamic Payer Loading
**Time**: 10 minutes

---

## Step 1: Run Database Migration (2 min)

1. Open **Supabase Dashboard** → SQL Editor
2. Copy and paste contents of `database/create-intakeq-clients-table.sql`
3. Click **Run**
4. ✅ Expected: "intakeq_clients table created successfully!"

---

## Step 2: Start API Server (1 min)

```bash
cd /Users/macsweeney/medicaid-eligibility-checker
node api-server.js
```

✅ **Look for these lines**:
```
✅ Payers list API registered at /api/payers/list
✅ IntakeQ clients list API registered at /api/intakeq/clients/list
✅ IntakeQ sync API registered at /api/intakeq/clients/sync
```

---

## Step 3: Test Payer API (30 sec)

```bash
curl http://localhost:3000/api/payers/list
```

✅ **Expected**: JSON with 12 payers
```json
{
  "success": true,
  "count": 12,
  "payers": [
    {
      "id": "Utah Medicaid Fee-for-Service",
      "name": "Utah Medicaid Fee-for-Service",
      "type": "Medicaid",
      "state": "UT"
    }
  ]
}
```

---

## Step 4: Sync IntakeQ Patients (1 min)

```bash
curl -X POST http://localhost:3000/api/intakeq/clients/sync
```

✅ **Expected**: Success with sync results
```json
{
  "success": true,
  "message": "IntakeQ clients synced successfully",
  "results": {
    "total": 45,
    "inserted": 45,
    "updated": 0,
    "errors": []
  }
}
```

⏱️ **Note**: May take 10-30 seconds depending on number of clients

---

## Step 5: Test Cached Clients (30 sec)

```bash
curl http://localhost:3000/api/intakeq/clients/list
```

✅ **Expected**: List of synced clients
```json
{
  "success": true,
  "count": 45,
  "clients": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "1985-03-15",
      "primary_insurance_name": "Utah Medicaid"
    }
  ]
}
```

---

## Step 6: Open Web Interface (30 sec)

```
http://localhost:3000/universal-eligibility-interface.html
```

✅ **Check**:
1. Payer dropdown shows: "Utah Medicaid Fee-for-Service (Medicaid, UT)"
2. Status shows: "✅ 12 payers loaded"
3. "🔄 Sync IntakeQ" button appears in header
4. Patient search box is visible

---

## Step 7: Test Patient Search (1 min)

1. Type a patient name in search box (e.g., "Smith")
2. ✅ Expected: Patient results appear
3. Click a patient
4. ✅ Expected:
   - Form auto-fills with patient data
   - Payer auto-selects (if insurance matches)
   - Member ID fills (if available)
   - Green notification: "✅ [Name] selected"

---

## Step 8: Test Eligibility Check (1 min)

1. With patient selected and form filled
2. Click "Check Eligibility"
3. ✅ Expected: Eligibility result displays

---

## Step 9: Test Sync Button (1 min)

1. Click "🔄 Sync IntakeQ" button
2. ✅ Expected:
   - Button shows "Syncing..." with spinner
   - Alert shows sync results
   - Patient list updates

---

## Step 10: Verify Database (1 min)

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM intakeq_clients;
-- Expected: Number of synced clients

SELECT * FROM intakeq_clients LIMIT 5;
-- Expected: Sample patient records
```

---

## 🎉 Success Checklist

- [x] Database table created
- [x] API endpoints responding
- [x] Payers loading dynamically
- [x] IntakeQ sync working
- [x] Patient search working
- [x] Auto-fill working
- [x] Eligibility check working

---

## 🐛 Quick Troubleshooting

### "Failed to load payers"
→ Check: API server running? `/api/payers/list` accessible?

### "No patients found"
→ Run: `curl -X POST http://localhost:3000/api/intakeq/clients/sync`

### "Sync failed"
→ Check: `.env.local` has `INTAKEQ_API_KEY`

### "Patient auto-fill not working"
→ Check: Browser console for errors

---

## 📸 Screenshots to Verify

1. **Payer Dropdown**: Shows 12 payers from database
2. **Patient Search**: Type-ahead results appear
3. **Auto-Fill**: Form fills on patient click
4. **Sync Button**: Shows sync progress
5. **Eligibility Result**: Displays correctly

---

**Total Time**: ~10 minutes
**Status**: ✅ All tests should pass

If all tests pass, the integration is working correctly! 🎉
