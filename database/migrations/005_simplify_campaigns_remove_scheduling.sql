-- Migration: Simplify campaigns by removing steps and scheduling functionality
-- This removes all step/sequence related fields and makes campaigns send immediately

-- Add from_email_account_id to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS from_email_account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN campaigns.from_email_account_id IS 'Email account to send emails from for this campaign';

-- First, update any 'scheduled' status to 'pending' before we change the constraint
UPDATE campaign_contacts 
SET status = 'pending' 
WHERE status = 'scheduled';

-- Remove scheduling fields from campaign_contacts
ALTER TABLE campaign_contacts
DROP COLUMN IF EXISTS last_step_index,
DROP COLUMN IF EXISTS next_step_at;

-- Simplify campaign_contact status - update constraint
ALTER TABLE campaign_contacts 
DROP CONSTRAINT IF EXISTS campaign_contacts_status_check;

ALTER TABLE campaign_contacts
ADD CONSTRAINT campaign_contacts_status_check CHECK (status IN ('pending','sent','replied','unsubscribed','failed','bounced'));

COMMENT ON COLUMN campaign_contacts.status IS 'Simplified status: pending (not sent), sent (delivered), replied, unsubscribed, failed, bounced';

-- Remove delay_days and repeat_count from campaigns (no longer needed)
ALTER TABLE campaigns
DROP COLUMN IF EXISTS delay_days,
DROP COLUMN IF EXISTS repeat_count;

-- Optional: Drop sequence_steps table if you want to completely remove it
-- For now, we'll keep it for backwards compatibility but it won't be used
-- DROP TABLE IF EXISTS sequence_steps CASCADE;

COMMENT ON TABLE campaigns IS 'Simplified campaigns - emails send immediately on launch with no scheduling';

