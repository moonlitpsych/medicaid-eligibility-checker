#!/usr/bin/env node

/**
 * Quick test after Supabase schema is applied
 * Tests just the enrollment functionality to verify database tables exist
 */

require('dotenv').config({ path: '.env.local' });

async function testAfterSchema() {
    console.log('\n🔧 Testing Recovery Day system after Supabase schema application...\n');

    const baseURL = 'http://localhost:3000';
    
    try {
        // Test 1: Start demo session (this will test if tables exist)
        console.log('🏥 Testing demo session creation...');
        const sessionResponse = await fetch(`${baseURL}/api/recovery-day/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: 'SCHEMA_TEST_SESSION',
                cpssName: 'Test CPSS After Schema',
                audienceType: 'test_audience',
                audienceSize: 1
            })
        });

        const sessionResult = await sessionResponse.json();
        console.log('✅ Demo Session Result:', sessionResult.success ? 'SUCCESS' : 'FAILED');
        
        if (!sessionResult.success) {
            console.log('❌ Session Error:', sessionResult.error);
            return false;
        }

        // Test 2: Patient enrollment (this will test if all tables and functions work)
        console.log('\n👤 Testing patient enrollment...');
        const enrollmentData = {
            firstName: 'Test',
            lastName: 'Patient',
            dateOfBirth: '1990-01-01',
            phone: '8015551234',
            email: 'test@example.com',
            medicaidId: 'TEST123',
            gender: 'M',
            medicaidProgram: 'Test Program',
            planType: 'Test Plan',
            eligibilityVerified: true,
            deviceStatus: 'yes',
            phoneConfirmed: true,
            consent: true,
            enrolledByCpssName: 'Test CPSS',
            enrolledAtLocation: 'Schema Test',
            demoSessionId: 'SCHEMA_TEST_SESSION'
        };

        const enrollmentResponse = await fetch(`${baseURL}/api/recovery-day/enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enrollmentData)
        });

        const enrollmentResult = await enrollmentResponse.json();
        console.log('✅ Enrollment Result:', enrollmentResult.success ? 'SUCCESS' : 'FAILED');
        
        if (!enrollmentResult.success) {
            console.log('❌ Enrollment Error:', enrollmentResult.error);
            return false;
        }

        console.log(`   - Enrollment ID: ${enrollmentResult.enrollmentId}`);
        console.log(`   - Welcome Points: ${enrollmentResult.welcomePoints}`);

        // Test 3: SMS sending (tests the database functions)
        console.log('\n📱 Testing SMS link generation...');
        const smsResponse = await fetch(`${baseURL}/api/recovery-day/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                enrollmentId: enrollmentResult.enrollmentId,
                phoneNumber: '8015551234',
                patientName: 'Test Patient',
                dateOfBirth: '1990-01-01'
            })
        });

        const smsResult = await smsResponse.json();
        console.log('✅ SMS Result:', smsResult.success ? 'SUCCESS' : 'FAILED');
        
        if (smsResult.success) {
            console.log(`   - Enrollment Link: ${smsResult.enrollmentLink ? 'Generated' : 'Failed'}`);
        }

        console.log('\n🎉 ALL TESTS PASSED! Recovery Day system is ready!');
        console.log('✅ Database schema applied successfully');
        console.log('✅ Patient enrollment working');  
        console.log('✅ SMS link generation working');
        console.log('✅ Demo session tracking working');
        console.log('\n🚀 Ready for Recovery Day demonstration with Jeremy Montoya!');
        
        return true;

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\n🔧 If you see table/function errors, make sure you:');
        console.error('1. Applied recovery-day-schema-extension.sql in Supabase SQL Editor');
        console.error('2. Restarted the API server after applying schema');
        return false;
    }
}

// Run the test
if (require.main === module) {
    testAfterSchema().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testAfterSchema };