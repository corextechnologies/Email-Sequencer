"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../database/connection");
const router = (0, express_1.Router)();
exports.promptsRoutes = router;
router.use(auth_1.authMiddleware);
// GET /api/prompts -> merged library (defaults + user overrides)
router.get('/', async (req, res) => {
    const userId = req.user.userId;
    const defaults = await connection_1.Database.query(`SELECT key, title, content, variables FROM prompt_library`);
    const overrides = await connection_1.Database.query(`SELECT key, content FROM user_prompts WHERE user_id = $1`, [userId]);
    const oMap = new Map(overrides.rows.map((r) => [r.key, r.content]));
    const merged = defaults.rows.map((d) => ({ key: d.key, title: d.title, content: oMap.get(d.key) ?? d.content, variables: d.variables }));
    res.json({ success: true, data: merged });
});
// POST /api/prompts { action: 'restore_defaults' } -> delete user overrides
router.post('/', async (req, res) => {
    const userId = req.user.userId;
    const { action } = req.body || {};
    if (action !== 'restore_defaults') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } });
        return;
    }
    await connection_1.Database.query(`DELETE FROM user_prompts WHERE user_id = $1`, [userId]);
    res.json({ success: true, data: { restored: true } });
});
//# sourceMappingURL=prompts.js.map