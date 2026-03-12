/**
 * Property-Based Tests for CompetitionList
 * Tests season filter correctness using fast-check
 */

import fc from 'fast-check';
import { CompetitionList } from './competitionList.js';

describe('CompetitionList - Property-Based Tests', () => {
  describe('Property 10: Season Filter Correctness', () => {
    let competitionList;
    let mockApiClient;

    beforeEach(() => {
      mockApiClient = {
        request: jest.fn()
      };
      competitionList = new CompetitionList(mockApiClient);
    });

    test('should filter competitions to only include those matching the selected season', () => {
      fc.assert(
        fc.property(
          // Generate an array of competitions with random season IDs
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              season_id: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate a season ID to filter by
          fc.integer({ min: 1, max: 20 }),
          (competitions, filterSeasonId) => {
            // Set up the component state
            competitionList.competitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId // Ensure both formats are present
            }));

            // Apply the filter
            competitionList.filterBySeason(filterSeasonId);

            // Verify that all filtered competitions have the correct season ID
            const filtered = competitionList.filteredCompetitions;

            filtered.forEach(comp => {
              const compSeasonId = comp.seasonId || comp.season_id;
              expect(compSeasonId).toBe(filterSeasonId);
            });

            // Verify that no competitions with different season IDs are included
            const expectedCount = competitions.filter(
              comp => (comp.seasonId || comp.season_id) === filterSeasonId
            ).length;

            expect(filtered.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return all competitions when filter is null or undefined', () => {
      fc.assert(
        fc.property(
          // Generate an array of competitions
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              season_id: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (competitions) => {
            // Set up the component state
            competitionList.competitions = competitions;

            // Apply null filter
            competitionList.filterBySeason(null);
            expect(competitionList.filteredCompetitions.length).toBe(competitions.length);

            // Apply undefined filter
            competitionList.filterBySeason(undefined);
            expect(competitionList.filteredCompetitions.length).toBe(competitions.length);

            // Apply 0 filter (falsy but valid)
            competitionList.filterBySeason(0);
            expect(competitionList.filteredCompetitions.length).toBe(competitions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return empty array when no competitions match the filter', () => {
      fc.assert(
        fc.property(
          // Generate competitions with season IDs in range 1-10
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 10 }),
              season_id: fc.integer({ min: 1, max: 10 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (competitions) => {
            // Set up the component state
            competitionList.competitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId
            }));

            // Filter by a season ID that doesn't exist (outside the range)
            const nonExistentSeasonId = 999;
            competitionList.filterBySeason(nonExistentSeasonId);

            expect(competitionList.filteredCompetitions.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve original competitions array when filtering', () => {
      fc.assert(
        fc.property(
          // Generate an array of competitions
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              season_id: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.integer({ min: 1, max: 20 }),
          (competitions, filterSeasonId) => {
            // Set up the component state
            const originalCompetitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId
            }));
            competitionList.competitions = [...originalCompetitions];

            const originalLength = competitionList.competitions.length;

            // Apply the filter
            competitionList.filterBySeason(filterSeasonId);

            // Verify original array is unchanged
            expect(competitionList.competitions.length).toBe(originalLength);
            expect(competitionList.competitions).toEqual(originalCompetitions);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should be idempotent - applying same filter multiple times produces same result', () => {
      fc.assert(
        fc.property(
          // Generate an array of competitions
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              season_id: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 1, max: 20 }),
          (competitions, filterSeasonId) => {
            // Set up the component state
            competitionList.competitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId
            }));

            // Apply the filter multiple times
            competitionList.filterBySeason(filterSeasonId);
            const result1 = [...competitionList.filteredCompetitions];

            competitionList.filterBySeason(filterSeasonId);
            const result2 = [...competitionList.filteredCompetitions];

            competitionList.filterBySeason(filterSeasonId);
            const result3 = [...competitionList.filteredCompetitions];

            // All results should be identical
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle both seasonId and season_id field names', () => {
      fc.assert(
        fc.property(
          // Generate competitions with either field name
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 1, max: 20 }),
          fc.boolean(),
          (competitions, filterSeasonId, useCamelCase) => {
            // Set up competitions with either camelCase or snake_case
            competitionList.competitions = competitions.map(comp => {
              if (useCamelCase) {
                return {
                  ...comp,
                  seasonId: comp.seasonId
                };
              } else {
                return {
                  ...comp,
                  season_id: comp.seasonId
                };
              }
            });

            // Apply the filter
            competitionList.filterBySeason(filterSeasonId);

            // Verify filtering works regardless of field name
            const filtered = competitionList.filteredCompetitions;

            filtered.forEach(comp => {
              const compSeasonId = comp.seasonId || comp.season_id;
              expect(compSeasonId).toBe(filterSeasonId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge case of empty competitions array', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (filterSeasonId) => {
            // Set up empty competitions array
            competitionList.competitions = [];

            // Apply the filter
            competitionList.filterBySeason(filterSeasonId);

            // Should return empty array
            expect(competitionList.filteredCompetitions).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle competitions with all same season ID', () => {
      fc.assert(
        fc.property(
          // Generate competitions all with the same season ID
          fc.integer({ min: 1, max: 20 }),
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (seasonId, competitionTemplates) => {
            // Set up competitions all with the same season ID
            competitionList.competitions = competitionTemplates.map(comp => ({
              ...comp,
              seasonId: seasonId,
              season_id: seasonId
            }));

            // Filter by that season ID
            competitionList.filterBySeason(seasonId);

            // Should return all competitions
            expect(competitionList.filteredCompetitions.length).toBe(competitionList.competitions.length);

            // Filter by a different season ID
            const differentSeasonId = seasonId + 1;
            competitionList.filterBySeason(differentSeasonId);

            // Should return no competitions
            expect(competitionList.filteredCompetitions.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain filter state across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 20 }),
              season_id: fc.integer({ min: 1, max: 20 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 1, max: 20 }),
          (competitions, filterSeasonId) => {
            // Set up the component state
            competitionList.competitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId
            }));

            // Apply the filter
            competitionList.filterBySeason(filterSeasonId);

            // Verify currentSeasonFilter is set
            expect(competitionList.currentSeasonFilter).toBe(filterSeasonId);

            // Verify filtered competitions match
            const expectedFiltered = competitions.filter(
              comp => (comp.seasonId || comp.season_id) === filterSeasonId
            );
            expect(competitionList.filteredCompetitions.length).toBe(expectedFiltered.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle switching between different filters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              type: fc.constantFrom('singles', 'doubles'),
              seasonId: fc.integer({ min: 1, max: 5 }),
              season_id: fc.integer({ min: 1, max: 5 }),
              description: fc.string(),
              resultCount: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 5 }),
          (competitions, filterSequence) => {
            // Set up the component state
            competitionList.competitions = competitions.map(comp => ({
              ...comp,
              seasonId: comp.seasonId,
              season_id: comp.seasonId
            }));

            // Apply filters in sequence
            filterSequence.forEach(filterSeasonId => {
              competitionList.filterBySeason(filterSeasonId);

              // Verify filter is correct after each change
              const expectedFiltered = competitions.filter(
                comp => (comp.seasonId || comp.season_id) === filterSeasonId
              );
              expect(competitionList.filteredCompetitions.length).toBe(expectedFiltered.length);
              expect(competitionList.currentSeasonFilter).toBe(filterSeasonId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
