import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import competitionCostRoutes from './competitionCost.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Competition Cost Routes Integration', () => {
  let app: Express;
  let db: DatabaseService;

  beforeAll(async () => {
    // Setup test database
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use('/api/competition-costs', competitionCostRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM competition_costs');
    await db.query('DELETE FROM transactions');
  });

  describe('POST /api/competition-costs', () => {
    it('should create competition cost with valid data', async () => {
      const costData = {
        description: 'Trophy engraving',
        amount: 45.50
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Competition cost created successfully');
      expect(response.body).toHaveProperty('cost');
      expect(response.body.cost.description).toBe('Trophy engraving');
      expect(Number(response.body.cost.amount)).toBe(45.50);
      expect(response.body.cost).toHaveProperty('id');
      expect(response.body.cost).toHaveProperty('transactionId');
      expect(response.body.cost).toHaveProperty('transactionDate');
      expect(response.body.cost).toHaveProperty('createdAt');
      expect(response.body.cost).toHaveProperty('updatedAt');
    });

    it('should create cost with zero decimal places', async () => {
      const costData = {
        description: 'Equipment purchase',
        amount: 100
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(201);

      expect(response.body.cost.description).toBe('Equipment purchase');
      expect(Number(response.body.cost.amount)).toBe(100);
    });

    it('should create cost with one decimal place', async () => {
      const costData = {
        description: 'Stationery',
        amount: 25.5
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(201);

      expect(response.body.cost.description).toBe('Stationery');
      expect(Number(response.body.cost.amount)).toBe(25.5);
    });

    it('should reject duplicate description', async () => {
      const costData = {
        description: 'Trophy engraving',
        amount: 45.50
      };

      // Create first cost
      await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Duplicate description');
      expect(response.body.message).toContain('already exists');
    });

    it('should reject negative amount', async () => {
      const costData = {
        description: 'Invalid cost',
        amount: -10.50
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must be positive');
    });

    it('should reject zero amount', async () => {
      const costData = {
        description: 'Zero cost',
        amount: 0
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must be positive');
    });

    it('should reject amount with more than 2 decimal places', async () => {
      const costData = {
        description: 'Invalid precision',
        amount: 45.123
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must have at most 2 decimal places');
    });

    it('should reject missing description', async () => {
      const costData = {
        amount: 45.50
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('description is required and must be a non-empty string');
    });

    it('should reject empty description', async () => {
      const costData = {
        description: '',
        amount: 45.50
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('description is required and must be a non-empty string');
    });

    it('should reject missing amount', async () => {
      const costData = {
        description: 'Trophy engraving'
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount is required');
    });

    it('should reject non-numeric amount', async () => {
      const costData = {
        description: 'Trophy engraving',
        amount: 'invalid'
      };

      const response = await request(app)
        .post('/api/competition-costs')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must be a valid number');
    });
  });

  describe('GET /api/competition-costs', () => {
    it('should return empty array when no costs exist', async () => {
      const response = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(response.body).toHaveProperty('costs');
      expect(response.body).toHaveProperty('total', 0);
      expect(response.body).toHaveProperty('count', 0);
      expect(Array.isArray(response.body.costs)).toBe(true);
      expect(response.body.costs).toHaveLength(0);
    });

    it('should return all costs ordered by date (most recent first)', async () => {
      // Create costs with different dates by manipulating transaction dates
      const cost1Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 1', amount: 10.00 });
      const cost1Id = cost1Response.body.cost.transactionId;

      const cost2Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 2', amount: 20.00 });
      const cost2Id = cost2Response.body.cost.transactionId;

      const cost3Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 3', amount: 30.00 });
      const cost3Id = cost3Response.body.cost.transactionId;

      // Update transaction dates to create different dates
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-01-15', cost1Id]);
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-03-20', cost2Id]);
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-02-10', cost3Id]);

      // Update competition_costs transaction_date to match
      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-01-15', cost1Id]);
      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-03-20', cost2Id]);
      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-02-10', cost3Id]);

      const response = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.costs).toHaveLength(3);
      expect(response.body.total).toBe(60.00);

      // Verify order (most recent first)
      expect(response.body.costs[0].description).toBe('Cost 2'); // 2024-03-20
      expect(response.body.costs[1].description).toBe('Cost 3'); // 2024-02-10
      expect(response.body.costs[2].description).toBe('Cost 1'); // 2024-01-15
    });

    it('should calculate correct total', async () => {
      await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 1', amount: 10.50 });

      await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 2', amount: 25.75 });

      await request(app)
        .post('/api/competition-costs')
        .send({ description: 'Cost 3', amount: 100.00 });

      const response = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.total).toBe(136.25);
    });
  });

  describe('GET /api/competition-costs/range', () => {
    beforeEach(async () => {
      // Create costs with different dates
      const cost1Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'January cost', amount: 10.00 });
      const cost1Id = cost1Response.body.cost.transactionId;

      const cost2Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'February cost', amount: 20.00 });
      const cost2Id = cost2Response.body.cost.transactionId;

      const cost3Response = await request(app)
        .post('/api/competition-costs')
        .send({ description: 'March cost', amount: 30.00 });
      const cost3Id = cost3Response.body.cost.transactionId;

      // Update dates
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-01-15', cost1Id]);
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-02-20', cost2Id]);
      await db.query('UPDATE transactions SET date = $1 WHERE id = $2', ['2024-03-25', cost3Id]);

      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-01-15', cost1Id]);
      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-02-20', cost2Id]);
      await db.query('UPDATE competition_costs SET transaction_date = $1 WHERE transaction_id = $2', ['2024-03-25', cost3Id]);
    });

    it('should filter costs by date range', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024-02-01&endDate=2024-02-28')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.costs).toHaveLength(1);
      expect(response.body.costs[0].description).toBe('February cost');
      expect(response.body.total).toBe(20.00);
      expect(response.body.startDate).toBe('2024-02-01');
      expect(response.body.endDate).toBe('2024-02-28');
    });

    it('should include costs on boundary dates', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024-01-15&endDate=2024-03-25')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.total).toBe(60.00);
    });

    it('should return empty array when no costs in range', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024-04-01&endDate=2024-04-30')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.costs).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should reject missing startDate', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?endDate=2024-02-28')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('startDate is required');
    });

    it('should reject missing endDate', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024-02-01')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('endDate is required');
    });

    it('should reject invalid startDate format', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024/02/01&endDate=2024-02-28')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('startDate must be in YYYY-MM-DD format');
    });

    it('should reject invalid endDate format', async () => {
      const response = await request(app)
        .get('/api/competition-costs/range?startDate=2024-02-01&endDate=02-28-2024')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('endDate must be in YYYY-MM-DD format');
    });
  });
});
