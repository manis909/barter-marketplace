/**
 * Migration: create feedback table
 * Safe to re-run — uses IF NOT EXISTS throughout.
 * Run: node scripts/create_feedback_table.js
 */
require('dotenv').config();
const db = require('../models/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
        rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
        category      TEXT,
        message       TEXT        NOT NULL,
        is_anonymous  BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('feedback table created (or already existed).');

    // Confirm schema
    const cols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', cols.rows.map(c => `${c.column_name}:${c.data_type}`).join(', '));

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

run();
