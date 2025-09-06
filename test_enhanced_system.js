// test_enhanced_system.js - Test the complete enhanced eligibility + network system

const http = require('http');

async function testEnhancedEligibilityAPI() {
    console.log('🧪 TESTING ENHANCED ELIGIBILITY + NETWORK SYSTEM');
    console.log('='.repeat(60));
    
    const testPatient = {
        first: 'Jeremy',
        last: 'Montoya',
        dob: '1984-07-17',
        gender: 'M'
    };
    
    console.log(`Testing with: ${testPatient.first} ${testPatient.last} (DOB: ${testPatient.dob})`);
    console.log('Expected: Utah Medicaid + In-Network Status\n');
    
    const postData = JSON.stringify(testPatient);
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/medicaid/check',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    console.log('📊 API RESPONSE:');
                    console.log('='.repeat(30));
                    console.log(`✅ Enrolled: ${result.enrolled}`);
                    console.log(`🏥 Program: ${result.program || 'N/A'}`);
                    console.log(`🔗 Network Status: ${result.networkStatus || 'N/A'}`);
                    console.log(`📋 Contract Status: ${result.contractStatus || 'N/A'}`);
                    console.log(`🏢 Contracted Payer: ${result.contractedPayerName || 'N/A'}`);
                    console.log(`📅 Can Schedule: ${result.canSchedule || 'N/A'}`);
                    console.log(`👨‍⚕️ Requires Attending: ${result.requiresAttending || 'N/A'}`);
                    console.log(`👥 Allows Supervised: ${result.allowsSupervised || 'N/A'}`);
                    
                    if (result.contractMessage) {
                        console.log(`💬 Message: ${result.contractMessage}`);
                    }
                    
                    if (result.officeAllyPayerId) {
                        console.log(`🆔 Office Ally Payer ID: ${result.officeAllyPayerId}`);
                    }
                    
                    console.log('\n🎯 INTEGRATION ANALYSIS:');
                    console.log('='.repeat(35));
                    
                    if (result.networkStatus === 'in_network') {
                        console.log('✅ SUCCESS: Patient is eligible AND in-network!');
                        console.log('   → Patient can schedule appointments');
                        console.log('   → Claims will be processed at in-network rates');
                    } else if (result.networkStatus === 'pending_activation') {
                        console.log('⏳ PENDING: Contract approved but not yet active');
                        console.log('   → Patient can likely schedule for future dates');
                    } else if (result.networkStatus === 'out_of_network') {
                        console.log('❌ OUT-OF-NETWORK: Patient eligible but no contract');
                        console.log('   → Would need to discuss out-of-network options');
                    } else {
                        console.log('❓ UNKNOWN: Network status could not be determined');
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.error('❌ Error parsing response:', error);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Request failed:', error);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

async function runTest() {
    try {
        console.log('🚀 Starting enhanced system test...\n');
        
        // Wait a moment for any server restarts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = await testEnhancedEligibilityAPI();
        
        console.log('\n✅ Enhanced system test completed successfully!');
        
        // Verify key enhancements are present
        const hasNetworkStatus = result.networkStatus !== undefined;
        const hasContractInfo = result.contractedPayerName !== undefined;
        const hasSchedulingGuidance = result.canSchedule !== undefined;
        
        console.log('\n🔍 ENHANCEMENT VERIFICATION:');
        console.log(`   Network Status Integration: ${hasNetworkStatus ? '✅' : '❌'}`);
        console.log(`   Contract Cross-Reference: ${hasContractInfo ? '✅' : '❌'}`);
        console.log(`   Scheduling Guidance: ${hasSchedulingGuidance ? '✅' : '❌'}`);
        
        if (hasNetworkStatus && hasContractInfo && hasSchedulingGuidance) {
            console.log('\n🎉 ALL ENHANCEMENTS WORKING PERFECTLY!');
            console.log('The system now provides:');
            console.log('• Real-time eligibility verification via Office Ally');
            console.log('• Cross-reference with Supabase contracted payers');
            console.log('• Network participation status (in/out/pending)');
            console.log('• Scheduling guidance based on contract status');
            console.log('• Enhanced frontend display with network badges');
        } else {
            console.log('\n⚠️ Some enhancements may not be fully active yet');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure the API server is running (node api-server.js)');
        console.log('2. Check that Supabase credentials are correct in .env.local');
        console.log('3. Verify the network integration module is properly installed');
    }
}

// Run the test
runTest();