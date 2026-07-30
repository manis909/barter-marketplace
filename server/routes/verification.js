const express = require('express');
const router = express.Router();
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const db = require('../models/db');
const supabaseAdmin = require('../utils/supabaseAdmin');

const upload = multer({ storage: multer.memoryStorage() });
const BUCKET = 'id-verification'; // PRIVATE bucket — confirm name with Member 5

// Checks the logged-in user has is_admin = true before allowing access
async function requireAdmin(req, res, next) {
  const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
  if (!result.rows[0]?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ---- User: submit ID + Hall Ticket for verification ----
router.post(
  '/submit',
  requireAuth,
  upload.fields([{ name: 'id_photo', maxCount: 1 }, { name: 'hallticket_photo', maxCount: 1 }]),
  async (req, res) => {
    try {
      const idFile = req.files?.id_photo?.[0];
      const hallTicketFile = req.files?.hallticket_photo?.[0];

      if (!idFile || !hallTicketFile) {
        return res.status(400).json({ error: 'Both ID card and hall ticket photos are required' });
      }

      const userId = req.userId;
      const idExt = idFile.originalname.split('.').pop();
      const hallTicketExt = hallTicketFile.originalname.split('.').pop();
      const idPath = `${userId}/id-${Date.now()}.${idExt}`;
      const hallTicketPath = `${userId}/hallticket-${Date.now()}.${hallTicketExt}`;

      const { error: idUploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(idPath, idFile.buffer, { contentType: idFile.mimetype });

      if (idUploadError) {
        console.error('ID upload error:', idUploadError);
        return res.status(500).json({ error: 'ID upload failed' });
      }

      const { error: hallTicketUploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(hallTicketPath, hallTicketFile.buffer, { contentType: hallTicketFile.mimetype });

      if (hallTicketUploadError) {
        console.error('Hall ticket upload error:', hallTicketUploadError);
        // Clean up the ID photo since we can't proceed with only one file
        await supabaseAdmin.storage.from(BUCKET).remove([idPath]);
        return res.status(500).json({ error: 'Hall ticket upload failed' });
      }

      await db.query(
        `UPDATE users
         SET verification_status = 'pending',
             id_verification_path = $1,
             hallticket_verification_path = $2,
             verification_rejection_reason = NULL
         WHERE id = $3`,
        [idPath, hallTicketPath, userId]
      );

      res.json({ status: 'pending' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Submission failed' });
    }
  }
);

// ---- User: check their own verification status ----
router.get('/status', requireAuth, async (req, res) => {
  const result = await db.query(
    'SELECT is_verified, verification_status, verification_rejection_reason FROM users WHERE id = $1',
    [req.userId]
  );
  res.json(result.rows[0]);
});

// ---- Admin: list all pending submissions with temporary signed view URLs ----
router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  const result = await db.query(
    `SELECT id, username, full_name, id_verification_path, hallticket_verification_path
     FROM users WHERE verification_status = 'pending'`
  );

  const withUrls = await Promise.all(result.rows.map(async (u) => {
    const { data: idData, error: idError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(u.id_verification_path, 300);

    const { data: hallTicketData, error: hallTicketError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(u.hallticket_verification_path, 300);

    return {
      ...u,
      id_signed_url: idError ? null : idData.signedUrl,
      hallticket_signed_url: hallTicketError ? null : hallTicketData.signedUrl,
    };
  }));

  res.json({ pending: withUrls });
});

// ---- Admin: approve — deletes the image immediately, sets verified ----
router.post('/:userId/approve', requireAuth, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  const result = await db.query(
    'SELECT id_verification_path, hallticket_verification_path FROM users WHERE id = $1',
    [userId]
  );
  const { id_verification_path, hallticket_verification_path } = result.rows[0] || {};
  const pathsToRemove = [id_verification_path, hallticket_verification_path].filter(Boolean);

  if (pathsToRemove.length > 0) {
    await supabaseAdmin.storage.from(BUCKET).remove(pathsToRemove);
  }

  await db.query(
    `UPDATE users
     SET is_verified = TRUE, verification_status = 'approved',
         id_verification_path = NULL, hallticket_verification_path = NULL,
         verification_rejection_reason = NULL
     WHERE id = $1`,
    [userId]
  );

  await db.query(
    `INSERT INTO verification_logs (user_id, reviewed_by, decision, reason)
     VALUES ($1, $2, 'approved', NULL)`,
    [userId, req.userId]
  );

  res.json({ status: 'approved' });
});

// ---- Admin: reject — requires a reason, also deletes the image ----
router.post('/:userId/reject', requireAuth, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required' });
  }

  const result = await db.query(
    'SELECT id_verification_path, hallticket_verification_path FROM users WHERE id = $1',
    [userId]
  );
  const { id_verification_path, hallticket_verification_path } = result.rows[0] || {};
  const pathsToRemove = [id_verification_path, hallticket_verification_path].filter(Boolean);

  if (pathsToRemove.length > 0) {
    await supabaseAdmin.storage.from(BUCKET).remove(pathsToRemove);
  }

  await db.query(
    `UPDATE users
     SET is_verified = FALSE, verification_status = 'rejected',
         id_verification_path = NULL, hallticket_verification_path = NULL,
         verification_rejection_reason = $1
     WHERE id = $2`,
    [reason.trim(), userId]
  );

  await db.query(
    `INSERT INTO verification_logs (user_id, reviewed_by, decision, reason)
     VALUES ($1, $2, 'rejected', $3)`,
    [userId, req.userId, reason.trim()]
  );

  res.json({ status: 'rejected' });
});

// ---- Admin: export the full verification audit trail as CSV ----
router.get('/logs/export', requireAuth, requireAdmin, async (req, res) => {
  const result = await db.query(
    `SELECT
       vl.created_at, u.username, u.full_name, vl.decision, vl.reason, admin.username AS reviewed_by
     FROM verification_logs vl
     JOIN users u ON u.id = vl.user_id
     JOIN users admin ON admin.id = vl.reviewed_by
     ORDER BY vl.created_at DESC`
  );

  const header = 'Date,Username,Full Name,Decision,Reason,Reviewed By\n';
  const rows = result.rows.map(r => {
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    return [
      r.created_at, r.username, r.full_name, r.decision, r.reason, r.reviewed_by
    ].map(escape).join(',');
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="verification_log.csv"');
  res.send(header + rows);
});

module.exports = router;