"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const campaignRepo_1 = require("../repo/campaignRepo");
const validators_1 = require("../validators");
const stateMachine_1 = require("./stateMachine");
class CampaignService {
    constructor(db) {
        this.repo = new campaignRepo_1.CampaignRepo(db);
        this.stateMachine = new stateMachine_1.CampaignStateMachine(db);
    }
    async create(userId, input) {
        const parsed = validators_1.createCampaignSchema.parse(input);
        return this.repo.createCampaign(userId, parsed);
    }
    async list(userId) {
        return this.repo.listCampaigns(userId);
    }
    async get(userId, id) {
        return this.repo.getById(userId, id);
    }
    async update(userId, id, input) {
        const parsed = validators_1.updateCampaignSchema.parse(input);
        return this.repo.updateCampaign(userId, id, parsed);
    }
    async remove(userId, id) {
        return this.repo.deleteCampaign(userId, id);
    }
    async delete(userId, id) {
        // Use the state machine's delete method for proper cleanup
        return this.stateMachine.delete(userId, id);
    }
    async updateStatus(userId, id, status) {
        return this.repo.updateStatus(userId, id, status);
    }
    async checkAndCompleteCampaign(campaignId) {
        return this.repo.checkAndCompleteCampaign(campaignId);
    }
    async getCampaignMetrics(userId, campaignId) {
        return this.repo.getCampaignMetrics(userId, campaignId);
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=campaignService.js.map