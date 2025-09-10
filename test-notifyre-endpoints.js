#!/usr/bin/env node

/**
 * Test different Notifyre API endpoints to find the correct one
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const ENDPOINTS_TO_TRY = [
    '/api/v1/sms/submit',
    '/sms/submit', 
    '/api/sms/submit',
    '/v1/sms/submit',
    '/api/v1/sms',
    '/sms',
    '/api/v1/messages',
    '/messages'
];

async function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            Body: "Test message",
            Recipients: [
                {
                    Type: "MobileNumber",
                    Value: "+13852018161"
                }
            ],
            From: process.env.NOTIFYRE_FROM_NUMBER,
            ScheduledDate: null,
            AddUnsubscribeLink: false,
            CallbackUrl: null,
            Metadata: {
                "source": "endpoint-test"
            },
            CampaignName: "endpoint-discovery"
        });

        const options = {
            hostname: 'api.notifyre.com',
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTIFYRE_AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData),
                'User-Agent': 'moonlit-endpoint-discovery/1.0'
            },
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    path: path,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                path: path,
                error: error.message,
                statusCode: null
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                path: path,
                error: 'Request timeout',
                statusCode: null
            });
        });
        
        req.write(testData);
        req.end();
    });
}

async function discoverCorrectEndpoint() {
    console.log('🔍 Testing Notifyre API endpoints...\n');
    
    console.log('📋 Configuration:');
    console.log(`   Base URL: https://api.notifyre.com`);
    console.log(`   Account SID: ${process.env.NOTIFYRE_ACCOUNT_SID}`);
    console.log(`   From Number: ${process.env.NOTIFYRE_FROM_NUMBER}`);
    console.log(`   Token: ${process.env.NOTIFYRE_AUTH_TOKEN ? 'Configured ✅' : 'Missing ❌'}\n`);
    
    for (const endpoint of ENDPOINTS_TO_TRY) {
        console.log(`🧪 Testing: https://api.notifyre.com${endpoint}`);
        
        const result = await testEndpoint(endpoint);
        
        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else if (result.statusCode === 200 || result.statusCode === 201) {
            console.log(`   ✅ SUCCESS! Status: ${result.statusCode}`);
            console.log(`   📝 Response: ${result.body.substring(0, 200)}...`);
            console.log(`\n🎉 FOUND WORKING ENDPOINT: https://api.notifyre.com${endpoint}\n`);
            return endpoint;
        } else if (result.statusCode === 401) {
            console.log(`   🔐 Auth issue (401) - endpoint exists but auth failed`);
        } else if (result.statusCode === 400) {
            console.log(`   📝 Bad request (400) - endpoint exists but request format issue`);
            console.log(`   Response: ${result.body.substring(0, 100)}...`);
        } else {
            console.log(`   ❌ HTTP ${result.statusCode}: ${result.statusMessage}`);
        }
        
        console.log('');
    }
    
    console.log('❌ No working endpoints found. Contact Notifyre support for correct API path.');
    return null;
}

if (require.main === module) {
    discoverCorrectEndpoint();
}