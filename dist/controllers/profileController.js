"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profileService_1 = require("../services/profileService");
class ProfileController {
    static async getProfile(req, res, next) {
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
            const profile = await profileService_1.ProfileService.getProfile(req.user.userId);
            res.status(200).json({
                success: true,
                data: { profile },
                message: 'Profile retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
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
            // Validate password requirements: 8+ chars, 1 uppercase, 1 digit
            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 digit'
                    }
                });
                return;
            }
            await profileService_1.ProfileService.changePassword(req.user.userId, currentPassword, newPassword);
            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        }
        catch (error) {
            if (error.message === 'Current password is incorrect') {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: error.message
                    }
                });
            }
            else {
                next(error);
            }
        }
    }
    static async changeEmail(req, res, next) {
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
            const updatedUser = await profileService_1.ProfileService.updateEmail(req.user.userId, newEmail, currentPassword);
            res.status(200).json({
                success: true,
                data: { user: updatedUser },
                message: 'Email changed successfully'
            });
        }
        catch (error) {
            if (error.message === 'Current password is incorrect') {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: error.message
                    }
                });
            }
            else if (error.message === 'Email is already taken by another user') {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'EMAIL_TAKEN',
                        message: error.message
                    }
                });
            }
            else {
                next(error);
            }
        }
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=profileController.js.map