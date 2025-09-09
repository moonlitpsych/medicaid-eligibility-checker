// CM Points System API
const express = require('express');
const router = express.Router();
const { 
  awardPoints, 
  getCMPatientPoints, 
  getCMPatient, 
  findCMPatientByInfo,
  enrollPatientInCM,
  getDashboardStats,
  supabase
} = require('./database');

// Award points to a patient
router.post('/award', async (req, res) => {
  try {
    const { patientId, points, reason, reasonCode, awardedBy, sessionId, notes } = req.body;
    
    if (!patientId || !points || !reason || !reasonCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: patientId, points, reason, reasonCode' 
      });
    }
    
    const updatedPatient = await awardPoints(patientId, points, reason, reasonCode, awardedBy, sessionId, notes);
    
    res.json({
      success: true,
      patient: updatedPatient,
      pointsAwarded: points,
      message: `${points} points awarded for ${reason}`
    });
    
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// Get patient points history
router.get('/history/:cmPatientId', async (req, res) => {
  try {
    const { cmPatientId } = req.params;
    const { limit = 10 } = req.query;
    
    const pointsHistory = await getCMPatientPoints(cmPatientId, parseInt(limit));
    
    res.json({
      success: true,
      history: pointsHistory
    });
    
  } catch (error) {
    console.error('Error getting points history:', error);
    res.status(500).json({ error: 'Failed to get points history' });
  }
});

// Get patient by Medicaid info (for login)
router.post('/patient/lookup', async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth } = req.body;
    
    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, lastName, dateOfBirth' 
      });
    }
    
    // Try to find existing patient
    const result = await findCMPatientByInfo(firstName, lastName, dateOfBirth);
    
    if (!result) {
      // Patient not found at all
      return res.status(404).json({ 
        error: 'Patient not found in system',
        eligibleForEnrollment: false
      });
    }
    
    if (!result.enrolledInCM) {
      // Patient exists but not enrolled in CM
      return res.status(404).json({ 
        error: 'Patient not enrolled in CM program',
        eligibleForEnrollment: true,
        patient: result.patient
      });
    }
    
    // Get recent points history
    const recentActivity = await getCMPatientPoints(result.id, 5);
    
    res.json({
      success: true,
      patient: result,
      recentActivity
    });
    
  } catch (error) {
    console.error('Error looking up patient:', error);
    res.status(500).json({ error: 'Failed to lookup patient' });
  }
});

// Enroll existing patient in CM program
router.post('/patient/enroll', async (req, res) => {
  try {
    const { patientId, patientData, contactInfo, cpssProviderId } = req.body;
    
    let actualPatientId = patientId;
    
    // If patientData provided, create/find patient first
    if (patientData && !patientId) {
      try {
        // Try to find existing patient first
        const existingPatient = await findCMPatientByInfo(
          patientData.firstName, 
          patientData.lastName, 
          patientData.dateOfBirth
        );
        
        if (existingPatient && existingPatient.patient) {
          actualPatientId = existingPatient.patient.id;
        } else {
          // Create new patient in main patients table
          const { data: newPatient, error: createError } = await supabase
            .from('patients')
            .insert({
              first_name: patientData.firstName,
              last_name: patientData.lastName,
              date_of_birth: patientData.dateOfBirth,
              phone: contactInfo?.phone,
              email: contactInfo?.email,
              insurance_primary: patientData.insuranceType || 'Medicaid'
            })
            .select()
            .single();
            
          if (createError) throw createError;
          actualPatientId = newPatient.id;
        }
      } catch (createPatientError) {
        console.error('Error creating patient:', createPatientError);
        return res.status(500).json({ error: 'Failed to create patient record' });
      }
    }
    
    if (!actualPatientId) {
      return res.status(400).json({ 
        error: 'Missing required field: patientId or patientData' 
      });
    }
    
    // Enroll patient in CM program
    const cmPatient = await enrollPatientInCM(actualPatientId, cpssProviderId);
    
    res.json({
      success: true,
      patient: cmPatient,
      contactInfo,
      message: 'Patient successfully enrolled in CM program'
    });
    
  } catch (error) {
    console.error('Error enrolling patient:', error);
    if (error.message.includes('duplicate') || error.code === '23505') {
      res.status(400).json({ error: 'Patient already enrolled in CM program' });
    } else {
      res.status(500).json({ error: 'Failed to enroll patient' });
    }
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Standard point values for different activities
const POINT_VALUES = {
  group_attendance: 25,
  negative_uds: 50,
  weekly_checkin: 10,
  bonus: 15,
  enrollment_bonus: 25,
  milestone: 100,
  peer_support: 20
};

// Get point values reference
router.get('/point-values', (req, res) => {
  res.json({
    success: true,
    pointValues: POINT_VALUES
  });
});

// Bulk award points for group session attendance
router.post('/award/bulk', async (req, res) => {
  try {
    const { sessionId, attendees, pointsPerAttendee = 25, awardedBy } = req.body;
    
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ error: 'No attendees provided' });
    }
    
    const results = [];
    const errors = [];
    
    for (const patientId of attendees) {
      try {
        const updatedPatient = await awardPoints(
          patientId, 
          pointsPerAttendee, 
          'Group session attendance', 
          'group_attendance', 
          awardedBy, 
          sessionId
        );
        results.push({ patientId, success: true, updatedPatient });
      } catch (error) {
        errors.push({ patientId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      totalAwarded: results.length * pointsPerAttendee,
      message: `Points awarded to ${results.length} patients`
    });
    
  } catch (error) {
    console.error('Error awarding bulk points:', error);
    res.status(500).json({ error: 'Failed to award bulk points' });
  }
});

module.exports = router;