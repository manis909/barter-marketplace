// server/config/pricing.js
//
// Single source of truth for all platform pricing constants.
// ─────────────────────────────────────────────────────────────────────────────
// RULES:
//   1. No rate or price may be hardcoded anywhere else in server code.
//   2. All money amounts are computed on the server, never trusted from clients.
//   3. Always use roundRupees() so commission + payout always sum to fee exactly.
// ─────────────────────────────────────────────────────────────────────────────

// ── Rental ───────────────────────────────────────────────────────────────────

/**
 * Fraction of the rental fee taken as platform commission.
 * Applies to agreed_total_amount (the fee) only — never to the deposit.
 *   commission = roundRupees(fee * RENTAL_COMMISSION_RATE)
 *   owner_payout = fee - commission
 */
const RENTAL_COMMISSION_RATE = 0.10;

/**
 * Fraction of agreed_total_amount held as a refundable security deposit.
 * Commission is NOT charged on the deposit.
 */
const DEPOSIT_RATE = 0.15;

/**
 * How many completed rentals an owner may have before commission applies.
 * Default 0 = commission applies from the very first completed rental.
 * Set > 0 to waive the fee on an owner's first N completed rentals.
 */
const RENTAL_COMMISSION_FREE_RENTALS_PER_OWNER = 0;

// ── Skilter (placeholders — populated in Stage 4) ────────────────────────────

/** Platform fee rate for a tutor with exactly 1 approved listing. */
const SKILTER_FEE_TIER_1 = 0.15;

/** Platform fee rate for a tutor with 2–4 approved listings. */
const SKILTER_FEE_TIER_2_4 = 0.10;

/** Platform fee rate for a tutor on the unlimited monthly plan. */
const SKILTER_FEE_UNLIMITED = 0.05;

/** Monthly price (INR) for the Skilter unlimited listings plan. */
const SKILTER_UNLIMITED_PLAN_PRICE_INR = 149;

// ── Skilter fee tier logic ────────────────────────────────────────────────────

/**
 * Determine the platform fee rate for a tutor at the moment a booking is created.
 *
 * Rules (confirmed Stage 3):
 *   - approvedCount = 0           → throw (block the booking)
 *   - active unlimited plan        → SKILTER_FEE_UNLIMITED (5%)
 *   - approvedCount 2–4            → SKILTER_FEE_TIER_2_4 (10%)
 *   - approvedCount = 1            → SKILTER_FEE_TIER_1 (15%)
 *   - approvedCount ≥ 5, no plan   → SKILTER_FEE_TIER_2_4 (10%)  [plan-lapse fallback]
 *
 * "Approved" = skill_provider_applications.status = 'approved' for this tutor.
 * "Active plan" = tutor_subscriptions with status='active' and
 *   expires_at + 3-day grace > NOW() (3-day grace for slow admin confirmation).
 *
 * @param {object} db   — pg pool (the db module from models/db.js)
 * @param {string} tutorId
 * @returns {{ feeRate: number, approvedCount: number, hasActivePlan: boolean }}
 * @throws  Error if approvedCount === 0
 */
async function getTutorFeeRate(db, tutorId) {
  // Count approved applications for this tutor
  const countRes = await db.query(
    `SELECT COUNT(*)::int AS approved_count
     FROM skill_provider_applications
     WHERE user_id = $1 AND status = 'approved'`,
    [tutorId]
  );
  const approvedCount = countRes.rows[0]?.approved_count ?? 0;

  if (approvedCount === 0) {
    throw Object.assign(
      new Error('You need at least one approved skill application before accepting paid bookings.'),
      { statusCode: 403, code: 'NO_APPROVED_APPLICATIONS' }
    );
  }

  // Check for an active unlimited plan (with 3-day grace window)
  const planRes = await db.query(
    `SELECT 1 FROM tutor_subscriptions
     WHERE tutor_id = $1
       AND status   = 'active'
       AND expires_at + INTERVAL '3 days' > NOW()
     LIMIT 1`,
    [tutorId]
  );
  const hasActivePlan = planRes.rows.length > 0;

  let feeRate;
  if (hasActivePlan) {
    feeRate = SKILTER_FEE_UNLIMITED;       // 5%
  } else if (approvedCount >= 2) {
    feeRate = SKILTER_FEE_TIER_2_4;        // 10% — covers 2-4 AND ≥5 plan-lapse fallback
  } else {
    feeRate = SKILTER_FEE_TIER_1;          // 15% — exactly 1 approved listing
  }

  return { feeRate, approvedCount, hasActivePlan };
}

// ── Shared rounding helper ────────────────────────────────────────────────────

/**
 * Round an amount to the nearest whole rupee.
 *
 * Use this for EVERY money calculation so that commission + payout always
 * add up to the fee exactly:
 *
 *   const commission = roundRupees(fee * rate);   // e.g. 60
 *   const payout     = fee - commission;           // e.g. 540  (exact, no rounding)
 *
 * Never round commission and payout independently — that risks a ±1 rupee gap.
 *
 * @param {number} amount
 * @returns {number} integer rupees
 */
function roundRupees(amount) {
  return Math.round(amount);
}

module.exports = {
  RENTAL_COMMISSION_RATE,
  DEPOSIT_RATE,
  RENTAL_COMMISSION_FREE_RENTALS_PER_OWNER,
  SKILTER_FEE_TIER_1,
  SKILTER_FEE_TIER_2_4,
  SKILTER_FEE_UNLIMITED,
  SKILTER_UNLIMITED_PLAN_PRICE_INR,
  roundRupees,
  getTutorFeeRate,
};
