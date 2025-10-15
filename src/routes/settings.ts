import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';

const router = Router();

router.use(authMiddleware);

// GET /api/settings/llm-keys
router.get('/llm-keys', async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.userId;
	const result = await Database.query(`SELECT provider FROM user_llm_keys WHERE user_id = $1`, [userId]);
	res.json({ success: true, data: { providers: result.rows.map((r: any) => r.provider) } });
});

// GET /api/settings/llm-keys/detailed
router.get('/llm-keys/detailed', async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.userId;
	console.log('🔍 Fetching keys for user:', userId);
	const result = await Database.query(`SELECT provider, updated_at FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC`, [userId]);
	console.log('📋 Database result:', result.rows);
	const keys = result.rows.map((r: any) => ({
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
router.put('/llm-keys', async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.userId;
	const { provider, api_key } = req.body || {};
	if (!provider || !api_key) {
		res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and api_key are required' } });
		return;
	}
	const encrypted = EncryptionHelper.encrypt(api_key);
	await Database.query(`INSERT INTO user_llm_keys (user_id, provider, encrypted_api_key)
		VALUES ($1,$2,$3)
		ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = CURRENT_TIMESTAMP`, [userId, provider, encrypted]);
	res.json({ success: true, data: { provider } });
});

// DELETE /api/settings/llm-keys/:provider
router.delete('/llm-keys/:provider', async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.userId;
	const { provider } = req.params;
	if (!provider) {
		res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider is required' } });
		return;
	}
	await Database.query(`DELETE FROM user_llm_keys WHERE user_id = $1 AND provider = $2`, [userId, provider]);
	res.json({ success: true, data: { provider } });
});

export { router as settingsRoutes };


