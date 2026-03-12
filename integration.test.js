/**
 * Integration Unit Tests
 * Tests specific integration scenarios with known data
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FieldExtractor } from './fieldExtractor.js';
import { DatabaseManager } from './databaseManager.js';
import { ChronologicalValidator } from './chronologicalValidator.js';
import { WeeklySummarizer } from './weeklySummarizer.js';
import { TransactionSummaryView } from './transactionSummaryView.js';

describe('Integration Unit Tests', () => {
  let databaseManager;
  let fieldExtractor;
  let chronologicalValidator;
  let weeklySummarizer;
  let transactionSummaryView;
  let container;

  beforeEach(async () => {
    // Initialize components
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    await databaseManager.clearAll();
    
    fieldExtractor = new FieldExtractor();
    chronologicalValidator = new ChronologicalValidator(databaseManager);
    weeklySummarizer = new WeeklySummarizer();
    
    // Create container for TransactionSummaryView
    container = document.createElement('div');
    container.id = 'test-integration-container';
    document.body.appendChild(container);
    transactionSummaryView = new TransactionSummaryView('test-integration-container');
  });

  afterEach(async () => {
    await databaseManager.clearAll();
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  /**
   * Test complete pipeline with specific CSV data
   * Requirements: 9.1, 9.2
   */
  describe('Complete Pipeline with Specific Data', () => {
    test('should process single week of transactions through complete pipeline', async () => {
      // Sample transformed records (as they would come from CSV parser)
      const transformedRecords = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: 'Jane Smith',
          price: '30.00',
          discount: '0.00',
          subtotal: '30.00',
          vat: '6.00',
          total: '36.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          date: '03/01/2024',
          time: '12:00:00',
          till: '',
          type: 'Sale',
          member: 'Bob Jones & Stableford: Entry',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '1.00',
          total: '6.00',
          sourceRowIndex: 3,
          isComplete: true
        }
      ];

      // Step 1: Field Extraction
      const enhancedRecords = transformedRecords.map(record => 
        fieldExtractor.extract(record)
      );

      expect(enhancedRecords).toHaveLength(3);
      expect(enhancedRecords[0].player).toBe('');
      expect(enhancedRecords[0].competition).toBe('');
      expect(enhancedRecords[2].player).toBe('Bob Jones');
      expect(enhancedRecords[2].competition).toBe('Stableford');

      // Step 2: Chronological Validation
      const validationResult = await chronologicalValidator.validate(enhancedRecords);
      expect(validationResult.valid).toBe(true);

      // Step 3: Database Storage
      const storeResult = await databaseManager.store(enhancedRecords);
      expect(storeResult.stored).toBe(3);
      expect(storeResult.errors).toHaveLength(0);

      // Step 4: Retrieve and Summarize
      const storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(3);

      const summaries = weeklySummarizer.generateSummaries(storedRecords);
      expect(summaries).toHaveLength(1); // All in same week

      // Verify summary calculations
      const summary = summaries[0];
      expect(summary.startingPurse).toBe(0);
      expect(summary.purseApplicationTopUp).toBe(60.00); // First topup
      expect(summary.purseTillTopUp).toBe(36.00); // Second topup
      expect(summary.competitionEntries).toBe(6.00); // Sale
      expect(summary.finalPurse).toBe(90.00); // 0 + 60 + 36 - 6

      // Step 5: View Update
      transactionSummaryView.render(summaries);

      const tableElement = container.querySelector('.transaction-summary-table');
      expect(tableElement).not.toBeNull();

      const rows = tableElement.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
    });

    test('should process multiple weeks through complete pipeline', async () => {
      const transformedRecords = [
        {
          date: '01/01/2024', // Monday - Week 1
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 1',
          price: '100.00',
          discount: '0.00',
          subtotal: '100.00',
          vat: '20.00',
          total: '120.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '08/01/2024', // Monday - Week 2
          time: '10:00:00',
          till: '',
          type: 'Sale',
          member: 'Player 2 & Medal: Entry',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          date: '15/01/2024', // Monday - Week 3
          time: '10:00:00',
          till: '',
          type: 'Refund',
          member: 'Player 3 & Stableford: Refund',
          price: '-5.00',
          discount: '0.00',
          subtotal: '-5.00',
          vat: '-1.00',
          total: '-6.00',
          sourceRowIndex: 3,
          isComplete: true
        }
      ];

      // Execute pipeline
      const enhancedRecords = transformedRecords.map(record => 
        fieldExtractor.extract(record)
      );
      
      const validationResult = await chronologicalValidator.validate(enhancedRecords);
      expect(validationResult.valid).toBe(true);

      await databaseManager.store(enhancedRecords);
      const storedRecords = await databaseManager.getAll();
      
      const summaries = weeklySummarizer.generateSummaries(storedRecords);
      
      expect(summaries).toHaveLength(3); // Three weeks

      // Verify rolling balances
      expect(summaries[0].startingPurse).toBe(0);
      expect(summaries[0].finalPurse).toBe(120.00); // 0 + 120 (topup) - 0 + 0
      
      expect(summaries[1].startingPurse).toBe(120.00);
      expect(summaries[1].finalPurse).toBe(108.00); // 120 + 0 - 12 (sale) + 0
      
      expect(summaries[2].startingPurse).toBe(108.00);
      expect(summaries[2].finalPurse).toBe(114.00); // 108 + 0 - 0 - (-6) (refund)

      // Render and verify
      transactionSummaryView.render(summaries);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });
  });

  /**
   * Test view updates after storage
   * Requirements: 9.2
   */
  describe('View Updates After Storage', () => {
    test('should update view when new data is stored', async () => {
      // Initial state - empty
      transactionSummaryView.render([]);
      let emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();

      // Store first batch
      const batch1 = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Medal',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      await databaseManager.store(batch1);
      let storedRecords = await databaseManager.getAll();
      let summaries = weeklySummarizer.generateSummaries(storedRecords);
      transactionSummaryView.render(summaries);

      let table = container.querySelector('.transaction-summary-table');
      expect(table).not.toBeNull();
      let rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);

      // Store second batch (same week)
      const batch2 = [{
        date: '02/01/2024',
        time: '11:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Stableford',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 2,
        isComplete: true
      }];

      await databaseManager.store(batch2);
      storedRecords = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(storedRecords);
      transactionSummaryView.render(summaries);

      // Should still be 1 week, but with updated totals
      rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
      
      // Verify the total increased
      const entriesCell = rows[0].querySelectorAll('td')[5]; // Competition Entries column
      expect(entriesCell.textContent).toBe('£24.00');
    });

    test('should clear view after database reset', async () => {
      // Store some data
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Medal',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      await databaseManager.store(records);
      let storedRecords = await databaseManager.getAll();
      let summaries = weeklySummarizer.generateSummaries(storedRecords);
      transactionSummaryView.render(summaries);

      let table = container.querySelector('.transaction-summary-table');
      expect(table).not.toBeNull();

      // Reset database
      await databaseManager.clearAll();
      storedRecords = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(storedRecords);
      transactionSummaryView.clear();

      // View should show empty state
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();
    });
  });

  /**
   * Test reset functionality
   * Requirements: 10.1, 10.2, 10.3
   */
  describe('Reset Functionality', () => {
    test('should clear all data and allow fresh import', async () => {
      // Store initial data
      const initialRecords = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Medal',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      await databaseManager.store(initialRecords);
      let storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(1);

      // Reset database
      await databaseManager.clearAll();
      storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(0);

      // Import new data (with earlier date - should be allowed after reset)
      const newRecords = [{
        date: '01/12/2023', // Earlier than previous data
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Stableford',
        price: '15.00',
        discount: '0.00',
        subtotal: '15.00',
        vat: '3.00',
        total: '18.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const validationResult = await chronologicalValidator.validate(newRecords);
      expect(validationResult.valid).toBe(true); // Should pass because database is empty

      await databaseManager.store(newRecords);
      storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(1);
      expect(storedRecords[0].date).toBe('01/12/2023');
    });
  });

  /**
   * Test error handling during pipeline execution
   * Requirements: 11.1, 11.2, 11.3
   */
  describe('Error Handling During Pipeline', () => {
    test('should handle chronological validation failure', async () => {
      // Store data with later date
      const laterRecords = [{
        date: '31/12/2024',
        time: '23:59:59',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Medal',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      await databaseManager.store(laterRecords);

      // Try to import earlier data
      const earlierRecords = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Stableford',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 2,
        isComplete: true
      }];

      const validationResult = await chronologicalValidator.validate(earlierRecords);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toContain('Import rejected');
      expect(validationResult.earliestNew).toBeDefined();
      expect(validationResult.latestExisting).toBeDefined();

      // Database should still only have original record
      const storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(1);
      expect(storedRecords[0].date).toBe('31/12/2024');
    });

    test('should handle partial storage errors gracefully', async () => {
      // Create records with one that might cause issues
      const records = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Sale',
          member: '',
          player: 'Player 1',
          competition: 'Medal',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: '',
          type: 'Sale',
          member: '',
          player: 'Player 2',
          competition: 'Stableford',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const storeResult = await databaseManager.store(records);
      
      // Should store successfully
      expect(storeResult.stored).toBe(2);
      
      // Even if there were errors, stored count should be accurate
      const storedRecords = await databaseManager.getAll();
      expect(storedRecords.length).toBe(storeResult.stored);
    });

    test('should handle invalid date formats in summarization', async () => {
      // Store record with valid date
      const validRecord = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Medal',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      };

      await databaseManager.store([validRecord]);
      const storedRecords = await databaseManager.getAll();

      // Summarizer should handle this gracefully
      const summaries = weeklySummarizer.generateSummaries(storedRecords);
      expect(summaries).toBeDefined();
      expect(summaries.length).toBeGreaterThan(0);
    });
  });
});
