"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceRepo = void 0;
class SequenceRepo {
    constructor(db) {
        this.db = db;
    }
    async listSteps(userId, campaignId) {
        const result = await this.db.query(`SELECT s.id, s.campaign_id, s.step_index, s.delay_hours, s.from_email_account_id,
			 s.subject_template, s.body_template, s.prompt_key, s.enabled,
			 to_char(s.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(s.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
			FROM sequence_steps s JOIN campaigns c ON c.id = s.campaign_id
			WHERE s.campaign_id = $1 AND c.user_id = $2
			ORDER BY s.step_index ASC`, [campaignId, userId]);
        return result.rows;
    }
    async createSteps(userId, campaignId, steps) {
        return await this.withTransaction(async (client) => {
            const guard = await client.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2 FOR UPDATE`, [campaignId, userId]);
            if (guard.rowCount === 0) {
                throw new Error('CAMPAIGN_NOT_FOUND');
            }
            if (guard.rows[0].status === 'running') {
                throw new Error('CAMPAIGN_RUNNING');
            }
            // Get current max index
            const cur = await client.query(`SELECT COALESCE(MAX(step_index), -1) AS max_idx FROM sequence_steps WHERE campaign_id = $1`, [campaignId]);
            let nextIndex = (cur.rows[0]?.max_idx ?? -1) + 1;
            const created = [];
            for (const s of steps) {
                const result = await client.query(`INSERT INTO sequence_steps (campaign_id, step_index, delay_hours, from_email_account_id, subject_template, body_template, prompt_key, enabled)
					 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
					 RETURNING id, campaign_id, step_index, delay_hours, from_email_account_id, subject_template, body_template, prompt_key, enabled,
					 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
					 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`, [campaignId, nextIndex++, s.delay_hours, s.from_email_account_id ?? null, s.subject_template, s.body_template, s.prompt_key ?? null, s.enabled]);
                created.push(result.rows[0]);
            }
            return created;
        });
    }
    async updateStep(userId, campaignId, stepId, update) {
        return await this.withTransaction(async (client) => {
            const guard = await client.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2 FOR UPDATE`, [campaignId, userId]);
            if (guard.rowCount === 0) {
                throw new Error('CAMPAIGN_NOT_FOUND');
            }
            if (guard.rows[0].status === 'running') {
                throw new Error('CAMPAIGN_RUNNING');
            }
            const fields = [];
            const values = [];
            let idx = 1;
            if (update.delay_hours !== undefined) {
                fields.push(`delay_hours = $${idx++}`);
                values.push(update.delay_hours);
            }
            if (update.from_email_account_id !== undefined) {
                fields.push(`from_email_account_id = $${idx++}`);
                values.push(update.from_email_account_id);
            }
            if (update.subject_template !== undefined) {
                fields.push(`subject_template = $${idx++}`);
                values.push(update.subject_template);
            }
            if (update.body_template !== undefined) {
                fields.push(`body_template = $${idx++}`);
                values.push(update.body_template);
            }
            if (update.prompt_key !== undefined) {
                fields.push(`prompt_key = $${idx++}`);
                values.push(update.prompt_key);
            }
            if (update.enabled !== undefined) {
                fields.push(`enabled = $${idx++}`);
                values.push(update.enabled);
            }
            if (fields.length === 0) {
                const existing = await client.query(`SELECT * FROM sequence_steps WHERE id = $1 AND campaign_id = $2`, [stepId, campaignId]);
                return existing.rows[0] || null;
            }
            values.push(stepId, campaignId);
            const result = await client.query(`UPDATE sequence_steps SET ${fields.join(', ')} WHERE id = $${idx++} AND campaign_id = $${idx++}
				 RETURNING id, campaign_id, step_index, delay_hours, from_email_account_id, subject_template, body_template, prompt_key, enabled,
				 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
				 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at`, values);
            return result.rows[0] || null;
        });
    }
    async deleteStep(userId, campaignId, stepId) {
        return await this.withTransaction(async (client) => {
            const guard = await client.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2 FOR UPDATE`, [campaignId, userId]);
            if (guard.rowCount === 0) {
                throw new Error('CAMPAIGN_NOT_FOUND');
            }
            if (guard.rows[0].status === 'running') {
                throw new Error('CAMPAIGN_RUNNING');
            }
            const deleted = await client.query(`DELETE FROM sequence_steps WHERE id = $1 AND campaign_id = $2`, [stepId, campaignId]);
            if ((deleted.rowCount ?? 0) === 0)
                return false;
            // Repack indices contiguously starting at 0
            await client.query(`
				WITH ordered AS (
					SELECT id, ROW_NUMBER() OVER (ORDER BY step_index) - 1 AS new_index
					FROM sequence_steps WHERE campaign_id = $1
				)
				UPDATE sequence_steps s SET step_index = o.new_index
				FROM ordered o WHERE s.id = o.id`, [campaignId]);
            return true;
        });
    }
    async reorder(userId, campaignId, stepIds) {
        return await this.withTransaction(async (client) => {
            const guard = await client.query(`SELECT status FROM campaigns WHERE id = $1 AND user_id = $2 FOR UPDATE`, [campaignId, userId]);
            if (guard.rowCount === 0) {
                throw new Error('CAMPAIGN_NOT_FOUND');
            }
            if (guard.rows[0].status === 'running') {
                throw new Error('CAMPAIGN_RUNNING');
            }
            // Validate step ids belong to this campaign
            const dbIds = await client.query(`SELECT id FROM sequence_steps WHERE campaign_id = $1`, [campaignId]);
            const allowed = new Set(dbIds.rows.map((r) => r.id));
            for (const id of stepIds) {
                if (!allowed.has(id)) {
                    throw new Error('INVALID_STEP_IDS');
                }
            }
            // Apply new indices
            for (let i = 0; i < stepIds.length; i++) {
                await client.query(`UPDATE sequence_steps SET step_index = $1 WHERE id = $2 AND campaign_id = $3`, [i, stepIds[i], campaignId]);
            }
            // Repack any remaining steps not included in stepIds after the provided order
            const remaining = await client.query(`SELECT id FROM sequence_steps WHERE campaign_id = $1 AND id <> ALL($2::int[]) ORDER BY step_index`, [campaignId, stepIds]);
            for (let j = 0; j < remaining.rows.length; j++) {
                await client.query(`UPDATE sequence_steps SET step_index = $1 WHERE id = $2 AND campaign_id = $3`, [stepIds.length + j, remaining.rows[j].id, campaignId]);
            }
            // Return ordered list
            const result = await client.query(`SELECT id, campaign_id, step_index, delay_hours, from_email_account_id, subject_template, body_template, prompt_key, enabled,
			 to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
			 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
			 FROM sequence_steps WHERE campaign_id = $1 ORDER BY step_index ASC`, [campaignId]);
            return result.rows;
        });
    }
    async withTransaction(fn) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
exports.SequenceRepo = SequenceRepo;
//# sourceMappingURL=sequenceRepo.js.map