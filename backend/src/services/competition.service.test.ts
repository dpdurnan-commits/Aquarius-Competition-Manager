import { CompetitionService } from './competition.service';
import { DatabaseService } from './database.service';
import { PresentationSeasonService } from './presentationSeason.service';
import { CreateCompetitionDTO, UpdateCompetitionDTO } from '../types';

describe('CompetitionService', () => {
  let competitionService: CompetitionService;
  let seasonService: PresentationSeasonService;
  let dbService: DatabaseService;
  let testSeasonId: number;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/competition_test';
    dbService = new DatabaseService(connectionString);
    await dbService.connect();
    await dbService.runMigrations();
    competitionService = new CompetitionService(dbService);
    seasonService = new PresentationSeasonService(dbService);
  });

  afterAll(async () => {
    await dbService.disconnect();
  });

  beforeEach(async () => {
    // Clean up competitions and flagged_transactions before each test
    await dbService.query('DELETE FROM flagged_transactions');
    await dbService.query('DELETE FROM competition_results');
    await dbService.query('DELETE FROM competitions');
    await dbService.query('DELETE FROM presentation_seasons');
    
    // Create a test season for all tests
    const season = await seasonService.createSeason({
      name: 'Season: Winter 24-Summer 25',
      startYear: 24,
      endYear: 25
    });
    testSeasonId = season.id;
  });

  describe('createCompetition', () => {
    it('should create a new competition with all fields', async () => {
      const dto: CreateCompetitionDTO = {
        name: 'Summer Championship',
        date: '2024-07-15',
        type: 'singles',
        seasonId: testSeasonId,
        description: 'Annual summer golf championship',
        prizeStructure: '1st: £100, 2nd: £50, 3rd: £25'
      };

      const competition = await competitionService.createCompetition(dto);

      expect(competition.id).toBeDefined();
      expect(competition.name).toBe(dto.name);
      expect(competition.date).toBe(dto.date);
      expect(competition.type).toBe(dto.type);
      expect(competition.seasonId).toBe(testSeasonId);
      expect(competition.description).toBe(dto.description);
      expect(competition.prizeStructure).toBe(dto.prizeStructure);
      expect(competition.createdAt).toBeDefined();
      expect(competition.updatedAt).toBeDefined();
    });

    it('should create a competition with minimal fields', async () => {
      const dto: CreateCompetitionDTO = {
        name: 'Winter Cup',
        date: '2024-12-20',
        type: 'doubles',
        seasonId: testSeasonId
      };

      const competition = await competitionService.createCompetition(dto);

      expect(competition.id).toBeDefined();
      expect(competition.name).toBe(dto.name);
      expect(competition.date).toBe(dto.date);
      expect(competition.description).toBe('');
      expect(competition.prizeStructure).toBe('');
    });
  });

  describe('getAllCompetitions', () => {
    it('should return empty array when no competitions exist', async () => {
      const competitions = await competitionService.getAllCompetitions();
      expect(competitions).toEqual([]);
    });

    it('should return all competitions ordered by date descending', async () => {
      await competitionService.createCompetition({ name: 'Comp A', date: '2024-01-15', type: 'singles', seasonId: testSeasonId });
      await competitionService.createCompetition({ name: 'Comp B', date: '2024-03-20', type: 'singles', seasonId: testSeasonId });
      await competitionService.createCompetition({ name: 'Comp C', date: '2024-02-10', type: 'doubles', seasonId: testSeasonId });

      const competitions = await competitionService.getAllCompetitions();

      expect(competitions).toHaveLength(3);
      expect(competitions[0].name).toBe('Comp B'); // Latest date first
      expect(competitions[1].name).toBe('Comp C');
      expect(competitions[2].name).toBe('Comp A');
    });
  });

  describe('getCompetitionById', () => {
    it('should return null when competition does not exist', async () => {
      const competition = await competitionService.getCompetitionById(999);
      expect(competition).toBeNull();
    });

    it('should return competition when it exists', async () => {
      const created = await competitionService.createCompetition({
        name: 'Test Competition',
        date: '2024-06-01',
        type: 'singles',
        seasonId: testSeasonId
      });

      const found = await competitionService.getCompetitionById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Test Competition');
    });
  });

  describe('updateCompetition', () => {
    it('should update competition name', async () => {
      const created = await competitionService.createCompetition({
        name: 'Old Name',
        date: '2024-05-01',
        type: 'singles',
        seasonId: testSeasonId
      });

      const updates: UpdateCompetitionDTO = { name: 'New Name' };
      const updated = await competitionService.updateCompetition(created.id, updates);

      expect(updated.name).toBe('New Name');
      expect(updated.date).toBe('2024-05-01'); // Unchanged
    });

    it('should update multiple fields', async () => {
      const created = await competitionService.createCompetition({
        name: 'Original',
        date: '2024-05-01',
        type: 'singles',
        seasonId: testSeasonId,
        description: 'Old description'
      });

      const updates: UpdateCompetitionDTO = {
        name: 'Updated',
        description: 'New description',
        prizeStructure: '1st: £200'
      };
      const updated = await competitionService.updateCompetition(created.id, updates);

      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('New description');
      expect(updated.prizeStructure).toBe('1st: £200');
    });

    it('should throw error when competition does not exist', async () => {
      await expect(
        competitionService.updateCompetition(999, { name: 'Test' })
      ).rejects.toThrow('Competition with id 999 not found');
    });

    it('should throw error when no fields to update', async () => {
      const created = await competitionService.createCompetition({
        name: 'Test',
        date: '2024-05-01',
        type: 'singles',
        seasonId: testSeasonId
      });

      await expect(
        competitionService.updateCompetition(created.id, {})
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('deleteCompetition', () => {
    it('should delete competition', async () => {
      const created = await competitionService.createCompetition({
        name: 'To Delete',
        date: '2024-05-01',
        type: 'singles',
        seasonId: testSeasonId
      });

      await competitionService.deleteCompetition(created.id);

      const found = await competitionService.getCompetitionById(created.id);
      expect(found).toBeNull();
    });

    it('should throw error when competition does not exist', async () => {
      await expect(
        competitionService.deleteCompetition(999)
      ).rejects.toThrow('Competition with id 999 not found');
    });

    it('should cascade delete flagged transaction associations', async () => {
      // Create a transaction first
      await dbService.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        ['2024-05-01', '10:00:00', 'Till 1', 'Sale', 'Member A', 'Player A', 'Comp A',
         '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
      );

      const txResult = await dbService.query('SELECT id FROM transactions LIMIT 1');
      const transactionId = txResult.rows[0].id;

      // Create competition
      const competition = await competitionService.createCompetition({
        name: 'Test Competition',
        date: '2024-05-01',
        type: 'singles',
        seasonId: testSeasonId
      });

      // Create flagged transaction association
      await dbService.query(
        'INSERT INTO flagged_transactions (transaction_id, competition_id) VALUES ($1, $2)',
        [transactionId, competition.id]
      );

      // Verify flagged transaction exists
      const flaggedBefore = await dbService.query(
        'SELECT * FROM flagged_transactions WHERE competition_id = $1',
        [competition.id]
      );
      expect(flaggedBefore.rows).toHaveLength(1);

      // Delete competition
      await competitionService.deleteCompetition(competition.id);

      // Verify flagged transaction association was deleted
      const flaggedAfter = await dbService.query(
        'SELECT * FROM flagged_transactions WHERE competition_id = $1',
        [competition.id]
      );
      expect(flaggedAfter.rows).toHaveLength(0);
    });
  });

  describe('finished status support', () => {
    describe('createCompetition', () => {
      it('should include finished status in response (defaults to false)', async () => {
        const dto: CreateCompetitionDTO = {
          name: 'Test Competition',
          date: '2024-06-01',
          type: 'singles',
          seasonId: testSeasonId
        };

        const competition = await competitionService.createCompetition(dto);

        expect(competition.finished).toBeDefined();
        expect(competition.finished).toBe(false);
      });
    });

    describe('getCompetitionById', () => {
      it('should include finished status in response', async () => {
        const created = await competitionService.createCompetition({
          name: 'Test Competition',
          date: '2024-06-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        const found = await competitionService.getCompetitionById(created.id);

        expect(found).not.toBeNull();
        expect(found!.finished).toBeDefined();
        expect(found!.finished).toBe(false);
      });
    });

    describe('getAllCompetitions', () => {
      it('should include finished status for all competitions', async () => {
        await competitionService.createCompetition({
          name: 'Comp A',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        const competitions = await competitionService.getAllCompetitions();

        expect(competitions).toHaveLength(1);
        expect(competitions[0].finished).toBeDefined();
        expect(competitions[0].finished).toBe(false);
      });

      it('should filter by finished=false to return only unfinished competitions', async () => {
        const comp1 = await competitionService.createCompetition({
          name: 'Active Comp',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        const comp2 = await competitionService.createCompetition({
          name: 'Finished Comp',
          date: '2024-02-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        // Mark comp2 as finished
        await competitionService.updateCompetition(comp2.id, { finished: true });

        const unfinished = await competitionService.getAllCompetitions({ finished: false });

        expect(unfinished).toHaveLength(1);
        expect(unfinished[0].id).toBe(comp1.id);
        expect(unfinished[0].finished).toBe(false);
      });

      it('should filter by finished=true to return only finished competitions', async () => {
        await competitionService.createCompetition({
          name: 'Active Comp',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        const comp2 = await competitionService.createCompetition({
          name: 'Finished Comp',
          date: '2024-02-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        // Mark comp2 as finished
        await competitionService.updateCompetition(comp2.id, { finished: true });

        const finished = await competitionService.getAllCompetitions({ finished: true });

        expect(finished).toHaveLength(1);
        expect(finished[0].id).toBe(comp2.id);
        expect(finished[0].finished).toBe(true);
      });

      it('should return all competitions when finished filter is omitted', async () => {
        await competitionService.createCompetition({
          name: 'Active Comp',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        const comp2 = await competitionService.createCompetition({
          name: 'Finished Comp',
          date: '2024-02-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        // Mark comp2 as finished
        await competitionService.updateCompetition(comp2.id, { finished: true });

        const all = await competitionService.getAllCompetitions();

        expect(all).toHaveLength(2);
      });

      it('should combine seasonId and finished filters', async () => {
        // Create another season
        const season2 = await seasonService.createSeason({
          name: 'Season: Winter 25-Summer 26',
          startYear: 25,
          endYear: 26
        });

        const comp1 = await competitionService.createCompetition({
          name: 'Season 1 Active',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        const comp2 = await competitionService.createCompetition({
          name: 'Season 1 Finished',
          date: '2024-02-15',
          type: 'singles',
          seasonId: testSeasonId
        });

        await competitionService.createCompetition({
          name: 'Season 2 Active',
          date: '2024-03-15',
          type: 'singles',
          seasonId: season2.id
        });

        // Mark comp2 as finished
        await competitionService.updateCompetition(comp2.id, { finished: true });

        const filtered = await competitionService.getAllCompetitions({
          seasonId: testSeasonId,
          finished: false
        });

        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe(comp1.id);
      });
    });

    describe('updateCompetition', () => {
      it('should update finished status to true', async () => {
        const created = await competitionService.createCompetition({
          name: 'Test Competition',
          date: '2024-05-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        const updated = await competitionService.updateCompetition(created.id, { finished: true });

        expect(updated.finished).toBe(true);
      });

      it('should update finished status to false', async () => {
        const created = await competitionService.createCompetition({
          name: 'Test Competition',
          date: '2024-05-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        // Mark as finished first
        await competitionService.updateCompetition(created.id, { finished: true });

        // Then unmark
        const updated = await competitionService.updateCompetition(created.id, { finished: false });

        expect(updated.finished).toBe(false);
      });

      it('should throw error when finished is not a boolean', async () => {
        const created = await competitionService.createCompetition({
          name: 'Test Competition',
          date: '2024-05-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        await expect(
          competitionService.updateCompetition(created.id, { finished: 'true' as any })
        ).rejects.toThrow('Finished status must be a boolean value');
      });

      it('should update finished status along with other fields', async () => {
        const created = await competitionService.createCompetition({
          name: 'Old Name',
          date: '2024-05-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        const updated = await competitionService.updateCompetition(created.id, {
          name: 'New Name',
          finished: true
        });

        expect(updated.name).toBe('New Name');
        expect(updated.finished).toBe(true);
      });

      it('should preserve associations when marking competition as finished', async () => {
        // Create competition
        const competition = await competitionService.createCompetition({
          name: 'Test Competition',
          date: '2024-05-01',
          type: 'singles',
          seasonId: testSeasonId
        });

        // Create a transaction
        await dbService.query(
          `INSERT INTO transactions 
           (date, time, till, type, member, player, competition, price, discount, 
            subtotal, vat, total, source_row_index, is_complete)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          ['2024-05-01', '10:00:00', 'Till 1', 'Sale', 'Member A', 'Player A', 'Comp A',
           '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
        );

        const txResult = await dbService.query('SELECT id FROM transactions LIMIT 1');
        const transactionId = txResult.rows[0].id;

        // Create flagged transaction association
        await dbService.query(
          'INSERT INTO flagged_transactions (transaction_id, competition_id) VALUES ($1, $2)',
          [transactionId, competition.id]
        );

        // Count associations before marking finished
        const beforeCount = await dbService.query(
          'SELECT COUNT(*) as count FROM flagged_transactions WHERE competition_id = $1',
          [competition.id]
        );

        // Mark as finished
        await competitionService.updateCompetition(competition.id, { finished: true });

        // Count associations after marking finished
        const afterCount = await dbService.query(
          'SELECT COUNT(*) as count FROM flagged_transactions WHERE competition_id = $1',
          [competition.id]
        );

        expect(beforeCount.rows[0].count).toBe('1');
        expect(afterCount.rows[0].count).toBe('1');
      });
    });
  });
});
