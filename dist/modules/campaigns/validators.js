"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listContactsQuerySchema = exports.attachContactsSchema = exports.reorderStepsSchema = exports.updateStepSchema = exports.createStepsSchema = exports.stepSchema = exports.updateCampaignSchema = exports.updateCampaignStatusSchema = exports.createCampaignSchema = void 0;
const zod_1 = require("zod");
exports.createCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    // Simplified immediate send fields
    email_subject: zod_1.z.string().min(1).max(255).optional(),
    email_body: zod_1.z.string().min(1).optional(),
    from_email_account_id: zod_1.z.number().int().nullable().optional()
});
exports.updateCampaignStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['draft', 'ready', 'running', 'paused', 'completed', 'cancelled'])
});
exports.updateCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    // Simplified immediate send fields
    email_subject: zod_1.z.string().min(1).max(255).optional(),
    email_body: zod_1.z.string().min(1).optional(),
    from_email_account_id: zod_1.z.number().int().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });
// Sequence step validators
exports.stepSchema = zod_1.z.object({
    step_index: zod_1.z.number().int().min(0).optional(),
    delay_hours: zod_1.z.number().int().min(0),
    from_email_account_id: zod_1.z.number().int().nullable().optional(),
    subject_template: zod_1.z.string().min(1),
    body_template: zod_1.z.string().min(1),
    prompt_key: zod_1.z.string().optional().nullable(),
    enabled: zod_1.z.boolean().default(true)
});
exports.createStepsSchema = zod_1.z.union([
    exports.stepSchema,
    zod_1.z.array(exports.stepSchema).min(1)
]);
exports.updateStepSchema = exports.stepSchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });
exports.reorderStepsSchema = zod_1.z.object({
    step_ids: zod_1.z.array(zod_1.z.number().int().min(1)).min(1)
}).refine((data) => {
    const set = new Set(data.step_ids);
    return set.size === data.step_ids.length;
}, { message: 'step_ids must be unique' });
// Targeting (allow duplicates; will be deduped in service)
exports.attachContactsSchema = zod_1.z.object({
    contact_ids: zod_1.z.array(zod_1.z.number().int().min(1)).min(1)
});
exports.listContactsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(255).optional().default(''),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20)
});
//# sourceMappingURL=validators.js.map