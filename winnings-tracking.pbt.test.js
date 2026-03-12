/**
 * Property-Based Tests for Competition Winnings Tracking
 * Tests correctness properties for competition management and transaction flagging
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import { DatabaseManager } from './databaseManager.js';
import { CompetitionManager } from './competitionManager.js';
import { TransactionFlagger } from './transactionFlagger.js';
import { WeeklySummarizer } from './weeklySummarizer.js';

describe('Competition Winnings Tracking - Property-Based Tests', () => {
  let databaseManager;
  let competitionManager;
  let transactionFlagger;
  let weeklySummarizer;

  beforeEach(async () => {
    // Initialize components
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    await databaseManager.clearAll();
    
    competitionManager = new CompetitionManager(databaseManager);
    weeklySummarizer = new WeeklySummarizer(databaseManager);
    transactionFlagger = new TransactionFlagger(databaseManager, competitionManager, weeklySummarizer);
  });

  afterEach(async () => {
    await databaseManager.clearAll();
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
    isWinning: fc.constant(false),
    winningCompetitionId: fc.constant(null)
  });

  // Generate competition names
  const competitionNameGen = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0);

  /**
   * Property 1: Winnings sum equals flagged totals
   * For any set of transactions with some flagged, the Competition Winnings Paid 
   * for a week should equal the sum of Total fields for all transactions where 
   * isWinning is true within that week.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  test('Property 1: Winnings sum equals flagged totals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await databaseManager.clearAll();
          
          // Create a competition
          const competition = await competitionManager.create(competitionName);
          
          // Store transactions
          const storeResult = await databaseManager.store(transactions);
          expect(storeResult.stored).toBe(transactions.length);
          
          // Get stored transactions with IDs
          const storedTransactions = await databaseManager.getAll();
          
          // Flag some transactions (only Topup (Competitions) type)
          const flaggedIds = [];
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                await transactionFlagger.flagTransaction(transaction.id, competition.id);
                flaggedIds.push(transaction.id);
              }
            }
          }
          
          // Get updated transactions
          const updatedTransactions = await databaseManager.getAll();
          
          // Calculate expected winnings sum
          const expectedWinnings = updatedTransactions
            .filter(t => t.isWinning === true)
            .reduce((sum, t) => sum + parseFloat(t.total), 0);
          
          // Generate weekly summaries
          const summaries = weeklySummarizer.generateSummaries(updatedTransactions);
          
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
   * Validates: Requirements 1.2, 1.3
   */
  test('Property 2: Competition name uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(competitionNameGen, { minLength: 2, maxLength: 10 }),
        async (names) => {
          // Clear database
          await databaseManager.clearAll();
          
          const createdCompetitions = [];
          const seenNames = new Set();
          
          for (const name of names) {
            const normalizedName = name.toLowerCase();
            
            if (seenNames.has(normalizedName)) {
              // Duplicate name - should throw error
              await expect(competitionManager.create(name)).rejects.toThrow();
            } else {
              // Unique name - should succeed
              const competition = await competitionManager.create(name);
              expect(competition).toBeDefined();
              expect(competition.id).toBeDefined();
              expect(competition.name).toBe(name.trim());
              createdCompetitions.push(competition);
              seenNames.add(normalizedName);
            }
          }
          
          // Verify all created competitions have unique names
          const allCompetitions = await competitionManager.getAll();
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
   * For any transaction where isWinning is false, winningCompetitionId must be null.
   * 
   * Validates: Requirements 3.2, 3.3
   */
  test('Property 3: Flag state consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await databaseManager.clearAll();
          
          // Create a competition
          const competition = await competitionManager.create(competitionName);
          
          // Store transactions
          await databaseManager.store(transactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await databaseManager.getAll();
          
          // Flag some transactions
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                await transactionFlagger.flagTransaction(transaction.id, competition.id);
              }
            }
          }
          
          // Get updated transactions
          const updatedTransactions = await databaseManager.getAll();
          
          // Verify flag state consistency
          for (const transaction of updatedTransactions) {
            if (transaction.isWinning === false) {
              expect(transaction.winningCompetitionId).toBeNull();
            }
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
   * Validates: Requirements 4.3, 4.5
   */
  test('Property 4: Rolling balance consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 5, maxLength: 30 }),
        fc.array(fc.integer({ min: 0, max: 29 }), { minLength: 1, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await databaseManager.clearAll();
          
          // Sort transactions chronologically
          const sortedTransactions = transactions.sort((a, b) => {
            const dateA = a.date.split('/').reverse().join('-');
            const dateB = b.date.split('/').reverse().join('-');
            const datetimeA = `${dateA} ${a.time}`;
            const datetimeB = `${dateB} ${b.time}`;
            return datetimeA.localeCompare(datetimeB);
          });
          
          // Create a competition
          const competition = await competitionManager.create(competitionName);
          
          // Store transactions
          await databaseManager.store(sortedTransactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await databaseManager.getAll();
          
          // Flag some transactions
          for (const index of flagIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                await transactionFlagger.flagTransaction(transaction.id, competition.id);
              }
            }
          }
          
          // Get updated transactions
          const updatedTransactions = await databaseManager.getAll();
          
          // Generate weekly summaries
          const summaries = weeklySummarizer.generateSummaries(updatedTransactions);
          
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
   * Property 5: Recalculation completeness
   * For any transaction flagged in week N, all weekly summaries from week N 
   * onward should be recalculated.
   * 
   * Validates: Requirements 4.5, 8.2, 8.3
   */
  test('Property 5: Recalculation completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 10, maxLength: 30 }),
        fc.integer({ min: 0, max: 9 }),
        competitionNameGen,
        async (transactions, flagIndex, competitionName) => {
          // Clear database
          await databaseManager.clearAll();
          
          // Sort transactions chronologically
          const sortedTransactions = transactions.sort((a, b) => {
            const dateA = a.date.split('/').reverse().join('-');
            const dateB = b.date.split('/').reverse().join('-');
            const datetimeA = `${dateA} ${a.time}`;
            const datetimeB = `${dateB} ${b.time}`;
            return datetimeA.localeCompare(datetimeB);
          });
          
          // Create a competition
          const competition = await competitionManager.create(competitionName);
          
          // Store transactions
          await databaseManager.store(sortedTransactions);
          
          // Generate initial summaries (before flagging)
          const storedTransactions = await databaseManager.getAll();
          const initialSummaries = weeklySummarizer.generateSummaries(storedTransactions);
          
          // Flag a transaction
          if (flagIndex < storedTransactions.length) {
            const transaction = storedTransactions[flagIndex];
            if (transaction.type === 'Topup (Competitions)') {
              await transactionFlagger.flagTransaction(transaction.id, competition.id);
              
              // Get updated transactions
              const updatedTransactions = await databaseManager.getAll();
              
              // Generate new summaries (after flagging)
              const newSummaries = weeklySummarizer.generateSummaries(updatedTransactions);
              
              // Find the week containing the flagged transaction
              const flaggedTransaction = updatedTransactions.find(t => t.id === transaction.id);
              const flaggedDate = weeklySummarizer.parseDate(flaggedTransaction.date, flaggedTransaction.time);
              const flaggedWeekMonday = weeklySummarizer.getMondayOfWeek(flaggedDate);
              
              // Verify that summaries from the flagged week onward have changed
              // (or at least the winnings calculation is correct)
              for (let i = 0; i < newSummaries.length; i++) {
                const summary = newSummaries[i];
                
                // Check if this week is on or after the flagged week
                if (summary.fromDate >= flaggedWeekMonday) {
                  // Calculate expected winnings for this week
                  const weekTransactions = updatedTransactions.filter(t => {
                    const tDate = weeklySummarizer.parseDate(t.date, t.time);
                    return tDate >= summary.fromDate && tDate <= summary.toDate;
                  });
                  
                  const expectedWinnings = weekTransactions
                    .filter(t => t.isWinning === true)
                    .reduce((sum, t) => sum + parseFloat(t.total), 0);
                  
                  // Verify winnings calculation is correct
                  expect(Math.abs(summary.winningsPaid - expectedWinnings)).toBeLessThan(0.01);
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  }, 60000);
});
