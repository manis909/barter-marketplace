require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const db = require('../models/db');

async function run() {
  const sql = `
    do $$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow authenticated uploads'
      ) then
        create policy "Allow authenticated uploads"
          on storage.objects
          for insert
          to authenticated
          with check (bucket_id = 'item-images');
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow authenticated updates'
      ) then
        create policy "Allow authenticated updates"
          on storage.objects
          for update
          to authenticated
          using (bucket_id = 'item-images');
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow authenticated deletes'
      ) then
        create policy "Allow authenticated deletes"
          on storage.objects
          for delete
          to authenticated
          using (bucket_id = 'item-images');
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow public reads'
      ) then
        create policy "Allow public reads"
          on storage.objects
          for select
          to public
          using (bucket_id = 'item-images');
      end if;
    end
    $$;
  `;

  try {
    await db.query(sql);
    console.log('Storage policies applied successfully.');
  } catch (error) {
    console.log(JSON.stringify({ error: error.message, code: error.code, detail: error.detail }, null, 2));
    process.exitCode = 1;
  }
}

run().finally(() => process.exit(0));
