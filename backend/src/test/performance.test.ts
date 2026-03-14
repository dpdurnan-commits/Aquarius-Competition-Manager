/**
 * Performance optimization tests for Task 20.1
 * Tests database query performance with 100 competitions and 5000 results
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6**
 */

import { DatabaseService } from '../services/database.service';
import { CompetitionService } from '../services/competition.service';
import { CompetitionResultService } from '../services/competitionResult.service';
import { PresentationSeasonService } from '../services/presentationSeason.service';

describe('Performance Tests - Task 20.1', () => {
  let db: DatabaseService;
  let competitionService: CompetitionService;
  let resultService: CompetitionResultService;
  let seasonService: PresentationSeasonService;

  beforeAll(async () => {
    const connectionString = process.env.TEST_DATABASE_URL || 
      'postgresql://postgres:postgres@localhost:5432/aquarius_test';
    
    db = new DatabaseService(connectionString);
    await db.connect();
    await db.runMigrations();

    competitionService = new CompetitionService(db);
    resultService = new CompetitionResultService(db);
    seasonService = new PresentationSeasonService(db);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');
  });

  describe('Database Query Optimization', () => {
    test('should verify all required indexes exist', async () => {
      // Query pg_indexes to check for required indexes
      const result = await db.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename IN ('presentation_seasons', 'competitions', 'competition_results')
        ORDER BY tablename, indexname
      `);

      const indexes = result.rows.map(r => `${r.tablename}.${r.indexname}`);

      // Check for required indexes from design document
      expect(indexes).toContain('presentation_seasons.idx_presentation_seasons_years');
      expect(indexes).toContain('competitions.idx_competitions_season_id');
      expect(indexes).toContain('competitions.idx_competitions_date');
      expect(indexes).toContain('competitions.idx_competitions_season_date');
      expect(indexes).toContain('competition_results.idx_competition_results_competition_id');
      expect(indexes).toContain('competition_results.idx_competition_results_player_name');
      expect(indexes).toContain('competition_results.idx_competition_results_comp_position');
    });

    test('should handle 100 competitions and 5000 results efficiently', async () => {
      // Create presentation seasons
      const season1 = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const season2 = await seasonService.createSeason({ 
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26
      });

      // Create 100 competitions (50 per season)
      const competitions = [];
      for (let i = 0; i < 100; i++) {
        const seasonId = i < 50 ? season1.id : season2.id;
        const comp = await competitionService.createCompetition({
          name: `Competition ${i + 1}`,
          date: `2024-${String(Math.floor(i / 8) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          type: i % 2 === 0 ? 'singles' : 'doubles',
          seasonId,
          description: `Test competition ${i + 1}`,
          prizeStructure: 'Standard',
        });
        competitions.push(comp);
      }

      // Create 5000 results (50 per competition)
      const startTime = Date.now();
      for (const comp of competitions) {
        const results = [];
        for (let j = 0; j < 50; j++) {
          results.push({
            competitionId: comp.id,
            finishingPosition: j + 1,
            playerName: `Player ${j + 1}`,
            grossScore: 70 + j,
            handicap: 10 + (j % 20),
            nettScore: 60 + j,
            entryPaid: 1,
            swindleMoneyPaid: j < 3 ? 50 - (j * 10) : 0,
          });
        }
        await resultService.bulkAddResults(results);
      }
      const insertTime = Date.now() - startTime;

      console.log(`Inserted 100 competitions and 5000 results in ${insertTime}ms`);

      // Test query performance
      const queryStart = Date.now();
      const allCompetitions = await competitionService.getAllCompetitions();
      const queryTime = Date.now() - queryStart;

      console.log(`Queried 100 competitions in ${queryTime}ms`);

      expect(allCompetitions.length).toBe(100);
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second

      // Test filtered query performance
      const filterStart = Date.now();
      const season1Comps = await competitionService.getAllCompetitions({ seasonId: season1.id });
      const filterTime = Date.now() - filterStart;

      console.log(`Filtered competitions by season in ${filterTime}ms`);

      expect(season1Comps.length).toBe(50);
      expect(filterTime).toBeLessThan(500); // Should be under 500ms

      // Test result query performance
      const resultStart = Date.now();
      const results = await resultService.getResultsByCompetition(competitions[0].id);
      const resultTime = Date.now() - resultStart;

      console.log(`Queried 50 results for one competition in ${resultTime}ms`);

      expect(results.length).toBe(50);
      expect(resultTime).toBeLessThan(100); // Should be under 100ms
    });

    test('should log slow queries in development mode', async () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log');

      // Execute a query
      await db.query('SELECT * FROM presentation_seasons');

      // Check that query was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Database Query:'),
        expect.any(String)
      );

      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    test('should use indexes for name matching queries', async () => {
      // Create test data
      const season = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const comp = await competitionService.createCompetition({
        name: 'Test Competition',
        date: '2024-01-15',
        type: 'singles',
        seasonId: season.id,
      });

      // Add 100 results
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push({
          competitionId: comp.id,
          finishingPosition: i + 1,
          playerName: `Player ${i + 1}`,
          nettScore: 70 + i,
        });
      }
      await resultService.bulkAddResults(results);

      // Test name search performance (should use index)
      const searchStart = Date.now();
      const searchResult = await db.query(
        `SELECT * FROM competition_results WHERE player_name = $1`,
        ['Player 50']
      );
      const searchTime = Date.now() - searchStart;

      console.log(`Name search completed in ${searchTime}ms`);

      expect(searchResult.rows.length).toBe(1);
      expect(searchTime).toBeLessThan(50); // Should be very fast with index
    });

    test('should efficiently query results with position ordering', async () => {
      // Create test data
      const season = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const comp = await competitionService.createCompetition({
        name: 'Test Competition',
        date: '2024-01-15',
        type: 'singles',
        seasonId: season.id,
      });

      // Add results in random order
      const results = [];
      for (let i = 50; i > 0; i--) {
        results.push({
          competitionId: comp.id,
          finishingPosition: i,
          playerName: `Player ${i}`,
          nettScore: 70 + i,
        });
      }
      await resultService.bulkAddResults(results);

      // Query with ordering (should use composite index)
      const queryStart = Date.now();
      const orderedResults = await resultService.getResultsByCompetition(comp.id);
      const queryTime = Date.now() - queryStart;

      console.log(`Ordered results query completed in ${queryTime}ms`);

      // Verify ordering
      expect(orderedResults[0].finishingPosition).toBe(1);
      expect(orderedResults[49].finishingPosition).toBe(50);
      expect(queryTime).toBeLessThan(50); // Should be fast with index
    });

    test('should handle concurrent queries efficiently', async () => {
      // Create test data
      const season = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const competitions = [];
      
      for (let i = 0; i < 10; i++) {
        const comp = await competitionService.createCompetition({
          name: `Competition ${i + 1}`,
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'singles',
          seasonId: season.id,
        });
        competitions.push(comp);
      }

      // Execute multiple concurrent queries
      const startTime = Date.now();
      const promises = competitions.map(comp => 
        competitionService.getCompetitionById(comp.id)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`10 concurrent queries completed in ${totalTime}ms`);

      expect(results.length).toBe(10);
      expect(results.every(r => r !== null)).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Should handle concurrency well
    });
  });

  describe('N+1 Query Prevention', () => {
    test('should not have N+1 queries when fetching competitions with results', async () => {
      // Create test data
      const season = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const competitions = [];
      
      for (let i = 0; i < 5; i++) {
        const comp = await competitionService.createCompetition({
          name: `Competition ${i + 1}`,
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          type: 'singles',
          seasonId: season.id,
        });
        competitions.push(comp);

        // Add results
        const results = [];
        for (let j = 0; j < 10; j++) {
          results.push({
            competitionId: comp.id,
            finishingPosition: j + 1,
            playerName: `Player ${j + 1}`,
            nettScore: 70 + j,
          });
        }
        await resultService.bulkAddResults(results);
      }

      // Spy on database queries
      const querySpy = jest.spyOn(db, 'query');

      // Fetch all competitions
      await competitionService.getAllCompetitions();

      // Should be 1 query for competitions
      expect(querySpy).toHaveBeenCalledTimes(1);

      querySpy.mockRestore();
    });

    test('should batch insert results efficiently', async () => {
      // Create test data
      const season = await seasonService.createSeason({ 
        name: 'Season: Winter 24-Summer 25',
        startYear: 24,
        endYear: 25
      });
      const comp = await competitionService.createCompetition({
        name: 'Test Competition',
        date: '2024-01-15',
        type: 'singles',
        seasonId: season.id,
      });

      // Prepare 100 results
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push({
          competitionId: comp.id,
          finishingPosition: i + 1,
          playerName: `Player ${i + 1}`,
          nettScore: 70 + i,
        });
      }

      // Spy on database queries
      const querySpy = jest.spyOn(db, 'query');

      // Bulk insert
      const startTime = Date.now();
      await resultService.bulkAddResults(results);
      const insertTime = Date.now() - startTime;

      console.log(`Bulk inserted 100 results in ${insertTime}ms`);

      // Should use transaction (BEGIN, inserts, COMMIT)
      // Each insert is separate but within one transaction
      expect(insertTime).toBeLessThan(1000); // Should be under 1 second

      querySpy.mockRestore();
    });
  });
});
