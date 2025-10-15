export type CampaignStatus = 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
	id: number;
	user_id: number;
	name: string;
	status: CampaignStatus;
	
	// Simplified immediate send fields
	email_subject?: string | null;
	email_body?: string | null;
	from_email_account_id?: number | null;
	
	created_at: string;
	updated_at: string;
}

export interface SequenceStep {
	id: number;
	campaign_id: number;
	step_index: number;
	delay_hours: number;
	from_email_account_id: number | null;
	subject_template: string;
	body_template: string;
	prompt_key?: string | null;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface CampaignContactRow {
	campaign_contact_id: number;
	status: 'pending' | 'in_progress' | 'completed' | 'sent' | 'replied' | 'unsubscribed' | 'failed' | 'bounced';
	contact_id: number;
	first_name: string | null;
	last_name: string | null;
	email: string;
}

export interface Paginated<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}


