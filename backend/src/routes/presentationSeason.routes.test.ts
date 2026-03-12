import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import presentationSeasonRoutes from './presentationSeason.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Presentation Season Routes Integration', () => {
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
    app.use('/api/presentation-seasons', presentationSeasonRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');
  });

  describe('POST /api/presentation-seasons', () => {
    it('should create season with valid data', async () => {
      const seasonData = {
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26
      };

      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Presentation season created successfully');
      expect(response.body).toHaveProperty('season');
      expect(response.body.season).toMatchObject({
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26,
        isActive: false
      });
      expect(response.body.season).toHaveProperty('id');
      expect(response.body.season).toHaveProperty('createdAt');
      expect(response.body.season).toHaveProperty('updatedAt');
    });

    it('should reject invalid format - missing "Season:" prefix', async () => {
      const seasonData = {
        name: 'Winter 25-Summer 26',
        startYear: 25,
        endYear: 26
      };

      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toContain('name must match format "Season: Winter YY-Summer YY"');
    });

    it('should reject invalid format - wrong separator', async () => {
      const seasonData = {
        name: 'Season: Winter 25 Summer 26',
        startYear: 25,
        endYear: 26
      };

      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('name must match format "Season: Winter YY-Summer YY"');
    });

    it('should reject invalid format - three digit year', async () => {
      const seasonData = {
        name: 'Season: Winter 025-Summer 026',
        startYear: 25,
        endYear: 26
      };

      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('name must match format "Season: Winter YY-Summer YY"');
    });

    it('should reject when startYear > endYear', async () => {
      const seasonData = {
        name: 'Season: Winter 27-Summer 26',
        startYear: 27,
        endYear: 26
      };

      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('Start year must be less than or equal to end year');
    });

    it('should reject duplicate season name', async () => {
      const seasonData = {
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26
      };

      // Create first season
      await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/presentation-seasons')
        .send(seasonData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('A season with this name already exists');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/presentation-seasons')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('name is required and must be a non-empty string');
      expect(response.body.details).toContain('startYear is required');
      expect(response.body.details).toContain('endYear is required');
    });
  });

  describe('GET /api/presentation-seasons', () => {
    it('should return empty array when no seasons exist', async () => {
      const response = await request(app)
        .get('/api/presentation-seasons')
        .expect(200);

      expect(response.body).toHaveProperty('seasons');
      expect(response.body).toHaveProperty('count', 0);
      expect(Array.isArray(response.body.seasons)).toBe(true);
      expect(response.body.seasons).toHaveLength(0);
    });

    it('should return all seasons chronologically ordered', async () => {
      // Create seasons in non-chronological order
      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 26-Summer 27', startYear: 26, endYear: 27 });

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 24-Summer 25', startYear: 24, endYear: 25 });

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });

      const response = await request(app)
        .get('/api/presentation-seasons')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.seasons).toHaveLength(3);
      
      // Verify chronological order (ascending by startYear)
      expect(response.body.seasons[0].startYear).toBe(24);
      expect(response.body.seasons[1].startYear).toBe(25);
      expect(response.body.seasons[2].startYear).toBe(26);
      
      expect(response.body.seasons[0].name).toBe('Season: Winter 24-Summer 25');
      expect(response.body.seasons[1].name).toBe('Season: Winter 25-Summer 26');
      expect(response.body.seasons[2].name).toBe('Season: Winter 26-Summer 27');
    });

    it('should filter seasons by allCompetitionsAdded=false', async () => {
      // Create seasons with different allCompetitionsAdded values
      const season1Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 24-Summer 25', startYear: 24, endYear: 25 });
      const season1Id = season1Response.body.season.id;

      const season2Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const season2Id = season2Response.body.season.id;

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 26-Summer 27', startYear: 26, endYear: 27 });

      // Set season1 and season2 to allCompetitionsAdded=true
      await request(app)
        .patch(`/api/presentation-seasons/${season1Id}`)
        .send({ allCompetitionsAdded: true });

      await request(app)
        .patch(`/api/presentation-seasons/${season2Id}`)
        .send({ allCompetitionsAdded: true });

      // Filter for seasons with allCompetitionsAdded=false
      const response = await request(app)
        .get('/api/presentation-seasons?allCompetitionsAdded=false')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.seasons).toHaveLength(1);
      expect(response.body.seasons[0].name).toBe('Season: Winter 26-Summer 27');
      expect(response.body.seasons[0].allCompetitionsAdded).toBe(false);
    });

    it('should filter seasons by allCompetitionsAdded=true', async () => {
      // Create seasons with different allCompetitionsAdded values
      const season1Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 24-Summer 25', startYear: 24, endYear: 25 });
      const season1Id = season1Response.body.season.id;

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });

      const season3Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 26-Summer 27', startYear: 26, endYear: 27 });
      const season3Id = season3Response.body.season.id;

      // Set season1 and season3 to allCompetitionsAdded=true
      await request(app)
        .patch(`/api/presentation-seasons/${season1Id}`)
        .send({ allCompetitionsAdded: true });

      await request(app)
        .patch(`/api/presentation-seasons/${season3Id}`)
        .send({ allCompetitionsAdded: true });

      // Filter for seasons with allCompetitionsAdded=true
      const response = await request(app)
        .get('/api/presentation-seasons?allCompetitionsAdded=true')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.seasons).toHaveLength(2);
      expect(response.body.seasons[0].name).toBe('Season: Winter 24-Summer 25');
      expect(response.body.seasons[1].name).toBe('Season: Winter 26-Summer 27');
      expect(response.body.seasons[0].allCompetitionsAdded).toBe(true);
      expect(response.body.seasons[1].allCompetitionsAdded).toBe(true);
    });
  });

  describe('PUT /api/presentation-seasons/:id/activate', () => {
    it('should activate season and deactivate others', async () => {
      // Create three seasons
      const season1Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 24-Summer 25', startYear: 24, endYear: 25 });
      const season1Id = season1Response.body.season.id;

      const season2Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const season2Id = season2Response.body.season.id;

      const season3Response = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 26-Summer 27', startYear: 26, endYear: 27 });
      const season3Id = season3Response.body.season.id;

      // Activate season 1
      await request(app)
        .put(`/api/presentation-seasons/${season1Id}/activate`)
        .expect(200);

      // Verify season 1 is active
      let allSeasons = await request(app).get('/api/presentation-seasons');
      expect(allSeasons.body.seasons.find((s: any) => s.id === season1Id).isActive).toBe(true);
      expect(allSeasons.body.seasons.find((s: any) => s.id === season2Id).isActive).toBe(false);
      expect(allSeasons.body.seasons.find((s: any) => s.id === season3Id).isActive).toBe(false);

      // Activate season 2
      const activateResponse = await request(app)
        .put(`/api/presentation-seasons/${season2Id}/activate`)
        .expect(200);

      expect(activateResponse.body).toHaveProperty('message', 'Presentation season activated successfully');
      expect(activateResponse.body.season.isActive).toBe(true);

      // Verify only season 2 is active
      allSeasons = await request(app).get('/api/presentation-seasons');
      expect(allSeasons.body.seasons.find((s: any) => s.id === season1Id).isActive).toBe(false);
      expect(allSeasons.body.seasons.find((s: any) => s.id === season2Id).isActive).toBe(true);
      expect(allSeasons.body.seasons.find((s: any) => s.id === season3Id).isActive).toBe(false);

      // Verify exactly one active season
      const activeCount = allSeasons.body.seasons.filter((s: any) => s.isActive).length;
      expect(activeCount).toBe(1);
    });

    it('should return 404 for non-existent season', async () => {
      const response = await request(app)
        .put('/api/presentation-seasons/99999/activate')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });

  describe('POST /api/presentation-seasons/auto-increment', () => {
    it('should create correct next season', async () => {
      // Create initial season
      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });

      // Auto-increment
      const response = await request(app)
        .post('/api/presentation-seasons/auto-increment')
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Presentation season auto-incremented successfully');
      expect(response.body.season).toMatchObject({
        name: 'Season: Winter 26-Summer 27',
        startYear: 26,
        endYear: 27
      });
    });

    it('should auto-increment from most recent season', async () => {
      // Create multiple seasons
      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 24-Summer 25', startYear: 24, endYear: 25 });

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 26-Summer 27', startYear: 26, endYear: 27 });

      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });

      // Auto-increment should use most recent (26-27)
      const response = await request(app)
        .post('/api/presentation-seasons/auto-increment')
        .expect(201);

      expect(response.body.season).toMatchObject({
        name: 'Season: Winter 27-Summer 28',
        startYear: 27,
        endYear: 28
      });
    });

    it('should fail when no existing seasons', async () => {
      const response = await request(app)
        .post('/api/presentation-seasons/auto-increment')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad request');
      expect(response.body.message).toContain('No existing seasons');
    });
  });

  describe('DELETE /api/presentation-seasons/:id', () => {
    it('should delete season when no competitions exist', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Delete season
      const response = await request(app)
        .delete(`/api/presentation-seasons/${seasonId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Presentation season deleted successfully');

      // Verify season is deleted
      const allSeasons = await request(app).get('/api/presentation-seasons');
      expect(allSeasons.body.count).toBe(0);
    });

    it('should fail when competitions exist', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Create competition associated with season
      await db.query(
        `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Test Competition', '2025-01-15', 'singles', seasonId, 'Test', 'Standard']
      );

      // Try to delete season
      const response = await request(app)
        .delete(`/api/presentation-seasons/${seasonId}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad request');
      expect(response.body.message).toContain('Cannot delete season');

      // Verify season still exists
      const allSeasons = await request(app).get('/api/presentation-seasons');
      expect(allSeasons.body.count).toBe(1);
    });

    it('should return 404 for non-existent season', async () => {
      const response = await request(app)
        .delete('/api/presentation-seasons/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });

  describe('GET /api/presentation-seasons/active', () => {
    it('should return null when no active season', async () => {
      // Create season but don't activate
      await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });

      const response = await request(app)
        .get('/api/presentation-seasons/active')
        .expect(200);

      expect(response.body).toHaveProperty('season', null);
    });

    it('should return active season', async () => {
      // Create and activate season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      await request(app)
        .put(`/api/presentation-seasons/${seasonId}/activate`)
        .expect(200);

      const response = await request(app)
        .get('/api/presentation-seasons/active')
        .expect(200);

      expect(response.body.season).toMatchObject({
        id: seasonId,
        name: 'Season: Winter 25-Summer 26',
        isActive: true
      });
    });
  });

  describe('PATCH /api/presentation-seasons/:id', () => {
    it('should update allCompetitionsAdded flag to true', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Verify initial state
      expect(createResponse.body.season.allCompetitionsAdded).toBe(false);

      // Update flag to true
      const response = await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({ allCompetitionsAdded: true })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Presentation season updated successfully');
      expect(response.body.season).toMatchObject({
        id: seasonId,
        name: 'Season: Winter 25-Summer 26',
        allCompetitionsAdded: true
      });

      // Verify persistence
      const allSeasons = await request(app).get('/api/presentation-seasons');
      const updatedSeason = allSeasons.body.seasons.find((s: any) => s.id === seasonId);
      expect(updatedSeason.allCompetitionsAdded).toBe(true);
    });

    it('should update allCompetitionsAdded flag to false', async () => {
      // Create season and set flag to true
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({ allCompetitionsAdded: true })
        .expect(200);

      // Update flag back to false
      const response = await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({ allCompetitionsAdded: false })
        .expect(200);

      expect(response.body.season).toMatchObject({
        id: seasonId,
        allCompetitionsAdded: false
      });

      // Verify persistence
      const allSeasons = await request(app).get('/api/presentation-seasons');
      const updatedSeason = allSeasons.body.seasons.find((s: any) => s.id === seasonId);
      expect(updatedSeason.allCompetitionsAdded).toBe(false);
    });

    it('should update multiple fields including allCompetitionsAdded', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Update multiple fields
      const response = await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({ 
          allCompetitionsAdded: true,
          isActive: true
        })
        .expect(200);

      expect(response.body.season).toMatchObject({
        id: seasonId,
        allCompetitionsAdded: true,
        isActive: true
      });
    });

    it('should return 404 for non-existent season', async () => {
      const response = await request(app)
        .patch('/api/presentation-seasons/99999')
        .send({ allCompetitionsAdded: true })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should reject invalid allCompetitionsAdded value', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Try to update with invalid value
      const response = await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({ allCompetitionsAdded: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('allCompetitionsAdded must be a boolean');
    });

    it('should reject empty update', async () => {
      // Create season
      const createResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({ name: 'Season: Winter 25-Summer 26', startYear: 25, endYear: 26 });
      const seasonId = createResponse.body.season.id;

      // Try to update with no fields
      const response = await request(app)
        .patch(`/api/presentation-seasons/${seasonId}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('At least one field must be provided for update');
    });
  });
});
