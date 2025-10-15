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
export declare class ReplyResponseService {
    private db;
    private mailer;
    constructor();
    sendReplyResponse(replyData: any, subject: string, content: string, userId: number): Promise<ReplyResponse>;
    getReplyResponses(replyId: number, userId: number): Promise<ReplyResponse[]>;
    getReplyWithResponses(replyId: number, userId: number): Promise<any>;
    private generateMessageId;
}
//# sourceMappingURL=replyResponseService.d.ts.map