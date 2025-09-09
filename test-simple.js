#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAetna() {
    console.log('🧪 Testing Aetna Integration...\n');
    
    try {
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first: 'Jeremy',
                last: 'Montoya',
                dob: '1984-07-17',
                payerId: '60054'
            })
        });
        
        const result = await response.json();
        
        console.log('📋 RESULTS:');
        console.log(`   Enrolled: ${result.enrolled}`);
        console.log(`   Program: ${result.program}`);
        console.log(`   Payer Info:`, result.payerInfo || 'Not available');
        console.log(`   Copay Info:`, result.copayInfo || 'Not available');
        
        if (result.copayInfo?.hasCopay) {
            console.log(`\n🚨 COPAY ALERT: $${result.copayInfo.copayAmount} required`);
        } else {
            console.log(`\n✅ No copay detected`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAetna();