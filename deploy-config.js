// Configuration for deployment
module.exports = {
    development: {
        cpssUrl: 'http://localhost:3000',
        patientUrl: 'http://localhost:3002',
        smsBaseUrl: 'http://localhost:3002'
    },
    production: {
        cpssUrl: process.env.CPSS_URL || 'https://moonlit-cm.vercel.app',
        patientUrl: process.env.PATIENT_URL || 'https://moonlit-patient.vercel.app',
        smsBaseUrl: process.env.PATIENT_URL || 'https://moonlit-patient.vercel.app'
    }
};