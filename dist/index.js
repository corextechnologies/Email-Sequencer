"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./routes/auth");
const emailAccounts_1 = require("./routes/emailAccounts");
const contacts_1 = require("./routes/contacts");
const connection_1 = require("./database/connection");
const settings_1 = require("./routes/settings");
const prompts_1 = require("./routes/prompts");
const llm_1 = require("./routes/llm");
const unsubscribe_1 = require("./routes/unsubscribe");
const personas_1 = require("./routes/personas");
const campaignRoutes_1 = require("./modules/campaigns/http/campaignRoutes");
const personaSuggestionRoutes_1 = require("./routes/personaSuggestionRoutes");
const websiteScan_1 = require("./routes/websiteScan");
const emailSequenceRoutes_1 = require("./routes/emailSequenceRoutes");
const campaignEmailRoutes_1 = require("./routes/campaignEmailRoutes");
const contactEnrichmentRoutes_1 = require("./routes/contactEnrichmentRoutes");
const tracking_1 = __importDefault(require("./routes/tracking"));
const analytics_1 = require("./routes/analytics");
const replyResponses_1 = require("./routes/replyResponses");
const profile_1 = require("./routes/profile");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3007;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3007',
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined'));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/email-accounts', emailAccounts_1.emailAccountRoutes);
async function startServer() {
    try {
        // Initialize database connection
        await connection_1.Database.initialize();
        console.log('✅ Database connected successfully');
        // Initialize contacts routes with database connection
        const contactsRoutes = (0, contacts_1.createContactsRoutes)(connection_1.Database.getPool());
        app.use('/api/contacts', contactsRoutes);
        // Settings and prompts
        app.use('/api/settings', settings_1.settingsRoutes);
        app.use('/api/prompts', prompts_1.promptsRoutes);
        app.use('/api/llm', llm_1.llmRoutes);
        app.use('/api/unsubscribe', unsubscribe_1.unsubscribeRoutes);
        app.use('/api/personas', personas_1.personaRoutes);
        app.use('/track', tracking_1.default); // Use /track instead of /api/track to avoid auth conflicts
        app.use('/api', personaSuggestionRoutes_1.personaSuggestionRoutes);
        app.use('/api/website', websiteScan_1.websiteScanRoutes);
        app.use('/api', emailSequenceRoutes_1.emailSequenceRoutes);
        app.use('/api', contactEnrichmentRoutes_1.contactEnrichmentRoutes);
        app.use('/api', campaignEmailRoutes_1.campaignEmailRoutes);
        app.use('/api/analytics', (0, analytics_1.createAnalyticsRoutes)(connection_1.Database.getPool()));
        app.use('/api/replies', (0, replyResponses_1.createReplyResponseRoutes)(connection_1.Database.getPool()));
        app.use('/api/profile', profile_1.profileRoutes);
        // Feature-flagged Campaigns routes
        if (process.env.FEATURE_CAMPAIGNS_V2 === 'true') {
            const campaignRoutes = (0, campaignRoutes_1.createCampaignRoutes)(connection_1.Database.getPool());
            app.use('/api/campaigns', campaignRoutes);
            console.log('🧪 Campaigns V2 routes enabled');
        }
        // Error handling middleware (must be after routes)
        app.use(errorHandler_1.errorHandler);
        // 404 handler (must be last)
        app.use('*', (req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`👥 Contacts API: http://localhost:${PORT}/api/contacts`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await connection_1.Database.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await connection_1.Database.close();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map