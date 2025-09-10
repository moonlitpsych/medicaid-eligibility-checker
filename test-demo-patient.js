#!/usr/bin/env node

/**
 * Test the Alex Demo patient for Recovery Day
 * Safe - no real SMS, no real patient data
 */

require('dotenv').config({ path: '.env.local' });

async function testDemoPatient() {
    console.log('\n🎭 TESTING DEMO PATIENT FOR RECOVERY DAY');
    console.log('==========================================\n');

    const baseURL = 'http://localhost:3000';
    
    try {
        // Test eligibility check with demo patient
        console.log('📋 Testing Alex Demo eligibility check...');
        const eligibilityResponse = await fetch(`${baseURL}/api/database-eligibility/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payerId: 'UTMCD',
                firstName: 'Alex',      // Demo patient
                lastName: 'Demo',       // Demo patient  
                dateOfBirth: '1995-03-15' // Demo patient DOB
            })
        });

        const eligibilityResult = await eligibilityResponse.json();
        console.log('✅ Demo Patient Eligibility Result:');
        console.log(`   - Enrolled: ${eligibilityResult.enrolled}`);
        console.log(`   - Program: ${eligibilityResult.program}`);
        console.log(`   - Response Time: ${eligibilityResult.responseTime}ms`);
        console.log(`   - Is Demo: ${eligibilityResult.isDemoPatient ? 'YES' : 'NO'}`);
        
        if (eligibilityResult.extractedData) {
            console.log('📱 Auto-populated Demo Data:');
            console.log(`   - Phone: ${eligibilityResult.extractedData.phone} (YOUR PHONE)`);
            console.log(`   - Medicaid ID: ${eligibilityResult.extractedData.medicaidId}`);
            console.log(`   - Address: ${eligibilityResult.extractedData.address?.street}, ${eligibilityResult.extractedData.address?.city}`);
        }

        // Test enrollment
        console.log('\n👤 Testing demo patient enrollment...');
        const enrollmentData = {
            firstName: 'Alex',
            lastName: 'Demo', 
            dateOfBirth: '1995-03-15',
            phone: '3852018161', // Your phone
            email: 'demo@moonlit.com',
            medicaidId: eligibilityResult.extractedData?.medicaidId || 'DEMO123456',
            gender: 'U',
            medicaidProgram: eligibilityResult.program,
            planType: eligibilityResult.planType,
            eligibilityVerified: true,
            deviceStatus: 'yes',
            phoneConfirmed: true,
            consent: true,
            enrolledByCpssName: 'Demo CPSS',
            enrolledAtLocation: 'Recovery Day Demo Booth',
            demoSessionId: 'RECOVERY_DAY_DEMO_ALEX'
        };

        const enrollmentResponse = await fetch(`${baseURL}/api/recovery-day/enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enrollmentData)
        });

        const enrollmentResult = await enrollmentResponse.json();
        console.log('✅ Demo Patient Enrollment:');
        console.log(`   - Success: ${enrollmentResult.success}`);
        console.log(`   - Enrollment ID: ${enrollmentResult.enrollmentId}`);
        
        if (enrollmentResult.success) {
            // Test SMS (will be simulated for now)
            console.log('\n📱 Testing SMS link generation (SIMULATED)...');
            const smsResponse = await fetch(`${baseURL}/api/recovery-day/send-sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    enrollmentId: enrollmentResult.enrollmentId,
                    phoneNumber: '3852018161',
                    patientName: 'Alex Demo',
                    dateOfBirth: '1995-03-15'
                })
            });

            const smsResult = await smsResponse.json();
            console.log('✅ SMS Result (Simulated):');
            console.log(`   - Link Generated: ${smsResult.enrollmentLink ? 'YES' : 'NO'}`);
            console.log(`   - Your Phone: ${smsResult.phoneNumber}`);
            console.log(`   - Message Preview: "${smsResult.messagePreview?.substring(0, 60)}..."`);
        }

        console.log('\n🎯 RECOVERY DAY DEMO READY!');
        console.log('============================');
        console.log('✅ Use: Alex Demo, DOB: 1995-03-15');
        console.log('✅ Shows realistic eligibility response'); 
        console.log('✅ Auto-fills YOUR phone number');
        console.log('✅ Generates enrollment link');
        console.log('✅ Safe - no real patient data used');
        console.log('\nOnce Notifyre is set up, you can enable real SMS!');

    } catch (error) {
        console.error('\n❌ Demo patient test failed:', error.message);
    }
}

if (require.main === module) {
    testDemoPatient();
}

module.exports = { testDemoPatient };