import { Database } from '../database/connection';
import { MailerService } from '../modules/campaigns/services/mailer';
import { EncryptionHelper } from '../utils/encryption';

export interface ReplyResponseData {
  email_reply_id: number;
  campaign_id: number;
  contact_id: number;
  response_subject: string;
  response_content: string;
  sent_by_user_id: number;
}

export interface ReplyResponse extends ReplyResponseData {
  id: number;
  response_sent_at: Date;
  created_at: Date;
}

export class ReplyResponseService {
  private db = Database.getPool();
  private mailer: MailerService;

  constructor() {
    this.mailer = new MailerService(this.db);
  }

  async sendReplyResponse(replyData: any, subject: string, content: string, userId: number): Promise<ReplyResponse> {
    try {
      console.log(`📧 Sending reply response to ${replyData.reply_sender_email}`);

      // Get the contact details
      const contact = await this.db.query(`
        SELECT c.*, cc.campaign_id
        FROM contacts c
        JOIN campaign_contacts cc ON c.id = cc.contact_id
        WHERE c.id = $1 AND cc.campaign_id = $2
      `, [replyData.contact_id, replyData.campaign_id]);

      if (contact.rows.length === 0) {
        throw new Error('Contact not found');
      }

      const contactData = contact.rows[0];

      // Get the email account to send from
      const emailAccount = await this.db.query(`
        SELECT ea.*, c.user_id
        FROM email_accounts ea
        JOIN campaigns c ON ea.id = c.from_email_account_id
        WHERE c.id = $1 AND c.user_id = $2
      `, [replyData.campaign_id, userId]);

      if (emailAccount.rows.length === 0) {
        throw new Error('Email account not found or access denied');
      }

      const account = emailAccount.rows[0];

      // Decrypt the password
      let decryptedPassword: string;
      try {
        decryptedPassword = EncryptionHelper.decrypt(account.encrypted_password);
      } catch (error) {
        throw new Error('Failed to decrypt email account password');
      }

      // Generate message ID for proper threading
      const messageId = this.generateMessageId();

      // Send the response email
      const result = await this.mailer.send({
        smtp_account_id: account.id,
        from: account.username,
        to: contactData.email,
        subject: subject,
        html: content,
        headers: {
          'In-Reply-To': replyData.reply_message_id,
          'References': replyData.original_message_id || replyData.reply_message_id
        }
      });

      // Store the response in database
      const response = await this.db.query(`
        INSERT INTO reply_responses (
          email_reply_id, campaign_id, contact_id, 
          response_subject, response_content, sent_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        replyData.id,
        replyData.campaign_id,
        replyData.contact_id,
        subject,
        content,
        userId
      ]);

      console.log(`✅ Reply response sent to ${contactData.email}`);

      return response.rows[0];

    } catch (error) {
      console.error('Error sending reply response:', error);
      throw error;
    }
  }

  async getReplyResponses(replyId: number, userId: number): Promise<ReplyResponse[]> {
    try {
      const responses = await this.db.query(`
        SELECT rr.*, u.email as sent_by_email
        FROM reply_responses rr
        JOIN email_replies er ON rr.email_reply_id = er.id
        JOIN campaigns c ON er.campaign_id = c.id
        JOIN users u ON rr.sent_by_user_id = u.id
        WHERE er.id = $1 AND c.user_id = $2
        ORDER BY rr.response_sent_at DESC
      `, [replyId, userId]);

      return responses.rows;
    } catch (error) {
      console.error('Error fetching reply responses:', error);
      throw error;
    }
  }

  async getReplyWithResponses(replyId: number, userId: number): Promise<any> {
    try {
      // Get the original reply
      const reply = await this.db.query(`
        SELECT er.*, c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email
        FROM email_replies er
        JOIN campaigns camp ON er.campaign_id = camp.id
        JOIN contacts c ON er.contact_id = c.id
        WHERE er.id = $1 AND camp.user_id = $2
      `, [replyId, userId]);

      if (reply.rows.length === 0) {
        return null;
      }

      const replyData = reply.rows[0];

      // Get responses for this reply
      const responses = await this.getReplyResponses(replyId, userId);

      return {
        ...replyData,
        responses
      };
    } catch (error) {
      console.error('Error fetching reply with responses:', error);
      throw error;
    }
  }

  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `<${timestamp}.${random}@bobos.ai>`;
  }
}
