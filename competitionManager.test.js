/**
 * Unit tests for Competition Manager
 */

import { CompetitionManager } from './competitionManager.js';
import { DatabaseManager } from './databaseManager.js';

describe('CompetitionManager', () => {
  let dbManager;
  let competitionManager;

  beforeEach(async () => {
    // Initialize database
    dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    // Clear existing data
    await clearCompetitions(dbManager);
    await dbManager.clearAll();
    
    // Create competition manager
    competitionManager = new CompetitionManager(dbManager);
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

  describe('create()', () => {
    test('should create competition with valid name', async () => {
      const competition = await competitionManager.create('October Medal 2025');
      
      expect(competition).toBeDefined();
      expect(competition.id).toBeDefined();
      expect(competition.name).toBe('October Medal 2025');
      expect(competition.createdAt).toBeInstanceOf(Date);
    });

    test('should trim whitespace from name', async () => {
      const competition = await competitionManager.create('  Summer Cup  ');
      
      expect(competition.name).toBe('Summer Cup');
    });

    test('should throw error for empty name', async () => {
      await expect(competitionManager.create('')).rejects.toThrow('Competition name cannot be empty');
      await expect(competitionManager.create('   ')).rejects.toThrow('Competition name cannot be empty');
    });

    test('should throw error for null or undefined name', async () => {
      await expect(competitionManager.create(null)).rejects.toThrow('Competition name cannot be empty');
      await expect(competitionManager.create(undefined)).rejects.toThrow('Competition name cannot be empty');
    });

    test('should throw error for duplicate name (case-insensitive)', async () => {
      await competitionManager.create('October Medal');
      
      await expect(competitionManager.create('October Medal')).rejects.toThrow('Competition name must be unique');
      await expect(competitionManager.create('OCTOBER MEDAL')).rejects.toThrow('Competition name must be unique');
      await expect(competitionManager.create('october medal')).rejects.toThrow('Competition name must be unique');
    });

    test('should allow multiple different competitions', async () => {
      const comp1 = await competitionManager.create('October Medal');
      const comp2 = await competitionManager.create('Summer Cup');
      const comp3 = await competitionManager.create('Winter Trophy');
      
      expect(comp1.id).not.toBe(comp2.id);
      expect(comp2.id).not.toBe(comp3.id);
    });
  });

  describe('update()', () => {
    test('should update competition with valid name', async () => {
      const created = await competitionManager.create('Old Name');
      const updated = await competitionManager.update(created.id, 'New Name');
      
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('New Name');
      // createdAt may be serialized as string in IndexedDB
      expect(new Date(updated.createdAt).getTime()).toBe(new Date(created.createdAt).getTime());
    });

    test('should trim whitespace from updated name', async () => {
      const created = await competitionManager.create('Original');
      const updated = await competitionManager.update(created.id, '  Updated  ');
      
      expect(updated.name).toBe('Updated');
    });

    test('should throw error for empty name', async () => {
      const created = await competitionManager.create('Test Competition');
      
      await expect(competitionManager.update(created.id, '')).rejects.toThrow('Competition name cannot be empty');
      await expect(competitionManager.update(created.id, '   ')).rejects.toThrow('Competition name cannot be empty');
    });

    test('should throw error for non-existent competition', async () => {
      await expect(competitionManager.update(99999, 'New Name')).rejects.toThrow('Competition not found');
    });

    test('should throw error for duplicate name (excluding current)', async () => {
      const comp1 = await competitionManager.create('Competition A');
      const comp2 = await competitionManager.create('Competition B');
      
      await expect(competitionManager.update(comp2.id, 'Competition A')).rejects.toThrow('Competition name must be unique');
      await expect(competitionManager.update(comp2.id, 'COMPETITION A')).rejects.toThrow('Competition name must be unique');
    });

    test('should allow updating to same name (case-insensitive)', async () => {
      const created = await competitionManager.create('Test Competition');
      
      const updated1 = await competitionManager.update(created.id, 'Test Competition');
      expect(updated1.name).toBe('Test Competition');
      
      const updated2 = await competitionManager.update(created.id, 'TEST COMPETITION');
      expect(updated2.name).toBe('TEST COMPETITION');
    });
  });

  describe('delete()', () => {
    test('should delete competition with no associated transactions', async () => {
      const created = await competitionManager.create('Test Competition');
      const result = await competitionManager.delete(created.id);
      
      expect(result.success).toBe(true);
      
      const retrieved = await competitionManager.getById(created.id);
      expect(retrieved).toBeNull();
    });

    test('should prevent deletion when competition has associated transactions', async () => {
      const competition = await competitionManager.create('Test Competition');
      
      // Create a transaction with this competition
      const transaction = {
        date: '26-08-2025',
        time: '18:19',
        till: 'Till 1',
        type: 'Topup (Competitions)',
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
        isWinning: true,
        winningCompetitionId: competition.id
      };
      
      await dbManager.store([transaction]);
      
      const result = await competitionManager.delete(competition.id);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('has_transactions');
      expect(result.count).toBe(1);
      
      // Verify competition still exists
      const retrieved = await competitionManager.getById(competition.id);
      expect(retrieved).not.toBeNull();
    });

    test('should return correct count of associated transactions', async () => {
      const competition = await competitionManager.create('Test Competition');
      
      // Create multiple transactions
      const transactions = [
        {
          date: '26-08-2025',
          time: '18:19',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 1',
          player: 'Player 1',
          competition: '',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '0.00',
          total: '50.00',
          sourceRowIndex: 1,
          isComplete: true,
          isWinning: true,
          winningCompetitionId: competition.id
        },
        {
          date: '27-08-2025',
          time: '19:20',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 2',
          player: 'Player 2',
          competition: '',
          price: '30.00',
          discount: '0.00',
          subtotal: '30.00',
          vat: '0.00',
          total: '30.00',
          sourceRowIndex: 2,
          isComplete: true,
          isWinning: true,
          winningCompetitionId: competition.id
        }
      ];
      
      await dbManager.store(transactions);
      
      const result = await competitionManager.delete(competition.id);
      
      expect(result.success).toBe(false);
      expect(result.count).toBe(2);
    });
  });

  describe('getAll()', () => {
    test('should return empty array when no competitions exist', async () => {
      const competitions = await competitionManager.getAll();
      
      expect(competitions).toEqual([]);
    });

    test('should return all competitions', async () => {
      await competitionManager.create('Competition A');
      await competitionManager.create('Competition B');
      await competitionManager.create('Competition C');
      
      const competitions = await competitionManager.getAll();
      
      expect(competitions).toHaveLength(3);
      expect(competitions.map(c => c.name)).toContain('Competition A');
      expect(competitions.map(c => c.name)).toContain('Competition B');
      expect(competitions.map(c => c.name)).toContain('Competition C');
    });

    test('should return competitions sorted alphabetically by name', async () => {
      await competitionManager.create('Zebra Cup');
      await competitionManager.create('Alpha Medal');
      await competitionManager.create('Beta Trophy');
      
      const competitions = await competitionManager.getAll();
      
      expect(competitions[0].name).toBe('Alpha Medal');
      expect(competitions[1].name).toBe('Beta Trophy');
      expect(competitions[2].name).toBe('Zebra Cup');
    });
  });

  describe('getById()', () => {
    test('should return competition by ID', async () => {
      const created = await competitionManager.create('Test Competition');
      const retrieved = await competitionManager.getById(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Competition');
    });

    test('should return null for non-existent ID', async () => {
      const retrieved = await competitionManager.getById(99999);
      
      expect(retrieved).toBeNull();
    });
  });

  describe('checkAssociatedTransactions()', () => {
    test('should return 0 when no transactions associated', async () => {
      const competition = await competitionManager.create('Test Competition');
      const count = await competitionManager.checkAssociatedTransactions(competition.id);
      
      expect(count).toBe(0);
    });

    test('should return correct count of associated transactions', async () => {
      const competition = await competitionManager.create('Test Competition');
      
      const transactions = [
        {
          date: '26-08-2025',
          time: '18:19',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 1',
          player: 'Player 1',
          competition: '',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '0.00',
          total: '50.00',
          sourceRowIndex: 1,
          isComplete: true,
          isWinning: true,
          winningCompetitionId: competition.id
        },
        {
          date: '27-08-2025',
          time: '19:20',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 2',
          player: 'Player 2',
          competition: '',
          price: '30.00',
          discount: '0.00',
          subtotal: '30.00',
          vat: '0.00',
          total: '30.00',
          sourceRowIndex: 2,
          isComplete: true,
          isWinning: false,
          winningCompetitionId: null
        }
      ];
      
      await dbManager.store(transactions);
      
      const count = await competitionManager.checkAssociatedTransactions(competition.id);
      
      expect(count).toBe(1);
    });

    test('should not count transactions from other competitions', async () => {
      const comp1 = await competitionManager.create('Competition 1');
      const comp2 = await competitionManager.create('Competition 2');
      
      const transactions = [
        {
          date: '26-08-2025',
          time: '18:19',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 1',
          player: 'Player 1',
          competition: '',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '0.00',
          total: '50.00',
          sourceRowIndex: 1,
          isComplete: true,
          isWinning: true,
          winningCompetitionId: comp1.id
        },
        {
          date: '27-08-2025',
          time: '19:20',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Member 2',
          player: 'Player 2',
          competition: '',
          price: '30.00',
          discount: '0.00',
          subtotal: '30.00',
          vat: '0.00',
          total: '30.00',
          sourceRowIndex: 2,
          isComplete: true,
          isWinning: true,
          winningCompetitionId: comp2.id
        }
      ];
      
      await dbManager.store(transactions);
      
      const count1 = await competitionManager.checkAssociatedTransactions(comp1.id);
      const count2 = await competitionManager.checkAssociatedTransactions(comp2.id);
      
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('Error handling', () => {
    test('should throw error when database not initialized', async () => {
      const uninitializedManager = new CompetitionManager(new DatabaseManager());
      
      await expect(uninitializedManager.create('Test')).rejects.toThrow('Database not initialized');
      await expect(uninitializedManager.update(1, 'Test')).rejects.toThrow('Database not initialized');
      await expect(uninitializedManager.delete(1)).rejects.toThrow('Database not initialized');
      await expect(uninitializedManager.getAll()).rejects.toThrow('Database not initialized');
      await expect(uninitializedManager.getById(1)).rejects.toThrow('Database not initialized');
      await expect(uninitializedManager.checkAssociatedTransactions(1)).rejects.toThrow('Database not initialized');
    });
  });
});
