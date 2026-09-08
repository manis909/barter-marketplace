const fs = require('fs');
const { Client } = require('pg');

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

const sql = fs.readFileSync('migrations/20260831_standardize_rental_bookings.sql', 'utf8');
const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  await client.query(sql);
  console.log('MIGRATION_APPLIED=1');

  const cols = (await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='rental_bookings' ORDER BY ordinal_position")).rows;
  const checks = (await client.query("SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'rental_bookings'::regclass AND contype='c' ORDER BY conname")).rows;
  const triggers = (await client.query("SELECT trigger_name, event_manipulation, action_timing, action_statement FROM information_schema.triggers WHERE event_object_table='rental_bookings' ORDER BY trigger_name")).rows;
  const funcs = (await client.query("SELECT proname, pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND proname='set_rental_bookings_updated_at' ORDER BY proname")).rows;

  console.log('COLUMNS=' + JSON.stringify(cols, null, 2));
  console.log('CHECKS=' + JSON.stringify(checks, null, 2));
  console.log('TRIGGERS=' + JSON.stringify(triggers, null, 2));
  console.log('FUNCTIONS=' + JSON.stringify(funcs, null, 2));

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
