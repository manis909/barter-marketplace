// server/models/initPayoutSchema.js
// Idempotent migration for seller payout details table and payout tracking columns.
const db = require('./db');

async function initPayoutSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS seller_payout_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(30) NOT NULL,
        entity_id UUID NOT NULL,
        upi_id VARCHAR(100) NOT NULL,
        account_holder_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_seller_payout_entity UNIQUE (entity_type, entity_id)
      );
      CREATE INDEX IF NOT EXISTS idx_seller_payout_user ON seller_payout_details(user_id);
      CREATE INDEX IF NOT EXISTS idx_seller_payout_entity ON seller_payout_details(entity_type, entity_id);

      ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payout_status VARCHAR(30) DEFAULT 'unpaid';
      ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payout_sent_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payout_utr VARCHAR(100);
      ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payout_notes TEXT;

      ALTER TABLE skill_bookings ADD COLUMN IF NOT EXISTS payout_status VARCHAR(30) DEFAULT 'unpaid';
      ALTER TABLE skill_bookings ADD COLUMN IF NOT EXISTS payout_sent_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE skill_bookings ADD COLUMN IF NOT EXISTS payout_utr VARCHAR(100);
      ALTER TABLE skill_bookings ADD COLUMN IF NOT EXISTS payout_notes TEXT;
    `);
    console.log('✅ Seller payout schema initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing seller payout schema:', err);
  }
}

module.exports = initPayoutSchema;
