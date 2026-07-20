const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

router.post('/signup', async (req, res) => {
  const { username, email, password, full_name, college } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Generic .edu check — flag with team if you want a stricter per-college rule
  if (!/^[^\s@]+@[^\s@]+\.edu$/.test(email)) {
    return res.status(400).json({ error: 'Must use a valid .edu email' });
  }

  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'Email or username already registered' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash, full_name, college)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, full_name, college`,
    [username, email, hash, full_name || null, college || null]
  );

  const user = result.rows[0];
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({ user, token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      college: user.college
    },
    token
  });
});

module.exports = router;