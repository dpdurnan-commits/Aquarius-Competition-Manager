import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import distributionRoutes from './distribution.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Distribution Routes Integration', () => {
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
    app.use('/api/distributions', distributionRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM distribution_assignments');
    await db.query('DELETE FROM presentation_night_distributions');
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');
    await db.query('DELETE FROM transactions');
  });

  describe('GET /api/distributions/season/:seasonId/winners', () => {
    it('should return winners for a season with singles and doubles competitions', async () => {
      // Create season
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      // Create singles competition
      const singlesCompResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Singles Championship', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const singlesCompId = singlesCompResult.rows[0].id;

      // Create doubles competition
      const doublesCompResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Doubles Championship', '2025-02-20', 'doubles', seasonId, 'Test', 'Standard']
      );
      const doublesCompId = doublesCompResult.rows[0].id;

      // Add winner for singles (position 1)
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, entry_paid, competition_refund, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [singlesCompId, 1, 'John Smith', 5.00, 0.00, 0.00]
      );

      // Add winners for doubles (position 1, two players)
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, entry_paid, competition_refund, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [doublesCompId, 1, 'Alice Johnson', 5.00, 0.00, 0.00]
      );
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, entry_paid, competition_refund, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [doublesCompId, 1, 'Bob Williams', 5.00, 0.00, 0.00]
      );

      const response = await request(app)
        .get(`/api/distributions/season/${seasonId}/winners`)
        .expect(200);

      expect(response.body).toHaveProperty('winners');
      expect(response.body.winners).toHaveLength(2);

      // Verify singles competition
      const singlesWinner = response.body.winners.find((w: any) => w.competitionType === 'singles');
      expect(singlesWinner).toBeDefined();
      expect(singlesWinner.competitionName).toBe('Singles Championship');
      expect(singlesWinner.winners).toHaveLength(1);
      expect(singlesWinner.winners[0].playerName).toBe('John Smith');

      // Verify doubles competition
      const doublesWinner = response.body.winners.find((w: any) => w.competitionType === 'doubles');
      expect(doublesWinner).toBeDefined();
      expect(doublesWinner.competitionName).toBe('Doubles Championship');
      expect(doublesWinner.winners).toHaveLength(2);
      expect(doublesWinner.winners[0].playerName).toBe('Alice Johnson');
      expect(doublesWinner.winners[1].playerName).toBe('Bob Williams');
    });

    it('should return 404 for non-existent season', async () => {
      const response = await request(app)
        .get('/api/distributions/season/99999/winners')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('not found');
    });

    it('should return empty array for season with no competitions', async () => {
      // Create season without competitions
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      const response = await request(app)
        .get(`/api/distributions/season/${seasonId}/winners`)
        .expect(200);

      expect(response.body.winners).toHaveLength(0);
    });

    it('should reject invalid seasonId', async () => {
      const response = await request(app)
        .get('/api/distributions/season/invalid/winners')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /api/distributions', () => {
    it('should create distribution with valid data', async () => {
      // Create season
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      // Create competitions
      const comp1Result = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const comp1Id = comp1Result.rows[0].id;

      const comp2Result = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 2', '2025-02-20', 'doubles', seasonId, 'Test', 'Standard']
      );
      const comp2Id = comp2Result.rows[0].id;

      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: comp1Id, amount: 50.00 },
          { competitionId: comp2Id, amount: 75.50 }
        ],
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Distribution created successfully');
      expect(response.body).toHaveProperty('distribution');
      expect(response.body.distribution.seasonId).toBe(seasonId);
      expect(Number(response.body.distribution.totalAmount)).toBe(125.50);
      expect(response.body.distribution.transactionDate).toContain('2025-03-01');
      expect(response.body.distribution.isVoided).toBe(false);
    });

    it('should reject duplicate distribution for same season', async () => {
      // Create season and competition
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      const compResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const compId = compResult.rows[0].id;

      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: compId, amount: 50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      // Create first distribution
      await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Duplicate distribution');
      expect(response.body.message).toContain('already exists');
    });

    it('should reject competition from different season', async () => {
      // Create two seasons
      const season1Result = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const season1Id = season1Result.rows[0].id;

      const season2Result = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 26-Summer 27', 26, 27, false]
      );
      const season2Id = season2Result.rows[0].id;

      // Create competition in season 2
      const compResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', season2Id, 'Test', 'Standard']
      );
      const compId = compResult.rows[0].id;

      // Try to create distribution for season 1 with competition from season 2
      const distributionData = {
        seasonId: season1Id,
        assignments: [
          { competitionId: compId, amount: 50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('not in season');
    });

    it('should reject missing seasonId', async () => {
      const distributionData = {
        assignments: [
          { competitionId: 1, amount: 50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('seasonId is required and must be a number');
    });

    it('should reject missing assignments', async () => {
      const distributionData = {
        seasonId: 1,
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('assignments is required and must be an array');
    });

    it('should reject missing transactionDate', async () => {
      const distributionData = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 50.00 }
        ]
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('transactionDate is required and must be a string');
    });

    it('should reject invalid date format', async () => {
      const distributionData = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 50.00 }
        ],
        transactionDate: '03/01/2025'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('transactionDate must be in YYYY-MM-DD format');
    });

    it('should reject negative amount', async () => {
      const distributionData = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: -50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('assignments[0].amount must be non-negative');
    });

    it('should accept zero amount', async () => {
      // Create season and competition
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      const compResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const compId = compResult.rows[0].id;

      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: compId, amount: 0 }
        ],
        transactionDate: '2025-03-01'
      };

      const response = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      expect(Number(response.body.distribution.totalAmount)).toBe(0);
    });
  });

  describe('GET /api/distributions/season/:seasonId', () => {
    it('should return distribution with assignments', async () => {
      // Create season
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      // Create competitions
      const comp1Result = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const comp1Id = comp1Result.rows[0].id;

      const comp2Result = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 2', '2025-02-20', 'doubles', seasonId, 'Test', 'Standard']
      );
      const comp2Id = comp2Result.rows[0].id;

      // Create distribution
      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: comp1Id, amount: 50.00 },
          { competitionId: comp2Id, amount: 75.50 }
        ],
        transactionDate: '2025-03-01'
      };

      await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      // Get distribution
      const response = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(200);

      expect(response.body).toHaveProperty('distribution');
      expect(response.body.distribution.seasonId).toBe(seasonId);
      expect(Number(response.body.distribution.totalAmount)).toBe(125.50);
      expect(response.body.distribution.assignments).toHaveLength(2);
      expect(response.body.distribution.assignments[0].competitionId).toBe(comp1Id);
      expect(Number(response.body.distribution.assignments[0].amount)).toBe(50.00);
      expect(response.body.distribution.assignments[1].competitionId).toBe(comp2Id);
      expect(Number(response.body.distribution.assignments[1].amount)).toBe(75.50);
    });

    it('should return 404 when no distribution exists', async () => {
      // Create season without distribution
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      const response = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('No distribution found');
    });

    it('should reject invalid seasonId', async () => {
      const response = await request(app)
        .get('/api/distributions/season/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('DELETE /api/distributions/:id/void', () => {
    it('should void distribution successfully', async () => {
      // Create season and competition
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      const compResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const compId = compResult.rows[0].id;

      // Create distribution
      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: compId, amount: 50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      const createResponse = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      const distributionId = createResponse.body.distribution.id;

      // Void distribution
      const response = await request(app)
        .delete(`/api/distributions/${distributionId}/void`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Distribution voided successfully');

      // Verify distribution is voided
      const checkResult = await db.query(
        'SELECT is_voided, voided_at FROM presentation_night_distributions WHERE id = $1',
        [distributionId]
      );
      expect(checkResult.rows[0].is_voided).toBe(true);
      expect(checkResult.rows[0].voided_at).not.toBeNull();
    });

    it('should return 404 for non-existent distribution', async () => {
      const response = await request(app)
        .delete('/api/distributions/99999/void')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('not found');
    });

    it('should reject invalid distributionId', async () => {
      const response = await request(app)
        .delete('/api/distributions/invalid/void')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Full distribution workflow', () => {
    it('should complete full workflow: create, retrieve, void, recreate', async () => {
      // Create season
      const seasonResult = await db.query(
        `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Season: Winter 25-Summer 26', 25, 26, false]
      );
      const seasonId = seasonResult.rows[0].id;

      // Create competition
      const compResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Competition 1', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );
      const compId = compResult.rows[0].id;

      // Step 1: Create distribution
      const distributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: compId, amount: 50.00 }
        ],
        transactionDate: '2025-03-01'
      };

      const createResponse = await request(app)
        .post('/api/distributions')
        .send(distributionData)
        .expect(201);

      const distributionId = createResponse.body.distribution.id;

      // Step 2: Retrieve distribution
      const getResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(200);

      expect(getResponse.body.distribution.id).toBe(distributionId);
      expect(getResponse.body.distribution.isVoided).toBe(false);

      // Step 3: Void distribution
      await request(app)
        .delete(`/api/distributions/${distributionId}/void`)
        .expect(200);

      // Step 4: Verify voided distribution is not returned
      await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(404);

      // Step 5: Create new distribution (should succeed after voiding)
      const newDistributionData = {
        seasonId: seasonId,
        assignments: [
          { competitionId: compId, amount: 75.00 }
        ],
        transactionDate: '2025-03-15'
      };

      const recreateResponse = await request(app)
        .post('/api/distributions')
        .send(newDistributionData)
        .expect(201);

      expect(recreateResponse.body.distribution.id).not.toBe(distributionId);
      expect(Number(recreateResponse.body.distribution.totalAmount)).toBe(75.00);
    });
  });
});
