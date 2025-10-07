# CLAUDE.md - Medicaid Eligibility Checker Project

**Last Updated**: 2025-10-07
**Status**: Universal eligibility checker operational with Utah Medicaid & Aetna support

---

## 🎯 NEXT STEPS: UUHP Integration & Payer Database

### **Objective**: Add University of Utah Health Plans (UUHP) eligibility checking

### **Current State** (as of October 7, 2025):
✅ **Working Systems:**
- Universal eligibility checker framework (`universal-eligibility-checker.js`)
- Utah Medicaid eligibility (Name + DOB only, <1 second response)
- Aetna eligibility (Name + DOB + Member ID)
- Enhanced X12 271 parser (deductibles, OOP max, copays, coinsurance)
- Member ID field (conditional display for commercial payers)
- Managed care plan detection (SelectHealth, Molina, Optum)
- Professional web UI at `/universal-eligibility-interface.html`

✅ **Security:**
- All credentials in environment variables
- .gitignore preventing credential leaks
- Security documentation complete

### **Next Implementation: UUHP + Payer ID Database**

#### **Phase 1: Payer ID Database Setup**

**File Available**: `payers (1).xlsx - Payers.csv`
This CSV contains all Office Ally real-time eligibility payer IDs and names.

**Task**: Create Supabase table to store payer information for easy lookup

**Why Supabase?**
- Already using Supabase for practice database
- Avoids hardcoding hundreds of payer IDs locally
- Enables dynamic payer selection in UI
- Can be updated/maintained via admin interface
- Shared across all applications

**Proposed Schema**:
```sql
CREATE TABLE payers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payer_name TEXT NOT NULL,
    office_ally_payer_id TEXT UNIQUE NOT NULL,
    payer_type TEXT, -- 'medicaid', 'commercial', 'medicare', etc.
    requires_member_id BOOLEAN DEFAULT false,
    requires_ssn BOOLEAN DEFAULT false,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    provider_npi TEXT, -- Which provider NPI to use for this payer
    provider_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_payers_office_ally_id ON payers(office_ally_payer_id);
CREATE INDEX idx_payers_active ON payers(is_active) WHERE is_active = true;

-- Example data
INSERT INTO payers (payer_name, office_ally_payer_id, payer_type, requires_member_id, provider_npi, provider_name) VALUES
('Utah Medicaid', 'UTMCD', 'medicaid', false, '1275348807', 'Moonlit PLLC'),
('Aetna', '60054', 'commercial', true, '1124778121', 'Travis Norseth'),
('University of Utah Health Plans', '[TO_BE_DETERMINED]', 'commercial', true, '[TO_BE_DETERMINED]', '[TO_BE_DETERMINED]');
```

**Implementation Steps**:

1. **Import CSV to Supabase**:
   ```bash
   # From the CSV file, create SQL insert statements
   # Use Supabase SQL editor or import via dashboard
   ```

2. **Create Supabase Client** (`lib/supabase.js`):
   ```javascript
   const { createClient } = require('@supabase/supabase-js');

   const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
   );

   module.exports = { supabase };
   ```

3. **Update Universal Eligibility Checker**:
   ```javascript
   // In universal-eligibility-checker.js
   const { supabase } = require('./lib/supabase');

   async function getPayerConfig(payerIdentifier) {
       // Look up payer by name or Office Ally ID
       const { data, error } = await supabase
           .from('payers')
           .select('*')
           .or(`payer_name.ilike.%${payerIdentifier}%,office_ally_payer_id.eq.${payerIdentifier}`)
           .eq('is_active', true)
           .single();

       if (error || !data) {
           throw new Error(`Payer not found: ${payerIdentifier}`);
       }

       return {
           payerName: data.payer_name,
           payerId: data.office_ally_payer_id,
           requiresMemberId: data.requires_member_id,
           requiresSSN: data.requires_ssn,
           providerNPI: data.provider_npi,
           providerName: data.provider_name
       };
   }
   ```

4. **Update UI to Load Payers from Database**:
   - Create API endpoint: `GET /api/payers/active`
   - Load payer dropdown dynamically
   - Show/hide Member ID field based on `requires_member_id`

