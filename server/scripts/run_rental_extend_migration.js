require('dotenv').config({ path: './server/.env' });
const fs = require('fs');
const db = require('../models/db');
const file = process.argv[2] || '20260824_extend_rental_requests.sql';
const sql = fs.readFileSync(__dirname + '/../migrations/' + file, 'utf8');
db.query(sql).then(() => { console.log('MIGRATION_OK ' + file); process.exit(0); }).catch(e => { console.error('MIGRATION_FAILED', e.message); process.exit(1); });