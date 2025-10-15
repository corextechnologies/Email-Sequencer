"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../database/connection");
const encryption_1 = require("../utils/encryption");
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
router.use(auth_1.authMiddleware);
// GET /api/settings/llm-keys
router.get('/llm-keys', async (req, res) => {
    const userId = req.user.userId;
    const result = await connection_1.Database.query(`SELECT provider FROM user_llm_keys WHERE user_id = $1`, [userId]);
    res.json({ success: true, data: { providers: result.rows.map((r) => r.provider) } });
});
// GET /api/settings/llm-keys/detailed
router.get('/llm-keys/detailed', async (req, res) => {
    const userId = req.user.userId;
    console.log('🔍 Fetching keys for user:', userId);
    const result = await connection_1.Database.query(`SELECT provider, updated_at FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC`, [userId]);
    console.log('📋 Database result:', result.rows);
    const keys = result.rows.map((r) => ({
        provider: r.provider,
        hasKey: true,
        updatedAt: r.updated_at
    }));
    console.log('📋 Mapped keys:', keys);
    res.json({
        success: true,
        data: { keys }
    });
});
// PUT /api/settings/llm-keys { provider, api_key }
router.put('/llm-keys', async (req, res) => {
    const userId = req.user.userId;
    const { provider, api_key } = req.body || {};
    if (!provider || !api_key) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and api_key are required' } });
        return;
    }
    const encrypted = encryption_1.EncryptionHelper.encrypt(api_key);
    await connection_1.Database.query(`INSERT INTO user_llm_keys (user_id, provider, encrypted_api_key)
		VALUES ($1,$2,$3)
		ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = CURRENT_TIMESTAMP`, [userId, provider, encrypted]);
    res.json({ success: true, data: { provider } });
});
// DELETE /api/settings/llm-keys/:provider
router.delete('/llm-keys/:provider', async (req, res) => {
    const userId = req.user.userId;
    const { provider } = req.params;
    if (!provider) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider is required' } });
        return;
    }
    await connection_1.Database.query(`DELETE FROM user_llm_keys WHERE user_id = $1 AND provider = $2`, [userId, provider]);
    res.json({ success: true, data: { provider } });
});
//# sourceMappingURL=settings.js.map