/**
 * Property-Based Tests for CompetitionDetector
 * Tests competition detection correctness using fast-check
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { CompetitionDetector } from './competitionDetector.js';

describe('CompetitionDetector - Property-Based Tests', () => {
  describe('Property 1: Competition Name Extraction from Sales and Refunds', () => {
    /**
     * **Validates: Requirements 1.1, 1.5**
     * 
     * For any collection of transaction records, extracting competition names should return
     * only unique, non-empty competition names from records where type is "Sale" or "Refund"
     */
    
    let detector;

    beforeEach(() => {
      const mockApiClient = {
        getAllCompetitions: jest.fn()
      };
      detector = new CompetitionDetector(mockApiClient);
    });

    // Generator for transaction records
    const transactionRecordArbitrary = () => fc.record({
      date: fc.date().map(d => d.toISOString().split('T')[0]),
      time: fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
        .map(([h, m]) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`),
      till: fc.constantFrom('Till 1', 'Till 2', 'Till 3'),
      type: fc.oneof(
        fc.constant('Sale'),
        fc.constant('Refund'),
        fc.constant('Topup')
      ),
      member: fc.string({ minLength: 0, maxLength: 50 }),
      player: fc.string({ minLength: 0, maxLength: 50 }),
      competition: fc.oneof(
        fc.constant(''),
        fc.constant(null),
        fc.constant('   '),
        fc.string({ minLength: 1, maxLength: 50 })
      ),
      total: fc.float({ min: -100, max: 100 }).map(n => n.toFixed(2)),
      sourceRowIndex: fc.integer({ min: 0, max: 1000 }),
      isComplete: fc.boolean()
    });

    test('should extract only unique competition names from Sale and Refund records', () => {
      // Feature: auto-create-competitions-from-transactions, Property 1: Competition Name Extraction from Sales and Refunds
      fc.assert(
        fc.property(
          fc.array(transactionRecordArbitrary(), { minLength: 0, maxLength: 50 }),
          (records) => {
            const extracted = detector.extractCompetitionNames(records);

            // Calculate expected names: only from Sale/Refund with non-empty competition
            const validTypes = ['Sale', 'Refund'];
            const expectedNames = new Set();
            
            for (const record of records) {
              if (validTypes.includes(record.type) && 
                  record.competition && 
                  record.competition.trim() !== '') {
                expectedNames.add(record.competition.trim());
              }
            }

            // Verify extracted names match expected
            expect(new Set(extracted)).toEqual(expectedNames);
            
            // Verify no duplicates in result
            expect(extracted.length).toBe(new Set(extracted).size);
            
            // Verify all extracted names are non-empty
            extracted.forEach(name => {
              expect(name).toBeTruthy();
              expect(name.trim()).toBe(name);
              expect(name.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should exclude Topup records from extraction', () => {
      fc.assert(
        fc.property(
          fc.array(transactionRecordArbitrary(), { minLength: 1, maxLength: 20 }),
          (records) => {
            // Force all records to be Topup with valid competition names
            const topupRecords = records.map(r => ({
              ...r,
              type: 'Topup',
              competition: 'Test Competition'
            }));

            const extracted = detector.extractCompetitionNames(topupRecords);

            // Should return empty array since no Sale/Refund records
            expect(extracted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should exclude records with null or empty competition fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (count) => {
            // Create records with empty/null competitions
            const records = Array.from({ length: count }, (_, i) => ({
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: i % 2 === 0 ? 'Sale' : 'Refund',
              member: 'Member',
              player: 'Player',
              competition: i % 3 === 0 ? '' : (i % 3 === 1 ? null : '   '),
              total: '10.00',
              sourceRowIndex: i,
              isComplete: true
            }));

            const extracted = detector.extractCompetitionNames(records);

            // Should return empty array since all competitions are empty/null
            expect(extracted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should deduplicate competition names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.integer({ min: 2, max: 10 }),
          (competitionName, duplicateCount) => {
            // Create multiple records with same competition name
            const records = Array.from({ length: duplicateCount }, (_, i) => ({
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: i % 2 === 0 ? 'Sale' : 'Refund',
              member: 'Member',
              player: 'Player',
              competition: competitionName,
              total: '10.00',
              sourceRowIndex: i,
              isComplete: true
            }));

            const extracted = detector.extractCompetitionNames(records);

            // Should return exactly one instance of the competition name if non-empty after trim
            const trimmedName = competitionName.trim();
            if (trimmedName.length > 0) {
              expect(extracted).toEqual([trimmedName]);
              expect(extracted.length).toBe(1);
            } else {
              // If name is empty after trim, should return empty array
              expect(extracted).toEqual([]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should trim whitespace from competition names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (baseName, leadingSpaces, trailingSpaces) => {
            const paddedName = ' '.repeat(leadingSpaces) + baseName + ' '.repeat(trailingSpaces);
            
            const records = [{
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Member',
              player: 'Player',
              competition: paddedName,
              total: '10.00',
              sourceRowIndex: 0,
              isComplete: true
            }];

            const extracted = detector.extractCompetitionNames(records);

            // Should return trimmed name if base name is not empty after trimming
            if (baseName.trim().length > 0) {
              expect(extracted).toEqual([baseName.trim()]);
            } else {
              expect(extracted).toEqual([]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: New Competition Detection', () => {
    /**
     * **Validates: Requirements 1.2, 1.3**
     * 
     * For any set of extracted competition names and any database state, the detector
     * should return exactly those competition names that do not exist in the database
     */

    test('should return only competition names not in database', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 2: New Competition Detection
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
          async (extractedNames, existingNames) => {
            // Create mock API client that returns existing competitions
            const mockApiClient = {
              getAllCompetitions: jest.fn().mockResolvedValue(
                existingNames.map((name, i) => ({
                  id: i + 1,
                  name: name,
                  date: '2024-01-01',
                  type: 'singles',
                  seasonId: 1
                }))
              )
            };

            const detector = new CompetitionDetector(mockApiClient);

            // Create records with extracted names
            const records = extractedNames.map((name, i) => ({
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: i % 2 === 0 ? 'Sale' : 'Refund',
              member: 'Member',
              player: 'Player',
              competition: name,
              total: '10.00',
              sourceRowIndex: i,
              isComplete: true
            }));

            const newCompetitions = await detector.detectNewCompetitions(records);

            // Calculate expected new competitions
            const existingSet = new Set(existingNames.map(n => n.trim()));
            const extractedSet = new Set(extractedNames.map(n => n.trim()).filter(n => n.length > 0));
            const expectedNew = Array.from(extractedSet).filter(name => !existingSet.has(name));

            // Verify result matches expected
            expect(new Set(newCompetitions)).toEqual(new Set(expectedNew));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return empty array when all competitions exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          async (competitionNames) => {
            // Make all competitions exist in database
            const mockApiClient = {
              getAllCompetitions: jest.fn().mockResolvedValue(
                competitionNames.map((name, i) => ({
                  id: i + 1,
                  name: name,
                  date: '2024-01-01',
                  type: 'singles',
                  seasonId: 1
                }))
              )
            };

            const detector = new CompetitionDetector(mockApiClient);

            // Create records with same competition names
            const records = competitionNames.map((name, i) => ({
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Member',
              player: 'Player',
              competition: name,
              total: '10.00',
              sourceRowIndex: i,
              isComplete: true
            }));

            const newCompetitions = await detector.detectNewCompetitions(records);

            // Should return empty array
            expect(newCompetitions).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return all names when database is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          async (competitionNames) => {
            // Empty database
            const mockApiClient = {
              getAllCompetitions: jest.fn().mockResolvedValue([])
            };

            const detector = new CompetitionDetector(mockApiClient);

            // Create records with competition names
            const records = competitionNames.map((name, i) => ({
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Member',
              player: 'Player',
              competition: name,
              total: '10.00',
              sourceRowIndex: i,
              isComplete: true
            }));

            const newCompetitions = await detector.detectNewCompetitions(records);

            // Should return all unique competition names
            const uniqueNames = [...new Set(competitionNames.map(n => n.trim()).filter(n => n.length > 0))];
            expect(new Set(newCompetitions)).toEqual(new Set(uniqueNames));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle case-sensitive comparison correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (baseName) => {
            // Database has lowercase version
            const mockApiClient = {
              getAllCompetitions: jest.fn().mockResolvedValue([
                {
                  id: 1,
                  name: baseName.toLowerCase(),
                  date: '2024-01-01',
                  type: 'singles',
                  seasonId: 1
                }
              ])
            };

            const detector = new CompetitionDetector(mockApiClient);

            // Records have uppercase version
            const records = [{
              date: '2024-01-01',
              time: '12:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Member',
              player: 'Player',
              competition: baseName.toUpperCase(),
              total: '10.00',
              sourceRowIndex: 0,
              isComplete: true
            }];

            const newCompetitions = await detector.detectNewCompetitions(records);

            // Should treat as different if case differs
            if (baseName.toLowerCase() !== baseName.toUpperCase()) {
              expect(newCompetitions.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
