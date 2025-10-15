import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { enrichContactWithAI, getEnrichedData } from '../services/contactEnrichmentService';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';

export const contactEnrichmentRoutes = Router();

contactEnrichmentRoutes.use(authMiddleware);

// POST /api/contacts/:contactId/enrich
contactEnrichmentRoutes.post('/contacts/:contactId/enrich', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { contactId } = req.params;
    let { provider, apiKey } = req.body || {};

    // Step 1: Check if contact is already enriched
    console.log(`🔍 Checking if contact ${contactId} is already enriched...`);
    const existingEnrichment = await Database.query(
      'SELECT id, created_at FROM enriched_data WHERE contact_id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (existingEnrichment.rows.length > 0) {
      console.log('⚠️ Contact already enriched');
      return res.json({
        success: false,
        error: {
          code: 'ALREADY_ENRICHED',
          message: 'Contact already enriched. Enrichment data already exists for this contact.'
        }
      });
    }

    // Step 2: Check if contact has social_link
    console.log(`🔍 Checking social_link for contact ${contactId}...`);
    const contactResult = await Database.query(
      'SELECT id, email, social_link FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (contactResult.rows.length === 0) {
      return res.json({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Contact not found.'
        }
      });
    }

    const contact = contactResult.rows[0];

    // Check if social_link is null or empty
    if (!contact.social_link || contact.social_link.trim() === '') {
      console.log('⚠️ Contact has no social_link');
      return res.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: 'Cannot enrich the contact due to the lack of information. Please add a social media link (LinkedIn, Twitter, etc.) to this contact first.'
        }
      });
    }

    console.log(`✅ Contact has social_link: ${contact.social_link}`);

    // Step 3: Auto-detect provider and decrypt API key if not provided
    if (!provider || !apiKey) {
      console.log(`🔍 Auto-detecting LLM provider for user ${userId}`);
      const providersResult = await Database.query(
        'SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      if (providersResult.rows.length === 0) {
        return res.json({ 
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

    // Step 4: Enrich the contact
    const result = await enrichContactWithAI(userId, contactId, provider, apiKey);

    // Check if there was an error
    if ('error' in result) {
      return res.json({ 
        success: false, 
        error: { code: 'ENRICHMENT_FAILED', message: result.error }
      });
    }

    // Success
    return res.json({ 
      success: true, 
      data: result 
    });

  } catch (err: any) {
    console.error('❌ Contact enrichment error:', err);
    return res.status(500).json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enrich contact.' }
    });
  }
});

// GET /api/contacts/:contactId/enriched-data
contactEnrichmentRoutes.get('/contacts/:contactId/enriched-data', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { contactId } = req.params;

    // Get enriched data
    const result = await getEnrichedData(userId, contactId);

    // Check if there was an error
    if ('error' in result) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: result.error }
      });
    }

    // Success
    return res.json({ 
      success: true, 
      data: result 
    });

  } catch (err: any) {
    console.error('❌ Get enriched data error:', err);
    return res.status(500).json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve enriched data.' }
    });
  }
});
