/**
 * Property-Based Tests for Competition Winnings Tracking (Migrated to Backend)
 * Tests correctness properties for competition management and transaction flagging
 * using the test database instead of IndexedDB
 */

import fc from 'fast-check';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
  getTestDatabase,
} from './testDatabase';
import { TransactionService } from '../services/transaction.service';
import { CompetitionService } from '../services/competition.service';
import { PresentationSeasonService } from '../services/presentationSeason.service';
import { FlaggedTransactionService } from '../services/flaggedTransaction.service';
import { SummaryService } from '../services/summary.service';

describe('Competition Winnings Tracking - Property-Based Tests', () => {
  let transactionService: TransactionService;
  let competitionService: CompetitionService;
  let seasonService: PresentationSeasonService;
  let flaggedTransactionService: FlaggedTransactionService;
  let summaryService: SummaryService;

  beforeAll(async () => {
    await connectTestDatabase();
    const db = getTestDatabase();
    
    transactionService = new TransactionService(db);
    competitionService = new CompetitionService(db);
    seasonService = new PresentationSeasonService(db);
    flaggedTransactionService = new FlaggedTransactionService(db);
    summaryService = new SummaryService(db);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
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
          await resetTestDatabase();
          
          // Recreate test season after reset
          const season = await seasonService.createSeason({
            name: 'Season: Winter 24-Summer 25',
            startYear: 24,
            endYear: 25
          });
          const seasonId = season.id;
          
          // Create a competition
          const competition = await competitionService.createCompetition({
            name: competitionName,
            date: '2024-06-15',
            type: 'singles',
            seasonId
          });
          
          // Store transactions
          const importResult = await transactionService.importTransactions(transactions);
          expect(importResult.imported).toBe(transactions.length);
          
          // Get stored transactions with IDs
          const storedTransactions = await transactionService.getAllTransactions();
          
          // Flag some transactions (only Topup (Competitions) type, deduplicate indices first)
          const flaggedIds: number[] = [];
          const uniqueIndices = [...new Set(flagIndices)];
          for (const index of uniqueIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await flaggedTransactionService.createFlaggedTransaction(transaction.id!);
                // Associate with competition
                await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competition.id);
                flaggedIds.push(transaction.id!);
              }
            }
          }
          
          // Get flagged transactions
          const flaggedTransactions = await flaggedTransactionService.getAllFlaggedTransactions();
          
          // Calculate expected winnings sum
          const expectedWinnings = flaggedTransactions
            .reduce((sum, ft) => sum + parseFloat(ft.transaction.total), 0);
          
          // Generate weekly summaries
          const summaries = await summaryService.calculateWeeklySummaries();
          
          // Calculate actual winnings sum from summaries
          const actualWinnings = summaries.reduce((sum, s) => sum + s.winningsPaid, 0);
          
          // Verify they match (with floating point tolerance)
          expect(Math.abs(actualWinnings - expectedWinnings)).toBeLessThan(0.01);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Property 2: Competition creation consistency
   * For any set of competition names, all competitions should be created successfully
   * and retrievable from the database.
   * 
   * Validates: Requirements 3.1, 3.2
   */
  test('Property 2: Competition creation consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(competitionNameGen, { minLength: 2, maxLength: 10 }),
        async (names) => {
          // Clear database
          await resetTestDatabase();
          
          // Recreate test season after reset
          const season = await seasonService.createSeason({
            name: 'Season: Winter 24-Summer 25',
            startYear: 24,
            endYear: 25
          });
          const seasonId = season.id;
          
          const createdCompetitions: any[] = [];
          
          for (const name of names) {
            // All names should succeed (duplicates are allowed)
            const competition = await competitionService.createCompetition({
              name,
              date: '2024-06-15',
              type: 'singles',
              seasonId
            });
            expect(competition).toBeDefined();
            expect(competition.id).toBeDefined();
            expect(competition.name).toBe(name);
            createdCompetitions.push(competition);
          }
          
          // Verify all created competitions are retrievable
          const allCompetitions = await competitionService.getAllCompetitions();
          expect(allCompetitions.length).toBe(names.length);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Property 3: Flag state consistency
   * For any transaction that is flagged, it should appear in the flagged transactions list.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  test('Property 3: Flag state consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await resetTestDatabase();
          
          // Recreate test season after reset
          const season = await seasonService.createSeason({
            name: 'Season: Winter 24-Summer 25',
            startYear: 24,
            endYear: 25
          });
          const seasonId = season.id;
          
          // Create a competition
          const competition = await competitionService.createCompetition({
            name: competitionName,
            date: '2024-06-15',
            type: 'singles',
            seasonId
          });
          
          // Store transactions
          await transactionService.importTransactions(transactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await transactionService.getAllTransactions();
          
          // Flag some transactions (deduplicate indices first)
          const flaggedIds: number[] = [];
          const uniqueIndices = [...new Set(flagIndices)];
          for (const index of uniqueIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await flaggedTransactionService.createFlaggedTransaction(transaction.id!);
                // Associate with competition
                await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competition.id);
                flaggedIds.push(transaction.id!);
              }
            }
          }
          
          // Get flagged transactions
          const flaggedTransactions = await flaggedTransactionService.getAllFlaggedTransactions();
          const flaggedTransactionIds = flaggedTransactions.map(ft => ft.transactionId);
          
          // Verify all flagged IDs appear in the flagged transactions list
          for (const id of flaggedIds) {
            expect(flaggedTransactionIds).toContain(id);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Property 4: Rolling balance consistency
   * For any sequence of weekly summaries, each week's starting pot should equal 
   * the previous week's final pot.
   * 
   * Validates: Requirements 5.1, 5.2, 5.3
   */
  test('Property 4: Rolling balance consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionRecordGen, { minLength: 5, maxLength: 30 }),
        fc.array(fc.integer({ min: 0, max: 29 }), { minLength: 1, maxLength: 5 }),
        competitionNameGen,
        async (transactions, flagIndices, competitionName) => {
          // Clear database
          await resetTestDatabase();
          
          // Sort transactions chronologically
          const sortedTransactions = transactions.sort((a, b) => {
            const datetimeA = `${a.date} ${a.time}`;
            const datetimeB = `${b.date} ${b.time}`;
            return datetimeA.localeCompare(datetimeB);
          });
          
          // Recreate test season after reset
          const season = await seasonService.createSeason({
            name: 'Season: Winter 24-Summer 25',
            startYear: 24,
            endYear: 25
          });
          const seasonId = season.id;
          
          // Create a competition
          const competition = await competitionService.createCompetition({
            name: competitionName,
            date: '2024-06-15',
            type: 'singles',
            seasonId
          });
          
          // Store transactions
          await transactionService.importTransactions(sortedTransactions);
          
          // Get stored transactions with IDs
          const storedTransactions = await transactionService.getAllTransactions();
          
          // Flag some transactions (deduplicate indices first)
          const uniqueIndices = [...new Set(flagIndices)];
          for (const index of uniqueIndices) {
            if (index < storedTransactions.length) {
              const transaction = storedTransactions[index];
              if (transaction.type === 'Topup (Competitions)') {
                const flagged = await flaggedTransactionService.createFlaggedTransaction(transaction.id!);
                // Associate with competition
                await flaggedTransactionService.updateFlaggedTransaction(flagged.id, competition.id);
              }
            }
          }
          
          // Generate weekly summaries
          const summaries = await summaryService.calculateWeeklySummaries();
          
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
      { numRuns: 10 }
    );
  }, 120000);
});
