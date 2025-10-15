import { Pool } from 'pg';
import { Campaign, CreateCampaignInput } from '../types';

export class CampaignRepo {
	private db: Pool;

	constructor(db: Pool) {
		this.db = db;
	}

	async createCampaign(userId: number, input: CreateCampaignInput): Promise<Campaign> {
		const { 
			name, 
			email_subject,
			email_body,
			from_email_account_id
		} = input;
		const result = await this.db.query(
			`INSERT INTO campaigns (user_id, name, email_subject, email_body, from_email_account_id)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, user_id, name, status, email_subject, email_body, from_email_account_id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`,
			[userId, name, email_subject, email_body, from_email_account_id]
		);
		return result.rows[0];
	}

	async listCampaigns(userId: number): Promise<Campaign[]> {
		const result = await this.db.query(
			`SELECT id, user_id, name, status, email_subject, email_body, from_email_account_id,
			 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
			FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC`,
			[userId]
		);
		return result.rows;
	}

	async getById(userId: number, campaignId: number): Promise<Campaign | null> {
		const result = await this.db.query(
			`SELECT id, user_id, name, status, email_subject, email_body, from_email_account_id,
			 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
			FROM campaigns WHERE id = $1 AND user_id = $2`,
			[campaignId, userId]
		);
		return result.rows[0] || null;
	}

	async updateCampaign(userId: number, campaignId: number, update: Partial<CreateCampaignInput>): Promise<Campaign | null> {
		const fields: string[] = [];
		const values: any[] = [];
		let idx = 1;
		if (update.name !== undefined) { fields.push(`name = $${idx++}`); values.push(update.name); }
		if (update.email_subject !== undefined) { fields.push(`email_subject = $${idx++}`); values.push(update.email_subject); }
		if (update.email_body !== undefined) { fields.push(`email_body = $${idx++}`); values.push(update.email_body); }
		if (update.from_email_account_id !== undefined) { fields.push(`from_email_account_id = $${idx++}`); values.push(update.from_email_account_id); }
		if (fields.length === 0) { return await this.getById(userId, campaignId); }
		values.push(campaignId, userId);
		const result = await this.db.query(
			`UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++}
			 RETURNING id, user_id, name, status, email_subject, email_body, from_email_account_id,
			 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`,
			values
		);
		return result.rows[0] || null;
	}

