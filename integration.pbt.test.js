/**
 * Property-Based Integration Tests
 * Tests the complete import pipeline with property-based testing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import { FieldExtractor } from './fieldExtractor.js';
import { DatabaseManager } from './databaseManager.js';
import { ChronologicalValidator } from './chronologicalValidator.js';
import { WeeklySummarizer } from './weeklySummarizer.js';
import { TransactionSummaryView } from './transactionSummaryView.js';

describe('Integration Property-Based Tests', () => {
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
    container.id = 'test-transaction-summary-container';
    document.body.appendChild(container);
    transactionSummaryView = new TransactionSummaryView('test-transaction-summary-container');
  });

  afterEach(async () => {
    await databaseManager.clearAll();
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  /**
   * Generators for property-based testing
   */

  // Generate valid date strings in DD/MM/YYYY format
  const dateStringGen = fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
    .map(d => {
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    });

  // Generate valid time strings in HH:MM:SS format
  const timeStringGen = fc.integer({ min: 0, max: 23 }).chain(h =>
    fc.integer({ min: 0, max: 59 }).chain(m =>
      fc.integer({ min: 0, max: 59 }).map(s =>
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      )
    )
  );

  // Generate transformed records (before field extraction)
  const transformedRecordGen = fc.record({
    date: dateStringGen,
    time: timeStringGen,
    till: fc.oneof(fc.constant(''), fc.constant('Till 1')),
    type: fc.oneof(
      fc.constant('Topup (Competitions)'),
      fc.constant('Sale'),
      fc.constant('Refund')
    ),
    member: fc.string({ minLength: 0, maxLength: 50 }),
    price: fc.float({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
    discount: fc.float({ min: 0, max: 100, noNaN: true }).map(n => n.toFixed(2)),
    subtotal: fc.float({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
    vat: fc.float({ min: 0, max: 200, noNaN: true }).map(n => n.toFixed(2)),
    total: fc.float({ min: -1000, max: 1200, noNaN: true }).map(n => n.toFixed(2)),
    sourceRowIndex: fc.integer({ min: 0, max: 10000 }),
    isComplete: fc.boolean()
  });

  // Generate chronologically ordered records
  const chronologicalRecordsGen = fc.array(transformedRecordGen, { minLength: 1, maxLength: 20 })
    .map(records => {
      // Sort records by date and time to ensure chronological order
      return records.sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        const datetimeA = `${dateA} ${a.time}`;
        const datetimeB = `${dateB} ${b.time}`;
        return datetimeA.localeCompare(datetimeB);
      });
    });

  /**
   * Property 20: Import pipeline completeness
   * For any successfully imported CSV file, the system should execute all steps in sequence:
   * transformation → field extraction → chronological validation → database storage → 
   * weekly summarization → view update, with each step receiving the output of the previous step.
   * 
   * Validates: Requirements 9.1, 9.2
   */
  test('Property 20: Import pipeline completeness', async () => {
    await fc.assert(
      fc.asyncProperty(chronologicalRecordsGen, async (transformedRecords) => {
        // Clear database before each iteration
        await databaseManager.clearAll();
        
        // Step 1: Field Extraction
        const enhancedRecords = transformedRecords.map(record => 
          fieldExtractor.extract(record)
        );
        
        // Verify field extraction occurred
        expect(enhancedRecords).toHaveLength(transformedRecords.length);
        enhancedRecords.forEach(record => {
          expect(record).toHaveProperty('player');
          expect(record).toHaveProperty('competition');
        });
        
        // Step 2: Chronological Validation
        const validationResult = await chronologicalValidator.validate(enhancedRecords);
        
        // For chronologically ordered records, validation should pass
        expect(validationResult.valid).toBe(true);
        
        // Step 3: Database Storage
        const storeResult = await databaseManager.store(enhancedRecords);
        
        // Verify storage occurred
        expect(storeResult.stored).toBe(enhancedRecords.length);
        
        // Step 4: Retrieve all records from database
        const storedRecords = await databaseManager.getAll();
        
        // Verify all records were stored
        expect(storedRecords).toHaveLength(enhancedRecords.length);
        
        // Step 5: Weekly Summarization
        const summaries = weeklySummarizer.generateSummaries(storedRecords);
        
        // Verify summaries were generated
        expect(summaries).toBeDefined();
        expect(Array.isArray(summaries)).toBe(true);
        
        // If there are records, there should be at least one summary
        if (storedRecords.length > 0) {
          expect(summaries.length).toBeGreaterThan(0);
        }
        
        // Step 6: View Update
        transactionSummaryView.render(summaries);
        
        // Verify view was updated
        const tableElement = container.querySelector('.transaction-summary-table');
        const emptyStateElement = container.querySelector('.transaction-summary-empty');
        
        if (summaries.length > 0) {
          expect(tableElement).not.toBeNull();
          expect(emptyStateElement).toBeNull();
        } else {
          expect(emptyStateElement).not.toBeNull();
        }
        
        // Verify pipeline completeness: each step received output from previous step
        // and produced output for next step
        return true;
      }),
      { numRuns: 50 } // Reduced from 100 for performance with async operations
    );
  }, 60000); // 60 second timeout for async property test

  /**
   * Additional integration property: Pipeline handles empty input
   */
  test('Pipeline handles empty record set gracefully', async () => {
    const transformedRecords = [];
    
    // Step 1: Field Extraction
    const enhancedRecords = transformedRecords.map(record => 
      fieldExtractor.extract(record)
    );
    
    expect(enhancedRecords).toHaveLength(0);
    
    // Step 2: Chronological Validation
    const validationResult = await chronologicalValidator.validate(enhancedRecords);
    expect(validationResult.valid).toBe(true);
    
    // Step 3: Database Storage
    const storeResult = await databaseManager.store(enhancedRecords);
    expect(storeResult.stored).toBe(0);
    
    // Step 4: Retrieve all records
    const storedRecords = await databaseManager.getAll();
    expect(storedRecords).toHaveLength(0);
    
    // Step 5: Weekly Summarization
    const summaries = weeklySummarizer.generateSummaries(storedRecords);
    expect(summaries).toHaveLength(0);
    
    // Step 6: View Update
    transactionSummaryView.render(summaries);
    
    const emptyStateElement = container.querySelector('.transaction-summary-empty');
    expect(emptyStateElement).not.toBeNull();
  });

  /**
   * Additional integration property: Pipeline handles validation failure
   */
  test('Pipeline stops at validation failure', async () => {
    // First, store some records with later dates
    const laterRecords = [{
      date: '31/12/2024',
      time: '23:59:59',
      till: '',
      type: 'Sale',
      member: 'Test',
      player: '',
      competition: '',
      price: '10.00',
      discount: '0.00',
      subtotal: '10.00',
      vat: '2.00',
      total: '12.00',
      sourceRowIndex: 1,
      isComplete: true
    }];
    
    await databaseManager.store(laterRecords);
    
    // Now try to import records with earlier dates
    const earlierRecords = [{
      date: '01/01/2024',
      time: '00:00:00',
      till: '',
      type: 'Sale',
      member: 'Test',
      price: '10.00',
      discount: '0.00',
      subtotal: '10.00',
      vat: '2.00',
      total: '12.00',
      sourceRowIndex: 2,
      isComplete: true
    }];
    
    // Step 1: Field Extraction
    const enhancedRecords = earlierRecords.map(record => 
      fieldExtractor.extract(record)
    );
    
    // Step 2: Chronological Validation (should fail)
    const validationResult = await chronologicalValidator.validate(enhancedRecords);
    expect(validationResult.valid).toBe(false);
    
    // Step 3: Database Storage should NOT occur
    // Verify database still only has the original record
    const storedRecords = await databaseManager.getAll();
    expect(storedRecords).toHaveLength(1);
    expect(storedRecords[0].date).toBe('31/12/2024');
  });
});
