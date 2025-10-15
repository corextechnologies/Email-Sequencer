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
export declare class ImapReplyDetector {
    private db;
    checkAllAccountsForReplies(): Promise<DetectedReply[]>;
    private getActiveEmailAccounts;
    private checkAccountForReplies;
    private processEmailForReplies;
    private findOriginalMessage;
    private extractMessageIdFromSubject;
}
//# sourceMappingURL=imapReplyDetector.d.ts.map