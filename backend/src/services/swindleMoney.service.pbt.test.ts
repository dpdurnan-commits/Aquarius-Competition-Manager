import * as fc from 'fast-check';
import { SwindleMoneyService } from './swindleMoney.service';
import { DatabaseService } from './database.service';
import { NameMatchingService } from './nameMatching.service';
import { CompetitionResult } from '../types';
import { PoolClient } from 'pg';

describe('SwindleMoneyService - Property-Based Tests', () => {
  let swindleMoneyService: SwindleMoneyService;
  let mockDb: DatabaseService;
  let mockNameMatchingService: NameMatchingService;

  beforeEach(() => {
    // Create a mock database service
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    swindleMoneyService = new SwindleMoneyService(mockDb);
    
    // Access the private nameMatchingService for mocking
    mockNameMatchingService = (swindleMoneyService as any).nameMatchingService;
  });

  describe('Property 30: Swindle Money Population', () => {
    /**
     * Feature: competition-results-management
     * Property 30: Swindle Money Population
     * 
     * **Validates: Requirements 9.4, 9.7**
     * 
     * For any flagged transaction with player name and amount, if a matching 
     * competition result is found, the system SHALL update that result's 
     * swindle_money_paid field with the transaction amount.
     * 
     * This property ensures that:
     * 1. When a matching result is found, swindle_money_paid is updated
     * 2. The amount is persisted correctly to the database
     * 3. The update operation uses a transaction for atomicity
     * 4. The result ID is returned on success
     */
    it('should update swindle_money_paid when matching result is found', async () => {
      // Arbitrary for generating player names
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last')
      ).map(([first, last]) => `${first} ${last}`);

      // Arbitrary for generating positive amounts
      const amountArbitrary = fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true })
        .map(n => Math.round(n * 100) / 100); // Round to 2 decimal places

      // Arbitrary for generating competition results
      const competitionResultArbitrary = fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        competitionId: fc.integer({ min: 1, max: 1000 }),
        finishingPosition: fc.integer({ min: 1, max: 100 }),
        playerName: playerNameArbitrary,
        grossScore: fc.option(fc.integer({ min: 60, max: 150 }), { nil: null }),
        handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: null }),
        nettScore: fc.option(fc.integer({ min: 40, max: 120 }), { nil: null }),
        entryPaid: fc.integer({ min: 0, max: 1 }),
        competitionRefund: fc.constant(0),
        swindleMoneyPaid: fc.constant(0), // Initially unpaid
        createdAt: fc.constant(new Date()),
        updatedAt: fc.constant(new Date()),
      });

      await fc.assert(
        fc.asyncProperty(
          playerNameArbitrary,
          amountArbitrary,
          competitionResultArbitrary,
          async (playerName, amount, matchingResult) => {
            // Mock the name matching service to return a matching result
            jest.spyOn(mockNameMatchingService, 'findMatchingResult')
              .mockResolvedValue(matchingResult as CompetitionResult);

            // Mock the transaction method
            let capturedQuery: string | undefined;
            let capturedParams: any[] | undefined;
            
            (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
              const mockClient = {
                query: jest.fn().mockImplementation((query: string, params: any[]) => {
                  capturedQuery = query;
                  capturedParams = params;
                  return Promise.resolve({ rows: [], rowCount: 1 });
                }),
              } as any;
              
              await callback(mockClient);
            });

            // Call populateSwindleMoney
            const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

            // Verify the result
            expect(result.success).toBe(true);
            expect(result.resultId).toBe(matchingResult.id);
            expect(result.message).toContain('Successfully populated');
            expect(result.message).toContain(amount.toString());
            expect(result.message).toContain(playerName);

            // Verify the database update was called
            expect(mockDb.transaction).toHaveBeenCalled();
            expect(capturedQuery).toContain('UPDATE competition_results');
            expect(capturedQuery).toContain('SET swindle_money_paid = $1');
            expect(capturedQuery).toContain('WHERE id = $2');
            
            // Verify the correct parameters were passed
            expect(capturedParams).toEqual([amount, matchingResult.id]);
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should persist the amount correctly to the database', async () => {
      // Test that the exact amount is persisted without modification
      const testCasesArbitrary = fc.record({
        playerName: fc.tuple(
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'John'),
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Doe')
        ).map(([first, last]) => `${first} ${last}`),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(500), noNaN: true })
          .map(n => Math.round(n * 100) / 100),
        resultId: fc.integer({ min: 1, max: 5000 }),
      });

      await fc.assert(
        fc.asyncProperty(testCasesArbitrary, async ({ playerName, amount, resultId }) => {
          // Mock matching result
          const matchingResult: CompetitionResult = {
            id: resultId,
            competitionId: 1,
            finishingPosition: 1,
            playerName: playerName,
            grossScore: null,
            handicap: null,
            nettScore: null,
            entryPaid: 0,
            competitionRefund: 0,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          jest.spyOn(mockNameMatchingService, 'findMatchingResult')
            .mockResolvedValue(matchingResult);

          let persistedAmount: number | undefined;
          let persistedResultId: number | undefined;

          (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
            const mockClient = {
              query: jest.fn().mockImplementation((_query: string, params: any[]) => {
                persistedAmount = params[0];
                persistedResultId = params[1];
                return Promise.resolve({ rows: [], rowCount: 1 });
              }),
            } as any;
            
            await callback(mockClient);
          });

          // Call the service
          await swindleMoneyService.populateSwindleMoney(playerName, amount);

          // Verify the exact amount was persisted
          expect(persistedAmount).toBe(amount);
          expect(persistedResultId).toBe(resultId);
          
          // Verify no rounding errors or modifications
          expect(persistedAmount).toEqual(amount);
        }),
        { numRuns: 100 }
      );
    });

    it('should return warning when no matching result is found', async () => {
      // Test that the system handles no match gracefully
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Unknown'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player')
      ).map(([first, last]) => `${first} ${last}`);

      const amountArbitrary = fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true })
        .map(n => Math.round(n * 100) / 100);

      await fc.assert(
        fc.asyncProperty(
          playerNameArbitrary,
          amountArbitrary,
          async (playerName, amount) => {
            // Mock no matching result found
            jest.spyOn(mockNameMatchingService, 'findMatchingResult')
              .mockResolvedValue(null);

            // Call populateSwindleMoney
            const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

            // Verify the result indicates success with warning
            expect(result.success).toBe(true);
            expect(result.resultId).toBeNull();
            expect(result.message).toContain('Warning');
            expect(result.message).toContain('No matching');
            expect(result.message).toContain(playerName);

            // Verify no database update was attempted
            expect(mockDb.transaction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative amounts', async () => {
      // Test that negative amounts are rejected
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Test'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player')
      ).map(([first, last]) => `${first} ${last}`);

      const negativeAmountArbitrary = fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true })
        .map(n => Math.round(n * 100) / 100);

      await fc.assert(
        fc.asyncProperty(
          playerNameArbitrary,
          negativeAmountArbitrary,
          async (playerName, amount) => {
            // Call populateSwindleMoney with negative amount
            const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

            // Verify the result indicates failure
            expect(result.success).toBe(false);
            expect(result.resultId).toBeNull();
            expect(result.message).toContain('negative');

            // Verify no database operations were attempted
            expect(mockDb.transaction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero amounts correctly', async () => {
      // Test that zero amounts are accepted (edge case)
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Zero'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Amount')
      ).map(([first, last]) => `${first} ${last}`);

      await fc.assert(
        fc.asyncProperty(playerNameArbitrary, async (playerName) => {
          const amount = 0;
          
          // Mock matching result
          const matchingResult: CompetitionResult = {
            id: 1,
            competitionId: 1,
            finishingPosition: 1,
            playerName: playerName,
            grossScore: null,
            handicap: null,
            nettScore: null,
            entryPaid: 0,
            competitionRefund: 0,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          jest.spyOn(mockNameMatchingService, 'findMatchingResult')
            .mockResolvedValue(matchingResult);

          let persistedAmount: number | undefined;

          (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
            const mockClient = {
              query: jest.fn().mockImplementation((_query: string, params: any[]) => {
                persistedAmount = params[0];
                return Promise.resolve({ rows: [], rowCount: 1 });
              }),
            } as any;
            
            await callback(mockClient);
          });

          // Call the service
          const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

          // Verify zero is accepted and persisted
          expect(result.success).toBe(true);
          expect(persistedAmount).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should use database transaction for atomicity', async () => {
      // Test that updates are wrapped in a transaction
      const testDataArbitrary = fc.record({
        playerName: fc.tuple(
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Trans'),
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Action')
        ).map(([first, last]) => `${first} ${last}`),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(300), noNaN: true })
          .map(n => Math.round(n * 100) / 100),
        resultId: fc.integer({ min: 1, max: 3000 }),
      });

      await fc.assert(
        fc.asyncProperty(testDataArbitrary, async ({ playerName, amount, resultId }) => {
          // Mock matching result
          const matchingResult: CompetitionResult = {
            id: resultId,
            competitionId: 1,
            finishingPosition: 1,
            playerName: playerName,
            grossScore: null,
            handicap: null,
            nettScore: null,
            entryPaid: 0,
            competitionRefund: 0,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          jest.spyOn(mockNameMatchingService, 'findMatchingResult')
            .mockResolvedValue(matchingResult);

          let transactionCallbackCalled = false;

          (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
            transactionCallbackCalled = true;
            const mockClient = {
              query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
            } as any;
            
            await callback(mockClient);
          });

          // Call the service
          await swindleMoneyService.populateSwindleMoney(playerName, amount);

          // Verify transaction was used
          expect(mockDb.transaction).toHaveBeenCalled();
          expect(transactionCallbackCalled).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle various player name formats', async () => {
      // Test with different name formats (case variations, whitespace, etc.)
      const nameVariationsArbitrary = fc.oneof(
        // Standard format
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'John'),
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Smith')
        ).map(([first, last]) => `${first} ${last}`),
        
        // Uppercase
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'JOHN'),
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'SMITH')
        ).map(([first, last]) => `${first.toUpperCase()} ${last.toUpperCase()}`),
        
        // Initial format
        fc.tuple(
          fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'),
          fc.string({ minLength: 1, maxLength: 15 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'REID')
        ).map(([initial, surname]) => `${initial}. ${surname}`)
      );

      const amountArbitrary = fc.float({ min: Math.fround(0.01), max: Math.fround(500), noNaN: true })
        .map(n => Math.round(n * 100) / 100);

      await fc.assert(
        fc.asyncProperty(
          nameVariationsArbitrary,
          amountArbitrary,
          async (playerName, amount) => {
            // Mock matching result
            const matchingResult: CompetitionResult = {
              id: 1,
              competitionId: 1,
              finishingPosition: 1,
              playerName: playerName,
              grossScore: null,
              handicap: null,
              nettScore: null,
              entryPaid: 0,
              competitionRefund: 0,
              swindleMoneyPaid: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            jest.spyOn(mockNameMatchingService, 'findMatchingResult')
              .mockResolvedValue(matchingResult);

            (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
              const mockClient = {
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
              } as any;
              
              await callback(mockClient);
            });

            // Call the service
            const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

            // Verify success regardless of name format
            expect(result.success).toBe(true);
            expect(result.resultId).toBe(matchingResult.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle large amounts correctly', async () => {
      // Test with large monetary amounts
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Big'),
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Winner')
      ).map(([first, last]) => `${first} ${last}`);

      const largeAmountArbitrary = fc.float({ min: Math.fround(1000), max: Math.fround(100000), noNaN: true })
        .map(n => Math.round(n * 100) / 100);

      await fc.assert(
        fc.asyncProperty(
          playerNameArbitrary,
          largeAmountArbitrary,
          async (playerName, amount) => {
            // Mock matching result
            const matchingResult: CompetitionResult = {
              id: 1,
              competitionId: 1,
              finishingPosition: 1,
              playerName: playerName,
              grossScore: null,
              handicap: null,
              nettScore: null,
              entryPaid: 0,
              competitionRefund: 0,
              swindleMoneyPaid: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            jest.spyOn(mockNameMatchingService, 'findMatchingResult')
              .mockResolvedValue(matchingResult);

            let persistedAmount: number | undefined;

            (mockDb.transaction as jest.Mock).mockImplementation(async (callback: (client: PoolClient) => Promise<void>) => {
              const mockClient = {
                query: jest.fn().mockImplementation((_query: string, params: any[]) => {
                  persistedAmount = params[0];
                  return Promise.resolve({ rows: [], rowCount: 1 });
                }),
              } as any;
              
              await callback(mockClient);
            });

            // Call the service
            const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

            // Verify large amounts are handled correctly
            expect(result.success).toBe(true);
            expect(persistedAmount).toBe(amount);
            expect(persistedAmount).toBeGreaterThanOrEqual(1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
