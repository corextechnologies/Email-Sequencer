import { z } from 'zod';
import api from './api';
import { Campaign, SequenceStep, CampaignContactRow, Paginated } from '../types/campaigns';

const CampaignSchema = z.object({
	id: z.number(),
	user_id: z.number(),
	name: z.string(),
	status: z.enum(['draft','ready','running','paused','completed','cancelled']),
	
	// Simplified immediate send fields
	email_subject: z.string().nullable().optional(),
	email_body: z.string().nullable().optional(),
	from_email_account_id: z.number().nullable().optional(),
	
	created_at: z.string(),
	updated_at: z.string()
});

const CampaignListSchema = z.array(CampaignSchema);

const CampaignStatusOnlySchema = z.object({
	id: z.number(),
	status: z.enum(['draft','ready','running','paused','completed','cancelled'])
});

const StepSchema = z.object({
	id: z.number(),
	campaign_id: z.number(),
	step_index: z.number(),
	delay_hours: z.number(),
	from_email_account_id: z.number().nullable(),
	subject_template: z.string(),
	body_template: z.string(),
	prompt_key: z.string().nullable().optional(),
	enabled: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
});

const StepsListSchema = z.array(StepSchema);

const ContactRowSchema = z.object({
	campaign_contact_id: z.number(),
	status: z.enum(['pending','in_progress','completed','sent','replied','unsubscribed','failed','bounced']),
	contact_id: z.number(),
	first_name: z.string().nullable(),
	last_name: z.string().nullable(),
	email: z.string(),
	persona_id: z.string().nullable().optional()
});

