import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';

interface EmailAccount {
  id: number;
  username: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
}

export interface DetectedReply {
  campaign_id: number;
  contact_id: number;
  original_message_id: string;
  reply_message_id: string;
  reply_subject: string;
  reply_content: string;
  reply_sender_email: string;
  reply_received_at: Date;
}

export class ImapReplyDetector {
  private db = Database.getPool();

  async checkAllAccountsForReplies(): Promise<DetectedReply[]> {
    const accounts = await this.getActiveEmailAccounts();
    const allReplies: DetectedReply[] = [];

    console.log(`🔍 Checking ${accounts.length} email accounts for replies...`);

    for (const account of accounts) {
      try {
        console.log(`📧 Checking account: ${account.username}`);
        const replies = await this.checkAccountForReplies(account);
        allReplies.push(...replies);
        console.log(`📧 Found ${replies.length} replies from ${account.username}`);
      } catch (error) {
        console.error(`❌ Failed to check account ${account.username}:`, error);
      }
    }

    return allReplies;
  }

  private async getActiveEmailAccounts(): Promise<EmailAccount[]> {
    const result = await this.db.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, 
             COALESCE(imap_username, username) as imap_username, 
             COALESCE(imap_password, encrypted_password) as imap_password
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND (imap_password IS NOT NULL OR encrypted_password IS NOT NULL)
      AND imap_password != 'YOUR_APP_PASSWORD_HERE'
    `);
    return result.rows;
  }

  private async checkAccountForReplies(account: EmailAccount): Promise<DetectedReply[]> {
    return new Promise((resolve, reject) => {
      // Decrypt the password before using it
      let decryptedPassword: string;
      try {
        decryptedPassword = EncryptionHelper.decrypt(account.imap_password);
      } catch (error) {
        console.error(`❌ Failed to decrypt password for ${account.username}:`, error);
        reject(new Error('Failed to decrypt password'));
        return;
      }

      const imap = new Imap({
        host: account.imap_host,
        port: account.imap_port,
        tls: account.imap_secure,
        user: account.imap_username,
        password: decryptedPassword,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err: any, box: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Search for all emails (we'll filter by date in processing)
          imap.search(['ALL'], (err: any, uids: any) => {
            if (err) {
              reject(err);
              return;
            }

            if (uids.length === 0) {
              imap.end();
              resolve([]);
              return;
            }

            const fetch = imap.fetch(uids, { bodies: '', struct: true });
            const replies: DetectedReply[] = [];
            let processedCount = 0;

            fetch.on('message', (msg: any) => {
              msg.on('body', (stream: any) => {
                simpleParser(stream, async (err: any, parsed: any) => {
                  if (err) {
                    processedCount++;
                    if (processedCount === uids.length) {
                      imap.end();
                      resolve(replies);
                    }
                    return;
                  }

                  const reply = await this.processEmailForReplies(parsed, account);
                  if (reply) {
                    replies.push(reply);
                  }

                  processedCount++;
                  if (processedCount === uids.length) {
                    imap.end();
                    resolve(replies);
                  }
                });
              });
            });

            fetch.once('error', reject);
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  private async processEmailForReplies(email: any, account: EmailAccount): Promise<DetectedReply | null> {
    // Filter by date (last 24 hours)
    const emailDate = email.date || new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (emailDate < oneDayAgo) return null;

    // Check if this is a reply (subject starts with "Re:" or contains original message ID)
    const isReply = email.subject?.toLowerCase().startsWith('re:') || 
                   email.inReplyTo || 
                   email.references;

    if (!isReply) return null;

    // Extract original message ID from references or inReplyTo
    const originalMessageId = email.inReplyTo || 
                             email.references?.split(' ')[0] || 
                             this.extractMessageIdFromSubject(email.subject);

    if (!originalMessageId) return null;

    // Find the original message in our database
    const originalMessage = await this.findOriginalMessage(originalMessageId, account.id);
    if (!originalMessage) return null;

    return {
      campaign_id: originalMessage.campaign_id,
      contact_id: originalMessage.contact_id,
      original_message_id: originalMessageId,
      reply_message_id: email.messageId,
      reply_subject: email.subject || '',
      reply_content: email.text || email.html || '',
      reply_sender_email: email.from?.value[0]?.address || '',
      reply_received_at: email.date || new Date()
    };
  }

  private async findOriginalMessage(messageId: string, smtpAccountId: number): Promise<any> {
    const result = await this.db.query(`
      SELECT campaign_id, contact_id 
      FROM messages 
      WHERE provider_message_id = $1 
      AND smtp_account_id = $2 
      AND direction = 'outbound'
    `, [messageId, smtpAccountId]);

    return result.rows[0] || null;
  }

  private extractMessageIdFromSubject(subject: string): string | null {
    // Try to extract message ID from subject line patterns
    const patterns = [
      /\[([a-f0-9-]+)\]/i,
      /\(([a-f0-9-]+)\)/i,
      /ID:([a-f0-9-]+)/i
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}
