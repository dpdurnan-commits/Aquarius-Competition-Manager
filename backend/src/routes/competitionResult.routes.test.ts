import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import competitionResultRoutes from './competitionResult.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Competition Result Routes Integration', () => {
  let app: Express;
  let db: DatabaseService;
  let testSeasonId: number;
  let testCompetitionId: number;

  beforeAll(async () => {
    // Setup test database
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use('/api/competition-results', competitionResultRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');

    // Create test season and competition for each test
    const seasonResult = await db.query(
      `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Season: Winter 25-Summer 26', 25, 26, true]
    );
    testSeasonId = seasonResult.rows[0].id;

    const competitionResult = await db.query(
      `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Test Competition', '2025-01-15', 'singles', testSeasonId, 'Test Description', 'Standard']
    );
    testCompetitionId = competitionResult.rows[0].id;
  });

  describe('POST /api/competition-results', () => {
    it('should create result with valid data', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        swindleMoneyPaid: 50.00
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Competition result created successfully');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toMatchObject({
        competitionId: testCompetitionId,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: '1.00',
        swindleMoneyPaid: '50.00'
      });
      expect(response.body.result).toHaveProperty('id');
      expect(response.body.result).toHaveProperty('createdAt');
      expect(response.body.result).toHaveProperty('updatedAt');
    });

    it('should create result with only required fields', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 2,
        playerName: 'Jane DOE'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(201);

      expect(response.body.result).toMatchObject({
        competitionId: testCompetitionId,
        finishingPosition: 2,
        playerName: 'Jane DOE'
      });
      expect(response.body.result.grossScore).toBeNull();
      expect(response.body.result.handicap).toBeNull();
      expect(response.body.result.nettScore).toBeNull();
    });

    it('should reject missing competitionId', async () => {
      const resultData = {
        finishingPosition: 1,
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('competitionId is required');
    });

    it('should reject missing finishingPosition', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('finishingPosition is required');
    });

    it('should reject missing playerName', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 1
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('playerName is required and must be a non-empty string');
    });

    it('should reject empty playerName', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 1,
        playerName: '   '
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('playerName is required and must be a non-empty string');
    });

    it('should reject negative finishingPosition', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: -1,
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('finishingPosition must be a positive integer');
    });

    it('should reject zero finishingPosition', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 0,
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('finishingPosition must be a positive integer');
    });

    it('should reject negative swindleMoneyPaid', async () => {
      const resultData = {
        competitionId: testCompetitionId,
        finishingPosition: 1,
        playerName: 'John SMITH',
        swindleMoneyPaid: -10
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('swindleMoneyPaid must be a non-negative number');
    });

    it('should reject non-existent competitionId', async () => {
      const resultData = {
        competitionId: 99999,
        finishingPosition: 1,
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/competition-results')
        .send(resultData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });

  describe('POST /api/competition-results/bulk', () => {
    it('should bulk create multiple results in transaction', async () => {
      const bulkData = {
        competitionId: testCompetitionId,
        results: [
          {
            finishingPosition: 1,
            playerName: 'John SMITH',
            grossScore: 85,
            handicap: 12,
            nettScore: 73
          },
          {
            finishingPosition: 2,
            playerName: 'Jane DOE',
            grossScore: 88,
            handicap: 15,
            nettScore: 73
          },
          {
            finishingPosition: 3,
            playerName: 'Bob JONES',
            grossScore: 90,
            handicap: 16,
            nettScore: 74
          }
        ]
      };

      const response = await request(app)
        .post('/api/competition-results/bulk')
        .send(bulkData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Successfully created 3 result(s)');
      expect(response.body).toHaveProperty('created', 3);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(0);

      // Verify all results were created
      const getResponse = await request(app)
        .get(`/api/competition-results?competitionId=${testCompetitionId}`)
        .expect(200);

      expect(getResponse.body.count).toBe(3);
      expect(getResponse.body.results).toHaveLength(3);
    });

    it('should reject empty results array', async () => {
      const bulkData = {
        competitionId: testCompetitionId,
        results: []
      };

      const response = await request(app)
        .post('/api/competition-results/bulk')
        .send(bulkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('results array cannot be empty');
    });

    it('should reject missing competitionId', async () => {
      const bulkData = {
        results: [
          {
            finishingPosition: 1,
            playerName: 'John SMITH'
          }
        ]
      };

      const response = await request(app)
        .post('/api/competition-results/bulk')
        .send(bulkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('competitionId is required');
    });

    it('should reject results with missing required fields', async () => {
      const bulkData = {
        competitionId: testCompetitionId,
        results: [
          {
            finishingPosition: 1,
            playerName: 'John SMITH'
          },
          {
            finishingPosition: 2
            // Missing playerName
          }
        ]
      };

      const response = await request(app)
        .post('/api/competition-results/bulk')
        .send(bulkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((d: string) => d.includes('results[1]'))).toBe(true);
      expect(response.body.details.some((d: string) => d.includes('playerName'))).toBe(true);
    });

    it('should reject non-array results', async () => {
      const bulkData = {
        competitionId: testCompetitionId,
        results: 'not an array'
      };

      const response = await request(app)
        .post('/api/competition-results/bulk')
        .send(bulkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('results must be an array');
    });
  });

  describe('GET /api/competition-results', () => {
    beforeEach(async () => {
      // Create test results in non-position order
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testCompetitionId, 3, 'Charlie BROWN', 92, 18, 74]
      );
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testCompetitionId, 1, 'John SMITH', 85, 12, 73]
      );
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testCompetitionId, 2, 'Jane DOE', 88, 15, 73]
      );
    });

    it('should return results ordered by position', async () => {
      const response = await request(app)
        .get(`/api/competition-results?competitionId=${testCompetitionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body.results).toHaveLength(3);

      // Verify ordering by finishing position
      expect(response.body.results[0].finishingPosition).toBe(1);
      expect(response.body.results[0].playerName).toBe('John SMITH');
      expect(response.body.results[1].finishingPosition).toBe(2);
      expect(response.body.results[1].playerName).toBe('Jane DOE');
      expect(response.body.results[2].finishingPosition).toBe(3);
      expect(response.body.results[2].playerName).toBe('Charlie BROWN');
    });

    it('should return empty array when no results exist', async () => {
      // Clear results
      await db.query('DELETE FROM competition_results');

      const response = await request(app)
        .get(`/api/competition-results?competitionId=${testCompetitionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('count', 0);
      expect(response.body.results).toHaveLength(0);
    });

    it('should reject missing competitionId', async () => {
      const response = await request(app)
        .get('/api/competition-results')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('competitionId query parameter is required');
    });

    it('should reject invalid competitionId', async () => {
      const response = await request(app)
        .get('/api/competition-results?competitionId=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('competitionId must be a positive integer');
    });

    it('should reject negative competitionId', async () => {
      const response = await request(app)
        .get('/api/competition-results?competitionId=-1')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('competitionId must be a positive integer');
    });
  });

  describe('PUT /api/competition-results/:id', () => {
    let testResultId: number;

    beforeEach(async () => {
      // Create a test result
      const result = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'John SMITH', 85, 12, 73, 0, 0]
      );
      testResultId = result.rows[0].id;
    });

    it('should update result fields', async () => {
      const updates = {
        finishingPosition: 2,
        playerName: 'John SMITH Jr.',
        grossScore: 86,
        handicap: 13,
        nettScore: 73,
        entryPaid: 1,
        swindleMoneyPaid: 50.00
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Competition result updated successfully');
      expect(response.body.result).toMatchObject({
        id: testResultId,
        finishingPosition: 2,
        playerName: 'John SMITH Jr.',
        grossScore: 86,
        handicap: 13,
        nettScore: 73,
        entryPaid: '1.00',
        swindleMoneyPaid: '50.00'
      });
    });

    it('should update only specified fields', async () => {
      const updates = {
        entryPaid: 1,
        swindleMoneyPaid: 30.00
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(200);

      expect(response.body.result).toMatchObject({
        id: testResultId,
        finishingPosition: 1, // Unchanged
        playerName: 'John SMITH', // Unchanged
        grossScore: 85, // Unchanged
        entryPaid: '1.00', // Updated
        swindleMoneyPaid: '30.00' // Updated
      });
    });

    it('should allow setting fields to null', async () => {
      const updates = {
        grossScore: null,
        handicap: null,
        swindleMoneyPaid: null
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(200);

      expect(response.body.result.grossScore).toBeNull();
      expect(response.body.result.handicap).toBeNull();
      expect(response.body.result.swindleMoneyPaid).toBeNull();
    });

    it('should reject update with no fields', async () => {
      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('At least one field must be provided for update');
    });

    it('should reject invalid finishingPosition', async () => {
      const updates = {
        finishingPosition: 0
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('finishingPosition must be a positive integer');
    });

    it('should reject empty playerName', async () => {
      const updates = {
        playerName: '   '
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('playerName must be a non-empty string');
    });

    it('should reject negative swindleMoneyPaid', async () => {
      const updates = {
        swindleMoneyPaid: -10
      };

      const response = await request(app)
        .put(`/api/competition-results/${testResultId}`)
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('swindleMoneyPaid must be a non-negative number or null');
    });

    it('should return 404 for non-existent result', async () => {
      const updates = {
        entryPaid: 1
      };

      const response = await request(app)
        .put('/api/competition-results/99999')
        .send(updates)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should reject invalid id format', async () => {
      const updates = {
        entryPaid: true
      };

      const response = await request(app)
        .put('/api/competition-results/invalid')
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('DELETE /api/competition-results/:id', () => {
    let testResultId: number;

    beforeEach(async () => {
      // Create a test result
      const result = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [testCompetitionId, 1, 'John SMITH', 85, 12, 73]
      );
      testResultId = result.rows[0].id;
    });

    it('should delete result', async () => {
      const response = await request(app)
        .delete(`/api/competition-results/${testResultId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Competition result deleted successfully');

      // Verify result is deleted
      const getResponse = await request(app)
        .get(`/api/competition-results?competitionId=${testCompetitionId}`)
        .expect(200);

      expect(getResponse.body.count).toBe(0);
    });

    it('should return 404 for non-existent result', async () => {
      const response = await request(app)
        .delete('/api/competition-results/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should reject invalid id format', async () => {
      const response = await request(app)
        .delete('/api/competition-results/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });
});
