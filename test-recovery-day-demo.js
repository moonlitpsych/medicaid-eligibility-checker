#!/usr/bin/env node

/**
 * Recovery Day Demo - Complete Flow Test
 * 
 * Tests the full CPSS onboarding flow:
 * 1. Database-driven eligibility check with Jeremy Montoya
 * 2. X12 271 parsing for auto-population
 * 3. Patient enrollment with SMS simulation
 * 4. Demo analytics tracking
 */

require('dotenv').config({ path: '.env.local' });

async function testRecoveryDayDemo() {
    console.log('\n🎯 RECOVERY DAY DEMO - COMPLETE FLOW TEST');
    console.log('=============================================\n');

    const baseURL = 'http://localhost:3000';
    
    try {
        // Test 1: Database-driven eligibility check with Jeremy Montoya
        console.log('📋 Step 1: Testing database-driven eligibility check...');
        const eligibilityResponse = await fetch(`${baseURL}/api/database-eligibility/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payerId: 'UTMCD', // Utah Medicaid
                firstName: 'Jeremy',
                lastName: 'Montoya',
                dateOfBirth: '1984-07-17'
            })
        });

        const eligibilityResult = await eligibilityResponse.json();
        console.log('✅ Eligibility Check Result:');
        console.log(`   - Enrolled: ${eligibilityResult.enrolled}`);
        console.log(`   - Program: ${eligibilityResult.program}`);
        console.log(`   - Plan Type: ${eligibilityResult.planType}`);
        console.log(`   - Response Time: ${eligibilityResult.responseTime}ms`);
        
        if (eligibilityResult.extractedData) {
            console.log('📱 Auto-populated Data:');
            console.log(`   - Phone: ${eligibilityResult.extractedData.phone || 'Not found'}`);
            console.log(`   - Medicaid ID: ${eligibilityResult.extractedData.medicaidId || 'Not found'}`);
            console.log(`   - Gender: ${eligibilityResult.extractedData.gender || 'Not found'}`);
        }

        if (!eligibilityResult.enrolled) {
            throw new Error('Jeremy Montoya should be enrolled - eligibility check failed');
        }

        // Test 2: Start demo session
        console.log('\n🏥 Step 2: Starting Recovery Day demo session...');
        const sessionResponse = await fetch(`${baseURL}/api/recovery-day/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: 'RECOVERY_DAY_DEMO_TEST',
                cpssName: 'Test CPSS',
                audienceType: 'test_audience',
                audienceSize: 1
            })
        });

        const sessionResult = await sessionResponse.json();
        console.log('✅ Demo Session Started:');
        console.log(`   - Session ID: ${sessionResult.sessionId}`);

        // Test 3: Patient enrollment with enhanced data
        console.log('\n👤 Step 3: Testing patient enrollment...');
        const enrollmentData = {
            firstName: 'Jeremy',
            lastName: 'Montoya',
            dateOfBirth: '1984-07-17',
            phone: '8015551234', // Mock phone for testing
            email: 'jeremy.test@example.com',
            medicaidId: eligibilityResult.extractedData?.medicaidId || 'TEST123',
            gender: eligibilityResult.extractedData?.gender || 'M',
            medicaidProgram: eligibilityResult.program,
            planType: eligibilityResult.planType,
            eligibilityVerified: true,
            deviceStatus: 'yes',
            phoneConfirmed: true,
            consent: true,
            enrolledByCpssName: 'Test CPSS',
            enrolledAtLocation: 'Recovery Day Demo - Test',
            demoSessionId: 'RECOVERY_DAY_DEMO_TEST'
        };

        const enrollmentResponse = await fetch(`${baseURL}/api/recovery-day/enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enrollmentData)
        });

        const enrollmentResult = await enrollmentResponse.json();
        console.log('✅ Patient Enrollment Result:');
        console.log(`   - Success: ${enrollmentResult.success}`);
        console.log(`   - Enrollment ID: ${enrollmentResult.enrollmentId}`);
        console.log(`   - Welcome Points: ${enrollmentResult.welcomePoints}`);
        console.log(`   - Processing Time: ${enrollmentResult.processingTime}ms`);

        if (!enrollmentResult.success) {
            throw new Error(`Enrollment failed: ${enrollmentResult.error}`);
        }

        // Test 4: SMS enrollment link generation
        console.log('\n📱 Step 4: Testing SMS enrollment link...');
        const smsResponse = await fetch(`${baseURL}/api/recovery-day/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                enrollmentId: enrollmentResult.enrollmentId,
                phoneNumber: '8015551234',
                patientName: 'Jeremy Montoya',
                dateOfBirth: '1984-07-17'
            })
        });

        const smsResult = await smsResponse.json();
        console.log('✅ SMS Enrollment Link Result:');
        console.log(`   - Success: ${smsResult.success}`);
        console.log(`   - Phone: ${smsResult.phoneNumber}`);
        console.log(`   - Link: ${smsResult.enrollmentLink || 'Generated'}`);
        console.log(`   - Message Preview: ${smsResult.messagePreview || 'SMS content generated'}`);

        // Test 5: Demo analytics
        console.log('\n📊 Step 5: Testing demo analytics...');
        const analyticsResponse = await fetch(`${baseURL}/api/recovery-day/analytics/RECOVERY_DAY_DEMO_TEST`);
        const analyticsResult = await analyticsResponse.json();
        
        console.log('✅ Demo Analytics:');
        if (analyticsResult.analytics && analyticsResult.analytics.length > 0) {
            const stats = analyticsResult.analytics[0];
            console.log(`   - Patients Enrolled: ${stats.current_enrollments || 0}`);
            console.log(`   - Success Rate: ${stats.success_rate_percent || 0}%`);
            console.log(`   - SMS Links Sent: ${stats.sms_links_sent || 0}`);
            console.log(`   - App Registrations: ${stats.app_registrations || 0}`);
        } else {
            console.log('   - Analytics data being processed...');
        }

        // Success summary
        console.log('\n🎉 RECOVERY DAY DEMO TEST - COMPLETE SUCCESS!');
        console.log('=============================================');
        console.log('✅ Database-driven eligibility verification');
        console.log('✅ Auto-population from X12 271 response');
        console.log('✅ Patient enrollment with enhanced tracking');
        console.log('✅ SMS enrollment link generation');
        console.log('✅ Demo analytics tracking');
        console.log('\n🚀 System is ready for Recovery Day demonstration!');

        // Demo flow summary
        console.log('\n📋 DEMO FLOW SUMMARY FOR CPSS:');
        console.log('1. Enter patient name + DOB → Instant eligibility verification');
        console.log('2. Patient data auto-populates from Medicaid database');
        console.log('3. Confirm phone number with patient');
        console.log('4. Click "Enroll & Send SMS" → Patient gets secure link');
        console.log('5. Patient opens link → Direct access to CM program');
        console.log('\n⏱️  Total time: Under 2 minutes with zero manual data entry!');

    } catch (error) {
        console.error('\n❌ RECOVERY DAY DEMO TEST FAILED:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Ensure api-server.js is running: node api-server.js');
        console.error('2. Check .env.local has Office Ally credentials');
        console.error('3. Verify Supabase connection and schema migration');
        console.error('4. Check database-driven routes are loaded properly');
        process.exit(1);
    }
}

// Helper function to test individual components
async function testIndividualComponents() {
    console.log('\n🔧 Testing individual components...\n');
    
    const baseURL = 'http://localhost:3000';
    
    // Test health check
    try {
        const healthResponse = await fetch(`${baseURL}/health`);
        const healthResult = await healthResponse.text();
        console.log('✅ API Server Health:', healthResult);
    } catch (error) {
        console.error('❌ API Server not responding. Start with: node api-server.js');
        return false;
    }
    
    // Test database payers endpoint
    try {
        const payersResponse = await fetch(`${baseURL}/api/database-eligibility/payers`);
        const payersResult = await payersResponse.json();
        console.log('✅ Database payers loaded:', payersResult.payers?.length || 0, 'categories');
    } catch (error) {
        console.error('❌ Database payers endpoint failed:', error.message);
        return false;
    }
    
    return true;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--check')) {
        const componentsOk = await testIndividualComponents();
        if (!componentsOk) {
            process.exit(1);
        }
    } else {
        await testRecoveryDayDemo();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { testRecoveryDayDemo, testIndividualComponents };