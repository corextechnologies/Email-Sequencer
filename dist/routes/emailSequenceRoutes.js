"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSequenceRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const emailSequenceGeneratorService_1 = require("../services/emailSequenceGeneratorService");
const connection_1 = require("../database/connection");
const encryption_1 = require("../utils/encryption");
exports.emailSequenceRoutes = (0, express_1.Router)();
exports.emailSequenceRoutes.use(auth_1.authMiddleware);
// POST /api/contacts/:contactId/generate-email-sequence
exports.emailSequenceRoutes.post('/contacts/:contactId/generate-email-sequence', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { contactId } = req.params;
        let { provider, apiKey, sequenceParams } = req.body || {};
        // Validate sequenceParams
        if (!sequenceParams || typeof sequenceParams !== 'object') {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'sequenceParams is required' }
            });
        }
        const { numberOfEmails, schedule, primaryGoal } = sequenceParams;
        if (!numberOfEmails || !schedule || !primaryGoal) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'sequenceParams must include numberOfEmails, schedule, and primaryGoal'
                }
            });
        }
        // Auto-detect provider and decrypt API key if not provided
        if (!provider || !apiKey) {
            console.log(`🔍 Auto-detecting LLM provider for user ${userId}`);
            const providersResult = await connection_1.Database.query('SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
            if (providersResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_API_KEY',
                        message: 'No LLM API keys found. Please configure an API key in Settings.'
                    }
                });
            }
            provider = providersResult.rows[0].provider;
            apiKey = encryption_1.EncryptionHelper.decrypt(providersResult.rows[0].encrypted_api_key);
            console.log(`✅ Auto-selected provider: ${provider}`);
        }
        // Generate the email sequence
        const result = await (0, emailSequenceGeneratorService_1.generateEmailSequenceForContact)(userId, contactId, provider, apiKey, sequenceParams);
        // Check if there was an error
        if ('error' in result) {
            return res.status(400).json({
                success: false,
                error: { code: 'GENERATION_ERROR', message: result.error }
            });
        }
        return res.json({
            success: true,
            data: result
        });
    }
    catch (err) {
        console.error('❌ Email sequence generation error:', err);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Email generation failed. Please try again.'
            }
        });
    }
});
exports.default = exports.emailSequenceRoutes;
//# sourceMappingURL=emailSequenceRoutes.js.map