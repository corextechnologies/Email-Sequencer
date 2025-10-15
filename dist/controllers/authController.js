"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
const validation_1 = require("../utils/validation");
class AuthController {
    static async register(req, res, next) {
        try {
            // Validate request body
            const { error, value } = validation_1.userValidation.register.validate(req.body);
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
            const result = await authService_1.AuthService.register(value);
            res.status(201).json({
                success: true,
                data: result,
                message: 'User registered successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            // Validate request body
            const { error, value } = validation_1.userValidation.login.validate(req.body);
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
            const result = await authService_1.AuthService.login(value);
            res.status(200).json({
                success: true,
                data: result,
                message: 'Login successful'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMe(req, res, next) {
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
            const user = await authService_1.AuthService.getUserById(req.user.userId);
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
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map