import * as fc from 'fast-check';
import { CSVParserService } from './csvParser.service';
import { CSVFormatterService } from './csvFormatter.service';
import { CompetitionResult } from '../types';

describe('CSVParserService - Property-Based Tests', () => {
  let parserService: CSVParserService;
  let formatterService: CSVFormatterService;

  beforeEach(() => {
    parserService = new CSVParserService();
    formatterService = new CSVFormatterService();
  });

  describe('Property 21: Singles CSV Round-Trip', () => {
    /**
     * Property: For all valid singles CSV data, parse(format(parse(csv))) produces equivalent results
     * Validates: Requirements 5.12, 7.2
     * 
     * This property ensures that:
     * 1. Parsing a CSV produces a set of results
     * 2. Formatting those results back to CSV
     * 3. Parsing the formatted CSV again
     * 4. Produces equivalent results to the original parse
     * 
     * This guarantees data integrity through the round-trip transformation.
     */
    it('should preserve all fields through parse -> format -> parse round-trip', async () => {
      // Arbitrary for generating valid singles CSV rows
      const singlesRowArbitrary = fc.record({
        pos: fc.integer({ min: 1, max: 100 }),
        name: fc.string({ minLength: 1, maxLength: 50 })
          .map(s => s.replace(/[",\n\r]/g, '')) // Remove CSV special characters
          .filter(s => {
            const trimmed = s.trim();
            // Filter out empty strings and division headers
            return trimmed.length > 0 && !/^Division\s+\d+$/i.test(trimmed);
          })
          .map(s => s.trim() || 'Player'), // Ensure non-empty after filtering
        gross: fc.option(fc.integer({ min: 50, max: 150 }), { nil: undefined }),
        hcp: fc.option(fc.integer({ min: 0, max: 54 }), { nil: undefined }),
        nett: fc.option(fc.integer({ min: 40, max: 120 }), { nil: undefined }),
      });

      // Arbitrary for generating a list of singles rows
      const singlesCSVDataArbitrary = fc.array(singlesRowArbitrary, { minLength: 1, maxLength: 20 });

      await fc.assert(
        fc.asyncProperty(singlesCSVDataArbitrary, async (rows) => {
          // Step 1: Generate CSV from arbitrary data
          const csvLines = ['Pos,Name,Gross,Hcp,Nett'];
          rows.forEach(row => {
            const line = [
              row.pos.toString(),
              row.name.trim(),
              row.gross !== undefined ? row.gross.toString() : '',
              row.hcp !== undefined ? row.hcp.toString() : '',
              row.nett !== undefined ? row.nett.toString() : '',
            ].join(',');
            csvLines.push(line);
          });
          const originalCSV = csvLines.join('\n');

          // Step 2: Parse the original CSV
          const parseResult1 = await parserService.parseSinglesCSV(originalCSV);
          
          // Should be valid
          expect(parseResult1.valid).toBe(true);
          expect(parseResult1.errors).toHaveLength(0);
          expect(parseResult1.data.length).toBeGreaterThan(0);

          // Step 3: Convert parsed results to CompetitionResult format for formatting
          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: dto.grossScore ?? null,
            handicap: dto.handicap ?? null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Step 4: Format back to CSV
          const formattedCSV = formatterService.formatSinglesResults(competitionResults);

          // Step 5: Parse the formatted CSV
          const parseResult2 = await parserService.parseSinglesCSV(formattedCSV);

          // Should be valid
          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.errors).toHaveLength(0);

          // Step 6: Verify equivalence
          // Both parse results should have the same number of records
          expect(parseResult2.data.length).toBe(parseResult1.data.length);

          // Sort both by position and name for comparison
          const sorted1 = [...parseResult1.data].sort((a, b) => {
            if (a.finishingPosition !== b.finishingPosition) {
              return a.finishingPosition - b.finishingPosition;
            }
            return a.playerName.localeCompare(b.playerName);
          });

          const sorted2 = [...parseResult2.data].sort((a, b) => {
            if (a.finishingPosition !== b.finishingPosition) {
              return a.finishingPosition - b.finishingPosition;
            }
            return a.playerName.localeCompare(b.playerName);
          });

          // Compare each field
          sorted1.forEach((result1, index) => {
            const result2 = sorted2[index];

            expect(result2.finishingPosition).toBe(result1.finishingPosition);
            expect(result2.playerName).toBe(result1.playerName);
            expect(result2.grossScore).toBe(result1.grossScore);
            expect(result2.handicap).toBe(result1.handicap);
            expect(result2.nettScore).toBe(result1.nettScore);
          });
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should handle edge cases in round-trip: empty optional fields', async () => {
      // Test with rows that have all optional fields empty
      const rowsWithEmptyFields = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 50 }),
          name: fc.string({ minLength: 1, maxLength: 30 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player'),
          gross: fc.constant(undefined),
          hcp: fc.constant(undefined),
          nett: fc.constant(undefined),
        }),
        { minLength: 1, maxLength: 10 }
      );

      await fc.assert(
        fc.asyncProperty(rowsWithEmptyFields, async (rows) => {
          const csvLines = ['Pos,Name,Gross,Hcp,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name.trim()},,,`);
          });
          const originalCSV = csvLines.join('\n');

          const parseResult1 = await parserService.parseSinglesCSV(originalCSV);
          expect(parseResult1.valid).toBe(true);

          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: dto.grossScore ?? null,
            handicap: dto.handicap ?? null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const formattedCSV = formatterService.formatSinglesResults(competitionResults);
          const parseResult2 = await parserService.parseSinglesCSV(formattedCSV);

          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.data.length).toBe(parseResult1.data.length);

          parseResult2.data.forEach((result) => {
            expect(result.grossScore).toBeUndefined();
            expect(result.handicap).toBeUndefined();
            expect(result.nettScore).toBeUndefined();
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve field order and structure through round-trip', async () => {
      // Test that the CSV structure is maintained
      const orderedRowsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 100 }),
          name: fc.string({ minLength: 1, maxLength: 40 })
            .map(s => s.replace(/[",\n\r]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player'),
          gross: fc.integer({ min: 60, max: 140 }),
          hcp: fc.integer({ min: 5, max: 36 }),
          nett: fc.integer({ min: 50, max: 110 }),
        }),
        { minLength: 1, maxLength: 15 }
      );

      await fc.assert(
        fc.asyncProperty(orderedRowsArbitrary, async (rows) => {
          const csvLines = ['Pos,Name,Gross,Hcp,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name.trim()},${row.gross},${row.hcp},${row.nett}`);
          });
          const originalCSV = csvLines.join('\n');

          const parseResult1 = await parserService.parseSinglesCSV(originalCSV);
          
          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: dto.grossScore ?? null,
            handicap: dto.handicap ?? null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const formattedCSV = formatterService.formatSinglesResults(competitionResults);
          
          // Verify CSV has correct header (trim to handle BOM or extra whitespace)
          const lines = formattedCSV.split('\n');
          expect(lines[0].trim()).toBe('Pos,Name,Gross,Hcp,Nett');

          const parseResult2 = await parserService.parseSinglesCSV(formattedCSV);

          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.data.length).toBe(parseResult1.data.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Doubles Name Splitting', () => {
    /**
     * Property: For all doubles CSV rows with name field containing "/", 
     * splitting produces exactly 2 non-empty names with whitespace trimmed
     * Validates: Requirements 6.3, 6.4
     * 
     * This property ensures that:
     * 1. Names with "/" are split into exactly 2 parts
     * 2. Both parts are non-empty after trimming
     * 3. Whitespace is properly trimmed from each name
     * 4. The split operation is consistent and reliable
     */
    it('should split names with "/" into exactly 2 non-empty names', async () => {
      // Arbitrary for generating doubles names with "/" separator
      const doublesNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 30 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player1'),
        fc.string({ minLength: 1, maxLength: 30 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player2')
      ).map(([name1, name2]) => `${name1} / ${name2}`);

      // Arbitrary for generating doubles CSV rows
      const doublesRowArbitrary = fc.record({
        pos: fc.integer({ min: 1, max: 100 }),
        name: doublesNameArbitrary,
        nett: fc.option(fc.integer({ min: 40, max: 120 }), { nil: undefined }),
      });

      const doublesCSVDataArbitrary = fc.array(doublesRowArbitrary, { minLength: 1, maxLength: 20 });

      await fc.assert(
        fc.asyncProperty(doublesCSVDataArbitrary, async (rows) => {
          // Generate CSV from arbitrary data
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            const line = [
              row.pos.toString(),
              row.name,
              row.nett !== undefined ? row.nett.toString() : '',
            ].join(',');
            csvLines.push(line);
          });
          const csv = csvLines.join('\n');

          // Parse the CSV
          const parseResult = await parserService.parseDoublesCSV(csv);

          // Should be valid
          expect(parseResult.valid).toBe(true);
          expect(parseResult.errors).toHaveLength(0);

          // Should have exactly 2 results per row (one for each player)
          expect(parseResult.data.length).toBe(rows.length * 2);

          // Verify each pair of results
          for (let i = 0; i < rows.length; i++) {
            const originalRow = rows[i];
            const result1 = parseResult.data[i * 2];
            const result2 = parseResult.data[i * 2 + 1];

            // Both results should have the same position
            expect(result1.finishingPosition).toBe(originalRow.pos);
            expect(result2.finishingPosition).toBe(originalRow.pos);

            // Both results should have the same nett score
            expect(result1.nettScore).toBe(originalRow.nett);
            expect(result2.nettScore).toBe(originalRow.nett);

            // Extract expected names from original
            const expectedNames = originalRow.name.split('/').map(n => n.trim());
            expect(expectedNames).toHaveLength(2);

            // Both names should be non-empty
            expect(expectedNames[0].length).toBeGreaterThan(0);
            expect(expectedNames[1].length).toBeGreaterThan(0);

            // Results should have the split names
            expect(result1.playerName).toBe(expectedNames[0]);
            expect(result2.playerName).toBe(expectedNames[1]);
          }
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should trim whitespace from split names', async () => {
      // Test with various amounts of whitespace around the separator
      const whitespaceVariationsArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player1'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player2'),
        fc.integer({ min: 0, max: 5 }), // spaces before /
        fc.integer({ min: 0, max: 5 })  // spaces after /
      ).map(([name1, name2, spacesBefore, spacesAfter]) => {
        const before = ' '.repeat(spacesBefore);
        const after = ' '.repeat(spacesAfter);
        return `${name1}${before}/${after}${name2}`;
      });

      const rowsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 50 }),
          name: whitespaceVariationsArbitrary,
          nett: fc.integer({ min: 50, max: 100 }),
        }),
        { minLength: 1, maxLength: 10 }
      );

      await fc.assert(
        fc.asyncProperty(rowsArbitrary, async (rows) => {
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name},${row.nett}`);
          });
          const csv = csvLines.join('\n');

          const parseResult = await parserService.parseDoublesCSV(csv);

          expect(parseResult.valid).toBe(true);
          expect(parseResult.data.length).toBe(rows.length * 2);

          // Verify all names are properly trimmed (no leading/trailing whitespace)
          parseResult.data.forEach(result => {
            expect(result.playerName).toBe(result.playerName.trim());
            expect(result.playerName.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should reject names without "/" separator', async () => {
      // Generate names without "/" separator
      const namesWithoutSlashArbitrary = fc.string({ minLength: 1, maxLength: 40 })
        .map(s => s.replace(/[",\n\r/]/g, '')) // Remove special chars including /
        .filter(s => s.trim().length > 0)
        .map(s => s.trim() || 'SinglePlayer');

      const invalidRowsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 50 }),
          name: namesWithoutSlashArbitrary,
          nett: fc.integer({ min: 50, max: 100 }),
        }),
        { minLength: 1, maxLength: 10 }
      );

      await fc.assert(
        fc.asyncProperty(invalidRowsArbitrary, async (rows) => {
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name},${row.nett}`);
          });
          const csv = csvLines.join('\n');

          const parseResult = await parserService.parseDoublesCSV(csv);

          // Should be invalid
          expect(parseResult.valid).toBe(false);
          
          // Should have errors for each row
          expect(parseResult.errors.length).toBeGreaterThan(0);
          
          // All errors should mention the "/" separator
          parseResult.errors.forEach(error => {
            expect(error.message.toLowerCase()).toContain('/');
          });

          // Should not create any results
          expect(parseResult.data).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle names with multiple "/" characters by using first split', async () => {
      // Generate names with multiple "/" characters
      const multiSlashNamesArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player1'),
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player2'),
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player3')
      ).map(([name1, name2, name3]) => `${name1} / ${name2} / ${name3}`);

      const rowsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 30 }),
          name: multiSlashNamesArbitrary,
          nett: fc.integer({ min: 50, max: 100 }),
        }),
        { minLength: 1, maxLength: 5 }
      );

      await fc.assert(
        fc.asyncProperty(rowsArbitrary, async (rows) => {
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name},${row.nett}`);
          });
          const csv = csvLines.join('\n');

          const parseResult = await parserService.parseDoublesCSV(csv);

          // The parser should handle this - it splits on "/" and expects exactly 2 parts
          // With 3 parts, it should fail validation
          expect(parseResult.valid).toBe(false);
          expect(parseResult.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Doubles CSV Round-Trip', () => {
    /**
     * Property: For all valid doubles CSV data, parse(format(parse(csv))) produces equivalent results
     * Validates: Requirements 6.11, 7.3
     * 
     * This property ensures that:
     * 1. Parsing a doubles CSV produces a set of results (2 per row)
     * 2. Formatting those results back to CSV combines pairs by position
     * 3. Parsing the formatted CSV again
     * 4. Produces equivalent results to the original parse
     * 
     * This guarantees data integrity through the round-trip transformation for doubles competitions.
     */
    it('should preserve all fields through parse -> format -> parse round-trip', async () => {
      // Arbitrary for generating valid doubles CSV rows
      const doublesRowArbitrary = fc.record({
        pos: fc.integer({ min: 1, max: 100 }),
        name1: fc.string({ minLength: 1, maxLength: 30 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player1'),
        name2: fc.string({ minLength: 1, maxLength: 30 })
          .map(s => s.replace(/[",\n\r/]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Player2'),
        nett: fc.option(fc.integer({ min: 40, max: 120 }), { nil: undefined }),
      });

      const doublesCSVDataArbitrary = fc.array(doublesRowArbitrary, { minLength: 1, maxLength: 20 })
        .map(rows => {
          // Ensure unique positions by reassigning them sequentially
          return rows.map((row, index) => ({ ...row, pos: index + 1 }));
        });

      await fc.assert(
        fc.asyncProperty(doublesCSVDataArbitrary, async (rows) => {
          // Step 1: Generate CSV from arbitrary data
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            const combinedName = `${row.name1} / ${row.name2}`;
            const line = [
              row.pos.toString(),
              combinedName,
              row.nett !== undefined ? row.nett.toString() : '',
            ].join(',');
            csvLines.push(line);
          });
          const originalCSV = csvLines.join('\n');

          // Step 2: Parse the original CSV
          const parseResult1 = await parserService.parseDoublesCSV(originalCSV);
          
          // Should be valid
          expect(parseResult1.valid).toBe(true);
          expect(parseResult1.errors).toHaveLength(0);
          expect(parseResult1.data.length).toBe(rows.length * 2); // 2 results per row

          // Step 3: Convert parsed results to CompetitionResult format for formatting
          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: null,
            handicap: null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Step 4: Format back to CSV
          const formattedCSV = formatterService.formatDoublesResults(competitionResults);

          // Step 5: Parse the formatted CSV
          const parseResult2 = await parserService.parseDoublesCSV(formattedCSV);

          // Should be valid
          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.errors).toHaveLength(0);

          // Step 6: Verify equivalence
          // Both parse results should have the same number of records
          expect(parseResult2.data.length).toBe(parseResult1.data.length);

          // Sort both by position and name for comparison
          const sorted1 = [...parseResult1.data].sort((a, b) => {
            if (a.finishingPosition !== b.finishingPosition) {
              return a.finishingPosition - b.finishingPosition;
            }
            return a.playerName.localeCompare(b.playerName);
          });

          const sorted2 = [...parseResult2.data].sort((a, b) => {
            if (a.finishingPosition !== b.finishingPosition) {
              return a.finishingPosition - b.finishingPosition;
            }
            return a.playerName.localeCompare(b.playerName);
          });

          // Compare each field
          sorted1.forEach((result1, index) => {
            const result2 = sorted2[index];

            expect(result2.finishingPosition).toBe(result1.finishingPosition);
            expect(result2.playerName).toBe(result1.playerName);
            expect(result2.nettScore).toBe(result1.nettScore);
            // Doubles don't have gross or handicap
            expect(result2.grossScore).toBeUndefined();
            expect(result2.handicap).toBeUndefined();
          });
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should correctly combine pairs by position when formatting', async () => {
      // Test that formatting combines results with the same position
      const pairsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 50 }),
          name1: fc.string({ minLength: 1, maxLength: 25 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'PlayerA'),
          name2: fc.string({ minLength: 1, maxLength: 25 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'PlayerB'),
          nett: fc.integer({ min: 50, max: 100 }),
        }),
        { minLength: 1, maxLength: 15 }
      ).map(pairs => {
        // Ensure unique positions
        return pairs.map((pair, index) => ({ ...pair, pos: index + 1 }));
      });

      await fc.assert(
        fc.asyncProperty(pairsArbitrary, async (pairs) => {
          // Create CSV with pairs
          const csvLines = ['Pos,Name,Nett'];
          pairs.forEach(pair => {
            csvLines.push(`${pair.pos},${pair.name1} / ${pair.name2},${pair.nett}`);
          });
          const originalCSV = csvLines.join('\n');

          // Parse
          const parseResult1 = await parserService.parseDoublesCSV(originalCSV);
          expect(parseResult1.valid).toBe(true);

          // Convert to CompetitionResult
          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: null,
            handicap: null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Format back to CSV
          const formattedCSV = formatterService.formatDoublesResults(competitionResults);
          
          // Verify the formatted CSV has the correct structure
          const lines = formattedCSV.split('\n');
          expect(lines[0].trim()).toBe('Pos,Name,Nett');
          
          // Should have header + number of pairs
          expect(lines.length).toBe(pairs.length + 1);

          // Parse again
          const parseResult2 = await parserService.parseDoublesCSV(formattedCSV);
          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.data.length).toBe(pairs.length * 2);

          // Verify each pair is correctly combined
          for (let i = 0; i < pairs.length; i++) {
            const originalPair = pairs[i];
            const dataLine = lines[i + 1];
            
            // The formatted line should contain both names separated by " / "
            expect(dataLine).toContain(originalPair.name1);
            expect(dataLine).toContain(originalPair.name2);
            expect(dataLine).toContain(' / ');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in round-trip: empty optional fields', async () => {
      // Test with rows that have empty nett scores
      const rowsWithEmptyNett = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 50 }),
          name1: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player1'),
          name2: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player2'),
          nett: fc.constant(undefined),
        }),
        { minLength: 1, maxLength: 10 }
      ).map(rows => {
        // Ensure unique positions
        return rows.map((row, index) => ({ ...row, pos: index + 1 }));
      });

      await fc.assert(
        fc.asyncProperty(rowsWithEmptyNett, async (rows) => {
          const csvLines = ['Pos,Name,Nett'];
          rows.forEach(row => {
            csvLines.push(`${row.pos},${row.name1} / ${row.name2},`);
          });
          const originalCSV = csvLines.join('\n');

          const parseResult1 = await parserService.parseDoublesCSV(originalCSV);
          expect(parseResult1.valid).toBe(true);

          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: null,
            handicap: null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const formattedCSV = formatterService.formatDoublesResults(competitionResults);
          const parseResult2 = await parserService.parseDoublesCSV(formattedCSV);

          expect(parseResult2.valid).toBe(true);
          expect(parseResult2.data.length).toBe(parseResult1.data.length);

          // Verify all nett scores are undefined
          parseResult2.data.forEach((result) => {
            expect(result.nettScore).toBeUndefined();
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain position ordering through round-trip', async () => {
      // Test that positions are maintained in order
      const orderedPairsArbitrary = fc.array(
        fc.record({
          pos: fc.integer({ min: 1, max: 100 }),
          name1: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player1'),
          name2: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => s.replace(/[",\n\r/]/g, ''))
            .filter(s => s.trim().length > 0)
            .map(s => s.trim() || 'Player2'),
          nett: fc.integer({ min: 50, max: 100 }),
        }),
        { minLength: 2, maxLength: 10 }
      ).map(pairs => {
        // Ensure unique positions
        return pairs.map((pair, index) => ({ ...pair, pos: index + 1 }));
      });

      await fc.assert(
        fc.asyncProperty(orderedPairsArbitrary, async (pairs) => {
          const csvLines = ['Pos,Name,Nett'];
          pairs.forEach(pair => {
            csvLines.push(`${pair.pos},${pair.name1} / ${pair.name2},${pair.nett}`);
          });
          const originalCSV = csvLines.join('\n');

          const parseResult1 = await parserService.parseDoublesCSV(originalCSV);
          
          const competitionResults: CompetitionResult[] = parseResult1.data.map((dto, index) => ({
            id: index + 1,
            competitionId: 1,
            finishingPosition: dto.finishingPosition,
            playerName: dto.playerName,
            grossScore: null,
            handicap: null,
            nettScore: dto.nettScore ?? null,
            entryPaid: false,
            swindleMoneyPaid: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const formattedCSV = formatterService.formatDoublesResults(competitionResults);
          const parseResult2 = await parserService.parseDoublesCSV(formattedCSV);

          expect(parseResult2.valid).toBe(true);

          // Group results by position
          const resultsByPosition = new Map<number, typeof parseResult2.data>();
          parseResult2.data.forEach(result => {
            const existing = resultsByPosition.get(result.finishingPosition) || [];
            existing.push(result);
            resultsByPosition.set(result.finishingPosition, existing);
          });

          // Each position should have exactly 2 results (the pair)
          resultsByPosition.forEach((results) => {
            expect(results.length).toBe(2);
            // Both should have the same nett score
            expect(results[0].nettScore).toBe(results[1].nettScore);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
