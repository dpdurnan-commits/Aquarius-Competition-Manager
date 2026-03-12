import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import summaryRoutes from './summary.routes';
import transactionRoutes from './transaction.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

/**
 * Property 5: Weekly summaries match frontend calculation
 * Validates: Requirements 5.3, 30.2, 30.3
 * 
 * This property verifies that the weekly summary API endpoint produces calculations
 * that match the expected formulas for Competition Purse and Competition Pot.
 * 
 * Competition Purse Formula:
 *   Final = Starting + AppTopUp + TillTopUp - Entries - Refunds
 * 
 * Competition Pot Formula:
 *   Final = Starting + Entries + Refunds - Winnings - Costs
 * 
 * The property ensures that:
 * 1. Transaction totals are preserved across weekly summaries
 * 2. Purse and Pot calculations follow the correct formulas
 * 3. Balances carry forward correctly from week to week
 */
describe('Summary API Routes - Property-Based Tests', () => {
  let app: Express;
  let db: DatabaseService;

  beforeAll(async () => {
    // Initialize database connection
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();

    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Make db available to routes
    app.locals.db = db;
    
    // Register routes
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/summaries', summaryRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM transactions');
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM transactions');
  });

  describe('Property 5: Weekly summaries match frontend calculation', () => {
    it('should calculate weekly summaries using correct formulas for Purse and Pot', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              // Generate dates within a year (2024)
              date: fc.integer({ min: 1, max: 365 })
                .map(dayOfYear => {
                  const date = new Date('2024-01-01');
                  date.setDate(date.getDate() + dayOfYear - 1);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                }),
              // Generate time
              time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              ),
              // Generate till
              till: fc.oneof(
                fc.constant(''),
                fc.constant('Till 1')
              ),
              // Generate type
              type: fc.oneof(
                fc.constant('Sale'),
                fc.constant('Refund'),
                fc.constant('Topup (Competitions)')
              ),
              // Generate total (positive for Sale/Topup, negative for Refund)
              total: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
                .map(n => n.toFixed(2))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (transactionData) => {
            // Clear database before each property test run
            await db.query('DELETE FROM flagged_transactions');
            await db.query('DELETE FROM competitions');
            await db.query('DELETE FROM transactions');

            // Transform transactions to have negative totals for refunds
            const transactions = transactionData.map((t, idx) => {
              const total = t.type === 'Refund' ? `-${t.total}` : t.total;
              return {
                date: t.date,
                time: t.time,
                till: t.till,
                type: t.type,
                member: '',
                player: '',
                competition: '',
                price: total,
                discount: '0.00',
                subtotal: total,
                vat: '0.00',
                total: total,
                sourceRowIndex: idx,
                isComplete: true
              };
            });

            // Import transactions via API
            await request(app)
              .post('/api/transactions/import')
              .send(transactions)
              .expect(201);

            // Get weekly summaries via API
            const response = await request(app)
              .get('/api/summaries/weekly')
              .expect(200);

            const summaries = response.body.summaries;

            // Calculate expected totals from transactions
            const expectedAppTopUp = transactions
              .filter(t => t.till === '' && t.type === 'Topup (Competitions)')
              .reduce((sum, t) => sum + parseFloat(t.total), 0);

            const expectedTillTopUp = transactions
              .filter(t => t.till === 'Till 1' && t.type === 'Topup (Competitions)')
              .reduce((sum, t) => sum + parseFloat(t.total), 0);

            const expectedEntries = transactions
              .filter(t => t.type === 'Sale')
              .reduce((sum, t) => sum + parseFloat(t.total), 0);

            const expectedRefunds = transactions
              .filter(t => t.type === 'Refund')
              .reduce((sum, t) => sum + parseFloat(t.total), 0);

            // Verify totals are preserved across all weekly summaries
            const actualAppTopUp = summaries.reduce((sum: number, s: any) => sum + s.purseApplicationTopUp, 0);
            const actualTillTopUp = summaries.reduce((sum: number, s: any) => sum + s.purseTillTopUp, 0);
            const actualEntries = summaries.reduce((sum: number, s: any) => sum + s.competitionEntries, 0);
            const actualRefunds = summaries.reduce((sum: number, s: any) => sum + s.competitionRefunds, 0);

            const tolerance = 0.01;
            expect(Math.abs(actualAppTopUp - expectedAppTopUp)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualTillTopUp - expectedTillTopUp)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualEntries - expectedEntries)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualRefunds - expectedRefunds)).toBeLessThanOrEqual(tolerance);

            // Verify Purse and Pot formulas are correct for each week
            let previousPurseFinal = 0;
            let previousPotFinal = 0;

            for (const summary of summaries) {
              // Verify starting balances match previous week's final
              expect(summary.startingPurse).toBeCloseTo(previousPurseFinal, 2);
              expect(summary.startingPot).toBeCloseTo(previousPotFinal, 2);

              // Verify Competition Purse formula:
              // Final = Starting + AppTopUp + TillTopUp - Entries - Refunds
              const expectedPurseFinal = 
                summary.startingPurse +
                summary.purseApplicationTopUp +
                summary.purseTillTopUp -
                summary.competitionEntries -
                summary.competitionRefunds;

              expect(summary.finalPurse).toBeCloseTo(expectedPurseFinal, 2);

              // Verify Competition Pot formula:
              // Final = Starting + Entries + Refunds - Winnings - Costs
              const expectedPotFinal =
                summary.startingPot +
                summary.competitionEntries +
                summary.competitionRefunds -
                summary.winningsPaid -
                summary.competitionCosts;

              expect(summary.finalPot).toBeCloseTo(expectedPotFinal, 2);

              // Update for next iteration
              previousPurseFinal = summary.finalPurse;
              previousPotFinal = summary.finalPot;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
