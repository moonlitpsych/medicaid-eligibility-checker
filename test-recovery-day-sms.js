#!/usr/bin/env node

/**
 * Test Recovery Day Demo with Notifyre SMS Integration
 * Test the complete flow from CPSS enrollment to SMS sending
 */

require('dotenv').config({ path: '.env.local' });

async function testRecoveryDaySMS() {
    console.log('🎯 Testing Recovery Day Demo with Notifyre SMS Integration...\n');
    
    const enrollmentData = {
        firstName: 'Alex',
        lastName: 'Demo',
        dateOfBirth: '1995-03-15',
        phoneNumber: '3852018161',
        medicaidId: 'DEMO123456',
        eligibilityResult: {
            enrolled: true,
            program: 'Utah Medicaid - Demo',
            extractedData: {
                phone: '3852018161',
                medicaidId: 'DEMO123456',
                gender: 'F',
                address: '123 Demo St, Salt Lake City, UT'
            }
        }
    };
    
    try {
        console.log('📋 Step 1: Patient Enrollment...');
        
        // Test enrollment API endpoint
        const enrollResponse = await fetch('http://localhost:3000/api/recovery-day/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrollmentData)
        });
        
        if (!enrollResponse.ok) {
            throw new Error(`Enrollment failed: ${enrollResponse.status}`);
        }
        
        const enrollResult = await enrollResponse.json();
        console.log('✅ Enrollment Result:', {
            success: enrollResult.success,
            patientId: enrollResult.patient?.id,
            enrollmentId: enrollResult.enrollment?.id
        });
        
        if (!enrollResult.success) {
            throw new Error('Enrollment failed: ' + enrollResult.error);
        }
        
        console.log('\n📱 Step 2: SMS Enrollment Link...');
        
        // Test SMS sending
        const smsData = {
            enrollmentId: enrollResult.enrollment.id,
            phoneNumber: '3852018161',
            patientName: 'Alex Demo',
            dateOfBirth: '1995-03-15'
        };
        
        const smsResponse = await fetch('http://localhost:3000/api/recovery-day/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(smsData)
        });
        
        if (!smsResponse.ok) {
            throw new Error(`SMS sending failed: ${smsResponse.status}`);
        }
        
        const smsResult = await smsResponse.json();
        console.log('✅ SMS Result:', {
            success: smsResult.success,
            smsToken: smsResult.smsToken ? 'Generated' : 'Missing',
            enrollmentLink: smsResult.enrollmentLink ? 'Created' : 'Missing',
            provider: smsResult.provider || 'Unknown'
        });
        
        if (smsResult.success) {
            console.log('\n🎉 Recovery Day SMS Integration Test SUCCESSFUL!');
            console.log(`📱 Check phone (385) 201-8161 for enrollment link`);
            console.log(`🔗 Enrollment URL: ${smsResult.enrollmentLink}`);
        } else {
            console.log('\n⚠️ SMS sending had issues:', smsResult.warning || smsResult.error);
        }
        
    } catch (error) {
        console.error('❌ Recovery Day SMS test failed:', error.message);
        
        // Check if API server is running
        try {
            const healthCheck = await fetch('http://localhost:3000/health');
            if (healthCheck.ok) {
                console.log('✅ API server is running - check request format');
            }
        } catch (serverError) {
            console.log('❌ API server not accessible - run: node api-server.js');
        }
    }
}

// Run the test
if (require.main === module) {
    testRecoveryDaySMS();
}

module.exports = { testRecoveryDaySMS };