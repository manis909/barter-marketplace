// server/models/db.js
//
// Shared database connection. Every route file (auth.js, items.js,
// trades.js, chat.js) imports this instead of creating its own
// connection. Do not create a second Pool anywhere else in the app.

const { Pool, types } = require('pg');

// PostgreSQL OID 1114 = TIMESTAMP without time zone.
// Database stores timestamps in UTC (e.g. "2026-07-31 15:44:38.413162").
// Default pg type parser treats OID 1114 strings as LOCAL server time when creating
// a Date object, causing an unintended timezone offset shift when serialized to ISO format.
// This parser ensures timestamp values are preserved as UTC ISO 8601 strings ending with 'Z'.
types.setTypeParser(1114, (val) => {
  if (!val) return null;
  const s = String(val).trim();
  if (/Z$|[+-]\d{2}:?\d{2}$/i.test(s)) return s;
  return s.replace(' ', 'T') + 'Z';
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase's hosted Postgres
});

// Fails loudly on startup if the connection string is bad, instead of
// failing silently on the first query someone runs.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(1);
});

module.exports = {
  // Use this for all queries: db.query('SELECT * FROM users WHERE id = $1', [id])
  query: (text, params) => pool.query(text, params),

  // Exposed in case anyone needs a manual transaction (BEGIN/COMMIT/ROLLBACK)
  getClient: () => pool.connect(),
};