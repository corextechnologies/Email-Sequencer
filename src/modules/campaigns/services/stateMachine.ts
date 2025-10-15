import { Pool } from 'pg';
import { JobQueue } from './queue';
import { Campaign } from '../types';

export class CampaignStateMachine {
	private queue: JobQueue;
	
	constructor(private db: Pool) {
		this.queue = new JobQueue(db);
	}

	async validate(userId: number, campaignId: number): Promise<{ valid: boolean; reasons?: string[] }> {
		try {
			console.log(`🔍 Starting validation for campaign ${campaignId}, user ${userId}`);
			
			const reasons: string[] = [];
			const camp = await this.db.query(`SELECT id, status, email_subject, email_body, from_email_account_id FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
			
			console.log(`📊 Campaign query result: rowCount=${camp.rowCount}`);
			
			if (camp.rowCount === 0) {
				console.log(`❌ Campaign not found`);
				return { valid: false, reasons: ['NOT_FOUND'] };
			}
			
			const campaign = camp.rows[0];
			console.log(`📋 Campaign data:`, { 
				id: campaign.id, 
				status: campaign.status,
				hasSubject: !!campaign.email_subject,
				hasBody: !!campaign.email_body,
				fromAccountId: campaign.from_email_account_id
			});
			
			const contacts = await this.db.query(`SELECT COUNT(*)::int AS c FROM campaign_contacts WHERE campaign_id = $1`, [campaignId]);
			const contactCount = contacts.rows[0]?.c ?? 0;
			console.log(`👥 Contact count: ${contactCount}`);
			
			// Check contacts
			if (contactCount < 1) {
				console.log(`❌ No contacts attached`);
				reasons.push('NO_CONTACTS');
			}
			
			// Check email account
			if (!campaign.from_email_account_id) {
				console.log(`❌ Missing from_email_account_id`);
				reasons.push('NO_FROM_ACCOUNT');
			}
			
			// Check if contacts have sequences or campaign has template
			const sequencesCount = await this.db.query(
				`SELECT COUNT(DISTINCT contact_id)::int AS c 
				 FROM campaign_emails 
				 WHERE campaign_id = $1`, 
				[campaignId]
			);
			const contactsWithSequences = sequencesCount.rows[0]?.c ?? 0;
			console.log(`📧 Contacts with sequences: ${contactsWithSequences}/${contactCount}`);
			
			const hasCampaignTemplate = campaign.email_subject && campaign.email_body;
			const allContactsHaveSequences = contactsWithSequences === contactCount;
			
			// Validation logic: Either all contacts have sequences OR campaign has template
			if (!allContactsHaveSequences && !hasCampaignTemplate) {
				console.log(`❌ Some contacts missing sequences and no campaign template`);
				reasons.push('MISSING_EMAIL_CONTENT');
			}
			
			console.log(`📊 Email content status:`, {
				contactsWithSequences,
				totalContacts: contactCount,
				hasCampaignTemplate,
				allContactsHaveSequences
			});
			
			const result = { valid: reasons.length === 0, reasons: reasons.length ? reasons : undefined };
			console.log(`✅ Validation complete:`, result);
			
			return result;
		} catch (error: any) {
			console.error(`❌ Error in validate():`, error);
			throw error;
		}
	}

	private async updateStatus(userId: number, campaignId: number, from: string[], to: string): Promise<{ id: number; status: string } | null> {
		const result = await this.db.query(
			`UPDATE campaigns SET status = $1 WHERE id = $2 AND user_id = $3 AND status = ANY($4::text[]) RETURNING id, status`,
			[to, campaignId, userId, from]
		);
		return result.rows[0] || null;
	}

	async launch(userId: number, campaignId: number): Promise<{ id: number; status: string }> {
		const v = await this.validate(userId, campaignId);
		if (!v.valid) throw new Error(`VALIDATION_FAILED:${(v.reasons||[]).join(',')}`);
		const updated = await this.updateStatus(userId, campaignId, ['draft','ready'], 'running');
		if (!updated) throw new Error('ILLEGAL_TRANSITION');
		
		console.log(`🚀 Launching campaign ${campaignId}...`);
		
		// Get all pending contacts
		const contacts = await this.db.query(`SELECT contact_id FROM campaign_contacts WHERE campaign_id = $1 AND status = 'pending'`, [campaignId]);
		
		for (const row of contacts.rows) {
			const contactId = row.contact_id;
			
			// Check if this contact has a saved email sequence
			const sequenceCheck = await this.db.query(
				`SELECT email_number, day FROM campaign_emails 
				 WHERE campaign_id = $1 AND contact_id = $2 
				 ORDER BY email_number ASC`,
				[campaignId, contactId]
			);
			
			if (sequenceCheck.rows.length > 0) {
				// Contact has a sequence - initialize progress and enqueue first email only
				const totalEmails = sequenceCheck.rows.length;
				const firstEmail = sequenceCheck.rows[0];
				
				console.log(`📊 Contact ${contactId} has sequence: ${totalEmails} emails`);
				
				// Initialize sequence progress with sequence_started_at
				await this.db.query(
					`UPDATE campaign_contacts 
					 SET total_emails = $1,
					     current_email_number = 1,
					     next_email_send_at = NOW(),
					     sequence_started_at = NOW()
					 WHERE campaign_id = $2 AND contact_id = $3`,
					[totalEmails, campaignId, contactId]
				);
				
				// Enqueue ONLY the first email (Day 0)
				await this.queue.enqueue('send-email', 
					{ campaign_id: campaignId, contact_id: contactId },
					{
						idempotencyKey: `${campaignId}:${contactId}:1`,
						runAt: new Date(), // First email sends immediately
						maxAttempts: 3
					}
				);
				
				console.log(`✅ Enqueued email 1/${totalEmails} for contact ${contactId}`);
			} else {
				// No sequence - use campaign template (backward compatibility)
				console.log(`📧 Contact ${contactId} has no sequence, will use campaign template`);
				
				await this.queue.enqueue('send-email', 
					{ campaign_id: campaignId, contact_id: contactId },
					{
						idempotencyKey: `${campaignId}:${contactId}`,
						runAt: new Date(),
						maxAttempts: 3
					}
				);
			}
		}
		
		console.log(`✅ Campaign ${campaignId} launched with ${contacts.rows.length} contacts`);
		
		return updated;
	}

	private async getCampaign(userId: number, campaignId: number): Promise<Campaign | null> {
		const result = await this.db.query(
			'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
			[campaignId, userId]
		);
		return result.rows[0] || null;
	}

	async pause(userId: number, campaignId: number): Promise<{ id: number; status: string }> {
		const updated = await this.updateStatus(userId, campaignId, ['running'], 'paused');
		if (!updated) throw new Error('ILLEGAL_TRANSITION');
		return updated;
	}

	async resume(userId: number, campaignId: number): Promise<{ id: number; status: string }> {
		const updated = await this.updateStatus(userId, campaignId, ['paused'], 'running');
		if (!updated) throw new Error('ILLEGAL_TRANSITION');
		return updated;
	}

	async cancel(userId: number, campaignId: number): Promise<{ id: number; status: string }> {
		const updated = await this.updateStatus(userId, campaignId, ['draft','ready','running','paused'], 'cancelled');
		if (!updated) throw new Error('ILLEGAL_TRANSITION');
		return updated;
	}

	async complete(userId: number, campaignId: number): Promise<{ id: number; status: string }> {
		const updated = await this.updateStatus(userId, campaignId, ['running'], 'completed');
		if (!updated) throw new Error('ILLEGAL_TRANSITION');
		return updated;
	}

	async delete(userId: number, campaignId: number): Promise<boolean> {
		// Only allow delete if status in (draft, paused, completed)
		const check = await this.db.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
		if (check.rowCount === 0) return false;
		if (!['draft','paused','completed'].includes(check.rows[0].status)) return false;
		
		// Delete related data first (in order to respect foreign key constraints)
		await this.db.query(`DELETE FROM unsubscribe_tokens WHERE campaign_id = $1`, [campaignId]);
		await this.db.query(`DELETE FROM events WHERE campaign_id = $1`, [campaignId]);
		await this.db.query(`DELETE FROM messages WHERE campaign_id = $1`, [campaignId]);
		await this.db.query(`DELETE FROM campaign_contacts WHERE campaign_id = $1`, [campaignId]);
		
		// Finally delete the campaign
		const result = await this.db.query(`DELETE FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
		return (result.rowCount ?? 0) > 0;
	}
}


