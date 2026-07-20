-- ============================================================
-- BARTER — schema.sql (v3, UUID-based) — FROZEN v1.0
-- Database: PostgreSQL (Supabase)
-- Owner: Member 5 (Infra, Database & Integration Lead)
--
-- This is the database contract. Everyone builds against this
-- version. Any further changes go through Member 5 first —
-- don't run schema changes yourself against the shared DB.
--
-- PENDING DECISION (not yet added, waiting on group meeting):
--   users.department       VARCHAR(100)
--   users.graduation_year  SMALLINT
-- Add these only once Member 1 confirms the Profile form
-- actually collects them. See migration snippet at the bottom
-- of this file for how to add them later without breaking
-- anything already built.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Member 1 — Auth & Profile
-- ------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username        VARCHAR(50)  UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,

    full_name       VARCHAR(100),
    profile_image   TEXT,
    college         VARCHAR(150),
    bio             TEXT,

    coins_balance   INTEGER NOT NULL DEFAULT 0,   -- unused for now — Coins system is deferred
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE, -- soft-delete flag — never hard-delete a user row

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Member 2 — Explore & Item Listing
-- ------------------------------------------------------------
CREATE TABLE items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id         UUID NOT NULL,

    title            VARCHAR(150) NOT NULL,
    description      TEXT,
    category         VARCHAR(100),   -- free text, no fixed taxonomy for MVP

    item_condition   VARCHAR(20)
                     CHECK (item_condition IN ('new', 'like_new', 'good', 'fair', 'poor')),

    estimated_value  DECIMAL(10,2),  -- keep — UI collects this

    image_urls       TEXT[],

    status           VARCHAR(20) NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available', 'pending', 'traded')),

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_owner
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Member 3 — Trade Flow (core feature)
-- ------------------------------------------------------------
CREATE TABLE wishlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id     UUID NOT NULL,
    item_id     UUID NOT NULL,

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wishlist_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_item
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,

    UNIQUE (user_id, item_id)
);

CREATE TABLE trade_offers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_id           UUID NOT NULL,
    receiver_id         UUID NOT NULL,
    offered_item_id     UUID NOT NULL,
    requested_item_id   UUID NOT NULL,

    message             TEXT,

    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sender
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_receiver
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_offered_item
        FOREIGN KEY (offered_item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT fk_requested_item
        FOREIGN KEY (requested_item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Member 4 — Chat & Meetup
-- ------------------------------------------------------------
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trade_offer_id  UUID NOT NULL,
    sender_id       UUID NOT NULL,
    message         TEXT NOT NULL,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trade_message
        FOREIGN KEY (trade_offer_id) REFERENCES trade_offers(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Placeholders (NOT in current sprint scope — empty tables only,
-- no routes/logic built against these yet.)
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id     UUID NOT NULL,
    title       VARCHAR(150),
    body        TEXT,
    type        VARCHAR(50),
    is_read     BOOLEAN DEFAULT FALSE,

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trade_offer_id  UUID,
    reviewer_id     UUID NOT NULL,
    reviewee_id     UUID NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    review          TEXT,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- NOTE: rating_average was intentionally removed from users.
    -- It's derived data — compute it on read instead:
    --   SELECT AVG(rating) FROM ratings WHERE reviewee_id = ?
    -- Never store it as a column that has to be kept in sync.

    CONSTRAINT fk_rating_trade
        FOREIGN KEY (trade_offer_id) REFERENCES trade_offers(id) ON DELETE SET NULL,
    CONSTRAINT fk_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviewee
        FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reports (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reported_by        UUID NOT NULL,
    reported_user_id   UUID NOT NULL,
    reason             TEXT,

    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_report_by
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_user
        FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_items_owner        ON items(owner_id);
CREATE INDEX idx_items_status       ON items(status);
CREATE INDEX idx_trade_sender       ON trade_offers(sender_id);
CREATE INDEX idx_trade_receiver     ON trade_offers(receiver_id);
CREATE INDEX idx_wishlist_user      ON wishlists(user_id);
CREATE INDEX idx_notification_user  ON notifications(user_id);
CREATE INDEX idx_messages_trade     ON messages(trade_offer_id);

-- ============================================================
-- FUTURE MIGRATION — run only after the group meeting confirms
-- Member 1's Profile form will actually collect these fields.
-- Safe to run any time later — pure additive change, nothing
-- else breaks since both columns are nullable.
-- ============================================================
-- ALTER TABLE users ADD COLUMN department VARCHAR(100);
-- ALTER TABLE users ADD COLUMN graduation_year SMALLINT;