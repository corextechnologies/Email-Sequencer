import { z } from 'zod';

export const createCampaignSchema = z.object({
	name: z.string().min(1).max(255),
	
	// Simplified immediate send fields
	email_subject: z.string().min(1).max(255).optional(),
	email_body: z.string().min(1).optional(),
	from_email_account_id: z.number().int().nullable().optional()
});

export const updateCampaignStatusSchema = z.object({
	status: z.enum(['draft','ready','running','paused','completed','cancelled'])
});

export const updateCampaignSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	
	// Simplified immediate send fields
	email_subject: z.string().min(1).max(255).optional(),
	email_body: z.string().min(1).optional(),
	from_email_account_id: z.number().int().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// Sequence step validators
export const stepSchema = z.object({
	step_index: z.number().int().min(0).optional(),
	delay_hours: z.number().int().min(0),
	from_email_account_id: z.number().int().nullable().optional(),
	subject_template: z.string().min(1),
	body_template: z.string().min(1),
	prompt_key: z.string().optional().nullable(),
	enabled: z.boolean().default(true)
});

export const createStepsSchema = z.union([
	stepSchema,
	z.array(stepSchema).min(1)
]);

export const updateStepSchema = stepSchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const reorderStepsSchema = z.object({
	step_ids: z.array(z.number().int().min(1)).min(1)
}).refine((data) => {
	const set = new Set<number>(data.step_ids);
	return set.size === data.step_ids.length;
}, { message: 'step_ids must be unique' });

// Targeting (allow duplicates; will be deduped in service)
export const attachContactsSchema = z.object({
	contact_ids: z.array(z.number().int().min(1)).min(1)
});

export const listContactsQuerySchema = z.object({
	search: z.string().trim().max(255).optional().default(''),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
});


