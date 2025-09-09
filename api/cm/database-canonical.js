// CM Database Operations - Canonical Patient Identity Architecture
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not found in environment variables - CM canonical features will be disabled');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase client:', error.message);
  }
}

// Initialize CM Database with new canonical architecture
async function initializeCMDatabaseCanonical() {
  if (!supabase) {
    console.warn('⚠️ Supabase not available - skipping CM canonical database initialization');
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    // Check if new tables exist
    const { data, error } = await supabase
      .from('patients_canonical')
      .select('id')
      .limit(1);

    if (error) {
      console.log('⚠️ Canonical tables not found - please run the migration SQL in Supabase first');
      console.log('📁 Execute: database-migration-sql.sql in your Supabase SQL Editor');
      return false;
    }

    console.log('✅ Canonical CM Database tables verified');
    
    // Ensure we have at least one CPSS provider
    await ensureSampleCPSSProvider();
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing canonical CM database:', error);
    return false;
  }
}

// Ensure sample CPSS provider exists
async function ensureSampleCPSSProvider() {
  try {
    const { count } = await supabase
      .from('providers_cm')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      console.log('💡 No CPSS providers found - creating sample provider');
      await supabase
        .from('providers_cm')
        .insert({
          first_name: 'Sample',
          last_name: 'CPSS',
          email: 'sample.cpss@moonlit.com',
          role: 'cpss',
          credentials: 'CPSS-I'
        });
      console.log('✅ Sample CPSS provider created');
    }
  } catch (error) {
    console.log('ℹ️ CPSS provider check skipped:', error.message);
  }
}

// CANONICAL PATIENT OPERATIONS

// Create or find canonical patient identity
async function createOrFindCanonicalPatient(firstName, lastName, dateOfBirth) {
  try {
    // Try to find existing canonical patient (case insensitive)
    const { data: existing, error: findError } = await supabase
      .from('patients_canonical')
      .select('*')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .eq('date_of_birth', dateOfBirth)
      .single();

    if (!findError && existing) {
      return existing;
    }

    // Create new canonical patient
    const { data: newPatient, error: createError } = await supabase
      .from('patients_canonical')
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth
      })
      .select()
      .single();

    if (createError) throw createError;
    
    console.log(`✅ Created canonical patient: ${firstName} ${lastName}`);
    return newPatient;
  } catch (error) {
    console.error('Error with canonical patient:', error);
    throw error;
  }
}

