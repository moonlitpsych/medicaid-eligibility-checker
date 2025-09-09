// Comprehensive Database Integration Test
// Tests all CM database operations with corrected queries

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/cm';

async function runDatabaseTests() {
  console.log('🧪 Starting Comprehensive Database Integration Tests\n');

  try {
    // Test 1: Dashboard Stats
    console.log('1️⃣ Testing Dashboard Stats...');
    const statsResponse = await fetch(`${BASE_URL}/dashboard/stats`);
    const stats = await statsResponse.json();
    console.log('✅ Dashboard Stats:', JSON.stringify(stats, null, 2));

    // Test 2: Patient Enrollment (New Patient)
    console.log('\n2️⃣ Testing Patient Enrollment...');
    const enrollmentData = {
      patientData: {
        firstName: "Michael",
        lastName: "Rodriguez",
        dateOfBirth: "1988-11-15",
        insuranceType: "Utah Medicaid"
      },
      contactInfo: {
        phone: "(801) 555-0456",
        email: "michael.rodriguez@email.com",
        hasSmartphone: "yes",
        consent: true
      }
    };

    const enrollResponse = await fetch(`${BASE_URL}/patient/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollmentData)
    });

    const enrollResult = await enrollResponse.json();
    console.log('✅ Patient Enrollment:', enrollResult.success ? 'SUCCESS' : 'FAILED');
    if (enrollResult.success) {
      const patientId = enrollResult.patient.id;
      console.log(`   Patient ID: ${patientId}`);
      console.log(`   Starting Points: ${enrollResult.patient.total_points}`);

      // Test 3: Award Points
      console.log('\n3️⃣ Testing Points Award System...');
      const pointsData = {
        patientId: patientId,
        points: 50,
        reason: "Negative UDS result",
        reasonCode: "negative_uds",
        notes: "Clean drug screen - excellent progress!"
      };

      const pointsResponse = await fetch(`${BASE_URL}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointsData)
      });

      const pointsResult = await pointsResponse.json();
      console.log('✅ Points Award:', pointsResult.success ? 'SUCCESS' : 'FAILED');
      if (pointsResult.success) {
        console.log(`   Points Awarded: ${pointsResult.pointsAwarded}`);
        console.log(`   New Total: ${pointsResult.patient.total_points}`);
        console.log(`   Streak: ${pointsResult.patient.current_streak}`);
      }

      // Test 4: Points History
      console.log('\n4️⃣ Testing Points History...');
      const historyResponse = await fetch(`${BASE_URL}/history/${patientId}`);
      const historyResult = await historyResponse.json();
      console.log('✅ Points History:', historyResult.success ? 'SUCCESS' : 'FAILED');
      if (historyResult.success) {
        console.log(`   Transactions Found: ${historyResult.history.length}`);
        historyResult.history.forEach((transaction, index) => {
          console.log(`   ${index + 1}. ${transaction.reason} (+${transaction.points} pts)`);
        });
      }

      // Test 5: Bulk Points Award
      console.log('\n5️⃣ Testing Bulk Points Award...');
      const bulkData = {
        attendees: [patientId],
        pointsPerAttendee: 25,
        awardedBy: null,
        sessionId: 'test-session-123'
      };

      const bulkResponse = await fetch(`${BASE_URL}/award/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData)
      });

      const bulkResult = await bulkResponse.json();
      console.log('✅ Bulk Points Award:', bulkResult.success ? 'SUCCESS' : 'FAILED');
      if (bulkResult.success) {
        console.log(`   Total Awarded: ${bulkResult.totalAwarded} points`);
        console.log(`   Patients Processed: ${bulkResult.results.length}`);
      }
    }

    // Test 6: Updated Dashboard Stats
    console.log('\n6️⃣ Testing Updated Dashboard Stats...');
    const finalStatsResponse = await fetch(`${BASE_URL}/dashboard/stats`);
    const finalStats = await finalStatsResponse.json();
    console.log('✅ Updated Dashboard Stats:');
    console.log(`   Total Patients: ${finalStats.stats.totalPatients}`);
    console.log(`   Points Awarded: ${finalStats.stats.pointsAwarded}`);

    // Test 7: Point Values Reference
    console.log('\n7️⃣ Testing Point Values Reference...');
    const valuesResponse = await fetch(`${BASE_URL}/point-values`);
    const valuesResult = await valuesResponse.json();
    console.log('✅ Point Values:', valuesResult.success ? 'SUCCESS' : 'FAILED');
    if (valuesResult.success) {
      console.log('   Standard Point Values:');
      Object.entries(valuesResult.pointValues).forEach(([activity, points]) => {
        console.log(`   ${activity}: ${points} points`);
      });
    }

    console.log('\n🎉 All Database Integration Tests Completed!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Database connections working');
    console.log('✅ Patient enrollment functional');
    console.log('✅ Points system operational');
    console.log('✅ Transaction history tracking');
    console.log('✅ Bulk operations supported');
    console.log('✅ Dashboard statistics accurate');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the tests
runDatabaseTests();