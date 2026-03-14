import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import { PresentationSeasonService } from '../services/presentationSeason.service';
import competitionRoutes from './competition.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Competition Routes - Finished Status Integration Tests', () => {
  let app: Express;
  let db: DatabaseService;
  let seasonService: PresentationSeasonService;
  let testSeasonId: number;

  beforeAll(async () => {
    // Initialize database connection
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();
    seasonService = new PresentationSeasonService(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Make db available to routes
    app.locals.db = db;
    
    // Register routes
    app.use('/api/competitions', competitionRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');
    
    // Create a test season for all tests
    const season = await seasonService.createSeason({
      name: 'Season: Winter 24-Summer 25',
      startYear: 24,
      endYear: 25
    });
    testSeasonId = season.id;
  });

  describe('GET /api/competitions with finished parameter', () => {
    beforeEach(async () => {
      // Create test competitions with different finished statuses
      await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'Active Competition 1', 
          date: '2024-01-15', 
          type: 'singles', 
          seasonId: testSeasonId 
        });

      await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'Active Competition 2', 
          date: '2024-01-20', 
          type: 'doubles', 
          seasonId: testSeasonId 
        });

      // Get the competitions and mark one as finished
      const allComps = await request(app).get('/api/competitions');
      const comp1Id = allComps.body.competitions[0].id;
      
      await request(app)
        .put(`/api/competitions/${comp1Id}`)
        .send({ finished: true });
    });

    it('should return only finished competitions when finished=true', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .query({ finished: 'true' })
        .expect(200);

      expect(response.body.competitions).toHaveLength(1);
      expect(response.body.competitions[0].finished).toBe(true);
      expect(response.body.count).toBe(1);
    });

    it('should return only unfinished competitions when finished=false', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .query({ finished: 'false' })
        .expect(200);

      expect(response.body.competitions).toHaveLength(1);
      expect(response.body.competitions[0].finished).toBe(false);
      expect(response.body.count).toBe(1);
    });

    it('should return all competitions when finished parameter is omitted', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(response.body.competitions).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should return 400 for invalid finished parameter', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .query({ finished: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('finished must be "true" or "false"');
    });

    it('should support combining finished and seasonId filters', async () => {
      // Create another season
      const season2 = await seasonService.createSeason({
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26
      });

      // Create competition in new season
      await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'Season 2 Competition', 
          date: '2025-01-15', 
          type: 'singles', 
          seasonId: season2.id 
        });

      const response = await request(app)
        .get('/api/competitions')
        .query({ finished: 'false', seasonId: testSeasonId })
        .expect(200);

      expect(response.body.competitions).toHaveLength(1);
      expect(response.body.competitions[0].finished).toBe(false);
      expect(response.body.competitions[0].seasonId).toBe(testSeasonId);
    });
  });

  describe('PATCH /api/competitions/:id with finished field', () => {
    let competitionId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'Test Competition', 
          date: '2024-01-15', 
          type: 'singles', 
          seasonId: testSeasonId 
        });
      
      competitionId = createResponse.body.competition.id;
    });

    it('should update finished status to true', async () => {
      const response = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ finished: true })
        .expect(200);

      expect(response.body.message).toBe('Competition updated successfully');
      expect(response.body.competition.finished).toBe(true);
    });

    it('should update finished status to false', async () => {
      // First mark as finished
      await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ finished: true });

      // Then unmark
      const response = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ finished: false })
        .expect(200);

      expect(response.body.competition.finished).toBe(false);
    });

    it('should allow updating finished status along with other fields', async () => {
      const response = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ 
          name: 'Updated Name',
          finished: true 
        })
        .expect(200);

      expect(response.body.competition.name).toBe('Updated Name');
      expect(response.body.competition.finished).toBe(true);
    });

    it('should persist finished status in database', async () => {
      // Update finished status
      await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ finished: true });

      // Retrieve and verify
      const response = await request(app)
        .get('/api/competitions')
        .query({ finished: 'true' })
        .expect(200);

      expect(response.body.competitions).toHaveLength(1);
      expect(response.body.competitions[0].id).toBe(competitionId);
      expect(response.body.competitions[0].finished).toBe(true);
    });

    it('should return 404 for non-existent competition', async () => {
      const response = await request(app)
        .put('/api/competitions/99999')
        .send({ finished: true })
        .expect(404);

      expect(response.body.error).toBe('Not found');
    });
  });

  describe('Competition finished status defaults', () => {
    it('should default finished to false when creating competition', async () => {
      const response = await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'New Competition', 
          date: '2024-01-15', 
          type: 'singles', 
          seasonId: testSeasonId 
        })
        .expect(201);

      expect(response.body.competition.finished).toBe(false);
    });

    it('should include finished field in all competition responses', async () => {
      const createResponse = await request(app)
        .post('/api/competitions')
        .send({ 
          name: 'Test Competition', 
          date: '2024-01-15', 
          type: 'singles', 
          seasonId: testSeasonId 
        });

      const competitionId = createResponse.body.competition.id;

      // Test GET all
      const getAllResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(getAllResponse.body.competitions[0]).toHaveProperty('finished');
      expect(typeof getAllResponse.body.competitions[0].finished).toBe('boolean');

      // Test PUT
      const updateResponse = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ name: 'Updated' })
        .expect(200);

      expect(updateResponse.body.competition).toHaveProperty('finished');
      expect(typeof updateResponse.body.competition.finished).toBe('boolean');
    });
  });
});
