require('dotenv').config({ path: './.env' });
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const users = await client.query(`
      SELECT id, username, email, verification_status, is_verified
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const listings = await client.query(`
      SELECT id, owner_id, item_name, rate_type, rate_amount, status
      FROM rental_listings
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(JSON.stringify({ users: users.rows, listings: listings.rows }, null, 2));
  } catch (err) {
    console.error(err.stack || err.message || String(err));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
