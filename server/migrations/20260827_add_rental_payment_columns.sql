-- Add payment verification columns to rental_requests (matching Skills pattern)
ALTER TABLE rental_requests 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'rejected')),
ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS payment_utr TEXT,
ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;

-- Add 'pending_verification' to rental_requests.status CHECK constraint
ALTER TABLE rental_requests 
DROP CONSTRAINT IF EXISTS rental_requests_status_check;

ALTER TABLE rental_requests 
ADD CONSTRAINT rental_requests_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rented'::text, 'declined'::text, 'returned'::text, 'cancelled'::text, 'paid'::text, 'pending_verification'::text]));