	async deleteCampaign(userId: number, campaignId: number): Promise<boolean> {
		// Allow delete if status in (draft, paused, completed)
		const check = await this.db.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
		if (check.rowCount === 0) return false;
		if (!['draft','paused','completed'].includes(check.rows[0].status)) return false;
		const result = await this.db.query(`DELETE FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
		return (result.rowCount ?? 0) > 0;
	}

	async updateStatus(userId: number, campaignId: number, status: string): Promise<Campaign | null> {
		const result = await this.db.query(
			`UPDATE campaigns SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id, user_id, name, status,
			 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`,
			[status, campaignId, userId]
		);
		return result.rows[0] || null;
	}

	async checkAndCompleteCampaign(campaignId: number): Promise<boolean> {
		// Check if all contacts in the campaign have been processed (sent or failed)
		const result = await this.db.query(
			`SELECT 
				COUNT(*) as total_contacts,
				COUNT(CASE WHEN status IN ('sent', 'failed') THEN 1 END) as processed_contacts
			FROM campaign_contacts 
			WHERE campaign_id = $1`,
			[campaignId]
		);

		if (result.rows.length === 0) {
			return false;
		}

		const { total_contacts, processed_contacts } = result.rows[0];
		
		// If all contacts have been processed, mark campaign as completed
		if (parseInt(total_contacts) > 0 && parseInt(processed_contacts) === parseInt(total_contacts)) {
			await this.db.query(
				`UPDATE campaigns SET status = 'completed' WHERE id = $1 AND status = 'running'`,
				[campaignId]
			);
			console.log(`Campaign ${campaignId} marked as completed - all ${total_contacts} contacts processed`);
			return true;
		}

		return false;
	}

	async getCampaignMetrics(userId: number, campaignId: number): Promise<{
		recipients: number;
		sent: number;
		failed: number;
		bounced: number;
		replies: number;
		unsubscribes: number;
		clickRate: number;
		replyRate: number;
		progress: { completed: number; total: number };
	} | null> {
		// First verify the campaign belongs to the user
		const campaignCheck = await this.db.query(
			`SELECT id FROM campaigns WHERE id = $1 AND user_id = $2`,
			[campaignId, userId]
		);

		if (campaignCheck.rows.length === 0) {
			return null;
		}

		// Get comprehensive campaign metrics (sequence-aware)
		const result = await this.db.query(
			`SELECT 
				-- Total contacts in campaign
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1) as recipients,
				
				-- Actual emails sent (from messages table)
				(SELECT COUNT(*) 
				 FROM messages 
				 WHERE campaign_id = $1 AND status = 'sent') as sent,
				
				-- Total emails planned to send (sum of all sequences)
				(SELECT COALESCE(SUM(total_emails), 0) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1) as total_emails,
				
				-- Contact-level statuses
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1 AND status = 'failed') as failed,
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1 AND status = 'bounced') as bounced,
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1 AND status = 'replied') as replies,
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1 AND status = 'unsubscribed') as unsubscribes,
				
				-- Contacts fully completed
				(SELECT COUNT(*) 
				 FROM campaign_contacts 
				 WHERE campaign_id = $1 AND status = 'completed') as completed_contacts
			`,
			[campaignId]
		);

		if (result.rows.length === 0) {
			return {
				recipients: 0,
				sent: 0,
				failed: 0,
				bounced: 0,
				replies: 0,
				unsubscribes: 0,
				clickRate: 0,
				replyRate: 0,
				progress: { completed: 0, total: 0 }
			};
		}

		const metrics = result.rows[0];
		const recipients = parseInt(metrics.recipients) || 0;
		const sent = parseInt(metrics.sent) || 0;
		const totalEmails = parseInt(metrics.total_emails) || 0;
		const completedContacts = parseInt(metrics.completed_contacts) || 0;
		const replies = parseInt(metrics.replies) || 0;

		// Calculate rates
		const clickRate = 0; // TODO: Implement click tracking
		const replyRate = sent > 0 ? (replies / sent) * 100 : 0;

		return {
			recipients,
			sent, // Actual emails sent from messages table
			failed: parseInt(metrics.failed) || 0,
			bounced: parseInt(metrics.bounced) || 0,
			replies,
			unsubscribes: parseInt(metrics.unsubscribes) || 0,
			clickRate,
			replyRate: Math.round(replyRate * 10) / 10,
			progress: { 
				completed: sent,        // Emails actually sent
				total: totalEmails      // Total emails to send (sum of all sequences)
			}
		};
	}

	/**
	 * Get email open metrics for a campaign
	 */
	async getEmailOpenMetrics(campaignId: number): Promise<{
		unique_opens: number;
		total_opens: number;
		avg_hours_to_open: number;
		open_rate: number;
	} | null> {
		// First verify the campaign exists
		const campaignCheck = await this.db.query(
			`SELECT id FROM campaigns WHERE id = $1`,
			[campaignId]
		);

		if (campaignCheck.rows.length === 0) {
			return null;
		}

		const result = await this.db.query(`
			SELECT 
				COUNT(DISTINCT eo.contact_id) as unique_opens,
				COUNT(eo.id) as total_opens,
				AVG(EXTRACT(EPOCH FROM (eo.opened_at - cc.sequence_started_at))/3600) as avg_hours_to_open,
				-- Calculate open rate as unique opens / total contacts
				ROUND(
					(COUNT(DISTINCT eo.contact_id)::DECIMAL / 
					 (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = $1)) * 100, 
					2
				) as open_rate
			FROM email_opens eo
			JOIN campaign_contacts cc ON cc.campaign_id = eo.campaign_id AND cc.contact_id = eo.contact_id
			WHERE eo.campaign_id = $1
		`, [campaignId]);
		
		const metrics = result.rows[0];
		return {
			unique_opens: parseInt(metrics.unique_opens) || 0,
			total_opens: parseInt(metrics.total_opens) || 0,
			avg_hours_to_open: parseFloat(metrics.avg_hours_to_open) || 0,
			open_rate: parseFloat(metrics.open_rate) || 0
		};
	}
}
