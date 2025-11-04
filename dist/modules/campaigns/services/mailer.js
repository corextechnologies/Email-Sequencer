"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const encryption_1 = require("../../../utils/encryption");
class MailerService {
    constructor(db) {
        this.db = db;
    }
    async createTransport(smtp_account_id) {
        const row = await this.db.query('SELECT * FROM email_accounts WHERE id = $1', [smtp_account_id]);
        const acc = row.rows[0];
        const pass = encryption_1.EncryptionHelper.decrypt(acc.encrypted_password);
        return nodemailer_1.default.createTransport({
            host: acc.smtp_host,
            port: acc.smtp_port,
            secure: acc.smtp_port === 465,
            auth: { user: acc.username, pass },
        });
    }
    async verifyCredentials(smtp_account_id) {
        try {
            const transporter = await this.createTransport(smtp_account_id);
            // Verify SMTP connection and credentials
            await transporter.verify();
            return { valid: true };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to verify SMTP credentials';
            console.error(`❌ SMTP credential verification failed for account ${smtp_account_id}:`, errorMessage);
            return {
                valid: false,
                error: errorMessage
            };
        }
    }
    async send(input) {
        const transporter = await this.createTransport(input.smtp_account_id);
        const info = await transporter.sendMail({
            from: input.from,
            to: input.to,
            subject: input.subject,
            html: input.html,
            headers: input.headers || {}
        });
        return { messageId: info.messageId || '' };
    }
}
exports.MailerService = MailerService;
//# sourceMappingURL=mailer.js.map