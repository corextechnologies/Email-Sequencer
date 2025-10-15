-- Remove timezone and send window fields from campaigns table
-- These fields are no longer needed as we're simplifying email scheduling

ALTER TABLE campaigns 
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS send_window_start,
DROP COLUMN IF EXISTS send_window_end;

