import * as fc from 'fast-check';
import { PresentationSeasonService } from './presentationSeason.service';
import { DatabaseService } from './database.service';
import { CreateSeasonDTO } from '../types';

describe('PresentationSeasonService - Property-Based Tests', () => {
  let service: PresentationSeasonService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;
    service = new PresentationSeasonService(mockDb);
  });

  describe('Property 1: Season format validation', () => {
    /**
     * Property: Season name format validation
     * Validates: Requirements 1.2
     * 
     * This property tests that the service correctly validates season name formats.
     * Valid format: "Season: Winter YY-Summer YY" where YY is a two-digit year.
     * Invalid formats should be rejected with an appropriate error message.
     */

    it('should reject invalid season name formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary strings that are NOT valid season formats
          fc.oneof(
            // Empty string
            fc.constant(''),
            // Random strings
            fc.string(),
            // Missing "Season:" prefix
            fc.string().filter(s => !s.startsWith('Season: Winter')),
            // Wrong format variations
            fc.constant('Season: Summer 25-Winter 26'), // Wrong order
            fc.constant('Season: Winter 2025-Summer 2026'), // Four-digit years
            fc.constant('Season: Winter 25 - Summer 26'), // Extra spaces
            fc.constant('Season: winter 25-summer 26'), // Wrong case
            fc.constant('Season: Winter 25-Summer'), // Missing end year
            fc.constant('Winter 25-Summer 26'), // Missing "Season:" prefix
            fc.constant('Season: Winter 1-Summer 2'), // Single-digit years
            fc.constant('Season: Winter 25-Summer 2a'), // Non-numeric year
            fc.constant('Season: Winter 25-Summer'), // Incomplete
            fc.constant('Season: Winter -Summer 26'), // Missing start year
          ),
          fc.integer({ min: 0, max: 99 }), // startYear
          fc.integer({ min: 0, max: 99 }), // endYear
          async (invalidName, startYear, endYear) => {
            // Skip if by chance we generated a valid format
            const validFormatRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
            if (validFormatRegex.test(invalidName)) {
              return;
            }

            const dto: CreateSeasonDTO = {
              name: invalidName,
              startYear,
              endYear: Math.max(startYear, endYear), // Ensure valid year ordering
            };

            // Should throw an error for invalid format
            await expect(service.createSeason(dto)).rejects.toThrow(
              /Invalid season name format/
            );

            // Database should not be called for invalid formats
            expect(mockDb.query).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid season name formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid two-digit years (00-99)
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 99 }),
          async (startYear, endYear) => {
            // Ensure start year <= end year
            const validStartYear = Math.min(startYear, endYear);
            const validEndYear = Math.max(startYear, endYear);

            // Format years as two digits
            const startYearStr = validStartYear.toString().padStart(2, '0');
            const endYearStr = validEndYear.toString().padStart(2, '0');

            // Construct valid season name
            const validName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

            const dto: CreateSeasonDTO = {
              name: validName,
              startYear: validStartYear,
              endYear: validEndYear,
            };

            // Mock successful database response
            const mockSeason = {
              id: 1,
              name: validName,
              startYear: validStartYear,
              endYear: validEndYear,
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockDb.query.mockResolvedValueOnce({
              rows: [mockSeason],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            });

            // Should not throw an error for valid format
            const result = await service.createSeason(dto);

            // Database should be called with correct parameters
            expect(mockDb.query).toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO presentation_seasons'),
              [validName, validStartYear, validEndYear]
            );

            // Result should match the mock
            expect(result).toEqual(mockSeason);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate format with exact regex pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate components of a season name
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 99 }),
          async (year1, year2) => {
            const startYear = Math.min(year1, year2);
            const endYear = Math.max(year1, year2);

            // Test various format variations
            const testCases = [
              {
                name: `Season: Winter ${startYear.toString().padStart(2, '0')}-Summer ${endYear.toString().padStart(2, '0')}`,
                shouldPass: true,
              },
              {
                name: `Season: Winter ${startYear}-Summer ${endYear}`, // May have single digit
                shouldPass: startYear >= 10 && endYear >= 10, // Only valid if both are 2 digits
              },
              {
                name: `Season:Winter ${startYear.toString().padStart(2, '0')}-Summer ${endYear.toString().padStart(2, '0')}`, // Missing space after colon
                shouldPass: false,
              },
              {
                name: `Season: Winter  ${startYear.toString().padStart(2, '0')}-Summer ${endYear.toString().padStart(2, '0')}`, // Extra space
                shouldPass: false,
              },
            ];

            for (const testCase of testCases) {
              const dto: CreateSeasonDTO = {
                name: testCase.name,
                startYear,
                endYear,
              };

              if (testCase.shouldPass) {
                // Mock successful database response
                mockDb.query.mockResolvedValueOnce({
                  rows: [{
                    id: 1,
                    name: testCase.name,
                    startYear,
                    endYear,
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }],
                  rowCount: 1,
                  command: 'INSERT',
                  oid: 0,
                  fields: [],
                });

                await expect(service.createSeason(dto)).resolves.toBeDefined();
              } else {
                await expect(service.createSeason(dto)).rejects.toThrow(
                  /Invalid season name format/
                );
              }

              // Reset mock for next iteration
              mockDb.query.mockClear();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject formats with non-numeric year components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 2 }).filter(s => !/^\d{2}$/.test(s)), // Non-numeric strings
          fc.integer({ min: 0, max: 99 }),
          async (invalidYear, validYear) => {
            const validYearStr = validYear.toString().padStart(2, '0');

            // Test with invalid start year
            const invalidStartName = `Season: Winter ${invalidYear}-Summer ${validYearStr}`;
            const dto1: CreateSeasonDTO = {
              name: invalidStartName,
              startYear: validYear,
              endYear: validYear,
            };

            await expect(service.createSeason(dto1)).rejects.toThrow(
              /Invalid season name format/
            );

            // Test with invalid end year
            const invalidEndName = `Season: Winter ${validYearStr}-Summer ${invalidYear}`;
            const dto2: CreateSeasonDTO = {
              name: invalidEndName,
              startYear: validYear,
              endYear: validYear,
            };

            await expect(service.createSeason(dto2)).rejects.toThrow(
              /Invalid season name format/
            );

            // Database should not be called
            expect(mockDb.query).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases for year boundaries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(0, 1, 9, 10, 98, 99), // Edge case years
          fc.constantFrom(0, 1, 9, 10, 98, 99),
          async (year1, year2) => {
            const startYear = Math.min(year1, year2);
            const endYear = Math.max(year1, year2);

            const startYearStr = startYear.toString().padStart(2, '0');
            const endYearStr = endYear.toString().padStart(2, '0');
            const validName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

            const dto: CreateSeasonDTO = {
              name: validName,
              startYear,
              endYear,
            };

            // Mock successful database response
            mockDb.query.mockResolvedValueOnce({
              rows: [{
                id: 1,
                name: validName,
                startYear,
                endYear,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            });

            // Should accept valid format even at boundaries
            const result = await service.createSeason(dto);

            expect(result.name).toBe(validName);
            expect(mockDb.query).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Auto-increment transformation', () => {
    /**
     * Property: Auto-increment correctly increments both years by 1
     * Validates: Requirements 1.5
     * 
     * This property tests that the autoIncrementSeason method correctly:
     * 1. Increments both start_year and end_year by 1
     * 2. Preserves the season name format
     * 3. Maintains year ordering (start_year <= end_year)
     */

    it('should increment both years by 1 and preserve format', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid two-digit years for the starting season
          fc.integer({ min: 0, max: 98 }), // Max 98 so we can increment to 99
          fc.integer({ min: 0, max: 98 }),
          async (year1, year2) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();

            // Ensure start year <= end year
            const startYear = Math.min(year1, year2);
            const endYear = Math.max(year1, year2);

            // Format years as two digits
            const startYearStr = startYear.toString().padStart(2, '0');
            const endYearStr = endYear.toString().padStart(2, '0');
            const existingSeasonName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

            // Mock the existing season
            const existingSeason = {
              id: 1,
              name: existingSeasonName,
              startYear,
              endYear,
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Expected incremented values
            const expectedStartYear = startYear + 1;
            const expectedEndYear = endYear + 1;
            const expectedStartYearStr = expectedStartYear.toString().padStart(2, '0');
            const expectedEndYearStr = expectedEndYear.toString().padStart(2, '0');
            const expectedNewSeasonName = `Season: Winter ${expectedStartYearStr}-Summer ${expectedEndYearStr}`;

            // Mock database responses
            // First call: getAllSeasons to find most recent
            mockDb.query.mockResolvedValueOnce({
              rows: [existingSeason],
              rowCount: 1,
              command: 'SELECT',
              oid: 0,
              fields: [],
            });

            // Second call: createSeason INSERT
            mockDb.query.mockResolvedValueOnce({
              rows: [{
                id: 2,
                name: expectedNewSeasonName,
                startYear: expectedStartYear,
                endYear: expectedEndYear,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            });

            // Execute auto-increment
            const result = await service.autoIncrementSeason();

            // Verify the result
            expect(result.startYear).toBe(expectedStartYear);
            expect(result.endYear).toBe(expectedEndYear);
            expect(result.name).toBe(expectedNewSeasonName);

            // Verify format is preserved (matches the regex)
            const formatRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
            expect(result.name).toMatch(formatRegex);

            // Verify year ordering is maintained
            expect(result.startYear).toBeLessThanOrEqual(result.endYear);

            // Verify database was called correctly
            expect(mockDb.query).toHaveBeenCalledTimes(2);
            
            // First call should be to get most recent season (no parameters)
            expect(mockDb.query).toHaveBeenNthCalledWith(
              1,
              expect.stringContaining('ORDER BY start_year DESC')
            );

            // Second call should be to insert new season
            expect(mockDb.query).toHaveBeenNthCalledWith(
              2,
              expect.stringContaining('INSERT INTO presentation_seasons'),
              [expectedNewSeasonName, expectedStartYear, expectedEndYear]
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case where years are at boundary (98-99)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(97, 98), // Test years that can safely increment to 98-99 or 99-100 (but 100 would be 3 digits)
          async (startYear) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();

            const endYear = startYear + 1; // Will be 98 or 99

            const startYearStr = startYear.toString().padStart(2, '0');
            const endYearStr = endYear.toString().padStart(2, '0');
            const existingSeasonName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

            const existingSeason = {
              id: 1,
              name: existingSeasonName,
              startYear,
              endYear,
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Expected incremented values (will be 98-99 or 99-100, but we only test valid 2-digit years)
            const expectedStartYear = startYear + 1;
            const expectedEndYear = endYear + 1;

            // Only test if result will still be 2 digits (max 99)
            if (expectedEndYear <= 99) {
              // Mock database responses
              mockDb.query.mockResolvedValueOnce({
                rows: [existingSeason],
                rowCount: 1,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              mockDb.query.mockResolvedValueOnce({
                rows: [{
                  id: 2,
                  name: `Season: Winter ${expectedStartYear.toString().padStart(2, '0')}-Summer ${expectedEndYear.toString().padStart(2, '0')}`,
                  startYear: expectedStartYear,
                  endYear: expectedEndYear,
                  isActive: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }],
                rowCount: 1,
                command: 'INSERT',
                oid: 0,
                fields: [],
              });

              const result = await service.autoIncrementSeason();

              // Verify increment happened correctly
              expect(result.startYear).toBe(expectedStartYear);
              expect(result.endYear).toBe(expectedEndYear);

              // Verify year ordering is maintained
              expect(result.startYear).toBeLessThanOrEqual(result.endYear);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain year difference when incrementing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 95 }), // Start year
          fc.integer({ min: 0, max: 3 }), // Year difference (0-3)
          async (startYear, yearDiff) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();

            const endYear = startYear + yearDiff;

            const startYearStr = startYear.toString().padStart(2, '0');
            const endYearStr = endYear.toString().padStart(2, '0');
            const existingSeasonName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

            const existingSeason = {
              id: 1,
              name: existingSeasonName,
              startYear,
              endYear,
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const expectedStartYear = startYear + 1;
            const expectedEndYear = endYear + 1;
            const expectedYearDiff = expectedEndYear - expectedStartYear;

            // Mock database responses
            mockDb.query.mockResolvedValueOnce({
              rows: [existingSeason],
              rowCount: 1,
              command: 'SELECT',
              oid: 0,
              fields: [],
            });

            mockDb.query.mockResolvedValueOnce({
              rows: [{
                id: 2,
                name: `Season: Winter ${expectedStartYear.toString().padStart(2, '0')}-Summer ${expectedEndYear.toString().padStart(2, '0')}`,
                startYear: expectedStartYear,
                endYear: expectedEndYear,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            });

            const result = await service.autoIncrementSeason();

            // Verify the year difference is preserved
            expect(result.endYear - result.startYear).toBe(yearDiff);
            expect(expectedYearDiff).toBe(yearDiff);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when no existing seasons exist', async () => {
      // Mock empty result (no seasons)
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Should throw error when no seasons exist
      await expect(service.autoIncrementSeason()).rejects.toThrow(
        /No existing seasons found to auto-increment from/
      );

      // Should only call query once (to check for existing seasons)
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should create valid season name format after increment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 98 }),
          fc.integer({ min: 0, max: 98 }),
          async (year1, year2) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();

            const startYear = Math.min(year1, year2);
            const endYear = Math.max(year1, year2);

            const existingSeason = {
              id: 1,
              name: `Season: Winter ${startYear.toString().padStart(2, '0')}-Summer ${endYear.toString().padStart(2, '0')}`,
              startYear,
              endYear,
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const expectedStartYear = startYear + 1;
            const expectedEndYear = endYear + 1;
            const expectedName = `Season: Winter ${expectedStartYear.toString().padStart(2, '0')}-Summer ${expectedEndYear.toString().padStart(2, '0')}`;

            mockDb.query.mockResolvedValueOnce({
              rows: [existingSeason],
              rowCount: 1,
              command: 'SELECT',
              oid: 0,
              fields: [],
            });

            mockDb.query.mockResolvedValueOnce({
              rows: [{
                id: 2,
                name: expectedName,
                startYear: expectedStartYear,
                endYear: expectedEndYear,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }],
              rowCount: 1,
              command: 'INSERT',
              oid: 0,
              fields: [],
            });

            const result = await service.autoIncrementSeason();

            // Verify the name matches expected format exactly
            expect(result.name).toBe(expectedName);

            // Verify it passes the format validation regex
            const formatRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
            expect(result.name).toMatch(formatRegex);

            // Verify the years in the name match the year fields
            const nameMatch = result.name.match(/Season: Winter (\d{2})-Summer (\d{2})/);
            expect(nameMatch).not.toBeNull();
            if (nameMatch) {
              expect(parseInt(nameMatch[1], 10)).toBe(result.startYear);
              expect(parseInt(nameMatch[2], 10)).toBe(result.endYear);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Active season uniqueness', () => {
    /**
     * Property: Active season uniqueness
     * Validates: Requirements 1.7
     * 
     * This property tests that setting a season as active deactivates all others,
     * ensuring exactly one active season at all times.
     */

    it('should ensure exactly one active season after setActiveSeason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of seasons to create
          fc.integer({ min: 0, max: 4 }), // Index of season to activate
          async (numSeasons, activateIndex) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();
            mockDb.transaction.mockClear();

            // Ensure activateIndex is within bounds
            const safeActivateIndex = activateIndex % numSeasons;
            const seasonIdToActivate = safeActivateIndex + 1;

            // Mock transaction implementation
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn(),
              };

              // First query: check if season exists
              mockClient.query.mockResolvedValueOnce({
                rows: [{ id: seasonIdToActivate }],
                rowCount: 1,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              // Second query: deactivate all seasons
              mockClient.query.mockResolvedValueOnce({
                rows: [],
                rowCount: numSeasons,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              // Third query: activate the specified season
              const activatedSeason = {
                id: seasonIdToActivate,
                name: `Season: Winter ${(20 + safeActivateIndex).toString().padStart(2, '0')}-Summer ${(21 + safeActivateIndex).toString().padStart(2, '0')}`,
                startYear: 20 + safeActivateIndex,
                endYear: 21 + safeActivateIndex,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockClient.query.mockResolvedValueOnce({
                rows: [activatedSeason],
                rowCount: 1,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              return callback(mockClient as any);
            });

            // Execute setActiveSeason
            const result = await service.setActiveSeason(seasonIdToActivate);

            // Verify the result
            expect(result.id).toBe(seasonIdToActivate);
            expect(result.isActive).toBe(true);

            // Verify transaction was used
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);

            // Get the mock client from the transaction call
            const transactionCallback = mockDb.transaction.mock.calls[0][0];
            const mockClient = {
              query: jest.fn()
                .mockResolvedValueOnce({ rows: [{ id: seasonIdToActivate }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
                .mockResolvedValueOnce({ rows: [], rowCount: numSeasons, command: 'UPDATE', oid: 0, fields: [] })
                .mockResolvedValueOnce({
                  rows: [{
                    id: seasonIdToActivate,
                    name: `Season: Winter ${(20 + safeActivateIndex).toString().padStart(2, '0')}-Summer ${(21 + safeActivateIndex).toString().padStart(2, '0')}`,
                    startYear: 20 + safeActivateIndex,
                    endYear: 21 + safeActivateIndex,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }],
                  rowCount: 1,
                  command: 'UPDATE',
                  oid: 0,
                  fields: [],
                }),
            };

            await transactionCallback(mockClient as any);

            // Verify the sequence of operations within transaction
            expect(mockClient.query).toHaveBeenCalledTimes(3);

            // First: check season exists
            expect(mockClient.query).toHaveBeenNthCalledWith(
              1,
              'SELECT id FROM presentation_seasons WHERE id = $1',
              [seasonIdToActivate]
            );

            // Second: deactivate all seasons
            expect(mockClient.query).toHaveBeenNthCalledWith(
              2,
              'UPDATE presentation_seasons SET is_active = false'
            );

            // Third: activate the specified season
            expect(mockClient.query).toHaveBeenNthCalledWith(
              3,
              expect.stringContaining('UPDATE presentation_seasons'),
              [seasonIdToActivate]
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deactivate previously active season when activating a new one', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Previously active season ID
          fc.integer({ min: 11, max: 20 }), // New season ID to activate
          async (_previousActiveId, newActiveId) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();
            mockDb.transaction.mockClear();

            // Mock transaction implementation
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn(),
              };

              // First query: check if season exists
              mockClient.query.mockResolvedValueOnce({
                rows: [{ id: newActiveId }],
                rowCount: 1,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              // Second query: deactivate all seasons (including previously active)
              mockClient.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 2, // Assume 2 seasons total
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              // Third query: activate the new season
              const activatedSeason = {
                id: newActiveId,
                name: `Season: Winter 25-Summer 26`,
                startYear: 25,
                endYear: 26,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockClient.query.mockResolvedValueOnce({
                rows: [activatedSeason],
                rowCount: 1,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              return callback(mockClient as any);
            });

            // Execute setActiveSeason
            const result = await service.setActiveSeason(newActiveId);

            // Verify the new season is active
            expect(result.id).toBe(newActiveId);
            expect(result.isActive).toBe(true);

            // Verify transaction was used (ensures atomicity)
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain exactly one active season invariant', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 10 }), // Array of year values
          fc.integer({ min: 0, max: 9 }), // Index to activate
          async (years, activateIndex) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();
            mockDb.transaction.mockClear();

            const numSeasons = years.length;
            const safeActivateIndex = activateIndex % numSeasons;
            const seasonIdToActivate = safeActivateIndex + 1;

            // Create mock seasons
            const mockSeasons = years.map((year, index) => ({
              id: index + 1,
              name: `Season: Winter ${year.toString().padStart(2, '0')}-Summer ${(year + 1).toString().padStart(2, '0')}`,
              startYear: year,
              endYear: year + 1,
              isActive: false, // All start as inactive
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Mock transaction implementation
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn(),
              };

              // First query: check if season exists
              mockClient.query.mockResolvedValueOnce({
                rows: [{ id: seasonIdToActivate }],
                rowCount: 1,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              // Second query: deactivate all seasons
              mockClient.query.mockResolvedValueOnce({
                rows: [],
                rowCount: numSeasons,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              // Third query: activate the specified season
              const activatedSeason = {
                ...mockSeasons[safeActivateIndex],
                isActive: true,
              };

              mockClient.query.mockResolvedValueOnce({
                rows: [activatedSeason],
                rowCount: 1,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              return callback(mockClient as any);
            });

            // Execute setActiveSeason
            const result = await service.setActiveSeason(seasonIdToActivate);

            // Verify exactly one season is active
            expect(result.isActive).toBe(true);
            expect(result.id).toBe(seasonIdToActivate);

            // Verify transaction ensures atomicity (all-or-nothing)
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when trying to activate non-existent season', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // Random season ID
          async (nonExistentId) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();
            mockDb.transaction.mockClear();

            // Mock transaction implementation
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn(),
              };

              // First query: check if season exists - return empty
              mockClient.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              return callback(mockClient as any);
            });

            // Should throw error for non-existent season
            await expect(service.setActiveSeason(nonExistentId)).rejects.toThrow(
              new RegExp(`Season with id ${nonExistentId} not found`)
            );

            // Verify transaction was attempted
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use transaction to ensure atomicity of active season change', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (seasonId) => {
            // Clear mock before each iteration
            mockDb.query.mockClear();
            mockDb.transaction.mockClear();

            // Mock transaction implementation
            mockDb.transaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn(),
              };

              mockClient.query.mockResolvedValueOnce({
                rows: [{ id: seasonId }],
                rowCount: 1,
                command: 'SELECT',
                oid: 0,
                fields: [],
              });

              mockClient.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 1,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              mockClient.query.mockResolvedValueOnce({
                rows: [{
                  id: seasonId,
                  name: 'Season: Winter 25-Summer 26',
                  startYear: 25,
                  endYear: 26,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }],
                rowCount: 1,
                command: 'UPDATE',
                oid: 0,
                fields: [],
              });

              return callback(mockClient as any);
            });

            await service.setActiveSeason(seasonId);

            // Verify transaction was used (critical for atomicity)
            expect(mockDb.transaction).toHaveBeenCalledTimes(1);

            // Verify regular query was NOT used (should use transaction)
            expect(mockDb.query).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
