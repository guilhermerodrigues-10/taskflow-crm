const { Pool } = require('pg');

// Load dotenv only if .env file exists (development)
try {
  require('dotenv').config();
} catch (e) {
  // In production (Docker), ENV vars are already set
}

console.log('🔍 Database Config:');
console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('  DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'taskflow_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s for Supabase pooler
  // Force IPv4 (VPS may not support IPv6)
  family: 4,
  // SSL necessário para Supabase (pooler e direct connection)
  ssl: (process.env.DB_HOST?.includes('supabase.com') || process.env.DB_HOST?.includes('supabase.co'))
    ? { rejectUnauthorized: false }
    : false
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = { pool };
