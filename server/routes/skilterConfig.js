// server/routes/skilterConfig.js
//
// GET /api/skilter-config
// Returns platform fee tier rates + plan price for the client listing form.
// Requires auth (any logged-in user) so rates aren't publicly scrapable.

'use strict';
const express  = require('express');
const router   = express.Router();
const requireAuth = require('../middleware/auth');
const {
  SKILTER_FEE_TIER_1,
  SKILTER_FEE_TIER_2_4,
  SKILTER_FEE_UNLIMITED,
  SKILTER_UNLIMITED_PLAN_PRICE_INR,
} = require('../config/pricing');

router.get('/', requireAuth, (req, res) => {
  return res.json({
    tiers: [
      { approved_listings: 1,    fee_rate: SKILTER_FEE_TIER_1,    fee_pct: Math.round(SKILTER_FEE_TIER_1 * 100) },
      { approved_listings: '2-4', fee_rate: SKILTER_FEE_TIER_2_4, fee_pct: Math.round(SKILTER_FEE_TIER_2_4 * 100) },
      { approved_listings: '5+', fee_rate: SKILTER_FEE_TIER_2_4,  fee_pct: Math.round(SKILTER_FEE_TIER_2_4 * 100), note: 'plan-lapse fallback' },
    ],
    unlimited_plan: {
      fee_rate: SKILTER_FEE_UNLIMITED,
      fee_pct: Math.round(SKILTER_FEE_UNLIMITED * 100),
      price_inr: SKILTER_UNLIMITED_PLAN_PRICE_INR,
    },
  });
});

module.exports = router;
