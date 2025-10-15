import { Request, Response, NextFunction } from 'express';
import { EmailAccountService } from '../services/emailAccountService';
import { emailAccountValidation } from '../utils/validation';
import { AuthenticatedRequest } from '../middleware/auth';

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
}
