"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAccountController = void 0;
const emailAccountService_1 = require("../services/emailAccountService");
const validation_1 = require("../utils/validation");
const mailer_1 = require("../modules/campaigns/services/mailer");
const connection_1 = require("../database/connection");
class EmailAccountController {
    static async createEmailAccount(req, res, next) {
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
            const { error, value } = validation_1.emailAccountValidation.create.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: error.details.map((detail) => ({
                            field: detail.path.join('.'),
                            message: detail.message
                        }))
                    }
                });
                return;
            }
            const result = await emailAccountService_1.EmailAccountService.createEmailAccount(req.user.userId, value);
            res.status(201).json({
                success: true,
                data: result,
                message: 'Email account created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getEmailAccounts(req, res, next) {
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
            const accounts = await emailAccountService_1.EmailAccountService.getUserEmailAccounts(req.user.userId);
            res.status(200).json({
                success: true,
                data: accounts,
                message: 'Email accounts retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getEmailAccount(req, res, next) {
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
            const account = await emailAccountService_1.EmailAccountService.getEmailAccountById(accountId, req.user.userId);
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
        }
        catch (error) {
            next(error);
        }
    }
    static async updateEmailAccount(req, res, next) {
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
            const { error, value } = validation_1.emailAccountValidation.create.validate(req.body, { allowUnknown: true, stripUnknown: true });
            if (error) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: error.details.map((detail) => ({
                            field: detail.path.join('.'),
                            message: detail.message
                        }))
                    }
                });
                return;
            }
            const result = await emailAccountService_1.EmailAccountService.updateEmailAccount(accountId, req.user.userId, value);
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
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteEmailAccount(req, res, next) {
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
            const deleted = await emailAccountService_1.EmailAccountService.deleteEmailAccount(accountId, req.user.userId);
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
        }
        catch (error) {
            next(error);
        }
    }
    static async toggleEmailAccountStatus(req, res, next) {
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
            const currentAccount = await emailAccountService_1.EmailAccountService.getEmailAccountById(accountId, req.user.userId);
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
                const mailer = new mailer_1.MailerService(connection_1.Database.getPool());
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
            const result = await emailAccountService_1.EmailAccountService.toggleEmailAccountStatus(accountId, req.user.userId);
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
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyCredentials(req, res, next) {
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
            const account = await emailAccountService_1.EmailAccountService.getEmailAccountById(accountId, req.user.userId);
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
            const mailer = new mailer_1.MailerService(connection_1.Database.getPool());
            const verification = await mailer.verifyCredentials(accountId);
            if (!verification.valid) {
                console.error(`❌ Email credentials invalid for ${account.username}: ${verification.error}`);
                // If account is active, automatically deactivate it
                if (account.is_active) {
                    console.log(`⚠️ Automatically deactivating account ${accountId} due to invalid credentials`);
                    await emailAccountService_1.EmailAccountService.toggleEmailAccountStatus(accountId, req.user.userId);
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
        }
        catch (error) {
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
exports.EmailAccountController = EmailAccountController;
//# sourceMappingURL=emailAccountController.js.map