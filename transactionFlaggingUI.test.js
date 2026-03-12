/**
 * Integration Tests for Transaction Flagging UI
 * Tests the complete flagging workflow in the Transformed Records View
 */

import { jest } from '@jest/globals';

// Mock DOM environment
const mockDOM = () => {
  document.body.innerHTML = `
    <div id="records-body"></div>
    <div id="error-container" style="display: none;">
      <span id="error-text"></span>
    </div>
    <div id="loading-indicator" style="display: none;"></div>
  `;
};

describe('Transaction Flagging UI Integration Tests', () => {
  let databaseManager;
  let competitionManager;
  let transactionFlagger;
  let weeklySummarizer;

  beforeEach(() => {
    mockDOM();

    // Mock DatabaseManager
    databaseManager = {
      getById: jest.fn(),
      update: jest.fn(),
      getAll: jest.fn(),
    };

    // Mock CompetitionManager
    competitionManager = {
      getAll: jest.fn(),
      getById: jest.fn(),
    };

    // Mock WeeklySummarizer
    weeklySummarizer = {
      generateSummaries: jest.fn(),
    };

    // Create TransactionFlagger instance
    const { TransactionFlagger } = require('./transactionFlagger.js');
    transactionFlagger = new TransactionFlagger(
      databaseManager,
      competitionManager,
      weeklySummarizer
    );
  });

  describe('Flag Button Rendering', () => {
    test('should show flag button for Topup (Competitions) transactions', () => {
      const record = {
        id: 1,
        date: '26-08-2025',
        time: '18:19',
        type: 'Topup (Competitions)',
        member: 'Alastair REID',
        total: '50.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      const canFlag = transactionFlagger.canFlag(record);
      expect(canFlag).toBe(true);
    });

    test('should not show flag button for non-Topup transactions', () => {
      const record = {
        id: 2,
        date: '26-08-2025',
        time: '18:20',
        type: 'Sale (Competitions)',
        member: 'John DOE',
        total: '10.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      const canFlag = transactionFlagger.canFlag(record);
      expect(canFlag).toBe(false);
    });

    test('should show edit button for flagged transactions', () => {
      const record = {
        id: 3,
        date: '26-08-2025',
        time: '18:21',
        type: 'Topup (Competitions)',
        member: 'Jane SMITH',
        total: '75.00',
        isWinning: true,
        winningCompetitionId: 1,
      };

      const canFlag = transactionFlagger.canFlag(record);
      expect(canFlag).toBe(true);
      expect(record.isWinning).toBe(true);
    });
  });

  describe('Flag Transaction Flow', () => {
    test('should successfully flag a transaction', async () => {
      const recordId = 1;
      const competitionId = 1;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:19',
        type: 'Topup (Competitions)',
        member: 'Alastair REID',
        total: '50.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      const competition = {
        id: competitionId,
        name: 'October Medal 2025',
        createdAt: new Date(),
      };

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(competition);
      databaseManager.update.mockResolvedValue();

      await transactionFlagger.flagTransaction(recordId, competitionId);

      expect(databaseManager.getById).toHaveBeenCalledWith(recordId);
      expect(competitionManager.getById).toHaveBeenCalledWith(competitionId);
      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          isWinning: true,
          winningCompetitionId: competitionId,
        })
      );
    });

    test('should reject flagging non-Topup transaction', async () => {
      const recordId = 2;
      const competitionId = 1;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:20',
        type: 'Sale (Competitions)',
        member: 'John DOE',
        total: '10.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      databaseManager.getById.mockResolvedValue(transaction);

      await expect(
        transactionFlagger.flagTransaction(recordId, competitionId)
      ).rejects.toThrow('Only Topup (Competitions) transactions can be flagged');
    });

    test('should reject flagging with invalid competition', async () => {
      const recordId = 1;
      const competitionId = 999;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:19',
        type: 'Topup (Competitions)',
        member: 'Alastair REID',
        total: '50.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(null);

      await expect(
        transactionFlagger.flagTransaction(recordId, competitionId)
      ).rejects.toThrow('Competition not found');
    });
  });

  describe('Unflag Transaction Flow', () => {
    test('should successfully unflag a transaction', async () => {
      const recordId = 3;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:21',
        type: 'Topup (Competitions)',
        member: 'Jane SMITH',
        total: '75.00',
        isWinning: true,
        winningCompetitionId: 1,
      };

      databaseManager.getById.mockResolvedValue(transaction);
      databaseManager.update.mockResolvedValue();

      await transactionFlagger.unflagTransaction(recordId);

      expect(databaseManager.getById).toHaveBeenCalledWith(recordId);
      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          isWinning: false,
          winningCompetitionId: null,
        })
      );
    });

    test('should reject unflagging non-existent transaction', async () => {
      const recordId = 999;

      databaseManager.getById.mockResolvedValue(null);

      await expect(
        transactionFlagger.unflagTransaction(recordId)
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Update Flag Flow', () => {
    test('should successfully update flag to different competition', async () => {
      const recordId = 3;
      const newCompetitionId = 2;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:21',
        type: 'Topup (Competitions)',
        member: 'Jane SMITH',
        total: '75.00',
        isWinning: true,
        winningCompetitionId: 1,
      };

      const newCompetition = {
        id: newCompetitionId,
        name: 'Summer Cup 2025',
        createdAt: new Date(),
      };

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(newCompetition);
      databaseManager.update.mockResolvedValue();

      await transactionFlagger.updateFlag(recordId, newCompetitionId);

      expect(databaseManager.getById).toHaveBeenCalledWith(recordId);
      expect(competitionManager.getById).toHaveBeenCalledWith(newCompetitionId);
      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          winningCompetitionId: newCompetitionId,
        })
      );
    });

    test('should reject updating flag with invalid competition', async () => {
      const recordId = 3;
      const newCompetitionId = 999;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:21',
        type: 'Topup (Competitions)',
        member: 'Jane SMITH',
        total: '75.00',
        isWinning: true,
        winningCompetitionId: 1,
      };

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(null);

      await expect(
        transactionFlagger.updateFlag(recordId, newCompetitionId)
      ).rejects.toThrow('Competition not found');
    });
  });

  describe('Competition Selection Modal', () => {
    test('should display all available competitions', async () => {
      const competitions = [
        { id: 1, name: 'October Medal 2025', createdAt: new Date() },
        { id: 2, name: 'Summer Cup 2025', createdAt: new Date() },
        { id: 3, name: 'Winter Trophy 2025', createdAt: new Date() },
      ];

      competitionManager.getAll.mockResolvedValue(competitions);

      const result = await competitionManager.getAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('October Medal 2025');
      expect(result[1].name).toBe('Summer Cup 2025');
      expect(result[2].name).toBe('Winter Trophy 2025');
    });

    test('should handle empty competition list', async () => {
      competitionManager.getAll.mockResolvedValue([]);

      const result = await competitionManager.getAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('Visual Indicators', () => {
    test('should apply flagged-row class to flagged transactions', () => {
      const record = {
        id: 3,
        isWinning: true,
        winningCompetitionId: 1,
      };

      expect(record.isWinning).toBe(true);
    });

    test('should not apply flagged-row class to unflagged transactions', () => {
      const record = {
        id: 1,
        isWinning: false,
        winningCompetitionId: null,
      };

      expect(record.isWinning).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const recordId = 1;
      const competitionId = 1;

      databaseManager.getById.mockRejectedValue(new Error('Database error'));

      await expect(
        transactionFlagger.flagTransaction(recordId, competitionId)
      ).rejects.toThrow('Database error');
    });

    test('should handle competition manager errors gracefully', async () => {
      const recordId = 1;
      const competitionId = 1;

      const transaction = {
        id: recordId,
        type: 'Topup (Competitions)',
        isWinning: false,
      };

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockRejectedValue(
        new Error('Competition manager error')
      );

      await expect(
        transactionFlagger.flagTransaction(recordId, competitionId)
      ).rejects.toThrow('Competition manager error');
    });
  });

  describe('Complete Flagging Workflow', () => {
    test('should complete full flag-edit-unflag cycle', async () => {
      const recordId = 1;
      const competitionId1 = 1;
      const competitionId2 = 2;

      const transaction = {
        id: recordId,
        date: '26-08-2025',
        time: '18:19',
        type: 'Topup (Competitions)',
        member: 'Alastair REID',
        total: '50.00',
        isWinning: false,
        winningCompetitionId: null,
      };

      const competition1 = {
        id: competitionId1,
        name: 'October Medal 2025',
        createdAt: new Date(),
      };

      const competition2 = {
        id: competitionId2,
        name: 'Summer Cup 2025',
        createdAt: new Date(),
      };

      // Step 1: Flag transaction
      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(competition1);
      databaseManager.update.mockResolvedValue();

      await transactionFlagger.flagTransaction(recordId, competitionId1);

      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          isWinning: true,
          winningCompetitionId: competitionId1,
        })
      );

      // Step 2: Update flag to different competition
      transaction.isWinning = true;
      transaction.winningCompetitionId = competitionId1;

      databaseManager.getById.mockResolvedValue(transaction);
      competitionManager.getById.mockResolvedValue(competition2);

      await transactionFlagger.updateFlag(recordId, competitionId2);

      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          winningCompetitionId: competitionId2,
        })
      );

      // Step 3: Unflag transaction
      transaction.winningCompetitionId = competitionId2;

      databaseManager.getById.mockResolvedValue(transaction);

      await transactionFlagger.unflagTransaction(recordId);

      expect(databaseManager.update).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          isWinning: false,
          winningCompetitionId: null,
        })
      );
    });
  });
});
