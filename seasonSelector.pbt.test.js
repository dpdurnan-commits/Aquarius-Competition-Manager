/**
 * Property-Based Tests for SeasonSelector
 * Tests season format validation using fast-check
 */

import fc from 'fast-check';
import { SeasonSelector } from './seasonSelector.js';

describe('SeasonSelector - Property-Based Tests', () => {
  describe('Property 1: Season Format Validation', () => {
    let seasonSelector;

    beforeEach(() => {
      const mockApiClient = {
        request: jest.fn()
      };
      seasonSelector = new SeasonSelector(mockApiClient);
    });

    test('should reject invalid season formats', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary strings that don't match the valid pattern
          fc.oneof(
            fc.string(), // Random strings
            fc.constantFrom(
              '', // Empty string
              'Season: Winter 25', // Missing summer part
              'Winter 25-Summer 26', // Missing "Season:" prefix
              'Season: Winter 2025-Summer 2026', // Four-digit years
              'Season: Winter 25 - Summer 26', // Extra spaces
              'Season: Winter 25-Summer 24', // Winter > Summer (invalid order)
              'Season: Winter AA-Summer BB', // Non-numeric years
              'Season: Winter 1-Summer 2', // Single-digit years
              'Season: winter 25-summer 26', // Lowercase
              'Season: Winter 25-Summer 26 ', // Trailing space
              ' Season: Winter 25-Summer 26', // Leading space
              'Season: Winter 99-Summer 00', // Year wrap-around (99 > 00)
              'Season: Winter 25-Autumn 26', // Wrong season name
              'Season: Spring 25-Summer 26', // Wrong season name
              'Season: Winter 25-Summer', // Missing year
              'Season: -Summer 26', // Missing winter year
              'Season: Winter 25-Summer 2', // Incomplete summer year
              'Season: Winter 2-Summer 26', // Incomplete winter year
              'Season: Winter 25-Summer 26-Fall 27', // Extra season
              'Season:Winter 25-Summer 26', // Missing space after colon
              'Season : Winter 25-Summer 26', // Extra space before colon
              'Season: Winter  25-Summer 26', // Double space
              'Season: Winter 25--Summer 26', // Double dash
              'Season: Winter 25-Summer 26!', // Special character
              'Season: Winter 25-Summer 26\n', // Newline
              'Season: Winter 25-Summer 26\t', // Tab
              'Season: Winter +25-Summer 26', // Plus sign
              'Season: Winter -25-Summer 26', // Negative sign
              'Season: Winter 25-Summer +26', // Plus sign in summer
              'Season: Winter 25-Summer -26', // Negative sign in summer
              'Season: Winter 25.5-Summer 26', // Decimal
              'Season: Winter 25-Summer 26.5', // Decimal in summer
              'Season: Winter 0-Summer 1', // Single digit with leading zero
              'Season: Winter 00-Summer 01', // Valid format but edge case
              'Season: Winter 25-Summer 125', // Three-digit year
              'Season: Winter 125-Summer 26', // Three-digit winter year
              'Season: Winter 25-Summer', // Incomplete
              'Season: Winter-Summer 26', // Missing winter year
              'Season: Winter 25-Summer 26 Extra', // Extra text
              'Prefix Season: Winter 25-Summer 26', // Prefix text
              'Season: Winter 25-Summer 26 (Active)', // Parenthetical
              'Season: Winter 25-Summer 26 [Active]', // Brackets
              'Season: Winter 25-Summer 26 - Active', // Dash suffix
              'Season: Winter 25-Summer 26, Active', // Comma suffix
              'Season: Winter 25-Summer 26;', // Semicolon
              'Season: Winter 25-Summer 26:', // Colon suffix
              'Season: Winter 25-Summer 26?', // Question mark
              'Season: Winter 25-Summer 26*', // Asterisk
              'Season: Winter 25-Summer 26#', // Hash
              'Season: Winter 25-Summer 26@', // At sign
              'Season: Winter 25-Summer 26$', // Dollar sign
              'Season: Winter 25-Summer 26%', // Percent
              'Season: Winter 25-Summer 26^', // Caret
              'Season: Winter 25-Summer 26&', // Ampersand
              'Season: Winter 25-Summer 26(', // Open paren
              'Season: Winter 25-Summer 26)', // Close paren
              'Season: Winter 25-Summer 26=', // Equals
              'Season: Winter 25-Summer 26+', // Plus
              'Season: Winter 25-Summer 26_', // Underscore
              'Season: Winter 25-Summer 26/', // Slash
              'Season: Winter 25-Summer 26\\', // Backslash
              'Season: Winter 25-Summer 26|', // Pipe
              'Season: Winter 25-Summer 26<', // Less than
              'Season: Winter 25-Summer 26>', // Greater than
              'Season: Winter 25-Summer 26[', // Open bracket
              'Season: Winter 25-Summer 26]', // Close bracket
              'Season: Winter 25-Summer 26{', // Open brace
              'Season: Winter 25-Summer 26}', // Close brace
              'Season: Winter 25-Summer 26`', // Backtick
              'Season: Winter 25-Summer 26~', // Tilde
              'Season: Winter 25-Summer 26"', // Double quote
              "Season: Winter 25-Summer 26'", // Single quote
              'Season: Winter 25-Summer 26,', // Comma
              'Season: Winter 25-Summer 26.', // Period
              'Season: Winter 25-Summer 26;', // Semicolon
              'Season: Winter 25-Summer 26:', // Colon
              'Season: Winter 25-Summer 26!', // Exclamation
              'Season: Winter 25-Summer 26?', // Question
              'Season: Winter 25-Summer 26 ', // Trailing space
              ' Season: Winter 25-Summer 26', // Leading space
              '  Season: Winter 25-Summer 26  ', // Multiple spaces
              '\tSeason: Winter 25-Summer 26', // Tab prefix
              'Season: Winter 25-Summer 26\t', // Tab suffix
              '\nSeason: Winter 25-Summer 26', // Newline prefix
              'Season: Winter 25-Summer 26\n', // Newline suffix
              'Season: Winter 25-Summer 26\r', // Carriage return
              'Season: Winter 25-Summer 26\r\n' // CRLF
            )
          ),
          (invalidFormat) => {
            // Skip valid formats that might be generated
            const validPattern = /^Season: Winter \d{2}-Summer \d{2}$/;
            if (validPattern.test(invalidFormat)) {
              const match = invalidFormat.match(/Winter (\d{2})-Summer (\d{2})/);
              if (match) {
                const winterYear = parseInt(match[1], 10);
                const summerYear = parseInt(match[2], 10);
                if (winterYear <= summerYear) {
                  return true; // Skip this test case as it's actually valid
                }
              }
            }

            const result = seasonSelector.validateSeasonFormat(invalidFormat);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should accept valid season formats', () => {
      fc.assert(
        fc.property(
          // Generate valid two-digit years where winter <= summer
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 99 }),
          (year1, year2) => {
            // Ensure winter <= summer
            const winterYear = Math.min(year1, year2);
            const summerYear = Math.max(year1, year2);

            // Format as two-digit strings with leading zeros
            const winterStr = winterYear.toString().padStart(2, '0');
            const summerStr = summerYear.toString().padStart(2, '0');

            const validFormat = `Season: Winter ${winterStr}-Summer ${summerStr}`;

            const result = seasonSelector.validateSeasonFormat(validFormat);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject formats where winter year > summer year', () => {
      fc.assert(
        fc.property(
          // Generate two different years where first > second
          fc.integer({ min: 1, max: 99 }),
          fc.integer({ min: 0, max: 98 }),
          (year1, year2) => {
            // Ensure winter > summer
            const winterYear = Math.max(year1, year2);
            const summerYear = Math.min(year1, year2);

            // Skip if they're equal
            if (winterYear === summerYear) {
              return true;
            }

            // Format as two-digit strings with leading zeros
            const winterStr = winterYear.toString().padStart(2, '0');
            const summerStr = summerYear.toString().padStart(2, '0');

            const invalidFormat = `Season: Winter ${winterStr}-Summer ${summerStr}`;

            const result = seasonSelector.validateSeasonFormat(invalidFormat);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge cases consistently', () => {
      // Test specific edge cases
      const edgeCases = [
        { input: 'Season: Winter 00-Summer 00', expected: true }, // Same year
        { input: 'Season: Winter 00-Summer 99', expected: true }, // Full range
        { input: 'Season: Winter 99-Summer 99', expected: true }, // Max year
        { input: 'Season: Winter 50-Summer 51', expected: true }, // Mid-range
        { input: 'Season: Winter 25-Summer 26', expected: true }, // Typical case
        { input: 'Season: Winter 99-Summer 00', expected: false }, // Year wrap (99 > 00 numerically)
        { input: 'Season: Winter 50-Summer 49', expected: false }, // Reversed
        { input: 'Season: Winter 01-Summer 00', expected: false }, // Reversed low
        { input: 'Season: Winter 10-Summer 09', expected: false }, // Reversed mid
      ];

      edgeCases.forEach(({ input, expected }) => {
        const result = seasonSelector.validateSeasonFormat(input);
        expect(result).toBe(expected);
      });
    });

    test('should be deterministic - same input always produces same output', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result1 = seasonSelector.validateSeasonFormat(input);
            const result2 = seasonSelector.validateSeasonFormat(input);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle whitespace variations correctly', () => {
      const testCases = [
        { input: 'Season: Winter 25-Summer 26', expected: true }, // Valid
        { input: ' Season: Winter 25-Summer 26', expected: false }, // Leading space
        { input: 'Season: Winter 25-Summer 26 ', expected: false }, // Trailing space
        { input: 'Season:  Winter 25-Summer 26', expected: false }, // Double space after colon
        { input: 'Season: Winter  25-Summer 26', expected: false }, // Double space before year
        { input: 'Season: Winter 25 -Summer 26', expected: false }, // Space before dash
        { input: 'Season: Winter 25- Summer 26', expected: false }, // Space after dash
        { input: 'Season: Winter 25-Summer  26', expected: false }, // Double space before summer year
      ];

      testCases.forEach(({ input, expected }) => {
        const result = seasonSelector.validateSeasonFormat(input);
        expect(result).toBe(expected);
      });
    });

    test('should reject non-string inputs gracefully', () => {
      const nonStringInputs = [
        null,
        undefined,
        123,
        true,
        false,
        {},
        [],
        () => {},
      ];

      nonStringInputs.forEach((input) => {
        expect(() => {
          seasonSelector.validateSeasonFormat(input);
        }).not.toThrow();
      });
    });
  });
});
