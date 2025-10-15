-- Migration: Add simplified campaign fields to existing campaigns table
-- This adds fields for the simplified email workflow without creating new tables

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_body TEXT,
ADD COLUMN IF NOT EXISTS delay_days INTEGER DEFAULT 1 CHECK (delay_days >= 1 AND delay_days <= 30),
ADD COLUMN IF NOT EXISTS repeat_count INTEGER DEFAULT 3 CHECK (repeat_count >= 1 AND repeat_count <= 10);

-- Add comment to document the new workflow
COMMENT ON COLUMN campaigns.email_subject IS 'Email subject template for simplified campaign workflow';
COMMENT ON COLUMN campaigns.email_body IS 'Email body template for simplified campaign workflow';
COMMENT ON COLUMN campaigns.delay_days IS 'Days between emails in simplified workflow (1-30)';
COMMENT ON COLUMN campaigns.repeat_count IS 'Total number of emails to send in simplified workflow (1-10)';
