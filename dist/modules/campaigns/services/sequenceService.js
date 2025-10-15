"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceService = void 0;
const sequenceRepo_1 = require("../repo/sequenceRepo");
const validators_1 = require("../validators");
class SequenceService {
    constructor(db) {
        this.repo = new sequenceRepo_1.SequenceRepo(db);
    }
    async list(userId, campaignId) {
        return this.repo.listSteps(userId, campaignId);
    }
    async create(userId, campaignId, input) {
        const parsed = validators_1.createStepsSchema.parse(input);
        const stepsArray = Array.isArray(parsed) ? parsed : [parsed];
        const created = await this.repo.createSteps(userId, campaignId, stepsArray);
        return Array.isArray(parsed) ? created : created[0];
    }
    async update(userId, campaignId, stepId, input) {
        const parsed = validators_1.updateStepSchema.parse(input);
        return this.repo.updateStep(userId, campaignId, stepId, parsed);
    }
    async remove(userId, campaignId, stepId) {
        return this.repo.deleteStep(userId, campaignId, stepId);
    }
    async reorder(userId, campaignId, input) {
        const parsed = validators_1.reorderStepsSchema.parse(input);
        return this.repo.reorder(userId, campaignId, parsed.step_ids);
    }
}
exports.SequenceService = SequenceService;
//# sourceMappingURL=sequenceService.js.map