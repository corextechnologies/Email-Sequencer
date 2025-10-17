"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapReplyDetector = void 0;
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const connection_1 = require("../database/connection");
const encryption_1 = require("../utils/encryption");
class ImapReplyDetector {
    constructor() {
        this.db = null;
    }
    async ensureDatabaseConnection() {
        if (!this.db || this.db.ended) {
            try {
                await connection_1.Database.initialize();
                this.db = connection_1.Database.getPool();
                console.log('🔗 Reply detector database connection established');
            }
            catch (error) {
                console.error('❌ Failed to initialize database connection for reply detector:', error);
                throw new Error('Database connection failed');
            }
        }
        return this.db;
    }
    async checkAllAccountsForReplies() {
        try {
            const db = await this.ensureDatabaseConnection();
            const accounts = await this.getActiveEmailAccounts(db);
            const allReplies = [];
            console.log(`🔍 Checking ${accounts.length} email accounts for replies...`);
            for (const account of accounts) {
                try {
                    console.log(`📧 Checking account: ${account.username}`);
                    const replies = await this.checkAccountForReplies(account);
                    allReplies.push(...replies);
                    console.log(`📧 Found ${replies.length} replies from ${account.username}`);
                }
                catch (error) {
                    console.error(`❌ Failed to check account ${account.username}:`, error);
                }
            }
            return allReplies;
        }
        catch (error) {
            console.error('❌ Error in checkAllAccountsForReplies:', error);
            return []; // Return empty array instead of crashing
        }
    }
    async getActiveEmailAccounts(db) {
        const result = await db.query(`
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
    async checkAccountForReplies(account) {
        return new Promise((resolve, reject) => {
            // Decrypt the password before using it
            let decryptedPassword;
            try {
                decryptedPassword = encryption_1.EncryptionHelper.decrypt(account.imap_password);
            }
            catch (error) {
                console.error(`❌ Failed to decrypt password for ${account.username}:`, error);
                reject(new Error('Failed to decrypt password'));
                return;
            }
            const imap = new imap_1.default({
                host: account.imap_host,
                port: account.imap_port,
                tls: account.imap_secure,
                user: account.imap_username,
                password: decryptedPassword,
                tlsOptions: { rejectUnauthorized: false }
            });
            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Search for all emails (we'll filter by date in processing)
                    imap.search(['ALL'], (err, uids) => {
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
                        const replies = [];
                        let processedCount = 0;
                        fetch.on('message', (msg) => {
                            msg.on('body', (stream) => {
                                (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
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
    async processEmailForReplies(email, account) {
        // Filter by date (last 24 hours)
        const emailDate = email.date || new Date();
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        if (emailDate < oneDayAgo)
            return null;
        // Check if this is a reply (subject starts with "Re:" or contains original message ID)
        const isReply = email.subject?.toLowerCase().startsWith('re:') ||
            email.inReplyTo ||
            email.references;
        if (!isReply)
            return null;
        // Extract original message ID from references or inReplyTo
        const originalMessageId = email.inReplyTo ||
            email.references?.split(' ')[0] ||
            this.extractMessageIdFromSubject(email.subject);
        if (!originalMessageId)
            return null;
        // Find the original message in our database
        const db = await this.ensureDatabaseConnection();
        const originalMessage = await this.findOriginalMessage(originalMessageId, account.id, db);
        if (!originalMessage)
            return null;
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
    async findOriginalMessage(messageId, smtpAccountId, db) {
        const result = await db.query(`
      SELECT campaign_id, contact_id 
      FROM messages 
      WHERE provider_message_id = $1 
      AND smtp_account_id = $2 
      AND direction = 'outbound'
    `, [messageId, smtpAccountId]);
        return result.rows[0] || null;
    }
    extractMessageIdFromSubject(subject) {
        // Try to extract message ID from subject line patterns
        const patterns = [
            /\[([a-f0-9-]+)\]/i,
            /\(([a-f0-9-]+)\)/i,
            /ID:([a-f0-9-]+)/i
        ];
        for (const pattern of patterns) {
            const match = subject.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
}
exports.ImapReplyDetector = ImapReplyDetector;
//# sourceMappingURL=imapReplyDetector.js.map