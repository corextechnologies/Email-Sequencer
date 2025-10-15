import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProfileService } from '../services/profileService';

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const profile = await ProfileService.getProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: { profile },
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required'
          }
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be at least 6 characters long'
          }
        });
        return;
      }

      await ProfileService.changePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  static async changeEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const { newEmail, currentPassword } = req.body;

      if (!newEmail || !currentPassword) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New email and current password are required'
          }
        });
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please enter a valid email address'
          }
        });
        return;
      }

      const updatedUser = await ProfileService.updateEmail(req.user.userId, newEmail, currentPassword);

      res.status(200).json({
        success: true,
        data: { user: updatedUser },
        message: 'Email changed successfully'
      });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: error.message
          }
        });
      } else if (error.message === 'Email is already taken by another user') {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }
}
