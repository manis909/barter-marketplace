// server/models/db.js
//
// Shared database connection. Every route file (auth.js, items.js,
// trades.js, chat.js) imports this instead of creating its own
// connection. Do not create a second Pool anywhere else in the app.

const { Pool } = require('pg');

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