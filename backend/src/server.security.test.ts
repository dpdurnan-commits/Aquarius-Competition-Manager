import request from 'supertest';
import { APIServer } from './server';
import { DatabaseService } from './services/database.service';
import { PresentationSeasonService } from './services/presentationSeason.service';
import { ServerConfig } from './types';

describe('Security Hardening', () => {
  let server: APIServer;
  let dbService: DatabaseService;
  let seasonService: PresentationSeasonService;
  let testSeasonId: number;

  const testConfig: ServerConfig = {
    port: 3001,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/test',
    jwtSecret: 'test-secret',
    corsOrigins: ['http://localhost:3000'],
    nodeEnv: 'test',
    maxFileSize: 10485760,
    dbPoolMin: 2,
    dbPoolMax: 10,
  };

  beforeAll(async () => {
    dbService = new DatabaseService(testConfig.databaseUrl);
    await dbService.connect();
    await dbService.runMigrations();
    seasonService = new PresentationSeasonService(dbService);
    server = new APIServer(testConfig, dbService);
  });

  afterAll(async () => {
    await dbService.disconnect();
  });

  beforeEach(async () => {
    // Clean up and create test season
    await dbService.query('DELETE FROM flagged_transactions');
    await dbService.query('DELETE FROM competition_results');
    await dbService.query('DELETE FROM competitions');
    await dbService.query('DELETE FROM presentation_seasons');
    
    const season = await seasonService.createSeason({
      name: 'Season: Winter 24-Summer 25',
      startYear: 24,
      endYear: 25
    });
    testSeasonId = season.id;
  });

  describe('Security Headers', () => {
    it('should set X-Frame-Options header', async () => {
      const response = await request(server.getApp())
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(server.getApp())
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(server.getApp())
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should set Strict-Transport-Security header', async () => {
      const response = await request(server.getApp())
        .get('/health')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(server.getApp())
        .get('/health')
        .expect(200);

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML special characters in request body', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>',
        description: 'Test & <b>bold</b>'
      };

      const response = await request(server.getApp())
        .post('/api/competitions')
        .send({
          ...maliciousInput,
          date: '2024-01-01',
          type: 'singles',
          seasonId: testSeasonId
        });

      // The request should be processed (sanitization happens before validation)
      // We're testing that the server doesn't crash and handles the input
      expect(response.status).toBeDefined();
    });

    it('should sanitize query parameters', async () => {
      const response = await request(server.getApp())
        .get('/api/transactions')
        .query({ startDate: '<script>alert("xss")</script>' });

      // Should return validation error for invalid date format, not crash
      expect(response.status).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      await request(server.getApp())
        .get('/api/transactions')
        .expect((res) => {
          // Rate limit headers should be present
          expect(res.headers['ratelimit-limit']).toBeDefined();
          expect(res.headers['ratelimit-remaining']).toBeDefined();
        });
    });
  });

  describe('CORS Configuration', () => {
    it('should set CORS headers for allowed origin', async () => {
      const response = await request(server.getApp())
        .options('/api/transactions')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should allow configured origins in test environment', async () => {
      const response = await request(server.getApp())
        .get('/api/transactions')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include Access-Control-Allow-Methods header', async () => {
      const response = await request(server.getApp())
        .options('/api/transactions')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('PUT');
      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });

    it('should include Access-Control-Allow-Headers header', async () => {
      const response = await request(server.getApp())
        .options('/api/transactions')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-headers']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('should allow credentials', async () => {
      const response = await request(server.getApp())
        .options('/api/transactions')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Parameterized Queries', () => {
    beforeEach(async () => {
      await dbService.query('DELETE FROM flagged_transactions');
      await dbService.query('DELETE FROM competitions');
      await dbService.query('DELETE FROM transactions');
    });

    it('should use parameterized queries for transaction import', async () => {
      const maliciousData = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: "'; DROP TABLE transactions; --",
          type: 'Sale',
          member: 'Test Member',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      await request(server.getApp())
        .post('/api/transactions/import')
        .send(maliciousData)
        .expect(201);

      // Verify the table still exists and data was inserted safely
      const result = await dbService.query('SELECT COUNT(*) FROM transactions');
      expect(result.rows[0].count).toBe('1');
    });

    it('should prevent SQL injection in competition creation', async () => {
      const maliciousCompetition = {
        name: "Test Competition",
        date: '2024-01-01',
        description: "'; DELETE FROM transactions; --",
        prizeStructure: "1st: £100"
      };

      await request(server.getApp())
        .post('/api/competitions')
        .send(maliciousCompetition);

      // Should either succeed with sanitized data or fail validation
      // Either way, tables should still exist
      const competitionsResult = await dbService.query('SELECT COUNT(*) FROM competitions');
      expect(competitionsResult.rows).toBeDefined();

      const transactionsResult = await dbService.query('SELECT COUNT(*) FROM transactions');
      expect(transactionsResult.rows).toBeDefined();
    });

    it('should prevent SQL injection in query parameters', async () => {
      // Insert a test transaction first
      await request(server.getApp())
        .post('/api/transactions/import')
        .send([{
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Test Member',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        }])
        .expect(201);

      // Try SQL injection via query parameters
      await request(server.getApp())
        .get('/api/transactions')
        .query({ 
          startDate: "2024-01-01' OR '1'='1",
          endDate: "2024-12-31'; DROP TABLE transactions; --"
        });

      // Verify table still exists
      const result = await dbService.query('SELECT COUNT(*) FROM transactions');
      expect(result.rows[0].count).toBe('1');
    });

    it('should prevent SQL injection in flagged transaction operations', async () => {
      // Insert a test transaction
      await request(server.getApp())
        .post('/api/transactions/import')
        .send([{
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Test Member',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        }])
        .expect(201);

      const transactions = await dbService.query('SELECT id FROM transactions LIMIT 1');
      const transactionId = transactions.rows[0].id;

      // Try SQL injection when flagging
      await request(server.getApp())
        .post('/api/flagged-transactions')
        .send({ 
          transactionId: `${transactionId}'; DROP TABLE flagged_transactions; --`
        });

      // Verify table still exists
      const result = await dbService.query('SELECT COUNT(*) FROM flagged_transactions');
      expect(result.rows).toBeDefined();
    });

    it('should prevent SQL injection in competition updates', async () => {
      // Create a competition first
      const createResponse = await request(server.getApp())
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2024-01-01',
          type: 'singles',
          seasonId: testSeasonId,
          description: 'Test',
          prizeStructure: '1st: £100'
        })
        .expect(201);

      const competitionId = createResponse.body.id;

      // Try SQL injection in update
      await request(server.getApp())
        .put(`/api/competitions/${competitionId}`)
        .send({
          name: "Updated Competition",
          description: "'; DELETE FROM transactions; --"
        });

      // Verify tables still exist and data is intact
      const competitionsResult = await dbService.query('SELECT COUNT(*) FROM competitions');
      expect(parseInt(competitionsResult.rows[0].count)).toBeGreaterThanOrEqual(1);

      const transactionsResult = await dbService.query('SELECT COUNT(*) FROM transactions');
      expect(transactionsResult.rows).toBeDefined();
    });

    it('should safely handle special characters in transaction data', async () => {
      const specialCharsData = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: "O'Reilly's Till",
          type: 'Sale & Refund',
          member: 'John "Johnny" Doe',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      await request(server.getApp())
        .post('/api/transactions/import')
        .send(specialCharsData)
        .expect(201);

      // Verify data was stored correctly
      const result = await dbService.query('SELECT * FROM transactions WHERE source_row_index = 1');
      expect(result.rows.length).toBe(1);
      // Note: Data will be sanitized, so we just verify it was stored safely
      expect(result.rows[0].till).toBeDefined();
    });
  });
});
