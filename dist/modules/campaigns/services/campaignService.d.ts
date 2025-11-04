import { Pool } from 'pg';
import { Campaign } from '../types';
export declare class CampaignService {
    private repo;
    private stateMachine;
    private db;
    constructor(db: Pool);
    create(userId: number, input: unknown): Promise<Campaign>;
    list(userId: number): Promise<Campaign[]>;
    get(userId: number, id: number): Promise<Campaign | null>;
    update(userId: number, id: number, input: unknown): Promise<Campaign | null>;
    remove(userId: number, id: number): Promise<boolean>;
    delete(userId: number, id: number): Promise<boolean>;
    updateStatus(userId: number, id: number, status: string): Promise<Campaign | null>;
    checkAndCompleteCampaign(campaignId: number): Promise<boolean>;
    getCampaignMetrics(userId: number, campaignId: number): Promise<{
        recipients: number;
        sent: number;
        failed: number;
        bounced: number;
        replies: number;
        unsubscribes: number;
        clickRate: number;
        replyRate: number;
        progress: {
            completed: number;
            total: number;
        };
    } | null>;
}
//# sourceMappingURL=campaignService.d.ts.map