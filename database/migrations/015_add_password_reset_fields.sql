-- Add password reset fields to users table
-- This migration adds support for forgot password functionality

-- Add password reset token and expiry fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP NULL;

-- Create index for faster token lookups (partial index for non-null tokens)
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) 
WHERE reset_token IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.reset_token IS 'Hashed password reset token used for password reset functionality';
COMMENT ON COLUMN users.reset_token_expires_at IS 'Expiration timestamp for reset token. Tokens expire after 1 hour.';

