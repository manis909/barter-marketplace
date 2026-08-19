const db = require('../models/db');

async function requireVerified(req, res, next) {
  try {
    const result = await db.query(
      'SELECT verification_status, verification_rejection_reason FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.verification_status === 'approved') {
      return next();
    }

    const response = {
      error: '',
      verification_status: user.verification_status,
    };

    if (user.verification_status === 'pending') {
      response.error = 'Your verification is currently under review. You can explore the marketplace, but you need to be verified before performing this action.';
    } else if (user.verification_status === 'rejected') {
      response.error = 'Your verification was rejected.';
      if (user.verification_rejection_reason) {
        response.rejection_reason = user.verification_rejection_reason;
      }
    } else {
      response.error = 'Verification required. Please complete your verification before performing this action.';
    }

    return res.status(403).json(response);
  } catch (err) {
    console.error('requireVerified middleware error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = requireVerified;
