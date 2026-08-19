const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const supabaseAdmin = require('../utils/supabaseAdmin');

const DEMO_BUCKET = 'skill-provider-demo-videos';
const CERTIFICATE_BUCKET = 'skill-provider-certificates';
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 300;
const MAX_CERTIFICATE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska'
]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv']);
const ALLOWED_CERTIFICATE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);
const ALLOWED_CERTIFICATE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO_SIZE_BYTES } });
const certificateUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CERTIFICATE_SIZE_BYTES } });

async function ensureApplicationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_provider_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_name VARCHAR(150) NOT NULL DEFAULT '',
      category VARCHAR(100),
      about_you TEXT,
      skill_description TEXT,
      experience_level VARCHAR(50),
      teaching_mode VARCHAR(50),
      teaching_language VARCHAR(80),
      session_duration VARCHAR(60),
      teaching_description TEXT,
      payout_account_holder_name VARCHAR(150),
      payout_bank_account_number VARCHAR(120),
      payout_ifsc_code VARCHAR(20),
      agreement_accepted BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMPTZ,
      availability TEXT,
      certificate_files JSONB DEFAULT '[]'::jsonb,
      demo_video_path TEXT,
      demo_video_name TEXT,
      demo_video_mime TEXT,
      demo_video_size INTEGER,
      demo_video_duration DOUBLE PRECISION,
      status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'under_review', 'changes_requested', 'rejected', 'approved', 'suspended')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, skill_name)
    )
  `);

  await db.query(`
    ALTER TABLE skill_provider_applications
      ADD COLUMN IF NOT EXISTS certificate_files JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS session_duration VARCHAR(60),
      ADD COLUMN IF NOT EXISTS teaching_description TEXT,
      ADD COLUMN IF NOT EXISTS payout_account_holder_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS payout_bank_account_number VARCHAR(120),
      ADD COLUMN IF NOT EXISTS payout_ifsc_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS demo_video_path TEXT,
      ADD COLUMN IF NOT EXISTS demo_video_name TEXT,
      ADD COLUMN IF NOT EXISTS demo_video_mime TEXT,
      ADD COLUMN IF NOT EXISTS demo_video_size INTEGER,
      ADD COLUMN IF NOT EXISTS demo_video_duration DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS changes_reason TEXT,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_skill_provider_applications_user
    ON skill_provider_applications (user_id, updated_at DESC)
  `);
}

async function ensureBucketsExist() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing Supabase buckets:', listError);
      return;
    }

    const existingNames = buckets.map(b => b.name);

    if (!existingNames.includes(DEMO_BUCKET)) {
      console.log(`Creating bucket: ${DEMO_BUCKET}`);
      await supabaseAdmin.storage.createBucket(DEMO_BUCKET, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024
      });
    }

    if (!existingNames.includes(CERTIFICATE_BUCKET)) {
      console.log(`Creating bucket: ${CERTIFICATE_BUCKET}`);
      await supabaseAdmin.storage.createBucket(CERTIFICATE_BUCKET, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024
      });
    }
  } catch (err) {
    console.error('Failed to ensure buckets exist:', err);
  }
}

function validateVideoMetadata(file) {
  if (!file) {
    throw new Error('A demo video is required.');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_VIDEO_EXTENSIONS.has(extension) && !ALLOWED_VIDEO_TYPES.has(mimeType)) {
    throw new Error('Unsupported video format. Please upload MP4, MOV, or WEBM.');
  }

  if (!ALLOWED_VIDEO_TYPES.has(mimeType) && extension && !ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported video format. Please upload MP4, MOV, or WEBM.');
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error('Video must be 50 MB or smaller.');
  }

  return { extension, mimeType };
}

function getVideoDurationSeconds(fileBuffer, extension) {
  const tempFilePath = path.join(os.tmpdir(), `skill-demo-${Date.now()}-${Math.random().toString(16).slice(2)}${extension || '.tmp'}`);

  try {
    fs.writeFileSync(tempFilePath, fileBuffer);
    const result = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        tempFilePath
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const parsed = Number.parseFloat(String(result || '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) {
    console.warn('ffprobe duration validation unavailable:', error.message);
    return null;
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (clearError) {
      // ignore cleanup errors
    }
  }
}

router.use(async (req, res, next) => {
  try {
    await ensureApplicationTable();
    await ensureBucketsExist();
    next();
  } catch (error) {
    console.error('skillProviderApplications ensureTable error:', error);
    return res.status(500).json({ error: 'Failed to initialize skill provider application storage' });
  }
});

/**
 * Admin-only endpoint to list all skill provider applications.
 * Supports search by applicant name or skill, filter by status.
 * Returns sanitized data (no full bank details, private docs).
 */
router.get('/admin/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search = '', status = '', limit = 50, offset = 0 } = req.query;
    const searchTerm = String(search).trim().toLowerCase();
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    // Build WHERE clause with optional filters
    let whereConditions = ["spa.status != 'draft'"];
    let queryParams = [];

    // Status filter
    if (status) {
      const validStatuses = ['submitted', 'under_review', 'changes_requested', 'rejected', 'approved', 'suspended'];
      if (validStatuses.includes(String(status).toLowerCase())) {
        whereConditions.push(`spa.status = $${queryParams.length + 1}`);
        queryParams.push(String(status).toLowerCase());
      }
    }

    // Search filter (applicant name or skill name)
    if (searchTerm) {
      const searchParam = `%${searchTerm}%`;
      whereConditions.push(`(LOWER(u.full_name) LIKE $${queryParams.length + 1} OR LOWER(spa.skill_name) LIKE $${queryParams.length + 2})`);
      queryParams.push(searchParam, searchParam);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM skill_provider_applications spa
       JOIN users u ON spa.user_id = u.id
       WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get count of under_review applications
    const underReviewResult = await db.query(
      `SELECT COUNT(*) as under_review FROM skill_provider_applications
       WHERE status = 'under_review' AND status != 'draft'`
    );
    const underReviewCount = parseInt(underReviewResult.rows[0]?.under_review || '0');

    // Get paginated list
    const listResult = await db.query(
      `SELECT
        spa.id,
        spa.user_id,
        spa.skill_name,
        spa.category,
        spa.status,
        spa.submitted_at,
        spa.updated_at,
        u.full_name as applicant_name,
        u.id as user_id,
        (spa.demo_video_path IS NOT NULL) as has_demo_video,
        (SELECT COUNT(*) FROM jsonb_array_elements(spa.certificate_files)) as certificate_count,
        spa.experience_level,
        spa.teaching_mode
       FROM skill_provider_applications spa
       JOIN users u ON spa.user_id = u.id
       WHERE ${whereClause}
       ORDER BY spa.submitted_at DESC NULLS LAST, spa.updated_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitNum, offsetNum]
    );

    res.json({
      applications: listResult.rows,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum
      },
      meta: {
        underReviewCount
      }
    });
  } catch (error) {
    console.error('GET /admin/list error:', error);
    res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

/**
 * Admin endpoint to get full application details for review.
 * Returns all application data with sensitive fields masked.
 */
router.get('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT
        spa.*,
        u.full_name,
        u.email,
        u.college,
        u.verification_status,
        u.id_verification_path,
        u.profile_image
       FROM skill_provider_applications spa
       JOIN users u ON spa.user_id = u.id
       WHERE spa.id = $1 AND spa.status != 'draft'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = result.rows[0];

    // Generate signed URLs for demo video if it exists
    let demoVideoUrl = null;
    if (app.demo_video_path) {
      const { data, error } = await supabaseAdmin.storage
        .from(DEMO_BUCKET)
        .createSignedUrl(app.demo_video_path, 3600);
      if (!error && data?.signedUrl) {
        demoVideoUrl = data.signedUrl;
      }
    }

    // Generate signed URLs for certificates
    let certificateUrls = [];
    if (Array.isArray(app.certificate_files) && app.certificate_files.length > 0) {
      for (const cert of app.certificate_files) {
        const { data, error } = await supabaseAdmin.storage
          .from(CERTIFICATE_BUCKET)
          .createSignedUrl(cert.path, 3600);
        if (!error && data?.signedUrl) {
          certificateUrls.push({
            ...cert,
            signedUrl: data.signedUrl
          });
        }
      }
    }

    // Mask payout information (show only last 4 digits)
    const maskedBankAccount = app.payout_bank_account_number
      ? `XXXX XXXX ${app.payout_bank_account_number.slice(-4)}`
      : null;
    const maskedIfsc = app.payout_ifsc_code
      ? `${app.payout_ifsc_code.substring(0, 4)}XXXXXXX`
      : null;

    res.json({
      application: {
        ...app,
        demo_video_url: demoVideoUrl,
        certificates: certificateUrls,
        payout_account_holder_name: app.payout_account_holder_name,
        payout_bank_account: maskedBankAccount,
        payout_ifsc: maskedIfsc,
        // Remove actual sensitive fields
        payout_bank_account_number: undefined,
        payout_ifsc_code: undefined
      }
    });
  } catch (error) {
    console.error('GET /admin/:id error:', error);
    res.status(500).json({ error: 'Failed to retrieve application' });
  }
});

