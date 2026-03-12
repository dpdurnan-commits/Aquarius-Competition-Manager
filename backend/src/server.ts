import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { Server } from 'http';
import { DatabaseService } from './services/database.service';
import { ServerConfig } from './types';
import { errorHandler, requestLogger, sanitizeInput, apiRateLimiter } from './middleware';
import {
  transactionRoutes,
  competitionRoutes,
  competitionResultRoutes,
  flaggedTransactionRoutes,
  summaryRoutes,
  exportRoutes,
  importRoutes,
  csvRoutes,
  csvUploadRoutes,
  healthRoutes,
  presentationSeasonRoutes,
  swindleMoneyRoutes,
  competitionCostRoutes,
  distributionRoutes
} from './routes';
import { swaggerSpec } from './config/swagger';

export class APIServer {
  private app: Express;
  private server: Server | null = null;
  private db: DatabaseService;
  private config: ServerConfig;
  private isShuttingDown = false;

  constructor(config: ServerConfig, db: DatabaseService) {
    this.config = config;
    this.db = db;
    this.app = express();
    
    // Make database service available to routes
    this.app.locals.db = db;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Trust proxy headers for HTTPS support behind load balancers/proxies
    // Required for Railway, Heroku, AWS ALB, etc.
    if (this.config.nodeEnv === 'production') {
      this.app.set('trust proxy', 1);
    }

    // Security headers with Content-Security-Policy
    // Allow Swagger UI resources
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      xFrameOptions: { action: 'deny' },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration - environment-based
    const corsOptions = {
      origin: this.config.nodeEnv === 'development' 
        ? '*'  // Allow all origins in development
        : this.config.corsOrigins,  // Restrict to configured origins in production
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
    this.app.use(cors(corsOptions));

    // Body parser with size limit
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization to prevent SQL injection and XSS
    this.app.use(sanitizeInput);

    // General API rate limiting
    this.app.use('/api', apiRateLimiter);

    // Request logging
    if (this.config.nodeEnv === 'development') {
      this.app.use(requestLogger);
    }

    // Attach database to request for health checks
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).db = this.db;
      next();
    });

    // Static file serving for frontend
    this.app.use(express.static('public'));
  }

  private setupRoutes(): void {
    // Health check routes (no authentication required)
    this.app.use('/health', healthRoutes);

    // API Documentation
    // Serve OpenAPI spec as JSON
    this.app.get('/api/docs/openapi.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    // Serve Swagger UI
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Competition Account Management API'
    }));

    // API routes (authentication will be added in subsequent tasks)
    this.app.use('/api/transactions', transactionRoutes);
    this.app.use('/api/competitions', competitionRoutes);
    this.app.use('/api/competition-results', competitionResultRoutes);
    this.app.use('/api/flagged-transactions', flaggedTransactionRoutes);
    this.app.use('/api/summaries', summaryRoutes);
    this.app.use('/api/export', exportRoutes);
    this.app.use('/api/import', importRoutes);
    this.app.use('/api/import/csv', csvRoutes);
    this.app.use('/api/csv', csvUploadRoutes);
    this.app.use('/api/presentation-seasons', presentationSeasonRoutes);
    this.app.use('/api/swindle-money', swindleMoneyRoutes);
    this.app.use('/api/competition-costs', competitionCostRoutes);
    this.app.use('/api/distributions', distributionRoutes);

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Server listening on port ${this.config.port}`);
        console.log(`Environment: ${this.config.nodeEnv}`);
        console.log(`CORS origins: ${this.config.corsOrigins.join(', ')}`);
        resolve();
      });
    });
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down gracefully...');

    // Stop accepting new connections
    if (this.server) {
      let timeoutHandle: NodeJS.Timeout | null = null;
      
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          console.log('HTTP server closed');
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          resolve();
        });

        // Force close after 30 seconds
        timeoutHandle = setTimeout(() => {
          console.log('Forcing server shutdown after timeout');
          resolve();
        }, 30000);
      });
    }

    // Close database connections
    try {
      await this.db.disconnect();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }

    console.log('Shutdown complete');
  }

  getApp(): Express {
    return this.app;
  }
}
