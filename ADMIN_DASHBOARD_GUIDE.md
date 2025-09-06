# Admin Dashboard - Live Auto-Discovery System

## 🎯 Overview

The Admin Dashboard is now connected to the live auto-discovery system, allowing you to manage payer mappings in real-time. When new Office Ally payers are discovered, they will automatically appear in the dashboard for your review and approval.

## 🚀 How to Start the System

### 1. Start the Admin API Server
```bash
ADMIN_PORT=3002 node api-admin.js
```

### 2. Open the Live Dashboard
Open `admin_dashboard_live.html` in your browser. The dashboard will automatically connect to the API server.

## 📊 Dashboard Features

### **Stats Overview**
- **Mapped Payers**: Total number of payers in the OFFICE_ALLY_PAYER_MAP
- **Pending Review**: Payers discovered but awaiting approval
- **Average Confidence**: Average confidence score of pending discoveries
- **This Week**: New discoveries in the past 7 days

### **Pending Mappings Tab**
- View all auto-discovered payers awaiting approval
- See confidence scores and suggested matches
- Review detailed matching information
- Approve or reject mappings with one click

### **Current Mappings Tab**  
- View all active payer mappings from OFFICE_ALLY_PAYER_MAP
- See payer types (Medicaid vs Private)
- Review aliases and configurations

### **Activity Log Tab**
- Track recent discovery activity
- Monitor system performance
- Review historical decisions

## 🔧 How the Auto-Discovery Works

### **1. Real-Time Discovery**
When a patient eligibility check returns a new Office Ally payer ID:
```javascript
// In api/medicaid/check.js - this triggers auto-discovery
const enhancedResult = await networkIntegration.checkEligibilityWithNetworkStatus(
    { first, last, dob, state: 'UT' }, 
    x12_271
);
```

### **2. Fuzzy Matching**
The system uses Jaro-Winkler algorithm to match Office Ally payer names against Supabase contracted payers:
```javascript
// Confidence scoring example
const confidence = jaroWinkler('Aetna Better Health Utah', 'Aetna'); 
// Returns: 87% confidence match
```

### **3. Pending Review**
High-confidence matches (>60%) are stored in `pending_payer_mappings.json` for admin review.

### **4. Approval Process**
When you approve a mapping, the system provides the exact code to add:
```javascript
'AETNA_UT': {
    name: 'Aetna',
    aliases: ['Aetna', 'Aetna Better Health Utah'],
    state: 'UT',
    type: 'Private'
},
```

## 🔄 Workflow Example

1. **Discovery**: Patient checks eligibility, new payer "MOLINA_UT" discovered
2. **Analysis**: System finds 91% confidence match with "Molina Healthcare" in Supabase  
3. **Pending**: Mapping appears in dashboard with confidence score
4. **Review**: Admin reviews suggested match and contract status
5. **Approval**: Admin clicks "Approve" → system provides exact code
6. **Implementation**: Code is added to `supabase_network_integration.js`
7. **Active**: Future patients with Molina get instant network status

## 🎛️ API Endpoints (for developers)

```bash
# Get dashboard statistics
GET http://localhost:3002/api/admin/stats

# Get pending mappings  
GET http://localhost:3002/api/admin/pending

# Get current mappings
GET http://localhost:3002/api/admin/mappings  

# Approve a mapping
POST http://localhost:3002/api/admin/approve/mapping_id

# Reject a mapping  
POST http://localhost:3002/api/admin/reject/mapping_id

# Manual discovery trigger
POST http://localhost:3002/api/admin/discover
Body: {"payerId": "NEW_PAYER", "payerName": "New Payer Name"}
```

## 📁 Key Files

- **`admin_dashboard_live.html`** - Live dashboard interface
- **`api-admin.js`** - Admin API server  
- **`pending_payer_mappings.json`** - Discovered payers awaiting review
- **`supabase_network_integration.js`** - Contains OFFICE_ALLY_PAYER_MAP
- **`auto_payer_discovery.js`** - Auto-discovery engine

## ✅ Testing the System

1. **Start both servers**:
   ```bash
   # Terminal 1: Main API
   node api-server.js
   
   # Terminal 2: Admin API  
   ADMIN_PORT=3002 node api-admin.js
   ```

2. **Trigger a discovery**:
   ```bash
   curl -X POST http://localhost:3002/api/admin/discover \
     -H "Content-Type: application/json" \
     -d '{"payerId":"TEST_PAYER","payerName":"Test Insurance Company"}'
   ```

3. **Check the dashboard**: New pending mapping should appear

4. **Approve the mapping**: Click "Approve" and get the code to add

## 🔒 Production Deployment

For production, you'll want to:
1. Set up proper authentication for the admin dashboard
2. Use environment variables for API URLs
3. Implement database storage instead of JSON files
4. Add logging and monitoring
5. Set up automated alerts for new discoveries

## 🚨 Troubleshooting

**Dashboard shows connection error**: 
- Ensure admin API server is running on port 3002
- Check browser console for CORS issues

**No pending mappings appearing**:
- Verify `pending_payer_mappings.json` exists and has valid JSON
- Check that auto-discovery system is connected to eligibility checks

**Approve/Reject not working**:
- Verify API endpoints are responding
- Check server logs for errors
- Ensure proper JSON structure in pending mappings file

---

🎉 **The admin dashboard is now fully connected to the live auto-discovery system!** You can manage payer mappings in real-time as new Office Ally payers are encountered during patient eligibility checks.