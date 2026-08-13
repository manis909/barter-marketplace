/**
 * seed_skill_test_data.js
 * Inserts test skill_listings + skill_bookings using real user IDs.
 * Safe to re-run: skips if listings already exist for teacher.
 *
 * Teacher  : vallitrades  (2da7f002-13f5-4492-97d6-e8fef84e46ca)
 * Learner  : Poojitha     (8d4ccc71-5395-4673-9ec7-09bc861bbfa0)
 *
 * Usage: node scripts/seed_skill_test_data.js
 */
require('dotenv').config();
const db = require('../models/db');

const TEACHER_ID = '2da7f002-13f5-4492-97d6-e8fef84e46ca';
const LEARNER_ID = '8d4ccc71-5395-4673-9ec7-09bc861bbfa0';

async function main() {
  // ── Guard: skip if already seeded ──────────────────────────────────────
  const existing = await db.query(
    'SELECT id FROM skill_listings WHERE teacher_id = $1 LIMIT 1',
    [TEACHER_ID]
  );
  if (existing.rows.length > 0) {
    console.log('✓ Test data already exists — skipping insert.');
    const counts = await db.query('SELECT COUNT(*) FROM skill_listings UNION ALL SELECT COUNT(*) FROM skill_bookings');
    console.log('skill_listings count:', counts.rows[0].count);
    console.log('skill_bookings count:', counts.rows[1].count);
    process.exit(0);
  }

  // ── Insert skill_listings ───────────────────────────────────────────────
  const listing1 = await db.query(
    `INSERT INTO skill_listings
       (teacher_id, skill_name, description, category, price_type, status, session_type, max_participants)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, skill_name`,
    [
      TEACHER_ID,
      'Guitar Basics for Beginners',
      'Learn chord progressions, strumming patterns, and basic music theory.',
      'Music',
      'free',
      'active',
      'group',
      5
    ]
  );
  const listing2 = await db.query(
    `INSERT INTO skill_listings
       (teacher_id, skill_name, description, category, price_type, status, session_type, max_participants)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, skill_name`,
    [
      TEACHER_ID,
      'Python for Data Analysis',
      'Pandas, NumPy, and Matplotlib — hands-on data wrangling.',
      'Technology',
      'negotiable',
      'active',
      'one_on_one',
      1
    ]
  );

  const lid1 = listing1.rows[0].id;
  const lid2 = listing2.rows[0].id;
  console.log('✓ Inserted listings:', listing1.rows[0].skill_name, '/', listing2.rows[0].skill_name);

  // ── Insert skill_bookings (3 rows, different statuses) ─────────────────
  await db.query(
    `INSERT INTO skill_bookings
       (skill_listing_id, requester_id, teacher_id, status, scheduled_time)
     VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '3 days')`,
    [lid1, LEARNER_ID, TEACHER_ID]
  );

  await db.query(
    `INSERT INTO skill_bookings
       (skill_listing_id, requester_id, teacher_id, status, scheduled_time)
     VALUES ($1, $2, $3, 'accepted', NOW() + INTERVAL '7 days')`,
    [lid1, LEARNER_ID, TEACHER_ID]
  );

  await db.query(
    `INSERT INTO skill_bookings
       (skill_listing_id, requester_id, teacher_id, status)
     VALUES ($1, $2, $3, 'completed')`,
    [lid2, LEARNER_ID, TEACHER_ID]
  );

  console.log('✓ Inserted 3 skill_bookings (pending, accepted, completed)');

  // ── Verify ─────────────────────────────────────────────────────────────
  const verify = await db.query(
    `SELECT b.status, sl.skill_name
     FROM skill_bookings b
     JOIN skill_listings sl ON sl.id = b.skill_listing_id
     WHERE b.teacher_id = $1
     ORDER BY b.created_at DESC`,
    [TEACHER_ID]
  );
  console.log('\nVerification — bookings now in DB:');
  verify.rows.forEach(r => console.log(`  [${r.status}] ${r.skill_name}`));

  console.log('\n✅ Done. Log in as vallitrades → My Teaching, or as Poojitha → My Learning.');
  process.exit(0);
}

main().catch(e => { console.error('SEED ERROR:', e.message); process.exit(1); });
