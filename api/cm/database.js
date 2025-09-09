// CM Database Operations using Supabase
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not found in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize CM Database - Check if tables exist and get default program
async function initializeCMDatabase() {
  try {
    // Check if CM tables exist by querying the default program
    const { data, error } = await supabase
      .from('contingency_management')
      .select('id, name')
      .limit(1);

    if (error) {
      console.log('⚠️ CM tables not found - please run the SQL setup in Supabase first');
      return false;
    }

    console.log('✅ CM Database tables verified');
    
    // Ensure we have at least some sample CPSS providers
    await ensureSampleCPSSProviders();
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing CM database:', error);
    return false;
  }
}

// Ensure sample CPSS providers exist
async function ensureSampleCPSSProviders() {
  try {
    // Check if we have any CPSS providers
    const { count } = await supabase
      .from('cm_providers')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      // Get the default CM program ID
      const { data: cmProgram } = await supabase
        .from('contingency_management')
        .select('id')
        .limit(1)
        .single();

      if (cmProgram) {
        console.log('💡 No CPSS providers found - you can add them via the admin dashboard');
      }
    }
  } catch (error) {
    console.log('ℹ️ CPSS provider check skipped:', error.message);
  }
}

// CM Patient operations (joins existing patients table)
async function enrollPatientInCM(existingPatientId, cpssProviderId = null) {
  try {
    // Get the default CM program
    const { data: cmProgram } = await supabase
      .from('contingency_management')
      .select('id')
      .limit(1)
      .single();

    if (!cmProgram) {
      throw new Error('No CM program found');
    }

    // Create CM patient record
    const { data, error } = await supabase
      .from('cm_patients')
      .insert({
        patient_id: existingPatientId,
        cm_program_id: cmProgram.id,
        cpss_provider_id: cpssProviderId,
        total_points: 25, // Welcome bonus
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Award welcome bonus points
    if (data) {
      await awardPoints(data.id, 25, 'Welcome to CM Program', 'enrollment_bonus', cpssProviderId);
    }
    
    return data;
  } catch (error) {
    console.error('Error enrolling patient in CM:', error);
    throw error;
  }
}

async function getCMPatient(cmPatientId) {
  try {
    // Get CM patient data first
    const { data: cmPatient, error: cmError } = await supabase
      .from('cm_patients')
      .select('*')
      .eq('id', cmPatientId)
      .single();

    if (cmError) throw cmError;

    // Get associated patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('first_name, last_name, date_of_birth, email, phone, insurance_primary')
      .eq('id', cmPatient.patient_id)
      .single();

    if (patientError) {
      console.warn('Could not find associated patient:', patientError);
    }

    // Get CPSS provider data if available
    let cpssProvider = null;
    if (cmPatient.cpss_provider_id) {
      try {
        const { data: provider } = await supabase
          .from('providers')
          .select('first_name, last_name, email, npi')
          .eq('id', cmPatient.cpss_provider_id)
          .single();
        cpssProvider = provider;
      } catch (error) {
        console.warn('Could not find CPSS provider:', error);
      }
    }

    return {
      ...cmPatient,
      patients: patient,
      cpss_provider: cpssProvider
    };
  } catch (error) {
    console.error('Error getting CM patient:', error);
    throw error;
  }
}

async function findCMPatientByInfo(firstName, lastName, dateOfBirth) {
  try {
    // First find the patient in the main patients table
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, insurance_primary')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .eq('date_of_birth', dateOfBirth)
      .single();

    if (patientError) return null;

    // Now check if they're enrolled in CM
    const { data: cmPatient, error: cmError } = await supabase
      .from('cm_patients')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('status', 'active')
      .single();

    if (cmError) {
      // Patient exists but not enrolled in CM
      return { patient, enrolledInCM: false };
    }

    // Get CPSS provider data if available
    let cpssProvider = null;
    if (cmPatient.cpss_provider_id) {
      try {
        const { data: provider } = await supabase
          .from('providers')
          .select('first_name, last_name, email, npi')
          .eq('id', cmPatient.cpss_provider_id)
          .single();
        cpssProvider = provider;
      } catch (error) {
        console.warn('Could not find CPSS provider:', error);
      }
    }

    return {
      ...cmPatient,
      patients: patient,
      cpss_provider: cpssProvider,
      enrolledInCM: true
    };
  } catch (error) {
    console.error('Error finding CM patient:', error);
    return null;
  }
}

// Points system operations
async function awardPoints(cmPatientId, points, reason, reasonCode, awardedBy = null, sessionId = null, notes = null) {
  try {
    // Insert points transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('cm_points_transactions')
      .insert({
        cm_patient_id: cmPatientId,
        points,
        reason,
        reason_code: reasonCode,
        awarded_by: awardedBy,
        session_id: sessionId,
        notes
      })
      .select()
      .single();

    if (transactionError) throw transactionError;
    
    // Get current points and streak for manual update
    const { data: currentPatient, error: getCurrentError } = await supabase
      .from('cm_patients')
      .select('total_points, current_streak')
      .eq('id', cmPatientId)
      .single();

    if (getCurrentError) throw getCurrentError;

    // Update patient's total points
    const { error: updateError } = await supabase
      .from('cm_patients')
      .update({ 
        total_points: (currentPatient.total_points || 0) + points,
        updated_at: new Date().toISOString()
      })
      .eq('id', cmPatientId);
      
    if (updateError) throw updateError;
    
    // Update streak if it's a qualifying activity
    if (reasonCode === 'group_attendance' || reasonCode === 'negative_uds') {
      const { error: streakError } = await supabase
        .from('cm_patients')
        .update({ 
          current_streak: (currentPatient.current_streak || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', cmPatientId);
        
      if (streakError) throw streakError;
    }
    
    // Return updated patient data
    return await getCMPatient(cmPatientId);
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
}

async function getCMPatientPoints(cmPatientId, limit = 10) {
  try {
    const { data: transactions, error } = await supabase
      .from('cm_points_transactions')
      .select('*')
      .eq('cm_patient_id', cmPatientId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Enrich with provider information if available
    const enrichedTransactions = [];
    for (const transaction of transactions || []) {
      let providerInfo = null;
      if (transaction.awarded_by) {
        try {
          const { data: provider } = await supabase
            .from('providers')
            .select('first_name, last_name, email')
            .eq('id', transaction.awarded_by)
            .single();
          providerInfo = provider;
        } catch (error) {
          console.warn('Could not find provider for transaction:', error);
        }
      }
      
      enrichedTransactions.push({
        ...transaction,
        provider: providerInfo
      });
    }

    return enrichedTransactions;
  } catch (error) {
    console.error('Error getting patient points:', error);
    throw error;
  }
}

// Group session operations
async function createGroupSession(cmProviderId, sessionData) {
  try {
    const { data, error } = await supabase
      .from('cm_group_sessions')
      .insert({
        cm_provider_id: cmProviderId,
        session_name: sessionData.sessionName,
        pod_name: sessionData.podName,
        session_date: sessionData.sessionDate,
        duration_minutes: sessionData.durationMinutes || 60,
        max_participants: sessionData.maxParticipants || 8,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating group session:', error);
    throw error;
  }
}

async function recordAttendance(sessionId, cmPatientId, attended, pointsAwarded = 0, recordedBy = null) {
  try {
    const { data, error } = await supabase
      .from('cm_session_attendance')
      .insert({
        session_id: sessionId,
        cm_patient_id: cmPatientId,
        attended,
        points_awarded: pointsAwarded,
        recorded_by: recordedBy
      })
      .select()
      .single();

    if (error) throw error;
    
    // If attended and points awarded, record points transaction
    if (attended && pointsAwarded > 0) {
      await awardPoints(cmPatientId, pointsAwarded, 'Group session attendance', 'group_attendance', recordedBy, sessionId);
    }
    
    return data;
  } catch (error) {
    console.error('Error recording attendance:', error);
    throw error;
  }
}

// CPSS provider operations
async function getCPSSProviders() {
  try {
    // Get all providers who have CM patients
    const { data: cmProviders, error } = await supabase
      .from('cm_patients')
      .select('cpss_provider_id')
      .not('cpss_provider_id', 'is', null)
      .eq('status', 'active');

    if (error) throw error;

    const uniqueProviderIds = [...new Set((cmProviders || []).map(p => p.cpss_provider_id))];
    
    if (uniqueProviderIds.length === 0) {
      return [];
    }

    // Get provider details
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('id, first_name, last_name, email, npi')
      .in('id', uniqueProviderIds);

    if (providerError) throw providerError;

    // Calculate patient counts for each provider
    const enrichedProviders = [];
    for (const provider of providers || []) {
      const { count } = await supabase
        .from('cm_patients')
        .select('*', { count: 'exact', head: true })
        .eq('cpss_provider_id', provider.id)
        .eq('status', 'active');

      enrichedProviders.push({
        ...provider,
        current_patients: count || 0,
        provider_name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
        status: 'active'
      });
    }

    return enrichedProviders;
  } catch (error) {
    console.error('Error getting CPSS providers:', error);
    return [];
  }
}

// Dashboard statistics
async function getDashboardStats() {
  try {
    // Get counts using Supabase aggregation
    const [patientsResult, cpssResult, pointsResult] = await Promise.all([
      // Active CM patients
      supabase
        .from('cm_patients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Active CPSS providers
      supabase
        .from('cm_providers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Points awarded this month
      supabase
        .from('cm_points_transactions')
        .select('points')
        .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ]);

    const totalPatients = patientsResult.count || 0;
    const activeCPSS = cpssResult.count || 0;
    const pointsAwarded = pointsResult.data?.reduce((sum, t) => sum + t.points, 0) || 0;

    return {
      totalPatients,
      activeCPSS,
      pointsAwarded,
      monthlyRevenue: 0, // Calculate from actual claims later
      claimsSubmitted: 0, // Calculate from actual claims later
      successRate: totalPatients > 0 ? Math.round((totalPatients * 0.85)) : 0 // Mock calculation
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalPatients: 0,
      activeCPSS: 0,
      pointsAwarded: 0,
      monthlyRevenue: 0,
      claimsSubmitted: 0,
      successRate: 0
    };
  }
}

module.exports = {
  supabase,
  initializeCMDatabase,
  enrollPatientInCM,
  getCMPatient,
  findCMPatientByInfo,
  awardPoints,
  getCMPatientPoints,
  createGroupSession,
  recordAttendance,
  getCPSSProviders,
  getDashboardStats
};