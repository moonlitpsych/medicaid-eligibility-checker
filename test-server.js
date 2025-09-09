// Minimal test server to identify route parsing issue
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log('Testing basic Express setup...');

// Test basic routes first
app.get('/test', (req, res) => {
    res.json({ message: 'Basic route works' });
});

console.log('Basic routes added successfully');

// Test database routes import
try {
    console.log('Importing database routes...');
    const {
        handleDatabaseDrivenEligibilityCheck,
        handleGetPayers,
        handleGetPayerConfig
    } = require('./database-driven-api-routes');
    
    console.log('Database routes imported successfully');
    
    // Add database routes one by one to identify which causes issues
    console.log('Adding database-driven eligibility check route...');
    app.post('/api/database-eligibility/check', handleDatabaseDrivenEligibilityCheck);
    
    console.log('Adding payers route...');
    app.get('/api/database-eligibility/payers', handleGetPayers);
    
    console.log('Adding payer config route...');
    app.get('/api/database-eligibility/payer/:payerId/config', handleGetPayerConfig);
    
    console.log('All database routes added successfully');
    
} catch (error) {
    console.error('Error with database routes:', error);
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('  GET  /test');
    console.log('  POST /api/database-eligibility/check');
    console.log('  GET  /api/database-eligibility/payers');
    console.log('  GET  /api/database-eligibility/payer/:payerId/config');
});