/**
 * Property-Based Tests for ResultsTable Component
 * Tests correctness properties using fast-check
 */

import fc from 'fast-check';
import { ResultsTable } from './resultsTable.js';

describe('ResultsTable - Property-Based Tests', () => {
  /**
   * Property 13: Result Position Ordering
   * 
   * For any set of competition results, when loaded or updated,
   * the results SHALL always be ordered by finishing_position in ascending order.
   * 
   * Validates: Requirements 4.5
   */
  describe('Property 13: Result position ordering', () => {
    it('should always order results by finishing_position ascending after loadResults', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of results with random positions
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              finishingPosition: fc.integer({ min: 1, max: 100 }),
              playerName: fc.string({ minLength: 1, maxLength: 50 }),
              nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
              grossScore: fc.option(fc.integer({ min: 60, max: 130 }), { nil: null }),
              handicap: fc.option(fc.integer({ min: 0, max: 36 }), { nil: null }),
              entryPaid: fc.boolean(),
              swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 500, noNaN: true }), { nil: null })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.integer({ min: 1, max: 1000 }), // competitionId
          async (results, competitionId) => {
            // Create mock API client
            const mockApiClient = {
              request: async (url, options) => {
                if (url.includes('/api/competition-results')) {
                  return { results: [...results] }; // Return copy to avoid mutation
                }
                throw new Error('Unexpected API call');
              }
            };

            // Create ResultsTable instance
            const resultsTable = new ResultsTable(mockApiClient);

            // Load results
            const loadedResults = await resultsTable.loadResults(competitionId);

            // Property: Results must be ordered by finishing_position ascending
            for (let i = 0; i < loadedResults.length - 1; i++) {
              const currentPos = loadedResults[i].finishingPosition || loadedResults[i].finishing_position;
              const nextPos = loadedResults[i + 1].finishingPosition || loadedResults[i + 1].finishing_position;
              
              // Assert ascending order
              expect(currentPos).toBeLessThanOrEqual(nextPos);
            }

            // Verify all results are present (no data loss)
            expect(loadedResults.length).toBe(results.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain position ordering after addResult', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial results
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              finishingPosition: fc.integer({ min: 1, max: 100 }),
              playerName: fc.string({ minLength: 1, maxLength: 50 }),
              nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
              entryPaid: fc.boolean(),
              swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 500, noNaN: true }), { nil: null })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          // Generate new result to add
          fc.record({
            id: fc.integer({ min: 10001, max: 20000 }),
            finishingPosition: fc.integer({ min: 1, max: 100 }),
            playerName: fc.string({ minLength: 1, maxLength: 50 }),
            nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
            entryPaid: fc.boolean()
          }),
          fc.integer({ min: 1, max: 1000 }), // competitionId
          async (initialResults, newResult, competitionId) => {
            // Create mock API client
            const mockApiClient = {
              request: async (url, options) => {
                if (url.includes('/api/competition-results') && options.method === 'GET') {
                  return { results: [...initialResults] };
                }
                if (url.includes('/api/competition-results') && options.method === 'POST') {
                  return { result: newResult };
                }
                throw new Error('Unexpected API call');
              }
            };

            // Create ResultsTable instance with mock container
            const container = document.createElement('div');
            container.id = 'results-table-container';
            document.body.appendChild(container);

            const resultsTable = new ResultsTable(mockApiClient);
            resultsTable.container = container;

            // Load initial results
            await resultsTable.loadResults(competitionId);

            // Add new result
            const dto = {
              competitionId,
              finishingPosition: newResult.finishingPosition,
              playerName: newResult.playerName,
              nettScore: newResult.nettScore,
              entryPaid: newResult.entryPaid
            };

            await resultsTable.addResult(dto);

            // Property: Results must be ordered by finishing_position ascending
            const finalResults = resultsTable.results;
            for (let i = 0; i < finalResults.length - 1; i++) {
              const currentPos = finalResults[i].finishingPosition || finalResults[i].finishing_position;
              const nextPos = finalResults[i + 1].finishingPosition || finalResults[i + 1].finishing_position;
              
              // Assert ascending order
              expect(currentPos).toBeLessThanOrEqual(nextPos);
            }

            // Verify new result was added
            expect(finalResults.length).toBe(initialResults.length + 1);

            // Cleanup
            document.body.removeChild(container);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain position ordering after updateResult', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial results
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              finishingPosition: fc.integer({ min: 1, max: 100 }),
              playerName: fc.string({ minLength: 1, maxLength: 50 }),
              nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
              entryPaid: fc.boolean(),
              swindleMoneyPaid: fc.option(fc.float({ min: 0, max: 500, noNaN: true }), { nil: null })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 1, max: 100 }), // new finishing position
          fc.integer({ min: 1, max: 1000 }), // competitionId
          async (initialResults, newPosition, competitionId) => {
            // Select a result to update
            const resultToUpdate = initialResults[0];
            const updatedResult = {
              ...resultToUpdate,
              finishingPosition: newPosition
            };

            // Create mock API client
            const mockApiClient = {
              request: async (url, options) => {
                if (url.includes('/api/competition-results') && options.method === 'GET') {
                  return { results: [...initialResults] };
                }
                if (url.includes(`/api/competition-results/${resultToUpdate.id}`) && options.method === 'PUT') {
                  return { result: updatedResult };
                }
                throw new Error('Unexpected API call');
              }
            };

            // Create ResultsTable instance with mock container
            const container = document.createElement('div');
            container.id = 'results-table-container';
            document.body.appendChild(container);

            const resultsTable = new ResultsTable(mockApiClient);
            resultsTable.container = container;

            // Load initial results
            await resultsTable.loadResults(competitionId);

            // Update result position
            await resultsTable.updateResult(resultToUpdate.id, {
              finishingPosition: newPosition
            });

            // Property: Results must be ordered by finishing_position ascending
            const finalResults = resultsTable.results;
            for (let i = 0; i < finalResults.length - 1; i++) {
              const currentPos = finalResults[i].finishingPosition || finalResults[i].finishing_position;
              const nextPos = finalResults[i + 1].finishingPosition || finalResults[i + 1].finishing_position;
              
              // Assert ascending order
              expect(currentPos).toBeLessThanOrEqual(nextPos);
            }

            // Verify result count unchanged
            expect(finalResults.length).toBe(initialResults.length);

            // Cleanup
            document.body.removeChild(container);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle ties (same finishing position) correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate results with potential ties
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              finishingPosition: fc.integer({ min: 1, max: 10 }), // Smaller range to increase tie probability
              playerName: fc.string({ minLength: 1, maxLength: 50 }),
              nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
              entryPaid: fc.boolean()
            }),
            { minLength: 2, maxLength: 30 }
          ),
          fc.integer({ min: 1, max: 1000 }), // competitionId
          async (results, competitionId) => {
            // Create mock API client
            const mockApiClient = {
              request: async (url, options) => {
                if (url.includes('/api/competition-results')) {
                  return { results: [...results] };
                }
                throw new Error('Unexpected API call');
              }
            };

            // Create ResultsTable instance
            const resultsTable = new ResultsTable(mockApiClient);

            // Load results
            const loadedResults = await resultsTable.loadResults(competitionId);

            // Property: Results must be ordered by finishing_position ascending (ties allowed)
            for (let i = 0; i < loadedResults.length - 1; i++) {
              const currentPos = loadedResults[i].finishingPosition || loadedResults[i].finishing_position;
              const nextPos = loadedResults[i + 1].finishingPosition || loadedResults[i + 1].finishing_position;
              
              // Assert non-decreasing order (allows ties)
              expect(currentPos).toBeLessThanOrEqual(nextPos);
            }

            // Verify all results are present
            expect(loadedResults.length).toBe(results.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve ordering invariant with mixed snake_case and camelCase fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate results with mixed field naming conventions
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              // Randomly use snake_case or camelCase
              finishingPosition: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
              finishing_position: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
              playerName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              player_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              nettScore: fc.option(fc.integer({ min: 50, max: 120 }), { nil: null }),
              entryPaid: fc.boolean()
            }),
            { minLength: 1, maxLength: 30 }
          ).map(results => 
            // Ensure each result has at least one position field
            results.map(r => ({
              ...r,
              finishingPosition: r.finishingPosition || r.finishing_position || 1,
              playerName: r.playerName || r.player_name || 'Player'
            }))
          ),
          fc.integer({ min: 1, max: 1000 }), // competitionId
          async (results, competitionId) => {
            // Create mock API client
            const mockApiClient = {
              request: async (url, options) => {
                if (url.includes('/api/competition-results')) {
                  return { results: [...results] };
                }
                throw new Error('Unexpected API call');
              }
            };

            // Create ResultsTable instance
            const resultsTable = new ResultsTable(mockApiClient);

            // Load results
            const loadedResults = await resultsTable.loadResults(competitionId);

            // Property: Results must be ordered by finishing_position ascending
            // regardless of field naming convention
            for (let i = 0; i < loadedResults.length - 1; i++) {
              const currentPos = loadedResults[i].finishingPosition || loadedResults[i].finishing_position;
              const nextPos = loadedResults[i + 1].finishingPosition || loadedResults[i + 1].finishing_position;
              
              // Assert ascending order
              expect(currentPos).toBeLessThanOrEqual(nextPos);
            }

            // Verify all results are present
            expect(loadedResults.length).toBe(results.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
