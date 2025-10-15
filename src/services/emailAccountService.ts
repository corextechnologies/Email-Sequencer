import { Database } from '../database/connection';
import { 
  EmailAccount, 
  CreateEmailAccountRequest, 
  EmailAccountResponse 
} from '../types';
import { EncryptionHelper } from '../utils/encryption';

export class EmailAccountService {
  static async createEmailAccount(
    userId: number, 
    accountData: CreateEmailAccountRequest
  ): Promise<EmailAccountResponse> {
    const {
      provider,
      imap_host,
      imap_port,
      smtp_host,
      smtp_port,
      username,
      password
    } = accountData;

    // Encrypt the password
    const encryptedPassword = EncryptionHelper.encrypt(password);

    // Insert email account
    const result = await Database.query(
      `INSERT INTO email_accounts 
       (user_id, provider, imap_host, imap_port, smtp_host, smtp_port, username, encrypted_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, provider, imap_host, imap_port, smtp_host, smtp_port, username, is_active, created_at, updated_at`,
      [userId, provider, imap_host, imap_port, smtp_host, smtp_port, username, encryptedPassword]
    );

    return result.rows[0];
  }

  static async getUserEmailAccounts(userId: number): Promise<EmailAccountResponse[]> {
    const result = await Database.query(
      `SELECT id, provider, imap_host, imap_port, smtp_host, smtp_port, username, is_active, created_at, updated_at 
       FROM email_accounts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  static async getEmailAccountById(
    accountId: number, 
    userId: number
  ): Promise<EmailAccountResponse | null> {
    const result = await Database.query(
      `SELECT id, provider, imap_host, imap_port, smtp_host, smtp_port, username, is_active, created_at, updated_at 
       FROM email_accounts 
       WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async getEmailAccountWithPassword(
    accountId: number, 
    userId: number
  ): Promise<EmailAccount | null> {
    const result = await Database.query(
      `SELECT * FROM email_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async updateEmailAccount(
    accountId: number,
    userId: number,
    updateData: Partial<CreateEmailAccountRequest>
  ): Promise<EmailAccountResponse | null> {
    const { password, ...otherFields } = updateData;
    
    // Build dynamic query
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(otherFields)) {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    // Handle password encryption if provided
    if (password) {
      const encryptedPassword = EncryptionHelper.encrypt(password);
      setClause.push(`encrypted_password = $${paramCount}`);
      values.push(encryptedPassword);
      paramCount++;
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add WHERE conditions
    values.push(accountId, userId);
    
    const query = `
      UPDATE email_accounts 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING id, provider, imap_host, imap_port, smtp_host, smtp_port, username, is_active, created_at, updated_at
    `;

    const result = await Database.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async deleteEmailAccount(accountId: number, userId: number): Promise<boolean> {
    const result = await Database.query(
      'DELETE FROM email_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    return result.rowCount > 0;
  }

  static async toggleEmailAccountStatus(
    accountId: number, 
    userId: number
  ): Promise<EmailAccountResponse | null> {
    const result = await Database.query(
      `UPDATE email_accounts 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, provider, imap_host, imap_port, smtp_host, smtp_port, username, is_active, created_at, updated_at`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}
