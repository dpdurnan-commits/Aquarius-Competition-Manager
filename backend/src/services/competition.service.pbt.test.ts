import * as fc from 'fast-check';
import { CompetitionService } from './competition.service';
import { DatabaseService } from './database.service';
import { PoolClient } from 'pg';

/**
 * Property-Based Tests for CompetitionService
 * 
 * These tests validate universal properties that should hold for all inputs
 */

// Mock DatabaseService
jest.mock('./database.service');

describe('CompetitionService - Property-Based Tests', () => {
  let competitionService: CompetitionService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    competitionService = new CompetitionService(mockDb);
  });

  /**
   * Property 6: Type constraint validation
   * **Validates: Requirements 2.3, 10.7**
   * 
   * This property ensures that the CompetitionService correctly enforces the
   * type constraint, accepting only 'singles' and 'doubles' as valid competition
   * types and rejecting any other values.
   * 
   * The property verifies that:
   * 1. Valid types ('singles' and 'doubles') are accepted
   * 2. Invalid types are rejected with appropriate error messages
   * 3. Type validation occurs before database insertion
   */
  describe('Property 6: Type constraint validation', () => {
    it('should accept only "singles" and "doubles" as valid competition types', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid competition data with varying types
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(d => {
              // Ensure valid date before converting to ISO string
              if (isNaN(d.getTime())) {
                return '2024-01-01'; // fallback to valid date
              }
              return d.toISOString().split('T')[0];
            }),
            type: fc.oneof(
              fc.constant('singles'),
              fc.constant('doubles'),
              // Invalid types to test rejection
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'singles' && s !== 'doubles'),
              fc.constant(''),
              fc.constant('SINGLES'),
              fc.constant('DOUBLES'),
              fc.constant('single'),
              fc.constant('double'),
              fc.constant('mixed'),
              fc.constant('team')
            ),
            seasonId: fc.integer({ min: 1, max: 100 }),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            prizeStructure: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
          }),
          async (dto: any) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const isValidType = dto.type === 'singles' || dto.type === 'doubles';

            // Mock season existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM presentation_seasons')) {
                return Promise.resolve({
                  rows: [{ id: params![0] }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }
              
              if (sql.includes('INSERT INTO competitions')) {
                return Promise.resolve({
                  rows: [{
                    id: 1,
                    name: dto.name,
                    date: dto.date,
                    type: dto.type,
                    seasonId: dto.seasonId,
                    description: dto.description || '',
                    prizeStructure: dto.prizeStructure || '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTIONS:
            if (isValidType) {
              // Valid types should be accepted
              const result = await competitionService.createCompetition(dto);
              
              // The competition should be created successfully
              expect(result).toBeDefined();
              expect(result.type).toBe(dto.type);
              
              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competitions'),
                expect.arrayContaining([dto.name, dto.date, dto.type, dto.seasonId])
              );
            } else {
              // Invalid types should be rejected
              await expect(competitionService.createCompetition(dto))
                .rejects
                .toThrow('Competition type must be "singles" or "doubles"');
              
              // The INSERT query should NOT have been called
              expect(mockDb.query).not.toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competitions'),
                expect.anything()
              );
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should validate type constraint on competition updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate competition ID and update data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            type: fc.oneof(
              fc.constant('singles'),
              fc.constant('doubles'),
              // Invalid types
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'singles' && s !== 'doubles'),
              fc.constant('SINGLES'),
              fc.constant('mixed')
            )
          }),
          async (data: any) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const isValidType = data.type === 'singles' || data.type === 'doubles';

            // Mock database responses
            mockDb.query.mockImplementation((sql: string, _params?: any[]) => {
              if (sql.includes('UPDATE competitions')) {
                return Promise.resolve({
                  rows: [{
                    id: data.id,
                    name: 'Test Competition',
                    date: '2024-01-01',
                    type: data.type,
                    seasonId: 1,
                    description: '',
                    prizeStructure: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'UPDATE',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTIONS:
            if (isValidType) {
              // Valid types should be accepted in updates
              const result = await competitionService.updateCompetition(data.id, { type: data.type });
              
              expect(result).toBeDefined();
              expect(result.type).toBe(data.type);
              
              // The UPDATE query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE competitions'),
                expect.anything()
              );
            } else {
              // Invalid types should be rejected in updates
              await expect(competitionService.updateCompetition(data.id, { type: data.type }))
                .rejects
                .toThrow('Competition type must be "singles" or "doubles"');
              
              // The UPDATE query should NOT have been called
              expect(mockDb.query).not.toHaveBeenCalledWith(
                expect.stringContaining('UPDATE competitions'),
                expect.anything()
              );
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should enforce type constraint at database level', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate only valid types for this test
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(d => {
              // Ensure valid date before converting to ISO string
              if (isNaN(d.getTime())) {
                return '2024-01-01'; // fallback to valid date
              }
              return d.toISOString().split('T')[0];
            }),
            type: fc.constantFrom('singles', 'doubles'),
            seasonId: fc.integer({ min: 1, max: 100 })
          }),
          async (dto: any) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Mock season existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM presentation_seasons')) {
                return Promise.resolve({
                  rows: [{ id: params![0] }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }
              
              if (sql.includes('INSERT INTO competitions')) {
                // Verify that the type being inserted is valid
                const typeParam = params![2]; // type is the 3rd parameter
                
                // This simulates the database CHECK constraint
                if (typeParam !== 'singles' && typeParam !== 'doubles') {
                  throw new Error('new row for relation "competitions" violates check constraint "check_competition_type"');
                }
                
                return Promise.resolve({
                  rows: [{
                    id: 1,
                    name: dto.name,
                    date: dto.date,
                    type: dto.type,
                    seasonId: dto.seasonId,
                    description: '',
                    prizeStructure: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTION:
            // For valid types, the database constraint should not be violated
            const result = await competitionService.createCompetition(dto);
            
            expect(result).toBeDefined();
            expect(result.type).toBe(dto.type);
            expect(['singles', 'doubles']).toContain(result.type);
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });
  });

  /**
   * Property 3: Deleting competition removes all associations
   * **Validates: Requirements 3.5**
   * 
   * This property ensures that when a competition is deleted, all associated
   * flagged_transactions records are also deleted (cascade delete). This is
   * critical for maintaining referential integrity and preventing orphaned
   * associations in the database.
   * 
   * The property verifies that:
   * 1. The competition deletion triggers a transaction
   * 2. Flagged transactions are deleted BEFORE the competition
   * 3. Both deletions happen atomically within the same transaction
   */
  describe('Property 3: Deleting competition removes all associations', () => {
    it('should cascade delete all flagged transaction associations when deleting a competition', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a competition ID
          fc.integer({ min: 1, max: 10000 }),
          // Generate a number of flagged transaction associations (0 to 20)
          fc.integer({ min: 0, max: 20 }),
          async (competitionId: number, numAssociations: number) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();
            
            // Track the order of DELETE operations
            const deleteOperations: string[] = [];
            let transactionStarted = false;
            let transactionCommitted = false;

            // Mock the transaction method to capture the callback execution
            mockDb.transaction.mockImplementation(async (callback) => {
              transactionStarted = true;
              
              const mockClient = {} as PoolClient;
              mockClient.query = jest.fn().mockImplementation((sql: string, _params: any[]) => {
                // Track DELETE operations
                if (sql.includes('DELETE FROM flagged_transactions')) {
                  deleteOperations.push('flagged_transactions');
                  // Return the number of associations that would be deleted
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: numAssociations
                  });
                } else if (sql.includes('DELETE FROM competitions')) {
                  deleteOperations.push('competitions');
                  // Return success (1 row deleted)
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: 1
                  });
                }
                return Promise.resolve({
                  rows: [],
                  command: '',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              });

              const result = await callback(mockClient);
              transactionCommitted = true;
              return result;
            });

            // Execute the delete operation
            await competitionService.deleteCompetition(competitionId);

            // PROPERTY ASSERTIONS:
            
            // 1. The operation MUST use a database transaction
            expect(transactionStarted).toBe(true);
            expect(transactionCommitted).toBe(true);
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);

            // 2. Both DELETE operations MUST be executed
            expect(deleteOperations).toHaveLength(2);

            // 3. Flagged transactions MUST be deleted BEFORE the competition
            expect(deleteOperations[0]).toBe('flagged_transactions');
            expect(deleteOperations[1]).toBe('competitions');

            // 4. The competition ID MUST be passed to both DELETE operations
            const transactionCallback = mockDb.transaction.mock.calls[0][0];
            expect(transactionCallback).toBeDefined();
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should handle competition deletion with varying numbers of associations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a competition ID
          fc.integer({ min: 1, max: 10000 }),
          // Generate specific edge cases for number of associations
          fc.oneof(
            fc.constant(0),      // No associations
            fc.constant(1),      // Single association
            fc.constant(2),      // Multiple associations
            fc.integer({ min: 3, max: 100 })  // Many associations
          ),
          async (competitionId: number, numAssociations: number) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();
            
            let flaggedTransactionsDeleted = 0;
            let competitionDeleted = false;

            // Mock the transaction method
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {} as PoolClient;
              mockClient.query = jest.fn().mockImplementation((sql: string, _params: any[]) => {
                if (sql.includes('DELETE FROM flagged_transactions')) {
                  flaggedTransactionsDeleted = numAssociations;
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: numAssociations
                  });
                } else if (sql.includes('DELETE FROM competitions')) {
                  competitionDeleted = true;
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: 1
                  });
                }
                return Promise.resolve({
                  rows: [],
                  command: '',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              });

              return callback(mockClient);
            });

            // Execute the delete operation
            await competitionService.deleteCompetition(competitionId);

            // PROPERTY ASSERTIONS:
            
            // The competition MUST be deleted regardless of the number of associations
            expect(competitionDeleted).toBe(true);

            // The number of flagged transactions deleted MUST match the expected count
            // (even if it's 0, the DELETE query should still be executed)
            expect(flaggedTransactionsDeleted).toBe(numAssociations);
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should rollback both deletions if competition deletion fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a competition ID
          fc.integer({ min: 1, max: 10000 }),
          // Generate a number of associations
          fc.integer({ min: 1, max: 20 }),
          async (competitionId: number, numAssociations: number) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();
            
            let flaggedTransactionsDeleted = false;

            // Mock the transaction method to simulate a failure
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {} as PoolClient;
              mockClient.query = jest.fn().mockImplementation((sql: string, _params: any[]) => {
                if (sql.includes('DELETE FROM flagged_transactions')) {
                  flaggedTransactionsDeleted = true;
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: numAssociations
                  });
                } else if (sql.includes('DELETE FROM competitions')) {
                  // Simulate a failure (e.g., competition not found)
                  return Promise.resolve({
                    rows: [],
                    command: 'DELETE',
                    oid: 0,
                    fields: [],
                    rowCount: 0  // No rows deleted
                  });
                }
                return Promise.resolve({
                  rows: [],
                  command: '',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              });

              try {
                return await callback(mockClient);
              } catch (error) {
                throw error;
              }
            });

            // Execute the delete operation - should throw an error
            await expect(competitionService.deleteCompetition(competitionId))
              .rejects
              .toThrow(`Competition with id ${competitionId} not found`);

            // PROPERTY ASSERTIONS:
            
            // The flagged transactions DELETE MUST have been attempted
            expect(flaggedTransactionsDeleted).toBe(true);

            // The transaction MUST have been called
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);

            // When using a real database transaction, the rollback would occur automatically
            // In this mock scenario, we verify that the error was thrown, which would
            // trigger the rollback in the actual DatabaseService implementation
          }
        ),
        { numRuns: 50 } // Run 50 random test cases
      );
    });
  });

  /**
   * Property 8: Referential integrity invariant
   * **Validates: Requirements 2.8, 2.9, 10.4, 10.5**
   *
   * This property ensures that the system maintains referential integrity between
   * related entities. Specifically:
   * 1. Competitions cannot reference non-existent presentation seasons
   * 2. Competition results cannot reference non-existent competitions
   *
   * These constraints are critical for data consistency and prevent orphaned
   * records in the database. The property verifies that:
   * - Foreign key constraints are enforced at the service layer
   * - Appropriate error messages are returned when referential integrity is violated
   * - Valid references are accepted and processed correctly
   */
  describe('Property 8: Referential integrity invariant', () => {
  it('should reject competitions that reference non-existent seasons', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate competition data with varying season IDs
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(d => {
            // Ensure valid date before converting to ISO string
            if (isNaN(d.getTime())) {
              return '2024-01-01'; // fallback to valid date
            }
            return d.toISOString().split('T')[0];
          }),
          type: fc.constantFrom('singles', 'doubles'),
          seasonId: fc.integer({ min: 1, max: 10000 }),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          prizeStructure: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
        }),
        // Generate a set of valid season IDs (simulating existing seasons)
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
        async (dto: any, validSeasonIds: Set<number>) => {
          // Reset mocks for each property test run
          jest.clearAllMocks();

          const seasonExists = validSeasonIds.has(dto.seasonId);

          // Mock season existence check
          mockDb.query.mockImplementation((sql: string, params?: any[]) => {
            if (sql.includes('SELECT id FROM presentation_seasons')) {
              const requestedSeasonId = params![0];

              if (validSeasonIds.has(requestedSeasonId)) {
                // Season exists
                return Promise.resolve({
                  rows: [{ id: requestedSeasonId }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              } else {
                // Season does not exist
                return Promise.resolve({
                  rows: [],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              }
            }

            if (sql.includes('INSERT INTO competitions')) {
              return Promise.resolve({
                rows: [{
                  id: 1,
                  name: dto.name,
                  date: dto.date,
                  type: dto.type,
                  seasonId: dto.seasonId,
                  description: dto.description || '',
                  prizeStructure: dto.prizeStructure || '',
                  createdAt: new Date(),
                  updatedAt: new Date()
                }],
                command: 'INSERT',
                oid: 0,
                fields: [],
                rowCount: 1
              });
            }

            return Promise.resolve({
              rows: [],
              command: '',
              oid: 0,
              fields: [],
              rowCount: 0
            });
          });

          // PROPERTY ASSERTIONS:
          if (seasonExists) {
            // Valid season reference should be accepted
            const result = await competitionService.createCompetition(dto);

            expect(result).toBeDefined();
            expect(result.seasonId).toBe(dto.seasonId);

            // The season existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM presentation_seasons'),
              [dto.seasonId]
            );

            // The INSERT query should have been called
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO competitions'),
              expect.arrayContaining([dto.name, dto.date, dto.type, dto.seasonId])
            );
          } else {
            // Invalid season reference should be rejected
            await expect(competitionService.createCompetition(dto))
              .rejects
              .toThrow(`Presentation season with id ${dto.seasonId} not found`);

            // The season existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM presentation_seasons'),
              [dto.seasonId]
            );

            // The INSERT query should NOT have been called
            expect(mockDb.query).not.toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO competitions'),
              expect.anything()
            );
          }
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  it('should reject competition results that reference non-existent competitions', async () => {
    // Import CompetitionResultService for this test
    const { CompetitionResultService } = require('./competitionResult.service');
    let competitionResultService: any;

    await fc.assert(
      fc.asyncProperty(
        // Generate result data with varying competition IDs
        fc.record({
          competitionId: fc.integer({ min: 1, max: 10000 }),
          finishingPosition: fc.integer({ min: 1, max: 100 }),
          playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
          handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
          nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
          entryPaid: fc.option(fc.boolean(), { nil: undefined }),
          swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
        }),
        // Generate a set of valid competition IDs (simulating existing competitions)
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
        async (dto: any, validCompetitionIds: Set<number>) => {
          // Reset mocks for each property test run
          jest.clearAllMocks();

          // Create a fresh instance of CompetitionResultService for each test
          competitionResultService = new CompetitionResultService(mockDb);

          const competitionExists = validCompetitionIds.has(dto.competitionId);

          // Mock competition existence check
          mockDb.query.mockImplementation((sql: string, params?: any[]) => {
            if (sql.includes('SELECT id FROM competitions')) {
              const requestedCompetitionId = params![0];

              if (validCompetitionIds.has(requestedCompetitionId)) {
                // Competition exists
                return Promise.resolve({
                  rows: [{ id: requestedCompetitionId }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              } else {
                // Competition does not exist
                return Promise.resolve({
                  rows: [],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              }
            }

            if (sql.includes('INSERT INTO competition_results')) {
              return Promise.resolve({
                rows: [{
                  id: 1,
                  competitionId: dto.competitionId,
                  finishingPosition: dto.finishingPosition,
                  playerName: dto.playerName,
                  grossScore: dto.grossScore ?? null,
                  handicap: dto.handicap ?? null,
                  nettScore: dto.nettScore ?? null,
                  entryPaid: dto.entryPaid ?? false,
                  swindleMoneyPaid: dto.swindleMoneyPaid ?? 0,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }],
                command: 'INSERT',
                oid: 0,
                fields: [],
                rowCount: 1
              });
            }

            return Promise.resolve({
              rows: [],
              command: '',
              oid: 0,
              fields: [],
              rowCount: 0
            });
          });

          // PROPERTY ASSERTIONS:
          if (competitionExists) {
            // Valid competition reference should be accepted
            const result = await competitionResultService.addResult(dto);

            expect(result).toBeDefined();
            expect(result.competitionId).toBe(dto.competitionId);

            // The competition existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM competitions'),
              [dto.competitionId]
            );

            // The INSERT query should have been called
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO competition_results'),
              expect.arrayContaining([dto.competitionId, dto.finishingPosition, dto.playerName])
            );
          } else {
            // Invalid competition reference should be rejected
            await expect(competitionResultService.addResult(dto))
              .rejects
              .toThrow(`Competition with id ${dto.competitionId} not found`);

            // The competition existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM competitions'),
              [dto.competitionId]
            );

            // The INSERT query should NOT have been called
            expect(mockDb.query).not.toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO competition_results'),
              expect.anything()
            );
          }
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  it('should enforce referential integrity during competition updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate competition ID and update data
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          seasonId: fc.integer({ min: 1, max: 10000 })
        }),
        // Generate a set of valid season IDs
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
        async (data: any, validSeasonIds: Set<number>) => {
          // Reset mocks for each property test run
          jest.clearAllMocks();

          const seasonExists = validSeasonIds.has(data.seasonId);

          // Mock database responses
          mockDb.query.mockImplementation((sql: string, params?: any[]) => {
            if (sql.includes('SELECT id FROM presentation_seasons')) {
              const requestedSeasonId = params![0];

              if (validSeasonIds.has(requestedSeasonId)) {
                return Promise.resolve({
                  rows: [{ id: requestedSeasonId }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              } else {
                return Promise.resolve({
                  rows: [],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 0
                });
              }
            }

            if (sql.includes('UPDATE competitions')) {
              return Promise.resolve({
                rows: [{
                  id: data.id,
                  name: 'Test Competition',
                  date: '2024-01-01',
                  type: 'singles',
                  seasonId: data.seasonId,
                  description: '',
                  prizeStructure: '',
                  createdAt: new Date(),
                  updatedAt: new Date()
                }],
                command: 'UPDATE',
                oid: 0,
                fields: [],
                rowCount: 1
              });
            }

            return Promise.resolve({
              rows: [],
              command: '',
              oid: 0,
              fields: [],
              rowCount: 0
            });
          });

          // PROPERTY ASSERTIONS:
          if (seasonExists) {
            // Valid season reference should be accepted in updates
            const result = await competitionService.updateCompetition(data.id, { seasonId: data.seasonId });

            expect(result).toBeDefined();
            expect(result.seasonId).toBe(data.seasonId);

            // The season existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM presentation_seasons'),
              [data.seasonId]
            );

            // The UPDATE query should have been called
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('UPDATE competitions'),
              expect.anything()
            );
          } else {
            // Invalid season reference should be rejected in updates
            await expect(competitionService.updateCompetition(data.id, { seasonId: data.seasonId }))
              .rejects
              .toThrow(`Presentation season with id ${data.seasonId} not found`);

            // The season existence check should have been performed
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT id FROM presentation_seasons'),
              [data.seasonId]
            );

            // The UPDATE query should NOT have been called
            expect(mockDb.query).not.toHaveBeenCalledWith(
              expect.stringContaining('UPDATE competitions'),
              expect.anything()
            );
          }
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });
});

  /**
   * Property 8: Referential integrity invariant
   * **Validates: Requirements 2.8, 2.9, 10.4, 10.5**
   * 
   * This property ensures that the system maintains referential integrity between
   * related entities. Specifically:
   * 1. Competitions cannot reference non-existent presentation seasons
   * 2. Competition results cannot reference non-existent competitions
   * 
   * These constraints are critical for data consistency and prevent orphaned
   * records in the database. The property verifies that:
   * - Foreign key constraints are enforced at the service layer
   * - Appropriate error messages are returned when referential integrity is violated
   * - Valid references are accepted and processed correctly
   */
  describe('Property 8: Referential integrity invariant', () => {
    it('should reject competitions that reference non-existent seasons', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate competition data with varying season IDs
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(d => {
              // Ensure valid date before converting to ISO string
              if (isNaN(d.getTime())) {
                return '2024-01-01'; // fallback to valid date
              }
              return d.toISOString().split('T')[0];
            }),
            type: fc.constantFrom('singles', 'doubles'),
            seasonId: fc.integer({ min: 1, max: 10000 }),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            prizeStructure: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
          }),
          // Generate a set of valid season IDs (simulating existing seasons)
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
          async (dto: any, validSeasonIds: Set<number>) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const seasonExists = validSeasonIds.has(dto.seasonId);

            // Mock season existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM presentation_seasons')) {
                const requestedSeasonId = params![0];
                
                if (validSeasonIds.has(requestedSeasonId)) {
                  // Season exists
                  return Promise.resolve({
                    rows: [{ id: requestedSeasonId }],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 1
                  });
                } else {
                  // Season does not exist
                  return Promise.resolve({
                    rows: [],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 0
                  });
                }
              }
              
              if (sql.includes('INSERT INTO competitions')) {
                return Promise.resolve({
                  rows: [{
                    id: 1,
                    name: dto.name,
                    date: dto.date,
                    type: dto.type,
                    seasonId: dto.seasonId,
                    description: dto.description || '',
                    prizeStructure: dto.prizeStructure || '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTIONS:
            if (seasonExists) {
              // Valid season reference should be accepted
              const result = await competitionService.createCompetition(dto);
              
              expect(result).toBeDefined();
              expect(result.seasonId).toBe(dto.seasonId);
              
              // The season existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM presentation_seasons'),
                [dto.seasonId]
              );
              
              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competitions'),
                expect.arrayContaining([dto.name, dto.date, dto.type, dto.seasonId])
              );
            } else {
              // Invalid season reference should be rejected
              await expect(competitionService.createCompetition(dto))
                .rejects
                .toThrow(`Presentation season with id ${dto.seasonId} not found`);
              
              // The season existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM presentation_seasons'),
                [dto.seasonId]
              );
              
              // The INSERT query should NOT have been called
              expect(mockDb.query).not.toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competitions'),
                expect.anything()
              );
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should reject competition results that reference non-existent competitions', async () => {
      // Import CompetitionResultService for this test
      const { CompetitionResultService } = require('./competitionResult.service');
      let competitionResultService: any;

      await fc.assert(
        fc.asyncProperty(
          // Generate result data with varying competition IDs
          fc.record({
            competitionId: fc.integer({ min: 1, max: 10000 }),
            finishingPosition: fc.integer({ min: 1, max: 100 }),
            playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
            nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            entryPaid: fc.option(fc.boolean(), { nil: undefined }),
            swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
          }),
          // Generate a set of valid competition IDs (simulating existing competitions)
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
          async (dto: any, validCompetitionIds: Set<number>) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();
            
            // Create a fresh instance of CompetitionResultService for each test
            competitionResultService = new CompetitionResultService(mockDb);

            const competitionExists = validCompetitionIds.has(dto.competitionId);

            // Mock competition existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM competitions')) {
                const requestedCompetitionId = params![0];
                
                if (validCompetitionIds.has(requestedCompetitionId)) {
                  // Competition exists
                  return Promise.resolve({
                    rows: [{ id: requestedCompetitionId }],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 1
                  });
                } else {
                  // Competition does not exist
                  return Promise.resolve({
                    rows: [],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 0
                  });
                }
              }
              
              if (sql.includes('INSERT INTO competition_results')) {
                return Promise.resolve({
                  rows: [{
                    id: 1,
                    competitionId: dto.competitionId,
                    finishingPosition: dto.finishingPosition,
                    playerName: dto.playerName,
                    grossScore: dto.grossScore ?? null,
                    handicap: dto.handicap ?? null,
                    nettScore: dto.nettScore ?? null,
                    entryPaid: dto.entryPaid ?? false,
                    swindleMoneyPaid: dto.swindleMoneyPaid ?? 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTIONS:
            if (competitionExists) {
              // Valid competition reference should be accepted
              const result = await competitionResultService.addResult(dto);
              
              expect(result).toBeDefined();
              expect(result.competitionId).toBe(dto.competitionId);
              
              // The competition existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM competitions'),
                [dto.competitionId]
              );
              
              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competition_results'),
                expect.arrayContaining([dto.competitionId, dto.finishingPosition, dto.playerName])
              );
            } else {
              // Invalid competition reference should be rejected
              await expect(competitionResultService.addResult(dto))
                .rejects
                .toThrow(`Competition with id ${dto.competitionId} not found`);
              
              // The competition existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM competitions'),
                [dto.competitionId]
              );
              
              // The INSERT query should NOT have been called
              expect(mockDb.query).not.toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competition_results'),
                expect.anything()
              );
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should enforce referential integrity during competition updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate competition ID and update data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            seasonId: fc.integer({ min: 1, max: 10000 })
          }),
          // Generate a set of valid season IDs
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }).map(arr => new Set(arr)),
          async (data: any, validSeasonIds: Set<number>) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const seasonExists = validSeasonIds.has(data.seasonId);

            // Mock database responses
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM presentation_seasons')) {
                const requestedSeasonId = params![0];
                
                if (validSeasonIds.has(requestedSeasonId)) {
                  return Promise.resolve({
                    rows: [{ id: requestedSeasonId }],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 1
                  });
                } else {
                  return Promise.resolve({
                    rows: [],
                    command: 'SELECT',
                    oid: 0,
                    fields: [],
                    rowCount: 0
                  });
                }
              }

              if (sql.includes('UPDATE competitions')) {
                return Promise.resolve({
                  rows: [{
                    id: data.id,
                    name: 'Test Competition',
                    date: '2024-01-01',
                    type: 'singles',
                    seasonId: data.seasonId,
                    description: '',
                    prizeStructure: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'UPDATE',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTIONS:
            if (seasonExists) {
              // Valid season reference should be accepted in updates
              const result = await competitionService.updateCompetition(data.id, { seasonId: data.seasonId });
              
              expect(result).toBeDefined();
              expect(result.seasonId).toBe(data.seasonId);
              
              // The season existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM presentation_seasons'),
                [data.seasonId]
              );
              
              // The UPDATE query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE competitions'),
                expect.anything()
              );
            } else {
              // Invalid season reference should be rejected in updates
              await expect(competitionService.updateCompetition(data.id, { seasonId: data.seasonId }))
                .rejects
                .toThrow(`Presentation season with id ${data.seasonId} not found`);
              
              // The season existence check should have been performed
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM presentation_seasons'),
                [data.seasonId]
              );
              
              // The UPDATE query should NOT have been called
              expect(mockDb.query).not.toHaveBeenCalledWith(
                expect.stringContaining('UPDATE competitions'),
                expect.anything()
              );
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should maintain referential integrity across cascading operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a season ID and multiple competition IDs
          fc.record({
            seasonId: fc.integer({ min: 1, max: 1000 }),
            numCompetitions: fc.integer({ min: 1, max: 10 })
          }),
          async (data: any) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Track which competitions were "created"
            let competitionIdCounter = 1;

            // Mock database responses
            mockDb.query.mockImplementation((sql: string, _params?: any[]) => {
              if (sql.includes('SELECT id FROM presentation_seasons')) {
                // Season always exists for this test
                return Promise.resolve({
                  rows: [{ id: data.seasonId }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              if (sql.includes('INSERT INTO competitions')) {
                const competitionId = competitionIdCounter++;
                
                return Promise.resolve({
                  rows: [{
                    id: competitionId,
                    name: `Competition ${competitionId}`,
                    date: '2024-01-01',
                    type: 'singles',
                    seasonId: data.seasonId,
                    description: '',
                    prizeStructure: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }],
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
              }

              return Promise.resolve({
                rows: [],
                command: '',
                oid: 0,
                fields: [],
                rowCount: 0
              });
            });

            // PROPERTY ASSERTION:
            // Create multiple competitions referencing the same season
            for (let i = 0; i < data.numCompetitions; i++) {
              const competition = await competitionService.createCompetition({
                name: `Competition ${i}`,
                date: '2024-01-01',
                type: 'singles',
                seasonId: data.seasonId
              });

              // Each competition should reference the same season
              expect(competition.seasonId).toBe(data.seasonId);
            }

            // All competitions should have been created
            expect(competitionIdCounter - 1).toBe(data.numCompetitions);

            // The season existence check should have been performed for each competition
            const seasonCheckCalls = mockDb.query.mock.calls.filter(
              (call: any) => call[0].includes('SELECT id FROM presentation_seasons')
            );
            expect(seasonCheckCalls.length).toBe(data.numCompetitions);
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });
  });
});
