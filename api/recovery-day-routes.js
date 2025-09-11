/**
 * Recovery Day Demo API Routes
 * 
 * Handles patient enrollment, SMS integration, and enhanced X12 271 parsing
 * for the Recovery Day CPSS onboarding demo.
 */

const express = require('express');
const { supabase } = require('../database-driven-eligibility-service');

const router = express.Router();

/**
 * Enhanced patient enrollment for Recovery Day demo
 * POST /api/recovery-day/enroll
 */
router.post('/enroll', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const {
            firstName,
            lastName,
            dateOfBirth,
            phone,
            email,
            medicaidId,
            gender,
            address,
            medicaidProgram,
            planType,
            eligibilityVerified,
            deviceStatus,
            phoneConfirmed,
            consent,
            enrolledByCpssName,
            enrolledAtLocation,
            demoSessionId
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: firstName, lastName, dateOfBirth'
            });
        }

        if (!consent) {
            return res.status(400).json({
                success: false,
                error: 'Patient consent is required for enrollment'
            });
        }

        console.log(`🏥 Recovery Day enrollment: ${firstName} ${lastName} via ${enrolledByCpssName}`);

        // Create patient enrollment record
        const enrollmentData = {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth,
            phone_number: phone,
            email: email || null,
            medicaid_id: medicaidId || null,
            gender: gender || 'U',
            address: address ? JSON.stringify(address) : null,
            
            // Eligibility details
            eligibility_status: eligibilityVerified ? 'verified' : 'pending',
            medicaid_program: medicaidProgram,
            plan_type: planType,
            
            // Enrollment process
            enrollment_source: 'recovery_day_demo',
            enrolled_by_cpss_name: enrolledByCpssName,
            enrolled_at_location: enrolledAtLocation,
            device_status: getDeviceStatusCode(deviceStatus),
            
            // SMS tracking
            sms_phone_confirmed: phoneConfirmed || false,
            
            // Demo tracking
            demo_session_id: demoSessionId,
            cpss_workstation: req.headers['x-workstation'] || 'tablet_01'
        };

        const { data: enrollment, error: enrollError } = await supabase
            .from('patient_enrollments')
            .insert([enrollmentData])
            .select()
            .single();

        if (enrollError) {
            throw new Error(`Database enrollment failed: ${enrollError.message}`);
        }

        console.log(`✅ Patient enrolled with ID: ${enrollment.id}`);

        // Update demo session statistics
        await updateDemoSessionStats(demoSessionId, 'enrollment_completed');

        const response = {
            success: true,
            enrollmentId: enrollment.id,
            message: `${firstName} ${lastName} enrolled successfully`,
            patientId: enrollment.id,
            welcomePoints: 25,
            nextSteps: {
                smsRequired: deviceStatus === 'yes' && phone && phoneConfirmed,
                appSetupNeeded: deviceStatus === 'limited',
                deviceProvisionNeeded: deviceStatus === 'no'
            },
            processingTime: Date.now() - startTime
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Recovery Day enrollment failed:', error);
        
        // Update demo session with failure
        if (req.body.demoSessionId) {
            await updateDemoSessionStats(req.body.demoSessionId, 'enrollment_failed');
        }

        res.status(500).json({
            success: false,
            error: `Enrollment failed: ${error.message}`,
            processingTime: Date.now() - startTime
        });
    }
});

/**
 * Send SMS enrollment link
 * POST /api/recovery-day/send-sms
 */
router.post('/send-sms', async (req, res) => {
    try {
        const { enrollmentId, phoneNumber, patientName, dateOfBirth } = req.body;

        if (!enrollmentId || !phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: enrollmentId, phoneNumber'
            });
        }

        console.log(`📱 Sending SMS enrollment link to ${phoneNumber} for enrollment ${enrollmentId}`);

        // Generate secure enrollment link using database function
        const { data: linkData, error: linkError } = await supabase
            .rpc('generate_sms_enrollment_link', {
                p_patient_enrollment_id: enrollmentId,
                p_phone_number: phoneNumber
            });

        if (linkError) {
            throw new Error(`Link generation failed: ${linkError.message}`);
        }

        const { sms_token, enrollment_link } = linkData[0];

        // Format SMS message
        const smsMessage = `🎯 Welcome to Moonlit's CM program! You've earned 25 welcome points.

📱 Access your patient portal:
${enrollment_link}

🔑 Login with:
Name: ${patientName}
DOB: ${formatDateForSMS(dateOfBirth)}

Questions? Reply STOP to opt out.`;

        // In a real implementation, integrate with Twilio or similar SMS service
        // For demo purposes, we'll simulate SMS sending
        const smsSimulated = await simulateSMSSending(phoneNumber, smsMessage);

        // Update enrollment record with SMS tracking
        const { error: updateError } = await supabase
            .from('patient_enrollments')
            .update({ 
                sms_link_sent_at: new Date().toISOString()
            })
            .eq('id', enrollmentId);

        if (updateError) {
            console.warn('⚠️ Failed to update SMS tracking:', updateError.message);
        }

        const response = {
            success: true,
            smsToken: sms_token,
            enrollmentLink: enrollment_link,
            phoneNumber: phoneNumber,
            messageSent: smsSimulated.success,
            messagePreview: smsMessage.substring(0, 100) + '...',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        if (!smsSimulated.success) {
            response.warning = 'SMS simulation failed - link generated but not sent';
            response.smsError = smsSimulated.error;
        }

        res.json(response);

    } catch (error) {
        console.error('❌ SMS sending failed:', error);
        res.status(500).json({
            success: false,
            error: `SMS sending failed: ${error.message}`
        });
    }
});

