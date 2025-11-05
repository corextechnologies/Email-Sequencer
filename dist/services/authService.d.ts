import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../types';
export declare class AuthService {
    static register(userData: CreateUserRequest): Promise<AuthResponse>;
    static login(credentials: LoginRequest): Promise<AuthResponse>;
    static getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null>;
    static getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null>;
    /**
     * Request password reset - generates token and sends email
     *
     * Security: Always returns success to prevent email enumeration attacks.
     * If email doesn't exist, we still return success but don't send email.
     *
     * @param email - User's email address
     * @returns Promise that resolves when email is sent (or would be sent)
     */
    static requestPasswordReset(email: string): Promise<void>;
    /**
     * Validate password meets requirements
     * - Minimum 8 characters
     * - At least 1 uppercase letter
     * - At least 1 digit
     */
    private static validatePassword;
    /**
     * Reset password using reset token
     *
     * @param token - Password reset token (from email)
     * @param newPassword - New password to set
     * @throws Error if token is invalid, expired, or password validation fails
     */
    static resetPassword(token: string, newPassword: string): Promise<void>;
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
    static sendRegistrationOTP(email: string, password: string): Promise<void>;
    /**
     * Verify registration OTP and complete user registration
     *
     * @param email - User's email address
     * @param code - 6-digit OTP code from email
     * @returns AuthResponse with user and JWT token
     * @throws Error if code is invalid, expired, or user not found
     */
    static verifyRegistrationOTP(email: string, code: string): Promise<AuthResponse>;
    /**
     * Resend registration OTP - generates new OTP and sends email
     *
     * @param email - User's email address
     * @returns Promise that resolves when email is sent (or would be sent)
     * @throws Error if user not found or already verified
     */
    static resendRegistrationOTP(email: string): Promise<void>;
}
//# sourceMappingURL=authService.d.ts.map