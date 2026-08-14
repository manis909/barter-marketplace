require('dotenv').config();
const db = require('../models/db');
db.query(`SELECT pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'skill_listings' AND c.contype = 'c'`)
  .then(r => { r.rows.forEach(row => console.log(row.def)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
