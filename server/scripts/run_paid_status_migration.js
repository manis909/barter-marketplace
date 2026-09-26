const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('📦 Loading environment...');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '20260827_add_paid_status_to_rental_requests.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Connecting to database...');
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('🚀 Running migration...');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    console.log('');
    console.log('📋 Verification query:');
    const verifyRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'rental_requests_status_check' AND conrelid = 'rental_requests'::regclass
    `);
    
    if (verifyRes.rows.length > 0) {
      console.log('Constraint definition:');
      console.log(verifyRes.rows[0].pg_get_constraintdef);
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();