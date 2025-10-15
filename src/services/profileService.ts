import bcrypt from 'bcryptjs';
import { Database } from '../database/connection';
import { User } from '../types';

export class ProfileService {
  static async updateEmail(userId: number, newEmail: string, currentPassword: string): Promise<User> {
    // Get current user with password
    const result = await Database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Check if email is already taken
    const existingUser = await Database.query(
      'SELECT id FROM users WHERE email = $1',
      [newEmail]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email is already taken by another user');
    }

    // Update email
    const updateResult = await Database.query(
      'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, created_at, updated_at',
      [newEmail, userId]
    );

    return updateResult.rows[0];
  }

  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get current user with password
    const result = await Database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await Database.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );
  }

  static async getProfile(userId: number): Promise<User> {
    const result = await Database.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }
}
