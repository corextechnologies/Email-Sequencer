import { Pool } from 'pg';
export declare class CampaignStateMachine {
    private db;
    private queue;
    constructor(db: Pool);
    validate(userId: number, campaignId: number): Promise<{
        valid: boolean;
        reasons?: string[];
    }>;
    private updateStatus;
    launch(userId: number, campaignId: number): Promise<{
        id: number;
        status: string;
    }>;
    private getCampaign;
    pause(userId: number, campaignId: number): Promise<{
        id: number;
        status: string;
    }>;
    resume(userId: number, campaignId: number): Promise<{
        id: number;
        status: string;
    }>;
    cancel(userId: number, campaignId: number): Promise<{
        id: number;
        status: string;
    }>;
    complete(userId: number, campaignId: number): Promise<{
        id: number;
        status: string;
    }>;
    delete(userId: number, campaignId: number): Promise<boolean>;
}
//# sourceMappingURL=stateMachine.d.ts.map