// server/routes/rentalConfig.js
//
// GET /api/rental-config
//
// Returns public-facing platform rate constants needed by the client listing
// form to show the owner a live fee preview. This endpoint intentionally
// exposes only what the UI needs — no secrets, no internal identifiers.
//
// The client must always fetch this endpoint instead of hardcoding rates.

'use strict';
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  RENTAL_COMMISSION_RATE,
  DEPOSIT_RATE,
} = require('../config/pricing');

// GET /api/rental-config
// Requires auth so anonymous visitors can't scrape our fee structure,
// but any verified or unverified logged-in user can call it.
router.get('/', requireAuth, (req, res) => {
  return res.json({
    rental_commission_rate: RENTAL_COMMISSION_RATE,   // e.g. 0.10
    rental_commission_pct: Math.round(RENTAL_COMMISSION_RATE * 100), // e.g. 10
    deposit_rate: DEPOSIT_RATE,
    deposit_pct: Math.round(DEPOSIT_RATE * 100),
  });
});

module.exports = router;
