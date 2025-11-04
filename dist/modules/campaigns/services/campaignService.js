"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const campaignRepo_1 = require("../repo/campaignRepo");
const validators_1 = require("../validators");
const stateMachine_1 = require("./stateMachine");
const mailer_1 = require("./mailer");
class CampaignService {
    constructor(db) {
        this.db = db;
        this.repo = new campaignRepo_1.CampaignRepo(db);
        this.stateMachine = new stateMachine_1.CampaignStateMachine(db);
    }
    async create(userId, input) {
        const parsed = validators_1.createCampaignSchema.parse(input);
        // If email account is provided, validate credentials before creating campaign
        if (parsed.from_email_account_id) {
            console.log(`🔐 Validating email account credentials for campaign creation...`);
            // Verify email account exists and belongs to user
            const accountRes = await this.db.query(`SELECT id, provider, username, smtp_host, smtp_port, encrypted_password, is_active 
				 FROM email_accounts 
				 WHERE id = $1 AND user_id = $2`, [parsed.from_email_account_id, userId]);
            if (accountRes.rows.length === 0) {
                throw new Error('EMAIL_ACCOUNT_NOT_FOUND: The selected email account was not found. Please select a different email account.');
            }
            const account = accountRes.rows[0];
            if (!account.is_active) {
                throw new Error('EMAIL_ACCOUNT_INACTIVE: Please activate your email account before creating a campaign.');
            }
            // Verify SMTP credentials are working
            console.log(`🔐 Verifying SMTP credentials for email account ${account.username} (${account.provider})...`);
            try {
                const mailer = new mailer_1.MailerService(this.db);
                const verification = await mailer.verifyCredentials(account.id);
                if (!verification.valid) {
                    console.error(`❌ Email credentials invalid for ${account.username}: ${verification.error}`);
                    throw new Error(`INVALID_EMAIL_CREDENTIALS: Your email account credentials are not working. Please update your email account settings.\n\nError: ${verification.error}`);
                }
                else {
                    console.log(`✅ Email credentials verified successfully for ${account.username}`);
                }
            }
            catch (error) {
                // If it's already a formatted error, re-throw it
                if (error.message?.includes('INVALID_EMAIL_CREDENTIALS') || error.message?.includes('EMAIL_ACCOUNT')) {
                    throw error;
                }
                // Otherwise, wrap it
                console.error(`❌ Error verifying email credentials:`, error);
                throw new Error(`INVALID_EMAIL_CREDENTIALS: Failed to verify email account credentials. Please check your email account settings.\n\nError: ${error.message || error}`);
            }
        }
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