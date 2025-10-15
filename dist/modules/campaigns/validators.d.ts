import { z } from 'zod';
export declare const createCampaignSchema: z.ZodObject<{
    name: z.ZodString;
    email_subject: z.ZodOptional<z.ZodString>;
    email_body: z.ZodOptional<z.ZodString>;
    from_email_account_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}, {
    name: string;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}>;
export declare const updateCampaignStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["draft", "ready", "running", "paused", "completed", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "ready" | "running" | "paused" | "completed" | "cancelled";
}, {
    status: "draft" | "ready" | "running" | "paused" | "completed" | "cancelled";
}>;
export declare const updateCampaignSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email_subject: z.ZodOptional<z.ZodString>;
    email_body: z.ZodOptional<z.ZodString>;
    from_email_account_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}, {
    name?: string | undefined;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}>, {
    name?: string | undefined;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}, {
    name?: string | undefined;
    email_subject?: string | undefined;
    email_body?: string | undefined;
    from_email_account_id?: number | null | undefined;
}>;
export declare const stepSchema: z.ZodObject<{
    step_index: z.ZodOptional<z.ZodNumber>;
    delay_hours: z.ZodNumber;
    from_email_account_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    subject_template: z.ZodString;
    body_template: z.ZodString;
    prompt_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    enabled: boolean;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
}, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}>;
export declare const createStepsSchema: z.ZodUnion<[z.ZodObject<{
    step_index: z.ZodOptional<z.ZodNumber>;
    delay_hours: z.ZodNumber;
    from_email_account_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    subject_template: z.ZodString;
    body_template: z.ZodString;
    prompt_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    enabled: boolean;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
}, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}>, z.ZodArray<z.ZodObject<{
    step_index: z.ZodOptional<z.ZodNumber>;
    delay_hours: z.ZodNumber;
    from_email_account_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    subject_template: z.ZodString;
    body_template: z.ZodString;
    prompt_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    enabled: boolean;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
}, {
    delay_hours: number;
    subject_template: string;
    body_template: string;
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}>, "many">]>;
export declare const updateStepSchema: z.ZodEffects<z.ZodObject<{
    step_index: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    delay_hours: z.ZodOptional<z.ZodNumber>;
    from_email_account_id: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    subject_template: z.ZodOptional<z.ZodString>;
    body_template: z.ZodOptional<z.ZodString>;
    prompt_key: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    delay_hours?: number | undefined;
    subject_template?: string | undefined;
    body_template?: string | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}, {
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    delay_hours?: number | undefined;
    subject_template?: string | undefined;
    body_template?: string | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}>, {
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    delay_hours?: number | undefined;
    subject_template?: string | undefined;
    body_template?: string | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}, {
    from_email_account_id?: number | null | undefined;
    step_index?: number | undefined;
    delay_hours?: number | undefined;
    subject_template?: string | undefined;
    body_template?: string | undefined;
    prompt_key?: string | null | undefined;
    enabled?: boolean | undefined;
}>;
export declare const reorderStepsSchema: z.ZodEffects<z.ZodObject<{
    step_ids: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    step_ids: number[];
}, {
    step_ids: number[];
}>, {
    step_ids: number[];
}, {
    step_ids: number[];
}>;
export declare const attachContactsSchema: z.ZodObject<{
    contact_ids: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    contact_ids: number[];
}, {
    contact_ids: number[];
}>;
export declare const listContactsQuerySchema: z.ZodObject<{
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search: string;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map