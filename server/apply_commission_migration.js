// server/apply_commission_migration.js
//
// Applies 20260928_add_commission_to_rental_bookings.sql
// and prints a schema inspection so the result can be verified.
//
// Usage (from server/ directory):
//   node apply_commission_migration.js
//
// The script reads DATABASE_URL from .env — no secrets are printed.

'use strict';
const fs = require('fs');
const { Client } = require('pg');

// ── Read .env without importing dotenv (matches existing runner pattern) ──────
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

const SQL_FILE = 'migrations/20260928_add_commission_to_rental_bookings.sql';
const sql = fs.readFileSync(SQL_FILE, 'utf8');

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  console.log('Connected to database (URL redacted).');

  // ── Apply migration ────────────────────────────────────────────────────────
  await client.query(sql);
  console.log('MIGRATION_APPLIED=1');

  // ── Verify: new columns present ───────────────────────────────────────────
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rental_bookings'
    ORDER BY ordinal_position
  `);
  console.log('\nCOLUMNS=' + JSON.stringify(cols.rows, null, 2));

  // ── Verify: new constraints present ───────────────────────────────────────
  const checks = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'rental_bookings'::regclass
      AND contype  = 'c'
    ORDER BY conname
  `);
  console.log('\nCHECKS=' + JSON.stringify(checks.rows, null, 2));

  // ── Spot-check: confirm three specific columns exist ──────────────────────
  const newCols = cols.rows.map(r => r.column_name);
  const required = ['commission_rate', 'commission_amount', 'owner_payout_amount'];
  const missing  = required.filter(c => !newCols.includes(c));
  if (missing.length > 0) {
    throw new Error(`VERIFICATION_FAILED: missing columns: ${missing.join(', ')}`);
  }
  console.log('\nVERIFICATION_PASSED: all three commission columns present.');

  // ── Confirm legacy rows are untouched (all NULL for new columns) ──────────
  const legacyCheck = await client.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE commission_rate    IS NOT NULL) AS has_rate,
           COUNT(*) FILTER (WHERE commission_amount  IS NOT NULL) AS has_commission,
           COUNT(*) FILTER (WHERE owner_payout_amount IS NOT NULL) AS has_payout
    FROM rental_bookings
  `);
  console.log('\nLEGACY_ROW_CHECK=' + JSON.stringify(legacyCheck.rows[0], null, 2));

  await client.end();
  console.log('\nDone.');
})().catch((err) => {
  console.error('MIGRATION_ERROR:', err.message);
  process.exit(1);
});
