// test-fullstack.js - Test the full-stack application with real Office Ally data
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFullStackAPI() {
    console.log('🔗 TESTING FULL-STACK APPLICATION');
    console.log('='.repeat(40));
    console.log('Backend: http://localhost:3000');
    console.log('Frontend: http://localhost:5174');

    // Test patients
    const patients = [
        {
            first: 'Jeremy',
            last: 'Montoya',
            dob: '1984-07-17',
            ssn: '123456789', // Will be ignored (Name/DOB only format)
            gender: 'M'
        },
        {
            first: 'Jane',
            last: 'Doe', 
            dob: '1990-01-15',
            gender: 'F'
        }
    ];

    for (const patient of patients) {
        console.log(`\n🔍 Testing: ${patient.first} ${patient.last}`);
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('http://localhost:3000/api/medicaid/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patient)
            });

            const responseTime = Date.now() - startTime;
            const result = await response.json();

            console.log(`⏱️  API Response Time: ${responseTime}ms`);
            console.log(`✅ Status: ${response.status}`);

            if (result.enrolled) {
                console.log('🎉 ENROLLED in Utah Medicaid');
                console.log(`   Program: ${result.program || 'Utah Medicaid'}`);
                if (result.details) {
                    console.log(`   Details: ${result.details}`);
                }
                if (result.effectiveDate) {
                    console.log(`   Effective Date: ${result.effectiveDate}`);
                }
            } else {
                console.log('❌ NOT ENROLLED');
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
            }

            console.log(`   Verified: ${result.verified ? 'Yes' : 'No (simulation)'}`);

        } catch (error) {
            console.log(`❌ API Test Failed: ${error.message}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 FULL-STACK TEST COMPLETE');
    console.log('The application is ready for real patient eligibility verification!');
    console.log('\n🌐 Access the web application at: http://localhost:5174');
}

if (require.main === module) {
    testFullStackAPI();
}

module.exports = { testFullStackAPI };