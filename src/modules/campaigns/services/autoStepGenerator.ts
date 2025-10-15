import { Pool } from 'pg';
import { SequenceRepo } from '../repo/sequenceRepo';
import { Campaign } from '../types';

export class AutoStepGeneratorService {
	private sequenceRepo: SequenceRepo;

	constructor(db: Pool) {
		this.sequenceRepo = new SequenceRepo(db);
	}

	async generateStepsFromCampaign(userId: number, campaign: Campaign): Promise<void> {
		// NOTE: This service is deprecated and no longer used
		// The system now sends emails immediately without steps/sequences
		// Keeping this for backwards compatibility but it does nothing
		console.warn('AutoStepGeneratorService.generateStepsFromCampaign is deprecated and does nothing');
		return;
	}
}
