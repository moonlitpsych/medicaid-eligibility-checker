// api/_db.js - Fixed for Vercel
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to database');
});

pool.on('error', (err) => {
    console.error('❌ Database error:', err);
});

module.exports = { pool };