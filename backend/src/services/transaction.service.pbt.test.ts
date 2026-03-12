import * as fc from 'fast-check';
import { TransactionService } from './transaction.service';
import { DatabaseService } from './database.service';
import { TransactionRecord } from '../types';
import { PoolClient } from 'pg';

/**
 * Property-Based Tests for TransactionService
 * 
 * These tests validate universal properties that should hold for all inputs
 */

// Mock DatabaseService
jest.mock('./database.service');

describe('TransactionService - Property-Based Tests', () => {
  let transactionService: TransactionService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    transactionService = new TransactionService(mockDb);
  });

  /**
   * Property 1: Field extraction preserves non-member fields
   * **Validates: Requirements 29.2, 29.3**
   * 
   * This property ensures that when extracting player and competition from the member field,
   * all other transaction fields remain unchanged. This is critical for data integrity during
   * the CSV parsing and transformation process.
   */
  describe('Property 1: Field extraction preserves non-member fields', () => {
    it('should preserve all non-member fields during field extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary transaction records
          fc.record({
            date: fc.integer({ min: 2020, max: 2030 })
              .chain(year => fc.integer({ min: 1, max: 12 })
                .chain(month => fc.integer({ min: 1, max: 28 })
                  .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
            time: fc.tuple(
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 }),
              fc.integer({ min: 0, max: 59 })
            ).map(([h, m, s]) => 
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            ),
            till: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.oneof(
              fc.constant('Sale'),
              fc.constant('Refund'),
              fc.constant('Payment'),
              fc.string({ minLength: 1, maxLength: 20 })
            ),
            member: fc.oneof(
              // Member with ampersand and colon (should extract)
              fc.tuple(
                fc.string({ minLength: 1, maxLength: 30 }),
                fc.string({ minLength: 1, maxLength: 30 })
              ).map(([player, comp]) => `${player} & ${comp}: Entry`),
              // Member without special characters (should not extract)
              fc.string({ minLength: 1, maxLength: 50 })
            ),
            price: fc.float({ min: 0, max: 1000, noNaN: true })
              .map(n => n.toFixed(2)),
            discount: fc.float({ min: 0, max: 100, noNaN: true })
              .map(n => n.toFixed(2)),
            subtotal: fc.float({ min: 0, max: 1000, noNaN: true })
              .map(n => n.toFixed(2)),
            vat: fc.float({ min: 0, max: 200, noNaN: true })
              .map(n => n.toFixed(2)),
            total: fc.float({ min: 0, max: 1200, noNaN: true })
              .map(n => n.toFixed(2)),
            sourceRowIndex: fc.integer({ min: 0, max: 100000 }),
            isComplete: fc.boolean()
          }).map(record => ({
            ...record,
            player: '',
            competition: ''
          })),
          async (record: TransactionRecord) => {
            // Setup mocks for import
            mockDb.query.mockResolvedValueOnce({ 
              rows: [], 
              command: '', 
              oid: 0, 
              fields: [], 
              rowCount: 0 
            });

            let capturedRecord: Partial<TransactionRecord> | null = null;

            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {} as PoolClient;
              mockClient.query = jest.fn().mockImplementation((sql: string, params: any[]) => {
                // Capture the record that was inserted
                if (sql.includes('INSERT INTO transactions')) {
                  capturedRecord = {
                    date: params[0],
                    time: params[1],
                    till: params[2],
                    type: params[3],
                    member: params[4],
                    player: params[5],
                    competition: params[6],
                    price: params[7],
                    discount: params[8],
                    subtotal: params[9],
                    vat: params[10],
                    total: params[11],
                    sourceRowIndex: params[12],
                    isComplete: params[13]
                  };
                }
                return Promise.resolve({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
              });
              return callback(mockClient);
            });

            // Import the transaction (which applies field extraction)
            await transactionService.importTransactions([record]);

            // Verify non-member fields are preserved
            expect(capturedRecord).not.toBeNull();
            
            const captured = capturedRecord!;
            
            // These fields MUST be identical to the original
            expect(captured.date).toBe(record.date);
            expect(captured.time).toBe(record.time);
            expect(captured.till).toBe(record.till);
            expect(captured.type).toBe(record.type);
            expect(captured.price).toBe(record.price);
            expect(captured.discount).toBe(record.discount);
            expect(captured.subtotal).toBe(record.subtotal);
            expect(captured.vat).toBe(record.vat);
            expect(captured.total).toBe(record.total);
            expect(captured.sourceRowIndex).toBe(record.sourceRowIndex);
            expect(captured.isComplete).toBe(record.isComplete);

            // The extraction logic may modify member, player, and competition fields
            // but that's expected behavior - we're only testing that OTHER fields are preserved
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });
  });

  /**
   * Property 2: Chronological validation rejects out-of-order imports
   * **Validates: Requirements 15.1, 15.2**
   *
   * This property ensures that the chronological validation correctly rejects
   * any import attempt where the earliest new transaction is before the latest
   * existing transaction in the database. This is critical for maintaining
   * data integrity and preventing out-of-order imports in the multi-user environment.
   */
  describe('Property 2: Chronological validation rejects out-of-order imports', () => {
    it('should reject imports when earliest new transaction is before latest existing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a "latest existing" transaction timestamp
        fc.record({
          date: fc.integer({ min: 2024, max: 2024 })
            .chain(year => fc.integer({ min: 1, max: 12 })
              .chain(month => fc.integer({ min: 1, max: 28 })
                .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
          time: fc.tuple(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ).map(([h, m, s]) =>
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          )
        }),
        // Generate a batch of "new" transactions that are BEFORE the existing one
        fc.array(
          fc.record({
            date: fc.integer({ min: 2023, max: 2024 })
              .chain(year => fc.integer({ min: 1, max: 6 })
                .chain(month => fc.integer({ min: 1, max: 28 })
                  .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
            time: fc.tuple(
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 }),
              fc.integer({ min: 0, max: 59 })
            ).map(([h, m, s]) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            ),
            till: fc.constant('Till 1'),
            type: fc.constant('Sale'),
            member: fc.constant('Test Member'),
            player: fc.constant(''),
            competition: fc.constant(''),
            price: fc.constant('5.00'),
            discount: fc.constant('0.00'),
            subtotal: fc.constant('5.00'),
            vat: fc.constant('0.00'),
            total: fc.constant('5.00'),
            sourceRowIndex: fc.integer({ min: 1, max: 1000 }),
            isComplete: fc.constant(true)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (latestExisting, newRecords: TransactionRecord[]) => {
          // Ensure at least one new record is actually before the existing one
          const latestExistingTs = new Date(`${latestExisting.date}T${latestExisting.time}`).getTime();
          const hasEarlierRecord = newRecords.some(r => {
            const recordTs = new Date(`${r.date}T${r.time}`).getTime();
            return recordTs < latestExistingTs;
          });

          // Skip this test case if no records are actually earlier
          fc.pre(hasEarlierRecord);

          // Mock database to return the "latest existing" transaction
          mockDb.query.mockResolvedValueOnce({
            rows: [latestExisting],
            command: '',
            oid: 0,
            fields: [],
            rowCount: 1
          });

          // Attempt to import the new records
          // This MUST throw an error due to chronological validation
          await expect(transactionService.importTransactions(newRecords))
            .rejects
            .toThrow(/Import rejected.*before the latest existing transaction/);

          // Verify that the transaction was NOT called (rollback before DB operation)
          expect(mockDb.transaction).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 } // Run 50 random test cases
    );
  });

  it('should allow imports when all new transactions are after latest existing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a "latest existing" transaction timestamp
        fc.record({
          date: fc.integer({ min: 2024, max: 2024 })
            .chain(year => fc.integer({ min: 1, max: 6 })
              .chain(month => fc.integer({ min: 1, max: 28 })
                .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
          time: fc.tuple(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ).map(([h, m, s]) =>
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          )
        }),
        // Generate a batch of "new" transactions that are AFTER the existing one
        fc.array(
          fc.record({
            date: fc.integer({ min: 2024, max: 2024 })
              .chain(year => fc.integer({ min: 7, max: 12 })
                .chain(month => fc.integer({ min: 1, max: 28 })
                  .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
            time: fc.tuple(
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 }),
              fc.integer({ min: 0, max: 59 })
            ).map(([h, m, s]) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            ),
            till: fc.constant('Till 1'),
            type: fc.constant('Sale'),
            member: fc.constant('Test Member'),
            player: fc.constant(''),
            competition: fc.constant(''),
            price: fc.constant('5.00'),
            discount: fc.constant('0.00'),
            subtotal: fc.constant('5.00'),
            vat: fc.constant('0.00'),
            total: fc.constant('5.00'),
            sourceRowIndex: fc.integer({ min: 1, max: 1000 }),
            isComplete: fc.constant(true)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (latestExisting, newRecords: TransactionRecord[]) => {
          // Ensure all new records are actually after the existing one
          const latestExistingTs = new Date(`${latestExisting.date}T${latestExisting.time}`).getTime();
          const allAfter = newRecords.every(r => {
            const recordTs = new Date(`${r.date}T${r.time}`).getTime();
            return recordTs >= latestExistingTs;
          });

          // Skip this test case if not all records are after
          fc.pre(allAfter);

          // Mock database to return the "latest existing" transaction
          mockDb.query.mockResolvedValueOnce({
            rows: [latestExisting],
            command: '',
            oid: 0,
            fields: [],
            rowCount: 1
          });

          // Mock successful transaction
          mockDb.transaction.mockImplementation(async (callback) => {
            const mockClient = {} as PoolClient;
            mockClient.query = jest.fn().mockResolvedValue({
              rows: [],
              command: '',
              oid: 0,
              fields: [],
              rowCount: 1
            });
            return callback(mockClient);
          });

          // Attempt to import the new records
          // This MUST succeed since all records are chronologically valid
          const result = await transactionService.importTransactions(newRecords);

          // Verify successful import
          expect(result.imported).toBe(newRecords.length);
          expect(result.errors).toHaveLength(0);
          expect(mockDb.transaction).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 } // Run 50 random test cases
    );
  });

  it('should allow imports when database is empty regardless of transaction dates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary transaction records with any dates
        fc.array(
          fc.record({
            date: fc.integer({ min: 2020, max: 2030 })
              .chain(year => fc.integer({ min: 1, max: 12 })
                .chain(month => fc.integer({ min: 1, max: 28 })
                  .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`))),
            time: fc.tuple(
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 }),
              fc.integer({ min: 0, max: 59 })
            ).map(([h, m, s]) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            ),
            till: fc.constant('Till 1'),
            type: fc.constant('Sale'),
            member: fc.constant('Test Member'),
            player: fc.constant(''),
            competition: fc.constant(''),
            price: fc.constant('5.00'),
            discount: fc.constant('0.00'),
            subtotal: fc.constant('5.00'),
            vat: fc.constant('0.00'),
            total: fc.constant('5.00'),
            sourceRowIndex: fc.integer({ min: 1, max: 1000 }),
            isComplete: fc.constant(true)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (newRecords: TransactionRecord[]) => {
          // Mock empty database (no existing transactions)
          mockDb.query.mockResolvedValueOnce({
            rows: [],
            command: '',
            oid: 0,
            fields: [],
            rowCount: 0
          });

          // Mock successful transaction
          mockDb.transaction.mockImplementation(async (callback) => {
            const mockClient = {} as PoolClient;
            mockClient.query = jest.fn().mockResolvedValue({
              rows: [],
              command: '',
              oid: 0,
              fields: [],
              rowCount: 1
            });
            return callback(mockClient);
          });

          // Attempt to import the new records
          // This MUST succeed since database is empty
          const result = await transactionService.importTransactions(newRecords);

          // Verify successful import
          expect(result.imported).toBe(newRecords.length);
          expect(result.errors).toHaveLength(0);
          expect(mockDb.transaction).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 } // Run 50 random test cases
    );
  });
  });
});
