require('dotenv').config({ path: './server/.env' });
const db = require('../models/db');
db.query(`SELECT id, username, email, is_verified FROM users ORDER BY created_at LIMIT 10`)
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })
  .catch(e => { console.error('ERR', e.message); process.exit(1); });