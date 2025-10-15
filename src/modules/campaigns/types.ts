export type CampaignStatus = 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'cancelled';
export type CampaignContactStatus = 'pending' | 'sent' | 'replied' | 'unsubscribed' | 'failed' | 'bounced';
export type MessageDirection = 'outbound' | 'inbound';
export type MessageStatus = 'sent' | 'delivered' | 'bounced' | 'failed' | 'read' | 'replied';
export type EventType = 'sent' | 'delivered' | 'replied' | 'unsubscribed' | 'bounced';

export interface Campaign {
	id: number;
	user_id: number;
	name: string;
	status: CampaignStatus;
	
	// Simplified immediate send fields
	email_subject?: string;
	email_body?: string;
	from_email_account_id?: number | null;
	
	created_at: string;
	updated_at: string;
}

export interface CreateCampaignInput {
	name: string;
	
	// Simplified immediate send fields
	email_subject?: string;
	email_body?: string;
	from_email_account_id?: number | null;
}

export interface CampaignContact {
	id: number;
	campaign_id: number;
	contact_id: number;
	status: CampaignContactStatus;
	error: string | null;
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

export interface Message {
	id: number;
	campaign_id: number;
	contact_id: number;
	step_id: number | null;
	direction: MessageDirection;
	smtp_account_id: number | null;
	provider_message_id: string | null;
	status: MessageStatus;
	timestamps: Record<string, any>;
	raw: Record<string, any>;
	created_at: string;
	updated_at: string;
}

export interface Event {
	id: number;
	campaign_id: number;
	contact_id: number;
	type: EventType;
	meta: Record<string, any>;
	occurred_at: string;
	created_at: string;
}


