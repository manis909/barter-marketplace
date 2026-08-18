-- Migration: Add admin action tracking to reports table
-- Adds columns to track report status, actions taken by admins, and who took them

ALTER TABLE reports ADD COLUMN status VARCHAR(50) DEFAULT 'open';
ALTER TABLE reports ADD COLUMN admin_action VARCHAR(50);
ALTER TABLE reports ADD COLUMN admin_notes TEXT;
ALTER TABLE reports ADD COLUMN actioned_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN actioned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_admin_action ON reports(admin_action);
