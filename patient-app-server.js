const express = require('express');
const path = require('path');
const app = express();

// Serve patient app
app.use(express.static(path.join(__dirname, './patient-app')));

// Enrollment bridge endpoint
app.get('/enroll', (req, res) => {
    res.sendFile(path.join(__dirname, 'patient-enrollment-bridge.html'));
});

// Default route to serve the patient app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './patient-app/client/index.html'));
});

// Start on port 3002
const PORT = process.env.PATIENT_APP_PORT || 3002;
app.listen(PORT, () => {
    console.log(`🎯 Patient app serving at http://localhost:${PORT}`);
    console.log(`📱 Serving patient app from: ${path.join(__dirname, './patient-app')}`);
});