import nodemailer from 'nodemailer';
import { Pool } from 'pg';
type SendInput = {
    smtp_account_id: number;
    from: string;
    to: string;
    subject: string;
    html: string;
    headers?: Record<string, string>;
};
export declare class MailerService {
    private db;
    constructor(db: Pool);
    createTransport(smtp_account_id: number): Promise<nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>>;
    send(input: SendInput): Promise<{
        messageId: string;
    }>;
}
export {};
//# sourceMappingURL=mailer.d.ts.map