-- Campaign Emails table migration
-- This stores AI-generated or manually written emails associated with a campaign

CREATE TABLE campaign_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    email_number INTEGER NOT NULL,
    day INTEGER NOT NULL,
    subject TEXT,
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (campaign_id, contact_id, email_number)
);

-- Indexes for performance
CREATE INDEX idx_campaign_emails_campaign_id ON campaign_emails(campaign_id);
CREATE INDEX idx_campaign_emails_contact_id ON campaign_emails(contact_id);
CREATE INDEX idx_campaign_emails_user_id ON campaign_emails(user_id);
CREATE INDEX idx_campaign_emails_email_number ON campaign_emails(campaign_id, email_number);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_campaign_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_emails_updated_at 
    BEFORE UPDATE ON campaign_emails 
    FOR EACH ROW 
    EXECUTE FUNCTION update_campaign_emails_updated_at();

