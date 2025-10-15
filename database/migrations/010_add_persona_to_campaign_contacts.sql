-- Add persona_id column to campaign_contacts table
-- This stores the assigned persona for each contact in a campaign

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_persona_id ON campaign_contacts(persona_id);

COMMENT ON COLUMN campaign_contacts.persona_id IS 'The persona assigned to this contact for targeted messaging in this campaign';

