import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { suggestPersonaForContact } from '../services/personaSuggestionService';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';

export const personaSuggestionRoutes = Router();

personaSuggestionRoutes.use(authMiddleware);

// POST /api/contacts/:contactId/suggest-persona
personaSuggestionRoutes.post('/contacts/:contactId/suggest-persona', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { contactId } = req.params;
    let { provider, apiKey } = req.body || {};

    // Auto-detect provider and decrypt API key if not provided (reuse pattern from personas.ts)
    if (!provider || !apiKey) {
      // Get most recently updated provider and encrypted key for this user
      const providersResult = await Database.query(
        'SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      if (providersResult.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'NO_API_KEY', message: 'No LLM API keys found. Please configure an API key in Settings.' }
        });
      }

      provider = providersResult.rows[0].provider;
      apiKey = EncryptionHelper.decrypt(providersResult.rows[0].encrypted_api_key);
    }

    const result = await suggestPersonaForContact(userId, contactId, provider, apiKey);
    return res.json(result);
  } catch (err: any) {
    console.error('❌ Suggest persona error:', err);
    return res.status(500).json({ error: 'Unable to determine persona.' });
  }
});


