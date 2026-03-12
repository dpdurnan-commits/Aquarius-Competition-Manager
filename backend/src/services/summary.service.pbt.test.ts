import * as fc from 'fast-check';
import { SummaryService } from './summary.service';
import { DatabaseService } from './database.service';
import { TransactionRecord } from '../types';

jest.mock('./database.service');

describe('SummaryService - Property-Based Tests', () => {
  let summaryService: SummaryService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    summaryService = new SummaryService(mockDb);
  });

  describe('Property 4: Weekly summaries preserve transaction totals', () => {
    it('should preserve transaction totals across weekly summaries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              date: fc.integer({ min: 1, max: 365 })
                .map(dayOfYear => {
                  const date = new Date('2024-01-01');
                  date.setDate(date.getDate() + dayOfYear - 1);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${day}/${month}/${year}`;
                }),
              time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              ),
              till: fc.oneof(
                fc.constant(''),
                fc.constant('Till 1')
              ),
              type: fc.oneof(
                fc.constant('Sale'),
                fc.constant('Refund'),
                fc.constant('Topup (Competitions)')
              ),
              total: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
                .map(n => n.toFixed(2))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (transactions) => {
            const records: TransactionRecord[] = transactions.map((t, idx) => ({
              id: idx + 1,
              date: t.date,
              time: t.time,
              till: t.till,
              type: t.type,
              member: '',
              player: '',
              competition: '',
              price: '0.00',
              discount: '0.00',
              subtotal: '0.00',
              vat: '0.00',
              total: t.total,
              sourceRowIndex: idx,
              isComplete: true
            }));

            mockDb.query = jest.fn().mockResolvedValue({ rows: records });

            const summaries = await summaryService.calculateWeeklySummaries();

            const expectedSales = records
              .filter(r => r.type === 'Sale')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);

            const expectedRefunds = records
              .filter(r => r.type === 'Refund')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);

            const expectedAppTopUp = records
              .filter(r => r.till === '' && r.type === 'Topup (Competitions)')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);

            const expectedTillTopUp = records
              .filter(r => r.till === 'Till 1' && r.type === 'Topup (Competitions)')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);

            const actualSales = summaries.reduce((sum, s) => sum + s.competitionEntries, 0);
            const actualRefunds = summaries.reduce((sum, s) => sum + s.competitionRefunds, 0);
            const actualAppTopUp = summaries.reduce((sum, s) => sum + s.purseApplicationTopUp, 0);
            const actualTillTopUp = summaries.reduce((sum, s) => sum + s.purseTillTopUp, 0);

            const tolerance = 0.01;
            expect(Math.abs(actualSales - expectedSales)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualRefunds - expectedRefunds)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualAppTopUp - expectedAppTopUp)).toBeLessThanOrEqual(tolerance);
            expect(Math.abs(actualTillTopUp - expectedTillTopUp)).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
