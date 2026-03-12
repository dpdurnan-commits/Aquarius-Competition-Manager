import request from 'supertest';
import { APIServer } from './server';
import { DatabaseService } from './services/database.service';
import { ServerConfig } from './types';

// Mock the database service
jest.mock('./services/database.service');

describe('APIServer', () => {
  let mockDb: jest.Mocked<DatabaseService>;
  let config: ServerConfig;

  beforeEach(() => {
    // Create mock database service
    mockDb = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
      transaction: jest.fn(),
      runMigrations: jest.fn().mockResolvedValue(undefined),
      getPool: jest.fn()
    } as any;

    // Default test configuration
    config = {
      port: 3001,
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      jwtSecret: 'test-secret',
      corsOrigins: ['http://localhost:3000'],
      nodeEnv: 'test',
      maxFileSize: 10485760,
      dbPoolMin: 2,
      dbPoolMax: 10
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and middleware registration', () => {
    it('should create an APIServer instance', () => {
      const server = new APIServer(config, mockDb);
      expect(server).toBeInstanceOf(APIServer);
    });

    it('should register helmet middleware for security headers', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      const response = await request(app).get('/health');
      
      // Helmet sets various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should register CORS middleware with configured origins', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should register body parser with 10MB limit', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      // Test that JSON body parsing works
      const response = await request(app)
        .post('/api/transactions/import')
        .send({ test: 'data' });
      
      // Should not fail due to body parsing (will fail for other reasons like validation)
      expect(response.status).not.toBe(413); // 413 = Payload Too Large
    });

    it('should serve static files from public directory', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      // Request a non-existent static file
      const response = await request(app).get('/nonexistent.html');
      
      // Should return 404 from our handler, not a static file error
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });

    it('should register all route handlers', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      // Test that routes are registered (they will fail without proper setup, but should be found)
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);

      const transactionResponse = await request(app).get('/api/transactions');
      expect(transactionResponse.status).not.toBe(404); // Route exists

      const competitionResponse = await request(app).get('/api/competitions');
      expect(competitionResponse.status).not.toBe(404); // Route exists
    });

    it('should register error handling middleware', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      // Request non-existent route to trigger 404 handler
      const response = await request(app).get('/api/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });

    it('should attach database to request object', async () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();

      // Health check routes use the database from request
      const response = await request(app).get('/health/db');
      
      expect(response.status).toBe(200);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT NOW()');
    });
  });

  describe('start', () => {
    it('should start the server on configured port', async () => {
      const server = new APIServer(config, mockDb);
      
      await server.start();
      
      // Server should be listening
      const app = server.getApp();
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      
      await server.shutdown();
    });

    it('should log server startup information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const server = new APIServer(config, mockDb);
      await server.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Server listening on port 3001'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Environment: test'));
      
      await server.shutdown();
      consoleSpy.mockRestore();
    });
  });

  describe('shutdown', () => {
    it('should close HTTP server gracefully', async () => {
      const server = new APIServer(config, mockDb);
      await server.start();
      
      await server.shutdown();
      
      // After shutdown, database disconnect should be called
      expect(mockDb.disconnect).toHaveBeenCalled();
    });

    it('should close database connections during shutdown', async () => {
      const server = new APIServer(config, mockDb);
      await server.start();
      
      await server.shutdown();
      
      expect(mockDb.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle database disconnect errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDb.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      
      const server = new APIServer(config, mockDb);
      await server.start();
      
      await server.shutdown();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error closing database connections:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should prevent multiple simultaneous shutdowns', async () => {
      const server = new APIServer(config, mockDb);
      await server.start();
      
      // Call shutdown twice simultaneously
      await Promise.all([
        server.shutdown(),
        server.shutdown()
      ]);
      
      // Disconnect should only be called once
      expect(mockDb.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should log shutdown events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const server = new APIServer(config, mockDb);
      await server.start();
      await server.shutdown();
      
      expect(consoleSpy).toHaveBeenCalledWith('Shutting down gracefully...');
      expect(consoleSpy).toHaveBeenCalledWith('HTTP server closed');
      expect(consoleSpy).toHaveBeenCalledWith('Database connections closed');
      expect(consoleSpy).toHaveBeenCalledWith('Shutdown complete');
      
      consoleSpy.mockRestore();
    });

    it('should handle shutdown when server was never started', async () => {
      const server = new APIServer(config, mockDb);
      
      // Shutdown without starting
      await server.shutdown();
      
      expect(mockDb.disconnect).toHaveBeenCalled();
    });
  });

  describe('health check endpoints', () => {
    let server: APIServer;

    beforeEach(async () => {
      server = new APIServer(config, mockDb);
      await server.start();
    });

    afterEach(async () => {
      await server.shutdown();
    });

    it('should respond to GET /health with basic health check', async () => {
      const app = server.getApp();
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        version: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should respond to GET /health/db with database connectivity check', async () => {
      const app = server.getApp();
      const response = await request(app).get('/health/db');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: 'connected',
        version: expect.any(String),
        timestamp: expect.any(String)
      });
      expect(mockDb.query).toHaveBeenCalledWith('SELECT NOW()');
    });

    it('should respond to GET /health/ready with readiness check', async () => {
      const app = server.getApp();
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
        application: 'ok',
        database: 'connected',
        version: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should return 503 when database is disconnected', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection failed'));
      
      const app = server.getApp();
      const response = await request(app).get('/health/db');
      
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'error',
        database: 'disconnected',
        error: 'Connection failed'
      });
    });

    it('should return 503 for readiness check when database is down', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection failed'));
      
      const app = server.getApp();
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'not ready',
        application: 'ok',
        database: 'disconnected'
      });
    });

    it('should not require authentication for health checks', async () => {
      const app = server.getApp();
      
      // Health checks should work without any auth headers
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
      
      const dbResponse = await request(app).get('/health/db');
      expect(dbResponse.status).toBe(200);
      
      const readyResponse = await request(app).get('/health/ready');
      expect(readyResponse.status).toBe(200);
    });

    it('should include version information in all health check responses', async () => {
      const app = server.getApp();
      
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.body.version).toBeDefined();
      
      const dbResponse = await request(app).get('/health/db');
      expect(dbResponse.body.version).toBeDefined();
      
      const readyResponse = await request(app).get('/health/ready');
      expect(readyResponse.body.version).toBeDefined();
    });
  });

  describe('getApp', () => {
    it('should return the Express app instance', () => {
      const server = new APIServer(config, mockDb);
      const app = server.getApp();
      
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });
});
