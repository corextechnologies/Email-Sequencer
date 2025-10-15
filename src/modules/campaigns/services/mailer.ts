import nodemailer from 'nodemailer';
import { Pool } from 'pg';
import { EncryptionHelper } from '../../../utils/encryption';

type SendInput = {
	smtp_account_id: number;
	from: string;
	to: string;
	subject: string;
	html: string;
	headers?: Record<string, string>;
};

export class MailerService {
	constructor(private db: Pool) {}

	async createTransport(smtp_account_id: number) {
		const row = await this.db.query('SELECT * FROM email_accounts WHERE id = $1', [smtp_account_id]);
		const acc = row.rows[0];
		const pass = EncryptionHelper.decrypt(acc.encrypted_password);
		return nodemailer.createTransport({
			host: acc.smtp_host,
			port: acc.smtp_port,
			secure: acc.smtp_port === 465,
			auth: { user: acc.username, pass },
		});
	}

	async send(input: SendInput): Promise<{ messageId: string }> {
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


