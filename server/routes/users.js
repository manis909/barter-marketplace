const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');

// Current logged-in user — used by AuthContext on page load
router.get('/me', requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT
       u.id, u.username, u.email, u.full_name, u.profile_image, u.college, u.bio, u.created_at, u.is_verified,
       (SELECT COUNT(*) FROM items WHERE owner_id = u.id) AS item_count,
       (SELECT COUNT(*) FROM trade_offers
          WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'completed') AS completed_trades
     FROM users u WHERE u.id = $1`,
    [req.userId]
  );
  res.json({ user: result.rows[0] });
});

router.get('/:id', async (req, res) => {
  const result = await db.query(
    `SELECT
       u.id, u.username, u.full_name, u.profile_image, u.college, u.bio, u.created_at, u.is_verified,
       (SELECT COUNT(*) FROM items WHERE owner_id = u.id) AS item_count,
       (SELECT COUNT(*) FROM trade_offers
          WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'completed') AS completed_trades
     FROM users u WHERE u.id = $1`,
    [req.params.id]
  );
  res.json({ user: result.rows[0] });
});

router.patch('/:id', requireAuth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Cannot edit another user\'s profile' });
  }

  const { username, full_name, profile_image, bio, college } = req.body;

  // If username is being changed, make sure it's not already taken by someone else
  if (username) {
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
  }

  const result = await db.query(
    `UPDATE users
     SET username = COALESCE($1, username),
         full_name = $2,
         profile_image = $3,
         bio = $4,
         college = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING id, username, email, full_name, profile_image, college, bio`,
    [username || null, full_name, profile_image, bio, college, req.params.id]
  );
  res.json({ user: result.rows[0] });
});

// Photo upload — routed through Express using the service role key,
// bypasses RLS since this is already gated by requireAuth (see
// server/utils/supabaseAdmin.js, added by Member 5)
const multer = require('multer');
const supabaseAdmin = require('../utils/supabaseAdmin');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/profile-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.userId;
    const fileExt = req.file.originalname.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('profile-photos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ message: 'Upload failed', error: uploadError.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    await db.query(
      'UPDATE users SET profile_image = $1, updated_at = NOW() WHERE id = $2',
      [publicUrl, userId]
    );

    res.json({ profile_image: publicUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to upload profile photo', error: error.message });
  }
});

// Remove profile photo — resets to the default avatar
router.delete('/profile-photo', requireAuth, async (req, res) => {
  await db.query(
    'UPDATE users SET profile_image = NULL, updated_at = NOW() WHERE id = $1',
    [req.userId]
  );
  res.json({ profile_image: null });
});

// Recent written reviews for a user (up to 3, most recent first)
router.get('/:id/reviews', async (req, res) => {
  const result = await db.query(
    `SELECT r.rating, r.review, r.created_at, u.username AS reviewer_username
     FROM ratings r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.reviewee_id = $1 AND r.review IS NOT NULL AND r.review != ''
     ORDER BY r.created_at DESC
     LIMIT 3`,
    [req.params.id]
  );
  res.json({ reviews: result.rows });
});

module.exports = router;