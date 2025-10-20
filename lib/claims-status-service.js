// lib/claims-status-service.js - Claims Status Service with Office Ally Integration

require('dotenv').config({ path: '.env.local' });
const { generateX12_276, validateClaimInquiry } = require('./x12-276-generator');
const { parseX12_277, extractSimpleStatus } = require('./x12-277-parser');

// Office Ally Configuration
const OFFICE_ALLY_CONFIG = {
    endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME,
    password: process.env.OFFICE_ALLY_PASSWORD,
    receiverID: 'OFFALLY',
    senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680'
};

/**
 * Generate UUID for PayloadID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate SOAP envelope for Office Ally claims status inquiry (X12 276)
 *
 * @param {string} x12_276 - X12 276 claims status request payload
 * @returns {string} SOAP envelope
 */
function generateOfficeAllySOAPRequest(x12_276) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = generateUUID();

    return `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
<soapenv:Header>
<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken>
<wsse:Username>${OFFICE_ALLY_CONFIG.username}</wsse:Username>
<wsse:Password>${OFFICE_ALLY_CONFIG.password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soapenv:Header>
<soapenv:Body>
<ns1:COREEnvelopeRealTimeRequest xmlns:ns1="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<PayloadType>X12_276_Request_005010X212</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${OFFICE_ALLY_CONFIG.senderID}</SenderID>
<ReceiverID>${OFFICE_ALLY_CONFIG.receiverID}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>
<![CDATA[${x12_276}]]>
</Payload>
</ns1:COREEnvelopeRealTimeRequest>
</soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Send SOAP request to Office Ally
 *
 * @param {string} soapRequest - SOAP envelope with X12 276
 * @returns {Promise<string>} X12 277 response
 */
async function sendOfficeAllyRequest(soapRequest) {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
            'Action': 'RealTimeTransaction'
        },
        body: soapRequest
    });

    if (!response.ok) {
        throw new Error(`Office Ally HTTP error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();

    // Log the raw response for debugging
    console.log('\n📄 Raw SOAP Response (first 1000 chars):');
    console.log(responseText.substring(0, 1000));
    console.log('\n');

    // Check for error messages in the response
    const errorMatch = responseText.match(/<ErrorCode>(.*?)<\/ErrorCode>[\s\S]*?<ErrorMessage>(.*?)<\/ErrorMessage>/);
    if (errorMatch) {
        throw new Error(`Office Ally Error: ${errorMatch[1]} - ${errorMatch[2]}`);
    }

    // Check for fault messages
    const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
    if (faultMatch) {
        throw new Error(`Office Ally SOAP Fault: ${faultMatch[1]}`);
    }

    // Extract X12 277 payload from SOAP response
    const payloadMatch = responseText.match(/<Payload>([\s\S]*?)<\/Payload>/);
    if (!payloadMatch) {
        // Save full response for inspection
        const fs = require('fs');
        fs.writeFileSync('/tmp/office-ally-276-response-error.xml', responseText);
        console.log('💾 Full response saved to /tmp/office-ally-276-response-error.xml');
        throw new Error('Could not extract payload from Office Ally SOAP response');
    }

    // Remove CDATA wrapper if present
    let x12_277 = payloadMatch[1].trim();
    x12_277 = x12_277.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();

    return x12_277;
}

/**
 * Check claim status via Office Ally
 *
 * @param {Object} claimInquiry - Claim inquiry parameters
 * @param {string} claimInquiry.payerId - Payer ID (e.g., "UTMCD")
 * @param {string} claimInquiry.payerName - Payer name (e.g., "UTAH MEDICAID")
 * @param {string} claimInquiry.providerNPI - Provider NPI
 * @param {string} claimInquiry.providerName - Provider name
 * @param {Object} claimInquiry.patient - Patient information
 * @param {string} claimInquiry.patient.firstName
 * @param {string} claimInquiry.patient.lastName
 * @param {string} claimInquiry.patient.dateOfBirth - Format: YYYY-MM-DD
 * @param {string} claimInquiry.patient.memberId
 * @param {string} claimInquiry.claimControlNumber - Claim control number from 837
 * @param {string} claimInquiry.serviceDate - Service date (YYYY-MM-DD)
 * @param {number} claimInquiry.claimAmount - Claim amount
 * @returns {Promise<Object>} Parsed claim status response
 */
