// supabase_network_integration.js - Cross-Reference Office Ally with Supabase Network Data

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Payer ID mapping: Office Ally -> Common Names
const OFFICE_ALLY_PAYER_MAP = {
    'UTMCD': {
        name: 'Utah Medicaid',
        aliases: ['Utah Medicaid Fee-for-Service', 'Utah Medicaid', 'Medicaid Utah'],
        state: 'UT',
        type: 'Medicaid'
    },
    'SKUT0': {
        name: 'Utah Medicaid',
        aliases: ['Utah Medicaid Fee-for-Service', 'Utah Medicaid', 'Medicaid Utah'],
        state: 'UT',
        type: 'Medicaid'
    },
    'REGENCE': {
        name: 'Regence BlueCross BlueShield',
        aliases: ['Regence', 'Regence BCBS'],
        state: 'UT',
        type: 'Private'
    },
    'CIGNA': {
        name: 'Cigna',
        aliases: ['Cigna Healthcare'],
        state: 'UT',
        type: 'Private'
    },
    'TRICARE': {
        name: 'TriCare West',
        aliases: ['TriWest', 'TRICARE West'],
        state: 'UT',
        type: 'Private'
    }
};

/**
 * Cross-reference Office Ally payer with Supabase contracted payers
 */
async function getNetworkStatus(officeAllyPayerId, patientState = 'UT') {
    try {
        console.log(`🔍 Looking up network status for payer: ${officeAllyPayerId}`);
        
        // Get payer info from Office Ally mapping
        const payerInfo = OFFICE_ALLY_PAYER_MAP[officeAllyPayerId];
        if (!payerInfo) {
            console.log(`❓ Unknown Office Ally payer ID: ${officeAllyPayerId}`);
            return {
                networkStatus: 'unknown',
                contractStatus: 'not_found',
                payerName: officeAllyPayerId,
                message: `Payer ${officeAllyPayerId} not in our network database`
            };
        }
        
        // Search Supabase for matching contracted payer
        const searchTerms = [payerInfo.name, ...payerInfo.aliases];
        let contractedPayer = null;
        
        for (const searchTerm of searchTerms) {
            const { data, error } = await supabase
                .from('payers')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .eq('state', payerInfo.state)
                .single();
                
            if (!error && data) {
                contractedPayer = data;
                break;
            }
        }
        
        if (!contractedPayer) {
            console.log(`❌ No contract found for ${payerInfo.name}`);
            return {
                networkStatus: 'out_of_network',
                contractStatus: 'no_contract',
                payerName: payerInfo.name,
                message: `We do not have a contract with ${payerInfo.name}`
            };
        }
        
        // Analyze contract status
        const status = contractedPayer.status_code;
        const effectiveDate = contractedPayer.effective_date;
        const projectedDate = contractedPayer.projected_effective_date;
        
        let networkStatus, message;
        
        switch (status) {
            case 'approved':
                if (effectiveDate && new Date(effectiveDate) <= new Date()) {
                    networkStatus = 'in_network';
                    message = `✅ In-network with ${contractedPayer.name} (Active since ${effectiveDate})`;
                } else {
                    networkStatus = 'pending_activation';
                    message = `⏳ Contract approved but not yet active (Effective: ${effectiveDate || projectedDate})`;
                }
                break;
                
            case 'waiting_on_them':
                networkStatus = 'pending_approval';
                message = `⏳ Contract pending with ${contractedPayer.name} (Projected: ${projectedDate || 'TBD'})`;
                break;
                
            case 'denied':
                networkStatus = 'out_of_network';
                message = `❌ Contract denied by ${contractedPayer.name}`;
                break;
                
            case 'not_started':
                networkStatus = 'out_of_network';
                message = `❌ No contract initiated with ${contractedPayer.name}`;
                break;
                
            default:
                networkStatus = 'unknown';
                message = `❓ Unknown contract status: ${status}`;
        }
        
        return {
            networkStatus,
            contractStatus: status,
            payerName: contractedPayer.name,
            payerId: contractedPayer.id,
            effectiveDate,
            projectedDate,
            requiresAttending: contractedPayer.requires_attending,
            allowsSupervised: contractedPayer.allows_supervised,
            message
        };
        
    } catch (error) {
        console.error('Network status lookup error:', error);
        return {
            networkStatus: 'error',
            contractStatus: 'error',
            payerName: officeAllyPayerId,
            message: 'Unable to verify network status at this time'
        };
    }
}

