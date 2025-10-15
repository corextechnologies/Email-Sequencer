import { Pool } from 'pg';
import { SequenceStep } from '../types';
export declare class SequenceService {
    private repo;
    constructor(db: Pool);
    list(userId: number, campaignId: number): Promise<SequenceStep[]>;
    create(userId: number, campaignId: number, input: unknown): Promise<SequenceStep[] | SequenceStep>;
    update(userId: number, campaignId: number, stepId: number, input: unknown): Promise<SequenceStep | null>;
    remove(userId: number, campaignId: number, stepId: number): Promise<boolean>;
    reorder(userId: number, campaignId: number, input: unknown): Promise<SequenceStep[]>;
}
//# sourceMappingURL=sequenceService.d.ts.map