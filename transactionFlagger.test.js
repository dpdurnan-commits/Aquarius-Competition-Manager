/**
 * Unit tests for Transaction Flagger
 */

import { TransactionFlagger } from './transactionFlagger.js';
import { DatabaseManager } from './databaseManager.js';
import { CompetitionManager } from './competitionManager.js';
import { WeeklySummarizer } from './weeklySummarizer.js';

describe('TransactionFlagger', () => {
  let dbManager;
  let competitionManager;
  let weeklySummarizer;
  let transactionFlagger;

  beforeEach(async () => {
    // Initialize database
    dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    // Clear existing data
    await clearCompetitions(dbManager);
    await dbManager.clearAll();
    
    // Create managers
    competitionManager = new CompetitionManager(dbManager);
    weeklySummarizer = new WeeklySummarizer();
    transactionFlagger = new TransactionFlagger(dbManager, competitionManager, weeklySummarizer);
  });

  afterEach(async () => {
    // Clean up
    if (dbManager.db) {
      await clearCompetitions(dbManager);
      await dbManager.clearAll();
      dbManager.db.close();
    }
  });

  // Helper function to clear competitions
  async function clearCompetitions(dbManager) {
    return new Promise((resolve, reject) => {
      const transaction = dbManager.db.transaction(['competitions'], 'readwrite');
      const store = transaction.objectStore('competitions');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Helper function to create a test transaction
  async function createTestTransaction(type = 'Topup (Competitions)', overrides = {}) {
    const transaction = {
      date: '26-08-2025',
      time: '18:19',
      till: 'Till 1',
      type: type,
      member: 'Test Member',
      player: 'Test Player',
      competition: '',
      price: '50.00',
      discount: '0.00',
      subtotal: '50.00',
      vat: '0.00',
      total: '50.00',
      sourceRowIndex: 1,
      isComplete: true,
      isWinning: false,
      winningCompetitionId: null,
      ...overrides
    };
    
    const result = await dbManager.store([transaction]);
    const allRecords = await dbManager.getAll();
    return allRecords[allRecords.length - 1]; // Return the last added record with ID
  }

  describe('flagTransaction()', () => {
    test('should flag valid Topup (Competitions) transaction', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction();
      
      await transactionFlagger.flagTransaction(transaction.id, competition.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(true);
      expect(updated.winningCompetitionId).toBe(competition.id);
    });

    test('should throw error for non-existent transaction', async () => {
      const competition = await competitionManager.create('October Medal');
      
      await expect(
        transactionFlagger.flagTransaction(99999, competition.id)
      ).rejects.toThrow('Transaction not found');
    });

    test('should throw error for non-Topup (Competitions) transaction', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction('Sale');
      
      await expect(
        transactionFlagger.flagTransaction(transaction.id, competition.id)
      ).rejects.toThrow('Only Topup (Competitions) transactions can be flagged');
    });

    test('should throw error for non-existent competition', async () => {
      const transaction = await createTestTransaction();
      
      await expect(
        transactionFlagger.flagTransaction(transaction.id, 99999)
      ).rejects.toThrow('Competition not found');
    });

    test('should handle Refund transaction type', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction('Refund');
      
      await expect(
        transactionFlagger.flagTransaction(transaction.id, competition.id)
      ).rejects.toThrow('Only Topup (Competitions) transactions can be flagged');
    });

    test('should preserve other transaction fields when flagging', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction('Topup (Competitions)', {
        member: 'John Doe',
        total: '75.50'
      });
      
      await transactionFlagger.flagTransaction(transaction.id, competition.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.member).toBe('John Doe');
      expect(updated.total).toBe('75.50');
      expect(updated.type).toBe('Topup (Competitions)');
    });
  });

  describe('unflagTransaction()', () => {
    test('should unflag a flagged transaction', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction('Topup (Competitions)', {
        isWinning: true,
        winningCompetitionId: competition.id
      });
      
      await transactionFlagger.unflagTransaction(transaction.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(false);
      expect(updated.winningCompetitionId).toBeNull();
    });

    test('should throw error for non-existent transaction', async () => {
      await expect(
        transactionFlagger.unflagTransaction(99999)
      ).rejects.toThrow('Transaction not found');
    });

    test('should handle unflagging already unflagged transaction', async () => {
      const transaction = await createTestTransaction();
      
      await transactionFlagger.unflagTransaction(transaction.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(false);
      expect(updated.winningCompetitionId).toBeNull();
    });

    test('should preserve other transaction fields when unflagging', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction('Topup (Competitions)', {
        member: 'Jane Smith',
        total: '100.00',
        isWinning: true,
        winningCompetitionId: competition.id
      });
      
      await transactionFlagger.unflagTransaction(transaction.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.member).toBe('Jane Smith');
      expect(updated.total).toBe('100.00');
      expect(updated.type).toBe('Topup (Competitions)');
    });
  });

  describe('updateFlag()', () => {
    test('should update competition association', async () => {
      const comp1 = await competitionManager.create('October Medal');
      const comp2 = await competitionManager.create('Summer Cup');
      const transaction = await createTestTransaction('Topup (Competitions)', {
        isWinning: true,
        winningCompetitionId: comp1.id
      });
      
      await transactionFlagger.updateFlag(transaction.id, comp2.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.winningCompetitionId).toBe(comp2.id);
    });

    test('should throw error for non-existent transaction', async () => {
      const competition = await competitionManager.create('October Medal');
      
      await expect(
        transactionFlagger.updateFlag(99999, competition.id)
      ).rejects.toThrow('Transaction not found');
    });

    test('should throw error for non-existent competition', async () => {
      const transaction = await createTestTransaction();
      
      await expect(
        transactionFlagger.updateFlag(transaction.id, 99999)
      ).rejects.toThrow('Competition not found');
    });

    test('should preserve other transaction fields when updating flag', async () => {
      const comp1 = await competitionManager.create('October Medal');
      const comp2 = await competitionManager.create('Summer Cup');
      const transaction = await createTestTransaction('Topup (Competitions)', {
        member: 'Bob Johnson',
        total: '60.00',
        isWinning: true,
        winningCompetitionId: comp1.id
      });
      
      await transactionFlagger.updateFlag(transaction.id, comp2.id);
      
      const updated = await dbManager.getById(transaction.id);
      expect(updated.member).toBe('Bob Johnson');
      expect(updated.total).toBe('60.00');
      expect(updated.isWinning).toBe(true);
    });
  });

  describe('canFlag()', () => {
    test('should return true for Topup (Competitions) transaction', () => {
      const record = {
        type: 'Topup (Competitions)',
        date: '26-08-2025',
        time: '18:19'
      };
      
      expect(transactionFlagger.canFlag(record)).toBe(true);
    });

    test('should return false for Sale transaction', () => {
      const record = {
        type: 'Sale',
        date: '26-08-2025',
        time: '18:19'
      };
      
      expect(transactionFlagger.canFlag(record)).toBe(false);
    });

    test('should return false for Refund transaction', () => {
      const record = {
        type: 'Refund',
        date: '26-08-2025',
        time: '18:19'
      };
      
      expect(transactionFlagger.canFlag(record)).toBe(false);
    });

    test('should return false for empty type', () => {
      const record = {
        type: '',
        date: '26-08-2025',
        time: '18:19'
      };
      
      expect(transactionFlagger.canFlag(record)).toBe(false);
    });

    test('should return false for null type', () => {
      const record = {
        type: null,
        date: '26-08-2025',
        time: '18:19'
      };
      
      expect(transactionFlagger.canFlag(record)).toBe(false);
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      // Create a separate database manager for this test
      const testDbManager = new DatabaseManager();
      await testDbManager.initialize();
      const testCompManager = new CompetitionManager(testDbManager);
      const testWeeklySummarizer = new WeeklySummarizer();
      const testFlagger = new TransactionFlagger(testDbManager, testCompManager, testWeeklySummarizer);
      
      const competition = await testCompManager.create('October Medal');
      const transaction = await createTestTransaction();
      
      // Close database to simulate error
      testDbManager.db.close();
      testDbManager.db = null;
      
      await expect(
        testFlagger.flagTransaction(transaction.id, competition.id)
      ).rejects.toThrow();
    });

    test('should provide error codes for different error types', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction();
      
      // Test TRANSACTION_NOT_FOUND error
      try {
        await transactionFlagger.flagTransaction(99999, competition.id);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('TRANSACTION_NOT_FOUND');
      }
      
      // Test INVALID_TRANSACTION_TYPE error
      const saleTransaction = await createTestTransaction('Sale');
      try {
        await transactionFlagger.flagTransaction(saleTransaction.id, competition.id);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('INVALID_TRANSACTION_TYPE');
      }
      
      // Test COMPETITION_NOT_FOUND error
      try {
        await transactionFlagger.flagTransaction(transaction.id, 99999);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('COMPETITION_NOT_FOUND');
      }
    });
  });

  describe('Integration scenarios', () => {
    test('should handle multiple flags for same competition', async () => {
      const competition = await competitionManager.create('October Medal');
      const trans1 = await createTestTransaction();
      const trans2 = await createTestTransaction('Topup (Competitions)', {
        date: '27-08-2025',
        time: '19:20'
      });
      
      await transactionFlagger.flagTransaction(trans1.id, competition.id);
      await transactionFlagger.flagTransaction(trans2.id, competition.id);
      
      const updated1 = await dbManager.getById(trans1.id);
      const updated2 = await dbManager.getById(trans2.id);
      
      expect(updated1.winningCompetitionId).toBe(competition.id);
      expect(updated2.winningCompetitionId).toBe(competition.id);
    });

    test('should handle flag, unflag, reflag sequence', async () => {
      const competition = await competitionManager.create('October Medal');
      const transaction = await createTestTransaction();
      
      // Flag
      await transactionFlagger.flagTransaction(transaction.id, competition.id);
      let updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(true);
      
      // Unflag
      await transactionFlagger.unflagTransaction(transaction.id);
      updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(false);
      expect(updated.winningCompetitionId).toBeNull();
      
      // Reflag
      await transactionFlagger.flagTransaction(transaction.id, competition.id);
      updated = await dbManager.getById(transaction.id);
      expect(updated.isWinning).toBe(true);
      expect(updated.winningCompetitionId).toBe(competition.id);
    });

    test('should handle switching between competitions', async () => {
      const comp1 = await competitionManager.create('October Medal');
      const comp2 = await competitionManager.create('Summer Cup');
      const comp3 = await competitionManager.create('Winter Trophy');
      const transaction = await createTestTransaction();
      
      // Flag with comp1
      await transactionFlagger.flagTransaction(transaction.id, comp1.id);
      let updated = await dbManager.getById(transaction.id);
      expect(updated.winningCompetitionId).toBe(comp1.id);
      
      // Update to comp2
      await transactionFlagger.updateFlag(transaction.id, comp2.id);
      updated = await dbManager.getById(transaction.id);
      expect(updated.winningCompetitionId).toBe(comp2.id);
      
      // Update to comp3
      await transactionFlagger.updateFlag(transaction.id, comp3.id);
      updated = await dbManager.getById(transaction.id);
      expect(updated.winningCompetitionId).toBe(comp3.id);
    });
  });

  describe('Date parsing', () => {
    test('should handle different date formats', async () => {
      const competition = await competitionManager.create('October Medal');
      
      // DD-MM-YYYY format
      const trans1 = await createTestTransaction('Topup (Competitions)', {
        date: '26-08-2025'
      });
      await expect(
        transactionFlagger.flagTransaction(trans1.id, competition.id)
      ).resolves.not.toThrow();
      
      // DD/MM/YYYY format
      const trans2 = await createTestTransaction('Topup (Competitions)', {
        date: '26/08/2025'
      });
      await expect(
        transactionFlagger.flagTransaction(trans2.id, competition.id)
      ).resolves.not.toThrow();
    });
  });
});