async function checkClaimStatus(claimInquiry) {
    const startTime = Date.now();

    // Validate inquiry data
    const validation = validateClaimInquiry(claimInquiry);
    if (!validation.valid) {
        throw new Error(`Invalid claim inquiry data: ${validation.errors.join(', ')}`);
    }

    try {
        // Generate X12 276 request
        console.log('🔍 Generating X12 276 claim status request...');
        const x12_276 = generateX12_276(claimInquiry);
        console.log('✅ X12 276 generated successfully');

        // Wrap in SOAP envelope
        const soapRequest = generateOfficeAllySOAPRequest(x12_276);

        // Send to Office Ally
        console.log('📤 Sending claim status request to Office Ally...');
        const x12_277 = await sendOfficeAllyRequest(soapRequest);
        console.log('✅ Received X12 277 response from Office Ally');

        // Parse X12 277 response
        console.log('📋 Parsing X12 277 response...');
        const parsedResponse = parseX12_277(x12_277);
        console.log('✅ X12 277 parsed successfully');

        const responseTime = Date.now() - startTime;

        return {
            success: true,
            responseTime,
            request: {
                x12_276,
                claimInquiry
            },
            response: {
                x12_277,
                parsed: parsedResponse,
                simplified: extractSimpleStatus(parsedResponse)
            },
            summary: parsedResponse.summary
        };

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('❌ Error checking claim status:', error);

        return {
            success: false,
            responseTime,
            error: error.message,
            request: {
                claimInquiry
            }
        };
    }
}

/**
 * Check status for multiple claims in batch
 *
 * @param {Array<Object>} claimInquiries - Array of claim inquiry objects
 * @returns {Promise<Object>} Batch status results
 */
async function checkBatchClaimStatus(claimInquiries) {
    const results = {
        totalClaims: claimInquiries.length,
        successful: 0,
        failed: 0,
        claims: []
    };

    for (const inquiry of claimInquiries) {
        const result = await checkClaimStatus(inquiry);
        results.claims.push(result);

        if (result.success) {
            results.successful++;
        } else {
            results.failed++;
        }
    }

    return results;
}

/**
 * Check claim status from database claim submission record
 *
 * Looks up claim from claims_submissions table and checks status with Office Ally
 *
 * @param {Object} supabase - Supabase client
 * @param {string} claimSubmissionId - UUID of claim submission record
 * @returns {Promise<Object>} Claim status response
 */
async function checkClaimStatusFromDatabase(supabase, claimSubmissionId) {
    // Get claim submission from database
    const { data: claim, error } = await supabase
        .from('claims_submissions')
        .select(`
            *,
            payer:payers(name, oa_eligibility_270_id),
            provider:providers(npi, first_name, last_name, organization_name)
        `)
        .eq('id', claimSubmissionId)
        .single();

    if (error || !claim) {
        throw new Error(`Claim submission not found: ${claimSubmissionId}`);
    }

    // Extract patient info from claim data
    const claimData = claim.claim_data;

    // Build claim inquiry object
    const claimInquiry = {
        payerId: claim.payer.oa_eligibility_270_id || 'UTMCD',
        payerName: claim.payer.name.toUpperCase().replace(/[^A-Z0-9 ]/g, ''),
        providerNPI: claim.provider.npi,
        providerName: claim.provider.organization_name ||
                      `${claim.provider.first_name} ${claim.provider.last_name}`.toUpperCase(),
        patient: {
            firstName: claimData.patient?.firstName || '',
            lastName: claimData.patient?.lastName || '',
            dateOfBirth: claimData.patient?.dateOfBirth || '',
            memberId: claimData.patient?.memberId || ''
        },
        claimControlNumber: claim.control_number,
        serviceDate: claimData.serviceLines?.[0]?.serviceDate || claim.service_date_start,
        claimAmount: claim.total_amount || claimData.totalAmount
    };

    // Check claim status
    const statusResult = await checkClaimStatus(claimInquiry);

    // Update database with status check result
    await supabase
        .from('claims_submissions')
        .update({
            last_status_check: new Date().toISOString(),
            status_check_response: statusResult.response?.x12_277,
            current_status: statusResult.summary?.overallStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', claimSubmissionId);

    return statusResult;
}

module.exports = {
    checkClaimStatus,
    checkBatchClaimStatus,
    checkClaimStatusFromDatabase,
    generateOfficeAllySOAPRequest
};
