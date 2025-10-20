# Claims Status Checking - Implementation Guide

**Date**: 2025-10-10
**Status**: ✅ Complete and Ready for Testing

---

## Overview

This system provides automated claims status checking via Office Ally using X12 276/277 transactions. It allows providers to check the status of submitted claims without having to log into the Office Ally portal.

### What Was Built

1. **X12 276 Generator** (`lib/x12-276-generator.js`)
   - Generates HIPAA 5010 X12 276 Claims Status Request transactions
   - Supports both individual and batch claims inquiries
   - Validates claim inquiry data before generation

2. **X12 277 Parser** (`lib/x12-277-parser.js`)
   - Parses X12 277 Claims Status Response transactions
   - Extracts claim status information (paid, denied, pending, etc.)
   - Provides human-readable status summaries

3. **Claims Status Service** (`lib/claims-status-service.js`)
   - Integrates X12 276 generation and 277 parsing
   - Handles Office Ally SOAP API communication
   - Supports checking status by claim inquiry data or database submission ID

4. **API Routes** (`api-server.js`)
   - `POST /api/claims/status/check` - Check status by claim inquiry data
   - `GET /api/claims/status/:submissionId` - Check status by database submission ID

5. **Test Suite** (`test-claims-status.js`)
   - Comprehensive tests for all components
   - Sample claim data for testing
   - API endpoint tests

---

## How It Works

### X12 276 Claims Status Request Flow

1. **Create Claim Inquiry Object**
   ```javascript
   const claimInquiry = {
       payerId: 'UTMCD',
       payerName: 'UTAH MEDICAID',
       providerNPI: '1275348807',
       providerName: 'MOONLIT PLLC',
       patient: {
           firstName: 'John',
           lastName: 'Doe',
           dateOfBirth: '1980-01-01',
           memberId: '1234567890'
       },
       claimControlNumber: 'CLM20251010001',
       serviceDate: '2025-10-08',
       claimAmount: 150.00
   };
   ```

2. **Generate X12 276 Request**
   - System generates properly formatted X12 276 transaction
   - Includes all required segments (ISA, GS, ST, BHT, HL, NM1, TRN, STC, etc.)
   - Follows HIPAA 5010 X12 276 specifications

3. **Wrap in SOAP Envelope**
   - X12 276 is wrapped in Office Ally SOAP envelope
   - Includes authentication credentials
   - Sets proper PayloadType: `X12_276_Request_005010X212`

4. **Send to Office Ally**
   - SOAP request sent to Office Ally endpoint
   - Real-time transaction processing

5. **Receive X12 277 Response**
   - Extract X12 277 from SOAP response
   - Parse status information

6. **Return Parsed Status**
   - Human-readable status information
   - Claim details (amount, dates, status codes)
   - Overall status summary

---

## X12 277 Status Codes

### Status Categories (STC01)

| Code | Description |
|------|-------------|
| A0   | Acknowledgement/Forwarded |
| A1   | Acknowledgement/Receipt |
| A2   | Acknowledgement/Acceptance into adjudication system |
| A3   | Acknowledgement/Returned as unprocessable claim |
| A6   | Acknowledgement/Rejection |
| P0   | Pending |
| P1   | Pending/In Process |
| P2   | Pending/Suspended |
| F0   | Finalized |
| F1   | Finalized/Payment |
| F2   | Finalized/Denial |
| F3   | Finalized/Reversal of Previous Payment |

### Detailed Status Codes (STC01-1)

| Code | Description |
|------|-------------|
| 1    | For more detailed information, see remittance advice |
| 3    | Claim/encounter has been forwarded to entity |
| 10   | Entire claim/encounter rejected |
| 15   | Claim/encounter not found |
| 20   | Accepted for processing |
| 27   | Pending: Review |
| 33   | Claim/encounter denied |
| 34   | Partially paid |
| 35   | Paid in full |

---

## API Usage

### 1. Check Status by Claim Inquiry Data

**Endpoint**: `POST /api/claims/status/check`

**Request Body**:
```json
{
  "payerId": "UTMCD",
  "payerName": "UTAH MEDICAID",
  "providerNPI": "1275348807",
  "providerName": "MOONLIT PLLC",
  "patient": {
    "firstName": "Jeremy",
    "lastName": "Montoya",
    "dateOfBirth": "1984-07-17",
    "memberId": "4327000009"
  },
  "claimControlNumber": "CLM20251010001",
  "serviceDate": "2025-10-08",
  "claimAmount": 150.00
}
```

