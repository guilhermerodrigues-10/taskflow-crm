const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  try {
    console.log('🔄 Running migrations...');

    // Run schema migration
    const schema = fs.readFileSync(
      path.join(__dirname, '001_initial_schema.sql'),
      'utf8'
    );
    await pool.query(schema);
    console.log('✅ Schema created successfully');

    // Run seed data
    const seed = fs.readFileSync(
      path.join(__dirname, '002_seed_data.sql'),
      'utf8'
    );
    await pool.query(seed);
    console.log('✅ Seed data inserted successfully');

    console.log('🎉 Migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
