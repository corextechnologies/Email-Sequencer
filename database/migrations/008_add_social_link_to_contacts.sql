-- Add social_link column to contacts table
-- This stores social media profile links (LinkedIn, Twitter, etc.) for contacts

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS social_link VARCHAR(500);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_social_link ON contacts(social_link);

