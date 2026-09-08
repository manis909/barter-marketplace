const fs = require('fs');
const { Client } = require('pg');

const envText = fs.readFileSync('server/.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
  env[key] = val;
}

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const allTables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).rows.map(r => r.table_name);

  const relevant = ['rentals', 'rental_listings', 'rental_bookings', 'rental_disputes', 'rental_condition_proofs', 'rental_messages', 'rental_requests', 'transactions', 'items', 'users'];
  const detailTables = ['rental_listings', 'rental_bookings', 'rental_disputes', 'rental_condition_proofs', 'rental_messages', 'rentals'];

  const report = {
    generatedAt: new Date().toISOString(),
    publicTableCount: allTables.length,
    allTables,
    relevantTableStatus: {},
    schemas: {}
  };

  for (const t of relevant) {
    report.relevantTableStatus[t] = allTables.includes(t) ? 'exists' : 'missing';
    if (allTables.includes(t)) {
      const rowCount = (await client.query(`SELECT COUNT(*) AS c FROM public."${t}"`)).rows[0].c;
      report.relevantTableStatus[t] += `; rows=${rowCount}`;
    }
  }

  for (const t of detailTables) {
    if (!allTables.includes(t)) continue;

    const columns = await client.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [t]
    );

    const fks = await client.query(
      "SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public' AND tc.table_name=$1 ORDER BY kcu.column_name",
      [t]
    );

    report.schemas[t] = {
      columns: columns.rows,
      foreignKeys: fks.rows,
      rowCount: (await client.query(`SELECT COUNT(*) AS c FROM public."${t}"`)).rows[0].c
    };
  }

  fs.writeFileSync('rental_db_report.json', JSON.stringify(report, null, 2));
  console.log('report_written=rental_db_report.json');
  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
