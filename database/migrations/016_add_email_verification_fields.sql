-- Add email verification fields to users table
-- This migration adds support for OTP-based email verification during registration

-- Add email verification fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(255) NULL;

-- Create index for faster verification code lookups (partial index for non-null codes)
CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code) 
WHERE verification_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.verification_code IS 'Hashed 6-digit OTP code used for email verification during registration';
COMMENT ON COLUMN users.verification_expires_at IS 'Expiration timestamp for verification code. Codes expire after 15 minutes.';
COMMENT ON COLUMN users.email_verified IS 'Indicates whether the user email has been verified via OTP';
COMMENT ON COLUMN users.temp_password_hash IS 'Temporary password hash stored during registration until OTP is verified. Moved to password_hash after verification.';

