import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { userValidation } from '../utils/validation';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.register.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await AuthService.register(value);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.login.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await AuthService.login(value);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'User details retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.forgotPassword.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Request password reset (always returns success for security)
      await AuthService.requestPasswordReset(value.email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.resetPassword.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Reset password using token
      await AuthService.resetPassword(value.token, value.password);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      });
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('Invalid or expired') || error.message.includes('expired')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Password must be at least')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  }

  static async sendRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.sendRegistrationOTP.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Send registration OTP (always returns success for security)
      await AuthService.sendRegistrationOTP(value.email, value.password);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox to complete registration.'
      });
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('User with this email already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'User with this email already exists. Please log in instead.'
          }
        });
        return;
      }

      if (error.message.includes('Password must be at least')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  }

  static async verifyRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.verifyRegistrationOTP.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Verify registration OTP and complete registration
      const result = await AuthService.verifyRegistrationOTP(value.email, value.code);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Email verified successfully. Your account has been created.'
      });
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('Invalid or expired') || error.message.includes('expired')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Verification code must be exactly')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Registration data is incomplete')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INCOMPLETE_REGISTRATION',
            message: error.message
          }
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  }

  static async resendRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userValidation.resendRegistrationOTP.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Resend registration OTP
      await AuthService.resendRegistrationOTP(value.email);

      res.status(200).json({
        success: true,
        message: 'Verification code resent to your email. Please check your inbox.'
      });
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('User not found') || error.message.includes('start registration again')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('already verified') || error.message.includes('log in instead')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_VERIFIED',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Failed to send')) {
        res.status(500).json({
          success: false,
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: error.message
          }
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  }
}
