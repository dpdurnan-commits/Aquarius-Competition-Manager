/**
 * Tests for Distribution and Competition Costs API Client Methods
 */

import { APIClient } from './apiClient.js';

describe('APIClient - Distribution Methods', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new APIClient('http://localhost:3000');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSeasonWinners', () => {
    test('should retrieve season winners successfully', async () => {
      const mockWinners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [
            { resultId: 1, playerName: 'John Doe', finishingPosition: 1 }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ winners: mockWinners })
      });

      const result = await apiClient.getSeasonWinners(1);

      expect(result).toEqual(mockWinners);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/distributions/season/1/winners',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should handle season not found error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Season not found' })
      });

      await expect(apiClient.getSeasonWinners(999)).rejects.toThrow('Failed to retrieve season winners');
    });
  });

  describe('createDistribution', () => {
    test('should create distribution successfully', async () => {
      const dto = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 50.00 },
          { competitionId: 2, amount: 30.00 }
        ],
        transactionDate: '2024-12-31'
      };

      const mockDistribution = {
        id: 1,
        seasonId: 1,
        totalAmount: 80.00,
        transactionDate: '2024-12-31'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ distribution: mockDistribution })
      });

      const result = await apiClient.createDistribution(dto);

      expect(result).toEqual(mockDistribution);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/distributions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(dto)
        })
      );
    });

    test('should handle duplicate distribution error', async () => {
      const dto = {
        seasonId: 1,
        assignments: [{ competitionId: 1, amount: 50.00 }],
        transactionDate: '2024-12-31'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Distribution already exists' })
      });

      await expect(apiClient.createDistribution(dto)).rejects.toThrow(
        'Distribution already exists for this season'
      );
    });
  });

  describe('getDistributionBySeason', () => {
    test('should retrieve distribution successfully', async () => {
      const mockDistribution = {
        id: 1,
        seasonId: 1,
        totalAmount: 80.00,
        assignments: [
          { competitionId: 1, amount: 50.00 },
          { competitionId: 2, amount: 30.00 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ distribution: mockDistribution })
      });

      const result = await apiClient.getDistributionBySeason(1);

      expect(result).toEqual(mockDistribution);
    });

    test('should return null when no distribution exists', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'No distribution found' })
      });

      const result = await apiClient.getDistributionBySeason(1);

      expect(result).toBeNull();
    });
  });

  describe('voidDistribution', () => {
    test('should void distribution successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Distribution voided successfully' })
      });

      await apiClient.voidDistribution(1);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/distributions/1/void',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('should handle distribution not found error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Distribution not found' })
      });

      await expect(apiClient.voidDistribution(999)).rejects.toThrow('Failed to void distribution');
    });
  });
});

describe('APIClient - Competition Costs Methods', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new APIClient('http://localhost:3000');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompetitionCost', () => {
    test('should create competition cost successfully', async () => {
      const dto = {
        description: 'Trophy engraving',
        amount: 45.50
      };

      const mockCost = {
        id: 1,
        description: 'Trophy engraving',
        amount: 45.50,
        transactionDate: '2024-01-15'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cost: mockCost })
      });

      const result = await apiClient.createCompetitionCost(dto);

      expect(result).toEqual(mockCost);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/competition-costs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(dto)
        })
      );
    });

    test('should handle duplicate description error', async () => {
      const dto = {
        description: 'Trophy engraving',
        amount: 45.50
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Cost already exists' })
      });

      await expect(apiClient.createCompetitionCost(dto)).rejects.toThrow(
        'A cost with description "Trophy engraving" already exists'
      );
    });
  });

  describe('getAllCompetitionCosts', () => {
    test('should retrieve all competition costs successfully', async () => {
      const mockCosts = [
        { id: 1, description: 'Trophy engraving', amount: 45.50, transactionDate: '2024-01-15' },
        { id: 2, description: 'Stationery', amount: 20.00, transactionDate: '2024-01-10' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ costs: mockCosts, total: 65.50 })
      });

      const result = await apiClient.getAllCompetitionCosts();

      expect(result).toEqual({
        costs: mockCosts,
        total: 65.50
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/competition-costs',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should return empty array when no costs exist', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ costs: [], total: 0 })
      });

      const result = await apiClient.getAllCompetitionCosts();

      expect(result).toEqual({ costs: [], total: 0 });
    });
  });

  describe('getCompetitionCostsByDateRange', () => {
    test('should retrieve costs by date range successfully', async () => {
      const mockCosts = [
        { id: 1, description: 'Trophy engraving', amount: 45.50, transactionDate: '2024-01-15' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ costs: mockCosts, total: 45.50 })
      });

      const result = await apiClient.getCompetitionCostsByDateRange('2024-01-01', '2024-01-31');

      expect(result).toEqual({
        costs: mockCosts,
        total: 45.50
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/competition-costs/range?startDate=2024-01-01&endDate=2024-01-31',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should handle validation errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid date format' })
      });

      await expect(
        apiClient.getCompetitionCostsByDateRange('invalid', '2024-01-31')
      ).rejects.toThrow('Failed to retrieve competition costs by date range');
    });
  });
});
