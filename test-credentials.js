#!/usr/bin/env node

// Test Office Ally credentials to see if they work for eligibility API
// This will test without sending real patient data

console.log('🔐 Office Ally Credentials Test');
console.log('================================\n');

async function testCredentials() {
    const username = process.env.OFFICE_ALLY_USERNAME;
    const password = process.env.OFFICE_ALLY_PASSWORD;
    
    if (!username || !password) {
        console.log('❌ No credentials found');
        console.log('Set OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD environment variables');
        console.log('\nExample:');
        console.log('export OFFICE_ALLY_USERNAME="your_username"');
        console.log('export OFFICE_ALLY_PASSWORD="your_password"');
        return;
    }
    
    console.log(`📋 Testing credentials for: ${username}`);
    console.log('🎯 Endpoint: https://eliws.officeally.com/eligibility/ws/EligibilityService');
    
    // Create a minimal test SOAP request (won't process real data)
    const testSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:eli="http://www.officeally.com/eligibility">
<soap:Header>
<wsse:Security soap:mustUnderstand="true"
xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken>
<wsse:Username>${username}</wsse:Username>
<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soap:Header>
<soap:Body>
<eli:EligibilityRequest>
<eli:Payload>TEST</eli:Payload>
<eli:Timestamp>${new Date().toISOString()}</eli:Timestamp>
</eli:EligibilityRequest>
</soap:Body>
</soap:Envelope>`;

    try {
        console.log('📡 Sending test request...');
        
        const response = await fetch('https://eliws.officeally.com/eligibility/ws/EligibilityService', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.officeally.com/eligibility/EligibilityRequest'
            },
            body: testSoap,
            timeout: 10000
        });
        
        const responseText = await response.text();
        
        console.log(`📨 Response Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 401 || response.status === 403) {
            console.log('❌ AUTHENTICATION FAILED');
            console.log('   Your SFTP credentials do not work for the eligibility API');
            console.log('   You likely need separate Web Services API credentials');
        } else if (response.status === 404) {
            console.log('⚠️  ENDPOINT NOT FOUND');
            console.log('   The eligibility API endpoint may be different');
            console.log('   Or eligibility services may not be enabled for your account');
        } else if (response.status === 400) {
            console.log('✅ CREDENTIALS WORK!');
            console.log('   Authentication successful (400 = bad request format, not auth error)');
            console.log('   Your credentials can access the eligibility API');
        } else if (response.status === 200) {
            console.log('✅ CREDENTIALS WORK!');
            console.log('   Full success - ready for real eligibility checks');
        } else {
            console.log(`⚠️  UNEXPECTED RESPONSE: ${response.status}`);
            console.log('   Need to investigate further');
        }
        
        // Show response snippet (first 500 chars)
        console.log('\n📄 Response Preview:');
        console.log(responseText.substring(0, 500));
        if (responseText.length > 500) console.log('...(truncated)');
        
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.log('❌ ENDPOINT NOT FOUND');
            console.log('   Cannot reach Office Ally eligibility service');
            console.log('   Check if the endpoint URL is correct');
        } else if (error.name === 'TimeoutError') {
            console.log('⏳ TIMEOUT');
            console.log('   Server took too long to respond');
        } else {
            console.log(`💥 ERROR: ${error.message}`);
        }
    }
    
    console.log('\n🔍 Interpretation Guide:');
    console.log('• 401/403: Need different credentials (not SFTP)');
    console.log('• 404: Wrong endpoint or service not available');  
    console.log('• 400: Credentials work! (just bad test data format)');
    console.log('• 200: Perfect! Ready to go');
    console.log('• Connection errors: Check endpoint URL');
}

if (require.main === module) {
    testCredentials().catch(console.error);
}

module.exports = { testCredentials };