-- Add sequence progress tracking to campaign_contacts
-- This tracks which email in the sequence should be sent next for each contact

-- Step 1: Drop old constraint first
ALTER TABLE campaign_contacts 
DROP CONSTRAINT IF EXISTS campaign_contacts_status_check;

-- Step 2: Update existing 'sent' status to 'completed' (new status naming)
UPDATE campaign_contacts SET status = 'completed' WHERE status = 'sent';

-- Step 3: Add new constraint with updated status values
ALTER TABLE campaign_contacts
ADD CONSTRAINT campaign_contacts_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'replied', 'unsubscribed', 'failed', 'bounced'));

-- Step 4: Add progress tracking fields
ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS current_email_number INTEGER DEFAULT 1;

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS total_emails INTEGER DEFAULT 1;

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP;

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS next_email_send_at TIMESTAMP;

-- Add constraints for progress fields
ALTER TABLE campaign_contacts
ADD CONSTRAINT check_current_email_number 
CHECK (current_email_number > 0 AND current_email_number <= total_emails + 1);

ALTER TABLE campaign_contacts
ADD CONSTRAINT check_total_emails 
CHECK (total_emails > 0);

-- Create index for efficient worker queries
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_next_send 
ON campaign_contacts(next_email_send_at) 
WHERE next_email_send_at IS NOT NULL;

COMMENT ON COLUMN campaign_contacts.current_email_number IS 'The next email number to send in the sequence (1-based)';
COMMENT ON COLUMN campaign_contacts.total_emails IS 'Total number of emails in this contact''s sequence';
COMMENT ON COLUMN campaign_contacts.last_email_sent_at IS 'When the last email in the sequence was sent';
COMMENT ON COLUMN campaign_contacts.next_email_send_at IS 'When the next email should be sent (calculated from day gaps)';

