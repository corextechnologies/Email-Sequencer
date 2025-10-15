import { Pool } from 'pg';
import { Campaign } from '../types';
export declare class AutoStepGeneratorService {
    private sequenceRepo;
    constructor(db: Pool);
    generateStepsFromCampaign(userId: number, campaign: Campaign): Promise<void>;
}
//# sourceMappingURL=autoStepGenerator.d.ts.map