const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const db = require("../models/db");

// POST a new report (any authenticated user)
// Accepts optional trade_offer_id so chat reports can be linked to a conversation.
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log('REPORT POST RECEIVED', { body: req.body, userId: req.userId });
    console.log('SERVER REPORT BODY:', req.body);
    const { reported_user_id, reason, trade_offer_id = null } = req.body;
    const reported_by = req.userId;

    let canonicalTradeOfferId = null;
    if (trade_offer_id) {
      const tradeRes = await db.query(
        "SELECT id FROM trade_offers WHERE id = $1",
        [trade_offer_id]
      );
      canonicalTradeOfferId = tradeRes.rows[0]?.id ?? null;
    }

    console.log('INSERT VALUES:', {
      reported_by,
      reported_user_id,
      reason,
      trade_offer_id,
      canonicalTradeOfferId
    });

    const insertRes = await db.query(
      "INSERT INTO reports (reported_by, reported_user_id, reason, trade_offer_id) VALUES ($1, $2, $3, $4) RETURNING id, reported_by, reported_user_id, reason, trade_offer_id, created_at",
      [reported_by, reported_user_id, reason, canonicalTradeOfferId]
    );
    const created = insertRes.rows[0];
    console.log('REPORT INSERTED', created);

    res.status(201).json({ success: true, report: created });
  } catch (error) {
    // If trade_offer_id column doesn't exist yet, fall back to the original insert
    if (error.message && error.message.includes('column "trade_offer_id" of relation "reports"')) {
      try {
        const { reported_user_id, reason } = req.body;
        const insertRes = await db.query(
          "INSERT INTO reports (reported_by, reported_user_id, reason) VALUES ($1, $2, $3) RETURNING id, reported_by, reported_user_id, reason, created_at",
          [req.userId, reported_user_id, reason]
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

// GET all reports — admin only
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         r.id,
         r.reason,
         r.created_at,
         r.trade_offer_id,
         r.reported_by,
         r.reported_user_id,
         reporter.username  AS reporter_username,
         reporter.full_name AS reporter_name,
         reported.username  AS reported_username,
         reported.full_name AS reported_name
       FROM reports r
       JOIN users reporter ON reporter.id = r.reported_by
       JOIN users reported ON reported.id = r.reported_user_id
       ORDER BY r.created_at DESC`
    );
    console.log('ADMIN REPORTS:', result.rows.slice(0, 20));
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    console.error("GET /reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// GET /api/reports/:id/conversation — admin only
// Returns all messages for the trade linked to this report so the admin
// can inspect the conversation context.
router.get("/:id/conversation", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Look up the report and its linked trade
    const reportRes = await db.query(
      `SELECT r.trade_offer_id, r.reported_by, r.reported_user_id,
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

    if (!report.trade_offer_id) {
      return res.json({ success: true, messages: [], hasConversation: false });
    }

    // Fetch all messages for the trade, including sender usernames
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
    console.log('MESSAGES FETCHED', { reportId: id, tradeOfferId: report.trade_offer_id, count: msgRes.rows.length });

    res.json({
      success: true,
      hasConversation: true,
      tradeOfferId: report.trade_offer_id,
      reporterUsername: report.reporter_username,
      reportedUsername: report.reported_username,
      reportedUserId: report.reported_user_id,
      messages: msgRes.rows,
    });
  } catch (error) {
    console.error("GET /reports/:id/conversation error:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

module.exports = router;