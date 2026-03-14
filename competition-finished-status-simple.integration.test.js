/**
 * Simplified Integration Tests for Competition Finished Status Feature
 * 
 * Tests the core end-to-end workflow for marking competitions as finished,
 * focusing on API integration and data flow rather than complex UI interactions.
 * 
 * Feature: competition-finished-status
 * Task: 10.1 Verify end-to-end workflow
 * Task: 10.2 Write integration tests for complete workflow
 * Requirements: 1.2, 2.2, 3.2, 4.1, 2.3, 2.4, 8.3, 8.4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CompetitionManager } from './backend/public/competitionManager.js';
import { CompetitionList } from './backend/public/competitionList.js';

describe('Integration Tests: Competition Finished Status (Simplified)', () => {
  let apiClient;
  let competitionManager;
  let competitionList;

  beforeEach(() => {
    // Mock API client
    apiClient = {
      request: jest.fn(),
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      updateCompetition: jest.fn(),
      deleteCompetition: jest.fn(),
      getAllPresentationSeasons: jest.fn(),
      updatePresentationSeason: jest.fn(),
      getAllFlaggedTransactions: jest.fn(),
      getActivePresentationSeason: jest.fn(),
      createPresentationSeason: jest.fn(),
      setActivePresentationSeason: jest.fn()
    };

    // Initialize components
    competitionManager = new CompetitionManager(apiClient);
    competitionList = new CompetitionList(apiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: Create mock competition data
   */
  function createMockCompetition(id, name, finished = false) {
    return {
      id,
      name,
      finished,
      date: '2024-01-15',
      type: 'singles',
      seasonId: 1,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    };
  }

  describe('10.1 End-to-End Workflow Verification', () => {
    test('should create competition with finished=false by default', async () => {
      // Requirement 1.2: Competition defaults to finished=false when created
      
      const newCompetition = createMockCompetition(1, 'New Competition', false);
      const mockSeason = {
        id: 1,
        name: 'Season 2024',
        isActive: true
      };
      
      // Mock API responses
      apiClient.request.mockResolvedValue({ competitions: [] }); // For duplicate check
      apiClient.getActivePresentationSeason.mockResolvedValue(mockSeason);
      apiClient.createCompetition.mockResolvedValue(newCompetition);

      // Create competition
      const result = await competitionManager.create('New Competition');

      // Verify: Competition created with finished=false
      expect(apiClient.createCompetition).toHaveBeenCalledWith({
        name: 'New Competition',
        date: expect.any(String),
        type: 'singles',
        seasonId: 1
      });
      expect(result.finished).toBe(false);
    });

    test('should mark competition as finished and update status', async () => {
      // Requirement 2.2: Mark competition as finished updates status
      
      const activeCompetition = createMockCompetition(1, 'Test Competition', false);
      const finishedCompetition = createMockCompetition(1, 'Test Competition', true);
      
      apiClient.updateCompetition.mockResolvedValue(finishedCompetition);

      // Mark competition as finished
      const result = await competitionManager.updateFinishedStatus(1, true);

      // Verify: API called correctly and status updated
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });
      expect(result.finished).toBe(true);
      expect(result.name).toBe('Test Competition');
    });

    test('should exclude finished competition from selector', async () => {
      // Requirement 4.1: Finished competitions excluded from selector
      
      const activeCompetitions = [createMockCompetition(1, 'Active Competition', false)];
      
      // Mock API to return only active competitions for selector
      apiClient.getAllCompetitions.mockResolvedValue(activeCompetitions);
      apiClient.request.mockResolvedValue({ seasons: [] });

      // Load competitions in selector (CompetitionList)
      await competitionList.loadCompetitions();

      // Verify: Only active competition loaded
      expect(apiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(competitionList.competitions).toHaveLength(1);
      expect(competitionList.competitions[0].name).toBe('Active Competition');
      expect(competitionList.competitions[0].finished).toBe(false);
    });

    test('should restore competition to active status when unmarked', async () => {
      // Requirement 3.2: Unmarking competition restores to active status
      
      const finishedCompetition = createMockCompetition(1, 'Test Competition', true);
      const activeCompetition = createMockCompetition(1, 'Test Competition', false);
      
      apiClient.updateCompetition.mockResolvedValue(activeCompetition);

      // Unmark competition as finished
      const result = await competitionManager.updateFinishedStatus(1, false);

      // Verify: API called correctly and status updated
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: false });
      expect(result.finished).toBe(false);
      expect(result.name).toBe('Test Competition');
    });
  });

  describe('10.2 Complete Workflow Integration Tests', () => {
    test('should complete create → mark finished → verify excluded from selector workflow', async () => {
      // Requirements 2.3, 2.4, 4.1: Complete workflow with data preservation
      
      // Step 1: Create new competition
      const newCompetition = createMockCompetition(1, 'Integration Test Competition', false);
      const finishedCompetition = createMockCompetition(1, 'Integration Test Competition', true);
      const mockSeason = { id: 1, name: 'Season 2024', isActive: true };
      
      // Mock API responses
      apiClient.request.mockResolvedValue({ competitions: [] }); // For duplicate check
      apiClient.getActivePresentationSeason.mockResolvedValue(mockSeason);
      apiClient.createCompetition.mockResolvedValue(newCompetition);

      const createdCompetition = await competitionManager.create('Integration Test Competition');

      // Verify: Competition created
      expect(apiClient.createCompetition).toHaveBeenCalledWith({
        name: 'Integration Test Competition',
        date: expect.any(String),
        type: 'singles',
        seasonId: 1
      });
      expect(createdCompetition.finished).toBe(false);

      // Step 2: Mark competition as finished
      apiClient.updateCompetition.mockResolvedValue(finishedCompetition);
      
      const updatedCompetition = await competitionManager.updateFinishedStatus(1, true);

      // Verify: Competition marked as finished
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });
      expect(updatedCompetition.finished).toBe(true);

      // Step 3: Verify competition excluded from selector
      apiClient.getAllCompetitions.mockResolvedValue([]); // No active competitions
      apiClient.request.mockResolvedValue({ seasons: [] });
      
      await competitionList.loadCompetitions();

      // Verify: Selector shows no competitions
      expect(apiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(competitionList.competitions).toHaveLength(0);
    });

    test('should preserve competition results when marked as finished', async () => {
      // Requirements 2.3, 2.4: Results and transactions preserved when finished
      
      const competitionWithResults = createMockCompetition(1, 'Competition With Results', false);
      const finishedCompetitionWithResults = createMockCompetition(1, 'Competition With Results', true);
      
      // Mock flagged transactions check
      const mockFlaggedTransactions = [
        { id: 101, competitionId: 1, amount: 50.00 },
        { id: 102, competitionId: 1, amount: 30.00 }
      ];
      
      apiClient.getAllFlaggedTransactions.mockResolvedValue(mockFlaggedTransactions);
      apiClient.updateCompetition.mockResolvedValue(finishedCompetitionWithResults);

      // Mark competition as finished
      const result = await competitionManager.updateFinishedStatus(1, true);

      // Verify: Competition marked as finished
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });
      expect(result.finished).toBe(true);

      // Verify: Associated transactions still exist
      const transactionCount = await competitionManager.checkAssociatedTransactions(1);
      expect(transactionCount).toBe(2);
      expect(apiClient.getAllFlaggedTransactions).toHaveBeenCalled();
    });

    test('should filter competitions correctly by finished status', async () => {
      // Requirements 8.3, 8.4: Filtering by finished status
      
      const activeCompetitions = [
        createMockCompetition(1, 'Active Competition 1', false),
        createMockCompetition(2, 'Active Competition 2', false)
      ];
      const finishedCompetitions = [
        createMockCompetition(3, 'Finished Competition 1', true),
        createMockCompetition(4, 'Finished Competition 2', true)
      ];
      
      // Test filtering active competitions
      apiClient.request.mockResolvedValue({ competitions: activeCompetitions });
      const activeResults = await competitionManager.getAll({ finished: false });
      
      expect(apiClient.request).toHaveBeenCalledWith('/api/competitions?finished=false', { method: 'GET' });
      expect(activeResults).toHaveLength(2);
      expect(activeResults.every(c => c.finished === false)).toBe(true);

      // Test filtering finished competitions
      apiClient.request.mockResolvedValue({ competitions: finishedCompetitions });
      const finishedResults = await competitionManager.getAll({ finished: true });
      
      expect(apiClient.request).toHaveBeenCalledWith('/api/competitions?finished=true', { method: 'GET' });
      expect(finishedResults).toHaveLength(2);
      expect(finishedResults.every(c => c.finished === true)).toBe(true);
    });

    test('should handle competition selector with mixed finished status', async () => {
      // Integration test: Selector behavior with mixed competition states
      
      const activeOnly = [
        createMockCompetition(1, 'Active Competition 1', false),
        createMockCompetition(3, 'Active Competition 2', false)
      ];
      
      // Load competitions in selector
      apiClient.getAllCompetitions.mockResolvedValue(activeOnly);
      apiClient.request.mockResolvedValue({ seasons: [] });
      
      await competitionList.initialize();

      // Verify: Only active competitions loaded
      expect(apiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(competitionList.competitions).toHaveLength(2);
      expect(competitionList.competitions.map(c => c.name)).toEqual([
        'Active Competition 1',
        'Active Competition 2'
      ]);
      expect(competitionList.competitions.every(c => c.finished === false)).toBe(true);
    });

    test('should handle error scenarios gracefully', async () => {
      // Error handling: API failures during finished status operations
      
      // Mock API error for update operation
      apiClient.updateCompetition.mockRejectedValue(new Error('Network error'));

      // Attempt to mark as finished
      await expect(competitionManager.updateFinishedStatus(1, true))
        .rejects.toThrow('Failed to update finished status: Network error');

      // Verify: API was called
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });
    });
  });

  describe('Cross-Component Integration', () => {
    test('should maintain consistency between CompetitionManager and CompetitionList', async () => {
      // Integration: Ensure both components use same filtering logic
      
      const activeCompetitions = [createMockCompetition(1, 'Active Competition', false)];
      const finishedCompetitions = [createMockCompetition(2, 'Finished Competition', true)];
      
      // Test CompetitionManager filtering
      apiClient.request.mockResolvedValue({ competitions: activeCompetitions });
      const managerActiveResults = await competitionManager.getAll({ finished: false });
      
      apiClient.request.mockResolvedValue({ competitions: finishedCompetitions });
      const managerFinishedResults = await competitionManager.getAll({ finished: true });

      // Test CompetitionList filtering
      apiClient.getAllCompetitions.mockResolvedValue(activeCompetitions);
      await competitionList.loadCompetitions();
      
      // Verify: Both components use same filtering
      expect(managerActiveResults).toHaveLength(1);
      expect(managerActiveResults[0].finished).toBe(false);
      expect(managerFinishedResults).toHaveLength(1);
      expect(managerFinishedResults[0].finished).toBe(true);
      expect(competitionList.competitions).toHaveLength(1);
      expect(competitionList.competitions[0].finished).toBe(false);
    });

    test('should handle real-time updates between components', async () => {
      // Integration: Changes in one component reflected in others
      
      const competition = createMockCompetition(1, 'Test Competition', false);
      const finishedCompetition = createMockCompetition(1, 'Test Competition', true);
      
      // Step 1: Initial state - competition active in both components
      apiClient.request.mockResolvedValue({ competitions: [competition] });
      apiClient.getAllCompetitions.mockResolvedValue([competition]);
      
      const initialManagerResults = await competitionManager.getAll({ finished: false });
      await competitionList.loadCompetitions();
      
      // Verify: Both show active competition
      expect(initialManagerResults.length).toBe(1);
      expect(competitionList.competitions.length).toBe(1);

      // Step 2: Mark as finished via CompetitionManager
      apiClient.updateCompetition.mockResolvedValue(finishedCompetition);
      
      await competitionManager.updateFinishedStatus(1, true);
      
      // Step 3: Simulate refresh in both components
      apiClient.request.mockResolvedValue({ competitions: [] }); // Empty active list
      apiClient.getAllCompetitions.mockResolvedValue([]); // Empty active list for selector
      
      const updatedManagerResults = await competitionManager.getAll({ finished: false });
      await competitionList.loadCompetitions();
      
      // Verify: Both components reflect the change
      expect(updatedManagerResults.length).toBe(0);
      expect(competitionList.competitions.length).toBe(0);
    });

    test('should support round-trip finished status operations', async () => {
      // Integration: Mark finished → unmark → verify full cycle
      
      const originalCompetition = createMockCompetition(1, 'Round Trip Competition', false);
      const finishedCompetition = createMockCompetition(1, 'Round Trip Competition', true);
      const restoredCompetition = createMockCompetition(1, 'Round Trip Competition', false);
      
      // Step 1: Mark as finished
      apiClient.updateCompetition.mockResolvedValueOnce(finishedCompetition);
      const finishedResult = await competitionManager.updateFinishedStatus(1, true);
      
      expect(finishedResult.finished).toBe(true);
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: true });

      // Step 2: Unmark as finished
      apiClient.updateCompetition.mockResolvedValueOnce(restoredCompetition);
      const restoredResult = await competitionManager.updateFinishedStatus(1, false);
      
      expect(restoredResult.finished).toBe(false);
      expect(apiClient.updateCompetition).toHaveBeenCalledWith(1, { finished: false });

      // Verify: Both API calls were made
      expect(apiClient.updateCompetition).toHaveBeenCalledTimes(2);
    });

    test('should handle alphabetical sorting with mixed finished status', async () => {
      // Integration: Verify sorting works correctly for both active and finished competitions
      
      const mixedCompetitions = [
        createMockCompetition(3, 'Zebra Competition', false),
        createMockCompetition(1, 'Alpha Competition', false),
        createMockCompetition(2, 'Beta Competition', false)
      ];
      
      apiClient.request.mockResolvedValue({ competitions: mixedCompetitions });
      
      const results = await competitionManager.getAll({ finished: false });
      
      // Verify: Results are sorted alphabetically
      expect(results.map(c => c.name)).toEqual([
        'Alpha Competition',
        'Beta Competition',
        'Zebra Competition'
      ]);
    });
  });
});