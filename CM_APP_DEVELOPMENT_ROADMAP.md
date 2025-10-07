# Contingency Management App - Development Roadmap for Next Claude Code

## 🎯 **Project Overview**

**Mission**: Build a complete, self-contained contingency management (CM) app for stimulant use disorder as a subsidiary of Moonlit.

**Architecture**: Single unified app with role-based interfaces (Patient, Provider, Admin)

---

## 🏗️ **Technical Foundation (COMPLETED)**

### ✅ **Eligibility Verification System**
- **Real-time Office Ally integration**: 400-800ms response times
- **Mental health carve-out detection**: Service-specific coverage analysis
- **ACO transition prediction**: Risk assessment for plan changes
- **Production credentials**: `[REDACTED-USERNAME]` / `[REDACTED-PASSWORD]`

### ✅ **Key Discovery: Behavioral Health FFS Exception**
**Critical Finding**: Patients can have medical ACO + behavioral health FFS simultaneously
- Selena Partida case: SelectHealth medical + MH FFS in Davis County
- **CM Eligibility Rule**: Check `MC*MENTAL HEALTH OUTPATIENT`, not overall plan
- **Billing Path**: CM claims go to behavioral health coverage, not medical

### ✅ **Working Components Ready for Integration**
- `api/medicaid/check.js` - Enhanced eligibility API with MH carve-out logic
- `aco-transition-analysis.js` - Risk assessment framework
- Vue.js frontend with Tailwind CSS (professional medical UI)
- Office Ally SOAP integration with X12 270/271 parsing

---

## 🏢 **Three-Tier Application Architecture**

### 1. **Patient-Facing App** 
**Core Features Needed:**
- **Points System**: Reward behaviors (group attendance, negative UDS)
- **Roulette Wheel**: Cash prizes when patients earn sufficient points
- **Communication Hub**: 
  - Chat with Certified Peer Support Specialist (CPSS)
  - Pod communication (group of 6-10 patients)
  - AI coach placeholder (future feature)
- **Remote Group Access**: Video conferencing within app
- **Progress Tracking**: Personal dashboard with achievements

### 2. **Provider-Facing App (CPSS Interface)**
**Core Features Needed:**
- **Patient Management**: Track assigned patients and their progress
- **Eligibility Checking**: Real-time verification (already built)
- **Communication Tools**: Chat with patients and coordinate with pods
- **Data Tracking**: RTM data collection and other clinical metrics
- **Session Management**: Schedule and conduct group sessions
- **Claims Preparation**: Generate billing data for admin team

### 3. **Admin-Facing App (Moonlit Staff)**
**Core Features Needed:**
- **CPSS/Pod Management**: Assign pods to CPSS, manage pairings
- **Claims Dashboard**: Create/submit claims via Office Ally SFTP
- **Analytics**: Program outcomes, billing reports, utilization tracking
- **Patient Enrollment**: Onboard new patients into CM program
- **Compliance Tracking**: Ensure program meets Utah Medicaid requirements

---

## 💰 **Billing & Claims Integration**

### **Office Ally SFTP Connection** ✅ **AVAILABLE**
- **Credentials**: User has working SFTP connection for real claims
- **Status**: Previously successful claim submissions
- **Need**: Verify current directory structure and access

### **Dual Billing Path Architecture**
```
Mental Health Services (H0038, 90834) → Traditional Medicaid FFS
Medical Services (RTM 98980/98981) → Route based on coverage analysis
```

### **Claims Engine Requirements:**
- **H0038 Peer Support**: $21.16 per 15-minute unit (8-minute minimum)
- **RTM Codes 98980/98981**: Remote therapeutic monitoring
- **Same-day aggregation**: Optimize billing for multiple encounters
- **Group session handling**: 1:8 peer-to-member ratio enforcement

---

## 🔧 **Technical Specifications**

### **Tech Stack Recommendations:**
- **Frontend**: Vue.js 3 + Vite + Tailwind CSS (proven working)
- **Backend**: Express.js with existing Office Ally integration
- **Database**: PostgreSQL (current .env.local has connection string)
- **Real-time**: WebSocket for chat and video conferencing
- **Video**: WebRTC or integration with existing telehealth platform

### **Environment Configuration Ready:**
```bash
# Office Ally (Production Ready)
OFFICE_ALLY_USERNAME=[REDACTED-USERNAME]
OFFICE_ALLY_PASSWORD=[REDACTED-PASSWORD]
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc

# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# Supabase Integration
NEXT_PUBLIC_SUPABASE_URL=https://alavxdxxttlfprkiwtrq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# IntakeQ EMR
INTAKEQ_API_KEY=[REDACTED-INTAKEQ-KEY]
```

---

## 🎯 **Phase 1: MVP Core Features (Recommended Starting Point)**

### **Week 1-2: Foundation**
1. **Multi-role authentication system**
   - Patient, CPSS, Admin login flows
   - Role-based dashboard routing

