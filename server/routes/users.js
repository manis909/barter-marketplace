const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const multer = require('multer');
const supabaseAdmin = require('../utils/supabaseAdmin');
const upload = multer({ storage: multer.memoryStorage() });

// Current logged-in user — used by AuthContext on page load
router.get('/me', requireAuth, async (req, res) => {
  const result = await db.query(
    'SELECT id, username, email, full_name, profile_image, college, bio FROM users WHERE id = $1',
    [req.userId]
  );
  res.json({ user: result.rows[0] });
});

router.get('/:id', async (req, res) => {
  const result = await db.query(
    'SELECT id, username, full_name, profile_image, college, bio FROM users WHERE id = $1',
    [req.params.id]
  );
  res.json({ user: result.rows[0] });
});

router.patch('/:id', requireAuth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Cannot edit another user\'s profile' });
  }

  const { full_name, profile_image, bio, college } = req.body;
  const result = await db.query(
    `UPDATE users
     SET full_name = $1, profile_image = $2, bio = $3, college = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, username, email, full_name, profile_image, college, bio`,
    [full_name, profile_image, bio, college, req.params.id]
  );
  res.json({ user: result.rows[0] });
});

module.exports = router;
router.post('/profile-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Supabase storage client is not configured' });
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