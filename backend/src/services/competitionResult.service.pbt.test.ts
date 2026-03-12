import * as fc from 'fast-check';
import { PoolClient } from 'pg';
import { CompetitionResultService } from './competitionResult.service';
import { DatabaseService } from './database.service';
import { CreateResultDTO } from '../types';

/**
 * Property-Based Tests for CompetitionResultService
 * 
 * These tests validate universal properties that should hold for all inputs
 */

// Mock DatabaseService
jest.mock('./database.service');

describe('CompetitionResultService - Property-Based Tests', () => {
  let competitionResultService: CompetitionResultService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    competitionResultService = new CompetitionResultService(mockDb);
  });

  /**
   * Property 12: Required fields invariant
   * **Validates: Requirements 4.6**
   * 
   * This property ensures that the CompetitionResultService correctly enforces
   * required field constraints for competition results. Specifically:
   * 1. finishing_position must be a positive integer (> 0)
   * 2. player_name must be non-empty (not null, not empty string, not whitespace-only)
   * 
   * These constraints are critical for data integrity and ensure that all
   * competition results have the minimum required information to be meaningful.
   * 
   * The property verifies that:
   * - Valid data (positive position, non-empty name) is accepted
   * - Invalid data is rejected with appropriate error messages
   * - Validation occurs before database insertion
   */
  describe('Property 12: Required fields invariant', () => {
    it('should require finishing_position to be a positive integer', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate result data with varying finishing positions
          fc.record({
            competitionId: fc.integer({ min: 1, max: 1000 }),
            finishingPosition: fc.oneof(
              // Valid positive integers
              fc.integer({ min: 1, max: 1000 }),
              // Invalid values: zero, negative, non-integers
              fc.constant(0),
              fc.integer({ min: -1000, max: -1 }),
              fc.constant(null as any),
              fc.constant(undefined as any)
            ),
            playerName: fc.string({ minLength: 1, maxLength: 100 }),
            grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
            nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
            swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
          }),
          async (dto: CreateResultDTO) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const isValidPosition = 
              dto.finishingPosition !== null &&
              dto.finishingPosition !== undefined &&
              Number.isInteger(dto.finishingPosition) &&
              dto.finishingPosition > 0;

            // Mock competition existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM competitions')) {
                return Promise.resolve({
                  rows: [{ id: params![0] }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
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
            if (isValidPosition) {
              // Valid positions should be accepted
              const result = await competitionResultService.addResult(dto);

              // The result should be created successfully
              expect(result).toBeDefined();
              expect(result.finishingPosition).toBe(dto.finishingPosition);

              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competition_results'),
                expect.arrayContaining([
                  dto.competitionId,
                  dto.finishingPosition,
                  dto.playerName
                ])
              );
            } else {
              // Invalid positions should be rejected
              await expect(competitionResultService.addResult(dto))
                .rejects
                .toThrow(/Finishing position/);

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

    it('should require player_name to be non-empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate result data with varying player names
          fc.record({
            competitionId: fc.integer({ min: 1, max: 1000 }),
            finishingPosition: fc.integer({ min: 1, max: 100 }),
            playerName: fc.oneof(
              // Valid non-empty names
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              // Invalid values: empty, whitespace-only, null, undefined
              fc.constant(''),
              fc.constant('   '),
              fc.constant('\t'),
              fc.constant('\n'),
              fc.constant('  \t  \n  '),
              fc.constant(null as any),
              fc.constant(undefined as any)
            ),
            grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
            nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
            swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
          }),
          async (dto: CreateResultDTO) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const isValidName = 
              dto.playerName !== null &&
              dto.playerName !== undefined &&
              typeof dto.playerName === 'string' &&
              dto.playerName.trim().length > 0;

            // Mock competition existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM competitions')) {
                return Promise.resolve({
                  rows: [{ id: params![0] }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
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
            if (isValidName) {
              // Valid names should be accepted
              const result = await competitionResultService.addResult(dto);

              // The result should be created successfully
              expect(result).toBeDefined();
              expect(result.playerName).toBe(dto.playerName);

              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competition_results'),
                expect.arrayContaining([
                  dto.competitionId,
                  dto.finishingPosition,
                  dto.playerName
                ])
              );
            } else {
              // Invalid names should be rejected
              await expect(competitionResultService.addResult(dto))
                .rejects
                .toThrow(/Player name/);

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

    it('should validate both required fields together', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate result data with combinations of valid/invalid required fields
          fc.record({
            competitionId: fc.integer({ min: 1, max: 1000 }),
            finishingPosition: fc.oneof(
              fc.integer({ min: 1, max: 100 }),
              fc.integer({ min: -10, max: 0 }),
              fc.constant(null as any)
            ),
            playerName: fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              fc.constant(''),
              fc.constant('   '),
              fc.constant(null as any)
            ),
            grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
            nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
            entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
            swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
          }),
          async (dto: CreateResultDTO) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const isValidPosition = 
              dto.finishingPosition !== null &&
              dto.finishingPosition !== undefined &&
              Number.isInteger(dto.finishingPosition) &&
              dto.finishingPosition > 0;

            const isValidName = 
              dto.playerName !== null &&
              dto.playerName !== undefined &&
              typeof dto.playerName === 'string' &&
              dto.playerName.trim().length > 0;

            const bothValid = isValidPosition && isValidName;

            // Mock competition existence check
            mockDb.query.mockImplementation((sql: string, params?: any[]) => {
              if (sql.includes('SELECT id FROM competitions')) {
                return Promise.resolve({
                  rows: [{ id: params![0] }],
                  command: 'SELECT',
                  oid: 0,
                  fields: [],
                  rowCount: 1
                });
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
            if (bothValid) {
              // Both fields valid - should succeed
              const result = await competitionResultService.addResult(dto);

              expect(result).toBeDefined();
              expect(result.finishingPosition).toBe(dto.finishingPosition);
              expect(result.playerName).toBe(dto.playerName);

              // The INSERT query should have been called
              expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO competition_results'),
                expect.anything()
              );
            } else {
              // At least one field invalid - should fail
              await expect(competitionResultService.addResult(dto))
                .rejects
                .toThrow();

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

    it('should enforce required fields in bulk operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of result DTOs with varying validity
          fc.array(
            fc.record({
              competitionId: fc.integer({ min: 1, max: 1000 }),
              finishingPosition: fc.oneof(
                fc.integer({ min: 1, max: 100 }),
                fc.integer({ min: -10, max: 0 })
              ),
              playerName: fc.oneof(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                fc.constant(''),
                fc.constant('   ')
              ),
              grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
              handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
              nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
              entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
              swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (dtos: CreateResultDTO[]) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Check if all DTOs are valid
            const allValid = dtos.every(dto => {
              const isValidPosition = 
                dto.finishingPosition !== null &&
                dto.finishingPosition !== undefined &&
                Number.isInteger(dto.finishingPosition) &&
                dto.finishingPosition > 0;

              const isValidName = 
                dto.playerName !== null &&
                dto.playerName !== undefined &&
                typeof dto.playerName === 'string' &&
                dto.playerName.trim().length > 0;

              return isValidPosition && isValidName;
            });

            // Mock transaction
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient: any = {
                query: jest.fn().mockImplementation((sql: string) => {
                  if (sql.includes('INSERT INTO competition_results')) {
                    return Promise.resolve({
                      rows: [],
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
                })
              };

              return callback(mockClient);
            });

            // PROPERTY ASSERTIONS:
            if (allValid) {
              // All valid - bulk operation should succeed
              const result = await competitionResultService.bulkAddResults(dtos);

              expect(result.created).toBe(dtos.length);
              expect(result.errors).toHaveLength(0);
            } else {
              // At least one invalid - bulk operation should fail and rollback
              await expect(competitionResultService.bulkAddResults(dtos))
                .rejects
                .toThrow();
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });
  });

  /**
   * Property 34: Database transaction atomicity
   * **Validates: Requirements 10.10, 12.3**
   * 
   * This property ensures that bulkAddResults operations maintain ACID transaction
   * properties, specifically atomicity. When bulk inserting competition results:
   * 1. Either ALL results are committed to the database
   * 2. OR ALL results are rolled back (no partial updates)
   * 
   * This is critical for data integrity because:
   * - Partial CSV uploads would leave the database in an inconsistent state
   * - Users expect all-or-nothing behavior for bulk operations
   * - Referential integrity must be maintained across all results
   * 
   * The property verifies that:
   * - Successful bulk operations commit all records
   * - Failed bulk operations (due to validation errors, constraint violations, etc.)
   *   leave NO records in the database
   * - Transaction rollback is automatic and complete
   * - No partial state exists after a failed operation
   */
  describe('Property 34: Database transaction atomicity', () => {
    it('should commit all results or rollback all on error', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arrays of results with intentional errors injected
          fc.record({
            validResults: fc.array(
              fc.record({
                competitionId: fc.constant(1),
                finishingPosition: fc.integer({ min: 1, max: 100 }),
                playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
                nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
                swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            shouldFail: fc.boolean(),
            errorPosition: fc.integer({ min: 0, max: 4 })
          }),
          async ({ validResults, shouldFail, errorPosition }) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Create a copy of results and potentially inject an error
            const results = [...validResults];
            
            if (shouldFail && results.length > 0) {
              // Inject an invalid result at errorPosition (or last position if out of bounds)
              const pos = Math.min(errorPosition, results.length - 1);
              results[pos] = {
                ...results[pos],
                finishingPosition: -1 // Invalid: must be positive
              };
            }

            // Track inserted records to verify atomicity
            const insertedRecords: any[] = [];
            let transactionCommitted = false;
            let transactionRolledBack = false;

            // Mock transaction with rollback tracking
            mockDb.transaction.mockImplementation(async (callback: (client: PoolClient) => Promise<unknown>) => {
              const mockClient: any = {
                query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
                  if (sql.includes('INSERT INTO competition_results')) {
                    // Track the insert
                    insertedRecords.push(params);
                    
                    return Promise.resolve({
                      rows: [{
                        id: insertedRecords.length,
                        competitionId: params![0],
                        finishingPosition: params![1],
                        playerName: params![2],
                        grossScore: params![3],
                        handicap: params![4],
                        nettScore: params![5],
                        entryPaid: params![6],
                        swindleMoneyPaid: params![7],
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
                })
              };

              try {
                await callback(mockClient);
                transactionCommitted = true;
              } catch (error) {
                // Simulate rollback by clearing inserted records
                insertedRecords.length = 0;
                transactionRolledBack = true;
                throw error;
              }
            });

            // PROPERTY ASSERTIONS:
            const hasInvalidResult = results.some(dto => {
              const isValidPosition = 
                dto.finishingPosition !== null &&
                dto.finishingPosition !== undefined &&
                Number.isInteger(dto.finishingPosition) &&
                dto.finishingPosition > 0;

              const isValidName = 
                dto.playerName !== null &&
                dto.playerName !== undefined &&
                typeof dto.playerName === 'string' &&
                dto.playerName.trim().length > 0;

              return !isValidPosition || !isValidName;
            });

            if (hasInvalidResult) {
              // ATOMICITY PROPERTY: If any result is invalid, the entire operation should fail
              await expect(competitionResultService.bulkAddResults(results))
                .rejects
                .toThrow();

              // CRITICAL: Transaction must have rolled back
              expect(transactionRolledBack).toBe(true);
              expect(transactionCommitted).toBe(false);

              // CRITICAL: No records should remain after rollback
              expect(insertedRecords).toHaveLength(0);
            } else {
              // ATOMICITY PROPERTY: If all results are valid, all should be committed
              const response = await competitionResultService.bulkAddResults(results);

              // All results should be created
              expect(response.created).toBe(results.length);
              expect(response.errors).toHaveLength(0);

              // Transaction must have committed
              expect(transactionCommitted).toBe(true);
              expect(transactionRolledBack).toBe(false);

              // All records should be inserted
              expect(insertedRecords).toHaveLength(results.length);
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should rollback on database constraint violations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate results that might violate database constraints
          fc.array(
            fc.record({
              competitionId: fc.integer({ min: 1, max: 10 }),
              finishingPosition: fc.integer({ min: 1, max: 100 }),
              playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
              handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
              nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
              entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
              swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.boolean(), // shouldSimulateConstraintViolation
          async (results, shouldSimulateConstraintViolation) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const insertedRecords: any[] = [];
            let transactionRolledBack = false;

            // Mock transaction with constraint violation simulation
            mockDb.transaction.mockImplementation(async (callback: (client: PoolClient) => Promise<unknown>) => {
              const mockClient: any = {
                query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
                  if (sql.includes('INSERT INTO competition_results')) {
                    // Simulate constraint violation on second insert if flag is set
                    if (shouldSimulateConstraintViolation && insertedRecords.length === 1) {
                      throw new Error('Foreign key constraint violation: competition_id does not exist');
                    }

                    insertedRecords.push(params);
                    
                    return Promise.resolve({
                      rows: [{
                        id: insertedRecords.length,
                        competitionId: params![0],
                        finishingPosition: params![1],
                        playerName: params![2],
                        grossScore: params![3],
                        handicap: params![4],
                        nettScore: params![5],
                        entryPaid: params![6],
                        swindleMoneyPaid: params![7],
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
                })
              };

              try {
                await callback(mockClient);
              } catch (error) {
                // Simulate rollback
                insertedRecords.length = 0;
                transactionRolledBack = true;
                throw error;
              }
            });

            // PROPERTY ASSERTIONS:
            if (shouldSimulateConstraintViolation) {
              // ATOMICITY PROPERTY: Database errors should trigger rollback
              await expect(competitionResultService.bulkAddResults(results))
                .rejects
                .toThrow();

              // CRITICAL: Transaction must have rolled back
              expect(transactionRolledBack).toBe(true);

              // CRITICAL: No records should remain after rollback
              expect(insertedRecords).toHaveLength(0);
            } else {
              // ATOMICITY PROPERTY: Without errors, all should commit
              const response = await competitionResultService.bulkAddResults(results);

              expect(response.created).toBe(results.length);
              expect(response.errors).toHaveLength(0);
              expect(insertedRecords).toHaveLength(results.length);
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should maintain atomicity with mixed valid and invalid results', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a mix of valid and invalid results
          fc.tuple(
            fc.array(
              fc.record({
                competitionId: fc.constant(1),
                finishingPosition: fc.integer({ min: 1, max: 100 }),
                playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
                nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
                swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
              }),
              { minLength: 1, maxLength: 3 }
            ),
            fc.integer({ min: 0, max: 2 }) // Position to inject invalid result
          ),
          async ([validResults, invalidPosition]) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Create results array with one invalid result injected
            const results = [...validResults];
            if (results.length > 0) {
              const pos = Math.min(invalidPosition, results.length - 1);
              results.splice(pos, 0, {
                competitionId: 1,
                finishingPosition: 0, // Invalid: must be > 0
                playerName: 'Invalid Result',
                grossScore: undefined,
                handicap: undefined,
                nettScore: undefined,
                entryPaid: undefined,
                swindleMoneyPaid: undefined
              });
            }

            const insertedRecords: any[] = [];
            let transactionRolledBack = false;

            // Mock transaction
            mockDb.transaction.mockImplementation(async (callback: (client: PoolClient) => Promise<unknown>) => {
              const mockClient: any = {
                query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
                  if (sql.includes('INSERT INTO competition_results')) {
                    insertedRecords.push(params);
                    
                    return Promise.resolve({
                      rows: [{
                        id: insertedRecords.length,
                        competitionId: params![0],
                        finishingPosition: params![1],
                        playerName: params![2],
                        grossScore: params![3],
                        handicap: params![4],
                        nettScore: params![5],
                        entryPaid: params![6],
                        swindleMoneyPaid: params![7],
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
                })
              };

              try {
                await callback(mockClient);
              } catch (error) {
                // Simulate rollback
                insertedRecords.length = 0;
                transactionRolledBack = true;
                throw error;
              }
            });

            // PROPERTY ASSERTIONS:
            // With one invalid result, the entire operation should fail
            await expect(competitionResultService.bulkAddResults(results))
              .rejects
              .toThrow();

            // CRITICAL: Transaction must have rolled back
            expect(transactionRolledBack).toBe(true);

            // CRITICAL: No records should remain, even though some were valid
            expect(insertedRecords).toHaveLength(0);

            // ATOMICITY INVARIANT: The number of valid results before the error
            // should NOT equal the number of committed records (should be 0)
            const validBeforeError = results.slice(0, invalidPosition).filter(dto => 
              dto.finishingPosition > 0 && dto.playerName.trim().length > 0
            ).length;
            
            // Even if there were valid results before the error, none should be committed
            if (validBeforeError > 0) {
              expect(insertedRecords.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });

    it('should verify no partial state exists after transaction failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate results with a guaranteed failure point
          fc.record({
            beforeFailure: fc.array(
              fc.record({
                competitionId: fc.constant(1),
                finishingPosition: fc.integer({ min: 1, max: 100 }),
                playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
                nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
                swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            afterFailure: fc.array(
              fc.record({
                competitionId: fc.constant(1),
                finishingPosition: fc.integer({ min: 1, max: 100 }),
                playerName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                grossScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                handicap: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
                nettScore: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
                entryPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
                swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined })
              }),
              { minLength: 0, maxLength: 3 }
            )
          }),
          async ({ beforeFailure, afterFailure }) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            // Create results with invalid result in the middle
            const invalidResult: CreateResultDTO = {
              competitionId: 1,
              finishingPosition: -999, // Invalid
              playerName: 'FAILURE POINT',
              grossScore: undefined,
              handicap: undefined,
              nettScore: undefined,
              entryPaid: undefined,
              swindleMoneyPaid: undefined
            };

            const results = [...beforeFailure, invalidResult, ...afterFailure];

            const insertedRecords: any[] = [];
            const committedRecords: any[] = [];
            let transactionRolledBack = false;

            // Mock transaction with detailed tracking
            mockDb.transaction.mockImplementation(async (callback: (client: PoolClient) => Promise<unknown>) => {
              const mockClient: any = {
                query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
                  if (sql.includes('INSERT INTO competition_results')) {
                    insertedRecords.push(params);
                    
                    return Promise.resolve({
                      rows: [{
                        id: insertedRecords.length,
                        competitionId: params![0],
                        finishingPosition: params![1],
                        playerName: params![2],
                        grossScore: params![3],
                        handicap: params![4],
                        nettScore: params![5],
                        entryPaid: params![6],
                        swindleMoneyPaid: params![7],
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
                })
              };

              try {
                await callback(mockClient);
                // If we get here, transaction would commit
                committedRecords.push(...insertedRecords);
              } catch (error) {
                // Simulate rollback - clear all inserted records
                insertedRecords.length = 0;
                transactionRolledBack = true;
                throw error;
              }
            });

            // PROPERTY ASSERTIONS:
            await expect(competitionResultService.bulkAddResults(results))
              .rejects
              .toThrow();

            // CRITICAL ATOMICITY PROPERTIES:
            
            // 1. Transaction must have rolled back
            expect(transactionRolledBack).toBe(true);

            // 2. No records should be committed
            expect(committedRecords).toHaveLength(0);

            // 3. No partial state should exist (insertedRecords cleared on rollback)
            expect(insertedRecords).toHaveLength(0);

            // 4. Records before failure point should NOT be committed
            expect(committedRecords.length).toBe(0);
            expect(committedRecords.length).not.toBe(beforeFailure.length);

            // 5. Records after failure point should NOT be processed
            expect(committedRecords.length).toBe(0);
            expect(committedRecords.length).not.toBe(beforeFailure.length + afterFailure.length);
          }
        ),
        { numRuns: 100 } // Run 100 random test cases
      );
    });
  });
});

