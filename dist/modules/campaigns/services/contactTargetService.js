"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactTargetService = void 0;
const contactTargetRepo_1 = require("../repo/contactTargetRepo");
const validators_1 = require("../validators");
class ContactTargetService {
    constructor(db) {
        this.repo = new contactTargetRepo_1.ContactTargetRepo(db);
    }
    async attach(userId, campaignId, input) {
        const parsed = validators_1.attachContactsSchema.parse(input);
        const uniqueIds = Array.from(new Set(parsed.contact_ids));
        return this.repo.upsertContacts(userId, campaignId, uniqueIds);
    }
    async list(userId, campaignId, query) {
        const { search, page, limit } = validators_1.listContactsQuerySchema.parse(query);
        return this.repo.listContacts(userId, campaignId, search, page, limit);
    }
    async remove(userId, campaignId, contactId) {
        return this.repo.deleteContact(userId, campaignId, contactId);
    }
    async updatePersona(userId, campaignId, contactId, personaId) {
        return this.repo.updatePersona(userId, campaignId, contactId, personaId);
    }
}
exports.ContactTargetService = ContactTargetService;
//# sourceMappingURL=contactTargetService.js.map