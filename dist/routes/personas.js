"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaRoutes = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
const auth_1 = require("../middleware/auth");
const personaGenerationService_1 = require("../services/personaGenerationService");
const encryption_1 = require("../utils/encryption");
const router = (0, express_1.Router)();
exports.personaRoutes = router;
// All persona routes require auth
router.use(auth_1.authMiddleware);
// POST /api/personas/generate
router.post('/generate', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { provider, questionnaireData, options } = req.body || {};
        // Validate required fields
        if (!questionnaireData) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'questionnaireData is required'
                }
            });
            return;
        }
        // Auto-detect available API key if no provider specified
        let actualProvider = provider;
        let keyResult;
        if (!provider) {
            // Get all available providers for the user
            console.log(`🔍 Auto-detecting available LLM providers for user ${userId}`);
            const providersResult = await connection_1.Database.query('SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
            if (providersResult.rows.length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_API_KEY',
                        message: 'No LLM API keys found. Please configure an API key in Settings.'
                    }
                });
                return;
            }
            // Use the most recently updated provider
            actualProvider = providersResult.rows[0].provider;
            keyResult = { rows: [providersResult.rows[0]] };
            console.log(`✅ Auto-selected provider: ${actualProvider}`);
        }
        else {
            // Get specific provider's API key
            console.log(`🔍 Fetching API key for user ${userId} and provider ${provider}`);
            keyResult = await connection_1.Database.query('SELECT encrypted_api_key FROM user_llm_keys WHERE user_id = $1 AND provider = $2', [userId, provider]);
            if (keyResult.rows.length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_API_KEY',
                        message: `No API key found for provider ${provider}. Please configure your API key in Settings.`
                    }
                });
                return;
            }
        }
        // Decrypt the API key
        let apiKey;
        try {
            apiKey = encryption_1.EncryptionHelper.decrypt(keyResult.rows[0].encrypted_api_key);
            console.log(`✅ Successfully decrypted API key for provider ${actualProvider}`);
        }
        catch (error) {
            console.error('❌ Failed to decrypt API key:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'DECRYPTION_ERROR',
                    message: 'Failed to decrypt API key. Please reconfigure your API key in Settings.'
                }
            });
            return;
        }
        // Validate questionnaire data structure
        const requiredFields = ['companyName', 'industry', 'description', 'products', 'targetAudience', 'challenges', 'valueProposition'];
        const missingFields = requiredFields.filter(field => !questionnaireData[field]);
        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Missing required questionnaire fields: ${missingFields.join(', ')}`
                }
            });
            return;
        }
        // Set default options if not provided
        const generationOptions = {
            generateMultiple: options?.generateMultiple ?? true,
            enhanceWithIndustryInsights: options?.enhanceWithIndustryInsights ?? false
        };
        console.log(`🎯 Generating personas for user ${userId} with provider ${actualProvider}`);
        // Generate personas using the service
        const personaIds = await personaGenerationService_1.PersonaGenerationService.generatePersonasFromQuestionnaire(userId, actualProvider, apiKey, questionnaireData, generationOptions);
        console.log(`✅ Successfully generated ${personaIds.length} personas for user ${userId}`);
        res.json({
            success: true,
            data: {
                personaIds,
                count: personaIds.length
            }
        });
    }
    catch (error) {
        console.error('❌ Persona generation error:', error);
        // Handle specific error types
        if (error.message.includes('TOKEN_LIMIT_EXCEEDED')) {
            res.status(413).json({
                success: false,
                error: {
                    code: 'TOKEN_LIMIT_EXCEEDED',
                    message: 'The persona generation request is too complex and exceeds the AI model\'s token limit. Please try with fewer enhancement options or simplify your business description.'
                }
            });
        }
        else if (error.message.includes('LLM generation failed')) {
            res.status(502).json({
                success: false,
                error: {
                    code: 'LLM_ERROR',
                    message: 'AI service temporarily unavailable. Please try again later.'
                }
            });
        }
        else if (error.message.includes('Unsupported provider')) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PROVIDER',
                    message: 'The specified LLM provider is not supported.'
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error?.message || 'Internal server error'
                }
            });
        }
    }
});
// GET /api/personas - List all personas for the authenticated user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await connection_1.Database.query(`SELECT id, name, industry, role, company_size, location, description, 
              current_challenges, change_events, interests_priorities, 
              communication_style, demographics, content_preferences, 
              buying_triggers, geographic_location, created_at, updated_at
       FROM personas 
       WHERE user_id = $1 
       ORDER BY created_at DESC`, [userId]);
        res.json({
            success: true,
            data: {
                personas: result.rows,
                count: result.rows.length
            }
        });
    }
    catch (error) {
        console.error('❌ Error fetching personas:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error?.message || 'Internal server error'
            }
        });
    }
});
// GET /api/personas/:id - Get a specific persona
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const personaId = req.params.id;
        const result = await connection_1.Database.query(`SELECT id, name, industry, role, company_size, location, description, 
              current_challenges, change_events, interests_priorities, 
              communication_style, demographics, content_preferences, 
              buying_triggers, geographic_location, created_at, updated_at
       FROM personas 
       WHERE id = $1 AND user_id = $2`, [personaId, userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Persona not found'
                }
            });
            return;
        }
        res.json({
            success: true,
            data: {
                persona: result.rows[0]
            }
        });
    }
    catch (error) {
        console.error('❌ Error fetching persona:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error?.message || 'Internal server error'
            }
        });
    }
});
// PUT /api/personas/:id - Update a persona
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const personaId = req.params.id;
        const updates = req.body || {};
        // Check if persona exists and belongs to user
        const existing = await connection_1.Database.query('SELECT id FROM personas WHERE id = $1 AND user_id = $2', [personaId, userId]);
        if (existing.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Persona not found'
                }
            });
            return;
        }
        // Build dynamic update query
        const allowedFields = [
            'name', 'industry', 'role', 'company_size', 'location', 'description',
            'current_challenges', 'change_events', 'interests_priorities',
            'communication_style', 'demographics', 'content_preferences',
            'buying_triggers', 'geographic_location'
        ];
        const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field) && updates[field] !== undefined);
        if (updateFields.length === 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'No valid fields to update'
                }
            });
            return;
        }
        const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [personaId, ...updateFields.map(field => updates[field])];
        const result = await connection_1.Database.query(`UPDATE personas 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $${updateFields.length + 2}
       RETURNING id, name, industry, role, company_size, location, description, 
                 current_challenges, change_events, interests_priorities, 
                 communication_style, demographics, content_preferences, 
                 buying_triggers, geographic_location, created_at, updated_at`, [...values, userId]);
        res.json({
            success: true,
            data: {
                persona: result.rows[0]
            }
        });
    }
    catch (error) {
        console.error('❌ Error updating persona:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error?.message || 'Internal server error'
            }
        });
    }
});
// DELETE /api/personas/:id - Delete a persona
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const personaId = req.params.id;
        const result = await connection_1.Database.query('DELETE FROM personas WHERE id = $1 AND user_id = $2 RETURNING id', [personaId, userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Persona not found'
                }
            });
            return;
        }
        res.json({
            success: true,
            data: {
                message: 'Persona deleted successfully',
                deletedId: result.rows[0].id
            }
        });
    }
    catch (error) {
        console.error('❌ Error deleting persona:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error?.message || 'Internal server error'
            }
        });
    }
});
//# sourceMappingURL=personas.js.map