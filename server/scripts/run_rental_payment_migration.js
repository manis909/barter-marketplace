const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('📦 Loading environment...');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '20260827_add_rental_payment_columns.sql');
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
    
    // Verify the changes
    console.log('📋 Verification query:');
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rental_requests'
      AND column_name LIKE 'payment_%'
      ORDER BY column_name
    `);
    
    console.log('Payment columns in rental_requests:');
    if (columnsRes.rows.length === 0) {
      console.log('   No payment columns found (may already exist)');
    } else {
      columnsRes.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check constraint
    console.log('');
    console.log('Checking status constraint...');
    const constraintRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'rental_requests_status_check' AND conrelid = 'rental_requests'::regclass
    `);
    
    if (constraintRes.rows.length > 0) {
      console.log('Constraint definition:');
      console.log(constraintRes.rows[0].pg_get_constraintdef);
      
      const constraintDef = constraintRes.rows[0].pg_get_constraintdef;
      if (constraintDef.includes("'pending_verification'::text")) {
        console.log('✅ "pending_verification" is in status constraint');
      } else {
        console.log('❌ "pending_verification" NOT found in status constraint');
      }
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