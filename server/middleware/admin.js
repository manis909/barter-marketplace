// server/middleware/admin.js

const db = require('../models/db');

/**
 * Middleware that ensures the requester is an admin.
 * Assumes a boolean column `is_admin` on the `users` table.
 */
async function requireAdmin(req, res, next) {
  try {
    const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = requireAdmin;