/**
 * Enhanced eligibility check with X12 271 parsing
 * POST /api/recovery-day/eligibility-enhanced
 */
router.post('/eligibility-enhanced', async (req, res) => {
    try {
        const { payerId, firstName, lastName, dateOfBirth } = req.body;

        // Use existing database-driven eligibility service
        const { 
            handleDatabaseDrivenEligibilityCheck 
        } = require('../database-driven-api-routes');
        
        // Call existing eligibility check
        await handleDatabaseDrivenEligibilityCheck(req, res);

        // Note: The response will be sent by the existing handler
        // Additional X12 271 parsing will be handled by database functions

    } catch (error) {
        console.error('❌ Enhanced eligibility check failed:', error);
        res.status(500).json({
            success: false,
            error: `Enhanced eligibility check failed: ${error.message}`
        });
    }
});

/**
 * Recovery Day demo analytics - all sessions
 * GET /api/recovery-day/analytics
 */
router.get('/analytics', async (req, res) => {
    try {
        const { data: analytics, error } = await supabase
            .from('v_recovery_day_analytics')
            .select('*')
            .order('demo_start_time', { ascending: false });

        if (error) {
            throw new Error(`Analytics query failed: ${error.message}`);
        }

        res.json({
            success: true,
            analytics: analytics || [],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Analytics query failed:', error);
        res.status(500).json({
            success: false,
            error: `Analytics query failed: ${error.message}`,
            analytics: []
        });
    }
});

/**
 * Recovery Day demo analytics - specific session
 * GET /api/recovery-day/analytics/:sessionId
 */
router.get('/analytics/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const { data: analytics, error } = await supabase
            .from('v_recovery_day_analytics')
            .select('*')
            .eq('session_id', sessionId)
            .order('demo_start_time', { ascending: false });

        if (error) {
            throw new Error(`Analytics query failed: ${error.message}`);
        }

        res.json({
            success: true,
            analytics: analytics || [],
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Analytics query failed:', error);
        res.status(500).json({
            success: false,
            error: `Analytics query failed: ${error.message}`,
            analytics: []
        });
    }
});

/**
 * Start or update demo session
 * POST /api/recovery-day/session
 */
router.post('/session', async (req, res) => {
    try {
        const { sessionId, cpssName, audienceType, audienceSize } = req.body;

        const sessionData = {
            session_id: sessionId,
            cpss_name: cpssName,
            audience_type: audienceType || 'mixed_audience',
            audience_size: audienceSize || 1
        };

        const { data: session, error } = await supabase
            .from('recovery_day_demo_sessions')
            .upsert([sessionData], { 
                onConflict: 'session_id',
                returning: 'minimal'
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Session upsert failed: ${error.message}`);
        }

        res.json({
            success: true,
            sessionId: session.session_id,
            message: 'Demo session started/updated successfully'
        });

    } catch (error) {
        console.error('❌ Demo session creation failed:', error);
        res.status(500).json({
            success: false,
            error: `Demo session creation failed: ${error.message}`
        });
    }
});

/**
 * Send real SMS for demo via Notifyre
 * POST /api/recovery-day/send-demo-sms
 */
router.post('/send-demo-sms', async (req, res) => {
    try {
        const { phoneNumber, patientName, demoMode } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        console.log(`📱 Sending REAL demo SMS to ${phoneNumber}`);

        // Generate demo enrollment token
        const demoToken = 'demo-recovery-day-' + Date.now();
        
        // Use production URL if deployed, otherwise localhost
        const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3002';
        const enrollmentUrl = `${baseUrl}/enroll?token=${demoToken}`;
        
        // Create personalized message
        const message = `🎯 Hi! Try the Moonlit CM patient app demo for ${patientName}: ${enrollmentUrl}

This is a live demo - you'll earn 25 welcome points and can complete drug tests to win cash prizes!

Reply STOP to opt out.`;

        // Send real SMS via Notifyre
        const NotifyreSMSService = require('../services/notifyre-sms-service');
        const smsService = new NotifyreSMSService();
        
        const result = await smsService.sendSMS(phoneNumber, message);
        
        console.log(`📱 SMS Result:`, {
            success: result.success,
            messageId: result.messageId,
            provider: result.provider,
            demoMode: result.demoMode
        });

        res.json({
            success: result.success,
            messageId: result.messageId,
            provider: result.provider,
            demoMode: result.demoMode || false,
            enrollmentToken: demoToken,
            enrollmentUrl: enrollmentUrl
        });

    } catch (error) {
        console.error('❌ Demo SMS sending failed:', error);
        res.status(500).json({
            success: false,
            error: `SMS sending failed: ${error.message}`
        });
    }
});

/**
 * Store demo visitor information for follow-up
 * POST /api/recovery-day/demo-visitor
 */
router.post('/demo-visitor', async (req, res) => {
    try {
        const { name, role, phone, organization, consent } = req.body;
        
        // Store visitor for follow-up
        const { data: visitor, error } = await supabase
            .from('demo_visitors')
            .insert({
                name,
                role, 
                phone,
                organization,
                consent_to_follow_up: consent,
                demo_date: new Date(),
                demo_location: 'Recovery Day'
            })
            .select()
            .single();
        
        if (error) {
            console.error('Failed to store visitor:', error);
            return res.status(500).json({
                success: false,
                error: `Failed to store visitor data: ${error.message}`
            });
        }
        
        console.log(`📝 Demo visitor stored: ${name} (${role}) - Phone: ${phone}, Consent: ${consent}`);
        
        res.json({ 
            success: true, 
            visitorId: visitor?.id,
            message: 'Visitor information stored successfully'
        });

    } catch (error) {
        console.error('❌ Failed to store demo visitor:', error);
        res.status(500).json({
            success: false,
            error: `Failed to store demo visitor: ${error.message}`
        });
    }
});

// Helper functions

function getDeviceStatusCode(deviceStatus) {
    switch (deviceStatus) {
        case 'yes': return 'smartphone';
        case 'limited': return 'needs_help';
        case 'no': return 'device_needed';
        default: return 'smartphone';
    }
}

function formatDateForSMS(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

async function simulateSMSSending(phoneNumber, message) {
    // Use real Notifyre SMS service
    const NotifyreSMSService = require('../services/notifyre-sms-service');
    const smsService = new NotifyreSMSService();
    
    try {
        const result = await smsService.sendSMS(phoneNumber, message);
        
        console.log(`📱 ${result.demoMode ? '[DEMO SMS]' : '[REAL SMS]'} To: ${phoneNumber}`);
        console.log(`📱 Provider: ${result.provider}, Message ID: ${result.messageId}`);
        
        return {
            success: result.success,
            messageId: result.messageId,
            provider: result.provider,
            demoMode: result.demoMode || false
        };
        
    } catch (error) {
        console.error('❌ SMS sending failed:', error.message);
        
        // Return error result
        return {
            success: false,
            error: error.message,
            provider: 'notifyre_error',
            demoMode: true
        };
    }
}

async function updateDemoSessionStats(sessionId, eventType) {
    if (!sessionId) return;
    
    try {
        const updates = {};
        
        // For now, use simple increment logic (will be enhanced with proper SQL functions later)
        const { data: currentStats, error: fetchError } = await supabase
            .from('recovery_day_demo_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (fetchError) {
            console.warn('Could not fetch current stats:', fetchError.message);
            return;
        }

        switch (eventType) {
            case 'enrollment_completed':
                updates.patients_enrolled = (currentStats.patients_enrolled || 0) + 1;
                updates.successful_eligibility_checks = (currentStats.successful_eligibility_checks || 0) + 1;
                break;
            case 'enrollment_failed':
                updates.failed_eligibility_checks = (currentStats.failed_eligibility_checks || 0) + 1;
                break;
            case 'eligibility_check_timeout':
                updates.office_ally_timeouts = (currentStats.office_ally_timeouts || 0) + 1;
                break;
            case 'network_issue':
                updates.network_issues_count = (currentStats.network_issues_count || 0) + 1;
                break;
        }

        if (Object.keys(updates).length > 0) {
            await supabase
                .from('recovery_day_demo_sessions')
                .update(updates)
                .eq('session_id', sessionId);
        }
    } catch (error) {
        console.warn(`⚠️ Failed to update demo session stats: ${error.message}`);
    }
}

module.exports = router;