"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const connection_1 = require("../database/connection");
const jwt_1 = require("../utils/jwt");
const transactionalEmailService_1 = require("./transactionalEmailService");
class AuthService {
    static async register(userData) {
        const { email, password } = userData;
        // Check if user already exists
        const existingUser = await connection_1.Database.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            throw new Error('User with this email already exists');
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await connection_1.Database.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at', [email, passwordHash]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jwt_1.JwtHelper.generateToken({
            userId: user.id,
            email: user.email
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.created_at
            },
            token
        };
    }
    static async login(credentials) {
        const { email, password } = credentials;
        // Find user
        const result = await connection_1.Database.query('SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw new Error('Invalid email or password');
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT token
        const token = jwt_1.JwtHelper.generateToken({
            userId: user.id,
            email: user.email
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            token
        };
    }
    static async getUserById(userId) {
        const result = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    static async getUserByEmail(email) {
        const result = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    /**
     * Request password reset - generates token and sends email
     *
     * Security: Always returns success to prevent email enumeration attacks.
     * If email doesn't exist, we still return success but don't send email.
     *
     * @param email - User's email address
     * @returns Promise that resolves when email is sent (or would be sent)
     */
    static async requestPasswordReset(email) {
        // Find user by email
        const result = await connection_1.Database.query('SELECT id, email FROM users WHERE email = $1', [email]);
        // Security: Always return success to prevent email enumeration
        // If user doesn't exist, we still return success silently
        if (result.rows.length === 0) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return; // Return silently to prevent email enumeration
        }
        const user = result.rows[0];
        // Generate 6-digit OTP code (000000 to 999999)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        // Hash the token before storing (using SHA-256 for speed, tokens are one-time use)
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        // Set token expiry to 1 hour from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        // Store hashed token and expiry in database
        await connection_1.Database.query('UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3', [hashedToken, expiresAt, user.id]);
        // Get base URL for reset link (optional, for web apps)
        const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL;
        // Send password reset email with the original (unhashed) token
        try {
            await transactionalEmailService_1.TransactionalEmailService.sendPasswordResetEmail(user.email, resetToken, baseUrl);
            console.log(`✅ Password reset email sent to ${user.email}`);
        }
        catch (error) {
            // If email sending fails, clear the token so user can try again
            await connection_1.Database.query('UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1', [user.id]);
            console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
            // Still don't throw error to prevent email enumeration
            // In production, you might want to log this for monitoring
        }
    }
    /**
     * Validate password meets requirements
     * - Minimum 8 characters
     * - At least 1 uppercase letter
     * - At least 1 digit
     */
    static validatePassword(password) {
        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            throw new Error('Password must contain at least 1 uppercase letter');
        }
        if (!/[0-9]/.test(password)) {
            throw new Error('Password must contain at least 1 digit');
        }
    }
    /**
     * Reset password using reset token
     *
     * @param token - Password reset token (from email)
     * @param newPassword - New password to set
     * @throws Error if token is invalid, expired, or password validation fails
     */
    static async resetPassword(token, newPassword) {
        // Validate password requirements
        this.validatePassword(newPassword);
        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        // Find user by hashed token and check expiry
        const result = await connection_1.Database.query(`SELECT id, email, reset_token_expires_at 
       FROM users 
       WHERE reset_token = $1 
       AND reset_token_expires_at > NOW()`, [hashedToken]);
        if (result.rows.length === 0) {
            throw new Error('Invalid or expired reset token');
        }
        const user = result.rows[0];
        // Check if token has expired (additional check)
        const expiresAt = new Date(user.reset_token_expires_at);
        if (expiresAt < new Date()) {
            // Clear expired token
            await connection_1.Database.query('UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1', [user.id]);
            throw new Error('Reset token has expired. Please request a new password reset.');
        }
        // Hash the new password
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password and clear reset token fields
        await connection_1.Database.query(`UPDATE users 
       SET password_hash = $1, 
           reset_token = NULL, 
           reset_token_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [passwordHash, user.id]);
        console.log(`✅ Password reset successful for user: ${user.email}`);
    }
    /**
     * Send registration OTP - generates OTP code and sends email
     *
     * Creates an unverified user record with temporary password hash.
     * If an unverified user already exists, updates their OTP instead.
     *
     * Security: Returns generic success message to prevent email enumeration.
     *
     * @param email - User's email address
     * @param password - User's password (will be hashed and stored temporarily)
     * @returns Promise that resolves when email is sent (or would be sent)
     * @throws Error if user already exists and is verified
     */
    static async sendRegistrationOTP(email, password) {
        // Validate password requirements
        this.validatePassword(password);
        // Check if verified user already exists
        const existingUser = await connection_1.Database.query('SELECT id, email, email_verified FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            // If user exists and is verified, throw error
            if (user.email_verified) {
                throw new Error('User with this email already exists');
            }
            // If user exists but is not verified, we'll update their OTP
        }
        // Hash password temporarily (will be moved to password_hash after verification)
        const tempPasswordHash = await bcryptjs_1.default.hash(password, 10);
        // Generate 6-digit OTP code (100000 to 999999)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Hash the code before storing (using SHA-256 for speed, codes are one-time use)
        const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        // Set code expiry to 15 minutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        // If unverified user exists, update their OTP; otherwise create new user
        if (existingUser.rows.length > 0 && !existingUser.rows[0].email_verified) {
            // Update existing unverified user
            // Also update password_hash to ensure it's set (in case it was null from old migration)
            await connection_1.Database.query(`UPDATE users 
         SET verification_code = $1, 
             verification_expires_at = $2, 
             password_hash = $3,
             temp_password_hash = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [hashedCode, expiresAt, tempPasswordHash, existingUser.rows[0].id]);
            console.log(`🔄 Updated registration OTP for existing unverified user: ${email}`);
        }
        else {
            // Create new unverified user
            // Set password_hash to temp_password_hash to satisfy NOT NULL constraint
            // When OTP is verified, we'll clear temp_password_hash and keep password_hash
            await connection_1.Database.query(`INSERT INTO users (email, password_hash, temp_password_hash, verification_code, verification_expires_at, email_verified)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id`, [email, tempPasswordHash, tempPasswordHash, hashedCode, expiresAt]);
            console.log(`✅ Created new unverified user: ${email}`);
        }
        // Send registration OTP email
        try {
            await transactionalEmailService_1.TransactionalEmailService.sendRegistrationOTPEmail(email, verificationCode);
            console.log(`✅ Registration OTP email sent to ${email}`);
        }
        catch (error) {
            // If email sending fails, clear the verification code so user can try again
            await connection_1.Database.query(`UPDATE users 
         SET verification_code = NULL, 
             verification_expires_at = NULL 
         WHERE email = $1 AND email_verified = false`, [email]);
            console.error(`❌ Failed to send registration OTP email to ${email}:`, error);
            // Still don't throw error to prevent email enumeration
            // In production, you might want to log this for monitoring
        }
    }
    /**
     * Verify registration OTP and complete user registration
     *
     * @param email - User's email address
     * @param code - 6-digit OTP code from email
     * @returns AuthResponse with user and JWT token
     * @throws Error if code is invalid, expired, or user not found
     */
    static async verifyRegistrationOTP(email, code) {
        // Clean the code (remove any spaces or non-numeric characters)
        const cleanCode = code.replace(/\D/g, '');
        // Validate code format (must be 6 digits)
        if (cleanCode.length !== 6) {
            throw new Error('Verification code must be 6 digits');
        }
        // Hash the provided code to compare with stored hash
        const hashedCode = crypto.createHash('sha256').update(cleanCode).digest('hex');
        // Find unverified user by email and code
        const result = await connection_1.Database.query(`SELECT id, email, password_hash, temp_password_hash, verification_expires_at, created_at
       FROM users 
       WHERE email = $1 
       AND email_verified = false
       AND verification_code = $2
       AND verification_expires_at > NOW()`, [email, hashedCode]);
        if (result.rows.length === 0) {
            throw new Error('Invalid or expired verification code');
        }
        const user = result.rows[0];
        // Check if code has expired (additional check)
        const expiresAt = new Date(user.verification_expires_at);
        if (expiresAt < new Date()) {
            // Clear expired code
            await connection_1.Database.query('UPDATE users SET verification_code = NULL, verification_expires_at = NULL WHERE id = $1', [user.id]);
            throw new Error('Verification code has expired. Please request a new code.');
        }
        // Verify temp_password_hash exists (or password_hash if temp is null for old records)
        const passwordToUse = user.temp_password_hash || user.password_hash;
        if (!passwordToUse) {
            throw new Error('Registration data is incomplete. Please start registration again.');
        }
        // Ensure password_hash is set and mark email as verified
        // For new users, password_hash and temp_password_hash are the same, so this is a no-op
        // For old users, this moves temp_password_hash to password_hash
        await connection_1.Database.query(`UPDATE users 
       SET password_hash = $1,
           temp_password_hash = NULL,
           email_verified = true,
           verification_code = NULL,
           verification_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [passwordToUse, user.id]);
        // Get updated user data
        const updatedUser = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [user.id]);
        const verifiedUser = updatedUser.rows[0];
        // Generate JWT token
        const token = jwt_1.JwtHelper.generateToken({
            userId: verifiedUser.id,
            email: verifiedUser.email
        });
        console.log(`✅ Email verification successful for user: ${email}`);
        return {
            user: {
                id: verifiedUser.id,
                email: verifiedUser.email,
                created_at: verifiedUser.created_at,
                updated_at: verifiedUser.updated_at
            },
            token
        };
    }
    /**
     * Resend registration OTP - generates new OTP and sends email
     *
     * @param email - User's email address
     * @returns Promise that resolves when email is sent (or would be sent)
     * @throws Error if user not found or already verified
     */
    static async resendRegistrationOTP(email) {
        // Find unverified user
        const result = await connection_1.Database.query('SELECT id, email, email_verified FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw new Error('User not found. Please start registration again.');
        }
        const user = result.rows[0];
        // If user is already verified, throw error
        if (user.email_verified) {
            throw new Error('Email is already verified. Please log in instead.');
        }
        // Generate new 6-digit OTP code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Hash the code before storing
        const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        // Set code expiry to 15 minutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        // Update verification code and expiry
        await connection_1.Database.query(`UPDATE users 
       SET verification_code = $1, 
           verification_expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`, [hashedCode, expiresAt, user.id]);
        // Send new registration OTP email
        try {
            await transactionalEmailService_1.TransactionalEmailService.sendRegistrationOTPEmail(email, verificationCode);
            console.log(`✅ Registration OTP resent to ${email}`);
        }
        catch (error) {
            // If email sending fails, clear the verification code
            await connection_1.Database.query('UPDATE users SET verification_code = NULL, verification_expires_at = NULL WHERE id = $1', [user.id]);
            console.error(`❌ Failed to resend registration OTP email to ${email}:`, error);
            throw new Error('Failed to send verification code. Please try again.');
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map