/**
 * Recovery Day Demo - Mock Patient Setup
 * 
 * Creates a perfect demo patient that returns realistic data
 * without hitting the real Office Ally API or using real patient data.
 */

// Demo patient configuration
const DEMO_PATIENT = {
    // Use these exact details in the demo
    firstName: 'Alex',
    lastName: 'Demo',
    dateOfBirth: '1995-03-15',
    
    // Mock eligibility response (no real API call)
    mockResponse: {
        enrolled: true,
        program: 'Utah Medicaid - Targeted Adult (Traditional FFS)',
        planType: 'Traditional Fee-for-Service',
        responseTime: 1200, // Simulated response time
        
        // Auto-populated demo data
        extractedData: {
            phone: '3852018161', // YOUR phone number for demo
            medicaidId: 'DEMO123456',
            gender: 'U', // Unknown/demo
            address: {
                street: '123 Demo Street',
                city: 'Salt Lake City',
                state: 'UT',
                zip: '84101'
            }
        },
        
        // Demo-specific flags
        isDemoPatient: true,
        message: 'DEMO PATIENT - Utah Medicaid Traditional FFS - Qualified for CM Program'
    }
};

// Demo phone number for real SMS testing
const DEMO_PHONE = '3852018161'; // Your phone number

module.exports = {
    DEMO_PATIENT,
    DEMO_PHONE,
    
    // Check if this is the demo patient
    isDemoPatient: (firstName, lastName, dateOfBirth) => {
        return firstName?.toLowerCase() === 'alex' && 
               lastName?.toLowerCase() === 'demo' && 
               dateOfBirth === '1995-03-15';
    },
    
    // Get mock response for demo patient
    getDemoResponse: () => {
        return {
            ...DEMO_PATIENT.mockResponse,
            // Add timestamp for realism
            timestamp: new Date().toISOString()
        };
    }
};

console.log(`
🎭 DEMO PATIENT SETUP
====================

Use these details in Recovery Day demo:
👤 Name: Alex Demo
📅 DOB: 1995-03-15 (March 15, 1995)
📱 Phone: ${DEMO_PHONE} (your actual phone)

This will:
✅ Skip real Office Ally API call
✅ Return realistic "ELIGIBLE" response
✅ Auto-populate phone number with YOUR number
✅ Send real SMS to your phone during demo
✅ Show all the same UI/UX as real patients

Perfect for live demonstration! 🎯
`);