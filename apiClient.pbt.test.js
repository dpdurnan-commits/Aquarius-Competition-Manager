/**
 * Property-Based Tests for API Client (Frontend Integration)
 * Tests correctness properties for competition management and transaction flagging
 * using the REST API instead of IndexedDB
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import fc from 'fast-check';
import { APIClient } from './apiClient.js';

describe('API Client - Property-Based Tests', () => {
  let apiClient;
  const TEST_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

  beforeAll(() => {
    // Initialize API client with test server URL
    apiClient = new APIClient(TEST_BASE_URL);
  });

  beforeEach(async () => {
    // Clear all data before each test
    await apiClient.initialize();
    await apiClient.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await apiClient.clearAll();
  });

  /**
   * Generators for property-based testing
   */

  // Generate valid date strings in YYYY-MM-DD format (backend format)
  const dateStringGen = fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
    .map(d => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

  // Generate valid time strings in HH:MM:SS format
  const timeStringGen = fc.integer({ min: 0, max: 23 }).chain(h =>
    fc.integer({ min: 0, max: 59 }).chain(m =>
      fc.integer({ min: 0, max: 59 }).map(s =>
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      )
    )
  );

  // Generate transaction records
  const transactionRecordGen = fc.record({
    date: dateStringGen,
    time: timeStringGen,
    till: fc.oneof(fc.constant(''), fc.constant('Till 1')),
    type: fc.oneof(
      fc.constant('Topup (Competitions)'),
      fc.constant('Sale'),
      fc.constant('Refund')
    ),
    member: fc.string({ minLength: 0, maxLength: 50 }),
    player: fc.string({ minLength: 0, maxLength: 50 }),
    competition: fc.string({ minLength: 0, maxLength: 50 }),
    price: fc.float({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
    discount: fc.float({ min: 0, max: 100, noNaN: true }).map(n => n.toFixed(2)),
    subtotal: fc.float({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
    vat: fc.float({ min: 0, max: 200, noNaN: true }).map(n => n.toFixed(2)),
    total: fc.float({ min: 0, max: 1200, noNaN: true }).map(n => n.toFixed(2)),
    sourceRowIndex: fc.integer({ min: 0, max: 10000 }),
    isComplete: fc.boolean(),
  });

  // Generate competition names
  const competitionNameGen = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0);

  /**
   * Property 1: Winnings sum equals flagged totals
   * For any set of transactions with some flagged, the Competition Winnings Paid 
   * for a week should equal the sum of Total fields for all flagged transactions 
   * within that week.
   * 
   * Validates: Requirements 4.1, 4.2, 6.1, 6.2
   */
  test('Property 1: Winnings sum equals flagged totals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await apiClient.clearAll();
          
          // Create a competition
          const competition = await apiClient.createCompetition({
            name: competitionName,
            date: '2024-06-15',
          });
          
          // Store transactions
          const storeResult = await apiClient.store(transactions);
          expect(storeResult.stored).toBe(transactions.length);
          
          // Get stored transactions with IDs
          const storedTransactions = await apiClient.getAll();
          
          // Flag some transactions (only Topup (Competitions) type)
          const flaggedIds = [];
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await apiClient.flagTransaction(transaction.id);
                await apiClient.associateWithCompetition(flagged.id, competition.id);
                flaggedIds.push(transaction.id);
              }
            }
          }
          
          // Get flagged transactions
          const flaggedTransactions = await apiClient.getAllFlaggedTransactions();
          
          // Calculate expected winnings sum
          const expectedWinnings = flaggedTransactions
            .filter(ft => ft.competitionId === competition.id)
            .reduce((sum, ft) => sum + parseFloat(ft.total), 0);
          
          // Generate weekly summaries
          const summaries = await apiClient.getWeeklySummaries();
          
          // Calculate actual winnings sum from summaries
          const actualWinnings = summaries.reduce((sum, s) => sum + s.winningsPaid, 0);
          
          // Verify they match (with floating point tolerance)
          expect(Math.abs(actualWinnings - expectedWinnings)).toBeLessThan(0.01);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 2: Competition name uniqueness
   * For any set of competitions, no two competitions should have the same name 
   * (case-insensitive).
   * 
   * Validates: Requirements 3.1, 3.2, 6.1
   */
  test('Property 2: Competition name uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(competitionNameGen, { minLength: 2, maxLength: 10 }),
        async (names) => {
          // Clear database
          await apiClient.clearAll();
          
          const createdCompetitions = [];
          const seenNames = new Set();
          
          for (const name of names) {
            const normalizedName = name.toLowerCase();
            
            if (seenNames.has(normalizedName)) {
              // Duplicate name - should throw error
              await expect(
                apiClient.createCompetition({
                  name,
                  date: '2024-06-15',
                })
              ).rejects.toThrow();
            } else {
              // Unique name - should succeed
              const competition = await apiClient.createCompetition({
                name,
                date: '2024-06-15',
              });
              expect(competition).toBeDefined();
              expect(competition.id).toBeDefined();
              expect(competition.name).toBe(name.trim());
              createdCompetitions.push(competition);
              seenNames.add(normalizedName);
            }
          }
          
          // Verify all created competitions have unique names
          const allCompetitions = await apiClient.getAllCompetitions();
          const competitionNames = allCompetitions.map(c => c.name.toLowerCase());
          const uniqueNames = new Set(competitionNames);
          expect(uniqueNames.size).toBe(competitionNames.length);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 3: Flag state consistency
   * For any transaction that is flagged, it should appear in the flagged transactions list.
   * 
   * Validates: Requirements 4.1, 4.2, 6.1, 6.2
   */
  test('Property 3: Flag state consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await apiClient.clearAll();
          
          // Create a competition
          const competition = await apiClient.createCompetition({
            name: competitionName,
            date: '2024-06-15',
          });
          
          // Store transactions
          await apiClient.store(transactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await apiClient.getAll();
          
          // Flag some transactions
          const flaggedIds = [];
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await apiClient.flagTransaction(transaction.id);
                await apiClient.associateWithCompetition(flagged.id, competition.id);
                flaggedIds.push(transaction.id);
              }
            }
          }
          
          // Get flagged transactions
          const flaggedTransactions = await apiClient.getAllFlaggedTransactions();
          const flaggedTransactionIds = flaggedTransactions.map(ft => ft.transactionId);
          
          // Verify all flagged IDs appear in the flagged transactions list
          for (const id of flaggedIds) {
            expect(flaggedTransactionIds).toContain(id);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 4: Rolling balance consistency
   * For any sequence of weekly summaries after flagging a transaction, 
   * each week's starting pot should equal the previous week's final pot.
   * 
   * Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2
   */
  test('Property 4: Rolling balance consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 5, maxLength: 30 }),
        fc.array(fc.integer({ min: 0, max: 29 }), { minLength: 1, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await apiClient.clearAll();
          
          // Sort transactions chronologically
          const sortedTransactions = transactions.sort((a, b) => {
            const datetimeA = `${a.date} ${a.time}`;
            const datetimeB = `${b.date} ${b.time}`;
            return datetimeA.localeCompare(datetimeB);
          });
          
          // Create a competition
          const competition = await apiClient.createCompetition({
            name: competitionName,
            date: '2024-06-15',
          });
          
          // Store transactions
          await apiClient.store(sortedTransactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await apiClient.getAll();
          
          // Flag some transactions
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await apiClient.flagTransaction(transaction.id);
                await apiClient.associateWithCompetition(flagged.id, competition.id);
              }
            }
          }
          
          // Generate weekly summaries
          const summaries = await apiClient.getWeeklySummaries();
          
          // Verify rolling balance consistency
          if (summaries.length > 1) {
            for (let i = 1; i < summaries.length; i++) {
              const previousWeek = summaries[i - 1];
              const currentWeek = summaries[i];
              
              // Current week's starting pot should equal previous week's final pot
              expect(Math.abs(currentWeek.startingPot - previousWeek.finalPot)).toBeLessThan(0.01);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 5: API error handling consistency
   * For any invalid operation (e.g., chronological validation failure), 
   * the API should return appropriate error codes and messages.
   * 
   * Validates: Requirements 6.6, 12.1, 12.2, 14.1, 14.2
   */
  test('Property 5: API error handling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 2, maxLength: 10 }),
        async (transactions) => {
          // Clear database
          await apiClient.clearAll();
          
          // Sort transactions chronologically
          const sortedTransactions = transactions.sort((a, b) => {
            const datetimeA = `${a.date} ${a.time}`;
            const datetimeB = `${b.date} ${b.time}`;
            return datetimeA.localeCompare(datetimeB);
          });
          
          if (sortedTransactions.length < 2) {
            return true;
          }
          
          // Store first half
          const firstHalf = sortedTransactions.slice(0, Math.floor(sortedTransactions.length / 2));
          await apiClient.store(firstHalf);
          
          // Try to store second half in reverse order (should fail chronological validation)
          const secondHalf = sortedTransactions.slice(Math.floor(sortedTransactions.length / 2)).reverse();
          
          try {
            await apiClient.store(secondHalf);
            // If it succeeds, the second half must have been chronologically valid
            // (all timestamps after the first half)
            const allTransactions = await apiClient.getAll();
            expect(allTransactions.length).toBeGreaterThan(firstHalf.length);
          } catch (error) {
            // Should fail with chronological validation error
            expect(error.code).toBe('CHRONOLOGICAL_VALIDATION_FAILED');
            expect(error.message).toContain('chronological');
            
            // Verify database state is unchanged (atomic rollback)
            const allTransactions = await apiClient.getAll();
            expect(allTransactions.length).toBe(firstHalf.length);
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  }, 60000);

  /**
   * Property 6: Date range query correctness
   * For any set of transactions and any date range, the API should return 
   * only transactions within that range.
   * 
   * Validates: Requirements 2.3, 6.4
   */
  test('Property 6: Date range query correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 5, maxLength: 30 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        async (transactions, startDate, endDate) => {
          // Clear database
          await apiClient.clearAll();
          
          // Ensure startDate <= endDate
          if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
          }
          
          // Store transactions
          await apiClient.store(transactions);
          
          // Query by date range
          const filteredTransactions = await apiClient.getByDateRange(startDate, endDate);
          
          // Verify all returned transactions are within the range
          for (const transaction of filteredTransactions) {
            const transactionDate = new Date(transaction.date);
            expect(transactionDate >= startDate).toBe(true);
            expect(transactionDate <= endDate).toBe(true);
          }
          
          // Verify no transactions outside the range are returned
          const allTransactions = await apiClient.getAll();
          for (const transaction of allTransactions) {
            const transactionDate = new Date(transaction.date);
            const isInRange = transactionDate >= startDate && transactionDate <= endDate;
            const isInResult = filteredTransactions.some(ft => ft.id === transaction.id);
            
            if (isInRange) {
              expect(isInResult).toBe(true);
            } else {
              expect(isInResult).toBe(false);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  }, 60000);

  /**
   * Property 7: Competition deletion cascade
   * For any competition with associated flagged transactions, deleting the 
   * competition should remove all associations.
   * 
   * Validates: Requirements 3.5, 6.1
   */
  test('Property 7: Competition deletion cascade', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 5, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 1, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await apiClient.clearAll();
          
          // Create a competition
          const competition = await apiClient.createCompetition({
            name: competitionName,
            date: '2024-06-15',
          });
          
          // Store transactions
          await apiClient.store(transactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await apiClient.getAll();
          
          // Flag some transactions and associate with competition
          const flaggedIds = [];
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await apiClient.flagTransaction(transaction.id);
                await apiClient.associateWithCompetition(flagged.id, competition.id);
                flaggedIds.push(flagged.id);
              }
            }
          }
          
          // Verify flagged transactions exist
          const flaggedBefore = await apiClient.getAllFlaggedTransactions();
          const associatedBefore = flaggedBefore.filter(ft => ft.competitionId === competition.id);
          expect(associatedBefore.length).toBe(flaggedIds.length);
          
          // Delete competition
          await apiClient.deleteCompetition(competition.id);
          
          // Verify competition is deleted
          const competitions = await apiClient.getAllCompetitions();
          expect(competitions.find(c => c.id === competition.id)).toBeUndefined();
          
          // Verify flagged transaction associations are removed
          const flaggedAfter = await apiClient.getAllFlaggedTransactions();
          const associatedAfter = flaggedAfter.filter(ft => ft.competitionId === competition.id);
          expect(associatedAfter.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  }, 60000);
});
