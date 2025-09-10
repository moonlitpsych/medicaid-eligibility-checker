#!/usr/bin/env node

/**
 * Test Notifyre SMS Integration
 * Send a real SMS to verify the service is working
 */

require('dotenv').config({ path: '.env.local' });
const NotifyreSMSService = require('./services/notifyre-sms-service');

async function testNotifyreSMS() {
    console.log('🚀 Testing Notifyre SMS Integration...\n');

    const smsService = new NotifyreSMSService();
    
    // Check service status
    const status = smsService.getStatus();
    console.log('📊 Service Status:', status);
    
    if (!status.ready && !status.demoMode) {
        console.log('❌ SMS service not configured properly');
        console.log('Missing credentials:', {
            accountSid: !!process.env.NOTIFYRE_ACCOUNT_SID,
            authToken: !!process.env.NOTIFYRE_AUTH_TOKEN,
            fromNumber: !!process.env.NOTIFYRE_FROM_NUMBER
        });
        return;
    }

    console.log('\n🎯 Testing SMS send to your phone...');
    
    const testMessage = `🎉 Notifyre SMS Test Successful!

This is a test message from your moonlit Recovery Day demo system.

✅ Your 10DLC number (+13855130681) is working
✅ API integration complete  
✅ Ready for patient enrollment SMS

Time: ${new Date().toLocaleString()}

- moonlit Recovery Team`;

    try {
        const result = await smsService.sendSMS('3852018161', testMessage);
        
        console.log('✅ SMS Test Result:', {
            success: result.success,
            messageId: result.messageId,
            status: result.status,
            provider: result.provider,
            demoMode: result.demoMode || false
        });
        
        if (!result.demoMode) {
            console.log('\n📱 Check your phone (385) 201-8161 for the test message!');
            console.log('🎉 Notifyre SMS integration is LIVE and ready for Recovery Day!');
        } else {
            console.log('\n🎭 Running in demo mode - check console output above');
        }
        
    } catch (error) {
        console.error('❌ SMS test failed:', error.message);
        console.log('\n🎭 Falling back to demo mode for reliable demonstrations');
    }
}

async function testEnrollmentSMS() {
    console.log('\n\n🏥 Testing Recovery Day Enrollment SMS...');
    
    const smsService = new NotifyreSMSService();
    const mockToken = 'demo-enrollment-' + Date.now();
    
    try {
        const result = await smsService.sendEnrollmentSMS('3852018161', mockToken, 'Alex Demo');
        
        console.log('✅ Enrollment SMS Result:', {
            success: result.success,
            messageId: result.messageId,
            status: result.status,
            provider: result.provider
        });
        
        if (!result.demoMode) {
            console.log('📱 Check your phone for the enrollment link message!');
        }
        
    } catch (error) {
        console.error('❌ Enrollment SMS test failed:', error.message);
    }
}

// Run tests
async function runAllTests() {
    try {
        await testNotifyreSMS();
        await testEnrollmentSMS();
        console.log('\n🎉 All SMS tests completed!');
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = { testNotifyreSMS, testEnrollmentSMS };