import { Pool } from 'pg';
import { Campaign, CreateCampaignInput } from '../types';
export declare class CampaignRepo {
    private db;
    constructor(db: Pool);
    createCampaign(userId: number, input: CreateCampaignInput): Promise<Campaign>;
    listCampaigns(userId: number): Promise<Campaign[]>;
    getById(userId: number, campaignId: number): Promise<Campaign | null>;
    updateCampaign(userId: number, campaignId: number, update: Partial<CreateCampaignInput>): Promise<Campaign | null>;
    deleteCampaign(userId: number, campaignId: number): Promise<boolean>;
    updateStatus(userId: number, campaignId: number, status: string): Promise<Campaign | null>;
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
    /**
     * Get email open metrics for a campaign
     */
    getEmailOpenMetrics(campaignId: number): Promise<{
        unique_opens: number;
        total_opens: number;
        avg_hours_to_open: number;
        open_rate: number;
    } | null>;
}
//# sourceMappingURL=campaignRepo.d.ts.map