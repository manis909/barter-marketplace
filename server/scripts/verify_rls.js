const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // 1. RLS enabled?
  const rls = await pool.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('rentals','rental_requests','transactions')
    ORDER BY tablename;
  `);
  console.log('\n=== RLS Status ===');
  console.log(JSON.stringify(rls.rows, null, 2));

  // 2. FK indexes exist?
  const idx = await pool.query(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_rental_requests_rental_id',
        'idx_rental_requests_requester_id',
        'idx_transactions_user_id'
      )
    ORDER BY tablename;
  `);
  console.log('\n=== FK Indexes ===');
  console.log(JSON.stringify(idx.rows, null, 2));

  // 3. Tables exist at all?
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('rentals','rental_requests','transactions');
  `);
  console.log('\n=== Tables ===');
  console.log(JSON.stringify(tables.rows, null, 2));

  await pool.end();
}

check().catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
