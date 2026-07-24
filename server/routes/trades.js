const express = require("express");
const router = express.Router();

const db = require("../models/db");
const requireAuth = require("../middleware/auth");

// Notification helper — exported by notifications.js for use by other routes.
// Wrapped in try/catch at each call site so a notification failure never
// breaks the main trade operation.
const { createNotification } = require("./notifications");

// Reusable UUID format guard — avoids wasted DB round-trips and cryptic 500s
// when a caller sends a malformed id in a route param.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) {
  return UUID_RE.test(val);
}

// POST /api/trades
// Create a new trade offer
router.post("/", requireAuth, async (req, res) => {
  try {
    const { offered_item_id, requested_item_id, message } = req.body;
    const sender_id = req.userId;

    if (!offered_item_id || !requested_item_id) {
      return res
        .status(400)
        .json({ error: "offered_item_id and requested_item_id are required" });
    }

    // Look up the owner of the requested item to set receiver_id
    const itemResult = await db.query(
      "SELECT owner_id, status FROM items WHERE id = $1",
      [requested_item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: "Requested item not found" });
    }

    const receiver_id = itemResult.rows[0].owner_id;

    if (receiver_id === sender_id) {
      return res
        .status(400)
        .json({ error: "You cannot trade with yourself" });
    }

    // Verify the sender actually owns the item they are offering
    const offeredCheck = await db.query(
      "SELECT owner_id, status FROM items WHERE id = $1",
      [offered_item_id]
    );

    if (offeredCheck.rows.length === 0) {
      return res.status(404).json({ error: "Offered item not found" });
    }

    if (offeredCheck.rows[0].owner_id !== sender_id) {
      return res.status(403).json({ error: "You can only offer items you own" });
    }

    // Both items must be available — reject offers on already-traded/pending items
    if (offeredCheck.rows[0].status !== "available") {
      return res.status(400).json({ error: "Your offered item is no longer available" });
    }

    if (itemResult.rows[0].status !== "available") {
      return res.status(400).json({ error: "The requested item is no longer available" });
    }

    const result = await db.query(
      `INSERT INTO trade_offers
         (sender_id, receiver_id, offered_item_id, requested_item_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sender_id, receiver_id, offered_item_id, requested_item_id, message || null]
    );

    const tradeOffer = result.rows[0];

    // Notify the receiver that a new trade offer has arrived.
    // Fire-and-forget — notification failure must never block the response.
    createNotification(
      receiver_id,
      "trade_offer",
      "New Trade Offer",
      "Someone wants to trade with your item."
    ).catch(err => console.error("Notification error (POST /trades):", err));

    res.status(201).json({
      success: true,
      tradeOffer,
    });
  } catch (err) {
    console.error("POST /trades error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trades/mine
// Get all trades where the current user is sender or receiver
// Must be defined BEFORE /:id so Express doesn't treat "mine" as an :id param
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM trade_offers
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      trades: result.rows,
    });
  } catch (err) {
    console.error("GET /trades/mine error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trades/wishlist
// Get all wishlist items for the current user
router.get("/wishlist", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.id AS wishlist_id, w.created_at AS wishlisted_at,
              i.*
       FROM wishlists w
       JOIN items i ON i.id = w.item_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      wishlist: result.rows,
    });
  } catch (err) {
    console.error("GET /trades/wishlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/trades/wishlist/:itemId
// Add an item to the current user's wishlist
router.post("/wishlist/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const user_id = req.userId;

    if (!isValidUUID(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    // Verify the item exists
    const itemCheck = await db.query(
      "SELECT id FROM items WHERE id = $1",
      [itemId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Insert with ON CONFLICT DO NOTHING to handle the UNIQUE(user_id, item_id) constraint gracefully
    const result = await db.query(
      `INSERT INTO wishlists (user_id, item_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, item_id) DO NOTHING
       RETURNING *`,
      [user_id, itemId]
    );

    if (result.rows.length === 0) {
      // Row already existed — idempotent, still a success
      return res.status(200).json({
        success: true,
        message: "Item already in wishlist",
      });
    }

    res.status(201).json({
      success: true,
      wishlistEntry: result.rows[0],
    });
  } catch (err) {
    console.error("POST /trades/wishlist/:itemId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/trades/wishlist/:itemId
// Remove an item from the current user's wishlist
router.delete("/wishlist/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const user_id = req.userId;

    if (!isValidUUID(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const result = await db.query(
      `DELETE FROM wishlists
       WHERE user_id = $1 AND item_id = $2
       RETURNING *`,
      [user_id, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Wishlist entry not found" });
    }

    res.json({
      success: true,
      message: "Item removed from wishlist",
    });
  } catch (err) {
    console.error("DELETE /trades/wishlist/:itemId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// PATCH /api/trades/:id/complete
// Mark an accepted trade as completed.
// Either the sender or receiver can call this — both parties are present
// at the meetup and either can confirm completion.
// Must be defined BEFORE /:id so Express does not mistake "complete" for an :id value.
router.patch("/:id/complete", requireAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    const trade = await db.query(
      "SELECT * FROM trade_offers WHERE id = $1",
      [req.params.id]
    );

    if (trade.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }

    const t = trade.rows[0];

    // Only participants (sender or receiver) may mark the trade complete
    if (t.sender_id !== req.userId && t.receiver_id !== req.userId) {
      return res.status(403).json({ error: "You are not part of this trade" });
    }

    // Only an accepted trade can be completed
    if (t.status !== "accepted") {
      return res.status(400).json({
        error: "Only an accepted trade can be marked as completed",
      });
    }

    const updated = await db.query(
      `UPDATE trade_offers
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const updatedTrade = updated.rows[0];

    // Notify the other participant that the trade has been completed.
    // Fire-and-forget — notification failure must never block the response.
    const otherUserId = req.userId === t.sender_id ? t.receiver_id : t.sender_id;
    createNotification(
      otherUserId,
      "trade_completed",
      "Trade Completed",
      "A trade you were part of has been marked as completed."
    ).catch(err => console.error("Notification error (PATCH /trades/:id/complete):", err));

    res.json({
      success: true,
      tradeOffer: updatedTrade,
    });
  } catch (err) {
    console.error("PATCH /trades/:id/complete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/trades/:id
// Accept or decline a trade offer (only the receiver can do this)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: "Invalid trade id" });
    }

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use 'accepted' or 'declined'" });
    }

    const trade = await db.query(
      "SELECT * FROM trade_offers WHERE id = $1",
      [req.params.id]
    );

    if (trade.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }

    if (trade.rows[0].receiver_id !== req.userId) {
      return res
        .status(403)
        .json({ error: "Only the receiver can respond to this trade" });
    }

    if (trade.rows[0].status !== "pending") {
      return res
        .status(400)
        .json({ error: "This trade has already been responded to" });
    }

    // Use a transaction so the trade status update and item status updates
    // are atomic — a crash between the two writes can't leave data inconsistent.
    const client = await db.getClient();
    let updatedTrade;
    try {
      await client.query("BEGIN");

      const updatedResult = await client.query(
        `UPDATE trade_offers
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [status, req.params.id]
      );
      updatedTrade = updatedResult.rows[0];

      if (status === "accepted") {
        await client.query(
          `UPDATE items
           SET status = 'traded', updated_at = CURRENT_TIMESTAMP
           WHERE id IN ($1, $2)`,
          [updatedTrade.offered_item_id, updatedTrade.requested_item_id]
        );
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr; // re-throw so the outer catch handles the 500
    } finally {
      client.release();
    }

    // Notify the sender of the outcome — after the DB transaction has committed.
    // Fire-and-forget — notification failure must never block the response.
    if (status === "accepted") {
      createNotification(
        updatedTrade.sender_id,
        "trade_accepted",
        "Trade Accepted",
        "Your trade offer was accepted."
      ).catch(err => console.error("Notification error (accepted):", err));
    } else {
      createNotification(
        updatedTrade.sender_id,
        "trade_declined",
        "Trade Declined",
        "Your trade offer was declined."
      ).catch(err => console.error("Notification error (declined):", err));
    }

    res.json({
      success: true,
      tradeOffer: updatedTrade,
    });
  } catch (err) {
    console.error("PATCH /trades/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
