// server/utils/supabaseAdmin.js
//
// Server-side Supabase client using the SERVICE ROLE key — this key
// bypasses RLS entirely, which is fine here because it's never
// exposed to the browser. Only import this in backend route files,
// never in client/ code.

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabaseAdmin;