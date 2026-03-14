/**
 * Unit tests for CompetitionManager finished methods
 * Tests the finished status functionality for competitions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CompetitionManager } from './backend/public/competitionManager.js';

describe('CompetitionManager - Finished Status Methods', () => {
  let competitionManager;
  let mockApiClient;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      request: jest.fn(),
      updateCompetition: jest.fn(),
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      deleteCompetition: jest.fn(),
      getAllFlaggedTransactions: jest.fn(),
      getActivePresentationSeason: jest.fn(),
      createPresentationSeason: jest.fn(),
      setActivePresentationSeason: jest.fn()
    };

    competitionManager = new CompetitionManager(mockApiClient);
  });

  describe('updateFinishedStatus()', () => {
    test('should call correct API endpoint with finished=true', async () => {
      // Arrange
      const competitionId = 1;
      const finished = true;
      const mockResponse = {
        id: 1,
        name: 'Test Competition',
        finished: true,
        createdAt: '2024-01-15T10:00:00Z'
      };

      mockApiClient.updateCompetition.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.updateFinishedStatus(competitionId, finished);

      // Assert
      expect(mockApiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });
      expect(result).toEqual({
        id: 1,
        name: 'Test Competition',
        finished: true,
        createdAt: new Date('2024-01-15T10:00:00Z')
      });
    });

    test('should call correct API endpoint with finished=false', async () => {
      // Arrange
      const competitionId = 2;
      const finished = false;
      const mockResponse = {
        id: 2,
        name: 'Another Competition',
        finished: false,
        createdAt: '2024-01-20T15:30:00Z'
      };

      mockApiClient.updateCompetition.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.updateFinishedStatus(competitionId, finished);

      // Assert
      expect(mockApiClient.updateCompetition).toHaveBeenCalledWith(2, { finished: false });
      expect(result).toEqual({
        id: 2,
        name: 'Another Competition',
        finished: false,
        createdAt: new Date('2024-01-20T15:30:00Z')
      });
    });

    test('should handle API errors appropriately', async () => {
      // Arrange
      const competitionId = 999;
      const finished = true;
      const apiError = new Error('Competition not found');
      apiError.code = 'NOT_FOUND';

      mockApiClient.updateCompetition.mockRejectedValue(apiError);

      // Act & Assert
      await expect(competitionManager.updateFinishedStatus(competitionId, finished))
        .rejects.toThrow('Failed to update finished status: Competition not found');

      expect(mockApiClient.updateCompetition).toHaveBeenCalledWith(999, { finished: true });
    });

    test('should wrap API errors with appropriate error code', async () => {
      // Arrange
      const competitionId = 1;
      const finished = true;
      const apiError = new Error('Network error');

      mockApiClient.updateCompetition.mockRejectedValue(apiError);

      // Act & Assert
      try {
        await competitionManager.updateFinishedStatus(competitionId, finished);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Failed to update finished status: Network error');
        expect(error.code).toBe('UPDATE_FAILED');
        expect(error.originalError).toBe(apiError);
      }
    });
  });

  describe('getAll() with finished filter', () => {
    test('should pass finished=true parameter correctly', async () => {
      // Arrange
      const mockResponse = {
        competitions: [
          {
            id: 1,
            name: 'Finished Competition',
            finished: true,
            createdAt: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll({ finished: true });

      // Assert
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions?finished=true', { method: 'GET' });
      expect(result).toEqual([
        {
          id: 1,
          name: 'Finished Competition',
          finished: true,
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ]);
    });

    test('should pass finished=false parameter correctly', async () => {
      // Arrange
      const mockResponse = {
        competitions: [
          {
            id: 2,
            name: 'Active Competition',
            finished: false,
            createdAt: '2024-01-20T15:30:00Z'
          }
        ]
      };

      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll({ finished: false });

      // Assert
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions?finished=false', { method: 'GET' });
      expect(result).toEqual([
        {
          id: 2,
          name: 'Active Competition',
          finished: false,
          createdAt: new Date('2024-01-20T15:30:00Z')
        }
      ]);
    });

    test('should not include finished parameter when not specified', async () => {
      // Arrange
      const mockResponse = {
        competitions: [
          {
            id: 1,
            name: 'Competition 1',
            finished: true,
            createdAt: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            name: 'Competition 2',
            finished: false,
            createdAt: '2024-01-20T15:30:00Z'
          }
        ]
      };

      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll();

      // Assert
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions', { method: 'GET' });
      expect(result).toHaveLength(2);
    });

    test('should handle empty options object', async () => {
      // Arrange
      const mockResponse = { competitions: [] };
      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll({});

      // Assert
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions', { method: 'GET' });
      expect(result).toEqual([]);
    });

    test('should sort results alphabetically by name', async () => {
      // Arrange
      const mockResponse = {
        competitions: [
          {
            id: 3,
            name: 'Zebra Competition',
            finished: false,
            createdAt: '2024-01-25T12:00:00Z'
          },
          {
            id: 1,
            name: 'Alpha Competition',
            finished: false,
            createdAt: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            name: 'Beta Competition',
            finished: false,
            createdAt: '2024-01-20T15:30:00Z'
          }
        ]
      };

      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll({ finished: false });

      // Assert
      expect(result.map(c => c.name)).toEqual([
        'Alpha Competition',
        'Beta Competition',
        'Zebra Competition'
      ]);
    });

    test('should handle API errors appropriately', async () => {
      // Arrange
      const apiError = new Error('Server error');
      mockApiClient.request.mockRejectedValue(apiError);

      // Act & Assert
      await expect(competitionManager.getAll({ finished: true }))
        .rejects.toThrow('Failed to retrieve competitions: Server error');

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions?finished=true', { method: 'GET' });
    });

    test('should wrap API errors with appropriate error code', async () => {
      // Arrange
      const apiError = new Error('Network timeout');
      mockApiClient.request.mockRejectedValue(apiError);

      // Act & Assert
      try {
        await competitionManager.getAll({ finished: false });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Failed to retrieve competitions: Network timeout');
        expect(error.code).toBe('RETRIEVAL_FAILED');
        expect(error.originalError).toBe(apiError);
      }
    });

    test('should handle response with missing competitions array', async () => {
      // Arrange
      const mockResponse = {}; // Missing competitions array
      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll({ finished: true });

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle competitions with missing finished field', async () => {
      // Arrange
      const mockResponse = {
        competitions: [
          {
            id: 1,
            name: 'Legacy Competition',
            // finished field missing
            createdAt: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockApiClient.request.mockResolvedValue(mockResponse);

      // Act
      const result = await competitionManager.getAll();

      // Assert
      expect(result).toEqual([
        {
          id: 1,
          name: 'Legacy Competition',
          finished: undefined, // Should preserve the undefined value
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ]);
    });
  });
});