#### **Phase 2: UUHP Integration**

**Task**: Add UUHP to payer database and test eligibility

**Steps**:
1. Find UUHP payer ID in `payers (1).xlsx - Payers.csv`
2. Determine which provider NPI to use with UUHP
3. Add to Supabase `payers` table
4. Test with real UUHP patient (will need Member ID)
5. Document minimum requirements in `PAYER_REQUIREMENTS_AND_ANALYSIS.md`

**Expected Challenges**:
- UUHP likely requires Member ID (like Aetna)
- May require specific provider credentials
- Need real UUHP patient to test successfully

#### **Phase 3: Enhanced Payer Management**

**Future Features**:
- Admin interface to add/edit payers
- Payer-specific field requirements (SSN, Member ID, Group Number)
- Per-payer response time tracking
- Success/failure rate monitoring
- Automatic payer configuration updates

### **Environment Variables Needed**:
```bash
# Add to .env.local
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### **Files to Review**:
- `payers (1).xlsx - Payers.csv` - Complete payer list with Office Ally IDs
- `universal-eligibility-checker.js` - Current payer configuration (hardcoded)
- `PAYER_REQUIREMENTS_AND_ANALYSIS.md` - Documented requirements per payer

### **Success Criteria**:
✅ Payers stored in Supabase database
✅ UI dynamically loads payer list from database
✅ UUHP eligibility checking functional
✅ Member ID field shows/hides based on payer requirements
✅ Easy to add new payers without code changes

---

## 🎯 RECOVERY DAY DEMO - COMPLETE SYSTEM ORCHESTRATION (ARCHIVED)

## 🚨 CRITICAL CONTEXT
You are orchestrating a two-part demo system for Recovery Day:
1. **THIS DIRECTORY** (medicaid-eligibility-checker): CPSS interface, SMS, backend
2. **PEER DIRECTORY** (../cm-app-v2/reach-2-0): Patient-facing CM app

Your mission: Create a seamless demo flow where CPSS enrolls patients who receive REAL SMS and access the patient app.

## 🔥 IMMEDIATE FIXES NEEDED (Priority Order)

### FIX 1: Dynamic Phone Numbers for Demo Participants
**Problem**: Phone number is hardcoded to 3852018161 in demo-patient-setup.js
**Solution**: 
```javascript
// In test-complete-patient-flow.html, add after line 165:
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-1">Demo Participant Info</label>
    <input type="text" id="visitorName" placeholder="Visitor's Name" class="w-full px-3 py-2 border rounded mb-2">
    <input type="text" id="visitorRole" placeholder="Role (CPSS/Clinician)" class="w-full px-3 py-2 border rounded mb-2">
    <input type="tel" id="visitorPhone" placeholder="Visitor's Phone (for demo SMS)" class="w-full px-3 py-2 border rounded mb-2">
    <label class="flex items-center">
        <input type="checkbox" id="followUpConsent" class="mr-2">
        <span class="text-sm">OK to follow up after demo?</span>
    </label>
</div>

// In the checkEligibility function, capture visitor data:
const visitorData = {
    name: document.getElementById('visitorName').value,
    role: document.getElementById('visitorRole').value,
    phone: document.getElementById('visitorPhone').value,
    consent: document.getElementById('followUpConsent').checked
};

