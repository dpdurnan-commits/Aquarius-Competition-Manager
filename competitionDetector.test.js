/**
 * Unit Tests for CompetitionDetector
 * Tests edge cases and error handling
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CompetitionDetector } from './competitionDetector.js';

describe('CompetitionDetector - Unit Tests', () => {
  let detector;
  let mockApiClient;

  beforeEach(() => {
    mockApiClient = {
      getAllCompetitions: jest.fn()
    };
    detector = new CompetitionDetector(mockApiClient);
  });

  describe('extractCompetitionNames', () => {
    test('should return empty array for empty transaction list', () => {
      const result = detector.extractCompetitionNames([]);
      expect(result).toEqual([]);
    });

    test('should exclude transactions with null competition fields', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: null,
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: null,
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toEqual([]);
    });

    test('should exclude transactions with empty competition fields', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: '',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: '   ',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toEqual([]);
    });

    test('should only process Sale and Refund types', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition B',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:02:00',
          till: 'Till 1',
          type: 'Topup',
          member: 'Member 3',
          player: 'Player 3',
          competition: 'Competition C',
          total: '20.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toHaveLength(2);
      expect(result).toContain('Competition A');
      expect(result).toContain('Competition B');
      expect(result).not.toContain('Competition C');
    });

    test('should deduplicate competition names', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition A',
          total: '15.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:02:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 3',
          player: 'Player 3',
          competition: 'Competition A',
          total: '-5.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toEqual(['Competition A']);
    });

    test('should trim whitespace from competition names', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: '  Competition A  ',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition A',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toEqual(['Competition A']);
    });

    test('should handle mixed valid and invalid records', () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Topup',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition B',
          total: '20.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:02:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 3',
          player: 'Player 3',
          competition: '',
          total: '-5.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:03:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 4',
          player: 'Player 4',
          competition: null,
          total: '15.00',
          sourceRowIndex: 3,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:04:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 5',
          player: 'Player 5',
          competition: 'Competition C',
          total: '-8.00',
          sourceRowIndex: 4,
          isComplete: true
        }
      ];

      const result = detector.extractCompetitionNames(records);
      expect(result).toHaveLength(2);
      expect(result).toContain('Competition A');
      expect(result).toContain('Competition C');
    });
  });

  describe('detectNewCompetitions', () => {
    test('should return empty array for empty transaction list', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([]);
      
      const result = await detector.detectNewCompetitions([]);
      
      expect(result).toEqual([]);
      expect(mockApiClient.getAllCompetitions).not.toHaveBeenCalled();
    });

    test('should return empty array when no competition names extracted', async () => {
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Topup',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toEqual([]);
      expect(mockApiClient.getAllCompetitions).not.toHaveBeenCalled();
    });

    test('should return all names when database is empty', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([]);
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition B',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('Competition A');
      expect(result).toContain('Competition B');
      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
    });

    test('should return empty array when all competitions exist', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([
        { id: 1, name: 'Competition A', date: '2024-01-01', type: 'singles', seasonId: 1 },
        { id: 2, name: 'Competition B', date: '2024-01-02', type: 'doubles', seasonId: 1 }
      ]);
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition B',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toEqual([]);
      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
    });

    test('should return only new competition names', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([
        { id: 1, name: 'Competition A', date: '2024-01-01', type: 'singles', seasonId: 1 }
      ]);
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:01:00',
          till: 'Till 1',
          type: 'Refund',
          member: 'Member 2',
          player: 'Player 2',
          competition: 'Competition B',
          total: '-5.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '2024-01-01',
          time: '12:02:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 3',
          player: 'Player 3',
          competition: 'Competition C',
          total: '15.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('Competition B');
      expect(result).toContain('Competition C');
      expect(result).not.toContain('Competition A');
      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
    });

    test('should handle API failure gracefully', async () => {
      mockApiClient.getAllCompetitions.mockRejectedValue(new Error('Network error'));
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        }
      ];

      await expect(detector.detectNewCompetitions(records)).rejects.toThrow('Network error');
      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
    });

    test('should handle whitespace in database competition names', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([
        { id: 1, name: '  Competition A  ', date: '2024-01-01', type: 'singles', seasonId: 1 }
      ]);
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toEqual([]);
    });

    test('should be case-sensitive when comparing names', async () => {
      mockApiClient.getAllCompetitions.mockResolvedValue([
        { id: 1, name: 'competition a', date: '2024-01-01', type: 'singles', seasonId: 1 }
      ]);
      
      const records = [
        {
          date: '2024-01-01',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
          player: 'Player 1',
          competition: 'Competition A',
          total: '10.00',
          sourceRowIndex: 0,
          isComplete: true
        }
      ];

      const result = await detector.detectNewCompetitions(records);
      
      expect(result).toEqual(['Competition A']);
    });
  });
});
