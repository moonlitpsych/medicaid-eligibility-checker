// api/_db.js - Non-fatal database connection for Vercel
const { Pool } = require('pg');

let pool = null;

// Only create pool if DATABASE_URL is properly configured
if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://user:pass@host:5432/database') {
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        // Test connection
        pool.on('connect', () => {
            console.log('✅ Connected to database');
        });

        pool.on('error', (err) => {
            console.error('❌ Database error (non-fatal):', err.message);
            pool = null; // Disable pool on error
        });
    } catch (error) {
        console.log('⚠️ Database initialization failed (continuing without logging):', error.message);
        pool = null;
    }
} else {
    console.log('⚠️ DATABASE_URL not configured (continuing without database logging)');
}

module.exports = { pool };