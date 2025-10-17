import { DetectedReply } from './imapReplyDetector';
export declare class ReplyProcessor {
    private db;
    private ensureDatabaseConnection;
    processReply(reply: DetectedReply): Promise<void>;
    processMultipleReplies(replies: DetectedReply[]): Promise<void>;
}
//# sourceMappingURL=replyProcessor.d.ts.map