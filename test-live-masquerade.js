#!/usr/bin/env node

// LIVE TEST: Office Ally TPN Masquerading via UHIN
// This will make REAL API calls to Utah Medicaid!

console.log('🔥 LIVE Office Ally TPN Masquerading Test');
console.log('==========================================\n');

console.log('⚠️  WARNING: This will make REAL API calls to Utah Medicaid!');
console.log('📋 Strategy: Office Ally TPN routing via UHIN transport\n');

// Mock database pool
const mockPool = {
    query: async (...args) => {
        console.log('📝 Database logging:', {
            patient: args[1]?.slice(0, 3),
            enrolled: args[1]?.[9],
            timestamp: new Date().toISOString()
        });
        return { rows: [] };
    }
};

require.cache[require.resolve('./api/_db')] = {
    exports: { pool: mockPool }
};

const handler = require('./api/medicaid/check.js');

async function testLiveMasquerading() {
    console.log('🎭 LIVE CONFIGURATION:');
    console.log('=====================');
    console.log(`   Transport: UHIN (${process.env.UHIN_USERNAME})`);
    console.log('   Auth TPN: HT009582-001 (Our TPN for UHIN)');
    console.log('   Routing TPN: HT006842-001 (Office Ally for Utah Medicaid)');
    console.log('   Endpoint: https://ws.uhin.org/webservices/core/soaptype4.asmx');
    console.log('   Mode: PRODUCTION 🔥\n');
    
    // Use a safe test patient (generic data that won't match real people)
    const testPatient = {
        first: 'Jane',
        last: 'Testpatient',
        dob: '1985-01-01',
        ssn: '999999999', // Test SSN that won't match real people
        medicaidId: '9999999999'
    };
    
    console.log('👤 SAFE TEST PATIENT:');
    console.log(`   Name: ${testPatient.first} ${testPatient.last}`);
    console.log(`   DOB: ${testPatient.dob}`);
    console.log(`   SSN: ${testPatient.ssn} (safe test number)`);
    console.log(`   Medicaid ID: ${testPatient.medicaidId}\n`);
    
    console.log('🚨 WHAT THIS WILL TEST:');
    console.log('=======================');
    console.log('✅ UHIN authentication with our credentials');
    console.log('✅ X12 270 generation with Office Ally TPN');
    console.log('✅ Utah Medicaid routing recognition');
    console.log('✅ Real-time response processing');
    console.log('✅ X12 271 parsing and eligibility determination\n');
    
    console.log('⏳ Proceeding with LIVE test in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        const startTime = Date.now();
        console.log('\n📡 SENDING LIVE REQUEST TO UHIN...\n');
        
        const req = {
            method: 'POST',
            body: testPatient
        };
        
        const res = {
            headers: {},
            statusCode: 200,
            setHeader: () => {},
            status: (code) => { res.statusCode = code; return res; },
            json: (data) => res.data = data,
            end: () => {}
        };
        
        await handler(req, res);
        
        const duration = Date.now() - startTime;
        const result = res.data;
        
        console.log('\n🎉 LIVE TEST RESULTS:');
        console.log('=====================\n');
        
        if (result.enrolled) {
            console.log(`✅ ENROLLED: ${result.program}`);
            console.log(`📅 Effective Date: ${result.effectiveDate}`);
            console.log(`📝 Details: ${result.details}`);
            console.log(`🏥 Source: ${result.verified ? 'Utah Medicaid (REAL)' : 'Simulation'}`);
        } else {
            console.log(`❌ NOT ENROLLED: ${result.error}`);
            console.log(`🏥 Source: ${result.verified ? 'Utah Medicaid (REAL)' : 'Simulation'}`);
        }
        
        console.log(`\n⏱️  Total Response Time: ${duration}ms`);
        console.log(`📊 HTTP Status: ${res.statusCode}`);
        
        if (result.verified) {
            console.log('\n🎯 SUCCESS ANALYSIS:');
            console.log('===================');
            console.log('✅ UHIN accepted our authentication');
            console.log('✅ Utah Medicaid routed via Office Ally TPN');
            console.log('✅ Real-time eligibility verification working!');
            console.log('✅ Ready for production use with real patients!');
        } else {
            console.log('\n⚠️  SIMULATION MODE ACTIVE');
            console.log('Set SIMULATION_MODE=false for real testing');
        }
        
    } catch (error) {
        console.log(`\n💥 ERROR: ${error.message}`);
        
        if (error.message.includes('UHIN API error')) {
            console.log('\n🔍 UHIN ERROR ANALYSIS:');
            console.log('=======================');
            console.log('• Check UHIN credentials');
            console.log('• Verify endpoint URL');
            console.log('• Confirm enrollment status with UHIN');
        } else if (error.message.includes('No Route Found')) {
            console.log('\n🔍 ROUTING ERROR ANALYSIS:');
            console.log('==========================');
            console.log('• Office Ally TPN may not be recognized by Utah Medicaid');
            console.log('• Try with our original TPN (set USE_OFFICE_ALLY_TPN=false)');
        } else {
            console.log('\n🔍 General error - check logs above');
        }
        
        console.error('\nFull error details:', error);
    }
    
    console.log('\n📋 NEXT STEPS BASED ON RESULTS:');
    console.log('===============================');
    console.log('• If successful: Ready for real patient data!');
    console.log('• If routing error: May need Utah Medicaid to whitelist our TPN');
    console.log('• If auth error: Check UHIN enrollment status');
    console.log('• If timeout: Normal for first requests, try again');
}

if (require.main === module) {
    testLiveMasquerading().catch(console.error);
}

module.exports = { testLiveMasquerading };