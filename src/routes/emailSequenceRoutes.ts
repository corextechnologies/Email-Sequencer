import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { generateEmailSequenceForContact, SequenceParams } from '../services/emailSequenceGeneratorService';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';

export const emailSequenceRoutes = Router();

emailSequenceRoutes.use(authMiddleware);

// POST /api/contacts/:contactId/generate-email-sequence
emailSequenceRoutes.post('/contacts/:contactId/generate-email-sequence', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
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
      const providersResult = await Database.query(
        'SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

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
      apiKey = EncryptionHelper.decrypt(providersResult.rows[0].encrypted_api_key);
      console.log(`✅ Auto-selected provider: ${provider}`);
    }

    // Generate the email sequence
    const result = await generateEmailSequenceForContact(
      userId,
      contactId,
      provider,
      apiKey,
      sequenceParams as SequenceParams
    );

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

  } catch (err: any) {
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

export default emailSequenceRoutes;

