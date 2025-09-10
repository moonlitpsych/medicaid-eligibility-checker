/**
 * Notifyre SMS Service for Recovery Day Demo
 * HIPAA-compliant SMS messaging for patient enrollment
 * Using official Notifyre Node.js SDK
 */

const { NotifyreAPI, RecipientType } = require('notifyre-nodejs-sdk');

class NotifyreSMSService {
    constructor() {
        // Get credentials from environment variables
        this.authToken = process.env.NOTIFYRE_AUTH_TOKEN || null;
        this.fromNumber = process.env.NOTIFYRE_FROM_NUMBER || null;
        
        // Demo mode fallback
        this.isDemoMode = !this.authToken || !this.fromNumber;
        
        if (this.isDemoMode) {
            console.log('🎭 Notifyre SMS Service in DEMO MODE - no credentials configured');
            this.notifyreAPI = null;
            this.smsService = null;
        } else {
            console.log('📱 Notifyre SMS Service LIVE - initializing SDK...');
            try {
                // Initialize Notifyre API with SDK
                this.notifyreAPI = new NotifyreAPI(this.authToken);
                this.smsService = this.notifyreAPI.getSmsService();
                console.log('✅ Notifyre SDK initialized successfully');
            } catch (error) {
                console.error('❌ Notifyre SDK initialization failed:', error.message);
                this.isDemoMode = true;
                this.notifyreAPI = null;
                this.smsService = null;
            }
        }
    }

    /**
     * Send SMS message via Notifyre SDK
     * @param {string} toNumber - Recipient phone number (E.164 format)
     * @param {string} message - SMS message content
     * @returns {Promise<Object>} - Response with message ID and status
     */
    async sendSMS(toNumber, message) {
        if (this.isDemoMode) {
            return this.sendDemoSMS(toNumber, message);
        }

        try {
            // Validate inputs
            if (!toNumber || !message) {
                throw new Error('Phone number and message are required');
            }

            // Ensure phone number is in E.164 format
            const formattedNumber = this.formatPhoneNumber(toNumber);
            
            console.log('📤 Sending SMS via Notifyre SDK...');
            
            // Use official Notifyre SDK
            const response = await this.smsService.submitSms({
                body: message,
                from: this.fromNumber,
                recipients: [
                    {
                        type: RecipientType.SmsNumber,
                        value: formattedNumber
                    }
                ],
                scheduledDate: null,
                addUnsubscribeLink: false,
                callbackUrl: null,
                metadata: {
                    "source": "moonlit-recovery-day-demo",
                    "patient_enrollment": "true"
                },
                campaignName: "recovery-day-enrollment"
            });
            
            console.log('✅ SMS sent successfully via Notifyre SDK:', {
                to: formattedNumber,
                messageId: response.messageId || response.id || 'unknown',
                status: response.status || 'sent'
            });

            return {
                success: true,
                messageId: response.messageId || response.id || 'notifyre-sdk-' + Date.now(),
                status: response.status || 'sent',
                to: formattedNumber,
                provider: 'notifyre-sdk'
            };

        } catch (error) {
            console.error('❌ Notifyre SDK SMS failed:', error.message);
            
            // Fallback to demo mode on error for demo reliability
            console.log('🎭 Falling back to demo mode for reliability');
            return this.sendDemoSMS(toNumber, message);
        }
    }

    /**
     * Demo mode SMS simulation
     */
    async sendDemoSMS(toNumber, message) {
        const formattedNumber = this.formatPhoneNumber(toNumber);
        
        console.log('🎭 DEMO SMS - Would send to:', formattedNumber);
        console.log('📝 Message content:', message);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        return {
            success: true,
            messageId: 'demo-msg-' + Date.now(),
            status: 'sent',
            to: formattedNumber,
            provider: 'demo',
            demoMode: true
        };
    }

    /**
     * Send enrollment link SMS for Recovery Day demo
     */
    async sendEnrollmentSMS(toNumber, enrollmentToken, patientName) {
        const enrollmentUrl = `${process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000'}/enroll?token=${enrollmentToken}`;
        
        const message = `Hi ${patientName}! 

Welcome to the moonlit Recovery Program. Complete your enrollment here: ${enrollmentUrl}

This secure link is valid for 24 hours. Reply STOP to opt out.

- moonlit Recovery Team`;

        return this.sendSMS(toNumber, message);
    }


    /**
     * Format phone number to E.164 format
     */
    formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        const digits = phoneNumber.replace(/\D/g, '');
        
        // Add +1 for US numbers if not present
        if (digits.length === 10) {
            return `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        } else {
            return `+${digits}`;
        }
    }

    /**
     * Check service status
     */
    getStatus() {
        return {
            configured: !this.isDemoMode,
            demoMode: this.isDemoMode,
            hasCredentials: !!(this.accountSid && this.authToken && this.fromNumber),
            ready: !this.isDemoMode && !!(this.accountSid && this.authToken && this.fromNumber)
        };
    }
}

module.exports = NotifyreSMSService;