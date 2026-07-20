const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');

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