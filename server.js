// server.js - Express server for Utah Medicaid Eligibility Checker
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Import the eligibility check handlers
const checkEligibility = require('./routes/eligibility.js');
const checkUtahMedicaidEligibility = require('./routes/utah-medicaid-working.js');
const recoveryDayRoutes = require('./api/recovery-day-routes.js');

// API Routes
app.post('/api/medicaid/check', checkEligibility);
app.post('/api/utah-medicaid/check', checkUtahMedicaidEligibility); // WORKING Utah Medicaid service
app.use('/api/recovery-day', recoveryDayRoutes); // Recovery Day demo routes

// Serve the main interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        provider: process.env.ELIGIBILITY_PROVIDER || 'office_ally',
        simulation_mode: process.env.SIMULATION_MODE === 'true',
        ready: true
    });
});

app.listen(PORT, () => {
    console.log(`
🎉 UTAH MEDICAID ELIGIBILITY CHECKER READY!
===========================================

🌐 Web Interface: http://localhost:${PORT}
⚡ Office Ally Integration: LIVE
🎯 Response Time Target: <1 second
💰 Cost per verification: $0.10

Ready to verify real patient eligibility! 🚀
    `);
});

module.exports = app;