**Example with curl**:
```bash
curl -X POST http://localhost:3000/api/claims/status/check \
  -H "Content-Type: application/json" \
  -d '{
    "payerId": "UTMCD",
    "payerName": "UTAH MEDICAID",
    "providerNPI": "1275348807",
    "providerName": "MOONLIT PLLC",
    "patient": {
      "firstName": "Jeremy",
      "lastName": "Montoya",
      "dateOfBirth": "1984-07-17",
      "memberId": "4327000009"
    },
    "claimControlNumber": "CLM20251010001",
    "serviceDate": "2025-10-08",
    "claimAmount": 150.00
  }'
```

**Response**:
```json
{
  "success": true,
  "responseTime": 1234,
  "request": {
    "x12_276": "ISA*00*...",
    "claimInquiry": { ... }
  },
  "response": {
    "x12_277": "ISA*00*...",
    "parsed": {
      "transactionSetControlNumber": "0001",
      "claims": [
        {
          "patient": { ... },
          "statuses": [
            {
              "statusCategory": "A2",
              "statusCategoryDescription": "Acknowledgement/Acceptance into adjudication system",
              "statusCode": "20",
              "statusCodeDescription": "Accepted for processing",
              "effectiveDate": "2025-10-10",
              "claimAmount": 150
            }
          ],
          "claimControlNumber": "CLM20251010001",
          "serviceDate": "2025-10-08",
          "claimAmount": 150
        }
      ]
    },
    "simplified": [
      {
        "patientName": { "lastName": "MONTOYA", "firstName": "JEREMY" },
        "claimControlNumber": "CLM20251010001",
        "serviceDate": "2025-10-08",
        "claimAmount": 150,
        "status": "Acknowledgement/Acceptance into adjudication system",
        "statusDetail": "Accepted for processing",
        "effectiveDate": "2025-10-10"
      }
    ]
  },
  "summary": {
    "totalClaims": 1,
    "claimStatuses": { "A2": 1 },
    "overallStatus": "ACKNOWLEDGED",
    "message": "Claim(s) acknowledged and accepted"
  }
}
```

### 2. Check Status by Database Submission ID

**Endpoint**: `GET /api/claims/status/:submissionId`

**Example**:
```bash
curl http://localhost:3000/api/claims/status/a1b2c3d4-e5f6-7890-abcd-1234567890ab
```

This endpoint:
1. Looks up the claim submission in the `claims_submissions` table
2. Extracts claim information from the database record
3. Queries Office Ally for current status
4. Updates the database with the latest status
5. Returns the status information

---

## Testing

### Run Test Suite

```bash
node test-claims-status.js
```

### Test Results

```
🧪 CLAIMS STATUS SERVICE TEST SUITE
===================================

Test 1 (X12 276 Generation): ✅ PASS
Test 2 (X12 277 Parsing): ✅ PASS
Test 3 (Full Status Check): ⚠️  SKIP (requires real claim)
Test 4 (API Endpoint): ⚠️  SKIP (requires running server)

Passed: 2/4 tests
```

**Note**: Tests 3 and 4 will only pass when:
- Test 3: A real claim control number is provided that exists in Office Ally
- Test 4: The API server is running (`node api-server.js`)

---

## Database Integration

### Claims Submissions Table

The system integrates with the existing `claims_submissions` table:

```sql
CREATE TABLE claims_submissions (
  id UUID PRIMARY KEY,
  payer_id UUID REFERENCES payers(id),
  provider_id UUID REFERENCES providers(id),
  control_number TEXT,
  service_date_start DATE,
  total_amount DECIMAL(10,2),
  claim_data JSONB,
  last_status_check TIMESTAMP,
  status_check_response TEXT,
  current_status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Automatic Status Updates

When using `checkClaimStatusFromDatabase()`, the system automatically updates:
- `last_status_check`: Timestamp of last status check
- `status_check_response`: Raw X12 277 response
- `current_status`: Parsed overall status (ACKNOWLEDGED, PENDING, PAID, etc.)
- `updated_at`: Last update timestamp

---

## Integration with Existing Workflow

### 1. Claims Submission → Status Checking Flow

```
1. Staff submits claim via /api/claims/submit-837p
   ↓
2. System generates X12 837 and submits to Office Ally
   ↓
3. Claim record created in claims_submissions table
   ↓
4. Staff can check status via /api/claims/status/:submissionId
   ↓
5. System queries Office Ally with X12 276
   ↓
6. Receives X12 277 response with current status
   ↓