const PaginatedContactsSchema = z.object({
	data: z.array(ContactRowSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number()
});

export class CampaignsService {
	// Campaigns
	async listCampaigns(): Promise<Campaign[]> {
		try {
			console.log('🔍 Fetching campaigns from API...');
			const res = await api.get('/campaigns');
			console.log('📡 API Response:', res.data);
			const parsed = CampaignListSchema.safeParse(res.data?.data ?? res.data);
			if (!parsed.success) {
				console.error('❌ Schema validation failed:', parsed.error);
				throw new Error(parsed.error.message);
			}
			console.log('✅ Campaigns loaded:', parsed.data.length);
			return parsed.data;
		} catch (error) {
			console.error('❌ Error fetching campaigns:', error);
			throw error;
		}
	}

	async createCampaign(payload: {
		name: string; 
		// Simplified workflow fields
		email_subject?: string;
		email_body?: string;
		from_email_account_id?: number;
	}): Promise<Campaign> {
		try {
			console.log('🔍 Creating campaign with payload:', payload);
			
			// Only send fields that the API accepts and are not empty
			const apiPayload: any = {
				name: payload.name
			};
			
			// Only include optional fields if they have values
			if (payload.email_subject && payload.email_subject.trim()) {
				apiPayload.email_subject = payload.email_subject.trim();
			}
			if (payload.email_body && payload.email_body.trim()) {
				apiPayload.email_body = payload.email_body.trim();
			}
			if (payload.from_email_account_id) {
				apiPayload.from_email_account_id = payload.from_email_account_id;
			}
			
			console.log('📤 Sending API payload:', apiPayload);
			const res = await api.post('/campaigns', apiPayload);
			console.log('📡 Create campaign response:', res.data);
			const parsed = CampaignSchema.safeParse(res.data?.data ?? res.data);
			if (!parsed.success) {
				console.error('❌ Schema validation failed:', parsed.error);
				throw new Error(parsed.error.message);
			}
			console.log('✅ Campaign created:', parsed.data.id);
			return parsed.data;
		} catch (error) {
			console.error('❌ Error creating campaign:', error);
			throw error;
		}
	}

	async getCampaign(id: number): Promise<Campaign> {
		const res = await api.get(`/campaigns/${id}`);
		const parsed = CampaignSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data;
	}

	async updateCampaign(id: number, payload: Partial<{ 
		name: string; 
		// Simplified immediate send fields
		email_subject?: string;
		email_body?: string;
		from_email_account_id?: number;
	}>): Promise<Campaign> {
		console.log(`🔄 updateCampaign API call - ID: ${id}`);
		console.log('📤 Payload being sent:', payload);
		
		const res = await api.put(`/campaigns/${id}`, payload);
		
		console.log('📥 API Response status:', res.status);
		console.log('📥 API Response data:', res.data);
		
		const parsed = CampaignSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) {
			console.error('❌ Schema validation failed:', parsed.error);
			throw new Error(parsed.error.message);
		}
		
		console.log('✅ Parsed campaign data:', parsed.data);
		return parsed.data;
	}

	async deleteCampaign(id: number): Promise<void> {
		await api.delete(`/campaigns/${id}`);
	}

	async updateCampaignStatus(id: number, status: 'draft'|'ready'|'running'|'paused'|'completed'|'cancelled'): Promise<Campaign> {
		const res = await api.patch(`/campaigns/${id}/status`, { status });
		const parsed = CampaignSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data;
	}

	// Steps
	async listSteps(campaignId: number): Promise<SequenceStep[]> {
		const res = await api.get(`/campaigns/${campaignId}/steps`);
		const parsed = StepsListSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data as SequenceStep[];
	}

	async createSteps(campaignId: number, payload: any): Promise<SequenceStep[] | SequenceStep> {
		const res = await api.post(`/campaigns/${campaignId}/steps`, payload);
		const arr = Array.isArray(res.data?.data ?? res.data) ? StepsListSchema.safeParse(res.data?.data ?? res.data) : StepSchema.safeParse(res.data?.data ?? res.data);
		if (!arr.success) throw new Error((arr as any).error.message);
		return (arr as any).data;
	}

	async updateStep(campaignId: number, stepId: number, payload: Partial<SequenceStep>): Promise<SequenceStep> {
		const res = await api.put(`/campaigns/${campaignId}/steps/${stepId}`, payload);
		const parsed = StepSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data;
	}

	async deleteStep(campaignId: number, stepId: number): Promise<void> {
		await api.delete(`/campaigns/${campaignId}/steps/${stepId}`);
	}

	async reorderSteps(campaignId: number, step_ids: number[]): Promise<SequenceStep[]> {
		const res = await api.patch(`/campaigns/${campaignId}/steps/reorder`, { step_ids });
		const parsed = StepsListSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data as SequenceStep[];
	}

	async generateSteps(campaignId: number, payload: { num_steps?: number; tone?: string; CTA?: string; prompt_overrides?: any; step_id?: number }): Promise<SequenceStep[]> {
		const res = await api.post(`/campaigns/${campaignId}/generate-steps`, payload);
		const parsed = StepsListSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data as SequenceStep[];
	}

	// Targeting
	async attachContacts(campaignId: number, contact_ids: number[]): Promise<{ inserted: number }> {
		const res = await api.post(`/campaigns/${campaignId}/contacts`, { contact_ids });
		const inserted = z.object({ inserted: z.number() }).safeParse(res.data?.data ?? res.data);
		if (!inserted.success) throw new Error(inserted.error.message);
		return inserted.data;
	}

	async listAttachedContacts(campaignId: number, params: { search?: string; page?: number; limit?: number }): Promise<Paginated<CampaignContactRow>> {
		const query = new URLSearchParams();
		if (params.search) query.append('search', params.search);
		if (params.page) query.append('page', String(params.page));
		if (params.limit) query.append('limit', String(params.limit));
		const res = await api.get(`/campaigns/${campaignId}/contacts${query.toString() ? `?${query.toString()}` : ''}`);
		const parsed = PaginatedContactsSchema.safeParse(res.data ?? res);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data as any;
	}

	async removeAttachedContact(campaignId: number, contactId: number): Promise<void> {
		await api.delete(`/campaigns/${campaignId}/contacts/${contactId}`);
	}

	// State machine
	async validateCampaign(campaignId: number): Promise<{ valid: boolean; reasons?: string[] }> {
		const res = await api.post(`/campaigns/${campaignId}/validate`);
		const data = (res.data?.data ?? res.data) as any;
		return { valid: !!data.valid, reasons: data.reasons };
	}

	async launchCampaign(campaignId: number): Promise<Campaign> {
		try {
			const res = await api.post(`/campaigns/${campaignId}/launch`);
			const parsed = CampaignStatusOnlySchema.safeParse(res.data?.data ?? res.data);
			if (!parsed.success) throw new Error(parsed.error.message);
			// merge minimal into a placeholder campaign object if needed
			return { id: parsed.data.id, status: parsed.data.status } as any;
		} catch (error: any) {
			// Handle specific error cases
			if (error.response?.status === 409) {
				throw new Error('Campaign cannot be launched from its current status. Please reset it to draft first.');
			}
			if (error.response?.status === 400 && error.response?.data?.error?.code === 'VALIDATION_FAILED') {
				throw new Error('Campaign validation failed. Please check that all required fields are filled.');
			}
			throw error;
		}
	}

	async pauseCampaign(campaignId: number): Promise<Campaign> {
		const res = await api.post(`/campaigns/${campaignId}/pause`);
		const parsed = CampaignStatusOnlySchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return { id: parsed.data.id, status: parsed.data.status } as any;
	}

	async resumeCampaign(campaignId: number): Promise<Campaign> {
		const res = await api.post(`/campaigns/${campaignId}/resume`);
		const parsed = CampaignStatusOnlySchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return { id: parsed.data.id, status: parsed.data.status } as any;
	}

	async cancelCampaign(campaignId: number): Promise<Campaign> {
		const res = await api.post(`/campaigns/${campaignId}/cancel`);
		const parsed = CampaignStatusOnlySchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return { id: parsed.data.id, status: parsed.data.status } as any;
	}

	async resetCampaignToDraft(campaignId: number): Promise<Campaign> {
		const res = await api.patch(`/campaigns/${campaignId}/status`, { status: 'draft' });
		const parsed = CampaignSchema.safeParse(res.data?.data ?? res.data);
		if (!parsed.success) throw new Error(parsed.error.message);
		return parsed.data;
	}

	async canLaunchCampaign(campaignId: number): Promise<{ canLaunch: boolean; reason?: string }> {
		try {
			const validation = await this.validateCampaign(campaignId);
			if (!validation.valid) {
				return { 
					canLaunch: false, 
					reason: `Campaign validation failed: ${validation.reasons?.join(', ')}` 
				};
			}
			return { canLaunch: true };
		} catch (error: any) {
			return { 
				canLaunch: false, 
				reason: `Cannot validate campaign: ${error.message}` 
			};
		}
	}

	// Campaign Metrics
	async getCampaignMetrics(campaignId: number): Promise<{
		recipients: number;
		sent: number;
		failed: number;
		bounced: number;
		replies: number;
		unsubscribes: number;
		clickRate: number;
		replyRate: number;
		progress: { completed: number; total: number };
	}> {
		try {
			console.log('🔍 Fetching campaign metrics for ID:', campaignId);
			const res = await api.get(`/campaigns/${campaignId}/metrics`);
			console.log('📡 Campaign metrics response:', res.data);
			
			const metricsSchema = z.object({
				recipients: z.number(),
				sent: z.number(),
				failed: z.number(),
				bounced: z.number(),
				replies: z.number(),
				unsubscribes: z.number(),
				clickRate: z.number(),
				replyRate: z.number(),
				progress: z.object({
					completed: z.number(),
					total: z.number()
				})
			});

			const parsed = metricsSchema.safeParse(res.data?.data ?? res.data);
			if (!parsed.success) {
				console.error('❌ Campaign metrics schema validation failed:', parsed.error);
				throw new Error(parsed.error.message);
			}
			
			console.log('✅ Campaign metrics loaded:', parsed.data);
			return parsed.data;
		} catch (error) {
			console.error('❌ Error fetching campaign metrics:', error);
			throw error;
		}
	}
}

export const campaignsService = new CampaignsService();


