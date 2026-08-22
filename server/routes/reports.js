const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const db = require("../models/db");
const { createNotification } = require("./notifications");

const ALLOWED_REPORT_REASONS = [
  "Fraud / Scam",
  "Harassment / Abuse",
  "Payment / Transaction Issue",
  "Other",
];

// POST a new report (any authenticated user)
// Accepts optional trade_offer_id (Barter) or skill_booking_id (Skilter) for conversation linking.
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log('REPORT POST RECEIVED', { body: req.body, userId: req.userId });
    const { reported_user_id, reason, description, trade_offer_id = null, skill_booking_id = null } = req.body;
    const reported_by = req.userId;

    if (!reported_user_id) {
      return res.status(400).json({ error: "reported_user_id is required" });
    }

    if (!reason || !ALLOWED_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({
        error: `Invalid report reason. Allowed reasons: ${ALLOWED_REPORT_REASONS.join(', ')}`
      });
    }

    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    if (reason === 'Other' && !cleanDescription) {
      return res.status(400).json({ error: "Description is required when selecting 'Other'." });
    }

    const finalReason = cleanDescription ? `${reason}: ${cleanDescription}` : reason;

    let canonicalTradeOfferId = null;
    if (trade_offer_id) {
      const tradeRes = await db.query(
        "SELECT id FROM trade_offers WHERE id = $1",
        [trade_offer_id]
      );
      canonicalTradeOfferId = tradeRes.rows[0]?.id ?? null;
    }

    let canonicalSkillBookingId = null;
    if (skill_booking_id) {
      const bookingRes = await db.query(
        "SELECT id FROM skill_bookings WHERE id = $1",
        [skill_booking_id]
      );
      canonicalSkillBookingId = bookingRes.rows[0]?.id ?? null;
    }

    console.log('INSERT VALUES:', {
      reported_by,
      reported_user_id,
      reason: finalReason,
      trade_offer_id,
      skill_booking_id,
      canonicalTradeOfferId,
      canonicalSkillBookingId
    });

    const insertRes = await db.query(
      "INSERT INTO reports (reported_by, reported_user_id, reason, trade_offer_id, skill_booking_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, reported_by, reported_user_id, reason, trade_offer_id, skill_booking_id, created_at",
      [reported_by, reported_user_id, finalReason, canonicalTradeOfferId, canonicalSkillBookingId]
    );
    const created = insertRes.rows[0];
    console.log('REPORT INSERTED', created);

    res.status(201).json({ success: true, report: created });
  } catch (error) {
    // If skill_booking_id column doesn't exist yet, fall back to trade_offer_id only
    if (error.message && error.message.includes('column "skill_booking_id" of relation "reports"')) {
      try {
        const { reported_user_id, reason, description, trade_offer_id = null } = req.body;
        const cleanDescription = typeof description === 'string' ? description.trim() : '';
        const finalReason = cleanDescription ? `${reason}: ${cleanDescription}` : reason;

        let canonicalTradeOfferId = null;
        if (trade_offer_id) {
          const tradeRes = await db.query(
            "SELECT id FROM trade_offers WHERE id = $1",
            [trade_offer_id]
          );
          canonicalTradeOfferId = tradeRes.rows[0]?.id ?? null;
        }
        const insertRes = await db.query(
          "INSERT INTO reports (reported_by, reported_user_id, reason, trade_offer_id) VALUES ($1, $2, $3, $4) RETURNING id, reported_by, reported_user_id, reason, trade_offer_id, created_at",
          [req.userId, reported_user_id, finalReason, canonicalTradeOfferId]
        );
        console.log('REPORT INSERTED (fallback)', insertRes.rows[0]);
        return res.status(201).json({ success: true, report: insertRes.rows[0] });
      } catch (fallbackErr) {
        console.error(fallbackErr);
        return res.status(500).json({ message: "Failed to submit report" });
      }
    }
    console.error(error);
    res.status(500).json({ message: "Failed to submit report" });
  }
});

