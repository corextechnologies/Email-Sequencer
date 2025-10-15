import { Router } from 'express';
import { Database } from '../database/connection';
import { EncryptionHelper } from '../utils/encryption';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { WebsiteAnalysisService } from '../services/websiteAnalysisService';

export const websiteScanRoutes = Router();
console.log('🛠️ websiteScanRoutes file loaded');

// Enable auth middleware
websiteScanRoutes.use(authMiddleware);

// POST /api/website/scan
websiteScanRoutes.post('/scan', async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user!.userId;
        const { url } = req.body;

        console.log('📥 Received URL:', url);

        if (!url) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'URL is required' },
            });
        }

        // Fetch all available LLM API keys for the user
        const keyResult = await Database.query(
            'SELECT provider, encrypted_api_key FROM user_llm_keys WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );

        console.log('📦 Providers fetched from DB:', keyResult.rows);

        if (keyResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_API_KEY', message: 'No LLM API key found. Please configure in Settings.' },
            });
        }

        let analysisResult: any = null;
        let lastError: any = null;

        // Try each provider until one succeeds
        for (const row of keyResult.rows) {
            const provider = row.provider;
            let apiKey: string;

            try {
                apiKey = EncryptionHelper.decrypt(row.encrypted_api_key);
                console.log(`🔑 Provider: ${provider}, Decrypted API Key: ${apiKey}`);
            } catch (err) {
                console.warn(`❌ Failed to decrypt API key for provider ${provider}`);
                lastError = err;
                continue; // try next provider
            }

            try {
                // Call the real WebsiteAnalysisService
                analysisResult = await WebsiteAnalysisService.analyzeWebsite(url, provider, apiKey);
                console.log(`✅ Analysis succeeded with provider: ${provider}`);
                console.log('📝 Analysis result:', analysisResult); // <-- log response here
                break; // success, exit loop
            } catch (err) {
                console.warn(`⚠️ Analysis failed with provider ${provider}:`, err);
                lastError = err;
                continue; // try next provider
            }
        }

        if (!analysisResult) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'ALL_PROVIDERS_FAILED',
                    message: lastError?.message || 'Website analysis failed with all available providers',
                },
            });
        }

        // Send response
        return res.json({ success: true, data: analysisResult });

    } catch (error: any) {
        console.error('❌ Website scan error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error?.message || 'Internal server error' },
        });
    }
});
