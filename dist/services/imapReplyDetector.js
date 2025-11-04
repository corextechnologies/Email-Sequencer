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
        this.previousAccountIds = new Set();
    }
    async ensureDatabaseConnection() {
        try {
            // Try to get the pool - if it doesn't exist or is ended, we'll reinitialize
            let pool;
            try {
                pool = connection_1.Database.getPool();
                // Check if the pool is ended - if so, we need to reinitialize Database
                if (pool.ended) {
                    console.log('⚠️  Database pool was ended, reinitializing...');
                    // Reset the Database pool so it can be reinitialized
                    connection_1.Database.pool = null;
                    await connection_1.Database.initialize();
                    pool = connection_1.Database.getPool();
                    console.log('🔗 Reply detector database connection re-established');
                }
            }
            catch (error) {
                // Pool not initialized, initialize it
                await connection_1.Database.initialize();
                pool = connection_1.Database.getPool();
                console.log('🔗 Reply detector database connection established');
            }
            // Update our cached reference
            this.db = pool;
            return this.db;
        }
        catch (error) {
            console.error('❌ Failed to ensure database connection for reply detector:', error);
            throw new Error('Database connection failed');
        }
    }
    async checkAllAccountsForReplies() {
        try {
            const db = await this.ensureDatabaseConnection();
            const accounts = await this.getActiveEmailAccounts(db);
            const allReplies = [];
            // Detect new accounts by comparing with previous check
            const currentAccountIds = new Set(accounts.map(acc => acc.id));
            const newAccountIds = [...currentAccountIds].filter(id => !this.previousAccountIds.has(id));
            const removedAccountIds = [...this.previousAccountIds].filter(id => !currentAccountIds.has(id));
            if (newAccountIds.length > 0) {
                const newAccounts = accounts.filter(acc => newAccountIds.includes(acc.id));
                console.log(`🆕 Detected ${newAccountIds.length} new email account(s) for reply detection:`);
                newAccounts.forEach(account => {
                    console.log(`   ✅ ${account.username} (ID: ${account.id}) - ${account.imap_host}:${account.imap_port}`);
                });
            }
            if (removedAccountIds.length > 0) {
                console.log(`🗑️  ${removedAccountIds.length} email account(s) removed from reply detection (IDs: ${removedAccountIds.join(', ')})`);
            }
            // Update tracked account IDs for next check
            this.previousAccountIds = currentAccountIds;
            console.log(`🔍 Checking ${accounts.length} email account(s) for replies...`);
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
        try {
            // First, let's check what accounts exist and why they might not be matching
            const debugQuery = await db.query(`
        SELECT id, username, imap_host, imap_port, is_active,
               encrypted_password IS NOT NULL as has_encrypted_password
        FROM email_accounts 
        WHERE is_active = true
      `);
            if (debugQuery.rows.length === 0) {
                console.log('⚠️  No active email accounts found in database');
                return [];
            }
            console.log(`📊 Found ${debugQuery.rows.length} active email account(s) in database:`);
            debugQuery.rows.forEach(acc => {
                console.log(`   • ${acc.username} (ID: ${acc.id}):`);
                console.log(`     - IMAP Host: ${acc.imap_host || 'NULL'}`);
                console.log(`     - IMAP Port: ${acc.imap_port || 'NULL'}`);
                console.log(`     - Has Password: ${acc.has_encrypted_password ? 'YES' : 'NO'}`);
                console.log(`     - Ready for Reply Detection: ${(acc.imap_host && acc.has_encrypted_password) ? 'YES' : 'NO'}`);
            });
            // Try to use imap_password if column exists, otherwise fall back to encrypted_password
            // First check if optional columns exist
            let hasImapPassword = false;
            let hasImapUsername = false;
            let hasImapSecure = false;
            try {
                const columnCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'email_accounts' 
          AND column_name IN ('imap_password', 'imap_username', 'imap_secure')
        `);
                hasImapPassword = columnCheck.rows.some(r => r.column_name === 'imap_password');
                hasImapUsername = columnCheck.rows.some(r => r.column_name === 'imap_username');
                hasImapSecure = columnCheck.rows.some(r => r.column_name === 'imap_secure');
            }
            catch (e) {
                // If we can't check columns, assume they don't exist
                console.log('ℹ️  Could not check for optional IMAP columns, using defaults');
            }
            // Build the query - use imap_password if available, otherwise use encrypted_password
            let query = `
        SELECT id, username, imap_host, imap_port, 
               ${hasImapSecure ? 'COALESCE(imap_secure, true)' : 'true'} as imap_secure,
               ${hasImapUsername ? 'COALESCE(imap_username, username)' : 'username'} as imap_username, 
               `;
            if (hasImapPassword) {
                query += `COALESCE(
          CASE WHEN imap_password IS NOT NULL AND imap_password != 'YOUR_APP_PASSWORD_HERE' THEN imap_password ELSE NULL END,
          encrypted_password
        ) as imap_password`;
            }
            else {
                query += `encrypted_password as imap_password`;
            }
            query += `
        FROM email_accounts 
        WHERE imap_host IS NOT NULL 
        AND username IS NOT NULL 
        AND encrypted_password IS NOT NULL
        AND is_active = true
      `;
            if (hasImapPassword) {
                query = query.replace('AND encrypted_password IS NOT NULL', `AND (
          (imap_password IS NOT NULL AND imap_password != 'YOUR_APP_PASSWORD_HERE') 
          OR encrypted_password IS NOT NULL
        )`);
            }
            const result = await db.query(query);
            if (result.rows.length === 0) {
                console.log('⚠️  No email accounts match the reply detection criteria (need IMAP host + password)');
            }
            else {
                console.log(`✅ Found ${result.rows.length} email account(s) ready for reply detection`);
            }
            return result.rows;
        }
        catch (error) {
            console.error('❌ Error querying email accounts:', error);
            // Fallback to simplest query that should always work
            try {
                const fallbackResult = await db.query(`
          SELECT id, username, imap_host, imap_port, 
                 true as imap_secure,
                 username as imap_username, 
                 encrypted_password as imap_password
          FROM email_accounts 
          WHERE imap_host IS NOT NULL 
          AND username IS NOT NULL 
          AND encrypted_password IS NOT NULL
          AND is_active = true
        `);
                console.log(`✅ Using fallback query - found ${fallbackResult.rows.length} account(s)`);
                return fallbackResult.rows;
            }
            catch (fallbackError) {
                console.error('❌ Fallback query also failed:', fallbackError);
                return [];
            }
        }
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
        // Ensure we have a valid connection before querying
        let db;
        try {
            db = await this.ensureDatabaseConnection();
        }
        catch (error) {
            console.error('❌ Failed to get database connection in processEmailForReplies:', error);
            return null;
        }
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