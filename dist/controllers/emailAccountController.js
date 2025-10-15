"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAccountController = void 0;
const emailAccountService_1 = require("../services/emailAccountService");
const validation_1 = require("../utils/validation");
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
}
exports.EmailAccountController = EmailAccountController;
//# sourceMappingURL=emailAccountController.js.map