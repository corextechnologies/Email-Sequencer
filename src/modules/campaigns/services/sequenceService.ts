import { Pool } from 'pg';
import { SequenceRepo } from '../repo/sequenceRepo';
import { createStepsSchema, updateStepSchema, reorderStepsSchema } from '../validators';
import { SequenceStep } from '../types';

export class SequenceService {
	private repo: SequenceRepo;

	constructor(db: Pool) {
		this.repo = new SequenceRepo(db);
	}

	async list(userId: number, campaignId: number): Promise<SequenceStep[]> {
		return this.repo.listSteps(userId, campaignId);
	}

	async create(userId: number, campaignId: number, input: unknown): Promise<SequenceStep[] | SequenceStep> {
		const parsed = createStepsSchema.parse(input);
		const stepsArray = Array.isArray(parsed) ? parsed : [parsed];
		const created = await this.repo.createSteps(userId, campaignId, stepsArray as any);
		return Array.isArray(parsed) ? created : created[0];
	}

	async update(userId: number, campaignId: number, stepId: number, input: unknown): Promise<SequenceStep | null> {
		const parsed = updateStepSchema.parse(input);
		return this.repo.updateStep(userId, campaignId, stepId, parsed as any);
	}

	async remove(userId: number, campaignId: number, stepId: number): Promise<boolean> {
		return this.repo.deleteStep(userId, campaignId, stepId);
	}

	async reorder(userId: number, campaignId: number, input: unknown): Promise<SequenceStep[]> {
		const parsed = reorderStepsSchema.parse(input);
		return this.repo.reorder(userId, campaignId, parsed.step_ids);
	}
}


