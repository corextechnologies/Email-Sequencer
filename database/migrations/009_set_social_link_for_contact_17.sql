-- Migration: Set social_link for a specific contact
-- Purpose: Ensure the contact has a LinkedIn URL required for enrichment

BEGIN;

-- Only set if not already present
UPDATE contacts
SET social_link = 'https://www.linkedin.com/in/kamla-safdar-7463a634a/'
WHERE id = 17
  AND (social_link IS NULL OR TRIM(social_link) = '');

COMMIT;


