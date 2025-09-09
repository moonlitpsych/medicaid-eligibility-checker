#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Common Aetna payer IDs used by different clearinghouses
const AETNA_VARIANTS = [
    { id: '60054', name: 'Aetna Healthcare' },
    { id: 'AETNA', name: 'Aetna' },
    { id: 'AET01', name: 'Aetna Plan 1' },
    { id: 'AET00', name: 'Aetna Generic' },
    { id: '00431', name: 'Aetna Alternative ID' },
    { id: 'AETNB', name: 'Aetna Better Health' },
    { id: 'AETBH', name: 'Aetna Better Health Alt' }
];

async function testAetnaVariants() {
    console.log('🔍 Testing Aetna Payer ID Variants for Tella Silver...\n');
    
    const patient = {
        first: 'Tella',
        last: 'Silver',
        dob: '1995-09-18',
        medicaidId: 'W268197637'
    };
    
    for (const variant of AETNA_VARIANTS) {
        console.log(`Testing ${variant.name} (${variant.id})...`);
        
        try {
            const response = await fetch('http://localhost:3000/api/medicaid/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...patient,
                    payerId: variant.id
                })
            });
            
            if (!response.ok) {
                console.log(`  ❌ HTTP Error: ${response.status}`);
                continue;
            }
            
            const result = await response.json();
            
            if (result.enrolled) {
                console.log(`  ✅ FOUND COVERAGE! ${variant.name}`);
                console.log(`     Program: ${result.program}`);
                if (result.copayInfo?.hasCopay) {
                    console.log(`     🚨 COPAY: $${result.copayInfo.copayAmount}`);
                }
                console.log('');
                
                // Save successful result for further analysis
                console.log('Full Response:', JSON.stringify(result, null, 2));
                return result;
            } else {
                console.log(`  ℹ️  No coverage found: ${result.error}`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n❌ No Aetna coverage found with any tested payer IDs');
    console.log('\nThis could mean:');
    console.log('1. Patient is not in Office Ally\'s Aetna database');
    console.log('2. Coverage may have lapsed or changed');
    console.log('3. Office Ally uses a different Aetna payer ID not in our test list');
    console.log('4. Real-time connectivity issue with this specific Aetna plan');
    
    return null;
}

testAetnaVariants().catch(console.error);