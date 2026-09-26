const fs = require('fs');
const { Client } = require('pg');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(line => !line.trim().startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')];
    })
);
const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  for (const t of ['rental_listings', 'rental_bookings', 'rental_disputes']) {
    const cols = (await client.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [t]
    )).rows;
    console.log('TABLE=' + t);
    console.log(JSON.stringify(cols, null, 2));
  }
  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
