#!/usr/bin/env node

// Sophisticated UHIN 500 Error Debugger
// Captures detailed request/response data and tests multiple TPN strategies

console.log('🔬 UHIN 500 Error Deep Debug Analysis');
console.log('====================================\n');

// Mock database
const mockPool = { query: async () => ({ rows: [] }) };
require.cache[require.resolve('./api/_db')] = { exports: { pool: mockPool } };

// Enhanced fetch with detailed logging
const originalFetch = fetch;
global.fetch = async (url, options) => {
    console.log('📡 OUTGOING REQUEST:');
    console.log('===================');
    console.log(`URL: ${url}`);
    console.log(`Method: ${options.method}`);
    console.log('Headers:');
    Object.entries(options.headers || {}).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    
    // Extract and analyze SOAP envelope
    if (options.body) {
        console.log('\n📋 SOAP ENVELOPE ANALYSIS:');
        console.log('===========================');
        
        // Extract authentication TPN
        const senderMatch = options.body.match(/<SenderID>(.*?)<\/SenderID>/);
        const authTPN = senderMatch ? senderMatch[1] : 'NOT_FOUND';
        
        // Extract X12 payload TPN
        const x12Match = options.body.match(/<Payload>(.*?)<\/Payload>/s);
        let payloadTPN = 'NOT_FOUND';
        if (x12Match) {
            const isaMatch = x12Match[1].match(/ISA\*00\*\s+\*00\*\s+\*ZZ\*(.*?)\s+\*ZZ\*/);
            payloadTPN = isaMatch ? isaMatch[1] : 'NOT_FOUND';
        }
        
        console.log(`🔐 SOAP Authentication TPN: ${authTPN}`);
        console.log(`📄 X12 Payload TPN: ${payloadTPN}`);
        console.log(`🎭 TPN Match: ${authTPN === payloadTPN ? '✅ MATCH' : '❌ MISMATCH'}`);
        
        if (authTPN !== payloadTPN) {
            console.log(`\n⚠️  TPN MISMATCH DETECTED!`);
            console.log(`   This could be causing the 500 error`);
            console.log(`   UHIN may validate TPN consistency`);
        }
        
        // Show first 500 chars of SOAP for verification
        console.log('\n📄 SOAP Envelope Preview:');
        console.log(options.body.substring(0, 500) + '...');
    }
    
    try {
        const response = await originalFetch(url, options);
        
        console.log('\n📨 RESPONSE ANALYSIS:');
        console.log('=====================');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Response Headers:');
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });
        
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        
        console.log(`\nResponse Size: ${responseText.length} characters`);
        
        if (response.status === 500) {
            console.log('\n🚨 500 ERROR ANALYSIS:');
            console.log('======================');
            
            // Look for specific error patterns
            if (responseText.includes('TPN') || responseText.includes('Trading Partner')) {
                console.log('🎯 TPN-related error detected in response');
            }
            if (responseText.includes('Authentication') || responseText.includes('Authorization')) {
                console.log('🔐 Authentication error detected');
            }
            if (responseText.includes('Validation') || responseText.includes('Format')) {
                console.log('📋 Format validation error detected');
            }
            if (responseText.includes('Enrollment') || responseText.includes('Registration')) {
                console.log('📝 Enrollment/Registration error detected');
            }
            
            console.log('\n📄 Error Response Body (first 1000 chars):');
            console.log('=' .repeat(50));
            console.log(responseText.substring(0, 1000));
            if (responseText.length > 1000) console.log('...(truncated)');
        }
        
        return response;
        
    } catch (error) {
        console.log(`\n💥 FETCH ERROR: ${error.message}`);
        throw error;
    }
};

async function testTPNStrategies() {
    console.log('🧪 Testing Multiple TPN Strategies');
    console.log('==================================\n');
    
    const testPatient = {
        first: 'DEBUG',
        last: 'TESTCASE',
        dob: '1990-01-01',
        ssn: '999888777'
    };
    
    const strategies = [
        {
            name: 'Our TPN Everywhere (Control)',
            useOfficeAllyTPN: false,
            description: 'Should work if Utah Medicaid accepts our TPN'
        },
        {
            name: 'Office Ally TPN Masquerading',
            useOfficeAllyTPN: true,
            description: 'Tests if UHIN allows TPN masquerading'
        }
    ];
    
    for (const strategy of strategies) {
        console.log(`\n🎯 TESTING STRATEGY: ${strategy.name}`);
        console.log(`📝 Description: ${strategy.description}`);
        console.log('=' .repeat(60));
        
        // Set environment for this test
        process.env.USE_OFFICE_ALLY_TPN = strategy.useOfficeAllyTPN.toString();
        process.env.ELIGIBILITY_PROVIDER = 'uhin';
        process.env.SIMULATION_MODE = 'false';
        process.env.UHIN_USERNAME = '[REDACTED-UHIN-USERNAME]';
        process.env.UHIN_PASSWORD = '[REDACTED-UHIN-PASSWORD]';
        
        try {
            // Import handler fresh for each test
            delete require.cache[require.resolve('./api/medicaid/check.js')];
            const handler = require('./api/medicaid/check.js');
            
            const req = { method: 'POST', body: testPatient };
            const res = {
                headers: {},
                statusCode: 200,
                setHeader: () => {},
                status: (code) => { res.statusCode = code; return res; },
                json: (data) => res.data = data,
                end: () => {}
            };
            
            await handler(req, res);
            
            console.log(`\n✅ Strategy Result: ${res.statusCode}`);
            if (res.data) {
                console.log(`📊 Enrolled: ${res.data.enrolled}`);
                console.log(`🔍 Verified: ${res.data.verified}`);
                if (!res.data.enrolled) {
                    console.log(`❌ Error: ${res.data.error}`);
                }
            }
            
        } catch (error) {
            console.log(`\n💥 Strategy Failed: ${error.message}`);
            
            // Analyze the error
            if (error.message.includes('500')) {
                console.log('🔍 500 Error Analysis Complete - See detailed logs above');
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function runDebugSession() {
    console.log('🔬 Starting Deep Debug Session...\n');
    
    console.log('📋 Debug Configuration:');
    console.log('=======================');
    console.log('• Enhanced request/response logging');
    console.log('• TPN mismatch detection');
    console.log('• Error pattern analysis');
    console.log('• Multiple strategy testing\n');
    
    await testTPNStrategies();
    
    console.log('\n🎯 DEBUG SESSION SUMMARY:');
    console.log('=========================');
    console.log('• Check TPN mismatch warnings above');
    console.log('• Look for specific error patterns in 500 responses');
    console.log('• Compare behavior between strategies');
    console.log('• Document findings for next steps');
}

if (require.main === module) {
    runDebugSession().catch(console.error);
}

module.exports = { runDebugSession };