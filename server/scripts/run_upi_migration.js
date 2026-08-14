/**
 * Runner for: server/migrations/20260813_upi_payment_flow.sql
 * Run once: node scripts/run_upi_migration.js
 * Safe to run multiple times — all DDL uses IF NOT EXISTS / IF EXISTS guards.
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const db   = require('../models/db');

async function run() {
  const sqlPath = path.join(__dirname, '../migrations/20260813_upi_payment_flow.sql');
  const sql     = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration: 20260813_upi_payment_flow.sql …');
  try {
    await db.query(sql);
    console.log('✓ Migration applied successfully.');

    // Verify columns exist
    const check = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'skill_bookings'
        AND column_name IN (
          'payment_screenshot_url',
          'payment_utr',
          'payment_submitted_at',
          'payment_rejection_reason',
          'payment_rejected_at'
        )
      ORDER BY column_name
    `);
    console.log('Columns confirmed:', check.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  }
}

run();
