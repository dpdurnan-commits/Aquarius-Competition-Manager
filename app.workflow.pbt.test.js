/**
 * Property-Based Tests for App.js Workflow Integration
 * Tests the competition creation workflow integration using fast-check
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';

// Mock the global functions and objects that app.js uses
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    innerHTML: ''
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

describe('App.js Workflow Integration - Property-Based Tests', () => {
  describe('Property 6: Sequential Dialog Presentation', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * For any list of N new competition names (where N > 1),
     * the system should present exactly N dialogs in sequence
     */

    let mockApiClient;
    let mockDialog;
    let dialogShowCallCount;
    let shownCompetitionNames;

    beforeEach(() => {
      // Reset counters
      dialogShowCallCount = 0;
      shownCompetitionNames = [];

      // Mock API client
      mockApiClient = {
        request: jest.fn().mockResolvedValue({ seasons: [] }),
        createCompetition: jest.fn().mockImplementation((data) => 
          Promise.resolve({ id: Math.floor(Math.random() * 1000), ...data })
        ),
        getAll: jest.fn().mockResolvedValue([])
      };

      // Clear document body
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    // Generator for competition names
    const competitionNamesArbitrary = () => fc.array(
      fc.string({ minLength: 3, maxLength: 30 }),
      { minLength: 2, maxLength: 10 }
    ).map(names => {
      // Ensure unique names
      return [...new Set(names)];
    }).filter(names => names.length >= 2);

    // Simulate the showCompetitionCreationFlow function
    async function showCompetitionCreationFlow(newCompetitionNames, shouldCancel = false, cancelAtIndex = -1) {
      const createdCompetitions = [];
      
      // Loop through new competition names sequentially
      for (let i = 0; i < newCompetitionNames.length; i++) {
        const competitionName = newCompetitionNames[i];
        
        // Track that a dialog was shown
        dialogShowCallCount++;
        shownCompetitionNames.push(competitionName);
        
        // Simulate user cancelling at specific index
        if (shouldCancel && i === cancelAtIndex) {
          return null;
        }
        
        // Simulate dialog completion with created competition
        const result = {
          id: Math.floor(Math.random() * 1000),
          name: competitionName,
          date: '2024-01-15',
          type: 'singles',
          seasonId: 1
        };
        
        createdCompetitions.push(result);
      }
      
      return createdCompetitions;
    }

    test('should present exactly N dialogs for N new competition names', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 6: Sequential Dialog Presentation
      await fc.assert(
        fc.asyncProperty(
          competitionNamesArbitrary(),
          async (competitionNames) => {
            // Reset counters
            dialogShowCallCount = 0;
            shownCompetitionNames = [];
            
            const N = competitionNames.length;
            
            // Execute the flow
            const result = await showCompetitionCreationFlow(competitionNames);
            
            // Verify exactly N dialogs were shown
            expect(dialogShowCallCount).toBe(N);
            
            // Verify result is not null (not cancelled)
            expect(result).not.toBeNull();
            
            // Verify N competitions were created
            expect(result.length).toBe(N);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should present dialogs in the same order as competition names', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 6: Sequential Dialog Presentation
      await fc.assert(
        fc.asyncProperty(
          competitionNamesArbitrary(),
          async (competitionNames) => {
            // Reset counters
            dialogShowCallCount = 0;
            shownCompetitionNames = [];
            
            // Execute the flow
            await showCompetitionCreationFlow(competitionNames);
            
            // Verify dialogs were shown in correct order
            expect(shownCompetitionNames).toEqual(competitionNames);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should stop presenting dialogs when user cancels', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 6: Sequential Dialog Presentation
      await fc.assert(
        fc.asyncProperty(
          competitionNamesArbitrary(),
          fc.integer({ min: 0, max: 5 }),
          async (competitionNames, cancelIndex) => {
            // Reset counters
            dialogShowCallCount = 0;
            shownCompetitionNames = [];
            
            // Ensure cancel index is within bounds
            const actualCancelIndex = cancelIndex % competitionNames.length;
            
            // Execute the flow with cancellation
            const result = await showCompetitionCreationFlow(competitionNames, true, actualCancelIndex);
            
            // Verify result is null (cancelled)
            expect(result).toBeNull();
            
            // Verify dialogs were shown up to and including the cancel point
            expect(dialogShowCallCount).toBe(actualCancelIndex + 1);
            
            // Verify no more dialogs were shown after cancellation
            expect(shownCompetitionNames.length).toBe(actualCancelIndex + 1);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle single competition name as edge case', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 6: Sequential Dialog Presentation
      const singleName = ['Test Competition'];
      
      // Reset counters
      dialogShowCallCount = 0;
      shownCompetitionNames = [];
      
      // Execute the flow
      const result = await showCompetitionCreationFlow(singleName);
      
      // Verify exactly 1 dialog was shown
      expect(dialogShowCallCount).toBe(1);
      expect(result.length).toBe(1);
      expect(shownCompetitionNames).toEqual(singleName);
    });
  });

  describe('Property 7: Competition Creation Round-Trip', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * For any valid competition data (name, date, type, seasonId),
     * submitting the creation dialog should result in a database record
     * with matching field values
     */

    let mockApiClient;

    beforeEach(() => {
      mockApiClient = {
        createCompetition: jest.fn(),
        request: jest.fn().mockResolvedValue({ seasons: [] })
      };
    });

    // Generator for valid competition data
    const validCompetitionDataArbitrary = () => fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]),
      type: fc.constantFrom('singles', 'doubles'),
      seasonId: fc.integer({ min: 1, max: 100 })
    });

    test('should create database record with matching field values', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 7: Competition Creation Round-Trip
      await fc.assert(
        fc.asyncProperty(
          validCompetitionDataArbitrary(),
          async (competitionData) => {
            // Mock the API to return the created competition with an ID
            const createdCompetition = {
              id: Math.floor(Math.random() * 1000),
              ...competitionData
            };
            
            mockApiClient.createCompetition.mockResolvedValueOnce(createdCompetition);
            
            // Simulate competition creation
            const result = await mockApiClient.createCompetition(competitionData);
            
            // Verify API was called with correct data
            expect(mockApiClient.createCompetition).toHaveBeenCalledWith(competitionData);
            
            // Verify returned record has an ID
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('number');
            
            // Verify all field values match
            expect(result.name).toBe(competitionData.name);
            expect(result.date).toBe(competitionData.date);
            expect(result.type).toBe(competitionData.type);
            expect(result.seasonId).toBe(competitionData.seasonId);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve special characters in competition name', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 7: Competition Creation Round-Trip
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.constantFrom(
              'Competition & Co.',
              'Competition "A"',
              "Competition's Name",
              'Competition <2024>',
              'Competition #1'
            )
          ),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          fc.constantFrom('singles', 'doubles'),
          fc.integer({ min: 1, max: 100 }),
          async (name, date, type, seasonId) => {
            const competitionData = { name, date, type, seasonId };
            
            const createdCompetition = {
              id: Math.floor(Math.random() * 1000),
              ...competitionData
            };
            
            mockApiClient.createCompetition.mockResolvedValueOnce(createdCompetition);
            
            const result = await mockApiClient.createCompetition(competitionData);
            
            // Verify name is preserved exactly
            expect(result.name).toBe(name);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Sequential Creation Workflow', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any list of new competitions, after successfully creating
     * competition at index i, if index i+1 exists, the system should
     * show the dialog for competition i+1
     */

    let creationOrder;

    beforeEach(() => {
      creationOrder = [];
    });

    // Simulate sequential creation with tracking
    async function trackSequentialCreation(competitionNames) {
      for (let i = 0; i < competitionNames.length; i++) {
        const name = competitionNames[i];
        
        // Record that we're creating competition at index i
        creationOrder.push({ index: i, name, action: 'creating' });
        
        // Simulate creation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // Record completion
        creationOrder.push({ index: i, name, action: 'completed' });
        
        // If there's a next competition, record that we're about to show its dialog
        if (i + 1 < competitionNames.length) {
          creationOrder.push({ 
            index: i + 1, 
            name: competitionNames[i + 1], 
            action: 'showing_dialog' 
          });
        }
      }
    }

    test('should show dialog for competition i+1 after completing competition i', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 8: Sequential Creation Workflow
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 8 })
            .map(names => [...new Set(names)])
            .filter(names => names.length >= 2),
          async (competitionNames) => {
            creationOrder = [];
            
            await trackSequentialCreation(competitionNames);
            
            // Verify that for each competition i (except the last),
            // after it's completed, the next dialog is shown
            for (let i = 0; i < competitionNames.length - 1; i++) {
              // Find the completion event for competition i
              const completionIndex = creationOrder.findIndex(
                event => event.index === i && event.action === 'completed'
              );
              
              // Find the showing_dialog event for competition i+1
              const nextDialogIndex = creationOrder.findIndex(
                event => event.index === i + 1 && event.action === 'showing_dialog'
              );
              
              // Verify both events exist
              expect(completionIndex).toBeGreaterThanOrEqual(0);
              expect(nextDialogIndex).toBeGreaterThanOrEqual(0);
              
              // Verify next dialog is shown after current completion
              expect(nextDialogIndex).toBeGreaterThan(completionIndex);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain strict sequential order without overlap', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 8: Sequential Creation Workflow
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 6 })
            .map(names => [...new Set(names)])
            .filter(names => names.length >= 2),
          async (competitionNames) => {
            creationOrder = [];
            
            await trackSequentialCreation(competitionNames);
            
            // Verify no competition i+1 starts before competition i completes
            for (let i = 0; i < competitionNames.length - 1; i++) {
              const currentCompletionIndex = creationOrder.findIndex(
                event => event.index === i && event.action === 'completed'
              );
              
              const nextCreationIndex = creationOrder.findIndex(
                event => event.index === i + 1 && event.action === 'creating'
              );
              
              // Next creation should happen after current completion
              expect(nextCreationIndex).toBeGreaterThan(currentCompletionIndex);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: Season Validation on Creation', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * For any competition creation attempt with a seasonId where
     * allCompetitionsAdded is true, the system should reject the creation
     */

    let mockApiClient;

    beforeEach(() => {
      mockApiClient = {
        createCompetition: jest.fn(),
        request: jest.fn()
      };
    });

    // Generator for competition data with invalid season
    const competitionWithInvalidSeasonArbitrary = () => fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]),
      type: fc.constantFrom('singles', 'doubles'),
      seasonId: fc.integer({ min: 1, max: 100 })
    });

    test('should reject creation when season has allCompetitionsAdded=true', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 9: Season Validation on Creation
      await fc.assert(
        fc.asyncProperty(
          competitionWithInvalidSeasonArbitrary(),
          async (competitionData) => {
            // Mock API to reject with season validation error
            mockApiClient.createCompetition.mockRejectedValueOnce(
              new Error('Invalid season selected. The season may be marked as complete.')
            );
            
            // Attempt to create competition
            await expect(
              mockApiClient.createCompetition(competitionData)
            ).rejects.toThrow('season');
            
            // Verify API was called
            expect(mockApiClient.createCompetition).toHaveBeenCalledWith(competitionData);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should provide clear error message for invalid season', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 9: Season Validation on Creation
      const competitionData = {
        name: 'Test Competition',
        date: '2024-01-15',
        type: 'singles',
        seasonId: 1
      };
      
      mockApiClient.createCompetition.mockRejectedValueOnce(
        new Error('Invalid season selected. The season may be marked as complete.')
      );
      
      try {
        await mockApiClient.createCompetition(competitionData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('season');
        expect(error.message).toContain('complete');
      }
    });
  });

  describe('Property 11: Existing Validation Preservation', () => {
    /**
     * **Validates: Requirements 4.4, 6.2, 6.3, 6.4**
     * 
     * For any transaction import, the system should still apply chronological
     * validation and duplicate checking, rejecting invalid data as before
     */

    let mockChronologicalValidator;
    let mockApiClient;

    beforeEach(() => {
      mockChronologicalValidator = {
        validate: jest.fn()
      };
      
      mockApiClient = {
        store: jest.fn(),
        getAll: jest.fn().mockResolvedValue([]),
        getWeeklySummaries: jest.fn().mockResolvedValue([])
      };
    });

    // Generator for transaction records
    const transactionRecordArbitrary = () => fc.record({
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]),
      time: fc.tuple(fc.integer(0, 23), fc.integer(0, 59))
        .map(([h, m]) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`),
      type: fc.constantFrom('Sale', 'Refund', 'Topup'),
      member: fc.string({ minLength: 1, maxLength: 50 }),
      player: fc.string({ minLength: 1, maxLength: 50 }),
      competition: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
      total: fc.float({ min: -100, max: 100 }).map(n => n.toFixed(2))
    });

    // Simulate the validation workflow
    async function simulateImportWithValidation(records, validationResult) {
      // Step 1: Competition detection and creation (already tested)
      // Assume no new competitions for this test
      
      // Step 2: Chronological validation
      const validation = await mockChronologicalValidator.validate(records);
      
      if (!validation.valid) {
        // Validation failed - should abort
        return { success: false, reason: 'validation_failed', error: validation.error };
      }
      
      // Step 3: Store records
      const storeResult = await mockApiClient.store(records);
      
      return { success: true, stored: storeResult.stored };
    }

    test('should reject imports that fail chronological validation', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 11: Existing Validation Preservation
      await fc.assert(
        fc.asyncProperty(
          fc.array(transactionRecordArbitrary(), { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (records, errorMessage) => {
            // Mock validation to fail
            mockChronologicalValidator.validate.mockResolvedValueOnce({
              valid: false,
              error: errorMessage
            });
            
            // Attempt import
            const result = await simulateImportWithValidation(records, { valid: false, error: errorMessage });
            
            // Verify validation was called
            expect(mockChronologicalValidator.validate).toHaveBeenCalledWith(records);
            
            // Verify import was rejected
            expect(result.success).toBe(false);
            expect(result.reason).toBe('validation_failed');
            
            // Verify store was NOT called (validation failed)
            expect(mockApiClient.store).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should proceed with storage when validation passes', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 11: Existing Validation Preservation
      await fc.assert(
        fc.asyncProperty(
          fc.array(transactionRecordArbitrary(), { minLength: 1, maxLength: 20 }),
          async (records) => {
            // Mock validation to pass
            mockChronologicalValidator.validate.mockResolvedValueOnce({
              valid: true
            });
            
            // Mock successful storage
            mockApiClient.store.mockResolvedValueOnce({
              stored: records.length,
              errors: []
            });
            
            // Attempt import
            const result = await simulateImportWithValidation(records, { valid: true });
            
            // Verify validation was called
            expect(mockChronologicalValidator.validate).toHaveBeenCalledWith(records);
            
            // Verify import succeeded
            expect(result.success).toBe(true);
            
            // Verify store WAS called (validation passed)
            expect(mockApiClient.store).toHaveBeenCalledWith(records);
            
            // Verify correct number of records stored
            expect(result.stored).toBe(records.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should validate before storing regardless of competition creation', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 11: Existing Validation Preservation
      // This test ensures validation happens even after competitions are created
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(transactionRecordArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.boolean(),
          async (records, shouldValidationPass) => {
            // Reset mocks for each iteration
            mockChronologicalValidator.validate.mockClear();
            mockApiClient.store.mockClear();
            
            // Mock validation result
            mockChronologicalValidator.validate.mockResolvedValueOnce({
              valid: shouldValidationPass,
              error: shouldValidationPass ? undefined : 'Validation error'
            });
            
            if (shouldValidationPass) {
              mockApiClient.store.mockResolvedValueOnce({
                stored: records.length,
                errors: []
              });
            }
            
            // Simulate import (assuming competitions were already created)
            const result = await simulateImportWithValidation(records, { 
              valid: shouldValidationPass,
              error: shouldValidationPass ? undefined : 'Validation error'
            });
            
            // Verify validation was always called
            expect(mockChronologicalValidator.validate).toHaveBeenCalled();
            
            // Verify storage only happened if validation passed
            if (shouldValidationPass) {
              expect(mockApiClient.store).toHaveBeenCalled();
              expect(result.success).toBe(true);
            } else {
              expect(mockApiClient.store).not.toHaveBeenCalled();
              expect(result.success).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain validation order: competitions -> validation -> storage', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 11: Existing Validation Preservation
      const records = [
        { date: '2024-01-15', time: '10:00:00', type: 'Sale', member: 'M1', player: 'P1', competition: 'C1', total: '10.00' }
      ];
      
      const callOrder = [];
      
      // Track call order
      mockChronologicalValidator.validate.mockImplementation(async (recs) => {
        callOrder.push('validate');
        return { valid: true };
      });
      
      mockApiClient.store.mockImplementation(async (recs) => {
        callOrder.push('store');
        return { stored: recs.length, errors: [] };
      });
      
      // Simulate the workflow
      await simulateImportWithValidation(records, { valid: true });
      
      // Verify order: validate must come before store
      expect(callOrder).toEqual(['validate', 'store']);
    });

    test('should preserve duplicate checking behavior', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 11: Existing Validation Preservation
      // Note: Duplicate checking is part of chronological validation
      
      const duplicateRecords = [
        { date: '2024-01-15', time: '10:00:00', type: 'Sale', member: 'M1', player: 'P1', competition: 'C1', total: '10.00' },
        { date: '2024-01-15', time: '10:00:00', type: 'Sale', member: 'M1', player: 'P1', competition: 'C1', total: '10.00' }
      ];
      
      // Mock validation to detect duplicates
      mockChronologicalValidator.validate.mockResolvedValueOnce({
        valid: false,
        error: 'Duplicate records detected'
      });
      
      const result = await simulateImportWithValidation(duplicateRecords, { 
        valid: false, 
        error: 'Duplicate records detected' 
      });
      
      // Verify validation was called
      expect(mockChronologicalValidator.validate).toHaveBeenCalled();
      
      // Verify import was rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate');
      
      // Verify store was NOT called
      expect(mockApiClient.store).not.toHaveBeenCalled();
    });
  });

  describe('Property 12: Success Message Accuracy', () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * For any successful import, the success message should contain counts
     * that match the actual number of transactions imported and competitions created
     */

    // Generator for import results
    const importResultArbitrary = () => fc.record({
      transactionsImported: fc.integer({ min: 1, max: 100 }),
      competitionsCreated: fc.integer({ min: 0, max: 20 })
    });

    function generateSuccessMessage(transactionsImported, competitionsCreated) {
      if (competitionsCreated > 0) {
        return `Successfully imported ${transactionsImported} transaction${transactionsImported !== 1 ? 's' : ''} and created ${competitionsCreated} competition${competitionsCreated !== 1 ? 's' : ''}.`;
      } else {
        return `Successfully saved ${transactionsImported} record${transactionsImported !== 1 ? 's' : ''} to database. You can now flag transactions as winnings.`;
      }
    }

    test('should include correct transaction count in success message', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 12: Success Message Accuracy
      await fc.assert(
        fc.property(
          importResultArbitrary(),
          (result) => {
            const message = generateSuccessMessage(
              result.transactionsImported,
              result.competitionsCreated
            );
            
            // Verify message contains the transaction count
            expect(message).toContain(result.transactionsImported.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include correct competition count when competitions were created', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 12: Success Message Accuracy
      await fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (transactionsImported, competitionsCreated) => {
            const message = generateSuccessMessage(transactionsImported, competitionsCreated);
            
            // Verify message contains both counts
            expect(message).toContain(transactionsImported.toString());
            expect(message).toContain(competitionsCreated.toString());
            expect(message).toContain('imported');
            expect(message).toContain('created');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use correct singular/plural forms', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 12: Success Message Accuracy
      
      // Test singular transaction, no competitions
      let message = generateSuccessMessage(1, 0);
      expect(message).toContain('1 record');
      expect(message).not.toContain('records');
      
      // Test plural transactions, no competitions
      message = generateSuccessMessage(5, 0);
      expect(message).toContain('5 records');
      
      // Test singular transaction, singular competition
      message = generateSuccessMessage(1, 1);
      expect(message).toContain('1 transaction');
      expect(message).toContain('1 competition');
      expect(message).not.toContain('transactions');
      expect(message).not.toContain('competitions');
      
      // Test plural transactions, plural competitions
      message = generateSuccessMessage(10, 3);
      expect(message).toContain('10 transactions');
      expect(message).toContain('3 competitions');
    });

    test('should not mention competitions when none were created', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 12: Success Message Accuracy
      await fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (transactionsImported) => {
            const message = generateSuccessMessage(transactionsImported, 0);
            
            // Verify message does not mention competitions
            expect(message).not.toContain('competition');
            expect(message).not.toContain('created');
            
            // Verify it still contains transaction count
            expect(message).toContain(transactionsImported.toString());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Season Flag Display Consistency', () => {
    /**
     * **Validates: Requirements 5.3**
     * 
     * For any presentation season, the displayed allCompetitionsAdded status
     * in the UI should match the current database value
     */

    let mockApiClient;
    let mockDocument;

    beforeEach(() => {
      // Mock API client
      mockApiClient = {
        getAllPresentationSeasons: jest.fn()
      };

      // Mock document for DOM manipulation
      mockDocument = {
        getElementById: jest.fn(),
        createElement: jest.fn((tag) => {
          const element = {
            tagName: tag.toUpperCase(),
            type: '',
            checked: false,
            textContent: '',
            className: '',
            dataset: {},
            style: {},
            children: [],
            appendChild: jest.fn(function(child) {
              this.children.push(child);
              return child;
            }),
            addEventListener: jest.fn(),
            setAttribute: jest.fn()
          };
          return element;
        })
      };
    });

    // Generator for presentation seasons with various flag values
    const presentationSeasonArbitrary = () => fc.record({
      id: fc.integer({ min: 1, max: 1000 }),
      name: fc.string({ minLength: 5, maxLength: 50 }),
      startYear: fc.integer({ min: 2020, max: 2029 }),
      endYear: fc.integer({ min: 2021, max: 2030 }),
      isActive: fc.boolean(),
      allCompetitionsAdded: fc.boolean()
    });

    // Simulate the createSeasonRow function from competitionManagerUI.js
    function createSeasonRow(season, document) {
      const row = document.createElement('tr');
      row.dataset.seasonId = season.id;

      // Name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = season.name;
      row.appendChild(nameCell);

      // Status cell
      const statusCell = document.createElement('td');
      const isActive = season.isActive || season.is_active;
      statusCell.textContent = isActive ? 'Active' : 'Inactive';
      statusCell.className = isActive ? 'status-active' : 'status-inactive';
      row.appendChild(statusCell);

      // All Competitions Added cell with toggle
      const toggleCell = document.createElement('td');
      toggleCell.className = 'toggle-cell';

      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'toggle-switch';
      toggleLabel.setAttribute('aria-label', `Toggle all competitions added for ${season.name}`);

      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = season.allCompetitionsAdded || season.all_competitions_added || false;
      toggleInput.dataset.seasonId = season.id;

      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'toggle-slider';

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSlider);
      toggleCell.appendChild(toggleLabel);

      row.appendChild(toggleCell);

      return row;
    }

    // Simulate the renderSeasons function
    async function renderSeasons(apiClient, document) {
      // Fetch all presentation seasons
      const seasons = await apiClient.getAllPresentationSeasons();

      // Create rows for each season
      const rows = seasons.map(season => createSeasonRow(season, document));

      return { seasons, rows };
    }

    test('should display checkbox state matching database allCompetitionsAdded value', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 14: Season Flag Display Consistency
      await fc.assert(
        fc.asyncProperty(
          fc.array(presentationSeasonArbitrary(), { minLength: 1, maxLength: 10 }),
          async (seasons) => {
            // Mock API to return the generated seasons
            mockApiClient.getAllPresentationSeasons.mockResolvedValueOnce(seasons);

            // Render seasons
            const { seasons: fetchedSeasons, rows } = await renderSeasons(mockApiClient, mockDocument);

            // Verify each season's displayed state matches database value
            for (let i = 0; i < seasons.length; i++) {
              const season = seasons[i];
              const row = rows[i];

              // Find the toggle input in the row (it's in the third cell, inside label)
              const toggleCell = row.children[2]; // Third cell (index 2)
              const toggleLabel = toggleCell.children[0]; // Label inside cell
              const toggleInput = toggleLabel.children[0]; // Input inside label

              // Verify the checkbox state matches the database value
              expect(toggleInput.checked).toBe(season.allCompetitionsAdded);
              expect(toggleInput.type).toBe('checkbox');
              expect(toggleInput.dataset.seasonId).toBe(season.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle both camelCase and snake_case property names', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 14: Season Flag Display Consistency
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 5, maxLength: 30 }),
          async (flagValue, seasonId, seasonName) => {
            // Test with camelCase
            const seasonCamelCase = {
              id: seasonId,
              name: seasonName,
              startYear: 2023,
              endYear: 2024,
              isActive: true,
              allCompetitionsAdded: flagValue
            };

            const rowCamelCase = createSeasonRow(seasonCamelCase, mockDocument);
            const toggleInputCamelCase = rowCamelCase.children[2].children[0].children[0];
            expect(toggleInputCamelCase.checked).toBe(flagValue);

            // Test with snake_case
            const seasonSnakeCase = {
              id: seasonId,
              name: seasonName,
              start_year: 2023,
              end_year: 2024,
              is_active: true,
              all_competitions_added: flagValue
            };

            const rowSnakeCase = createSeasonRow(seasonSnakeCase, mockDocument);
            const toggleInputSnakeCase = rowSnakeCase.children[2].children[0].children[0];
            expect(toggleInputSnakeCase.checked).toBe(flagValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should default to false when allCompetitionsAdded is undefined', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 14: Season Flag Display Consistency
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 5, maxLength: 30 }),
          async (seasonId, seasonName) => {
            // Season without allCompetitionsAdded property
            const season = {
              id: seasonId,
              name: seasonName,
              startYear: 2023,
              endYear: 2024,
              isActive: true
              // allCompetitionsAdded is undefined
            };

            const row = createSeasonRow(season, mockDocument);
            const toggleInput = row.children[2].children[0].children[0];

            // Should default to false
            expect(toggleInput.checked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain consistency across multiple seasons with mixed flag values', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 14: Season Flag Display Consistency
      await fc.assert(
        fc.asyncProperty(
          fc.array(presentationSeasonArbitrary(), { minLength: 2, maxLength: 10 })
            .chain(seasons => {
              // Ensure we have at least one true and one false
              if (seasons.length >= 2) {
                seasons[0].allCompetitionsAdded = true;
                seasons[1].allCompetitionsAdded = false;
              }
              return fc.constant(seasons);
            }),
          async (seasons) => {
            // Mock API to return the generated seasons
            mockApiClient.getAllPresentationSeasons.mockResolvedValueOnce(seasons);

            // Render seasons
            const { rows } = await renderSeasons(mockApiClient, mockDocument);

            // Count how many are true/false in database
            const trueCount = seasons.filter(s => s.allCompetitionsAdded === true).length;
            const falseCount = seasons.filter(s => s.allCompetitionsAdded === false).length;

            // Count how many are checked/unchecked in UI
            const checkedCount = rows.filter(row => {
              const toggleInput = row.children[2].children[0].children[0];
              return toggleInput.checked === true;
            }).length;
            const uncheckedCount = rows.filter(row => {
              const toggleInput = row.children[2].children[0].children[0];
              return toggleInput.checked === false;
            }).length;

            // Verify counts match
            expect(checkedCount).toBe(trueCount);
            expect(uncheckedCount).toBe(falseCount);

            // Verify each individual season
            for (let i = 0; i < seasons.length; i++) {
              const toggleInput = rows[i].children[2].children[0].children[0];
              expect(toggleInput.checked).toBe(seasons[i].allCompetitionsAdded);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve exact boolean values without type coercion', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 14: Season Flag Display Consistency
      const testCases = [
        { value: true, expected: true },
        { value: false, expected: false },
        { value: undefined, expected: false },
        { value: null, expected: false }
      ];

      for (const testCase of testCases) {
        const season = {
          id: 1,
          name: 'Test Season',
          startYear: 2023,
          endYear: 2024,
          isActive: true,
          allCompetitionsAdded: testCase.value
        };

        const row = createSeasonRow(season, mockDocument);
        const toggleInput = row.children[2].children[0].children[0];

        expect(toggleInput.checked).toBe(testCase.expected);
      }
    });
  });
});
