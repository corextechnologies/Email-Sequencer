/**
 * Transactional Email Service
 *
 * Handles system emails like password reset, notifications, etc.
 * Uses environment variables for SMTP configuration (separate from user email accounts).
 */
export declare class TransactionalEmailService {
    private static transporter;
    /**
     * Get or create SMTP transporter using environment variables
     */
    private static getTransporter;
    /**
     * Verify SMTP connection
     */
    static verifyConnection(): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Format token for better readability
     * For 6-digit codes, just return as-is (already formatted)
     * For longer tokens, add spaces every 4 characters
     */
    private static formatTokenForDisplay;
    /**
     * Generate HTML template for password reset email
     */
    private static generatePasswordResetEmailTemplate;
    /**
     * Send password reset email
     *
     * @param email - Recipient email address
     * @param resetToken - Password reset token to include in email
     * @param baseUrl - Optional base URL for reset link (for web apps)
     * @returns Promise with messageId if successful
     */
    static sendPasswordResetEmail(email: string, resetToken: string, baseUrl?: string): Promise<{
        messageId: string;
    }>;
    /**
     * Generate HTML template for registration OTP email
     */
    private static generateRegistrationOTPEmailTemplate;
    /**
     * Send registration OTP email
     *
     * @param email - Recipient email address
     * @param verificationCode - 6-digit OTP code to include in email
     * @returns Promise with messageId if successful
     */
    static sendRegistrationOTPEmail(email: string, verificationCode: string): Promise<{
        messageId: string;
    }>;
    /**
     * Send a generic transactional email
     *
     * @param options - Email options
     * @returns Promise with messageId if successful
     */
    static sendEmail(options: {
        to: string;
        subject: string;
        html: string;
        text?: string;
        from?: string;
    }): Promise<{
        messageId: string;
    }>;
}
//# sourceMappingURL=transactionalEmailService.d.ts.map