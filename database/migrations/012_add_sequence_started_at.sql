-- Migration: Add sequence_started_at to campaign_contacts
-- This field tracks when the email sequence was launched for a contact
-- It's used for calculating future send dates based on day gaps

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS sequence_started_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN campaign_contacts.sequence_started_at IS 'Timestamp when the email sequence was launched for this contact. Used as base for calculating next_email_send_at with day gaps.';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_sequence_started 
ON campaign_contacts(sequence_started_at) 
WHERE sequence_started_at IS NOT NULL;

