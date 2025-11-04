import { Request, Response, NextFunction } from 'express';
import { EmailAccountService } from '../services/emailAccountService';
import { emailAccountValidation } from '../utils/validation';
import { AuthenticatedRequest } from '../middleware/auth';
import { MailerService } from '../modules/campaigns/services/mailer';
import { Database } from '../database/connection';

export class EmailAccountController {
  static async createEmailAccount(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      // Validate request body
      const { error, value } = emailAccountValidation.create.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await EmailAccountService.createEmailAccount(req.user.userId, value);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Email account created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEmailAccounts(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      const accounts = await EmailAccountService.getUserEmailAccounts(req.user.userId);

      res.status(200).json({
        success: true,
        data: accounts,
        message: 'Email accounts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEmailAccount(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid account ID'
          }
        });
        return;
      }

      const account = await EmailAccountService.getEmailAccountById(accountId, req.user.userId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
        message: 'Email account retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEmailAccount(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid account ID'
          }
        });
        return;
      }

      // Validate request body (partial validation)
      const { error, value } = emailAccountValidation.create.validate(req.body, { allowUnknown: true, stripUnknown: true });
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await EmailAccountService.updateEmailAccount(accountId, req.user.userId, value);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Email account updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmailAccount(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid account ID'
          }
        });
        return;
      }

      const deleted = await EmailAccountService.deleteEmailAccount(accountId, req.user.userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Email account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleEmailAccountStatus(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
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

      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid account ID'
          }
        });
        return;
      }

      // Get current account status before toggling
      const currentAccount = await EmailAccountService.getEmailAccountById(accountId, req.user.userId);
      
      if (!currentAccount) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      // If we're activating (going from inactive to active), verify credentials first
      if (!currentAccount.is_active) {
        console.log(`🔐 Verifying credentials before activating account ${currentAccount.username}...`);
        const mailer = new MailerService(Database.getPool());
        const verification = await mailer.verifyCredentials(accountId);

        if (!verification.valid) {
          console.error(`❌ Cannot activate account ${currentAccount.username}: Invalid credentials - ${verification.error}`);
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_EMAIL_CREDENTIALS',
              message: `Cannot activate email account: Your email account credentials are not working. Please update your email account settings.\n\nError: ${verification.error}`
            }
          });
          return;
        }
        console.log(`✅ Credentials verified successfully for ${currentAccount.username}`);
      }

      // Proceed with toggle
      const result = await EmailAccountService.toggleEmailAccountStatus(accountId, req.user.userId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Email account status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyCredentials(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid account ID'
          }
        });
        return;
      }

      // Verify account exists and belongs to user
      const account = await EmailAccountService.getEmailAccountById(accountId, req.user.userId);
      
      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Email account not found'
          }
        });
        return;
      }

      // Verify SMTP credentials
      console.log(`🔐 Verifying SMTP credentials for email account ${account.username} (${account.provider})...`);
      const mailer = new MailerService(Database.getPool());
      const verification = await mailer.verifyCredentials(accountId);

      if (!verification.valid) {
        console.error(`❌ Email credentials invalid for ${account.username}: ${verification.error}`);
        
        // If account is active, automatically deactivate it
        if (account.is_active) {
          console.log(`⚠️ Automatically deactivating account ${accountId} due to invalid credentials`);
          await EmailAccountService.toggleEmailAccountStatus(accountId, req.user.userId);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          valid: verification.valid,
          error: verification.error,
          account: {
            ...account,
            is_active: verification.valid ? account.is_active : false // Return updated status if invalid
          }
        },
        message: verification.valid 
          ? 'Email credentials are valid' 
          : 'Email credentials are invalid. Account has been deactivated.'
      });
    } catch (error: any) {
      console.error('Error verifying credentials:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to verify credentials'
        }
      });
    }
  }
}
