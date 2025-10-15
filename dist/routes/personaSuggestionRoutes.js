"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaSuggestionRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const personaSuggestionService_1 = require("../services/personaSuggestionService");
const connection_1 = require("../database/connection");
const encryption_1 = require("../utils/encryption");
exports.personaSuggestionRoutes = (0, express_1.Router)();
exports.personaSuggestionRoutes.use(auth_1.authMiddleware);
// POST /api/contacts/:contactId/suggest-persona
exports.personaSuggestionRoutes.post('/contacts/:contactId/suggest-persona', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { contactId } = req.params;
        let { provider, apiKey } = req.body || {};
        // Auto-detect provider and decrypt API key if not provided (reuse pattern from personas.ts)
        if (!provider || !apiKey) {
            // Get most recently updated provider and encrypted key for this user
            const providersResult = await connection_1.Database.query('SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
            if (providersResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'NO_API_KEY', message: 'No LLM API keys found. Please configure an API key in Settings.' }
                });
            }
            provider = providersResult.rows[0].provider;
            apiKey = encryption_1.EncryptionHelper.decrypt(providersResult.rows[0].encrypted_api_key);
        }
        const result = await (0, personaSuggestionService_1.suggestPersonaForContact)(userId, contactId, provider, apiKey);
        return res.json(result);
    }
    catch (err) {
        console.error('❌ Suggest persona error:', err);
        return res.status(500).json({ error: 'Unable to determine persona.' });
    }
});
//# sourceMappingURL=personaSuggestionRoutes.js.map