import dotenv from 'dotenv';
import { DatabaseService } from './services/database.service';
import { APIServer } from './server';
import { ServerConfig } from './types';

// Load environment variables
dotenv.config();

// Parse configuration from environment
function getConfig(): ServerConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  
  // Secure defaults for development, fail explicitly in production
  const jwtSecret = process.env.JWT_SECRET || 
    (nodeEnv === 'production' ? '' : 'dev-secret-key-change-in-production');
  
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : (nodeEnv === 'production' ? [] : ['http://localhost:3000', 'http://localhost:5173']);
  
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret,
    corsOrigins,
    nodeEnv,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    dbPoolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  };
}

let server: APIServer | null = null;

async function main() {
  const config = getConfig();

  // Validate required configuration
  if (!config.databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Fail explicitly on missing secrets in production
  if (config.nodeEnv === 'production') {
    if (!config.jwtSecret || config.jwtSecret === 'dev-secret-key-change-in-production') {
      console.error('ERROR: JWT_SECRET environment variable is required in production');
      process.exit(1);
    }

    if (!config.corsOrigins || config.corsOrigins.length === 0) {
      console.error('ERROR: CORS_ORIGINS environment variable is required in production');
      process.exit(1);
    }
  }

  // Initialize database
  const db = new DatabaseService(config.databaseUrl, config.dbPoolMin, config.dbPoolMax);
  
  try {
    await db.connect();
    
    // Run migrations in development mode
    if (config.nodeEnv === 'development') {
      await db.runMigrations();
    }

    // Initialize and start server
    server = new APIServer(config, db);
    await server.start();
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function handleShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  
  if (server) {
    try {
      await server.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

main();