// GET /api/reports/mine — user-scoped reports submitted by the authenticated user
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, trade_offer_id, skill_booking_id, reported_user_id, reason, status, created_at
       FROM reports
       WHERE reported_by = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    console.error("GET /reports/mine error:", error);
    res.status(500).json({ message: "Failed to fetch user reports" });
  }
});

// GET all reports — admin only
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const allowedTypes = ['barter', 'skilter'];
    const reportType = allowedTypes.includes(type) ? type : null;

    const whereClauses = [];
    if (reportType === 'barter') {
      whereClauses.push('r.trade_offer_id IS NOT NULL');
    }
    if (reportType === 'skilter') {
      whereClauses.push('r.skill_booking_id IS NOT NULL');
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         r.id,
         r.reason,
         r.created_at,
         r.trade_offer_id,
         r.skill_booking_id,
         r.reported_by,
         r.reported_user_id,
         reporter.username  AS reporter_username,
         reporter.full_name AS reporter_name,
         reported.username  AS reported_username,
         reported.full_name AS reported_name
       FROM reports r
       JOIN users reporter ON reporter.id = r.reported_by
       JOIN users reported ON reported.id = r.reported_user_id
       ${whereSql}
       ORDER BY r.created_at DESC`
    );
    console.log('ADMIN REPORTS:', { type: reportType || 'all', count: result.rows.length });
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    console.error("GET /reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// GET /api/reports/:id/conversation — admin only
// Returns all messages (Barter or Skilter) linked to this report so the admin
// can inspect the conversation context.
router.get("/:id/conversation", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Look up the report and its linked conversation (Barter or Skilter)
    const reportRes = await db.query(
      `SELECT r.trade_offer_id, r.skill_booking_id, r.reported_by, r.reported_user_id,
              reporter.username AS reporter_username,
              reported.username AS reported_username,
              reported.id AS reported_user_id
       FROM reports r
       JOIN users reporter ON reporter.id = r.reported_by
       JOIN users reported ON reported.id = r.reported_user_id
       WHERE r.id = $1`,
      [id]
    );
    if (reportRes.rows.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }
    const report = reportRes.rows[0];
    console.log('REPORT FETCHED FOR CONVERSATION', { id, report });

    // Handle Barter reports (trade_offer_id)
    if (report.trade_offer_id) {
      const msgRes = await db.query(
        `SELECT m.id, m.sender_id, m.message, m.created_at,
                m.attachment_url, m.attachment_type,
                m.deleted, m.edited,
                u.username AS sender_username
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.trade_offer_id = $1
         ORDER BY m.created_at ASC`,
        [report.trade_offer_id]
      );
      console.log('MESSAGES FETCHED (BARTER)', { reportId: id, tradeOfferId: report.trade_offer_id, count: msgRes.rows.length });
      return res.json({
        success: true,
        hasConversation: true,
        type: 'barter',
        tradeOfferId: report.trade_offer_id,
        reporterUsername: report.reporter_username,
        reportedUsername: report.reported_username,
        reportedUserId: report.reported_user_id,
        messages: msgRes.rows,
      });
    }

    // Handle Skilter reports (skill_booking_id)
    if (report.skill_booking_id) {
      const msgRes = await db.query(
        `SELECT m.id, m.sender_id, m.message, m.created_at,
                u.username AS sender_username
         FROM skill_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.booking_id = $1
         ORDER BY m.created_at ASC`,
        [report.skill_booking_id]
      );
      console.log('MESSAGES FETCHED (SKILTER)', { reportId: id, bookingId: report.skill_booking_id, count: msgRes.rows.length });
      return res.json({
        success: true,
        hasConversation: true,
        type: 'skilter',
        skillBookingId: report.skill_booking_id,
        reporterUsername: report.reporter_username,
        reportedUsername: report.reported_username,
        reportedUserId: report.reported_user_id,
        messages: msgRes.rows,
      });
    }

    // No conversation linked
    return res.json({ success: true, messages: [], hasConversation: false });
  } catch (error) {
    console.error("GET /reports/:id/conversation error:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// PATCH /api/reports/:id — admin only
// Update report status, admin action, and notes
// If an admin action is taken (admin_action is set to non-null), also records who took it and when
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_action, admin_notes } = req.body;
    const adminId = req.userId;

    // Validate status if provided
    const allowedStatuses = ['open', 'under_review', 'actioned', 'dismissed'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` 
      });
    }

    // Validate admin_action if provided (null is allowed)
    const allowedActions = ['warn', 'restrict', 'suspend', 'ban', 'escalate', 'dismiss'];
    if (admin_action !== undefined && admin_action !== null && !allowedActions.includes(admin_action)) {
      return res.status(400).json({ 
        error: `Invalid admin_action. Allowed values: ${allowedActions.join(', ')}, or null` 
      });
    }

    // Check if report exists
    const checkRes = await db.query("SELECT id FROM reports WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Build update object
    const updates = {};
    
    if (status !== undefined) {
      updates.status = status;
    }
    if (admin_action !== undefined) {
      updates.admin_action = admin_action;
    }
    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes;
    }

    // If an actual action is taken, record who did it and when
    if (admin_action !== undefined && admin_action !== null) {
      updates.actioned_by = adminId;
      updates.actioned_at = new Date().toISOString();
    }

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Build parameterized UPDATE query
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = keys.map(key => updates[key]);
    values.push(id);

    const sql = `UPDATE reports SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await db.query(sql, values);
    const updatedReport = result.rows[0];

    const adminActionNotifications = {
      warn: {
        type: 'report_warn',
        title: 'Warning from Admin',
        body: 'An administrator has issued a warning regarding a reported issue. Please review the platform guidelines and follow them to avoid further action.'
      },
      restrict: {
        type: 'report_restrict',
        title: 'Account Restricted',
        body: 'An administrator has restricted your account following a reported issue. Please review the platform guidelines.'
      },
      escalate: {
        type: 'report_escalate',
        title: 'Report Escalated',
        body: 'Your reported account issue has been escalated for further administrative review.'
      },
      suspend: {
        type: 'report_suspend',
        title: 'Account Suspended',
        body: 'Your account has been suspended by an administrator following a reported issue.'
      },
      ban: {
        type: 'report_ban',
        title: 'Account Banned',
        body: 'Your account has been banned by an administrator following a reported issue.'
      }
    };

    if (admin_action && adminActionNotifications[admin_action]) {
  const notificationConfig = adminActionNotifications[admin_action];

  const createdNotification = await createNotification(
    updatedReport.reported_user_id,
    notificationConfig.type,
    notificationConfig.title,
    notificationConfig.body
  );

  console.log("ADMIN NOTIFICATION CREATED:", createdNotification);
}

    console.log('REPORT UPDATED', { id, updates: Object.keys(updates) });
    res.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error("PATCH /reports/:id error:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
});
// GET /api/reports/export — admin only
// Export the full reports history as CSV.
// Add this anywhere before module.exports = router; in reports.js
router.get("/export", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.created_at, reporter.username AS reporter_username,
              reported.username AS reported_username, r.reason,
              r.status, r.admin_action, r.admin_notes,
              actioned.username AS actioned_by_username, r.actioned_at
       FROM reports r
       JOIN users reporter ON reporter.id = r.reported_by
       JOIN users reported ON reported.id = r.reported_user_id
       LEFT JOIN users actioned ON actioned.id = r.actioned_by
       ORDER BY r.created_at DESC`
    );

    const header = 'Date,Reporter,Reported User,Reason,Status,Admin Action,Admin Notes,Actioned By,Actioned At\n';
    const rows = result.rows.map(r => {
      const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      return [
        r.created_at, r.reporter_username, r.reported_username, r.reason,
        r.status, r.admin_action, r.admin_notes, r.actioned_by_username, r.actioned_at
      ].map(escape).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reports_log.csv"');
    res.send(header + rows);
  } catch (error) {
    console.error("GET /reports/export error:", error);
    res.status(500).json({ message: "Failed to export reports" });
  }
});

module.exports = router;