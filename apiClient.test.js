/**
 * API Client Tests
 * Unit tests for API Client with mocked fetch
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { APIClient } from './apiClient.js';

describe('APIClient', () => {
  let apiClient;
  let originalFetch;

  beforeEach(() => {
    // Create a new API client instance for each test
    apiClient = new APIClient('http://localhost:3000');
    
    // Store original fetch
    originalFetch = global.fetch;
    
    // Clear any previous mocks
    if (global.fetch && global.fetch.mockClear) {
      global.fetch.mockClear();
    }
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  /**
   * Helper to create a mock fetch response
   */
  function mockFetchSuccess(data) {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data)
      })
    );
  }

  function mockFetchError(status, message, details = {}) {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status,
        statusText: message,
        json: () => Promise.resolve({ message, ...details })
      })
    );
  }

  function mockFetchNetworkError() {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network request failed'))
    );
  }

  // ========== Transaction API Tests ==========

  describe('store', () => {
    test('should import transactions successfully', async () => {
      const mockRecords = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'John Doe',
          player: '',
          competition: '',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      mockFetchSuccess({ imported: 1, errors: [] });

      const result = await apiClient.store(mockRecords);

      expect(result).toEqual({ imported: 1, errors: [] });
    });

    test('should return empty array when no summaries exist', async () => {
      mockFetchSuccess({ summaries: [], count: 0 });

      const result = await apiClient.getWeeklySummaries();

      expect(result).toEqual([]);
    });

    test('should handle network errors with retry', async () => {
      mockFetchNetworkError();

      await expect(apiClient.getWeeklySummaries()).rejects.toThrow('Network error');
      
      // Should retry 3 times
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('getWeeklySummariesByDateRange', () => {
    test('should retrieve weekly summaries for date range successfully', async () => {
      const mockSummaries = [
        {
          fromDate: '2024-01-01',
          toDate: '2024-01-07',
          startingPurse: 0,
          finalPurse: 100,
          startingPot: 0,
          finalPot: 200
        }
      ];

      mockFetchSuccess({ summaries: mockSummaries, count: 1 });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await apiClient.getWeeklySummariesByDateRange(startDate, endDate);

      expect(result).toEqual(mockSummaries);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/summaries/weekly?startDate=2024-01-01&endDate=2024-01-31',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    test('should handle server errors', async () => {
      mockFetchError(500, 'Internal server error');

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await expect(apiClient.getWeeklySummariesByDateRange(startDate, endDate))
        .rejects.toThrow('Failed to retrieve weekly summaries by date range');
    });
  });
});
