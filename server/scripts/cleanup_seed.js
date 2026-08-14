require('dotenv').config();
const db = require('../models/db');
const TEACHER_ID = '2da7f002-13f5-4492-97d6-e8fef84e46ca';
db.query('DELETE FROM skill_listings WHERE teacher_id = $1', [TEACHER_ID])
  .then(r => { console.log('Deleted', r.rowCount, 'listing(s)'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
