-- Add 'paid' status to rental_requests.status CHECK constraint
ALTER TABLE rental_requests 
DROP CONSTRAINT rental_requests_status_check;

ALTER TABLE rental_requests 
ADD CONSTRAINT rental_requests_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rented'::text, 'declined'::text, 'returned'::text, 'cancelled'::text, 'paid'::text]));