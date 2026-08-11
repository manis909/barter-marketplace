require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const users = await pool.query('SELECT id, username, is_admin FROM users LIMIT 5');
    console.log('USERS:', users.rows);

    const trades = await pool.query(
      'SELECT id, sender_id, receiver_id, status, sender_proof_submitted, receiver_proof_submitted, proof_status FROM trade_offers LIMIT 5'
    );
    console.log('TRADES:', trades.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
})();
