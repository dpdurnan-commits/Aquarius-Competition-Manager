import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import swindleMoneyRoutes from './swindleMoney.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Swindle Money Routes Integration', () => {
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
    app.use('/api/swindle-money', swindleMoneyRoutes);
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

  describe('POST /api/swindle-money/populate', () => {
    it('should populate swindle money with matching name', async () => {
      // Create a competition result with unpaid swindle money
      const resultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'John SMITH', 85, 12, 73, 1, null]
      );
      const resultId = resultData.rows[0].id;

      const populateData = {
        playerName: 'John SMITH',
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', resultId);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Successfully populated swindle money');
      expect(response.body.message).toContain('50');
      expect(response.body.message).toContain('John SMITH');

      // Verify the result was updated in the database
      const updatedResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [resultId]
      );
      expect(updatedResult.rows[0].swindle_money_paid).toBe('50.00');
    });

    it('should match case-insensitively', async () => {
      // Create result with uppercase name
      const resultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'JOHN SMITH', 85, 12, 73, 1, null]
      );
      const resultId = resultData.rows[0].id;

      // Try to populate with lowercase name
      const populateData = {
        playerName: 'john smith',
        amount: 30.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', resultId);

      // Verify the result was updated
      const updatedResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [resultId]
      );
      expect(updatedResult.rows[0].swindle_money_paid).toBe('30.00');
    });

    it('should return warning when no match found', async () => {
      const populateData = {
        playerName: 'Nonexistent Player',
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true); // Still success, just a warning
      expect(response.body).toHaveProperty('resultId', null);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Warning');
      expect(response.body.message).toContain('No matching unpaid result found');
      expect(response.body.message).toContain('Nonexistent Player');
    });

    it('should select most recent unpaid result when multiple matches exist', async () => {
      // Create older competition
      const olderCompetitionResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Older Competition', '2025-01-01', 'singles', testSeasonId, 'Test', 'Standard']
      );
      const olderCompetitionId = olderCompetitionResult.rows[0].id;

      // Create newer competition
      const newerCompetitionResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Newer Competition', '2025-01-20', 'singles', testSeasonId, 'Test', 'Standard']
      );
      const newerCompetitionId = newerCompetitionResult.rows[0].id;

      // Create result in older competition (unpaid)
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [olderCompetitionId, 1, 'Jane DOE', 88, 15, 73, 1, null]
      );

      // Create result in newer competition (unpaid) - this should be selected
      const newerResultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [newerCompetitionId, 1, 'Jane DOE', 90, 16, 74, 1, null]
      );
      const newerResultId = newerResultData.rows[0].id;

      const populateData = {
        playerName: 'Jane DOE',
        amount: 40.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', newerResultId);

      // Verify only the newer result was updated
      const newerResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [newerResultId]
      );
      expect(newerResult.rows[0].swindle_money_paid).toBe('40.00');

      // Verify older result was not updated
      const olderResults = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1',
        [olderCompetitionId]
      );
      expect(olderResults.rows[0].swindle_money_paid).toBeNull();
    });

    it('should skip already paid results', async () => {
      // Create older competition with paid result
      const olderCompetitionResult = await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Older Competition', '2025-01-01', 'singles', testSeasonId, 'Test', 'Standard']
      );
      const olderCompetitionId = olderCompetitionResult.rows[0].id;

      // Create result in older competition (already paid)
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [olderCompetitionId, 1, 'Bob JONES', 85, 12, 73, 1, 30.00]
      );

      // Create result in test competition (unpaid) - this should be selected
      const unpaidResultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'Bob JONES', 88, 15, 73, 1, null]
      );
      const unpaidResultId = unpaidResultData.rows[0].id;

      const populateData = {
        playerName: 'Bob JONES',
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', unpaidResultId);

      // Verify the unpaid result was updated
      const updatedResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [unpaidResultId]
      );
      expect(updatedResult.rows[0].swindle_money_paid).toBe('50.00');

      // Verify the already paid result was not changed
      const paidResult = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1',
        [olderCompetitionId]
      );
      expect(paidResult.rows[0].swindle_money_paid).toBe('30.00');
    });

    it('should persist amount correctly', async () => {
      // Create result
      const resultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'Alice BROWN', 85, 12, 73, 1, null]
      );
      const resultId = resultData.rows[0].id;

      const populateData = {
        playerName: 'Alice BROWN',
        amount: 123.45
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', resultId);

      // Verify the exact amount was persisted
      const updatedResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [resultId]
      );
      expect(updatedResult.rows[0].swindle_money_paid).toBe('123.45');
    });

    it('should reject missing playerName', async () => {
      const populateData = {
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('playerName is required and must be a non-empty string');
    });

    it('should reject empty playerName', async () => {
      const populateData = {
        playerName: '   ',
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('playerName is required and must be a non-empty string');
    });

    it('should reject missing amount', async () => {
      const populateData = {
        playerName: 'John SMITH'
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount is required');
    });

    it('should reject negative amount', async () => {
      const populateData = {
        playerName: 'John SMITH',
        amount: -10.00
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must be non-negative');
    });

    it('should reject non-numeric amount', async () => {
      const populateData = {
        playerName: 'John SMITH',
        amount: 'fifty'
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('amount must be a number');
    });

    it('should accept zero amount', async () => {
      // Create result
      const resultData = await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [testCompetitionId, 1, 'Zero Winner', 85, 12, 73, 1, null]
      );
      const resultId = resultData.rows[0].id;

      const populateData = {
        playerName: 'Zero Winner',
        amount: 0
      };

      const response = await request(app)
        .post('/api/swindle-money/populate')
        .send(populateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('resultId', resultId);

      // Verify zero was persisted
      const updatedResult = await db.query(
        'SELECT * FROM competition_results WHERE id = $1',
        [resultId]
      );
      expect(updatedResult.rows[0].swindle_money_paid).toBe('0.00');
    });
  });
});
