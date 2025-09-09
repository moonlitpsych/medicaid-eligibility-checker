// Migration Script - Move existing CM patients to canonical architecture
// Run this after executing the SQL migration in Supabase

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateToCanonical() {
  console.log('🔄 Starting migration to canonical patient architecture...\n');

  try {
    // Step 1: Get existing CM patients from old structure
    console.log('1️⃣ Fetching existing CM patients...');
    const { data: existingCMPatients, error: fetchError } = await supabase
      .from('cm_patients')
      .select(`
        *,
        patients(first_name, last_name, date_of_birth, email, phone, insurance_primary)
      `);

    if (fetchError) {
      console.log('ℹ️ No existing CM patients found or old table structure not present');
      console.log('   This is expected if you\'re starting fresh with canonical architecture');
      await testCanonicalSetup();
      return;
    }

    console.log(`   Found ${existingCMPatients?.length || 0} existing CM patients`);

    if (!existingCMPatients || existingCMPatients.length === 0) {
      console.log('✅ No existing patients to migrate');
      await testCanonicalSetup();
      return;
    }

    // Step 2: Migrate each patient to canonical architecture
    console.log('\n2️⃣ Migrating patients to canonical architecture...');
    
    const migrationResults = [];
    
    for (const cmPatient of existingCMPatients) {
      try {
        if (!cmPatient.patients) {
          console.log(`   ⚠️ Skipping CM patient ${cmPatient.id} - no linked patient data`);
          continue;
        }

        const patientData = cmPatient.patients;
        
        console.log(`   📋 Migrating: ${patientData.first_name} ${patientData.last_name}`);

        // Step 2a: Create canonical patient
        const { data: canonicalPatient, error: canonicalError } = await supabase
          .from('patients_canonical')
          .upsert({
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            date_of_birth: patientData.date_of_birth
          }, {
            onConflict: 'first_name,last_name,date_of_birth'
          })
          .select()
          .single();

        if (canonicalError) throw canonicalError;

        // Step 2b: Create CM-specific patient data
        const { data: cmPatientData, error: cmDataError } = await supabase
          .from('patients_cm')
          .upsert({
            canonical_patient_id: canonicalPatient.id,
            phone: patientData.phone,
            email: patientData.email,
            insurance_primary: patientData.insurance_primary,
            enrollment_source: 'existing_patient',
            smartphone_access: 'yes', // Default assumption
            status: cmPatient.status || 'active'
          }, {
            onConflict: 'canonical_patient_id'
          })
          .select()
          .single();

        if (cmDataError) throw cmDataError;

        // Step 2c: Create CM enrollment record
        const { data: cmEnrollment, error: enrollmentError } = await supabase
          .from('cm_enrollments')
          .upsert({
            canonical_patient_id: canonicalPatient.id,
            cm_patient_id: cmPatientData.id,
            cm_program_id: cmPatient.cm_program_id,
            cpss_provider_id: null, // Will be assigned later
            total_points: cmPatient.total_points || 0,
            current_streak: cmPatient.current_streak || 0,
            enrollment_date: cmPatient.enrollment_date || cmPatient.created_at,
            status: cmPatient.status || 'active',
            medicaid_verification: cmPatient.medicaid_verification,
            pod_assignment: cmPatient.pod_assignment,
            notes: cmPatient.notes
          }, {
            onConflict: 'canonical_patient_id,cm_program_id'
          })
          .select()
          .single();

        if (enrollmentError) throw enrollmentError;

        // Step 2d: Update existing points transactions
        const { error: updateTransactionsError } = await supabase
          .from('cm_points_transactions')
          .update({
            canonical_patient_id: canonicalPatient.id,
            cm_enrollment_id: cmEnrollment.id
          })
          .eq('cm_patient_id', cmPatient.id);

        if (updateTransactionsError) {
          console.log(`     ⚠️ Warning: Could not update transactions for ${patientData.first_name}`);
        }

        migrationResults.push({
          success: true,
          patientName: `${patientData.first_name} ${patientData.last_name}`,
          canonicalId: canonicalPatient.id,
          cmDataId: cmPatientData.id,
          enrollmentId: cmEnrollment.id
        });

        console.log(`     ✅ Successfully migrated: ${patientData.first_name} ${patientData.last_name}`);

      } catch (error) {
        console.error(`     ❌ Failed to migrate patient:`, error);
        migrationResults.push({
          success: false,
          error: error.message,
          cmPatientId: cmPatient.id
        });
      }
    }

    // Step 3: Migration Summary
    console.log('\n3️⃣ Migration Summary:');
    const successful = migrationResults.filter(r => r.success);
    const failed = migrationResults.filter(r => !r.success);
    
    console.log(`   ✅ Successfully migrated: ${successful.length} patients`);
    console.log(`   ❌ Failed migrations: ${failed.length} patients`);
    
    if (successful.length > 0) {
      console.log('\n   Migrated Patients:');
      successful.forEach(result => {
        console.log(`   - ${result.patientName} (Canonical ID: ${result.canonicalId.slice(0, 8)}...)`);
      });
    }

    if (failed.length > 0) {
      console.log('\n   Failed Migrations:');
      failed.forEach(result => {
        console.log(`   - CM Patient ID: ${result.cmPatientId} - Error: ${result.error}`);
      });
    }

    // Step 4: Test canonical setup
    console.log('\n4️⃣ Testing canonical architecture...');
    await testCanonicalSetup();

    console.log('\n🎉 Migration to canonical architecture completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Update your application to use the new canonical API');
    console.log('   2. Test patient enrollment and points system');
    console.log('   3. After verification, you can safely remove old cm_patients table');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function testCanonicalSetup() {
  try {
    console.log('   🧪 Testing canonical database setup...');

    // Test 1: Check table structure
    const { data: canonicalCount } = await supabase
      .from('patients_canonical')
      .select('*', { count: 'exact', head: true });

    const { data: cmCount } = await supabase
      .from('patients_cm')
      .select('*', { count: 'exact', head: true });

    const { data: enrollmentCount } = await supabase
      .from('cm_enrollments')
      .select('*', { count: 'exact', head: true });

    const { data: cpssCount } = await supabase
      .from('providers_cm')
      .select('*', { count: 'exact', head: true });

    console.log(`   📊 Canonical Architecture Status:`);
    console.log(`      - Canonical patients: ${canonicalCount?.count || 0}`);
    console.log(`      - CM patient data: ${cmCount?.count || 0}`);
    console.log(`      - CM enrollments: ${enrollmentCount?.count || 0}`);
    console.log(`      - CPSS providers: ${cpssCount?.count || 0}`);

    // Test 2: Test patient creation
    console.log('   🔬 Testing patient enrollment...');
    
    const testCanonical = await supabase
      .from('patients_canonical')
      .upsert({
        first_name: 'Test',
        last_name: 'Migration',
        date_of_birth: '1990-01-01'
      }, {
        onConflict: 'first_name,last_name,date_of_birth'
      })
      .select()
      .single();

    if (testCanonical.error) throw testCanonical.error;

    console.log(`      ✅ Test canonical patient created: ${testCanonical.data.id.slice(0, 8)}...`);

    console.log('   ✅ Canonical architecture is working correctly!');

  } catch (error) {
    console.error('   ❌ Canonical setup test failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateToCanonical()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToCanonical };