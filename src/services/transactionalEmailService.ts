import nodemailer, { Transporter } from 'nodemailer';

/**
 * Transactional Email Service
 * 
 * Handles system emails like password reset, notifications, etc.
 * Uses environment variables for SMTP configuration (separate from user email accounts).
 */
export class TransactionalEmailService {
  private static transporter: Transporter | null = null;

  /**
   * Get or create SMTP transporter using environment variables
   */
  private static getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@emailsequencer.com';

    // Debug: Log SMTP configuration status (without exposing password)
    console.log('📧 SMTP Configuration Check:', {
      SMTP_HOST: smtpHost ? '✅ Set' : '❌ Missing',
      SMTP_PORT: smtpPort,
      SMTP_USER: smtpUser ? '✅ Set' : '❌ Missing',
      SMTP_PASS: smtpPass ? '✅ Set' : '❌ Missing',
      SMTP_FROM: smtpFrom,
    });

    // Validate required environment variables
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('❌ SMTP Configuration Error:', {
        SMTP_HOST: smtpHost || 'MISSING',
        SMTP_USER: smtpUser || 'MISSING',
        SMTP_PASS: smtpPass ? 'SET' : 'MISSING',
      });
      throw new Error(
        'SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
      );
    }

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Add TLS options for better compatibility
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates (for development)
      },
    });

    return this.transporter;
  }

  /**
   * Verify SMTP connection
   */
  static async verifyConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { valid: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to verify SMTP connection';
      console.error('❌ Transactional email service SMTP verification failed:', errorMessage);
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Format token for better readability
   * For 6-digit codes, just return as-is (already formatted)
   * For longer tokens, add spaces every 4 characters
   */
  private static formatTokenForDisplay(token: string): string {
    // If it's a 6-digit code, return as-is
    if (token.length === 6 && /^\d+$/.test(token)) {
      return token;
    }
    // For longer tokens, split into groups of 4 characters for easier reading
    return token.match(/.{1,4}/g)?.join(' ') || token;
  }

  /**
   * Generate HTML template for password reset email
   */
  private static generatePasswordResetEmailTemplate(resetToken: string, baseUrl?: string): string {
    // Get app name from environment or use default
    const appName = process.env.APP_NAME || 'Smart Sequence';
    
    // Format token for display (with spaces for readability)
    const formattedToken = this.formatTokenForDisplay(resetToken);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
  <style>
    body {
      color: #000000;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #ffffff;
      }
    }
  </style>
</head>
<body>
  <p>Password Reset</p>
  <p>Enter this code in the app to reset your password:</p>
  <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${formattedToken}</p>
  <p>Expires in 1 hour</p>
  <p>Didn't request this? You can safely ignore this email.</p>
</body>
</html>
    `.trim();
  }

  /**
   * Send password reset email
   * 
   * @param email - Recipient email address
   * @param resetToken - Password reset token to include in email
   * @param baseUrl - Optional base URL for reset link (for web apps)
   * @returns Promise with messageId if successful
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    baseUrl?: string
  ): Promise<{ messageId: string }> {
    try {
      const transporter = this.getTransporter();
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@emailsequencer.com';
      const appName = process.env.APP_NAME || 'Email Sequencer';

      // Format token for display
      const formattedToken = this.formatTokenForDisplay(resetToken);
      const html = this.generatePasswordResetEmailTemplate(resetToken, baseUrl);

      const info = await transporter.sendMail({
        from: `"${appName}" <${smtpFrom}>`,
        to: email,
        subject: `Reset Your ${appName} Password`,
        html: html,
        // Add text version for better email client compatibility
        text: `
Password Reset - ${appName}

Enter this code in the app to reset your password:

${formattedToken}

⏱️ Expires in 1 hour

Didn't request this? You can safely ignore this email.
        `.trim(),
      });

      console.log(`✅ Password reset email sent to ${email} (Message ID: ${info.messageId})`);

      return {
        messageId: info.messageId || '',
      };
    } catch (error: any) {
      console.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  /**
   * Generate HTML template for registration OTP email
   */
  private static generateRegistrationOTPEmailTemplate(verificationCode: string): string {
    // Get app name from environment or use default
    const appName = process.env.APP_NAME || 'Smart Sequence';
    
    // Format code for display (6-digit codes are returned as-is)
    const formattedCode = this.formatTokenForDisplay(verificationCode);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
  <style>
    body {
      color: #000000;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #ffffff;
      }
    }
  </style>
</head>
<body>
  <p>Email Verification</p>
  <p>Enter this code to complete your registration:</p>
  <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${formattedCode}</p>
  <p>Expires in 15 minutes</p>
  <p>If you didn't create an account, you can safely ignore this email.</p>
</body>
</html>
    `.trim();
  }

  /**
   * Send registration OTP email
   * 
   * @param email - Recipient email address
   * @param verificationCode - 6-digit OTP code to include in email
   * @returns Promise with messageId if successful
   */
  static async sendRegistrationOTPEmail(
    email: string,
    verificationCode: string
  ): Promise<{ messageId: string }> {
    try {
      const transporter = this.getTransporter();
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@emailsequencer.com';
      const appName = process.env.APP_NAME || 'Smart Sequence';

      // Format code for display
      const formattedCode = this.formatTokenForDisplay(verificationCode);
      const html = this.generateRegistrationOTPEmailTemplate(verificationCode);

      const info = await transporter.sendMail({
        from: `"${appName}" <${smtpFrom}>`,
        to: email,
        subject: `Verify Your ${appName} Email`,
        html: html,
        // Add text version for better email client compatibility
        text: `
Email Verification - ${appName}

Enter this code to complete your registration:

${formattedCode}

⏱️ Expires in 15 minutes

If you didn't create an account, you can safely ignore this email.
        `.trim(),
      });

      console.log(`✅ Registration OTP email sent to ${email} (Message ID: ${info.messageId})`);

      return {
        messageId: info.messageId || '',
      };
    } catch (error: any) {
      console.error(`❌ Failed to send registration OTP email to ${email}:`, error);
      throw new Error(`Failed to send registration OTP email: ${error.message}`);
    }
  }

  /**
   * Send a generic transactional email
   * 
   * @param options - Email options
   * @returns Promise with messageId if successful
   */
  static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<{ messageId: string }> {
    try {
      const transporter = this.getTransporter();
      const smtpFrom = options.from || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@emailsequencer.com';

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`✅ Transactional email sent to ${options.to} (Message ID: ${info.messageId})`);

      return {
        messageId: info.messageId || '',
      };
    } catch (error: any) {
      console.error(`❌ Failed to send transactional email to ${options.to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

