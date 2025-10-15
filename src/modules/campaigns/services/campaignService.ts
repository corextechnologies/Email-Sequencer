import { Pool } from 'pg';
import { CampaignRepo } from '../repo/campaignRepo';
import { createCampaignSchema, updateCampaignSchema } from '../validators';
import { Campaign, CreateCampaignInput } from '../types';
import { CampaignStateMachine } from './stateMachine';

export class CampaignService {
	private repo: CampaignRepo;
	private stateMachine: CampaignStateMachine;

	constructor(db: Pool) {
		this.repo = new CampaignRepo(db);
		this.stateMachine = new CampaignStateMachine(db);
	}

	async create(userId: number, input: unknown): Promise<Campaign> {
		const parsed = createCampaignSchema.parse(input);
		return this.repo.createCampaign(userId, parsed as CreateCampaignInput);
	}

	async list(userId: number): Promise<Campaign[]> {
		return this.repo.listCampaigns(userId);
	}

	async get(userId: number, id: number): Promise<Campaign | null> {
		return this.repo.getById(userId, id);
	}

	async update(userId: number, id: number, input: unknown): Promise<Campaign | null> {
		const parsed = updateCampaignSchema.parse(input);
		return this.repo.updateCampaign(userId, id, parsed);
	}

	async remove(userId: number, id: number): Promise<boolean> {
		return this.repo.deleteCampaign(userId, id);
	}

	async delete(userId: number, id: number): Promise<boolean> {
		// Use the state machine's delete method for proper cleanup
		return this.stateMachine.delete(userId, id);
	}

	async updateStatus(userId: number, id: number, status: string): Promise<Campaign | null> {
		return this.repo.updateStatus(userId, id, status);
	}

	async checkAndCompleteCampaign(campaignId: number): Promise<boolean> {
		return this.repo.checkAndCompleteCampaign(campaignId);
	}

	async getCampaignMetrics(userId: number, campaignId: number) {
		return this.repo.getCampaignMetrics(userId, campaignId);
	}
}


