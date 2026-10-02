// server/apply_skilter_fee_migration.js
//
// Applies 20260928_add_skilter_fee_columns.sql and prints schema verification.
//
// Usage (from server/ directory):
//   node apply_skilter_fee_migration.js
//
// No secrets are printed.

'use strict';
const fs = require('fs');
const { Client } = require('pg');

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
  env[key] = val;
}

const sql = fs.readFileSync(
  'migrations/20260928_add_skilter_fee_columns.sql', 'utf8'
);

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  console.log('Connected (URL redacted).');

  await client.query(sql);
  console.log('MIGRATION_APPLIED=1');

  // ── Verify skill_bookings new columns ────────────────────────────────────
  const sbCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skill_bookings'
    ORDER BY ordinal_position
  `);
  console.log('\nSKILL_BOOKINGS_COLUMNS=' + JSON.stringify(
    sbCols.rows.map(r => ({ col: r.column_name, type: r.data_type, nullable: r.is_nullable })),
    null, 2
  ));

  // Spot-check new columns present
  const sbNames = sbCols.rows.map(r => r.column_name);
  const required = ['fee_rate', 'fee_amount', 'tutor_payout_amount'];
  const missing  = required.filter(c => !sbNames.includes(c));
  if (missing.length) throw new Error('MISSING COLUMNS: ' + missing.join(', '));
  console.log('\nVERIFICATION_PASSED: fee columns present on skill_bookings.');

  // ── Verify tutor_subscriptions table ─────────────────────────────────────
  const tsCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tutor_subscriptions'
    ORDER BY ordinal_position
  `);
  if (tsCols.rows.length === 0) throw new Error('tutor_subscriptions table NOT FOUND');
  console.log('\nTUTOR_SUBSCRIPTIONS_COLUMNS=' + JSON.stringify(
    tsCols.rows.map(r => ({ col: r.column_name, type: r.data_type })),
    null, 2
  ));
  console.log('\nVERIFICATION_PASSED: tutor_subscriptions table exists.');

  // ── Verify indexes ────────────────────────────────────────────────────────
  const idx = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('skill_bookings', 'tutor_subscriptions')
      AND schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  console.log('\nINDEXES=' + JSON.stringify(idx.rows.map(r => r.indexname)));

  // ── Legacy rows untouched ─────────────────────────────────────────────────
  const legacy = await client.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE fee_rate IS NOT NULL)          AS has_fee_rate,
           COUNT(*) FILTER (WHERE fee_amount IS NOT NULL)        AS has_fee_amount,
           COUNT(*) FILTER (WHERE tutor_payout_amount IS NOT NULL) AS has_payout
    FROM skill_bookings
  `);
  console.log('\nLEGACY_ROW_CHECK=' + JSON.stringify(legacy.rows[0], null, 2));

  await client.end();
  console.log('\nDone.');
})().catch(err => {
  console.error('MIGRATION_ERROR:', err.message);
  process.exit(1);
});
