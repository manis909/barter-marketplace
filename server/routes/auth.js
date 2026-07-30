const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('../models/db');
const supabaseAdmin = require('../utils/supabaseAdmin');

const upload = multer({ storage: multer.memoryStorage() });
const BUCKET = 'id-verification'; // same private bucket used by verification.js

router.post(
  '/signup',
  upload.fields([{ name: 'id_photo', maxCount: 1 }]),
  async (req, res) => {
    const { username, email, password, full_name, college, hallticket_number } = req.body;
    const idFile = req.files?.id_photo?.[0];

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Password strength: 8+ chars, at least one number, at least one symbol
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one number' });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one symbol' });
    }

    // Generic email format check — no domain restriction (any provider allowed)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Must provide a valid email address' });
    }

    // ID card photo + hall ticket number are both mandatory to sign up
    if (!idFile) {
      return res.status(400).json({ error: 'ID card photo is required' });
    }
    if (!hallticket_number || !hallticket_number.trim()) {
      return res.status(400).json({ error: 'Hall ticket number is required' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create the user first so we have an id to namespace the uploaded ID photo under.
    // NOTE: hallticket_verification_path used to hold a storage path — it's now
    // reused as a plain text column to hold the hall ticket number instead.
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, college, verification_status, hallticket_verification_path)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING id, username, email, full_name, college`,
      [username, email, hash, full_name || null, college || null, hallticket_number.trim()]
    );

    const user = result.rows[0];

    try {
      const idExt = idFile.originalname.split('.').pop();
      const idPath = `${user.id}/id-${Date.now()}.${idExt}`;

      const { error: idUploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(idPath, idFile.buffer, { contentType: idFile.mimetype });

      if (idUploadError) {
        console.error('ID upload error:', idUploadError);
        await db.query('DELETE FROM users WHERE id = $1', [user.id]);
        return res.status(500).json({ error: 'ID upload failed. Please try signing up again.' });
      }

      await db.query(
        `UPDATE users SET id_verification_path = $1 WHERE id = $2`,
        [idPath, user.id]
      );
    } catch (err) {
      console.error(err);
      await db.query('DELETE FROM users WHERE id = $1', [user.id]);
      return res.status(500).json({ error: 'Signup failed during file upload. Please try again.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { ...user, is_verified: false, verification_status: 'pending' },
      token,
    });
  }
);

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(400).json({ error: 'Please sign up first.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Incorrect password. Please try again.' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      college: user.college,
      is_verified: user.is_verified,
      verification_status: user.verification_status
    },
    token
  });
});

module.exports = router;