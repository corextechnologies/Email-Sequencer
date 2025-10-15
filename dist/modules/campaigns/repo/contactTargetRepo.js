"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactTargetRepo = void 0;
class ContactTargetRepo {
    constructor(db) {
        this.db = db;
    }
    async upsertContacts(userId, campaignId, contactIds) {
        // Ensure campaign belongs to user
        const c = await this.db.query(`SELECT 1 FROM campaigns WHERE id = $1 AND user_id = $2`, [campaignId, userId]);
        if (c.rowCount === 0)
            throw new Error('NOT_FOUND');
        const result = await this.db.query(`INSERT INTO campaign_contacts (campaign_id, contact_id, status)
			 SELECT $1, id, 'pending' FROM contacts WHERE id = ANY($2::int[]) AND user_id = $3
			 ON CONFLICT (campaign_id, contact_id) DO NOTHING`, [campaignId, contactIds, userId]);
        return result.rowCount ?? 0;
    }
    async listContacts(userId, campaignId, search, page, limit) {
        const offset = (page - 1) * limit;
        const like = `%${search.toLowerCase()}%`;
        const whereSearch = search ? `AND (LOWER(coalesce(ct.first_name,'')) LIKE $4 OR LOWER(coalesce(ct.last_name,'')) LIKE $4 OR LOWER(ct.email) LIKE $4)` : '';
        const params = [campaignId, userId, limit];
        if (search)
            params.push(like);
        params.push(offset);
        const dataQuery = `
			SELECT cc.id as campaign_contact_id, cc.status, cc.persona_id,
			       ct.id as contact_id, ct.first_name, ct.last_name, ct.email,
			       ct.company, ct.job_title, ct.phone, ct.social_link,
			       ct.tags, ct.notes, ct.subscribed, ct.status as contact_status,
			       ct.source, ct.created_at, ct.updated_at
			FROM campaign_contacts cc
			JOIN campaigns c ON c.id = cc.campaign_id
			JOIN contacts ct ON ct.id = cc.contact_id
			WHERE cc.campaign_id = $1 AND c.user_id = $2 ${whereSearch}
			ORDER BY ct.first_name NULLS LAST, ct.last_name NULLS LAST, ct.email
			LIMIT $3 OFFSET $${params.length}`;
        const countQuery = `
			SELECT COUNT(*)::int as total
			FROM campaign_contacts cc
			JOIN campaigns c ON c.id = cc.campaign_id
			JOIN contacts ct ON ct.id = cc.contact_id
			WHERE cc.campaign_id = $1 AND c.user_id = $2 ${whereSearch}`;
        const [dataRes, countRes] = await Promise.all([
            this.db.query(dataQuery, params),
            this.db.query(countQuery, search ? [campaignId, userId, like] : [campaignId, userId])
        ]);
        return { data: dataRes.rows, total: countRes.rows[0].total, page, limit };
    }
    async deleteContact(userId, campaignId, contactId) {
        const del = await this.db.query(`DELETE FROM campaign_contacts cc USING campaigns c
			 WHERE cc.campaign_id = $1 AND cc.contact_id = $2 AND c.id = cc.campaign_id AND c.user_id = $3`, [campaignId, contactId, userId]);
        return (del.rowCount ?? 0) > 0;
    }
    async updatePersona(userId, campaignId, contactId, personaId) {
        // Verify ownership
        const check = await this.db.query(`SELECT cc.id FROM campaign_contacts cc
			 JOIN campaigns c ON c.id = cc.campaign_id
			 WHERE cc.campaign_id = $1 AND cc.contact_id = $2 AND c.user_id = $3`, [campaignId, contactId, userId]);
        if (check.rowCount === 0)
            throw new Error('NOT_FOUND');
        // Update persona_id
        const result = await this.db.query(`UPDATE campaign_contacts 
			 SET persona_id = $1, updated_at = CURRENT_TIMESTAMP
			 WHERE campaign_id = $2 AND contact_id = $3
			 RETURNING id, persona_id`, [personaId, campaignId, contactId]);
        return result.rows[0];
    }
}
exports.ContactTargetRepo = ContactTargetRepo;
//# sourceMappingURL=contactTargetRepo.js.map