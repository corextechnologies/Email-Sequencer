-- Create email_opens table for tracking pixel data
CREATE TABLE IF NOT EXISTS email_opens (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_email_opens_campaign_id ON email_opens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_contact_id ON email_opens(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at);

-- Add last_email_opened_at to campaign_contacts
ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMP WITH TIME ZONE;
