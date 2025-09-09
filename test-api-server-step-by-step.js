// Step by step test of api-server.js components
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');

console.log('Step 1: Basic Express setup...');
const app = express();
app.use(cors());
app.use(express.json());

console.log('Step 2: Testing basic middleware...');

console.log('Step 3: Testing database routes import...');
try {
    const {
        handleDatabaseDrivenEligibilityCheck,
        handleGetPayers,
        handleGetPayerConfig
    } = require('./database-driven-api-routes');
    console.log('✅ Database routes imported successfully');
    
    // Add database routes
    app.post('/api/database-eligibility/check', handleDatabaseDrivenEligibilityCheck);
    app.get('/api/database-eligibility/payers', handleGetPayers);
    app.get('/api/database-eligibility/payer/:payerId/config', handleGetPayerConfig);
    console.log('✅ Database routes added successfully');
    
} catch (error) {
    console.error('❌ Database routes failed:', error);
    process.exit(1);
}

console.log('Step 4: Testing CM routes import...');
try {
    const cmPointsRouter = require('./api/cm/points');
    const canonicalPointsRouter = require('./api/cm/points-canonical');
    console.log('✅ CM routes imported successfully');
    
    app.use('/api/cm', canonicalPointsRouter);
    app.use('/api/cm-legacy', cmPointsRouter);
    console.log('✅ CM routes added successfully');
    
} catch (error) {
    console.error('❌ CM routes failed:', error);
    process.exit(1);
}

console.log('Step 5: Testing CM database initialization...');
try {
    const { initializeCMDatabaseCanonical } = require('./api/cm/database-canonical');
    
    async function startServer() {
        await initializeCMDatabaseCanonical();
        console.log('✅ CM database initialized');
        
        const PORT = 3001;
        app.listen(PORT, () => {
            console.log(`🎉 Step-by-step test server running on port ${PORT}`);
            console.log('All components loaded successfully!');
        });
    }
    
    startServer().catch(error => {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ CM database initialization failed:', error);
    process.exit(1);
}