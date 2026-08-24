const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const tables = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('rentals','rental_requests','transactions','items','users')
    ORDER BY table_name, ordinal_position;
  `);

  const byTable = {};
  for (const row of tables.rows) {
    if (!byTable[row.table_name]) byTable[row.table_name] = [];
    byTable[row.table_name].push({
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      default: row.column_default,
    });
  }

  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`\n=== ${table} ===`);
    cols.forEach(c => console.log(`  ${c.column}  ${c.type}${c.nullable === 'NO' ? ' NOT NULL' : ''}${c.default ? ` DEFAULT ${c.default}` : ''}`));
  }

  // Also check constraints/checks on those tables
  const constraints = await pool.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
           pg_get_constraintdef(c.oid) AS definition
    FROM information_schema.table_constraints tc
    JOIN pg_constraint c ON c.conname = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('rentals','rental_requests','transactions')
    ORDER BY tc.table_name;
  `);
  console.log('\n=== CONSTRAINTS ===');
  constraints.rows.forEach(r => console.log(`  ${r.table_name}: ${r.definition}`));

  // Indexes on the rental/transaction tables
  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('rentals','rental_requests','transactions')
    ORDER BY tablename, indexname;
  `);
  console.log('\n=== INDEXES ===');
  indexes.rows.forEach(r => console.log(`  ${r.tablename}: ${r.indexdef}`));

  await pool.end();
}

inspect().catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });