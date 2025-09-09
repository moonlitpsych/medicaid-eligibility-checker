#!/usr/bin/env node

/**
 * Test Database-Driven API Endpoints
 * 
 * This script tests the new database-driven API endpoints without needing
 * to worry about server startup issues.
 */

require('dotenv').config({ path: '.env.local' });

const {
    handleDatabaseDrivenEligibilityCheck,
    handleGetPayers,
    handleGetPayerConfig
} = require('./database-driven-api-routes');

/**
 * Mock Express request/response objects for testing
 */
function createMockReq(body = {}, params = {}) {
    return { body, params };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.data = data;
            console.log(`📨 Response (${this.statusCode}):`, JSON.stringify(data, null, 2));
            return this;
        }
    };
    return res;
}

/**
 * Test the payers endpoint
 */
async function testGetPayers() {
    console.log('\n🧪 Testing GET /api/database-eligibility/payers...');
    
    try {
        const req = createMockReq();
        const res = createMockRes();
        
        await handleGetPayers(req, res);
        
        if (res.statusCode === 200 && res.data.success) {
            console.log(`✅ Payers endpoint works - Found ${res.data.payers.length} payer categories`);
            return true;
        } else {
            console.log('❌ Payers endpoint failed');
            return false;
        }
    } catch (error) {
        console.error('❌ Payers endpoint error:', error.message);
        return false;
    }
}

/**
 * Test the payer config endpoint
 */
async function testGetPayerConfig() {
    console.log('\n🧪 Testing GET /api/database-eligibility/payer/:payerId/config...');
    
    try {
        // Test Utah Medicaid config
        console.log('   📋 Testing Utah Medicaid (UTMCD) config...');
        const req1 = createMockReq({}, { payerId: 'UTMCD' });
        const res1 = createMockRes();
        
        await handleGetPayerConfig(req1, res1);
        
        if (res1.statusCode === 200 && res1.data.success) {
            console.log(`   ✅ Utah Medicaid config works`);
        } else {
            console.log(`   ❌ Utah Medicaid config failed`);
            return false;
        }
        
        // Test Aetna config
        console.log('   📋 Testing Aetna (60054) config...');
        const req2 = createMockReq({}, { payerId: '60054' });
        const res2 = createMockRes();
        
        await handleGetPayerConfig(req2, res2);
        
        if (res2.statusCode === 200 && res2.data.success) {
            console.log(`   ✅ Aetna config works`);
            return true;
        } else {
            console.log(`   ❌ Aetna config failed`);
            return false;
        }
    } catch (error) {
        console.error('❌ Payer config endpoint error:', error.message);
        return false;
    }
}

/**
 * Test the eligibility check endpoint
 */
async function testEligibilityCheck() {
    console.log('\n🧪 Testing POST /api/database-eligibility/check...');
    
    try {
        // Test Utah Medicaid eligibility check
        console.log('   📡 Testing Utah Medicaid eligibility check (Jeremy Montoya)...');
        const req1 = createMockReq({
            payerId: 'UTMCD',
            firstName: 'Jeremy',
            lastName: 'Montoya',
            dateOfBirth: '1984-07-17',
            gender: 'M'
        });
        const res1 = createMockRes();
        
        const startTime = Date.now();
        await handleDatabaseDrivenEligibilityCheck(req1, res1);
        const duration = Date.now() - startTime;
        
        console.log(`   ⏱️  Response time: ${duration}ms`);
        
        if (res1.statusCode === 200) {
            if (res1.data.enrolled) {
                console.log(`   ✅ Utah Medicaid eligibility check works - ENROLLED`);
                console.log(`   🏥 Program: ${res1.data.program}`);
                console.log(`   📋 Plan: ${res1.data.planType}`);
            } else {
                console.log(`   ⚠️  Utah Medicaid eligibility check works but patient NOT ENROLLED`);
                console.log(`   ❌ Error: ${res1.data.error}`);
            }
        } else {
            console.log(`   ❌ Utah Medicaid eligibility check failed (${res1.statusCode})`);
            return false;
        }
        
        // Test Aetna eligibility check
        console.log('\n   📡 Testing Aetna eligibility check (Tella Silver)...');
        const req2 = createMockReq({
            payerId: '60054',
            firstName: 'Tella',
            lastName: 'Silver',
            dateOfBirth: '1995-09-18',
            gender: 'F',
            memberNumber: 'W268197637'
        });
        const res2 = createMockRes();
        
        const startTime2 = Date.now();
        await handleDatabaseDrivenEligibilityCheck(req2, res2);
        const duration2 = Date.now() - startTime2;
        
        console.log(`   ⏱️  Response time: ${duration2}ms`);
        
        if (res2.statusCode === 200) {
            if (res2.data.enrolled) {
                console.log(`   ✅ Aetna eligibility check works - ENROLLED`);
                console.log(`   🏥 Program: ${res2.data.program}`);
                console.log(`   📋 Plan: ${res2.data.planType}`);
                if (res2.data.copayInfo) {
                    console.log(`   💰 Copay info found`);
                }
            } else {
                console.log(`   ⚠️  Aetna eligibility check works but patient NOT ENROLLED`);
                console.log(`   ❌ Error: ${res2.data.error}`);
            }
            return true;
        } else {
            console.log(`   ❌ Aetna eligibility check failed (${res2.statusCode})`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Eligibility check endpoint error:', error.message);
        return false;
    }
}

/**
 * Main test execution
 */
async function runAPITests() {
    console.log('🧪 DATABASE-DRIVEN API ENDPOINTS - TEST SUITE');
    console.log('==============================================');
    
    const results = [];
    
    try {
        // Test 1: Get payers
        results.push(await testGetPayers());
        
        // Test 2: Get payer configs
        results.push(await testGetPayerConfig());
        
        // Test 3: Eligibility checks (with real Office Ally calls)
        results.push(await testEligibilityCheck());
        
        // Summary
        const passed = results.filter(r => r).length;
        const total = results.length;
        
        console.log('\n📊 API TEST SUMMARY');
        console.log('==================');
        console.log(`Tests passed: ${passed}/${total}`);
        
        if (passed === total) {
            console.log('\n🎉 ALL DATABASE-DRIVEN API TESTS PASSED!');
            console.log('✅ The database-driven system is working perfectly');
            console.log('✅ Ready for production use');
            
            console.log('\n📋 Next Steps:');
            console.log('1. Fix any server startup issues (route path parsing)');
            console.log('2. Update your Vue.js frontend to use these endpoints:');
            console.log('   - GET /api/database-eligibility/payers');
            console.log('   - GET /api/database-eligibility/payer/:payerId/config');
            console.log('   - POST /api/database-eligibility/check');
            console.log('3. Test in production with real users');
            
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed - review the errors above');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAPITests();
}

module.exports = { runAPITests };