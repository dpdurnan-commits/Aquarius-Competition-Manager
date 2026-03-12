/**
 * CSV Parser Tests
 * Unit tests for CSV parsing functionality
 */

import { describe, test, expect } from '@jest/globals';
import { parse } from './csvParser.js';
import * as fc from 'fast-check';

describe('CSV Parser', () => {
  /**
   * Helper function to create a mock File object
   */
  function createMockFile(content, filename = 'test.csv') {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], filename, { type: 'text/csv' });
  }

  test('should parse valid CSV with 10 columns', async () => {
    const csvContent = 'A,B,C,D,E,F,G,H,I,J\n1,2,3,4,5,6,7,8,9,10';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
    expect(result.rows[1]).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  test('should parse CSV with more than 10 columns', async () => {
    const csvContent = 'A,B,C,D,E,F,G,H,I,J,K,L\n1,2,3,4,5,6,7,8,9,10,11,12';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toHaveLength(12);
  });

  test('should return error for CSV with fewer than 10 columns', async () => {
    const csvContent = 'A,B,C,D,E\n1,2,3,4,5';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 10 columns');
  });

  test('should return error for empty file', async () => {
    const csvContent = '';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  test('should return error when no file provided', async () => {
    const result = await parse(null);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('No file provided');
  });

  test('should handle quoted fields with commas', async () => {
    const csvContent = '"A,A",B,C,D,E,F,G,H,I,J\n"1,1",2,3,4,5,6,7,8,9,10';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows[0][0]).toBe('A,A');
    expect(result.rows[1][0]).toBe('1,1');
  });

  test('should handle escaped quotes', async () => {
    const csvContent = '"A""A",B,C,D,E,F,G,H,I,J\n"1""1",2,3,4,5,6,7,8,9,10';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows[0][0]).toBe('A"A');
    expect(result.rows[1][0]).toBe('1"1');
  });

  test('should preserve empty cells', async () => {
    const csvContent = 'A,,C,D,E,F,G,H,I,J\n1,,3,4,5,6,7,8,9,10';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows[0][1]).toBe('');
    expect(result.rows[1][1]).toBe('');
  });

  test('should handle file with only header row', async () => {
    const csvContent = 'A,B,C,D,E,F,G,H,I,J';
    const file = createMockFile(csvContent);
    
    const result = await parse(file);
    
    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  // Feature: competition-csv-import, Property 1: CSV parsing preserves structure
  test('Property 1: CSV parsing preserves structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate CSV data with at least 10 columns
        fc.array(
          fc.array(fc.string(), { minLength: 10, maxLength: 20 }),
          { minLength: 1, maxLength: 50 }
        ),
        async (csvData) => {
          // Convert 2D array to CSV string
          const csvContent = csvData
            .map(row => row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(','))
            .join('\n');

          const file = createMockFile(csvContent);
          const result = await parse(file);

          // Parsing should succeed
          expect(result.success).toBe(true);
          
          // Number of rows should match input
          expect(result.rows).toHaveLength(csvData.length);
          
          // Each row should have the correct number of columns
          result.rows.forEach((row, rowIndex) => {
            expect(row).toHaveLength(csvData[rowIndex].length);
          });
          
          // Cell values should match (accounting for empty strings)
          result.rows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
              expect(cell).toBe(csvData[rowIndex][colIndex]);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 2: CSV parsing handles malformed input gracefully
  test('Property 2: CSV parsing handles malformed input gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various types of malformed CSV inputs
        fc.oneof(
          // Empty or whitespace-only content
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\n\n\n'),
          // Insufficient columns (fewer than 10)
          fc.array(
            fc.array(fc.string(), { minLength: 0, maxLength: 9 }),
            { minLength: 1, maxLength: 10 }
          ).map(rows => rows.map(row => row.join(',')).join('\n')),
          // Unclosed quotes (malformed) - ensure there's content after the quote
          fc.string({ minLength: 1 }).map(s => `"${s}\nA,B,C,D,E,F,G,H,I,J`),
          // Mismatched quotes
          fc.string({ minLength: 1 }).map(s => `"${s}",A,"B,C,D,E,F,G,H,I,J`),
          // Null/undefined file (handled separately, but included conceptually)
          fc.constant(null)
        ),
        async (malformedInput) => {
          let result;
          
          // Handle null case separately
          if (malformedInput === null) {
            result = await parse(null);
          } else {
            const file = createMockFile(malformedInput);
            result = await parse(file);
          }

          // The parser should NEVER throw an exception
          // It should always return a structured result
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success');
          
          // For malformed input, success should be false
          expect(result.success).toBe(false);
          
          // An error message should be provided
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          
          // The rows property should not be present on error
          expect(result.rows).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 3: CSV parsing supports wide files
  test('Property 3: CSV parsing supports wide files', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate CSV data with 10 to 50 columns (wide files)
        fc.record({
          numColumns: fc.integer({ min: 10, max: 50 }),
          numRows: fc.integer({ min: 1, max: 30 })
        }).chain(({ numColumns, numRows }) =>
          fc.array(
            fc.array(fc.string(), { minLength: numColumns, maxLength: numColumns }),
            { minLength: numRows, maxLength: numRows }
          ).map(rows => ({ rows, numColumns }))
        ),
        async ({ rows: csvData, numColumns }) => {
          // Convert 2D array to CSV string
          const csvContent = csvData
            .map(row => row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(','))
            .join('\n');

          const file = createMockFile(csvContent);
          const result = await parse(file);

          // Parsing should succeed for files with 10+ columns
          expect(result.success).toBe(true);
          
          // All rows should be present
          expect(result.rows).toHaveLength(csvData.length);
          
          // Each row should have ALL columns (no truncation)
          result.rows.forEach((row, rowIndex) => {
            expect(row).toHaveLength(numColumns);
            
            // Verify all column values are preserved
            row.forEach((cell, colIndex) => {
              expect(cell).toBe(csvData[rowIndex][colIndex]);
            });
          });
          
          // Verify no data loss occurred
          const totalCellsInput = csvData.length * numColumns;
          const totalCellsOutput = result.rows.reduce((sum, row) => sum + row.length, 0);
          expect(totalCellsOutput).toBe(totalCellsInput);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 4: CSV parsing preserves empty cells
  test('Property 4: CSV parsing preserves empty cells', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate CSV data with at least 10 columns, including empty strings
        fc.array(
          fc.array(
            fc.oneof(
              fc.string(), // Regular strings
              fc.constant('') // Empty strings
            ),
            { minLength: 10, maxLength: 20 }
          ),
          { minLength: 1, maxLength: 30 }
        ).filter(csvData => {
          // Ensure at least one empty cell exists in the data
          return csvData.some(row => row.some(cell => cell === ''));
        }),
        async (csvData) => {
          // Convert 2D array to CSV string
          const csvContent = csvData
            .map(row => row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(','))
            .join('\n');

          const file = createMockFile(csvContent);
          const result = await parse(file);

          // Parsing should succeed
          expect(result.success).toBe(true);
          
          // Number of rows should match input
          expect(result.rows).toHaveLength(csvData.length);
          
          // Each row should have the correct number of columns
          result.rows.forEach((row, rowIndex) => {
            expect(row).toHaveLength(csvData[rowIndex].length);
          });
          
          // Empty cells should be preserved as empty strings
          result.rows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
              const expectedValue = csvData[rowIndex][colIndex];
              
              // Empty cells should remain empty strings
              if (expectedValue === '') {
                expect(cell).toBe('');
              } else {
                expect(cell).toBe(expectedValue);
              }
            });
          });
          
          // Count empty cells in input and output - they should match
          const countEmptyCells = (data) => {
            return data.reduce((count, row) => {
              return count + row.filter(cell => cell === '').length;
            }, 0);
          };
          
          const inputEmptyCount = countEmptyCells(csvData);
          const outputEmptyCount = countEmptyCells(result.rows);
          
          expect(outputEmptyCount).toBe(inputEmptyCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
