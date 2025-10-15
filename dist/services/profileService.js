"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../database/connection");
class ProfileService {
    static async updateEmail(userId, newEmail, currentPassword) {
        // Get current user with password
        const result = await connection_1.Database.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        const user = result.rows[0];
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }
        // Check if email is already taken
        const existingUser = await connection_1.Database.query('SELECT id FROM users WHERE email = $1', [newEmail]);
        if (existingUser.rows.length > 0) {
            throw new Error('Email is already taken by another user');
        }
        // Update email
        const updateResult = await connection_1.Database.query('UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, created_at, updated_at', [newEmail, userId]);
        return updateResult.rows[0];
    }
    static async changePassword(userId, currentPassword, newPassword) {
        // Get current user with password
        const result = await connection_1.Database.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        const user = result.rows[0];
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await connection_1.Database.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, userId]);
    }
    static async getProfile(userId) {
        const result = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        return result.rows[0];
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=profileService.js.map