7. Database updated with latest status
```

### 2. Automated Status Checking (Future Enhancement)

Could create a scheduled job to automatically check status of pending claims:

```javascript
// Example: Check all pending claims daily
async function checkPendingClaims() {
    const { data: pendingClaims } = await supabase
        .from('claims_submissions')
        .select('id')
        .eq('current_status', 'PENDING')
        .lt('last_status_check', new Date(Date.now() - 24*60*60*1000));

    for (const claim of pendingClaims) {
        await checkClaimStatusFromDatabase(supabase, claim.id);
    }
}
```

---

## Office Ally Configuration

### Environment Variables Required

```bash
# .env.local
OFFICE_ALLY_ENDPOINT=https://wsd.officeally.com/TransactionService/rtx.svc
OFFICE_ALLY_USERNAME=moonlit
OFFICE_ALLY_PASSWORD=[your password]
OFFICE_ALLY_SENDER_ID=1161680
```

### SOAP Envelope Format

The system uses Office Ally's CORE Rule 2.2.0 SOAP format:

```xml
<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>moonlit</wsse:Username>
        <wsse:Password>[password]</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ns1:COREEnvelopeRealTimeRequest>
      <PayloadType>X12_276_Request_005010X212</PayloadType>
      <ProcessingMode>RealTime</ProcessingMode>
      <PayloadID>[uuid]</PayloadID>
      <TimeStamp>[ISO timestamp]</TimeStamp>
      <SenderID>1161680</SenderID>
      <ReceiverID>OFFALLY</ReceiverID>
      <CORERuleVersion>2.2.0</CORERuleVersion>
      <Payload><![CDATA[X12 276 content here]]></Payload>
    </ns1:COREEnvelopeRealTimeRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

---

## Error Handling

### Common Errors

1. **"Invalid claim inquiry data"**
   - **Cause**: Missing required fields in claim inquiry object
   - **Solution**: Ensure all required fields are provided (payerId, payerName, providerNPI, patient info, claimControlNumber)

2. **"Claim submission not found"**
   - **Cause**: Invalid submission ID when checking by database ID
   - **Solution**: Verify the submission ID exists in claims_submissions table

3. **"Could not extract payload from Office Ally SOAP response"**
   - **Cause**: Office Ally returned an error or unexpected response format
   - **Solution**: Check credentials, verify claim exists in Office Ally system

4. **"Office Ally HTTP error"**
   - **Cause**: Network or authentication issue
   - **Solution**: Verify Office Ally credentials and endpoint URL

---

## Files Created

### Core Libraries

1. **`lib/x12-276-generator.js`** (205 lines)
   - `generateX12_276(claimInquiry)` - Generate single claim inquiry
   - `generateBatchX12_276(claimInquiries)` - Generate batch inquiries
   - `validateClaimInquiry(claimInquiry)` - Validate inquiry data

2. **`lib/x12-277-parser.js`** (400+ lines)
   - `parseX12_277(x12_277)` - Parse X12 277 response
   - `extractSimpleStatus(parsedResult)` - Extract simplified status
   - Status code lookup tables

3. **`lib/claims-status-service.js`** (280+ lines)
   - `checkClaimStatus(claimInquiry)` - Check status by inquiry data
   - `checkBatchClaimStatus(claimInquiries)` - Check multiple claims
   - `checkClaimStatusFromDatabase(supabase, submissionId)` - Check by DB ID
   - `generateOfficeAllySOAPRequest(x12_276)` - Generate SOAP envelope

### API Routes

4. **`api-server.js`** (updated)
   - Added `POST /api/claims/status/check`
   - Added `GET /api/claims/status/:submissionId`

### Testing

5. **`test-claims-status.js`** (320+ lines)
   - Test X12 276 generation
   - Test X12 277 parsing
   - Test full status check
   - Test API endpoints
   - Sample claim data

### Documentation

6. **`CLAIMS_STATUS_CHECKING_GUIDE.md`** (this file)

---

## Next Steps

### Immediate

1. ✅ Test X12 276 generation - **COMPLETE**
2. ✅ Test X12 277 parsing - **COMPLETE**
3. ✅ Create API routes - **COMPLETE**
4. ⏳ Test with real claim control numbers from Office Ally
5. ⏳ Add to claims submission UI workflow

### Future Enhancements

1. **Batch Status Checking**
   - Check status of multiple claims in single request
   - Daily batch job to check all pending claims

2. **Status History Tracking**
   - Store status changes over time
   - Show status timeline in UI

3. **Automated Notifications**
   - Email/SMS when claim status changes to PAID or DENIED
   - Alert when claims are stuck in PENDING for > 30 days

4. **Claims Dashboard**
   - Visual dashboard showing claim status distribution
   - Aging report for pending claims
   - Payment tracking

5. **ERA Integration**
   - Link X12 277 status with X12 835 ERA (Electronic Remittance Advice)
   - Automatic posting of payments to accounting system

---

## Support

For questions or issues:
- Review test output: `node test-claims-status.js`
- Check Office Ally credentials in `.env.local`
- Verify claim control numbers exist in Office Ally
- Contact Office Ally support: (360) 975-7000

**This implementation is complete and ready for testing with real claim data!**
