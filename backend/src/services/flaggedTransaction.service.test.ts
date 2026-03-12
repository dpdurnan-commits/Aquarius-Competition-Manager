import { FlaggedTransactionService } from './flaggedTransaction.service';
import { DatabaseService } from './database.service';

describe('FlaggedTransactionService', () => {
  let flaggedTransactionService: FlaggedTransactionService;
  let dbService: DatabaseService;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/competition_test';
    dbService = new DatabaseService(connectionString);
    await dbService.connect();
    await dbService.runMigrations();
    flaggedTransactionService = new FlaggedTransactionService(dbService);
  });

  afterAll(async () => {
    await dbService.disconnect();
  });

  beforeEach(async () => {
    // Clean up all tables before each test
    await dbService.query('DELETE FROM flagged_transactions');
    await dbService.query('DELETE FROM transactions');
    await dbService.query('DELETE FROM competitions');
  });

  // Helper function to create a test transaction
  async function createTestTransaction(overrides: Partial<any> = {}): Promise<number> {
    const defaults = {
      date: '2024-05-01',
      time: '10:00:00',
      till: 'Till 1',
      type: 'Sale',
      member: 'Member A',
      player: 'Player A',
      competition: 'Comp A',
      price: '10.00',
      discount: '0.00',
      subtotal: '10.00',
      vat: '2.00',
      total: '12.00',
      sourceRowIndex: 1,
      isComplete: true
    };

    const data = { ...defaults, ...overrides };

    const result = await dbService.query(
      `INSERT INTO transactions 
       (date, time, till, type, member, player, competition, price, discount, 
        subtotal, vat, total, source_row_index, is_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [data.date, data.time, data.till, data.type, data.member, data.player, 
       data.competition, data.price, data.discount, data.subtotal, data.vat, 
       data.total, data.sourceRowIndex, data.isComplete]
    );

    return result.rows[0].id;
  }

  // Helper function to create a test competition
  async function createTestCompetition(name: string = 'Test Competition', date: string = '2024-05-01'): Promise<number> {
    const result = await dbService.query(
      `INSERT INTO competitions (name, date, description, prize_structure)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, date, '', '']
    );

    return result.rows[0].id;
  }

  describe('createFlaggedTransaction', () => {
    it('should create a new flagged transaction', async () => {
      const transactionId = await createTestTransaction();

      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);

      expect(flagged.id).toBeDefined();
      expect(flagged.transactionId).toBe(transactionId);
      expect(flagged.competitionId).toBeNull();
      expect(flagged.flaggedAt).toBeDefined();
      expect(flagged.createdAt).toBeDefined();
      expect(flagged.updatedAt).toBeDefined();
    });

    it('should prevent duplicate flagging of the same transaction', async () => {
      const transactionId = await createTestTransaction();

      // Flag the transaction once
      await flaggedTransactionService.createFlaggedTransaction(transactionId);

      // Attempt to flag the same transaction again
      await expect(
        flaggedTransactionService.createFlaggedTransaction(transactionId)
      ).rejects.toThrow(`Transaction ${transactionId} is already flagged`);
    });

    it('should allow flagging different transactions', async () => {
      const transactionId1 = await createTestTransaction({ time: '10:00:00' });
      const transactionId2 = await createTestTransaction({ time: '11:00:00' });

      const flagged1 = await flaggedTransactionService.createFlaggedTransaction(transactionId1);
      const flagged2 = await flaggedTransactionService.createFlaggedTransaction(transactionId2);

      expect(flagged1.transactionId).toBe(transactionId1);
      expect(flagged2.transactionId).toBe(transactionId2);
      expect(flagged1.id).not.toBe(flagged2.id);
    });
  });

  describe('getAllFlaggedTransactions', () => {
    it('should return empty array when no flagged transactions exist', async () => {
      const flagged = await flaggedTransactionService.getAllFlaggedTransactions();
      expect(flagged).toEqual([]);
    });

    it('should return flagged transactions with transaction details using JOIN', async () => {
      const transactionId = await createTestTransaction({
        date: '2024-05-15',
        time: '14:30:00',
        type: 'Prize',
        total: '50.00'
      });

      await flaggedTransactionService.createFlaggedTransaction(transactionId);

      const flagged = await flaggedTransactionService.getAllFlaggedTransactions();

      expect(flagged).toHaveLength(1);
      expect(flagged[0].transactionId).toBe(transactionId);
      expect(flagged[0].transaction).toBeDefined();
      expect(flagged[0].transaction.id).toBe(transactionId);
      expect(flagged[0].transaction.date).toBe('2024-05-15');
      expect(flagged[0].transaction.time).toBe('14:30:00');
      expect(flagged[0].transaction.type).toBe('Prize');
      expect(flagged[0].transaction.total).toBe('50.00');
    });

    it('should return multiple flagged transactions ordered by flagged_at DESC', async () => {
      const tx1 = await createTestTransaction({ time: '10:00:00' });
      const tx2 = await createTestTransaction({ time: '11:00:00' });
      const tx3 = await createTestTransaction({ time: '12:00:00' });

      // Flag in order
      await flaggedTransactionService.createFlaggedTransaction(tx1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await flaggedTransactionService.createFlaggedTransaction(tx2);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await flaggedTransactionService.createFlaggedTransaction(tx3);

      const flagged = await flaggedTransactionService.getAllFlaggedTransactions();

      expect(flagged).toHaveLength(3);
      // Most recently flagged should be first
      expect(flagged[0].transactionId).toBe(tx3);
      expect(flagged[1].transactionId).toBe(tx2);
      expect(flagged[2].transactionId).toBe(tx1);
    });

    it('should include competition association in flagged transaction details', async () => {
      const transactionId = await createTestTransaction();
      const competitionId = await createTestCompetition();

      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);
      await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competitionId);

      const allFlagged = await flaggedTransactionService.getAllFlaggedTransactions();

      expect(allFlagged).toHaveLength(1);
      expect(allFlagged[0].competitionId).toBe(competitionId);
      expect(allFlagged[0].transaction).toBeDefined();
    });
  });

  describe('updateFlaggedTransaction', () => {
    it('should associate flagged transaction with a competition', async () => {
      const transactionId = await createTestTransaction();
      const competitionId = await createTestCompetition();

      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);
      expect(flagged.competitionId).toBeNull();

      const updated = await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competitionId);

      expect(updated.id).toBe(flagged.id);
      expect(updated.competitionId).toBe(competitionId);
      expect(updated.transactionId).toBe(transactionId);
    });

    it('should allow changing competition association', async () => {
      const transactionId = await createTestTransaction();
      const competitionId1 = await createTestCompetition('Competition 1', '2024-05-01');
      const competitionId2 = await createTestCompetition('Competition 2', '2024-05-02');

      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);
      
      // Associate with first competition
      await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competitionId1);
      
      // Change to second competition
      const updated = await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competitionId2);

      expect(updated.competitionId).toBe(competitionId2);
    });

    it('should allow removing competition association by setting to null', async () => {
      const transactionId = await createTestTransaction();
      const competitionId = await createTestCompetition();

      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);
      await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competitionId);

      // Remove association
      const updated = await flaggedTransactionService.updateFlaggedTransaction(flagged.id, null);

      expect(updated.competitionId).toBeNull();
    });

    it('should throw error when flagged transaction does not exist', async () => {
      await expect(
        flaggedTransactionService.updateFlaggedTransaction(999, 1)
      ).rejects.toThrow('Flagged transaction with id 999 not found');
    });
  });

  describe('deleteFlaggedTransaction', () => {
    it('should delete a flagged transaction', async () => {
      const transactionId = await createTestTransaction();
      const flagged = await flaggedTransactionService.createFlaggedTransaction(transactionId);

      await flaggedTransactionService.deleteFlaggedTransaction(flagged.id);

      const allFlagged = await flaggedTransactionService.getAllFlaggedTransactions();
      expect(allFlagged).toHaveLength(0);
    });

    it('should throw error when flagged transaction does not exist', async () => {
      await expect(
        flaggedTransactionService.deleteFlaggedTransaction(999)
      ).rejects.toThrow('Flagged transaction with id 999 not found');
    });

    it('should allow re-flagging a transaction after deletion', async () => {
      const transactionId = await createTestTransaction();
      
      // Flag, delete, then flag again
      const flagged1 = await flaggedTransactionService.createFlaggedTransaction(transactionId);
      await flaggedTransactionService.deleteFlaggedTransaction(flagged1.id);
      const flagged2 = await flaggedTransactionService.createFlaggedTransaction(transactionId);

      expect(flagged2.id).toBeDefined();
      expect(flagged2.transactionId).toBe(transactionId);
      expect(flagged2.id).not.toBe(flagged1.id); // Different flagged transaction record
    });
  });
});
