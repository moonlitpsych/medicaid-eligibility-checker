#!/usr/bin/env node

// Discover the correct Office Ally eligibility endpoint
// Tests multiple common endpoints to find the working one

console.log('🔍 Office Ally Endpoint Discovery');
console.log('=================================\n');

const endpoints = [
    'https://webservices.officeally.com/eligibility',
    'https://ws.officeally.com/eligibility', 
    'https://api.officeally.com/eligibility',
    'https://eliws.officeally.com/eligibility/ws/EligibilityService',
    'https://webservices.officeally.com/EligibilityService',
    'https://secure.officeally.com/eligibility',
    'https://webservices.officeally.com/eligibility.asmx'
];

async function testEndpoint(endpoint, username, password) {
    console.log(`\n🔗 Testing: ${endpoint}`);
    
    const testSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
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
<EligibilityRequest>
<Payload>TEST</Payload>
</EligibilityRequest>
</soap:Body>
</soap:Envelope>`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'EligibilityRequest'
            },
            body: testSoap,
            timeout: 10000
        });
        
        const responseText = await response.text();
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 401 || response.status === 403) {
            console.log('   ❌ Authentication failed');
            return { endpoint, status: 'auth_failed', details: 'Invalid credentials' };
        } else if (response.status === 404) {
            console.log('   ❌ Endpoint not found');
            return { endpoint, status: 'not_found', details: 'Service not available' };
        } else if (response.status >= 200 && response.status < 300) {
            console.log('   ✅ SUCCESS! This endpoint is working');
            return { endpoint, status: 'success', details: 'Ready to use', response: responseText.substring(0, 200) };
        } else if (response.status === 400) {
            console.log('   ✅ Credentials work (bad request format)');
            return { endpoint, status: 'credentials_ok', details: 'Auth successful, format issue', response: responseText.substring(0, 200) };
        } else if (response.status === 500) {
            console.log('   ⚠️  Server error (but endpoint exists)');
            return { endpoint, status: 'server_error', details: 'Server processing error', response: responseText.substring(0, 200) };
        } else {
            console.log(`   ⚠️  Unexpected: ${response.status}`);
            return { endpoint, status: 'unexpected', details: `Status ${response.status}`, response: responseText.substring(0, 200) };
        }
        
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.log('   ❌ DNS lookup failed');
            return { endpoint, status: 'dns_failed', details: 'Cannot resolve hostname' };
        } else if (error.name === 'TimeoutError') {
            console.log('   ⏳ Timeout (may be valid but slow)');
            return { endpoint, status: 'timeout', details: 'Server timeout' };
        } else {
            console.log(`   💥 Error: ${error.message}`);
            return { endpoint, status: 'error', details: error.message };
        }
    }
}

async function discoverEndpoint() {
    const username = process.env.OFFICE_ALLY_USERNAME;
    const password = process.env.OFFICE_ALLY_PASSWORD;
    
    if (!username || !password) {
        console.log('❌ No credentials found');
        console.log('Set OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD');
        return;
    }
    
    console.log(`🔐 Using credentials: ${username}`);
    console.log(`📋 Testing ${endpoints.length} endpoints...\n`);
    
    const results = [];
    
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint, username, password);
        results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 DISCOVERY RESULTS');
    console.log('===================');
    
    const successful = results.filter(r => r.status === 'success' || r.status === 'credentials_ok');
    const authFailed = results.filter(r => r.status === 'auth_failed');
    const notFound = results.filter(r => r.status === 'not_found');
    const errors = results.filter(r => r.status === 'error' || r.status === 'dns_failed');
    
    if (successful.length > 0) {
        console.log('\n✅ WORKING ENDPOINTS:');
        successful.forEach(r => {
            console.log(`   ${r.endpoint} (${r.details})`);
        });
        
        console.log(`\n🎯 RECOMMENDED: Use this endpoint:`);
        console.log(`export OFFICE_ALLY_ENDPOINT="${successful[0].endpoint}"`);
    }
    
    if (authFailed.length > 0) {
        console.log('\n🔐 AUTH FAILED (may need different credentials):');
        authFailed.forEach(r => console.log(`   ${r.endpoint}`));
    }
    
    if (notFound.length > 0) {
        console.log('\n❌ NOT FOUND:');
        notFound.forEach(r => console.log(`   ${r.endpoint}`));
    }
    
    if (errors.length > 0) {
        console.log('\n💥 ERRORS:');
        errors.forEach(r => console.log(`   ${r.endpoint} - ${r.details}`));
    }
    
    if (successful.length === 0) {
        console.log('\n⚠️  NO WORKING ENDPOINTS FOUND');
        console.log('This could mean:');
        console.log('• Your account needs eligibility API access enabled');
        console.log('• Office Ally uses a different authentication method');
        console.log('• The eligibility API requires account setup');
        console.log('\nRecommendation: Contact Office Ally support');
    }
}

if (require.main === module) {
    discoverEndpoint().catch(console.error);
}

module.exports = { discoverEndpoint };