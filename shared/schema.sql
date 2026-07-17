-- ============================================================
-- BARTER MARKETPLACE DATABASE SCHEMA
-- Database: PostgreSQL (Supabase)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    full_name VARCHAR(100),

    profile_image TEXT,

    college VARCHAR(150),

    bio TEXT,

    rating_average DECIMAL(2,1) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ITEMS
-- ============================================================

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    category VARCHAR(100),

    item_condition VARCHAR(50),

    estimated_value DECIMAL(10,2),

    image_url TEXT,

    status VARCHAR(20) DEFAULT 'available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_owner
        FOREIGN KEY(owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================================
-- WISHLISTS
-- ============================================================

CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    item_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wishlist_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_wishlist_item
        FOREIGN KEY(item_id)
        REFERENCES items(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TRADE OFFERS
-- ============================================================

CREATE TABLE trade_offers (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_id UUID NOT NULL,

    receiver_id UUID NOT NULL,

    offered_item_id UUID NOT NULL,

    requested_item_id UUID NOT NULL,

    message TEXT,

    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sender
        FOREIGN KEY(sender_id)
        REFERENCES users(id),

    CONSTRAINT fk_receiver
        FOREIGN KEY(receiver_id)
        REFERENCES users(id),

    CONSTRAINT fk_offered_item
        FOREIGN KEY(offered_item_id)
        REFERENCES items(id),

    CONSTRAINT fk_requested_item
        FOREIGN KEY(requested_item_id)
        REFERENCES items(id)
);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trade_offer_id UUID NOT NULL,

    sender_id UUID NOT NULL,

    message TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trade_message
        FOREIGN KEY(trade_offer_id)
        REFERENCES trade_offers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_sender
        FOREIGN KEY(sender_id)
        REFERENCES users(id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    title VARCHAR(150),

    body TEXT,

    type VARCHAR(50),

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================================
-- RATINGS
-- ============================================================

CREATE TABLE ratings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trade_offer_id UUID NOT NULL,

    reviewer_id UUID NOT NULL,

    reviewee_id UUID NOT NULL,

    rating INTEGER CHECK (rating BETWEEN 1 AND 5),

    review TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rating_trade
        FOREIGN KEY(trade_offer_id)
        REFERENCES trade_offers(id),

    CONSTRAINT fk_reviewer
        FOREIGN KEY(reviewer_id)
        REFERENCES users(id),

    CONSTRAINT fk_reviewee
        FOREIGN KEY(reviewee_id)
        REFERENCES users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_items_owner
ON items(owner_id);

CREATE INDEX idx_trade_sender
ON trade_offers(sender_id);

CREATE INDEX idx_trade_receiver
ON trade_offers(receiver_id);

CREATE INDEX idx_wishlist_user
ON wishlists(user_id);

CREATE INDEX idx_notification_user
ON notifications(user_id);

CREATE INDEX idx_messages_trade
ON messages(trade_offer_id);