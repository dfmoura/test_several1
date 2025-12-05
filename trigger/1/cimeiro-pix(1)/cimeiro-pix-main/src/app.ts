import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/environment';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';
import { SyncController } from './controllers/sync.controller';
import { IntegrationService } from './services/integration.service';
import { SyncLogType } from './models/SyncLog';
import { logRequest } from './middleware/auth.middleware';

class App {
  public app: express.Application;
  private syncController: SyncController;
  private integrationService: IntegrationService;

  constructor() {
    this.app = express();
    this.syncController = new SyncController();
    this.integrationService = new IntegrationService();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeCronJobs();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.env === 'production' ? ['https://yourdomain.com'] : true,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.sync.rateLimitWindowMs,
      max: config.sync.rateLimitRequests,
      message: {
        success: false,
        error: 'Too many requests, please try again later',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(logRequest);
  }

  private initializeRoutes(): void {
    // Health check (no auth required)
    this.app.get('/api/health', this.syncController.healthCheck);

    // Sync endpoints
    this.app.post('/api/sync/manual', this.syncController.manualSync);
    this.app.get('/api/sync/status', this.syncController.getSyncStatus);

    // Logs endpoint
    this.app.get('/api/logs', this.syncController.getLogs);

    // Webhook endpoint (with API key validation)
    this.app.post('/api/webhook/mercos', this.syncController.mercosWebhook);

    // Test endpoints
    this.app.post('/api/test/notification', this.syncController.testNotification);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'SANKHYA-MERCOS Integration API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/api/health',
          docs: '/api/docs',
          sync: '/api/sync/manual',
          status: '/api/sync/status',
          logs: '/api/logs',
          webhook: '/api/webhook/mercos',
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  private initializeSwagger(): void {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'SANKHYA-MERCOS Integration API',
          version: '1.0.0',
          description: 'API para integração entre SANKHYA ERP e MERCOS',
          contact: {
            name: 'Sistema de Integração',
            email: 'admin@company.com',
          },
        },
        servers: [
          {
            url: config.env === 'production' ? 'https://your-domain.com' : `http://localhost:${config.port}`,
            description: config.env === 'production' ? 'Production server' : 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'x-api-key',
            },
          },
        },
      },
      apis: ['./src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
    };

    const specs = swaggerJsdoc(options);
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'SANKHYA-MERCOS Integration API',
    }));
  }

  private initializeCronJobs(): void {
    if (config.env === 'production') {
      // Sincronização automática a cada hora configurada
      const cronExpression = `0 */${config.sync.intervalHours} * * *`;
      
      cron.schedule(cronExpression, async () => {
        logger.info('Starting scheduled synchronization');
        
        try {
          const result = await this.integrationService.sincronizarPedidos({
            type: SyncLogType.AUTOMATIC,
          });
          
          logger.info('Scheduled synchronization completed', {
            success: result.success,
            totalProcessed: result.totalProcessed,
            totalSuccess: result.totalSuccess,
            totalErrors: result.totalErrors,
          });
          
        } catch (error) {
          logger.error('Scheduled synchronization failed', { 
            error: (error as Error).message 
          });
        }
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo',
      });

      logger.info('Cron job scheduled', { 
        expression: cronExpression,
        intervalHours: config.sync.intervalHours 
      });
    } else {
      logger.info('Cron jobs disabled in development mode');
    }
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: config.env === 'development' ? error.message : 'Something went wrong',
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database (will skip if not available)
      await initializeDatabase();

      // Start server
      this.app.listen(config.port, () => {
        logger.info('🚀 Server started successfully', {
          port: config.port,
          env: config.env,
          nodeVersion: process.version,
          pid: process.pid,
        });

        if (config.env === 'development') {
          console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🚀 SANKHYA-MERCOS Integration API                          ║
║                                                              ║
║  📍 Server: http://localhost:${config.port}                           ║
║  📚 Docs:   http://localhost:${config.port}/api/docs                  ║
║  🏥 Health: http://localhost:${config.port}/api/health                ║
║                                                              ║
║  Environment: ${config.env.toUpperCase().padEnd(47)} ║
║  Debug Mode: ${(config.debug ? 'ON' : 'OFF').padEnd(48)} ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
          `);
        }
      });

    } catch (error) {
      logger.error('Failed to start server', { error: (error as Error).message });
      // Don't exit, try to continue without database
      this.app.listen(config.port, () => {
        logger.info('🚀 Server running on port ' + config.port + ' (without local DB)');
        logger.info('📊 Environment: ' + config.env);
        logger.info('🔗 Using Supabase for data storage');
      });
    }
  }
}

// Start the application
const app = new App();
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

export default app;