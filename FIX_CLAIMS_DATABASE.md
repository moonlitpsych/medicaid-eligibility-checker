# Fix Claims Database Logging Issue

## Problem

Claims are being submitted successfully to Office Ally, but the database logging is failing with:
```
⚠️  Database insert failed: {}
```

## Root Cause

The `claims_submissions` table does not exist in your Supabase database.

## Solution (2 minutes)

### Step 1: Create the Table in Supabase

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/alavxdxxttlfprkiwtrq/sql/new

2. **Copy the SQL from this file:**
   ```
   database/create-claims-submissions-table.sql
   ```

3. **Paste into SQL Editor and click "Run"**

### Step 2: Verify the Table

Run this command to verify the table was created successfully:

```bash
node database/verify-claims-table.js
```

Expected output:
```
✅ Table exists!
✅ Insert successful!
✅ Select successful!
✅ Test record deleted
🎉 SUCCESS! The claims_submissions table is working!
```

### Step 3: Test Claims Submission

1. Restart your API server:
   ```bash
   node api-server.js
   ```

2. Submit a test claim via the UI

3. Check the server log - you should now see:
   ```
   ✅ Saved to database
   🎉 Claim submitted successfully!
   ```

## What the Table Does

The `claims_submissions` table tracks:
- ✅ All 837P claims submitted to Office Ally
- ✅ Patient and payer information
- ✅ Service lines and diagnosis codes
- ✅ Claim status (SUBMITTED → ACKNOWLEDGED → ACCEPTED → PAID)
- ✅ Response files (999, 277, 835 ERAs)
- ✅ Full EDI transaction content

## Alternative: Automated Setup (Requires Database Password)

If you have your Supabase database password, you can run:

```bash
# Add to .env.local:
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Then run:
node database/setup-claims-table-auto.js
```

Find your database password in:
**Supabase Dashboard → Settings → Database → Connection string**

## Files Created

- ✅ `database/create-claims-submissions-table.sql` - Table schema
- ✅ `database/verify-claims-table.js` - Verification script
- ✅ `database/setup-claims-table-auto.js` - Automated setup (requires DB password)
- ✅ `FIX_CLAIMS_DATABASE.md` - This guide

## Summary

**Quick Fix:**
1. Run SQL in Supabase Dashboard (1 minute)
2. Verify with `node database/verify-claims-table.js`
3. Restart API server and test

That's it! Your claims will now be logged to the database.