/**
 * Admin endpoint to approve an application.
 */
router.post('/admin/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE skill_provider_applications
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND status = 'under_review'
       RETURNING *`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or not in under_review status' });
    }

    res.json({
      success: true,
      application: result.rows[0],
      message: 'Application approved'
    });
  } catch (error) {
    console.error('POST /admin/:id/approve error:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

/**
 * Admin endpoint to request changes on an application.
 */
router.post('/admin/:id/request-changes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || String(reason).trim().length === 0) {
      return res.status(400).json({ error: 'A reason for changes is required' });
    }

    const result = await db.query(
      `UPDATE skill_provider_applications
       SET status = 'changes_requested',
           changes_reason = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND status = 'under_review'
       RETURNING *`,
      [String(reason).trim(), req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or not in under_review status' });
    }

    res.json({
      success: true,
      application: result.rows[0],
      message: 'Application flagged for changes'
    });
  } catch (error) {
    console.error('POST /admin/:id/request-changes error:', error);
    res.status(500).json({ error: 'Failed to request changes' });
  }
});

/**
 * Admin endpoint to reject an application.
 */
router.post('/admin/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || String(reason).trim().length === 0) {
      return res.status(400).json({ error: 'A reason for rejection is required' });
    }

    const result = await db.query(
      `UPDATE skill_provider_applications
       SET status = 'rejected',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND status = 'under_review'
       RETURNING *`,
      [String(reason).trim(), req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or not in under_review status' });
    }

    res.json({
      success: true,
      application: result.rows[0],
      message: 'Application rejected'
    });
  } catch (error) {
    console.error('POST /admin/:id/reject error:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM skill_provider_applications
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC`,
      [req.userId]
    );

    res.json({ applications: result.rows });
  } catch (error) {
    console.error('GET /skill-provider-applications/mine error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/draft', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const skillName = String(payload.skill_name || '').trim();

    if (!skillName) {
      return res.status(400).json({ error: 'Skill name is required before saving a draft.' });
    }

    const payoutAccountHolderName = String(payload.payout_account_holder_name || '').trim();
    const payoutBankAccountNumber = String(payload.payout_bank_account_number || '').replace(/\s+/g, '').replace(/-/g, '');
    const payoutIfscCode = String(payload.payout_ifsc_code || '').trim().toUpperCase();

    const record = {
      user_id: req.userId,
      skill_name: skillName,
      category: payload.category || null,
      about_you: payload.about_you || null,
      skill_description: payload.skill_description || null,
      experience_level: payload.experience_level || null,
      teaching_mode: payload.teaching_mode || null,
      teaching_language: payload.teaching_language || null,
      session_duration: payload.session_duration || null,
      teaching_description: payload.teaching_description || null,
      payout_account_holder_name: payoutAccountHolderName || null,
      payout_bank_account_number: payoutBankAccountNumber || null,
      payout_ifsc_code: payoutIfscCode || null,
      agreement_accepted: Boolean(payload.agreement_accepted),
      availability: payload.availability || null,
      certificate_files: Array.isArray(payload.certificate_files) ? payload.certificate_files : [],
      status: payload.status || 'draft'
    };

    const result = await db.query(
      `INSERT INTO skill_provider_applications (
        user_id,
        skill_name,
        category,
        about_you,
        skill_description,
        experience_level,
        teaching_mode,
        teaching_language,
        session_duration,
        teaching_description,
        payout_account_holder_name,
        payout_bank_account_number,
        payout_ifsc_code,
        agreement_accepted,
        availability,
        certificate_files,
        status,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (user_id, skill_name)
      DO UPDATE SET
        category = EXCLUDED.category,
        about_you = EXCLUDED.about_you,
        skill_description = EXCLUDED.skill_description,
        experience_level = EXCLUDED.experience_level,
        teaching_mode = EXCLUDED.teaching_mode,
        teaching_language = EXCLUDED.teaching_language,
        session_duration = EXCLUDED.session_duration,
        teaching_description = EXCLUDED.teaching_description,
        payout_account_holder_name = EXCLUDED.payout_account_holder_name,
        payout_bank_account_number = EXCLUDED.payout_bank_account_number,
        payout_ifsc_code = EXCLUDED.payout_ifsc_code,
        agreement_accepted = EXCLUDED.agreement_accepted,
        availability = EXCLUDED.availability,
        certificate_files = EXCLUDED.certificate_files,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        record.user_id,
        record.skill_name,
        record.category,
        record.about_you,
        record.skill_description,
        record.experience_level,
        record.teaching_mode,
        record.teaching_language,
        record.session_duration,
        record.teaching_description,
        record.payout_account_holder_name,
        record.payout_bank_account_number,
        record.payout_ifsc_code,
        record.agreement_accepted,
        record.availability,
        JSON.stringify(record.certificate_files),
        record.status
      ]
    );

    res.status(201).json({ application: result.rows[0] });
  } catch (error) {
    console.error('POST /skill-provider-applications/draft error:', error);
    res.status(500).json({ error: 'Could not save the skill provider draft.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application: result.rows[0] });
  } catch (error) {
    console.error('GET /skill-provider-applications/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/certificates', requireAuth, certificateUpload.array('files', 10), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Please choose at least one certificate or achievement file.' });
    }

    const { rows } = await db.query(
      `SELECT id, user_id, skill_name, certificate_files
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const application = rows[0];
    const existingList = Array.isArray(application.certificate_files) ? application.certificate_files : [];
    if (existingList.length + files.length > 5) {
      return res.status(400).json({ error: 'You can upload up to 5 certificates/proof files.' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const mimeType = (file.mimetype || '').toLowerCase();
      const allowed = ALLOWED_CERTIFICATE_EXTENSIONS.has(extension) || ALLOWED_CERTIFICATE_TYPES.has(mimeType);

      if (!allowed) {
        throw new Error('Unsupported file type. Please upload PDF, JPG, PNG, or WEBP files.');
      }

      const isPdf = extension === '.pdf' || mimeType === 'application/pdf';
      const fileLimit = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

      if (file.size > fileLimit) {
        throw new Error(isPdf ? 'PDF certificates must be 10 MB or smaller.' : 'Image certificates must be 5 MB or smaller.');
      }

      const safeName = (file.originalname || 'certificate').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${req.userId}/${(application.skill_name || 'skill').replace(/[^a-zA-Z0-9._-]/g, '_')}/certificates/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(CERTIFICATE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error('One or more certificate files could not be uploaded.');
      }

      uploadedFiles.push({
        path: filePath,
        name: file.originalname || 'certificate',
        mime: file.mimetype || mimeType,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    }

    const mergedFiles = [...existingList, ...uploadedFiles];

    await db.query(
      `UPDATE skill_provider_applications
       SET certificate_files = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(mergedFiles), req.params.id, req.userId]
    );

    res.status(201).json({ success: true, files: mergedFiles });
  } catch (error) {
    console.error('POST /skill-provider-applications/:id/certificates error:', error);
    res.status(400).json({ error: error.message || 'Certificate upload failed.' });
  }
});

router.delete('/:id/certificates', requireAuth, async (req, res) => {
  try {
    const { file_path } = req.body || {};
    if (!file_path) {
      return res.status(400).json({ error: 'A certificate file is required to remove.' });
    }

    const { rows } = await db.query(
      `SELECT id, user_id, certificate_files
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const application = rows[0];
    const currentFiles = Array.isArray(application.certificate_files) ? application.certificate_files : [];
    const remainingFiles = currentFiles.filter(file => file.path !== file_path);

    if (remainingFiles.length === currentFiles.length) {
      return res.status(404).json({ error: 'Certificate file not found for this application.' });
    }

    await supabaseAdmin.storage.from(CERTIFICATE_BUCKET).remove([file_path]);

    await db.query(
      `UPDATE skill_provider_applications
       SET certificate_files = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(remainingFiles), req.params.id, req.userId]
    );

    res.json({ success: true, files: remainingFiles });
  } catch (error) {
    console.error('DELETE /skill-provider-applications/:id/certificates error:', error);
    res.status(500).json({ error: 'Could not remove the certificate file.' });
  }
});

router.get('/:id/demo-video', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, demo_video_path, demo_video_name, demo_video_mime, demo_video_size, demo_video_duration, user_id
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = rows[0];
    if (!application.demo_video_path) {
      return res.json({ video: null });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(DEMO_BUCKET)
      .createSignedUrl(application.demo_video_path, 3600);

    if (error || !data?.signedUrl) {
      console.error('Signed URL error for demo video:', error);
      return res.status(500).json({ error: 'Failed to load your demo video.' });
    }

    res.json({
      video: {
        id: application.id,
        name: application.demo_video_name,
        mime: application.demo_video_mime,
        size: application.demo_video_size,
        duration: application.demo_video_duration,
        url: data.signedUrl
      }
    });
  } catch (error) {
    console.error('GET /skill-provider-applications/:id/demo-video error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/demo-video', requireAuth, upload.single('demo_video'), async (req, res) => {
  try {
    const file = req.file;
    const { rows } = await db.query(
      `SELECT id, user_id, status, skill_name, demo_video_path
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const application = rows[0];
    const metadata = validateVideoMetadata(file);
    const durationSeconds = getVideoDurationSeconds(file.buffer, metadata.extension);

    if (durationSeconds !== null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error('Demo videos must be 5 minutes or shorter.');
    }

    const filePath = `${req.userId}/${application.skill_name || 'skill-demo'}/${Date.now()}-${(file.originalname || 'demo').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadResult = await supabaseAdmin.storage
      .from(DEMO_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'video/mp4',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadResult.error) {
      console.error('Demo upload error to Supabase:', uploadResult.error);
      return res.status(500).json({
        error: `The video could not be uploaded. Supabase Error: ${uploadResult.error.message || JSON.stringify(uploadResult.error)}`
      });
    }

    if (application.demo_video_path) {
      await supabaseAdmin.storage.from(DEMO_BUCKET).remove([application.demo_video_path]);
    }

    await db.query(
      `UPDATE skill_provider_applications
       SET demo_video_path = $1,
           demo_video_name = $2,
           demo_video_mime = $3,
           demo_video_size = $4,
           demo_video_duration = $5,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7`,
      [
        filePath,
        file.originalname || 'demo-video',
        file.mimetype || metadata.mimeType,
        file.size,
        durationSeconds,
        req.params.id,
        req.userId
      ]
    );

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(DEMO_BUCKET)
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData?.signedUrl) {
      return res.status(500).json({ error: 'Demo uploaded, but a preview could not be generated.' });
    }

    res.status(201).json({
      success: true,
      video: {
        id: application.id,
        name: file.originalname || 'demo-video',
        size: file.size,
        duration: durationSeconds,
        mime: file.mimetype || metadata.mimeType,
        url: signedData.signedUrl,
        path: filePath
      }
    });
  } catch (error) {
    console.error('POST /skill-provider-applications/:id/demo-video error:', error);
    res.status(400).json({ error: error.message || 'Invalid demo video upload.' });
  }
});

router.delete('/:id/demo-video', requireAuth, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    const isAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin;

    const { rows } = await db.query(
      `SELECT demo_video_path, user_id, skill_name, status
       FROM skill_provider_applications
       WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const { demo_video_path, user_id, status } = rows[0];
    const isOwner = user_id === req.userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this demo video.' });
    }

    if (isAdmin && !isOwner && !['approved', 'rejected', 'changes_requested'].includes(status)) {
      return res.status(400).json({ error: 'Admins can only delete the demo video after the application has been reviewed.' });
    }

    if (demo_video_path) {
      await supabaseAdmin.storage.from(DEMO_BUCKET).remove([demo_video_path]);
    }

    await db.query(
      `UPDATE skill_provider_applications
       SET demo_video_path = NULL,
           demo_video_name = NULL,
           demo_video_mime = NULL,
           demo_video_size = NULL,
           demo_video_duration = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /skill-provider-applications/:id/demo-video error:', error);
    res.status(500).json({ error: 'Could not remove the demo video.' });
  }
});

router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { rows: appRows } = await db.query(
      `SELECT *
       FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const application = appRows[0];
    const { rows: userRows } = await db.query(
      `SELECT is_verified
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    const isProfileVerified = Boolean(userRows[0]?.is_verified);
    const missingRequirements = [];

    if (!isProfileVerified) missingRequirements.push('Profile Verification');
    if (!String(application.about_you || '').trim()) missingRequirements.push('About You');
    if (!String(application.skill_name || '').trim()) missingRequirements.push('Your Skill');
    if (!application.demo_video_path) missingRequirements.push('Skill Demonstration');
    if (!String(application.teaching_mode || '').trim() || !String(application.teaching_language || '').trim() || !String(application.session_duration || '').trim() || !String(application.teaching_description || '').trim()) {
      missingRequirements.push('Teaching Details');
    }
    if (!Boolean(req.body?.agreement_accepted) && !Boolean(application.agreement_accepted)) {
      missingRequirements.push('Agreement');
    }

    if (missingRequirements.length > 0) {
      return res.status(400).json({
        error: `Please complete the missing required section: ${missingRequirements[0]}.`
      });
    }

    const { rows: updatedRows } = await db.query(
      `UPDATE skill_provider_applications
       SET agreement_accepted = TRUE,
           submitted_at = NOW(),
           status = 'under_review',
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId]
    );

    res.json({
      success: true,
      application: updatedRows[0],
      message: 'Application submitted'
    });
  } catch (error) {
    console.error('POST /skill-provider-applications/:id/submit error:', error);
    res.status(500).json({ error: 'Could not submit the application.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM skill_provider_applications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ success: true, deletedId: result.rows[0].id });
  } catch (error) {
    console.error('DELETE /skill-provider-applications/:id error:', error);
    res.status(500).json({ error: 'Could not delete the application.' });
  }
});

module.exports = router;
