import { Router } from 'express';
import { Database } from '../database/connection';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { UniversalLlmService } from '../services/universalLlmService';
import { EncryptionHelper } from '../utils/encryption';

const router = Router();

// All LLM routes require auth
router.use(authMiddleware);

// POST /api/llm/testKey { provider, apiKey }
router.post('/testKey', async (req: AuthenticatedRequest, res) => {
  try {
    const { provider, apiKey } = req.body || {};
    if (!provider || !apiKey) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and apiKey are required' } });
      return;
    }
    const result = await UniversalLlmService.testKey(provider, apiKey);
    if (result.valid) {
      res.json({ success: true, data: { valid: true } });
    } else {
      res.status(400).json({ success: false, data: { valid: false }, error: { message: result.error || 'Key invalid' } });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error?.message || 'Internal server error' } });
  }
});

// POST /api/llm/saveKey { provider, apiKey }
router.post('/saveKey', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { provider, apiKey } = req.body || {};
    console.log('💾 Saving key for user:', userId, 'provider:', provider);
    
    if (!provider || !apiKey) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and apiKey are required' } });
      return;
    }

    // Validate key before saving to avoid storing invalid secrets
    const validation = await UniversalLlmService.testKey(provider, apiKey);
    if (!validation.valid) {
      res.status(400).json({ success: false, data: { valid: false }, error: { message: validation.error || 'Key invalid' } });
      return;
    }

    const encrypted = EncryptionHelper.encrypt(apiKey);
    console.log('🔐 Key encrypted, saving to database...');

    await Database.query(
      `INSERT INTO user_llm_keys (user_id, provider, encrypted_api_key)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = CURRENT_TIMESTAMP`,
      [userId, provider, encrypted]
    );

    console.log('✅ Key saved successfully');
    res.json({ success: true, data: { provider } });
  } catch (error: any) {
    console.error('❌ Save key error:', error);
    res.status(500).json({ success: false, error: { message: error?.message || 'Internal server error' } });
  }
});

export { router as llmRoutes };


