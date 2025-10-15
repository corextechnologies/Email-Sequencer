"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoStepGeneratorService = void 0;
const sequenceRepo_1 = require("../repo/sequenceRepo");
class AutoStepGeneratorService {
    constructor(db) {
        this.sequenceRepo = new sequenceRepo_1.SequenceRepo(db);
    }
    async generateStepsFromCampaign(userId, campaign) {
        // NOTE: This service is deprecated and no longer used
        // The system now sends emails immediately without steps/sequences
        // Keeping this for backwards compatibility but it does nothing
        console.warn('AutoStepGeneratorService.generateStepsFromCampaign is deprecated and does nothing');
        return;
    }
}
exports.AutoStepGeneratorService = AutoStepGeneratorService;
//# sourceMappingURL=autoStepGenerator.js.map