// Store in database for follow-up
await fetch('/api/recovery-day/demo-visitor', {
    method: 'POST',
    body: JSON.stringify(visitorData)
});
FIX 2: Create Demo Visitor Tracking
Location: api/recovery-day-routes.js
Add this endpoint:
javascriptrouter.post('/demo-visitor', async (req, res) => {
    const { name, role, phone, organization, consent } = req.body;
    
    // Store visitor for follow-up
    const { data: visitor, error } = await supabase
        .from('demo_visitors')
        .insert({
            name,
            role, 
            phone,
            organization,
            consent_to_follow_up: consent,
            demo_date: new Date(),
            demo_location: 'Recovery Day'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Failed to store visitor:', error);
    }
    
    res.json({ success: true, visitorId: visitor?.id });
});
FIX 3: Update SMS Service for Dynamic Numbers
Location: services/notifyre-sms-service.js
Change the sendEnrollmentSMS method:
javascriptasync sendEnrollmentSMS(toNumber, enrollmentToken, patientName, visitorName = null) {
    // Use production URL if deployed, otherwise localhost
    const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3002';
    const enrollmentUrl = `${baseUrl}/enroll?token=${enrollmentToken}`;
    
    const message = visitorName 
        ? `Hi ${visitorName}! This is the Moonlit CM demo for ${patientName}. Experience the patient app here: ${enrollmentUrl}`
        : `Hi ${patientName}! Welcome to Moonlit's CM program. Complete enrollment: ${enrollmentUrl}`;
    
    return this.sendSMS(toNumber, message);
}
FIX 4: Serve Patient App from This Directory
Create: patient-app-server.js
javascriptconst express = require('express');
const path = require('path');
const app = express();

// Serve reach-2-0 patient app
app.use(express.static(path.join(__dirname, '../cm-app-v2/reach-2-0/client')));

// Enrollment bridge endpoint
app.get('/enroll', (req, res) => {
    res.sendFile(path.join(__dirname, 'patient-enrollment-bridge.html'));
});

// Start on port 3002
const PORT = process.env.PATIENT_APP_PORT || 3002;
app.listen(PORT, () => {
    console.log(`🎯 Patient app serving at http://localhost:${PORT}`);
});
FIX 5: Deployment Configuration
Create: deploy-config.js
javascript// Configuration for deployment
module.exports = {
    development: {
        cpssUrl: 'http://localhost:3000',
        patientUrl: 'http://localhost:3002',
        smsBaseUrl: 'http://localhost:3002'
    },
    production: {
        cpssUrl: process.env.CPSS_URL || 'https://[REDACTED-USERNAME]-cm.vercel.app',
        patientUrl: process.env.PATIENT_URL || 'https://[REDACTED-USERNAME]-patient.vercel.app',
        smsBaseUrl: process.env.PATIENT_URL || 'https://[REDACTED-USERNAME]-patient.vercel.app'
    }
};
📁 PATIENT APP CONTEXT (../cm-app-v2/reach-2-0)
Key Files You Need to Know About:

client/index.html - Main patient app (drug tests, points, roulette)
client/css/styles.css - Styling (needs [REDACTED-USERNAME] branding)
services/enrollment-bridge.js - Handles SMS token authentication
api/patient-app.js - Patient app API endpoints

Patient App Flow:

Receives SMS with enrollment token
Opens enrollment bridge (patient-enrollment-bridge.html)
Auto-authenticates using token
Shows welcome screen with 25 bonus points
Patient can do drug tests (+15 points for negative)
At 25+ points, can spin roulette for cash prizes

Current Issues in Patient App:

Hardcoded to localhost (needs deployment URL)
No celebration animations
Basic UI (needs polish)
No progress tracking visualization

🚀 DEPLOYMENT STRATEGY
Option A: Single Vercel Deployment (Recommended)
bash# From this directory
npm install -g vercel
vercel --prod

# Set environment variables in Vercel:
DEPLOYMENT_URL=https://your-app.vercel.app
NOTIFYRE_AUTH_TOKEN=your-token
NOTIFYRE_FROM_NUMBER=+13855130681
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key
Option B: Dual Deployment

Deploy this directory to Vercel/Heroku for backend
Deploy reach-2-0 separately for patient app
Update URLs in configuration

Option C: Quick Demo with ngrok
bash# Install ngrok
npm install -g ngrok

# Start both servers
npm start # port 3000
cd ../cm-app-v2/reach-2-0 && npm start # port 3002

# Expose to internet
ngrok http 3000 # For CPSS interface
ngrok http 3002 # For patient app
🎯 COMPLETE DEMO FLOW (AFTER FIXES)

CPSS Opens Interface (http://localhost:3000/test-complete-patient-flow.html)

Enters: Alex Demo, DOB: 03/15/1995
NEW: Enters visitor's name, role, and phone
Checks eligibility (instant mock response)


Phone Confirmation

Shows visitor's phone number (not hardcoded!)
Visitor confirms their number


Real SMS Sent

Notifyre sends REAL SMS to visitor's phone
Message personalized with visitor's name
Contains link to patient app


Visitor Opens Link on Their Phone

Link works because app is deployed (Vercel/ngrok)
Shows enrollment bridge
Auto-logs them into patient app


Patient App Experience

Welcome screen with 25 bonus points
Can complete drug test
Can spin roulette at 25+ points
All actions tracked in database


Follow-Up

Visitor info stored in Supabase
Can export list after Recovery Day
Follow up with interested CPSSs



🔧 DATABASE SCHEMA ADDITIONS NEEDED
sql-- Add to your Supabase database
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
✅ TESTING CHECKLIST
Before Recovery Day, test:

 Dynamic phone number input works
 SMS sends to any phone number
 Visitor data saves to database
 SMS link opens on mobile (deployment working)
 Patient app auto-login works
 Points system working
 Roulette wheel working
 Can export visitor list from Supabase

🎯 SUCCESS METRICS
Track these during demos:

Number of visitors who provide phone numbers
SMS delivery success rate
Link click-through rate
App engagement (tests completed, points earned)
Consent to follow-up rate
Time from enrollment to app access

🚨 EMERGENCY FALLBACKS
If something fails during demo:

SMS fails: Show QR code with link instead
App won't load: Have backup tablet with pre-loaded app
Database fails: Keep local CSV of visitor info
Everything fails: Have video recording of perfect demo flow

📞 QUICK FIXES DURING DEMO
javascript// If SMS isn't working, generate QR code instead
function generateQRFallback(enrollmentUrl) {
    // Use qrcode.js library
    const qr = qrcode(0, 'M');
    qr.addData(enrollmentUrl);
    qr.make();
    document.getElementById('qrcode').innerHTML = qr.createImgTag(5);
}

// If app won't auto-login, provide manual code
function getManualLoginCode(enrollmentToken) {
    return enrollmentToken.substring(0, 6).toUpperCase();
}

**Remember: You are the orchestrator. The patient app (reach-2-0) is your partner, but YOU control the flow. Make changes here first, then coordinate with the patient app as needed.**


## Project Overview
This is a Utah Medicaid real-time eligibility verification system uses Office Ally to check patient eligibility for various use cases (users). 
1. Universal eligibility for all payers (admin)
2. Contingency management enrollment yes/no decision (CPSS)

The system checks patient eligibility through X12 270/271 EDI transactions wrapped in SOAP envelopes. Each payer has unique requirements (necessary and sufficient pieces of provider/patient data) to check eligibility.

## Current State
- **Working**: X12 270 generation, SOAP envelope creation, response parsing, simulation mode
- **Platform**: Vercel deployment with PostgreSQL database
- **Previous Integration**: Was successfully submitting to Office Ally before attempting UHIN
- **Timeline**: Need Office Ally working within 2-3 weeks while UHIN credentials are pending

## Immediate Objectives

### 1. Implement Dual-Provider Support
Modify `api/medicaid/check.js` to support both Office Ally and UHIN configurations:

```javascript
// Add environment variable check at top of file
const ELIGIBILITY_PROVIDER = process.env.ELIGIBILITY_PROVIDER || 'OA'; // 'OA' or 'UHIN'

// Create Office Ally configuration object
const OA_CONFIG = {
    endpoint: process.env.OA_ENDPOINT || 'https://[to-be-provided].officeally.com/soap/eligibility',
    senderID: process.env.OA_SENDER_ID, // Will be assigned by Office Ally
    receiverID: 'OFFALLY', // Per Office Ally documentation
    username: process.env.OA_USERNAME,
    password: process.env.OA_PASSWORD,
    providerNPI: process.env.PROVIDER_NPI || '1234567890',
    providerName: process.env.PROVIDER_NAME || 'MOONLIT_PLLC'
};

// Select configuration based on provider
const ACTIVE_CONFIG = ELIGIBILITY_PROVIDER === 'OA' ? OA_CONFIG : UHIN_CONFIG;
```

### 2. Create Office Ally-Specific Functions

Add these functions to `api/medicaid/check.js`:

```javascript
// Generate Office Ally-specific X12 270
function generateOA_X12_270(patient) {
    const controlNumber = Date.now().toString().slice(-9);
    const formattedDOB = patient.dob.replace(/-/g, '');
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
    const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');

    const segments = [
        `ISA*00*          *00*          *ZZ*${OA_CONFIG.senderID}*ZZ*OFFALLY*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:~`,
        `GS*HS*${OA_CONFIG.senderID}*OFFALLY*${dateStr}*${timeStr}*${controlNumber}*X*005010X279A1~`,
        `ST*270*${controlNumber}*005010X279A1~`,
        `BHT*0022*13*${controlNumber}*${dateStr}*${timeStr}~`,
        `HL*1**20*1~`,
        `NM1*PR*2*UTAH MEDICAID*****PI*99999~`, // Office Ally uses different payer ID
        `HL*2*1*21*1~`,
        `NM1*1P*2*${OA_CONFIG.providerName}*****XX*${OA_CONFIG.providerNPI}~`,
        `HL*3*2*22*0~`,
        `TRN*1*${controlNumber}*${OA_CONFIG.providerNPI}~`,
        `NM1*IL*1*${patient.last.toUpperCase()}*${patient.first.toUpperCase()}****MI*${patient.medicaidId || patient.ssn}~`,
        `DMG*D8*${formattedDOB}~`,
        `DTP*291*D8*${dateStr}~`,
        `EQ*30~`,
        `SE*14*${controlNumber}~`,
        `GE*1*${controlNumber}~`,
        `IEA*1*${controlNumber}~`
    ];

    return segments.join('\n');
}

// Generate Office Ally SOAP envelope (simpler than CORE)
function generateOASOAPRequest(x12Payload) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header>
        <Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <UsernameToken>
                <Username>${OA_CONFIG.username}</Username>
                <Password>${OA_CONFIG.password}</Password>
            </UsernameToken>
        </Security>
    </soap:Header>
    <soap:Body>
        <SubmitEligibilityRequest xmlns="http://www.officeally.com/eligibility">
            <x12Data>${Buffer.from(x12Payload).toString('base64')}</x12Data>
        </SubmitEligibilityRequest>
    </soap:Body>
</soap:Envelope>`;
}

// Send request to Office Ally
async function sendOARequest(soapRequest) {
    try {
        const response = await fetch(OA_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.officeally.com/eligibility/Submit'
            },
            body: soapRequest
        });

        if (!response.ok) {
            throw new Error(`Office Ally API error: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        return responseText;
    } catch (error) {
        console.error('Office Ally request failed:', error);
        throw error;
    }
}
```

### 3. Modify Main Handler Logic

Update the main handler in `api/medicaid/check.js` to route based on provider:

```javascript
// In the main handler function, after validation:

let eligibilityResult;

// Check provider and route accordingly
if (ELIGIBILITY_PROVIDER === 'OA') {
    console.log('🏢 Processing Office Ally eligibility check...');
    
    // Generate Office Ally X12 270
    const x12_270 = generateOA_X12_270({
        first: first.trim(),
        last: last.trim(),
        dob,
        ssn: ssn?.replace(/\D/g, ''),
        medicaidId
    });

    // Wrap in Office Ally SOAP
    const soapRequest = generateOASOAPRequest(x12_270);

    // Send to Office Ally
    const soapResponse = await sendOARequest(soapRequest);
    
    // Parse response (reuse existing parsing logic)
    const x12_271 = parseSOAPResponse(soapResponse);
    eligibilityResult = parseX12_271(x12_271);
    
} else if (ELIGIBILITY_PROVIDER === 'UHIN') {
    // Existing UHIN logic remains unchanged
    console.log('🚀 Processing UHIN eligibility check...');
    // ... existing UHIN code ...
} else {
    // Simulation mode
    console.log('⏳ Running in SIMULATION mode...');
    // ... existing simulation code ...
}
```

### 4. Environment Variables to Add

Update `.env` or `.env.local`:

```bash
# Provider Selection (OA or UHIN)
ELIGIBILITY_PROVIDER=OA

# Office Ally Credentials (obtain from Office Ally)
OA_ENDPOINT=https://[to-be-provided].officeally.com/soap/eligibility
OA_SENDER_ID=[Your-Assigned-Sender-ID]
OA_USERNAME=[Your-OA-Username]
OA_PASSWORD=[Your-OA-Password]

# Keep existing UHIN variables for future use
UHIN_USERNAME=[When-Available]
UHIN_PASSWORD=[When-Available]

# Provider Information
PROVIDER_NPI=1234567890
PROVIDER_NAME=MOONLIT_PLLC

# Simulation Mode Override
SIMULATION_MODE=false
```

### 5. Testing Strategy

1. **Start with Simulation Mode**: Set `SIMULATION_MODE=true` to verify flow
2. **Office Ally UAT**: Test with Office Ally test credentials first
3. **Production Testing**: Use real credentials with test patient data
4. **Monitoring**: Log all requests/responses to database for debugging

### 6. Database Migration

The existing `eligibility_log` table structure is sufficient. No changes needed.

## Implementation Checklist

- [ ] Add Office Ally configuration object to `api/medicaid/check.js`
- [ ] Implement `generateOA_X12_270()` function
- [ ] Implement `generateOASOAPRequest()` function  
- [ ] Implement `sendOARequest()` function
- [ ] Add provider routing logic to main handler
- [ ] Update environment variables
- [ ] Test with simulation mode
- [ ] Obtain Office Ally credentials and endpoint URL
- [ ] Test with Office Ally UAT environment
- [ ] Update `eligibility-test.html` status messages
- [ ] Deploy to Vercel with new environment variables

## Important Notes

1. **Office Ally Endpoint**: The actual SOAP endpoint URL needs to be obtained from Office Ally support (Sheila.Odeen@officeally.com per their documentation)

2. **Authentication**: Office Ally may require SSL certificates in addition to username/password. Check with their support.

3. **Payer IDs**: Office Ally uses different payer IDs than UHIN. Utah Medicaid might be "99999" instead of "HT000004-001"

4. **Rate Limits**: Office Ally charges per transaction (see their fee schedule). Monitor usage carefully.

5. **Error Handling**: Office Ally returns AAA segments differently than UHIN. Test error scenarios thoroughly.

## Testing Commands

```bash
# Local development
npm run dev

# Test Office Ally connection
curl -X POST http://localhost:3000/api/medicaid/check \
  -H "Content-Type: application/json" \
  -d '{"first":"John","last":"Doe","dob":"1985-03-15","medicaidId":"1234567890"}'

# Check debug endpoint
curl http://localhost:3000/api/debug/office-ally
```

## Support Contacts

- **Office Ally Real-Time Support**: Sheila.Odeen@officeally.com
- **Office Ally Customer Service**: (360) 975-7000 option 1
- **UHIN Support**: (877) 693-3071
- **Utah Medicaid EDI**: editestinggroup@utah.gov

## Next Steps After Implementation

1. Complete Office Ally User Agreement (fax to 360-314-2184)
2. Obtain production credentials from Office Ally
3. Monitor transaction costs (first 100 transactions = $10 flat fee)
4. Keep UHIN integration code ready for future activation
5. Document any Office Ally-specific quirks discovered during testing

## Preservation Notes

The following components should be preserved as they work correctly:
- Database schema and connection logic
- X12 271 parsing logic
- Patient validation logic
- Frontend interface (eligibility-test.html)
- Vercel deployment configuration
- Error logging to database

## Success Criteria

✅ Successfully send 270 request to Office Ally
✅ Receive and parse 271 response
✅ Display eligibility status in UI
✅ Log transactions to database
✅ Handle errors gracefully
✅ Support easy switch between OA/UHIN via environment variable