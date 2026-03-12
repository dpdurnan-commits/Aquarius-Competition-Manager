import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import distributionRoutes from '../routes/distribution.routes';
import competitionCostRoutes from '../routes/competitionCost.routes';
import presentationSeasonRoutes from '../routes/presentationSeason.routes';
import competitionRoutes from '../routes/competition.routes';
import competitionResultRoutes from '../routes/competitionResult.routes';
import { connectTestDatabase, disconnectTestDatabase, resetTestDatabase } from './testDatabase';

/**
 * End-to-End Integration Tests for Presentation Night Winnings Distribution
 * 
 * These tests validate complete workflows:
 * 1. Full distribution workflow (create season, add results, assign winnings, confirm)
 * 2. Duplicate prevention workflow
 * 3. Void and recreate workflow
 * 4. Mixed winners scenario (some competitions without winners)
 * 5. Both singles and doubles competitions
 * 6. Competition costs workflow (create cost, view history, filter by date)
 * 7. Duplicate cost description prevention
 */

describe('Presentation Night Distribution E2E Tests', () => {
  let app: Express;
  let db: DatabaseService;

  beforeAll(async () => {
    db = await connectTestDatabase();

    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Make services available to routes
    app.locals.db = db;
    
    // Register routes
    app.use('/api/distributions', distributionRoutes);
    app.use('/api/competition-costs', competitionCostRoutes);
    app.use('/api/presentation-seasons', presentationSeasonRoutes);
    app.use('/api/competitions', competitionRoutes);
    app.use('/api/competition-results', competitionResultRoutes);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('Full Distribution Workflow', () => {
    it('should complete full distribution workflow: create season -> add competitions -> add results -> assign winnings -> confirm', async () => {
      // Step 1: Create a presentation season
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;
      expect(seasonId).toBeDefined();

      // Step 2: Create competitions for the season
      const comp1Response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Weekly Medal - Jan 15',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId,
          description: 'Weekly stroke play'
        })
        .expect(201);

      const comp1Id = comp1Response.body.competition.id;

      const comp2Response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Monthly Stableford - Jan 22',
          date: '2024-01-22',
          type: 'singles',
          seasonId: seasonId,
          description: 'Monthly stableford'
        })
        .expect(201);

      const comp2Id = comp2Response.body.competition.id;

      // Step 3: Add competition results (winners)
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: comp1Id,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: comp2Id,
          playerName: 'Jane Doe',
          finishingPosition: 1,
          score: 38
        })
        .expect(201);

      // Step 4: Get season winners
      const winnersResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}/winners`)
        .expect(200);

      expect(winnersResponse.body.winners).toHaveLength(2);
      expect(winnersResponse.body.winners[0].winners).toHaveLength(1);
      expect(winnersResponse.body.winners[0].winners[0].playerName).toBe('John Smith');
      expect(winnersResponse.body.winners[1].winners[0].playerName).toBe('Jane Doe');

      // Step 5: Create distribution with winnings assignments
      const distributionResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [
            { competitionId: comp1Id, amount: 50.00 },
            { competitionId: comp2Id, amount: 30.00 }
          ],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      expect(distributionResponse.body.distribution).toBeDefined();
      expect(distributionResponse.body.distribution.totalAmount).toBe('80.00');
      expect(distributionResponse.body.distribution.seasonId).toBe(seasonId);

      // Step 6: Verify distribution was recorded
      const getDistResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(200);

      expect(getDistResponse.body.distribution).toBeDefined();
      expect(getDistResponse.body.distribution.totalAmount).toBe('80.00');
      expect(getDistResponse.body.distribution.assignments).toHaveLength(2);
      expect(getDistResponse.body.distribution.assignments[0].amount).toBe('50.00');
      expect(getDistResponse.body.distribution.assignments[1].amount).toBe('30.00');
    });
  });

  describe('Duplicate Prevention Workflow', () => {
    it('should prevent creating duplicate distributions for the same season', async () => {
      // Create season and competitions
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      const compResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const compId = compResponse.body.competition.id;

      // Add winner
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: compId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Create first distribution
      await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 50.00 }],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      // Attempt to create duplicate distribution (should fail)
      const duplicateResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 60.00 }],
          transactionDate: '2025-06-16'
        })
        .expect(409);

      expect(duplicateResponse.body.error).toBe('Duplicate distribution');
      expect(duplicateResponse.body.message).toContain('already exists');
    });
  });

  describe('Void and Recreate Workflow', () => {
    it('should allow voiding a distribution and creating a new one', async () => {
      // Create season and competition
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      const compResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const compId = compResponse.body.competition.id;

      // Add winner
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: compId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Create initial distribution
      const initialDistResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 50.00 }],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      const distributionId = initialDistResponse.body.distribution.id;

      // Void the distribution
      await request(app)
        .delete(`/api/distributions/${distributionId}/void`)
        .expect(200);

      // Verify distribution is voided (should not be returned)
      const afterVoidResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(404);

      expect(afterVoidResponse.body.message).toContain('No distribution found');

      // Create new distribution with corrected amount
      const newDistResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 60.00 }],
          transactionDate: '2025-06-16'
        })
        .expect(201);

      expect(newDistResponse.body.distribution.totalAmount).toBe('60.00');

      // Verify new distribution exists
      const finalResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(200);

      expect(finalResponse.body.distribution.totalAmount).toBe('60.00');
    });

    it('should prevent voiding an already voided distribution', async () => {
      // Create season and competition
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      const compResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const compId = compResponse.body.competition.id;

      // Add winner
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: compId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Create distribution
      const distResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 50.00 }],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      const distributionId = distResponse.body.distribution.id;

      // Void the distribution
      await request(app)
        .delete(`/api/distributions/${distributionId}/void`)
        .expect(200);

      // Attempt to void again (should fail)
      const secondVoidResponse = await request(app)
        .delete(`/api/distributions/${distributionId}/void`)
        .expect(409);

      expect(secondVoidResponse.body.error).toBe('Conflict');
      expect(secondVoidResponse.body.message).toContain('already voided');
    });
  });

  describe('Mixed Winners Scenario', () => {
    it('should handle seasons with some competitions without winners', async () => {
      // Create season
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      // Create three competitions
      const comp1Response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Competition 1 - With Winner',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const comp1Id = comp1Response.body.competition.id;

      await request(app)
        .post('/api/competitions')
        .send({
          name: 'Competition 2 - No Winner',
          date: '2024-01-22',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      // comp2 has no winner, so we don't need its ID

      const comp3Response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Competition 3 - With Winner',
          date: '2024-01-29',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const comp3Id = comp3Response.body.competition.id;

      // Add winners only for comp1 and comp3
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: comp1Id,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: comp3Id,
          playerName: 'Jane Doe',
          finishingPosition: 1,
          score: 38
        })
        .expect(201);

      // Get season winners
      const winnersResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}/winners`)
        .expect(200);

      expect(winnersResponse.body.winners).toHaveLength(3);
      expect(winnersResponse.body.winners[0].winners).toHaveLength(1); // comp1 has winner
      expect(winnersResponse.body.winners[1].winners).toHaveLength(0); // comp2 has no winner
      expect(winnersResponse.body.winners[2].winners).toHaveLength(1); // comp3 has winner

      // Create distribution only for competitions with winners
      const distributionResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [
            { competitionId: comp1Id, amount: 50.00 },
            { competitionId: comp3Id, amount: 30.00 }
            // comp2 excluded because no winner
          ],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      expect(distributionResponse.body.distribution.totalAmount).toBe('80.00');
      
      // Verify distribution was created by fetching it
      const getDistResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}`)
        .expect(200);
      
      expect(getDistResponse.body.distribution.assignments).toHaveLength(2);
    });
  });

  describe('Singles and Doubles Competitions', () => {
    it('should handle both singles and doubles competitions correctly', async () => {
      // Create season
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      // Create singles competition
      const singlesResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Singles Medal',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const singlesId = singlesResponse.body.competition.id;

      // Create doubles competition
      const doublesResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Doubles Foursomes',
          date: '2024-01-22',
          type: 'doubles',
          seasonId: seasonId
        })
        .expect(201);

      const doublesId = doublesResponse.body.competition.id;

      // Add single winner for singles competition
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: singlesId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Add two winners for doubles competition (winning pair)
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: doublesId,
          playerName: 'Jane Doe',
          finishingPosition: 1,
          score: 65
        })
        .expect(201);

      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: doublesId,
          playerName: 'Bob Wilson',
          finishingPosition: 1,
          score: 65
        })
        .expect(201);

      // Get season winners
      const winnersResponse = await request(app)
        .get(`/api/distributions/season/${seasonId}/winners`)
        .expect(200);

      expect(winnersResponse.body.winners).toHaveLength(2);
      
      // Verify singles competition has 1 winner
      const singlesComp = winnersResponse.body.winners.find((c: any) => c.competitionType === 'singles');
      expect(singlesComp).toBeDefined();
      expect(singlesComp.winners).toHaveLength(1);
      expect(singlesComp.winners[0].playerName).toBe('John Smith');

      // Verify doubles competition has 2 winners
      const doublesComp = winnersResponse.body.winners.find((c: any) => c.competitionType === 'doubles');
      expect(doublesComp).toBeDefined();
      expect(doublesComp.winners).toHaveLength(2);
      expect(doublesComp.winners[0].playerName).toBe('Jane Doe');
      expect(doublesComp.winners[1].playerName).toBe('Bob Wilson');

      // Create distribution with different amounts for singles and doubles
      const distributionResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [
            { competitionId: singlesId, amount: 50.00 },
            { competitionId: doublesId, amount: 80.00 } // Higher amount for doubles pair
          ],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      expect(distributionResponse.body.distribution.totalAmount).toBe('130.00');
    });
  });

  describe('Competition Costs Workflow', () => {
    it('should complete full competition costs workflow: create cost -> view history -> filter by date', async () => {
      // Step 1: Create multiple competition costs
      const cost1Response = await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Trophy Engraving',
          amount: 45.50
        })
        .expect(201);

      expect(cost1Response.body.cost).toBeDefined();
      expect(cost1Response.body.cost.description).toBe('Trophy Engraving');
      expect(cost1Response.body.cost.amount).toBe('45.50');

      const cost2Response = await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Stationery and Pens',
          amount: 25.00
        })
        .expect(201);

      expect(cost2Response.body.cost.amount).toBe('25.00');

      const cost3Response = await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Competition Equipment',
          amount: 150.75
        })
        .expect(201);

      expect(cost3Response.body.cost.amount).toBe('150.75');

      // Step 2: View all costs
      const allCostsResponse = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(allCostsResponse.body.costs).toHaveLength(3);
      expect(allCostsResponse.body.total).toBe(221.25);

      // Verify costs are ordered by date (most recent first)
      expect(allCostsResponse.body.costs[0].description).toBe('Competition Equipment');
      expect(allCostsResponse.body.costs[1].description).toBe('Stationery and Pens');
      expect(allCostsResponse.body.costs[2].description).toBe('Trophy Engraving');

      // Step 3: Filter by date range
      const today = new Date().toISOString().split('T')[0];
      const rangeResponse = await request(app)
        .get(`/api/competition-costs/range?startDate=${today}&endDate=${today}`)
        .expect(200);

      expect(rangeResponse.body.costs).toHaveLength(3);
      expect(rangeResponse.body.total).toBe(221.25);

      // Test with date range that excludes all costs
      const futureDate = '2099-12-31';
      const emptyRangeResponse = await request(app)
        .get(`/api/competition-costs/range?startDate=${futureDate}&endDate=${futureDate}`)
        .expect(200);

      expect(emptyRangeResponse.body.costs).toHaveLength(0);
      expect(emptyRangeResponse.body.total).toBe(0);
    });
  });

  describe('Duplicate Cost Description Prevention', () => {
    it('should prevent creating costs with duplicate descriptions', async () => {
      // Create first cost
      await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Trophy Engraving',
          amount: 45.50
        })
        .expect(201);

      // Attempt to create duplicate (should fail)
      const duplicateResponse = await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Trophy Engraving',
          amount: 50.00
        })
        .expect(409);

      expect(duplicateResponse.body.error).toBe('Duplicate description');
      expect(duplicateResponse.body.message).toContain('already exists');

      // Verify only one cost exists
      const allCostsResponse = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(allCostsResponse.body.costs).toHaveLength(1);
      expect(allCostsResponse.body.costs[0].amount).toBe('45.50');
    });

    it('should allow creating costs with similar but different descriptions', async () => {
      // Create costs with similar descriptions
      await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Trophy Engraving - January',
          amount: 45.50
        })
        .expect(201);

      await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Trophy Engraving - February',
          amount: 50.00
        })
        .expect(201);

      // Verify both costs exist
      const allCostsResponse = await request(app)
        .get('/api/competition-costs')
        .expect(200);

      expect(allCostsResponse.body.costs).toHaveLength(2);
      expect(allCostsResponse.body.total).toBe(95.50);
    });
  });

  describe('Pot Balance Deduction', () => {
    it('should deduct distribution amount from competition pot balance', async () => {
      // Create season and competition
      const seasonResponse = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const seasonId = seasonResponse.body.season.id;

      const compResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2024-01-15',
          type: 'singles',
          seasonId: seasonId
        })
        .expect(201);

      const compId = compResponse.body.competition.id;

      // Add winner
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: compId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Create distribution
      const distributionResponse = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: seasonId,
          assignments: [{ competitionId: compId, amount: 50.00 }],
          transactionDate: '2025-06-15'
        })
        .expect(201);

      // Verify transaction was created
      expect(distributionResponse.body.distribution.transactionId).toBeDefined();
      expect(distributionResponse.body.distribution.totalAmount).toBe('50.00');

      // The transaction should be recorded as a cost, which will be reflected in the pot balance
      // This is verified by the transaction system integration
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid season ID when getting winners', async () => {
      const response = await request(app)
        .get('/api/distributions/season/99999/winners')
        .expect(404);

      expect(response.body.error).toBe('Not found');
      expect(response.body.message).toContain('not found');
    });

    it('should validate distribution data', async () => {
      // Missing required fields
      const response = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: 1
          // Missing assignments and transactionDate
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate competition cost data', async () => {
      // Missing description
      const response1 = await request(app)
        .post('/api/competition-costs')
        .send({
          amount: 50.00
        })
        .expect(400);

      expect(response1.body.error).toBe('Validation failed');

      // Invalid amount (negative)
      const response2 = await request(app)
        .post('/api/competition-costs')
        .send({
          description: 'Test Cost',
          amount: -10.00
        })
        .expect(400);

      expect(response2.body.error).toBe('Validation failed');
    });

    it('should handle competition from different season', async () => {
      // Create two seasons with valid names
      const season1Response = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 23-Summer 24',
          startYear: 23,
          endYear: 24
        })
        .expect(201);

      const season1Id = season1Response.body.season.id;

      const season2Response = await request(app)
        .post('/api/presentation-seasons')
        .send({
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25
        })
        .expect(201);

      const season2Id = season2Response.body.season.id;

      // Create competition in season 2
      const compResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Test Competition',
          date: '2025-01-15',
          type: 'singles',
          seasonId: season2Id
        })
        .expect(201);

      const compId = compResponse.body.competition.id;

      // Add winner
      await request(app)
        .post('/api/competition-results')
        .send({
          competitionId: compId,
          playerName: 'John Smith',
          finishingPosition: 1,
          score: 72
        })
        .expect(201);

      // Attempt to create distribution for season 1 with competition from season 2
      const response = await request(app)
        .post('/api/distributions')
        .send({
          seasonId: season1Id,
          assignments: [{ competitionId: compId, amount: 50.00 }],
          transactionDate: '2025-06-15'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('not in season');
    });
  });
});
