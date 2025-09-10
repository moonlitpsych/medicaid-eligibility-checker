#!/usr/bin/env node

/**
 * Test different Notifyre domain patterns to find the correct API endpoint
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const DOMAIN_PATTERNS = [
    'api.notifyre.com',
    'us.api.notifyre.com', 
    'api-us.notifyre.com',
    'rest.notifyre.com',
    'sms.notifyre.com',
    'v1.api.notifyre.com'
];

const ENDPOINTS = ['/sms', '/api/sms', '/v1/sms'];

async function testDomainEndpoint(domain, path) {
    return new Promise((resolve) => {
        const testData = JSON.stringify({
            Body: "Test",
            Recipients: [{ Type: "MobileNumber", Value: "+13852018161" }],
            From: process.env.NOTIFYRE_FROM_NUMBER
        });

        const options = {
            hostname: domain,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTIFYRE_AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            },
            timeout: 3000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    domain,
                    path,
                    statusCode: res.statusCode,
                    body: data.substring(0, 200)
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                domain,
                path,
                error: error.code || error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                domain,
                path,
                error: 'TIMEOUT'
            });
        });
        
        req.write(testData);
        req.end();
    });
}

async function discoverDomainEndpoint() {
    console.log('🌐 Testing different Notifyre domain patterns...\n');
    
    for (const domain of DOMAIN_PATTERNS) {
        console.log(`🔍 Testing domain: ${domain}`);
        
        for (const endpoint of ENDPOINTS) {
            const result = await testDomainEndpoint(domain, endpoint);
            
            const url = `https://${result.domain}${result.path}`;
            
            if (result.error) {
                if (result.error === 'ENOTFOUND') {
                    console.log(`   ❌ ${url} - Domain not found`);
                } else if (result.error === 'TIMEOUT') {
                    console.log(`   ⏰ ${url} - Timeout`);
                } else {
                    console.log(`   ❌ ${url} - ${result.error}`);
                }
            } else if (result.statusCode === 200 || result.statusCode === 201) {
                console.log(`   ✅ SUCCESS! ${url} - HTTP ${result.statusCode}`);
                console.log(`   📝 Response: ${result.body}...`);
                return { domain: result.domain, path: result.path };
            } else if (result.statusCode === 401) {
                console.log(`   🔐 ${url} - HTTP ${result.statusCode} (Auth issue - endpoint exists!)`);
            } else if (result.statusCode === 400) {
                console.log(`   📝 ${url} - HTTP ${result.statusCode} (Bad request - endpoint exists!)`);
                console.log(`   Response: ${result.body}...`);
            } else {
                console.log(`   ❌ ${url} - HTTP ${result.statusCode}`);
            }
        }
        console.log('');
    }
    
    console.log('❌ No working domain/endpoint combinations found.');
    return null;
}

if (require.main === module) {
    discoverDomainEndpoint();
}