// Create CM-specific patient data
async function createCMPatientData(canonicalPatientId, contactInfo, enrollmentSource = 'acute_care') {
  try {
    const { data, error } = await supabase
      .from('patients_cm')
      .insert({
        canonical_patient_id: canonicalPatientId,
        phone: contactInfo?.phone,
        email: contactInfo?.email,
        insurance_primary: contactInfo?.insuranceType || 'Utah Medicaid',
        medicaid_id: contactInfo?.medicaidId,
        enrollment_source: enrollmentSource,
        consent_date: new Date().toISOString(),
        smartphone_access: contactInfo?.hasSmartphone || 'yes',
        emergency_contact_name: contactInfo?.emergencyContactName,
        emergency_contact_phone: contactInfo?.emergencyContactPhone,
        address_street: contactInfo?.addressStreet,
        address_city: contactInfo?.addressCity,
        address_state: contactInfo?.addressState || 'UT',
        address_zip: contactInfo?.addressZip,
        preferred_language: contactInfo?.preferredLanguage || 'English'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating CM patient data:', error);
    throw error;
  }
}

// Create CM enrollment record
async function createCMEnrollment(canonicalPatientId, cmPatientId, cpssProviderId = null) {
  try {
    // Get the default CM program
    const { data: cmProgram, error: programError } = await supabase
      .from('contingency_management')
      .select('id')
      .limit(1)
      .single();

    if (programError) throw new Error('No CM program found');

    // Create enrollment record
    const { data: enrollment, error: enrollError } = await supabase
      .from('cm_enrollments')
      .insert({
        canonical_patient_id: canonicalPatientId,
        cm_patient_id: cmPatientId,
        cm_program_id: cmProgram.id,
        cpss_provider_id: cpssProviderId,
        total_points: 25, // Welcome bonus
        enrollment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (enrollError) throw enrollError;

    // Award welcome bonus points
    await awardPointsCanonical(canonicalPatientId, 25, 'Welcome to CM Program', 'enrollment_bonus', cpssProviderId);
    
    return enrollment;
  } catch (error) {
    console.error('Error creating CM enrollment:', error);
    throw error;
  }
}

// Complete patient enrollment process (NEW API)
async function enrollPatientCanonical(patientData, contactInfo, cpssProviderId = null) {
  try {
    // Step 1: Create or find canonical patient identity
    const canonicalPatient = await createOrFindCanonicalPatient(
      patientData.firstName,
      patientData.lastName,
      patientData.dateOfBirth
    );

    // Step 2: Check if already enrolled in CM
    const { data: existingCM, error: checkError } = await supabase
      .from('patients_cm')
      .select('*')
      .eq('canonical_patient_id', canonicalPatient.id)
      .single();

    if (!checkError && existingCM) {
      throw new Error('Patient already enrolled in CM program');
    }

    // Step 3: Create CM-specific patient data
    const cmPatient = await createCMPatientData(
      canonicalPatient.id, 
      { ...contactInfo, insuranceType: patientData.insuranceType },
      patientData.enrollmentSource || 'acute_care'
    );

    // Step 4: Create CM enrollment
    const enrollment = await createCMEnrollment(
      canonicalPatient.id,
      cmPatient.id,
      cpssProviderId
    );

    // Step 5: Return complete patient view
    return await getCompletePatientView(canonicalPatient.id);
  } catch (error) {
    console.error('Error in canonical patient enrollment:', error);
    throw error;
  }
}

// Get complete patient view across all systems
async function getCompletePatientView(canonicalPatientId) {
  try {
    // Get canonical identity
    const { data: canonical, error: canonicalError } = await supabase
      .from('patients_canonical')
      .select('*')
      .eq('id', canonicalPatientId)
      .single();

    if (canonicalError) throw canonicalError;

    // Get CM-specific data
    const { data: cmData } = await supabase
      .from('patients_cm')
      .select('*')
      .eq('canonical_patient_id', canonicalPatientId)
      .single();

    // Get IntakeQ link if exists
    const { data: intakeqLink } = await supabase
      .from('patients_intakeq_link')
      .select('*, patients(*)')
      .eq('canonical_patient_id', canonicalPatientId)
      .maybeSingle();

    // Get CM enrollment
    const { data: enrollment } = await supabase
      .from('cm_enrollments')
      .select('*, providers_cm(*)')
      .eq('canonical_patient_id', canonicalPatientId)
      .single();

    return {
      id: enrollment?.id || canonicalPatientId, // For API compatibility
      canonical: canonical,
      cm_data: cmData,
      intakeq_link: intakeqLink,
      enrollment: enrollment,
      // Legacy compatibility fields
      patient_id: canonical.id,
      total_points: enrollment?.total_points || 0,
      current_streak: enrollment?.current_streak || 0,
      status: enrollment?.status || 'active',
      cpss_provider: enrollment?.providers_cm,
      patients: {
        first_name: canonical.first_name,
        last_name: canonical.last_name,
        date_of_birth: canonical.date_of_birth,
        email: cmData?.email,
        phone: cmData?.phone,
        insurance_primary: cmData?.insurance_primary
      }
    };
  } catch (error) {
    console.error('Error getting complete patient view:', error);
    throw error;
  }
}

// Find patient by demographic info
async function findCMPatientCanonical(firstName, lastName, dateOfBirth) {
  try {
    // Find canonical patient
    const { data: canonical, error: canonicalError } = await supabase
      .from('patients_canonical')
      .select('*')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .eq('date_of_birth', dateOfBirth)
      .single();

    if (canonicalError) return null;

    // Check if enrolled in CM
    const { data: cmEnrollment } = await supabase
      .from('cm_enrollments')
      .select('*')
      .eq('canonical_patient_id', canonical.id)
      .eq('status', 'active')
      .single();

    if (!cmEnrollment) {
      // Check if they exist in IntakeQ (potential for enrollment)
      const { data: intakeqLink } = await supabase
        .from('patients_intakeq_link')
        .select('*, patients(*)')
        .eq('canonical_patient_id', canonical.id)
        .maybeSingle();

      return { 
        canonical: canonical,
        enrolledInCM: false, 
        existsInIntakeQ: !!intakeqLink,
        intakeqData: intakeqLink?.patients
      };
    }

    // Return complete enrolled patient view
    return {
      ...(await getCompletePatientView(canonical.id)),
      enrolledInCM: true
    };
  } catch (error) {
    console.error('Error finding CM patient:', error);
    return null;
  }
}

// POINTS SYSTEM WITH CANONICAL IDENTITY

// Award points to canonical patient
async function awardPointsCanonical(canonicalPatientId, points, reason, reasonCode, awardedBy = null, sessionId = null, notes = null) {
  try {
    // Get enrollment ID
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('cm_enrollments')
      .select('id, total_points, current_streak')
      .eq('canonical_patient_id', canonicalPatientId)
      .eq('status', 'active')
      .single();

    if (enrollmentError) throw enrollmentError;

    // Insert points transaction with canonical and enrollment IDs
    const { data: transaction, error: transactionError } = await supabase
      .from('cm_points_transactions')
      .insert({
        canonical_patient_id: canonicalPatientId,
        cm_enrollment_id: enrollment.id,
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

    // Update enrollment points and streak
    let newStreak = enrollment.current_streak;
    if (reasonCode === 'group_attendance' || reasonCode === 'negative_uds') {
      newStreak += 1;
    }

    const { error: updateError } = await supabase
      .from('cm_enrollments')
      .update({ 
        total_points: enrollment.total_points + points,
        current_streak: newStreak,
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    if (updateError) throw updateError;

    // Return updated patient view
    return await getCompletePatientView(canonicalPatientId);
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
}

// Get patient points history
async function getCMPatientPointsCanonical(canonicalPatientId, limit = 10) {
  try {
    const { data: transactions, error } = await supabase
      .from('cm_points_transactions')
      .select('*')
      .eq('canonical_patient_id', canonicalPatientId)
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
            .from('providers_cm')
            .select('first_name, last_name, email')
            .eq('id', transaction.awarded_by)
            .single();
          providerInfo = provider;
        } catch (error) {
          console.warn('Could not find CPSS provider for transaction:', error);
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

// DASHBOARD AND REPORTING

// Get dashboard statistics with canonical architecture
async function getDashboardStatsCanonical() {
  try {
    const [enrollmentsResult, cpssResult, pointsResult] = await Promise.all([
      // Active CM enrollments
      supabase
        .from('cm_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Active CPSS providers
      supabase
        .from('providers_cm')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Points awarded this month
      supabase
        .from('cm_points_transactions')
        .select('points')
        .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ]);

    const totalPatients = enrollmentsResult.count || 0;
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

// Get all CPSS providers
async function getCPSSProvidersCanonical() {
  try {
    const { data: providers, error } = await supabase
      .from('providers_cm')
      .select('*')
      .eq('status', 'active')
      .order('first_name');

    if (error) throw error;

    // Calculate patient counts for each provider
    const enrichedProviders = [];
    for (const provider of providers || []) {
      const { count } = await supabase
        .from('cm_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('cpss_provider_id', provider.id)
        .eq('status', 'active');

      enrichedProviders.push({
        ...provider,
        current_patients: count || 0,
        provider_name: `${provider.first_name} ${provider.last_name}`.trim()
      });
    }

    return enrichedProviders;
  } catch (error) {
    console.error('Error getting CPSS providers:', error);
    return [];
  }
}

// DUAL ENROLLMENT DETECTION

// Link existing IntakeQ patient to canonical identity
async function linkIntakeQPatient(canonicalPatientId, intakeqPatientId, linkedBy = null, confidenceScore = 1.00) {
  try {
    const { data, error } = await supabase
      .from('patients_intakeq_link')
      .insert({
        canonical_patient_id: canonicalPatientId,
        intakeq_patient_id: intakeqPatientId,
        linked_by: linkedBy,
        confidence_score: confidenceScore,
        notes: 'Manual link during CM enrollment'
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Linked IntakeQ patient ${intakeqPatientId} to canonical ${canonicalPatientId}`);
    return data;
  } catch (error) {
    console.error('Error linking IntakeQ patient:', error);
    throw error;
  }
}

// Detect potential dual enrollments
async function detectDualEnrollments() {
  try {
    const { data, error } = await supabase
      .from('patients_canonical')
      .select(`
        *,
        patients_cm(*),
        patients_intakeq_link(*, patients(*)),
        cm_enrollments(*)
      `);

    if (error) throw error;

    return data?.filter(patient => 
      patient.patients_cm.length > 0 && patient.patients_intakeq_link.length > 0
    ) || [];
  } catch (error) {
    console.error('Error detecting dual enrollments:', error);
    return [];
  }
}

module.exports = {
  supabase,
  initializeCMDatabaseCanonical,
  
  // Canonical patient operations
  createOrFindCanonicalPatient,
  createCMPatientData,
  createCMEnrollment,
  enrollPatientCanonical,
  getCompletePatientView,
  findCMPatientCanonical,
  
  // Points system
  awardPointsCanonical,
  getCMPatientPointsCanonical,
  
  // Dashboard and reporting
  getDashboardStatsCanonical,
  getCPSSProvidersCanonical,
  
  // Dual enrollment
  linkIntakeQPatient,
  detectDualEnrollments,
  
  // Legacy compatibility exports
  enrollPatientInCM: enrollPatientCanonical,
  getCMPatient: getCompletePatientView,
  findCMPatientByInfo: findCMPatientCanonical,
  awardPoints: awardPointsCanonical,
  getCMPatientPoints: getCMPatientPointsCanonical,
  getDashboardStats: getDashboardStatsCanonical,
  getCPSSProviders: getCPSSProvidersCanonical
};