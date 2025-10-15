import { Pool } from 'pg';
import { SequenceStep } from '../types';
export declare class SequenceRepo {
    private db;
    constructor(db: Pool);
    listSteps(userId: number, campaignId: number): Promise<SequenceStep[]>;
    createSteps(userId: number, campaignId: number, steps: Omit<SequenceStep, 'id' | 'created_at' | 'updated_at' | 'campaign_id'>[]): Promise<SequenceStep[]>;
    updateStep(userId: number, campaignId: number, stepId: number, update: Partial<SequenceStep>): Promise<SequenceStep | null>;
    deleteStep(userId: number, campaignId: number, stepId: number): Promise<boolean>;
    reorder(userId: number, campaignId: number, stepIds: number[]): Promise<SequenceStep[]>;
    private withTransaction;
}
//# sourceMappingURL=sequenceRepo.d.ts.map