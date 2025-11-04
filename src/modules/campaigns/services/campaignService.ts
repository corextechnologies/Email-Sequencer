import { Pool } from 'pg';
import { CampaignRepo } from '../repo/campaignRepo';
import { createCampaignSchema, updateCampaignSchema } from '../validators';
import { Campaign, CreateCampaignInput } from '../types';
import { CampaignStateMachine } from './stateMachine';
import { MailerService } from './mailer';

export class CampaignService {
	private repo: CampaignRepo;
	private stateMachine: CampaignStateMachine;
	private db: Pool;

	constructor(db: Pool) {
		this.db = db;
		this.repo = new CampaignRepo(db);
		this.stateMachine = new CampaignStateMachine(db);
	}

	async create(userId: number, input: unknown): Promise<Campaign> {
		const parsed = createCampaignSchema.parse(input);
		
		// If email account is provided, validate credentials before creating campaign
		if (parsed.from_email_account_id) {
			console.log(`🔐 Validating email account credentials for campaign creation...`);
			
			// Verify email account exists and belongs to user
			const accountRes = await this.db.query(
				`SELECT id, provider, username, smtp_host, smtp_port, encrypted_password, is_active 
				 FROM email_accounts 
				 WHERE id = $1 AND user_id = $2`,
				[parsed.from_email_account_id, userId]
			);
			
			if (accountRes.rows.length === 0) {
				throw new Error('EMAIL_ACCOUNT_NOT_FOUND: The selected email account was not found. Please select a different email account.');
			}
			
			const account = accountRes.rows[0];
			
			if (!account.is_active) {
				throw new Error('EMAIL_ACCOUNT_INACTIVE: Please activate your email account before creating a campaign.');
			}
			
			// Verify SMTP credentials are working
			console.log(`🔐 Verifying SMTP credentials for email account ${account.username} (${account.provider})...`);
			try {
				const mailer = new MailerService(this.db);
				const verification = await mailer.verifyCredentials(account.id);
				
				if (!verification.valid) {
					console.error(`❌ Email credentials invalid for ${account.username}: ${verification.error}`);
					throw new Error(`INVALID_EMAIL_CREDENTIALS: Your email account credentials are not working. Please update your email account settings.\n\nError: ${verification.error}`);
				} else {
					console.log(`✅ Email credentials verified successfully for ${account.username}`);
				}
			} catch (error: any) {
				// If it's already a formatted error, re-throw it
				if (error.message?.includes('INVALID_EMAIL_CREDENTIALS') || error.message?.includes('EMAIL_ACCOUNT')) {
					throw error;
				}
				// Otherwise, wrap it
				console.error(`❌ Error verifying email credentials:`, error);
				throw new Error(`INVALID_EMAIL_CREDENTIALS: Failed to verify email account credentials. Please check your email account settings.\n\nError: ${error.message || error}`);
			}
		}
		
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


