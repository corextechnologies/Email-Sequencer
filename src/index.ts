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
import { versionCheckMiddleware } from './middleware/versionCheck';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for production
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Development origins
    'http://localhost:3007',
    'http://localhost:8081',
    'http://localhost:8082', 
    'http://localhost:8083',
    'http://192.168.100.131:8081',
    'http://192.168.100.131:8082',
    'http://192.168.100.131:8083',
    'exp://192.168.100.131:8081',
    'exp://192.168.100.131:8082',
      'exp://192.168.100.131:8083',
      // Production origins - add your VPS domain/IP here
      process.env.FRONTEND_URL,
      process.env.MOBILE_APP_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-App-Version', 'X-Platform']
};

app.use(cors(corsOptions));

// Version check middleware (monitoring mode - Phase 1)
app.use('/api', versionCheckMiddleware);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  // Production logging - more structured
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400, // Only log errors in production
    stream: {
      write: (message: string) => {
        console.log(message.trim());
      }
    }
  }));
} else {
  // Development logging - more verbose
  app.use(morgan('dev'));
}

// Rate limiting (basic implementation) - disabled in development
if (process.env.NODE_ENV === 'production') {
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  app.use((req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(clientIp)) {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return next();
    }
    
    const clientData = rateLimitMap.get(clientIp);
    
    if (now > clientData.resetTime) {
      // Reset window
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
      return next();
    }
    
    if (clientData.count >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  });
} else {
  console.log('🔓 Rate limiting disabled in development mode');
}

// Security headers
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control for API endpoints
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Basic health check
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
      },
      database: 'unknown'
    };

    // Test database connection
    try {
      await Database.query('SELECT 1');
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'DEGRADED';
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check for monitoring
app.get('/health/detailed', async (req, res) => {
  try {
    const detailed = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: {
        status: 'unknown',
        responseTime: 0,
        error: undefined as string | undefined
      },
      features: {
        campaignsV2: process.env.FEATURE_CAMPAIGNS_V2 === 'true'
      }
    };

    // Test database with response time
    const dbStart = Date.now();
    try {
      await Database.query('SELECT NOW() as current_time, version() as version');
      detailed.database.status = 'connected';
      detailed.database.responseTime = Date.now() - dbStart;
    } catch (error) {
      detailed.database.status = 'disconnected';
      detailed.database.error = error instanceof Error ? error.message : 'Unknown error';
      detailed.status = 'DEGRADED';
    }

    const statusCode = detailed.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(detailed);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe for Kubernetes/Docker
app.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await Database.query('SELECT 1');
    res.json({ status: 'READY', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: 'Database not available'
    });
  }
});

// Liveness probe for Kubernetes/Docker
app.get('/live', (req, res) => {
  res.json({ status: 'ALIVE', timestamp: new Date().toISOString() });
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

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log deployment URLs
      const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
      console.log(`📊 Health check: ${baseUrl}/health`);
      console.log(`👥 Contacts API: ${baseUrl}/api/contacts`);
      console.log(`🔐 Auth API: ${baseUrl}/api/auth`);
      
      // Log production-specific info
      if (process.env.NODE_ENV === 'production') {
        console.log(`🔒 Production mode enabled`);
        console.log(`📈 Monitoring: ${baseUrl}/health`);
        console.log(`🛡️  Security headers enabled`);
      }
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
