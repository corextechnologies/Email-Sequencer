import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { emailAccountRoutes } from './routes/emailAccounts';
import { createContactsRoutes } from './routes/contacts';
import { Database } from './database/connection';
import { settingsRoutes } from './routes/settings';
import { promptsRoutes } from './routes/prompts';
import { llmRoutes } from './routes/llm';
import { unsubscribeRoutes } from './routes/unsubscribe';
import { personaRoutes } from './routes/personas';
import { createCampaignRoutes } from './modules/campaigns/http/campaignRoutes';
import { personaSuggestionRoutes } from './routes/personaSuggestionRoutes';
import { websiteScanRoutes } from './routes/websiteScan';
import { emailSequenceRoutes } from './routes/emailSequenceRoutes';
import { campaignEmailRoutes } from './routes/campaignEmailRoutes';
import { contactEnrichmentRoutes } from './routes/contactEnrichmentRoutes';
import trackingRoutes from './routes/tracking';
import { createAnalyticsRoutes } from './routes/analytics';
import { createReplyResponseRoutes } from './routes/replyResponses';
import { profileRoutes } from './routes/profile';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082', 
    'http://localhost:8083',
    'http://192.168.100.131:8081',
    'http://192.168.100.131:8082',
    'http://192.168.100.131:8083',
    'exp://192.168.100.131:8081',
    'exp://192.168.100.131:8082',
    'exp://192.168.100.131:8083'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/email-accounts', emailAccountRoutes);

async function startServer() {
  try {
    // Initialize database connection
    await Database.initialize();
    console.log('✅ Database connected successfully');

    // Initialize contacts routes with database connection
    const contactsRoutes = createContactsRoutes(Database.getPool());
    app.use('/api/contacts', contactsRoutes);

    // Settings and prompts
    app.use('/api/settings', settingsRoutes);
    app.use('/api/prompts', promptsRoutes);
    app.use('/api/llm', llmRoutes);
    app.use('/api/unsubscribe', unsubscribeRoutes);
    app.use('/api/personas', personaRoutes);
    app.use('/track', trackingRoutes);  // Use /track instead of /api/track to avoid auth conflicts
    app.use('/api', personaSuggestionRoutes);
    app.use('/api/website', websiteScanRoutes);
    app.use('/api', emailSequenceRoutes);
    app.use('/api', contactEnrichmentRoutes);
    app.use('/api', campaignEmailRoutes);
    app.use('/api/analytics', createAnalyticsRoutes(Database.getPool()));
    app.use('/api/replies', createReplyResponseRoutes(Database.getPool()));
    app.use('/api/profile', profileRoutes);

    // Feature-flagged Campaigns routes
    if (process.env.FEATURE_CAMPAIGNS_V2 === 'true') {
      const campaignRoutes = createCampaignRoutes(Database.getPool());
      app.use('/api/campaigns', campaignRoutes);
      console.log('🧪 Campaigns V2 routes enabled');
    }

    // Error handling middleware (must be after routes)
    app.use(errorHandler);

    // 404 handler (must be last)
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      // Log Railway deployment URL if available
      const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
      if (railwayUrl) {
        console.log(`🚄 Railway URL: https://${railwayUrl}`);
        console.log(`📊 Health check: https://${railwayUrl}/health`);
        console.log(`👥 Contacts API: https://${railwayUrl}/api/contacts`);
        console.log(`🔐 Auth API: https://${railwayUrl}/api/auth`);
      } else {
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`👥 Contacts API: http://localhost:${PORT}/api/contacts`);
        console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      }
      
      // Log all environment variables that might contain the deployment URL
      console.log(`🔍 Environment info:`);
      console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`   PORT: ${PORT}`);
      console.log(`   RAILWAY_PUBLIC_DOMAIN: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'not set'}`);
      console.log(`   RAILWAY_STATIC_URL: ${process.env.RAILWAY_STATIC_URL || 'not set'}`);
      console.log(`   RAILWAY_ENVIRONMENT_NAME: ${process.env.RAILWAY_ENVIRONMENT_NAME || 'not set'}`);
      console.log(`   RAILWAY_PROJECT_NAME: ${process.env.RAILWAY_PROJECT_NAME || 'not set'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await Database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await Database.close();
  process.exit(0);
});

startServer();