2. **Patient eligibility integration** 
   - Use existing `api/medicaid/check.js`
   - Enhanced for CM program qualification

3. **Basic patient enrollment workflow**
   - Onboarding process for acute care settings
   - Integration with eligibility checking

### **Week 3-4: Patient Core Features**
1. **Points system implementation**
   - Database schema for points tracking
   - Reward behaviors (attendance, negative UDS)

2. **Basic communication system**
   - Chat between patients and CPSS
   - Pod group messaging

3. **Simple progress dashboard**
   - Points balance, achievements, next goals

### **Week 5-6: Provider & Admin Tools**
1. **CPSS patient management interface**
   - Patient roster, progress tracking
   - Session scheduling and notes

2. **Admin dashboard foundation**
   - CPSS/pod assignments
   - Basic claims preparation

---

## 🏆 **Phase 2: Advanced Features**

### **Roulette Wheel System**
- **Implementation**: JavaScript wheel animation
- **Prize Integration**: Cash rewards via existing financial systems
- **Gamification**: Point threshold triggers for wheel access

### **Video Conferencing**
- **Options**: WebRTC, Jitsi Meet integration, or Twilio Video
- **Requirements**: HIPAA compliance, group session support

### **Claims Automation**
- **SFTP Integration**: Automated claim file generation and submission
- **Billing Engine**: H0038 unit calculations, same-day aggregation
- **RTM Data Collection**: Automated tracking for 98980/98981 codes

---

## 📊 **Data Architecture**

### **Core Entities:**
```sql
-- Patients with CM program enrollment
patients (id, name, dob, medicaid_id, enrollment_date, status)

-- CPSS providers
providers (id, name, credentials, max_patients)

-- Patient pods/groups
pods (id, name, cpss_id, max_size, meeting_schedule)

-- Points and rewards system
points_transactions (id, patient_id, points, reason, date)
rewards (id, patient_id, type, amount, date_earned)

-- Communication
messages (id, sender_id, recipient_id, content, timestamp)
group_messages (id, pod_id, sender_id, content, timestamp)

-- Clinical data for RTM
rtm_data (id, patient_id, data_type, value, collected_date)

-- Claims and billing
claims (id, patient_id, service_code, units, amount, status)
```

---

## 🚀 **Implementation Strategy**

### **Start Here:**
1. **Clone existing eligibility checker** as foundation
2. **Add role-based authentication** to existing Vue.js interface  
3. **Implement points system** with simple database tracking
4. **Build patient dashboard** with points display and basic chat

### **Key Integration Points:**
- **Reuse Office Ally integration** for eligibility (no changes needed)
- **Extend existing API** with CM-specific endpoints
- **Build on Vue.js frontend** that's already styled and working

### **Critical Success Factors:**
- **Mental health carve-out logic**: Essential for accurate eligibility
- **SFTP claims submission**: Must verify directory structure and test
- **Dual billing paths**: Route claims correctly based on service type

---

## 🔐 **Security & Compliance**

### **HIPAA Requirements:**
- Patient data encryption at rest and in transit
- Audit logging for all patient interactions  
- Secure messaging with retention policies
- Video conferencing HIPAA compliance

### **Utah Medicaid Compliance:**
- Accurate billing code usage (H0038, RTM codes)
- Proper documentation for CM program requirements
- Eligibility verification before service delivery

---

## 📞 **External Dependencies**

### **Office Ally SFTP Credentials** (Request from User)
- **Status**: User has working credentials and previous success
- **Need**: Current directory structure and file format requirements
- **Timeline**: Request before starting claims integration

### **Video Conferencing Solution**
- **Options**: Evaluate WebRTC, Jitsi, Twilio Video for group sessions
- **Requirements**: HIPAA compliance, group support, mobile compatibility

---

## 🎯 **Success Metrics**

### **Technical Metrics:**
- Eligibility verification: <1 second response time
- Claims submission: 99%+ success rate via SFTP
- Patient engagement: Points system utilization
- Provider efficiency: Time saved vs manual processes

### **Business Metrics:**
- CM program enrollment rates
- Patient retention in program
- Billing accuracy and reimbursement
- Provider satisfaction with tools

---

## 📋 **Ready-to-Go Assets**

### **Immediately Available:**
- ✅ Working Office Ally eligibility API
- ✅ Vue.js frontend with medical UI styling
- ✅ Mental health carve-out detection logic
- ✅ PostgreSQL database connection
- ✅ Production environment configuration

### **Need from User:**
- Office Ally SFTP credentials and directory structure
- Specific CM program requirements from Utah Medicaid
- Preferred video conferencing solution
- Cash reward system integration details

---

**The foundation is solid - we can build a complete CM app leveraging all the eligibility work already completed. The mental health carve-out discovery is particularly valuable for ensuring accurate program enrollment.**