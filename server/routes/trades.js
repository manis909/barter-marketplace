const express = require("express");
const router = express.Router();

const db = require("../models/db");
const requireAuth = require("../middleware/auth");
const { createNotification } = require("./notifications");
const supabaseAdmin = require("../utils/supabaseAdmin");
const requireAdmin = require("../middleware/admin");
const multer = require("multer");
const upload = multer();

// ── UUID guard ────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── POST /api/trades ───────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const { offered_item_id, requested_item_id, message } = req.body;
    const sender_id = req.userId;

    if (!offered_item_id || !requested_item_id) {
      return res.status(400).json({ error: "offered_item_id and requested_item_id are required" });
    }
    if (!isValidUUID(offered_item_id) || !isValidUUID(requested_item_id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const duplicateCheck = await db.query(
      `SELECT id FROM trade_offers
       WHERE sender_id = $1 AND offered_item_id = $2 AND requested_item_id = $3 AND status = 'pending'`,
      [sender_id, offered_item_id, requested_item_id]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: "A pending trade offer already exists for these items" });
    }

    const itemResult = await db.query("SELECT owner_id, status FROM items WHERE id = $1", [requested_item_id]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: "Requested item not found" });

    const receiver_id = itemResult.rows[0].owner_id;
    if (receiver_id === sender_id) return res.status(400).json({ error: "You cannot trade with yourself" });

    const offeredCheck = await db.query("SELECT owner_id, status FROM items WHERE id = $1", [offered_item_id]);
    if (offeredCheck.rows.length === 0) return res.status(404).json({ error: "Offered item not found" });
    if (offeredCheck.rows[0].owner_id !== sender_id) return res.status(403).json({ error: "You can only offer items you own" });
    if (offeredCheck.rows[0].status !== "available") return res.status(400).json({ error: "Your offered item is no longer available" });
    if (itemResult.rows[0].status !== "available") return res.status(400).json({ error: "The requested item is no longer available" });

    const result = await db.query(
      `INSERT INTO trade_offers (sender_id, receiver_id, offered_item_id, requested_item_id, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sender_id, receiver_id, offered_item_id, requested_item_id, message || null]
    );
    const tradeOffer = result.rows[0];

    await db.query(
      "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'offer_sent')",
      [tradeOffer.id]
    ).catch(err => console.error("Event logging error (POST /trades):", err));

    createNotification(receiver_id, "trade_offer", "New Trade Offer", "Someone wants to trade with your item.")
      .catch(err => console.error("Notification error (POST /trades):", err));

    try { req.app.get("io")?.to(`user:${receiver_id}`).emit("tradeUpdated", tradeOffer); } catch { }

    res.status(201).json({ success: true, tradeOffer });
  } catch (err) {
    console.error("POST /trades error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/trades/mine ──────────────────────────────────────────────────
// Must be before /:id to avoid Express matching "mine" as an id param.
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*,
              o.title AS offered_item_title,
              o.image_urls AS offered_item_images,
              o.item_condition AS offered_item_condition,
              o.estimated_value AS offered_item_value,
              r.title AS requested_item_title,
              r.id AS requested_item_id,
              r.image_urls AS requested_item_images,
              r.item_condition AS requested_item_condition,
              r.estimated_value AS requested_item_value,
              u_sender.username   AS sender_username,
              u_sender.profile_image AS sender_profile_image,
              u_receiver.username AS receiver_username,
              u_receiver.profile_image AS receiver_profile_image
       FROM trade_offers t
       JOIN items o ON o.id = t.offered_item_id
       JOIN items r ON r.id = t.requested_item_id
       JOIN users u_sender ON u_sender.id = t.sender_id
       JOIN users u_receiver ON u_receiver.id = t.receiver_id
       WHERE t.sender_id = $1 OR t.receiver_id = $1
       ORDER BY t.created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, trades: result.rows });
  } catch (err) {
    console.error("GET /trades/mine error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/trades/wishlist ──────────────────────────────────────────────
// Must be before /:id.
router.get("/wishlist", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.id AS wishlist_id, w.created_at AS wishlisted_at, i.*
       FROM wishlists w
       JOIN items i ON i.id = w.item_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, wishlist: result.rows });
  } catch (err) {
    console.error("GET /trades/wishlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/trades/wishlist/:itemId ─────────────────────────────────────
// Must be before /:id.
router.post("/wishlist/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!isValidUUID(itemId)) return res.status(400).json({ error: "Invalid item id" });

    const itemCheck = await db.query("SELECT id FROM items WHERE id = $1", [itemId]);
    if (itemCheck.rows.length === 0) return res.status(404).json({ error: "Item not found" });

    const result = await db.query(
      `INSERT INTO wishlists (user_id, item_id) VALUES ($1, $2)
       ON CONFLICT (user_id, item_id) DO NOTHING RETURNING *`,
      [req.userId, itemId]
    );
    if (result.rows.length === 0) return res.status(200).json({ success: true, message: "Item already in wishlist" });
    res.status(201).json({ success: true, wishlistEntry: result.rows[0] });
  } catch (err) {
    console.error("POST /trades/wishlist/:itemId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── DELETE /api/trades/wishlist/:itemId ───────────────────────────────────
router.delete("/wishlist/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!isValidUUID(itemId)) return res.status(400).json({ error: "Invalid item id" });

    const result = await db.query(
      "DELETE FROM wishlists WHERE user_id = $1 AND item_id = $2 RETURNING *",
      [req.userId, itemId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Wishlist entry not found" });
    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    console.error("DELETE /trades/wishlist/:itemId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ── GET /api/trades/admin/awaiting-verification ──────────────────────────
// Admin: list all trades awaiting proof verification.
router.get('/admin/awaiting-verification', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.status, t.proof_status,
              t.sender_proof_submitted, t.receiver_proof_submitted,
              t.created_at, t.updated_at,
              u_s.username AS sender_username, u_s.full_name AS sender_name,
              u_r.username AS receiver_username, u_r.full_name AS receiver_name,
              oi.title AS offered_item_title,
              ri.title AS requested_item_title
       FROM trade_offers t
       JOIN users u_s ON u_s.id = t.sender_id
       JOIN users u_r ON u_r.id = t.receiver_id
       JOIN items oi ON oi.id = t.offered_item_id
       JOIN items ri ON ri.id = t.requested_item_id
       WHERE t.status = 'awaiting_admin_verification'
       ORDER BY t.updated_at DESC`
    );
    res.json({ success: true, trades: result.rows });
  } catch (err) {
    console.error('GET /trades/admin/awaiting-verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/trades/:id/proof ────────────────────────────────────────
// Upload proof images to Supabase and record submission flags.
router.post('/:id/proof', requireAuth, upload.array('proof_images'), async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) return res.status(400).json({ error: 'Invalid trade id' });
    const tradeRes = await db.query('SELECT * FROM trade_offers WHERE id = $1', [tradeId]);
    if (tradeRes.rows.length === 0) return res.status(404).json({ error: 'Trade not found' });
    const trade = tradeRes.rows[0];
    if (trade.sender_id !== req.userId && trade.receiver_id !== req.userId) {
      return res.status(403).json({ error: 'You are not part of this trade' });
    }
    // Upload each file to Supabase Storage and track relative paths
    const uploadedPaths = [];
    const uploadedUrls = [];
    for (const file of req.files) {
      const filePath = `${tradeId}/${Date.now()}_${file.originalname}`;
      const { data, error } = await supabaseAdmin.storage.from('trade-proofs').upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(filePath);

      // Generate a short-lived signed URL for the upload response preview
      const { data: signData, error: signError } = await supabaseAdmin.storage
        .from('trade-proofs')
        .createSignedUrl(filePath, 3600);
      if (!signError) {
        uploadedUrls.push(signData.signedUrl);
      }
    }
    // Insert proof records (storing relative path)
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const path of uploadedPaths) {
        await client.query(
          `INSERT INTO trade_proofs (trade_id, user_id, image_path) VALUES ($1, $2, $3)`,
          [tradeId, req.userId, path]
        );
      }
      // Update submission flags
      const isSender = trade.sender_id === req.userId;
      const updateRes = await client.query(
        `UPDATE trade_offers SET ${isSender ? 'sender_proof_submitted' : 'receiver_proof_submitted'} = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [tradeId]
      );
      const updatedTrade = updateRes.rows[0];
      // If both submitted, move to awaiting admin verification
      if (updatedTrade.sender_proof_submitted && updatedTrade.receiver_proof_submitted) {
        await client.query(
          `UPDATE trade_offers SET proof_status = 'awaiting_admin_verification', status = 'awaiting_admin_verification' WHERE id = $1`,
          [tradeId]
        );
      }
      await client.query('COMMIT');
      // Notify parties
      const otherUserId = req.userId === trade.sender_id ? trade.receiver_id : trade.sender_id;
      createNotification(otherUserId, 'trade_proof_submitted', 'Proof Submitted', 'The other party has submitted proof for the trade.')
        .catch(err => console.error('Notification error (proof):', err));
      res.json({ success: true, trade: updatedTrade, uploadedUrls });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /trades/:id/proof error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/trades/:id/proof-status ─────────────────────────────────────
router.get('/:id/proof-status', requireAuth, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) return res.status(400).json({ error: 'Invalid trade id' });
    const tradeRes = await db.query('SELECT sender_proof_submitted, receiver_proof_submitted, proof_status, sender_id, receiver_id FROM trade_offers WHERE id = $1', [tradeId]);
    if (tradeRes.rows.length === 0) return res.status(404).json({ error: 'Trade not found' });
    const trade = tradeRes.rows[0];
    
    // Allow participant OR admin to access proof status
    const adminCheck = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    const isAdmin = adminCheck.rows[0]?.is_admin === true;
    if (req.userId !== trade.sender_id && req.userId !== trade.receiver_id && !isAdmin) {
      return res.status(403).json({ error: 'You are not part of this trade' });
    }

    // Fetch the trade proofs
    const proofsRes = await db.query('SELECT id, user_id, image_path, created_at FROM trade_proofs WHERE trade_id = $1', [tradeId]);
    
    // Generate signed URLs for each proof image
    const proofsWithUrls = await Promise.all(proofsRes.rows.map(async (p) => {
      const { data: signData, error: signError } = await supabaseAdmin.storage
        .from('trade-proofs')
        .createSignedUrl(p.image_path, 3600); // 1 hour expiry
      return {
        id: p.id,
        user_id: p.user_id,
        created_at: p.created_at,
        url: signError ? null : signData.signedUrl
      };
    }));

    res.json({
      success: true,
      proofStatus: {
        sender_proof_submitted: trade.sender_proof_submitted,
        receiver_proof_submitted: trade.receiver_proof_submitted,
        proof_status: trade.proof_status,
        proofs: proofsWithUrls
      }
    });
  } catch (err) {
    console.error('GET /trades/:id/proof-status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/trades/:id/verify ────────────────────────────────────────
// Admin verifies trade after both proofs submitted.
router.patch('/:id/verify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) return res.status(400).json({ error: 'Invalid trade id' });
    const tradeRes = await db.query('SELECT * FROM trade_offers WHERE id = $1', [tradeId]);
    if (tradeRes.rows.length === 0) return res.status(404).json({ error: 'Trade not found' });
    const trade = tradeRes.rows[0];
    if (!trade.sender_proof_submitted || !trade.receiver_proof_submitted) {
      return res.status(400).json({ error: 'Both parties must submit proof before verification' });
    }
    const updatedRes = await db.query(
      `UPDATE trade_offers SET proof_status = 'completed', status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [tradeId]
    );
    const updatedTrade = updatedRes.rows[0];
    // Notify both parties
    createNotification(trade.sender_id, 'trade_verified', 'Trade Completed', 'Admin has verified the trade and marked it as completed.')
      .catch(err => console.error('Notification error (verify):', err));
    createNotification(trade.receiver_id, 'trade_verified', 'Trade Completed', 'Admin has verified the trade and marked it as completed.')
      .catch(err => console.error('Notification error (verify):', err));
    res.json({ success: true, trade: updatedTrade });
  } catch (err) {
    console.error('PATCH /trades/:id/verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/trades/:id/items ─────────────────────────────────────────────
// Returns the full list of offered items for a trade: the original offered_item_id
// PLUS any rows in trade_offer_items with role = 'offered' for this trade.
// Both joined to items for full item details. Must be before /:id.
router.get("/:id/items", requireAuth, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const tradeCheck = await db.query(
      "SELECT sender_id, receiver_id, offered_item_id FROM trade_offers WHERE id = $1",
      [tradeId]
    );
    if (tradeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const t = tradeCheck.rows[0];
    if (t.sender_id !== req.userId && t.receiver_id !== req.userId) {
      return res.status(403).json({ error: "You are not part of this trade" });
    }

    // UNION: original offered_item from trade_offers + extra items from trade_offer_items
    // source = 'original' vs 'extra' so the frontend can render them identically
    const result = await db.query(
      `SELECT i.id, i.title, i.description, i.category, i.item_condition,
              i.estimated_value, i.image_urls, i.status, i.owner_id,
              'original' AS source
       FROM items i
       WHERE i.id = $1

       UNION ALL

       SELECT i.id, i.title, i.description, i.category, i.item_condition,
              i.estimated_value, i.image_urls, i.status, i.owner_id,
              'extra' AS source
       FROM trade_offer_items toi
       JOIN items i ON i.id = toi.item_id
       WHERE toi.trade_id = $2 AND toi.role = 'offered'`,
      [t.offered_item_id, tradeId]
    );

    res.json({ success: true, offeredItems: result.rows });
  } catch (err) {
    console.error("GET /trades/:id/items error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/trades/:id/add-items ────────────────────────────────────────
// Sender adds more items when needs_more_items = true.
// Body: { item_ids: [uuid, ...] }
// Inserts into trade_offer_items (role = 'offered'), resets needs_more_items
// and counter_note, logs offer_updated to trade_events.
// Must be before /:id.
router.post("/:id/add-items", requireAuth, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: "item_ids must be a non-empty array" });
    }
    for (const id of item_ids) {
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: `Invalid item id: ${id}` });
      }
    }

    const tradeRes = await db.query("SELECT * FROM trade_offers WHERE id = $1", [tradeId]);
    if (tradeRes.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const trade = tradeRes.rows[0];

    if (trade.sender_id !== req.userId) {
      return res.status(403).json({ error: "Only the sender can add items to this trade" });
    }
    if (!trade.needs_more_items) {
      return res.status(400).json({ error: "The receiver has not requested more items for this trade" });
    }
    if (trade.status !== "pending") {
      return res.status(400).json({ error: "Can only add items to a pending trade" });
    }

    // Validate each item: must exist, be owned by sender, be available,
    // and not already be in trade_offer_items for this trade
    const existingExtraRes = await db.query(
      "SELECT item_id FROM trade_offer_items WHERE trade_id = $1 AND role = 'offered'",
      [tradeId]
    );
    const alreadyAddedIds = new Set(existingExtraRes.rows.map(r => r.item_id));
    // Also exclude the original offered_item_id
    alreadyAddedIds.add(trade.offered_item_id);

    for (const itemId of item_ids) {
      if (alreadyAddedIds.has(itemId)) {
        return res.status(409).json({ error: `Item ${itemId} is already part of this trade offer` });
      }
      const itemCheck = await db.query(
        "SELECT owner_id, status FROM items WHERE id = $1",
        [itemId]
      );
      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: `Item ${itemId} not found` });
      }
      if (itemCheck.rows[0].owner_id !== req.userId) {
        return res.status(403).json({ error: `You can only offer items you own (item ${itemId})` });
      }
      if (itemCheck.rows[0].status !== "available") {
        return res.status(400).json({ error: `Item ${itemId} is not available` });
      }
    }

    const client = await db.getClient();
    let updatedTrade;
    try {
      await client.query("BEGIN");

      // Insert each new item into trade_offer_items
      for (const itemId of item_ids) {
        await client.query(
          "INSERT INTO trade_offer_items (trade_id, item_id, role) VALUES ($1, $2, 'offered')",
          [tradeId, itemId]
        );
      }

      // Reset needs_more_items and clear counter_note
      const updateRes = await client.query(
        `UPDATE trade_offers
         SET needs_more_items = FALSE, counter_note = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [tradeId]
      );
      updatedTrade = updateRes.rows[0];

      // Log the event
      await client.query(
        "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'offer_updated')",
        [tradeId]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    createNotification(
      trade.receiver_id,
      "trade_offer_updated",
      "Trade Offer Updated",
      "The sender added more items to their trade offer."
    ).catch(err => console.error("Notification error (add-items):", err));

    try {
      req.app.get("io")?.to(`user:${trade.sender_id}`).emit("tradeUpdated", updatedTrade);
      req.app.get("io")?.to(`user:${trade.receiver_id}`).emit("tradeUpdated", updatedTrade);
    } catch { }

    res.status(201).json({ success: true, tradeOffer: updatedTrade });
  } catch (err) {
    console.error("POST /trades/:id/add-items error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/trades/:id ───────────────────────────────────────────────────
// Fetch a single trade. Used by Chat.jsx to check status before
// allowing completion, and by Member 3 trade pages for refreshing state.
router.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: "Invalid trade id" });

    const result = await db.query(
      `SELECT t.*,
              o.title AS offered_item_title,
              o.image_urls AS offered_item_images,
              r.title AS requested_item_title,
              r.image_urls AS requested_item_images,
              u_sender.username AS sender_username,
              u_receiver.username AS receiver_username
       FROM trade_offers t
       JOIN items o ON o.id = t.offered_item_id
       JOIN items r ON r.id = t.requested_item_id
       JOIN users u_sender ON u_sender.id = t.sender_id
       JOIN users u_receiver ON u_receiver.id = t.receiver_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Trade not found" });

    const t = result.rows[0];
    if (t.sender_id !== req.userId && t.receiver_id !== req.userId) {
      return res.status(403).json({ error: "You are not part of this trade" });
    }

    res.json({ success: true, tradeOffer: t });
  } catch (err) {
    console.error("GET /trades/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/trades/:id/cancel — Sender cancels a pending offer ─────────
// Only the sender can cancel, and only while the trade is still pending.
// Sets status to 'cancelled' and restores both items to 'available'.
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: "Invalid trade id" });

    const trade = await db.query("SELECT * FROM trade_offers WHERE id = $1", [req.params.id]);
    if (trade.rows.length === 0) return res.status(404).json({ error: "Trade not found" });

    const t = trade.rows[0];
    if (t.sender_id !== req.userId) {
      return res.status(403).json({ error: "Only the sender can cancel a trade offer" });
    }
    if (t.status !== "pending") {
      return res.status(400).json({
        error: "Only pending trades can be cancelled",
        current_status: t.status,
      });
    }

    const updated = await db.query(
      "UPDATE trade_offers SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    const updatedTrade = updated.rows[0];

    createNotification(t.receiver_id, "trade_cancelled", "Trade Offer Withdrawn", "A trade offer sent to you has been cancelled by the sender.")
      .catch(err => console.error("Notification error (cancel):", err));

    try {
      req.app.get("io")?.to(`user:${t.sender_id}`).emit("tradeUpdated", updatedTrade);
      req.app.get("io")?.to(`user:${t.receiver_id}`).emit("tradeUpdated", updatedTrade);
    } catch {}

    res.json({ success: true, tradeOffer: updatedTrade });
  } catch (err) {
    console.error("PATCH /trades/:id/cancel error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/trades/:id/complete ────────────────────────────────────────
// Mark an accepted trade as completed. Requires status === 'accepted'.
// Must be defined BEFORE /:id to avoid Express matching 'complete' as :id.
// ── GET /api/trades/:id/events ─────────────────────────────────────────────
router.get("/:id/events", requireAuth, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const tradeCheck = await db.query(
      "SELECT sender_id, receiver_id FROM trade_offers WHERE id = $1",
      [tradeId]
    );
    if (tradeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const t = tradeCheck.rows[0];
    if (t.sender_id !== req.userId && t.receiver_id !== req.userId) {
      return res.status(403).json({ error: "You are not part of this trade" });
    }

    const result = await db.query(
      "SELECT * FROM trade_events WHERE trade_id = $1 ORDER BY created_at ASC",
      [tradeId]
    );
    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error("GET /trades/:id/events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/trades/:id/request-more ──────────────────────────────────────
router.patch("/:id/request-more", requireAuth, async (req, res) => {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const { counter_note } = req.body;
    if (!counter_note || typeof counter_note !== "string" || !counter_note.trim()) {
      return res.status(400).json({ error: "counter_note is required and must be a non-empty string" });
    }

    const tradeRes = await db.query("SELECT * FROM trade_offers WHERE id = $1", [tradeId]);
    if (tradeRes.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const trade = tradeRes.rows[0];

    if (trade.receiver_id !== req.userId) {
      return res.status(403).json({ error: "Only the receiver can request more items for this trade" });
    }

    if (trade.status !== "pending") {
      return res.status(400).json({ error: "Can only request more items on a pending trade" });
    }

    const client = await db.getClient();
    let updatedTrade;
    try {
      await client.query("BEGIN");

      const updateRes = await client.query(
        `UPDATE trade_offers
         SET counter_note = $1, needs_more_items = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [counter_note.trim(), tradeId]
      );
      updatedTrade = updateRes.rows[0];

      await client.query(
        "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'requested_more')",
        [tradeId]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    createNotification(
      trade.sender_id,
      "trade_counter",
      "More Items Requested",
      `The receiver requested more items. Message: "${counter_note.trim()}"`
    ).catch(err => console.error("Notification error (request-more):", err));

    try {
      req.app.get("io")?.to(`user:${trade.sender_id}`).emit("tradeUpdated", updatedTrade);
      req.app.get("io")?.to(`user:${trade.receiver_id}`).emit("tradeUpdated", updatedTrade);
    } catch { }

    res.json({ success: true, tradeOffer: updatedTrade });
  } catch (err) {
    console.error("PATCH /trades/:id/request-more error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Shared confirm trade implementation
async function handleConfirmTrade(req, res) {
  try {
    const tradeId = req.params.id;
    if (!isValidUUID(tradeId)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const tradeRes = await db.query("SELECT * FROM trade_offers WHERE id = $1", [tradeId]);
    if (tradeRes.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const t = tradeRes.rows[0];

    const isSender = t.sender_id === req.userId;
    const isReceiver = t.receiver_id === req.userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: "You are not part of this trade" });
    }

    // Updated status check: only allow confirming when awaiting admin verification
    if (t.status !== "awaiting_admin_verification") {
      return res.status(400).json({
        error: "Trade must be awaiting admin verification before users can confirm completion.",
        current_status: t.status,
      });
    }

    let senderConfirmed = t.sender_confirmed;
    let receiverConfirmed = t.receiver_confirmed;

    if (isSender) senderConfirmed = true;
    if (isReceiver) receiverConfirmed = true;

    const isCompletedNow = senderConfirmed && receiverConfirmed;
    const newStatus = isCompletedNow ? "completed" : "accepted";

    const client = await db.getClient();
    let updatedTrade;
    try {
      await client.query("BEGIN");

      const updateRes = await client.query(
        `UPDATE trade_offers
         SET sender_confirmed = $1, receiver_confirmed = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [senderConfirmed, receiverConfirmed, newStatus, tradeId]
      );
      updatedTrade = updateRes.rows[0];

      const alreadyConfirmed = isSender ? t.sender_confirmed : t.receiver_confirmed;
      if (!alreadyConfirmed) {
        await client.query(
          "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'confirm')",
          [tradeId]
        );
      }

      if (isCompletedNow && t.status !== "completed") {
        await client.query(
          "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'completed')",
          [tradeId]
        );
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    const otherUserId = req.userId === t.sender_id ? t.receiver_id : t.sender_id;
    if (isCompletedNow) {
      createNotification(otherUserId, "trade_completed", "Trade Completed", "A trade you were part of has been marked as completed.")
        .catch(err => console.error("Notification error (complete):", err));
    } else {
      const roleName = isSender ? "Sender" : "Receiver";
      createNotification(otherUserId, "trade_confirmed_half", "Trade Completion Confirmed", `${roleName} has confirmed trade completion. Waiting for your confirmation.`)
        .catch(err => console.error("Notification error (confirm-half):", err));
    }

    try {
      req.app.get("io")?.to(`user:${t.sender_id}`).emit("tradeUpdated", updatedTrade);
      req.app.get("io")?.to(`user:${t.receiver_id}`).emit("tradeUpdated", updatedTrade);
    } catch { }

    res.json({ success: true, tradeOffer: updatedTrade });
  } catch (err) {
    console.error("Confirm/Complete trade error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ── PATCH /api/trades/:id/confirm ──────────────────────────────────────────
router.patch("/:id/confirm", requireAuth, handleConfirmTrade);

// ── PATCH /api/trades/:id/complete (legacy alias) ──────────────────────────
router.patch("/:id/complete", requireAuth, handleConfirmTrade);

// ── PATCH /api/trades/:id — Accept or decline ─────────────────────────────
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: "Invalid trade id" });
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use 'accepted' or 'declined'" });
    }

    const trade = await db.query("SELECT * FROM trade_offers WHERE id = $1", [req.params.id]);
    if (trade.rows.length === 0) return res.status(404).json({ error: "Trade not found" });
    if (trade.rows[0].receiver_id !== req.userId) {
      return res.status(403).json({ error: "Only the receiver can respond to this trade" });
    }
    if (trade.rows[0].status !== "pending") {
      return res.status(400).json({ error: "This trade has already been responded to" });
    }

    const client = await db.getClient();
    let updatedTrade;
    let autoDeclinedTrades = [];
    try {
      await client.query("BEGIN");

      const updatedResult = await client.query(
        "UPDATE trade_offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [status, req.params.id]
      );
      updatedTrade = updatedResult.rows[0];

      await client.query(
        "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, $2)",
        [updatedTrade.id, status]
      );

      if (status === "accepted") {
        // Collect extra offered items from trade_offer_items (role = 'offered')
        const extraOfferedRes = await client.query(
          "SELECT item_id FROM trade_offer_items WHERE trade_id = $1 AND role = 'offered'",
          [updatedTrade.id]
        );
        const extraOfferedIds = extraOfferedRes.rows.map(r => r.item_id);

        // Build the full set of item IDs involved in this trade:
        //   offered_item_id  — original offered item (always present, NOT NULL)
        //   requested_item_id — what the receiver gives up
        //   extraOfferedIds  — any additional items the sender added via add-items
        const allInvolvedIds = [
          updatedTrade.offered_item_id,
          updatedTrade.requested_item_id,
          ...extraOfferedIds,
        ];

        // Mark every involved item as 'traded' in one query
        await client.query(
          `UPDATE items SET status = 'traded', updated_at = CURRENT_TIMESTAMP
           WHERE id = ANY($1::uuid[])`,
          [allInvolvedIds]
        );

        // Auto-decline any other pending trade that touches any of these items
        // (either as offered_item_id, requested_item_id, or in trade_offer_items)
        const autoDeclineResult = await client.query(
          `UPDATE trade_offers SET status = 'declined', updated_at = CURRENT_TIMESTAMP
           WHERE id != $1
             AND status = 'pending'
             AND (
               offered_item_id   = ANY($2::uuid[])
               OR requested_item_id = ANY($2::uuid[])
               OR id IN (
                 SELECT trade_id FROM trade_offer_items
                 WHERE item_id = ANY($2::uuid[]) AND role = 'offered'
               )
             )
           RETURNING *`,
          [updatedTrade.id, allInvolvedIds]
        );
        autoDeclinedTrades = autoDeclineResult.rows;

        for (const declined of autoDeclinedTrades) {
          await client.query(
            "INSERT INTO trade_events (trade_id, event_type) VALUES ($1, 'declined')",
            [declined.id]
          );
        }
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    if (status === "accepted") {
      createNotification(updatedTrade.sender_id, "trade_accepted", "Trade Accepted", "Your trade offer was accepted.")
        .catch(err => console.error("Notification error (accepted):", err));
      for (const declined of autoDeclinedTrades) {
        createNotification(declined.sender_id, "trade_declined", "Trade Offer Auto-Declined", "An item in your trade offer was traded in another offer.")
          .catch(err => console.error("Notification error (auto-declined):", err));
      }
    } else {
      createNotification(updatedTrade.sender_id, "trade_declined", "Trade Declined", "Your trade offer was declined.")
        .catch(err => console.error("Notification error (declined):", err));
    }

    try {
      req.app.get("io")?.to(`user:${updatedTrade.sender_id}`).emit("tradeUpdated", updatedTrade);
      req.app.get("io")?.to(`user:${updatedTrade.receiver_id}`).emit("tradeUpdated", updatedTrade);
    } catch { }

    res.json({ success: true, tradeOffer: updatedTrade });
  } catch (err) {
    console.error("PATCH /trades/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
