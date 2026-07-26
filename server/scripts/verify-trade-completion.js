require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const https = require('http');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const res = await pool.query(
      `SELECT id, sender_id, receiver_id, status, offered_item_id, requested_item_id FROM trade_offers WHERE status = 'accepted' LIMIT 1`
    );
    const trade = res.rows[0];
    console.log('TRADE', trade);
    if (!trade) {
      console.error('No accepted trade found');
      process.exit(1);
    }
    const token = jwt.sign({ userId: trade.receiver_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('TOKEN', token);

    const opts = {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/trades/${trade.id}/complete`,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });

      req.on('error', reject);
      req.end();
    });

    console.log('STATUS', response.statusCode);
    console.log('BODY', response.body);

    const verify = await pool.query(
      `SELECT id, status, updated_at FROM trade_offers WHERE id = $1`,
      [trade.id]
    );
    console.log('DB VERIFY', JSON.stringify(verify.rows[0], null, 2));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
