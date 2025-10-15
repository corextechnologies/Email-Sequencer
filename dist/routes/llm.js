"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmRoutes = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
const auth_1 = require("../middleware/auth");
const universalLlmService_1 = require("../services/universalLlmService");
const encryption_1 = require("../utils/encryption");
const router = (0, express_1.Router)();
exports.llmRoutes = router;
// All LLM routes require auth
router.use(auth_1.authMiddleware);
// POST /api/llm/testKey { provider, apiKey }
router.post('/testKey', async (req, res) => {
    try {
        const { provider, apiKey } = req.body || {};
        if (!provider || !apiKey) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and apiKey are required' } });
            return;
        }
        const result = await universalLlmService_1.UniversalLlmService.testKey(provider, apiKey);
        if (result.valid) {
            res.json({ success: true, data: { valid: true } });
        }
        else {
            res.status(400).json({ success: false, data: { valid: false }, error: { message: result.error || 'Key invalid' } });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error?.message || 'Internal server error' } });
    }
});
// POST /api/llm/saveKey { provider, apiKey }
router.post('/saveKey', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { provider, apiKey } = req.body || {};
        console.log('💾 Saving key for user:', userId, 'provider:', provider);
        if (!provider || !apiKey) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and apiKey are required' } });
            return;
        }
        // Validate key before saving to avoid storing invalid secrets
        const validation = await universalLlmService_1.UniversalLlmService.testKey(provider, apiKey);
        if (!validation.valid) {
            res.status(400).json({ success: false, data: { valid: false }, error: { message: validation.error || 'Key invalid' } });
            return;
        }
        const encrypted = encryption_1.EncryptionHelper.encrypt(apiKey);
        console.log('🔐 Key encrypted, saving to database...');
        await connection_1.Database.query(`INSERT INTO user_llm_keys (user_id, provider, encrypted_api_key)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = CURRENT_TIMESTAMP`, [userId, provider, encrypted]);
        console.log('✅ Key saved successfully');
        res.json({ success: true, data: { provider } });
    }
    catch (error) {
        console.error('❌ Save key error:', error);
        res.status(500).json({ success: false, error: { message: error?.message || 'Internal server error' } });
    }
});
//# sourceMappingURL=llm.js.map