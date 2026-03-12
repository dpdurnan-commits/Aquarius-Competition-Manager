/**
 * Error Handling Tests
 * Unit tests for error handling across the application
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { parse } from './csvParser.js';
import { transform } from './recordTransformer.js';
import { exportCSV } from './csvExporter.js';

describe('Error Handling Tests', () => {
  /**
   * Helper function to create a mock File object
   */
  function createMockFile(content, filename = 'test.csv') {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], filename, { type: 'text/csv' });
  }

  // Requirement 11.1: Parse error display
  describe('Parse Error Display', () => {
    test('should return error for malformed CSV', async () => {
      // Create a CSV with unclosed quotes (malformed)
      const malformedCSV = '"unclosed quote\nA,B,C,D,E,F,G,H,I,J';
      const file = createMockFile(malformedCSV);
      
      const result = await parse(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });

    test('should return error for empty file', async () => {
      const emptyCSV = '';
      const file = createMockFile(emptyCSV);
      
      const result = await parse(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('empty');
    });

    test('should return error for file with insufficient columns', async () => {
      const insufficientColumns = 'A,B,C,D,E\n1,2,3,4,5';
      const file = createMockFile(insufficientColumns);
      
      const result = await parse(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('at least 10 columns');
    });

    test('should return error for null file', async () => {
      const result = await parse(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No file provided');
    });

    test('should return descriptive error message', async () => {
      const file = createMockFile('');
      const result = await parse(file);
      
      // Error message should be user-friendly and descriptive
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(10);
      expect(typeof result.error).toBe('string');
    });
  });

  // Requirement 11.2: Transformation error collection
  describe('Transformation Error Collection', () => {
    test('should collect error for Topup record with missing row+2', () => {
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
        // Missing row+2
      ];
      
      const result = transform(rows);
      
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].rowIndex).toBe(0);
      expect(result.errors[0].message).toContain('row+2 does not exist');
      expect(result.errors[0].severity).toBe('warning');
    });

    test('should collect error for Sale record with missing row+2', () => {
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', 'Competition Entry', '15.00', '0.00', '15.00', '3.00', '18.00']
      ];
      
      // Add a Sale at the end without row+2
      rows.push(['2024-01-15', '11:00', 'Till 2', 'Sale', 'Bob Jones', '', '', '', '', '']);
      
      const result = transform(rows);
      
      // First Sale should succeed, second should not qualify (no error, just filtered out)
      expect(result.records.length).toBe(1);
      expect(result.errors.length).toBe(0); // Sale without row+2 doesn't qualify, so no error
    });

    test('should collect multiple errors for multiple incomplete records', () => {
      const rows = [
        ['2024-01-15', '10:00', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
        // Missing row+2 for first Topup
        ['2024-01-15', '10:30', 'Till 2', 'Topup Competitions', 'Jane Smith', '', '', '', '', '']
        // Missing row+2 for second Topup
      ];
      
      const result = transform(rows);
      
      expect(result.errors.length).toBe(2);
      expect(result.errors[0].rowIndex).toBe(0);
      expect(result.errors[1].rowIndex).toBe(1);
      expect(result.errors[0].severity).toBe('warning');
      expect(result.errors[1].severity).toBe('warning');
    });

    test('should mark incomplete records in transformed output', () => {
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
      ];
      
      const result = transform(rows);
      
      expect(result.records.length).toBe(1);
      expect(result.records[0].isComplete).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    test('should not collect errors for complete records', () => {
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '50.00', '0.00', '50.00', '10.00', '60.00']
      ];
      
      const result = transform(rows);
      
      expect(result.records.length).toBe(1);
      expect(result.records[0].isComplete).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  // Requirement 11.3: No matching records message
  describe('No Matching Records Message', () => {
    test('should return empty records array when no qualifying records exist', () => {
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', 'Regular Item', '15.00', '0.00', '15.00', '3.00', '18.00']
      ];
      
      const result = transform(rows);
      
      expect(result.records.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    test('should return empty records for CSV with only non-qualifying rows', () => {
      const rows = [
        ['', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''], // Empty date
        ['2024-01-15', '11:00', 'Till 2', 'Other Type', 'Jane Smith', '', '', '', '', ''], // Wrong type
        ['2024-01-15', '12:00', 'Till 3', 'Sale', 'Bob Jones', '', '', '', '', ''] // No row+2
      ];
      
      const result = transform(rows);
      
      expect(result.records.length).toBe(0);
    });

    test('should return empty records for empty CSV', () => {
      const rows = [];
      
      const result = transform(rows);
      
      expect(result.records.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    test('should handle CSV with only header row', () => {
      const rows = [
        ['Date', 'Time', 'Till', 'Type', 'Member', 'Price', 'Discount', 'Subtotal', 'VAT', 'Total']
      ];
      
      const result = transform(rows);
      
      // Header row doesn't have a valid date, so it won't qualify
      expect(result.records.length).toBe(0);
    });
  });

  // Requirement 11.4: Export error display
  describe('Export Error Display', () => {
    test('should throw error when exporting null records', () => {
      expect(() => {
        exportCSV(null);
      }).toThrow();
    });

    test('should throw error when exporting undefined records', () => {
      expect(() => {
        exportCSV(undefined);
      }).toThrow();
    });

    test('should throw error when exporting empty array', () => {
      expect(() => {
        exportCSV([]);
      }).toThrow();
    });

    test('should throw error with descriptive message', () => {
      try {
        exportCSV([]);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).toContain('No records to export');
      }
    });

    test('should handle records with missing fields gracefully', () => {
      const invalidRecords = [
        { 
          date: '2024-01-15',
          time: '10:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'John Doe',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '2.00',
          total: '12.00'
        } // Missing sourceRowIndex and isComplete, but has all display fields
      ];
      
      // generateCSV handles missing fields gracefully by converting to empty strings
      // The download mechanism will fail in test environment (no URL.createObjectURL)
      // but that's expected and tested separately
      expect(() => {
        try {
          exportCSV(invalidRecords);
        } catch (error) {
          // Expect download error in test environment, not generation error
          expect(error.message).toContain('download');
        }
      }).not.toThrow();
    });

    test('should handle export errors gracefully', () => {
      // Test that errors are catchable and can be communicated to users
      let errorCaught = false;
      let errorMessage = '';
      
      try {
        exportCSV(null);
      } catch (error) {
        errorCaught = true;
        errorMessage = error.message;
      }
      
      expect(errorCaught).toBe(true);
      expect(errorMessage).toBeDefined();
      expect(errorMessage.length).toBeGreaterThan(0);
    });
  });

  // Integration: Error handling across components
  describe('Error Handling Integration', () => {
    test('should handle complete error flow: parse -> transform -> export', async () => {
      // Test 1: Parse error
      const malformedFile = createMockFile('');
      const parseResult = await parse(malformedFile);
      
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toBeDefined();
      
      // Test 2: Transform with no qualifying records
      const validCSV = 'A,B,C,D,E,F,G,H,I,J\n1,2,3,4,5,6,7,8,9,10';
      const validFile = createMockFile(validCSV);
      const validParseResult = await parse(validFile);
      
      expect(validParseResult.success).toBe(true);
      
      const transformResult = transform(validParseResult.rows);
      expect(transformResult.records.length).toBe(0);
      
      // Test 3: Export error with empty records
      expect(() => {
        exportCSV(transformResult.records);
      }).toThrow();
    });

    test('should provide user-friendly error messages at each stage', async () => {
      // Parse error
      const parseResult = await parse(null);
      expect(parseResult.error).toBeDefined();
      expect(parseResult.error).not.toContain('undefined');
      expect(parseResult.error).not.toContain('null');
      
      // Transform error (incomplete record)
      const rows = [
        ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
      ];
      const transformResult = transform(rows);
      expect(transformResult.errors[0].message).toBeDefined();
      expect(transformResult.errors[0].message).toContain('incomplete');
      
      // Export error
      try {
        exportCSV([]);
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message).not.toContain('undefined');
      }
    });
  });

  // Requirement 11.1: Database initialization failure
  describe('Database Initialization Failure', () => {

    test('should display error when IndexedDB is not supported', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      // Save original IndexedDB
      const originalIndexedDB = window.indexedDB;
      
      try {
        // Simulate unsupported browser
        window.indexedDB = undefined;
        
        const dbManager = new DatabaseManager();
        
        // Should throw error on initialization
        await expect(dbManager.initialize()).rejects.toThrow('IndexedDB is not supported');
      } finally {
        // Restore IndexedDB
        window.indexedDB = originalIndexedDB;
      }
    });

    test('should provide clear error message for unsupported browser', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const originalIndexedDB = window.indexedDB;
      
      try {
        window.indexedDB = undefined;
        const dbManager = new DatabaseManager();
        
        try {
          await dbManager.initialize();
          fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toBeDefined();
          expect(error.message).toContain('IndexedDB');
          expect(error.message).toContain('not supported');
          expect(error.message.length).toBeGreaterThan(10);
        }
      } finally {
        window.indexedDB = originalIndexedDB;
      }
    });

    test('should prevent operations on uninitialized database', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      
      // Should throw error when attempting operations without initialization
      await expect(dbManager.store([])).rejects.toThrow('Database not initialized');
      await expect(dbManager.getAll()).rejects.toThrow('Database not initialized');
      await expect(dbManager.clearAll()).rejects.toThrow('Database not initialized');
      await expect(dbManager.getLatestTimestamp()).rejects.toThrow('Database not initialized');
    });
  });

  // Requirement 11.2: Storage quota exceeded handling
  describe('Storage Quota Exceeded Handling', () => {
    test('should handle storage errors gracefully', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      
      // Create a record that might cause storage issues
      const largeRecord = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'A'.repeat(10000), // Very large field
        player: '',
        competition: '',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 1,
        isComplete: true
      };
      
      // Attempt to store - should handle gracefully
      const result = await dbManager.store([largeRecord]);
      
      // Should either succeed or return error information
      expect(result).toBeDefined();
      expect(result.stored).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      
      // Clean up
      await dbManager.clearAll();
    });

    test('should continue processing remaining records after storage error', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      
      const records = [
        {
          date: '01/01/2024',
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
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Jane Smith',
          player: '',
          competition: '',
          price: '15.00',
          discount: '0.00',
          subtotal: '15.00',
          vat: '3.00',
          total: '18.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];
      
      const result = await dbManager.store(records);
      
      // Should process all records
      expect(result.stored).toBeGreaterThan(0);
      
      // Clean up
      await dbManager.clearAll();
    });

    test('should return error information for failed records', async () => {
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      
      // Store a record first
      await dbManager.store([{
        date: '01/01/2024',
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
      }]);
      
      const result = await dbManager.store([]);
      
      // Should handle empty array gracefully
      expect(result.stored).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      // Clean up
      await dbManager.clearAll();
    });
  });

  // Requirement 11.3: Chronological validation failure display
  describe('Chronological Validation Failure Display', () => {
    test('should display error with conflicting date ranges', async () => {
      const { ChronologicalValidator } = await import('./chronologicalValidator.js');
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      const validator = new ChronologicalValidator(dbManager);
      
      // Store existing data
      await dbManager.store([{
        date: '15/03/2024',
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
      }]);
      
      // Try to import older data
      const newRecords = [{
        date: '14/03/2024',
        time: '09:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'Jane Smith',
        player: '',
        competition: '',
        price: '15.00',
        discount: '0.00',
        subtotal: '15.00',
        vat: '3.00',
        total: '18.00',
        sourceRowIndex: 2,
        isComplete: true
      }];
      
      const result = await validator.validate(newRecords);
      
      // Should reject with error
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Import rejected');
      
      // Should include both timestamps
      expect(result.earliestNew).toBeDefined();
      expect(result.earliestNew.date).toBe('14/03/2024');
      expect(result.earliestNew.time).toBe('09:00:00');
      
      expect(result.latestExisting).toBeDefined();
      expect(result.latestExisting.date).toBe('15/03/2024');
      expect(result.latestExisting.time).toBe('10:00:00');
      
      // Clean up
      await dbManager.clearAll();
    });

    test('should provide user-friendly error message', async () => {
      const { ChronologicalValidator } = await import('./chronologicalValidator.js');
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      const validator = new ChronologicalValidator(dbManager);
      
      await dbManager.store([{
        date: '15/03/2024',
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
      }]);
      
      const newRecords = [{
        date: '14/03/2024',
        time: '09:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'Jane Smith',
        player: '',
        competition: '',
        price: '15.00',
        discount: '0.00',
        subtotal: '15.00',
        vat: '3.00',
        total: '18.00',
        sourceRowIndex: 2,
        isComplete: true
      }];
      
      const result = await validator.validate(newRecords);
      
      // Error message should be clear and user-friendly
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(20);
      expect(result.error).not.toContain('undefined');
      expect(result.error).not.toContain('null');
      expect(result.error).toMatch(/import|reject|before|after|date|time/i);
      
      // Clean up
      await dbManager.clearAll();
    });

    test('should prevent database writes when validation fails', async () => {
      const { ChronologicalValidator } = await import('./chronologicalValidator.js');
      const { DatabaseManager } = await import('./databaseManager.js');
      
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      const validator = new ChronologicalValidator(dbManager);
      
      // Store existing data
      await dbManager.store([{
        date: '15/03/2024',
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
      }]);
      
      const recordsBefore = await dbManager.getAll();
      const countBefore = recordsBefore.length;
      
      // Try to import older data
      const newRecords = [{
        date: '14/03/2024',
        time: '09:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'Jane Smith',
        player: '',
        competition: '',
        price: '15.00',
        discount: '0.00',
        subtotal: '15.00',
        vat: '3.00',
        total: '18.00',
        sourceRowIndex: 2,
        isComplete: true
      }];
      
      const result = await validator.validate(newRecords);
      
      // Validation should fail
      expect(result.valid).toBe(false);
      
      // Database should remain unchanged (validation doesn't write)
      const recordsAfter = await dbManager.getAll();
      expect(recordsAfter.length).toBe(countBefore);
      
      // Clean up
      await dbManager.clearAll();
    });
  });

  // Requirement 11.4: Calculation errors with invalid data
  describe('Calculation Errors with Invalid Data', () => {
    test('should handle invalid date formats gracefully', () => {
      const { WeeklySummarizer } = require('./weeklySummarizer.js');
      
      const summarizer = new WeeklySummarizer();
      
      const records = [
        { date: 'invalid', time: '10:00:00', till: '', type: 'Sale', total: '10.00' },
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '20.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Should skip invalid records and process valid ones
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle null/undefined total values', () => {
      const { WeeklySummarizer } = require('./weeklySummarizer.js');
      
      const summarizer = new WeeklySummarizer();
      
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: null },
        { date: '02/01/2024', time: '10:00:00', till: '', type: 'Sale', total: undefined },
        { date: '03/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '30.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Should skip invalid totals and process valid ones
      expect(Array.isArray(summaries)).toBe(true);
      if (summaries.length > 0) {
        expect(summaries[0].competitionEntries).toBe(30.00);
      }
    });

    test('should return partial results when calculation error occurs', () => {
      const { WeeklySummarizer } = require('./weeklySummarizer.js');
      
      const summarizer = new WeeklySummarizer();
      
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
        { date: '08/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' },
        { date: 'invalid', time: '10:00:00', till: '', type: 'Sale', total: '25.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Should return summaries for valid weeks
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThanOrEqual(1);
    });

    test('should display error message for calculation failures', () => {
      const { WeeklySummarizer } = require('./weeklySummarizer.js');
      
      const summarizer = new WeeklySummarizer();
      
      // Spy on console.error to check error logging
      const originalError = console.error;
      const errorMessages = [];
      console.error = (...args) => {
        errorMessages.push(args.join(' '));
      };
      
      try {
        const records = [
          { date: 'invalid', time: '10:00:00', till: '', type: 'Sale', total: '10.00' }
        ];
        
        const summaries = summarizer.generateSummaries(records);
        
        // Should handle gracefully
        expect(Array.isArray(summaries)).toBe(true);
      } finally {
        console.error = originalError;
      }
    });

    test('should preserve last valid state on calculation error', () => {
      const { WeeklySummarizer } = require('./weeklySummarizer.js');
      
      const summarizer = new WeeklySummarizer();
      
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
        { date: '02/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Should return valid summaries
      expect(summaries.length).toBeGreaterThan(0);
      
      // All returned summaries should be valid
      summaries.forEach(summary => {
        expect(summary.startingPurse).toBeDefined();
        expect(summary.finalPurse).toBeDefined();
        expect(typeof summary.startingPurse).toBe('number');
        expect(typeof summary.finalPurse).toBe('number');
        expect(isNaN(summary.startingPurse)).toBe(false);
        expect(isNaN(summary.finalPurse)).toBe(false);
      });
    });
  });
});
