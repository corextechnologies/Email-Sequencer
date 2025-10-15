import { Pool } from 'pg';
import { SequenceStep } from '../types';
type GenerateInput = {
    num_steps?: number;
    tone?: string;
    CTA?: string;
    prompt_overrides?: Partial<Record<'sequence_subject' | 'sequence_body', string>>;
    step_id?: number;
};
export declare class AiGeneratorService {
    private db;
    private sequences;
    constructor(db: Pool);
    generateAndPersist(userId: number, campaignId: number, input: GenerateInput): Promise<SequenceStep[]>;
}
export {};
//# sourceMappingURL=aiGenerator.d.ts.map