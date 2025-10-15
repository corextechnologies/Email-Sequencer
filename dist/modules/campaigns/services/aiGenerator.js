"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGeneratorService = void 0;
const sequenceRepo_1 = require("../repo/sequenceRepo");
class AiGeneratorService {
    constructor(db) {
        this.db = db;
        this.sequences = new sequenceRepo_1.SequenceRepo(db);
    }
    async generateAndPersist(userId, campaignId, input) {
        // Ownership check
        const camp = await this.db.query(`SELECT id, user_id, name FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
        if (camp.rowCount === 0) {
            throw new Error('NOT_FOUND');
        }
        // Load prompts (defaults + overrides)
        const defaults = await this.db.query(`SELECT key, content FROM prompt_library WHERE key IN ('sequence_subject','sequence_body')`);
        const userOverrides = await this.db.query(`SELECT key, content FROM user_prompts WHERE user_id = $1 AND key IN ('sequence_subject','sequence_body')`, [userId]);
        const merged = {};
        for (const d of defaults.rows)
            merged[d.key] = d.content;
        for (const o of userOverrides.rows)
            merged[o.key] = o.content;
        if (input.prompt_overrides) {
            for (const [k, v] of Object.entries(input.prompt_overrides)) {
                if (v)
                    merged[k] = v;
            }
        }
        // Vars
        const user = await this.db.query(`SELECT id, email FROM users WHERE id = $1`, [userId]);
        const userEmail = user.rows[0]?.email ?? '';
        const domain = userEmail.includes('@') ? userEmail.split('@')[1] : 'example.com';
        const company = { name: domain.split('.')[0] };
        const campaign = camp.rows[0];
        const toneText = input.tone ? ` Tone: ${input.tone}.` : '';
        const ctaText = input.CTA ? ` CTA: ${input.CTA}.` : '';
        // Find provider key (optional)
        const keyRow = await this.db.query(`SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`, [userId]);
        const provider = keyRow.rows[0]?.provider || 'openai';
        // real key not needed for mock provider here; generation is placeholder
        // Existing steps
        const existing = await this.db.query(`SELECT id, step_index, delay_hours, from_email_account_id FROM sequence_steps WHERE campaign_id = $1 ORDER BY step_index`, [campaignId]);
        const existingCount = existing.rowCount ?? existing.rows.length ?? 0;
        const targetCount = existingCount > 0 ? existingCount : (input.num_steps || 2);
        // Helper to render template with vars
        const render = (tpl, idx) => {
            return tpl
                .replace(/\{\{user\.name\}\}/g, userEmail.split('@')[0])
                .replace(/\{\{company\.name\}\}/g, company.name)
                .replace(/\{\{campaign\.purpose\}\}/g, campaign.name)
                .replace(/\{\{contact\.first_name\}\}/g, 'there')
                .replace(/\{\{persona\}\}/g, 'prospect')
                + `${toneText}${ctaText}`;
        };
        const subjectTpl = merged['sequence_subject'] || 'Subject: Follow up with {{company.name}}';
        const bodyTpl = merged['sequence_body'] || 'Hi {{contact.first_name}}, I\'m {{user.name}} from {{company.name}}. {{campaign.purpose}}';
        const results = [];
        if (input.step_id) {
            // Regenerate a single step subject/body by its index
            const found = existing.rows.find((r) => r.id === input.step_id);
            if (!found)
                throw new Error('STEP_NOT_FOUND');
            const idx = found.step_index;
            const updated = await this.sequences.updateStep(userId, campaignId, found.id, {
                subject_template: render(subjectTpl, idx),
                body_template: render(bodyTpl, idx)
            });
            return updated ? [updated] : [];
        }
        else if (existingCount === 0) {
            // Create steps with default delays 0, 48h, 96h ...
            const toCreate = [];
            for (let i = 0; i < targetCount; i++) {
                toCreate.push({
                    delay_hours: i === 0 ? 0 : 48 * i,
                    from_email_account_id: null,
                    subject_template: render(subjectTpl, i),
                    body_template: render(bodyTpl, i),
                    enabled: true
                });
            }
            const created = await this.sequences.createSteps(userId, campaignId, toCreate);
            results.push(...created);
        }
        else {
            // Update subject/body for existing steps
            for (let i = 0; i < existing.rows.length; i++) {
                const step = existing.rows[i];
                const updated = await this.sequences.updateStep(userId, campaignId, step.id, {
                    subject_template: render(subjectTpl, i),
                    body_template: render(bodyTpl, i)
                });
                if (updated)
                    results.push(updated);
            }
        }
        return results;
    }
}
exports.AiGeneratorService = AiGeneratorService;
//# sourceMappingURL=aiGenerator.js.map