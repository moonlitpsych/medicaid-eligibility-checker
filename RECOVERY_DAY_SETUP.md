# 🎯 Recovery Day Demo - Quick Setup Guide

All 5 critical fixes have been implemented successfully! The system is now ready for Recovery Day with dynamic phone numbers, real SMS integration, and seamless patient app access.

## ✅ Completed Fixes

1. **✅ FIX 1: Dynamic Phone Numbers** - Demo participants can now enter their own phone numbers
2. **✅ FIX 2: Demo Visitor Tracking** - API endpoint to store visitor info for follow-up
3. **✅ FIX 3: Dynamic SMS Service** - SMS messages personalized with visitor names
4. **✅ FIX 4: Patient App Server** - Serves reach-2-0 app from this directory
5. **✅ FIX 5: Deployment Configuration** - Ready for both local and production deployment

## 🚀 Quick Start (2 minutes)

### Option A: Local Demo
```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start both servers
./start-demo.sh

# 3. Open demo page
# http://localhost:3000/test-complete-patient-flow.html
```

### Option B: Internet-Accessible Demo (for real SMS)
```bash
# 1. Start local servers first
./start-demo.sh

# 2. In another terminal, start ngrok tunnels  
./start-ngrok.sh

# 3. Use the ngrok URLs provided for real SMS testing
```

## 📱 Demo Flow

1. **CPSS Interface** (`/test-complete-patient-flow.html`)
   - Enter visitor name, role, and phone number
   - Check eligibility (instant mock response)
   - Confirm phone number with visitor
   - Send real SMS to visitor's phone

2. **SMS Experience**
   - Visitor receives: "Hi [VisitorName]! This is the Moonlit CM demo for Alex Demo. Experience the patient app here: [link]"
   - Link opens enrollment bridge on their mobile device

3. **Patient App** (served from reach-2-0)
   - Auto-authentication from SMS token
   - Welcome screen with 25 bonus points
   - Drug test interface (+15 points)
   - Roulette wheel for cash prizes (25+ points)

## 🌐 Environment Variables

For production deployment, set:

```bash
# SMS Service
DEPLOYMENT_URL=https://your-app.vercel.app
NOTIFYRE_AUTH_TOKEN=your-notifyre-token
NOTIFYRE_FROM_NUMBER=+13855130681

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

## 🎭 Demo Script for Recovery Day

### Opening (30 seconds)
> "I'm going to show you how we enroll patients into our Contingency Management program using real-time Medicaid verification and SMS integration."

### Patient Entry (1 minute)
1. Enter demo visitor's information
2. Show instant eligibility verification
3. Explain Traditional Medicaid FFS detection

### SMS Demo (1 minute)
4. Confirm visitor's phone number
5. Send real SMS to their phone
6. Have them open the link on their device

### Patient App Experience (2 minutes)
7. Show enrollment bridge auto-authentication
8. Walk through patient app features
9. Demonstrate point system and rewards

### Closing (30 seconds)
> "This entire flow takes under 5 minutes in real acute care settings, with all visitor data captured for follow-up."

## 📊 Database Schema (for Supabase)

```sql
-- Add to your Supabase database
CREATE TABLE demo_visitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    organization TEXT,
    consent_to_follow_up BOOLEAN DEFAULT false,
    demo_date TIMESTAMP DEFAULT NOW(),
    demo_location TEXT,
    enrollment_completed BOOLEAN DEFAULT false,
    app_accessed BOOLEAN DEFAULT false,
    follow_up_status TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track demo analytics
CREATE TABLE demo_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id UUID REFERENCES demo_visitors(id),
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
```

## 🔧 Troubleshooting

### SMS Not Sending
- Check NOTIFYRE credentials in environment variables
- Verify phone number format (E.164: +1XXXXXXXXXX)
- System falls back to demo mode if real SMS fails

### Patient App Not Loading
- Ensure `../reach-2-0` directory exists
- Check that patient-app-server.js is running on port 3002
- Verify enrollment bridge is accessible at `/enroll`

### Database Issues
- Confirm Supabase credentials are correct
- Check that demo_visitors table exists
- Visitor data will still be captured in logs if DB fails

## 📞 Emergency Fallbacks

If anything fails during the demo:

1. **SMS fails**: Show QR code with enrollment link
2. **App won't load**: Have backup tablet with pre-loaded app
3. **Database fails**: Keep local CSV of visitor info
4. **Everything fails**: Have video recording of perfect demo flow

## 🎯 Success Metrics

Track these during Recovery Day:
- Number of visitors who provide phone numbers
- SMS delivery success rate  
- Link click-through rate
- App engagement (tests completed, points earned)
- Consent to follow-up rate

## 📁 Key Files Modified

- `test-complete-patient-flow.html` - Added dynamic visitor inputs
- `api/recovery-day-routes.js` - Added demo-visitor endpoint
- `services/notifyre-sms-service.js` - Updated for dynamic SMS
- `patient-app-server.js` - NEW: Serves reach-2-0 app
- `patient-enrollment-bridge.html` - Handles SMS authentication
- `deploy-config.js` - NEW: Environment configuration

## 🚀 Next Steps

For production deployment:
1. Deploy to Vercel: `vercel --prod`
2. Set environment variables in Vercel dashboard
3. Update SMS base URLs to production domains
4. Test end-to-end flow with real data

**The system is now ready for Recovery Day! 🎉**