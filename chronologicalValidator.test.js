/**
 * Unit tests for Chronological Validator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChronologicalValidator } from './chronologicalValidator.js';
import { DatabaseManager } from './databaseManager.js';
import { parseDateTime } from './dateTimeUtils.js';
import * as fc from 'fast-check';
import 'fake-indexeddb/auto';

describe('ChronologicalValidator', () => {
  let validator;
  let dbManager;

  beforeEach(async () => {
    // Reset IndexedDB
    indexedDB = new IDBFactory();
    
    dbManager = new DatabaseManager();
    await dbManager.initialize();
    validator = new ChronologicalValidator(dbManager);
  });

  describe('validate', () => {
    it('should allow import when database is empty', async () => {
      const newRecords = [
        { date: '15/03/2024', time: '10:00:00', total: '10.00' },
        { date: '16/03/2024', time: '11:00:00', total: '20.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(true);
    });

    it('should allow import when new data is after existing data', async () => {
      // Store existing data
      await dbManager.store([
        { date: '15/03/2024', time: '10:00:00', total: '10.00' }
      ]);

      // Try to import newer data
      const newRecords = [
        { date: '16/03/2024', time: '11:00:00', total: '20.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(true);
    });

    it('should reject import when new data is before existing data', async () => {
      // Store existing data
      await dbManager.store([
        { date: '16/03/2024', time: '11:00:00', total: '20.00' }
      ]);

      // Try to import older data
      const newRecords = [
        { date: '15/03/2024', time: '10:00:00', total: '10.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Import rejected');
      expect(result.earliestNew).toBeDefined();
      expect(result.earliestNew.date).toBe('15/03/2024');
      expect(result.earliestNew.time).toBe('10:00:00');
      expect(result.latestExisting).toBeDefined();
      expect(result.latestExisting.date).toBe('16/03/2024');
      expect(result.latestExisting.time).toBe('11:00:00');
    });

    it('should allow import when earliest new equals latest existing', async () => {
      // Store existing data
      await dbManager.store([
        { date: '15/03/2024', time: '10:00:00', total: '10.00' }
      ]);

      // Try to import data at same timestamp
      const newRecords = [
        { date: '15/03/2024', time: '10:00:00', total: '20.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(true);
    });

    it('should handle empty new records array', async () => {
      const result = await validator.validate([]);
      
      expect(result.valid).toBe(true);
    });

    it('should handle null new records', async () => {
      const result = await validator.validate(null);
      
      expect(result.valid).toBe(true);
    });

    it('should handle records with invalid date formats', async () => {
      const newRecords = [
        { date: 'invalid', time: '10:00:00', total: '10.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No valid date/time found');
    });

    it('should skip records with missing date or time', async () => {
      const newRecords = [
        { date: '', time: '10:00:00', total: '10.00' },
        { date: '15/03/2024', time: '', total: '20.00' },
        { date: '16/03/2024', time: '11:00:00', total: '30.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(true);
    });

    it('should use earliest timestamp from multiple new records', async () => {
      // Store existing data
      await dbManager.store([
        { date: '15/03/2024', time: '10:00:00', total: '10.00' }
      ]);

      // Try to import multiple records where earliest is before existing
      const newRecords = [
        { date: '16/03/2024', time: '11:00:00', total: '20.00' },
        { date: '14/03/2024', time: '09:00:00', total: '30.00' }, // Earliest
        { date: '17/03/2024', time: '12:00:00', total: '40.00' }
      ];

      const result = await validator.validate(newRecords);
      
      expect(result.valid).toBe(false);
      expect(result.earliestNew.date).toBe('14/03/2024');
      expect(result.earliestNew.time).toBe('09:00:00');
    });
  });

  describe('findEarliestTimestamp', () => {
    it('should find earliest timestamp in records', () => {
      const records = [
        { date: '16/03/2024', time: '11:00:00' },
        { date: '15/03/2024', time: '10:00:00' }, // Earliest
        { date: '17/03/2024', time: '12:00:00' }
      ];

      const earliest = validator.findEarliestTimestamp(records);
      
      expect(earliest).toBeDefined();
      expect(earliest.date).toBe('15/03/2024');
      expect(earliest.time).toBe('10:00:00');
    });

    it('should return null for empty array', () => {
      const earliest = validator.findEarliestTimestamp([]);
      
      expect(earliest).toBeNull();
    });

    it('should skip records with invalid dates', () => {
      const records = [
        { date: 'invalid', time: '11:00:00' },
        { date: '15/03/2024', time: '10:00:00' }
      ];

      const earliest = validator.findEarliestTimestamp(records);
      
      expect(earliest).toBeDefined();
      expect(earliest.date).toBe('15/03/2024');
    });

    it('should skip records with missing date or time', () => {
      const records = [
        { date: '', time: '11:00:00' },
        { date: '15/03/2024', time: '' },
        { date: '16/03/2024', time: '10:00:00' }
      ];

      const earliest = validator.findEarliestTimestamp(records);
      
      expect(earliest).toBeDefined();
      expect(earliest.date).toBe('16/03/2024');
    });
  });

  describe('findLatestTimestamp', () => {
    it('should find latest timestamp in records', () => {
      const records = [
        { date: '16/03/2024', time: '11:00:00' },
        { date: '15/03/2024', time: '10:00:00' },
        { date: '17/03/2024', time: '12:00:00' } // Latest
      ];

      const latest = validator.findLatestTimestamp(records);
      
      expect(latest).toBeDefined();
      expect(latest.date).toBe('17/03/2024');
      expect(latest.time).toBe('12:00:00');
    });

    it('should return null for empty array', () => {
      const latest = validator.findLatestTimestamp([]);
      
      expect(latest).toBeNull();
    });

    it('should skip records with invalid dates', () => {
      const records = [
        { date: 'invalid', time: '11:00:00' },
        { date: '15/03/2024', time: '10:00:00' }
      ];

      const latest = validator.findLatestTimestamp(records);
      
      expect(latest).toBeDefined();
      expect(latest.date).toBe('15/03/2024');
    });
  });

  describe('Property-Based Tests', () => {
    // Generator for enhanced records with valid date/time
    const enhancedRecordGen = fc.record({
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }),
      time: fc.integer({ min: 0, max: 23 }).chain(h =>
        fc.integer({ min: 0, max: 59 }).chain(m =>
          fc.integer({ min: 0, max: 59 }).map(s =>
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
          )
        )
      ),
      till: fc.oneof(fc.constant(''), fc.constant('Till 1')),
      type: fc.oneof(
        fc.constant('Topup (Competitions)'),
        fc.constant('Sale'),
        fc.constant('Refund')
      ),
      member: fc.string({ maxLength: 100 }),
      player: fc.string({ maxLength: 100 }),
      competition: fc.string({ maxLength: 100 }),
      price: fc.float({ min: -1000, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
      discount: fc.float({ min: 0, max: 100, noNaN: true }).map(n => n.toFixed(2)),
      subtotal: fc.float({ min: -1000, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
      vat: fc.float({ min: 0, max: 200, noNaN: true }).map(n => n.toFixed(2)),
      total: fc.float({ min: -1200, max: 1200, noNaN: true }).map(n => n.toFixed(2)),
      sourceRowIndex: fc.integer({ min: 0, max: 10000 }),
      isComplete: fc.boolean()
    });

    // Feature: competition-account-management, Property 6: Earliest timestamp identification
    // **Validates: Requirements 3.1**
    it('Property 6: Earliest timestamp identification - finds minimum date/time chronologically', () => {
      fc.assert(
        fc.property(
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 100 }),
          (records) => {
            // Find earliest using the validator method
            const earliest = validator.findEarliestTimestamp(records);
            
            // Verify a result was found
            expect(earliest).not.toBeNull();
            expect(earliest).toBeDefined();
            expect(earliest.date).toBeDefined();
            expect(earliest.time).toBeDefined();
            expect(earliest.timestamp).toBeDefined();

            // Manually verify this is indeed the earliest
            // Parse all timestamps and find the minimum
            let manualEarliest = null;
            for (const record of records) {
              try {
                const timestamp = parseDateTime(record.date, record.time);
                if (manualEarliest === null || timestamp < manualEarliest) {
                  manualEarliest = timestamp;
                }
              } catch (error) {
                // Skip invalid dates
              }
            }

            // The validator's result should match our manual calculation
            expect(earliest.timestamp).toBe(manualEarliest);

            // Verify that no other record has an earlier timestamp
            for (const record of records) {
              try {
                const timestamp = parseDateTime(record.date, record.time);
                expect(timestamp).toBeGreaterThanOrEqual(earliest.timestamp);
              } catch (error) {
                // Skip invalid dates
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: competition-account-management, Property 7: Latest timestamp identification
    // **Validates: Requirements 3.2**
    it('Property 7: Latest timestamp identification - finds maximum date/time chronologically', () => {
      fc.assert(
        fc.property(
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 100 }),
          (records) => {
            // Find latest using the validator method
            const latest = validator.findLatestTimestamp(records);
            
            // Verify a result was found
            expect(latest).not.toBeNull();
            expect(latest).toBeDefined();
            expect(latest.date).toBeDefined();
            expect(latest.time).toBeDefined();
            expect(latest.timestamp).toBeDefined();

            // Manually verify this is indeed the latest
            // Parse all timestamps and find the maximum
            let manualLatest = null;
            for (const record of records) {
              try {
                const timestamp = parseDateTime(record.date, record.time);
                if (manualLatest === null || timestamp > manualLatest) {
                  manualLatest = timestamp;
                }
              } catch (error) {
                // Skip invalid dates
              }
            }

            // The validator's result should match our manual calculation
            expect(latest.timestamp).toBe(manualLatest);

            // Verify that no other record has a later timestamp
            for (const record of records) {
              try {
                const timestamp = parseDateTime(record.date, record.time);
                expect(timestamp).toBeLessThanOrEqual(latest.timestamp);
              } catch (error) {
                // Skip invalid dates
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: competition-account-management, Property 8: Chronological validation rejects out-of-order imports
    // **Validates: Requirements 3.3**
    it('Property 8: Chronological validation rejects out-of-order imports', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          async (existingRecords, newRecords) => {
            // Reset database for each test
            await dbManager.clearAll();

            // Store existing records
            await dbManager.store(existingRecords);

            // Get latest timestamp from database (what validator will use)
            const latestExistingFromDB = await dbManager.getLatestTimestamp();
            
            // Get earliest timestamp from new records
            const earliestNew = validator.findEarliestTimestamp(newRecords);

            // Validate the new records
            const result = await validator.validate(newRecords);

            // Property: validation should reject if and only if earliestNew < latestExisting
            if (earliestNew.timestamp < latestExistingFromDB.timestamp) {
              // Should reject
              expect(result.valid).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.error).toContain('Import rejected');
              expect(result.earliestNew).toBeDefined();
              expect(result.earliestNew.timestamp).toBe(earliestNew.timestamp);
              expect(result.latestExisting).toBeDefined();
              expect(result.latestExisting.timestamp).toBe(latestExistingFromDB.timestamp);
            } else {
              // Should accept (earliestNew >= latestExisting)
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: competition-account-management, Property 9: Failed validation prevents storage
    // **Validates: Requirements 3.4**
    it('Property 9: Failed validation prevents storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          async (existingRecords, newRecords) => {
            // Reset database for each test
            await dbManager.clearAll();

            // Store existing records
            await dbManager.store(existingRecords);

            // Get database state before validation
            const recordsBeforeValidation = await dbManager.getAll();
            const countBefore = recordsBeforeValidation.length;

            // Validate the new records
            const result = await validator.validate(newRecords);

            // Get database state after validation
            const recordsAfterValidation = await dbManager.getAll();
            const countAfter = recordsAfterValidation.length;

            // Property: If validation fails, database state should be unchanged
            if (!result.valid) {
              // Database should have the same number of records
              expect(countAfter).toBe(countBefore);
              
              // Database should contain exactly the same records
              expect(recordsAfterValidation).toEqual(recordsBeforeValidation);
            }
            
            // Note: This test only validates that validation itself doesn't modify the database.
            // The actual storage prevention is enforced by the application logic that checks
            // the validation result before calling store().
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: competition-account-management, Property 22: Validation errors include context
    // **Validates: Requirements 11.3**
    it('Property 22: Validation errors include context - error includes both timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          fc.array(enhancedRecordGen, { minLength: 1, maxLength: 50 }),
          async (existingRecords, newRecords) => {
            // Reset database for each test
            await dbManager.clearAll();

            // Store existing records
            await dbManager.store(existingRecords);

            // Get the actual latest timestamp from database
            const latestExistingFromDB = await dbManager.getLatestTimestamp();
            
            // Get the actual earliest timestamp from new records
            const earliestNew = validator.findEarliestTimestamp(newRecords);

            // Validate the new records
            const result = await validator.validate(newRecords);

            // Property: For any chronological validation failure, the error should include context
            if (!result.valid && earliestNew && latestExistingFromDB) {
              // Check if this is a chronological validation failure (not other types of errors)
              if (earliestNew.timestamp < latestExistingFromDB.timestamp) {
                // Error message should be defined and non-empty
                expect(result.error).toBeDefined();
                expect(typeof result.error).toBe('string');
                expect(result.error.length).toBeGreaterThan(0);

                // Error should include both timestamps in context
                expect(result.earliestNew).toBeDefined();
                expect(result.earliestNew).not.toBeNull();
                expect(result.earliestNew.date).toBeDefined();
                expect(result.earliestNew.time).toBeDefined();
                expect(result.earliestNew.timestamp).toBeDefined();
                
                expect(result.latestExisting).toBeDefined();
                expect(result.latestExisting).not.toBeNull();
                expect(result.latestExisting.date).toBeDefined();
                expect(result.latestExisting.time).toBeDefined();
                expect(result.latestExisting.timestamp).toBeDefined();

                // Verify the timestamps match what we expect
                expect(result.earliestNew.date).toBe(earliestNew.date);
                expect(result.earliestNew.time).toBe(earliestNew.time);
                expect(result.earliestNew.timestamp).toBe(earliestNew.timestamp);
                
                expect(result.latestExisting.date).toBe(latestExistingFromDB.date);
                expect(result.latestExisting.time).toBe(latestExistingFromDB.time);
                expect(result.latestExisting.timestamp).toBe(latestExistingFromDB.timestamp);

                // Error message should contain information about both timestamps
                // Check that the error message includes date/time information
                expect(result.error).toContain('Import rejected');
                
                // The error message should reference the timestamps in some way
                // (either directly or through the formatDateTime method)
                const formattedEarliest = validator.formatDateTime(earliestNew);
                const formattedLatest = validator.formatDateTime(latestExistingFromDB);
                
                // At minimum, the error should contain the word "before" or "after" 
                // indicating temporal relationship
                expect(result.error.toLowerCase()).toMatch(/before|after|earlier|later/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
