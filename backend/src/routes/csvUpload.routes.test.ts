import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import csvUploadRoutes from './csvUpload.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('CSV Upload Routes Integration', () => {
  let app: Express;
  let db: DatabaseService;
  let testSeasonId: number;
  let testSinglesCompetitionId: number;
  let testDoublesCompetitionId: number;

  beforeAll(async () => {
    // Setup test database
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use('/api/csv', csvUploadRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');

    // Create test season
    const seasonResult = await db.query(
      `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Season: Winter 25-Summer 26', 25, 26, true]
    );
    testSeasonId = seasonResult.rows[0].id;

    // Create singles competition
    const singlesResult = await db.query(
      `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Test Singles Competition', '2025-01-15', 'singles', testSeasonId, 'Test Description', 'Standard']
    );
    testSinglesCompetitionId = singlesResult.rows[0].id;

    // Create doubles competition
    const doublesResult = await db.query(
      `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Test Doubles Competition', '2025-01-20', 'doubles', testSeasonId, 'Test Description', 'Standard']
    );
    testDoublesCompetitionId = doublesResult.rows[0].id;
  });

  describe('POST /api/csv/upload/singles', () => {
    it('should upload and parse valid singles CSV', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,Jane DOE,88,15,73
3,Bob JONES,90,14,76`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Successfully created 3 result(s)');
      expect(response.body).toHaveProperty('created', 3);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(0);

      // Verify results were created in database
      const results = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1 ORDER BY finishing_position',
        [testSinglesCompetitionId]
      );
      expect(results.rows).toHaveLength(3);
      expect(results.rows[0].player_name).toBe('John SMITH');
      expect(results.rows[0].gross_score).toBe(85);
      expect(results.rows[0].handicap).toBe(12);
      expect(results.rows[0].nett_score).toBe(73);
    });

    it('should reject CSV with missing required columns', async () => {
      const csvContent = `Pos,Name,Gross
1,John SMITH,85
2,Jane DOE,88`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'CSV parsing failed');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain('Missing required columns');
    });

    it('should skip rows with empty names', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,,88,15,73
3,Bob JONES,90,14,76`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(201);

      expect(response.body.created).toBe(2);

      // Verify only 2 results were created
      const results = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1',
        [testSinglesCompetitionId]
      );
      expect(results.rows).toHaveLength(2);
    });

    it('should skip division header rows', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
,Division 1,,,
2,Jane DOE,88,15,73`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(201);

      expect(response.body.created).toBe(2);

      // Verify only 2 results were created
      const results = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1',
        [testSinglesCompetitionId]
      );
      expect(results.rows).toHaveLength(2);
    });

    it('should reject when competition not found', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', '99999')
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('Competition with id 99999 not found');
    });

    it('should reject when competition is not singles type', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testDoublesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0]).toContain('not a singles competition');
    });

    it('should reject when no file uploaded', async () => {
      const response = await request(app)
        .post('/api/csv/upload/singles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0]).toContain('No file uploaded');
    });

    it('should reject when competitionId is missing', async () => {
      const csvContent = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73`;

      const response = await request(app)
        .post('/api/csv/upload/singles')
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0]).toContain('competitionId is required');
    });

    // Note: File size limit test (5MB) is not included as it would require creating
    // a very large buffer which blocks the event loop and causes test timeouts.
    // The file size limit is enforced by multer middleware and tested manually.
  });

  describe('POST /api/csv/upload/doubles', () => {
    it('should upload and parse valid doubles CSV', async () => {
      const csvContent = `Pos,Name,Nett
1,John SMITH / Jane DOE,73
2,Bob JONES / Alice BROWN,74`;

      const response = await request(app)
        .post('/api/csv/upload/doubles')
        .field('competitionId', testDoublesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Successfully created 4 result(s)');
      expect(response.body).toHaveProperty('created', 4);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(0);

      // Verify results were created in database (2 rows = 4 results)
      const results = await db.query(
        'SELECT * FROM competition_results WHERE competition_id = $1 ORDER BY finishing_position, player_name',
        [testDoublesCompetitionId]
      );
      expect(results.rows).toHaveLength(4);
      // Results are ordered by position then name alphabetically
      expect(results.rows[0].player_name).toBe('Jane DOE');
      expect(results.rows[0].finishing_position).toBe(1);
      expect(results.rows[1].player_name).toBe('John SMITH');
      expect(results.rows[1].finishing_position).toBe(1);
      expect(results.rows[2].player_name).toBe('Alice BROWN');
      expect(results.rows[2].finishing_position).toBe(2);
      expect(results.rows[3].player_name).toBe('Bob JONES');
      expect(results.rows[3].finishing_position).toBe(2);
    });

    it('should reject CSV without "/" separator', async () => {
      const csvContent = `Pos,Name,Nett
1,John SMITH,73`;

      const response = await request(app)
        .post('/api/csv/upload/doubles')
        .field('competitionId', testDoublesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'CSV parsing failed');
      expect(response.body.errors[0].message).toContain('must contain "/" separator');
    });

    it('should reject CSV with missing required columns', async () => {
      const csvContent = `Pos,Name
1,John SMITH / Jane DOE`;

      const response = await request(app)
        .post('/api/csv/upload/doubles')
        .field('competitionId', testDoublesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'CSV parsing failed');
      expect(response.body.errors[0].message).toContain('Missing required columns');
    });

    it('should reject when competition is not doubles type', async () => {
      const csvContent = `Pos,Name,Nett
1,John SMITH / Jane DOE,73`;

      const response = await request(app)
        .post('/api/csv/upload/doubles')
        .field('competitionId', testSinglesCompetitionId.toString())
        .attach('file', Buffer.from(csvContent), 'results.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0]).toContain('not a doubles competition');
    });
  });

  describe('GET /api/csv/export/:competitionId', () => {
    it('should export singles competition results as CSV', async () => {
      // Create some results
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testSinglesCompetitionId, 1, 'John SMITH', 85, 12, 73]
      );
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, gross_score, handicap, nett_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testSinglesCompetitionId, 2, 'Jane DOE', 88, 15, 73]
      );

      const response = await request(app)
        .get(`/api/csv/export/${testSinglesCompetitionId}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');

      // Verify CSV content
      const csvContent = response.text;
      expect(csvContent).toContain('Pos,Name,Gross,Hcp,Nett');
      expect(csvContent).toContain('1,John SMITH,85,12,73');
      expect(csvContent).toContain('2,Jane DOE,88,15,73');
    });

    it('should export doubles competition results as CSV', async () => {
      // Create some results (pairs)
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, nett_score)
         VALUES ($1, $2, $3, $4)`,
        [testDoublesCompetitionId, 1, 'John SMITH', 73]
      );
      await db.query(
        `INSERT INTO competition_results (competition_id, finishing_position, player_name, nett_score)
         VALUES ($1, $2, $3, $4)`,
        [testDoublesCompetitionId, 1, 'Jane DOE', 73]
      );

      const response = await request(app)
        .get(`/api/csv/export/${testDoublesCompetitionId}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');

      // Verify CSV content
      const csvContent = response.text;
      expect(csvContent).toContain('Pos,Name,Nett');
      expect(csvContent).toContain('1,John SMITH / Jane DOE,73');
    });

    it('should return 404 when competition not found', async () => {
      const response = await request(app)
        .get('/api/csv/export/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('Competition with id 99999 not found');
    });

    it('should return 404 when no results found', async () => {
      const response = await request(app)
        .get(`/api/csv/export/${testSinglesCompetitionId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body.message).toContain('No results found');
    });

    it('should reject invalid competitionId', async () => {
      const response = await request(app)
        .get('/api/csv/export/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0]).toContain('must be a positive integer');
    });
  });
});