/**
 * Get all contracted payers for a specific state
 */
async function getContractedPayers(state = 'UT') {
    try {
        const { data, error } = await supabase
            .from('payers')
            .select('*')
            .eq('state', state)
            .in('status_code', ['approved', 'waiting_on_them']);
            
        if (error) {
            throw error;
        }
        
        return data.map(payer => ({
            id: payer.id,
            name: payer.name,
            type: payer.payer_type,
            status: payer.status_code,
            effectiveDate: payer.effective_date,
            projectedDate: payer.projected_effective_date,
            isActive: payer.status_code === 'approved' && 
                     payer.effective_date && 
                     new Date(payer.effective_date) <= new Date()
        }));
        
    } catch (error) {
        console.error('Error fetching contracted payers:', error);
        return [];
    }
}

/**
 * Enhanced eligibility check with network status
 */
async function checkEligibilityWithNetworkStatus(patientData, x12_271_response) {
    try {
        // Parse X12 271 to extract payer information
        const payerMatch = x12_271_response.match(/NM1\*PR\*2\*([^*]+)\*.*?\*PI\*([^~]+)/);
        const payerName = payerMatch ? payerMatch[1] : 'Unknown';
        const payerId = payerMatch ? payerMatch[2] : 'Unknown';
        
        console.log(`🎯 Extracted payer: ${payerName} (ID: ${payerId})`);
        
        // Get network status
        const networkInfo = await getNetworkStatus(payerId, patientData.state || 'UT');
        
        // Determine overall eligibility status
        const isEligible = x12_271_response.includes('EB*1*') || x12_271_response.includes('EB*A*');
        const isInNetwork = networkInfo.networkStatus === 'in_network';
        
        return {
            // Standard eligibility info
            enrolled: isEligible,
            verified: true,
            program: payerName,
            
            // Enhanced network info
            networkStatus: networkInfo.networkStatus,
            contractStatus: networkInfo.contractStatus,
            contractedPayerName: networkInfo.payerName,
            contractMessage: networkInfo.message,
            
            // Billing guidance
            canSchedule: isEligible && (isInNetwork || networkInfo.networkStatus === 'pending_activation'),
            requiresAttending: networkInfo.requiresAttending || false,
            allowsSupervised: networkInfo.allowsSupervised || false,
            
            // Raw data for debugging
            rawX12: x12_271_response,
            officeAllyPayerId: payerId,
            officeAllyPayerName: payerName
        };
        
    } catch (error) {
        console.error('Enhanced eligibility check error:', error);
        return {
            enrolled: false,
            verified: false,
            error: 'Unable to verify eligibility and network status',
            networkStatus: 'error'
        };
    }
}

/**
 * Test the network integration with Utah Medicaid
 */
async function testNetworkIntegration() {
    console.log('🧪 TESTING NETWORK INTEGRATION');
    console.log('='.repeat(50));
    
    // Test Utah Medicaid lookup
    console.log('\n1️⃣ Testing Utah Medicaid (UTMCD):');
    const utahResult = await getNetworkStatus('UTMCD', 'UT');
    console.log(JSON.stringify(utahResult, null, 2));
    
    // Test unknown payer
    console.log('\n2️⃣ Testing unknown payer (FAKEID):');
    const unknownResult = await getNetworkStatus('FAKEID', 'UT');
    console.log(JSON.stringify(unknownResult, null, 2));
    
    // Test contracted payers list
    console.log('\n3️⃣ Getting all contracted payers in UT:');
    const contractedPayers = await getContractedPayers('UT');
    console.log(`Found ${contractedPayers.length} contracted payers:`);
    contractedPayers.forEach(payer => {
        console.log(`  • ${payer.name} (${payer.type}) - ${payer.status} ${payer.isActive ? '✅' : '⏳'}`);
    });
    
    console.log('\n✅ Network integration test complete!');
}

// Export functions for use in API
module.exports = {
    getNetworkStatus,
    getContractedPayers,
    checkEligibilityWithNetworkStatus,
    OFFICE_ALLY_PAYER_MAP
};

// Run test if called directly
if (require.main === module) {
    testNetworkIntegration()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}