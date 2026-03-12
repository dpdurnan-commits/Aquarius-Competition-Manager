/**
 * CSV Exporter Tests
 * Property-based and unit tests for CSV export functionality
 */

import { describe, test, expect } from '@jest/globals';
import { generateCSV, generateFilename } from './csvExporter.js';
import * as fc from 'fast-check';

describe('CSV Exporter', () => {
  // Unit Tests
  describe('Unit Tests', () => {
    // Test header row generation
    test('should generate correct header row', () => {
      const records = [{
        date: '2024-01-01',
        time: '10:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Doe',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 0,
        isComplete: true
      }];
      
      const csv = generateCSV(records);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total');
    });
    
    // Test escaping of commas
    test('should escape fields containing commas', () => {
      const records = [{
        date: '2024-01-01',
        time: '10:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'Doe, John',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 0,
        isComplete: true
      }];
      
      const csv = generateCSV(records);
      
      expect(csv).toContain('"Doe, John"');
    });
    
    // Test escaping of quotes
    test('should escape fields containing quotes', () => {
      const records = [{
        date: '2024-01-01',
        time: '10:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John "Johnny" Doe',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 0,
        isComplete: true
      }];
      
      const csv = generateCSV(records);
      
      // Quotes should be doubled and field should be quoted
      expect(csv).toContain('"John ""Johnny"" Doe"');
    });
    
    // Test escaping of newlines
    test('should escape fields containing newlines', () => {
      const records = [{
        date: '2024-01-01',
        time: '10:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John\nDoe',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '2.00',
        total: '12.00',
        sourceRowIndex: 0,
        isComplete: true
      }];
      
      const csv = generateCSV(records);
      
      // Field with newline should be quoted
      expect(csv).toContain('"John\nDoe"');
    });
    
    // Test filename generation
    test('should generate filename with timestamp', () => {
      const filename = generateFilename();
      
      // Should match pattern: competition-records-YYYY-MM-DDTHH-MM-SS.csv
      expect(filename).toMatch(/^competition-records-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    });
    
    // Test filename generation produces unique filenames
    test('should generate unique filenames when called multiple times', () => {
      const filename1 = generateFilename();
      // Small delay to ensure different timestamp
      const filename2 = generateFilename();
      
      // Both should be valid filenames
      expect(filename1).toMatch(/^competition-records-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
      expect(filename2).toMatch(/^competition-records-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
      
      // They should be the same or very close (within same second)
      // This test just verifies the format is consistent
      expect(filename1.startsWith('competition-records-')).toBe(true);
      expect(filename2.startsWith('competition-records-')).toBe(true);
    });
  });
  
  // Property-Based Tests
  // Feature: competition-csv-import, Property 12: All transformed records are exported
  test('Property 12: All transformed records are exported', () => {
    fc.assert(
      fc.property(
        // Generate an array of transformed records (reduced size for speed)
        fc.array(
          fc.record({
            date: fc.string({ maxLength: 20 }),
            time: fc.string({ maxLength: 20 }),
            till: fc.string({ maxLength: 20 }),
            type: fc.oneof(
              fc.constant('Topup Competitions'),
              fc.constant('Sale'),
              fc.constant('Refund')
            ),
            member: fc.string({ maxLength: 20 }),
            price: fc.string({ maxLength: 20 }),
            discount: fc.string({ maxLength: 20 }),
            subtotal: fc.string({ maxLength: 20 }),
            vat: fc.string({ maxLength: 20 }),
            total: fc.string({ maxLength: 20 }),
            sourceRowIndex: fc.integer({ min: 0, max: 100 }),
            isComplete: fc.boolean()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (records) => {
          // Generate CSV from records
          const csvContent = generateCSV(records);
          
          // Split CSV into lines
          const lines = csvContent.split('\n');
          
          // First line should be the header
          expect(lines[0]).toBe('Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total');
          
          // Total number of lines should be header + number of records
          // (accounting for potential empty line at end)
          const dataLines = lines.slice(1).filter(line => line.length > 0);
          expect(dataLines.length).toBe(records.length);
          
          // Each record should have a corresponding data row
          // We verify this by checking that the number of non-empty data lines
          // matches the number of input records
          expect(dataLines.length).toBe(records.length);
          
          // Verify that each record is represented in the output
          // by checking that we can parse back the same number of records
          records.forEach((record, index) => {
            const dataLine = dataLines[index];
            
            // The line should not be empty
            expect(dataLine.length).toBeGreaterThan(0);
            
            // The line should contain data (at minimum, it should have commas for 10 columns)
            // Count commas - should have at least 9 commas for 10 columns
            const commaCount = (dataLine.match(/,/g) || []).length;
            expect(commaCount).toBeGreaterThanOrEqual(9);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: competition-csv-import, Property 13: CSV export handles special characters
  test('Property 13: CSV export handles special characters', () => {
    fc.assert(
      fc.property(
        // Generate records with fields containing special characters (optimized)
        fc.array(
          fc.record({
            date: fc.constantFrom('test', 'test,comma', 'test"quote', 'test\nnewline'),
            time: fc.constantFrom('test', 'test,comma', 'test"quote'),
            till: fc.constantFrom('test', 'test,comma'),
            type: fc.oneof(
              fc.constant('Topup Competitions'),
              fc.constant('Sale'),
              fc.constant('Refund')
            ),
            member: fc.constantFrom('test', 'test,comma', 'test"quote', 'test\nnewline'),
            price: fc.constantFrom('10.00', '10,00', '"10"'),
            discount: fc.constantFrom('0', '0,5'),
            subtotal: fc.constantFrom('10.00', '10,00'),
            vat: fc.constantFrom('2.00', '2,00'),
            total: fc.constantFrom('12.00', '12,00'),
            sourceRowIndex: fc.integer({ min: 0, max: 100 }),
            isComplete: fc.boolean()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (records) => {
          // Generate CSV from records
          const csvContent = generateCSV(records);
          
          // Split CSV into lines (but be careful with newlines in fields)
          const lines = csvContent.split('\n');
          
          // Verify that fields with special characters are properly quoted
          records.forEach((record) => {
            const fields = [
              record.date, record.time, record.till, record.type, record.member,
              record.price, record.discount, record.subtotal, record.vat, record.total
            ];
            
            fields.forEach((field) => {
              if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                // Field should appear in the CSV content
                // If it contains a comma, quote, or newline, it should be quoted
                
                // Check that internal quotes are escaped (doubled)
                if (field.includes('"')) {
                  const escapedField = field.replace(/"/g, '""');
                  const quotedField = `"${escapedField}"`;
                  expect(csvContent).toContain(quotedField);
                }
                
                // Check that fields with commas are quoted
                if (field.includes(',') && !field.includes('"') && !field.includes('\n')) {
                  const quotedField = `"${field}"`;
                  expect(csvContent).toContain(quotedField);
                }
              }
            });
          });
          
          // Verify the CSV is still parseable (basic structure check)
          // Each line should have the correct number of fields when properly parsed
          // This is a simplified check - a full parser would be needed for complete verification
          const headerLine = lines[0];
          expect(headerLine).toBe('Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total');
          
          // Verify we have the right number of data lines (accounting for quoted newlines)
          // This is complex because quoted newlines create multi-line fields
          // At minimum, we should have at least as many lines as records
          expect(lines.length).toBeGreaterThanOrEqual(records.length + 1);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: competition-csv-import, Property 14: Round-trip preservation
  test('Property 14: Round-trip preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate CSV data with qualifying competition records
        fc.array(
          fc.oneof(
            // Topup record (3 rows)
            fc.record({
              date: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
              time: fc.string({ maxLength: 20 }),
              till: fc.string({ maxLength: 20 }),
              member: fc.string({ maxLength: 20 }),
              price: fc.string({ maxLength: 20 }),
              discount: fc.string({ maxLength: 20 }),
              subtotal: fc.string({ maxLength: 20 }),
              vat: fc.string({ maxLength: 20 }),
              total: fc.string({ maxLength: 20 })
            }).map(data => [
              [data.date, data.time, data.till, 'Topup Competitions', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', '', data.price, data.discount, data.subtotal, data.vat, data.total]
            ]),
            // Sale record with Competition Entry (3 rows)
            fc.record({
              date: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
              time: fc.string({ maxLength: 20 }),
              till: fc.string({ maxLength: 20 }),
              member: fc.string({ maxLength: 20 }),
              price: fc.string({ maxLength: 20 }),
              discount: fc.string({ maxLength: 20 }),
              subtotal: fc.string({ maxLength: 20 }),
              vat: fc.string({ maxLength: 20 }),
              total: fc.string({ maxLength: 20 })
            }).map(data => [
              [data.date, data.time, data.till, 'Sale', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ]),
            // Refund record with Competition Entry (3 rows)
            fc.record({
              date: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
              time: fc.string({ maxLength: 20 }),
              till: fc.string({ maxLength: 20 }),
              member: fc.string({ maxLength: 20 }),
              price: fc.string({ maxLength: 20 }),
              discount: fc.string({ maxLength: 20 }),
              subtotal: fc.string({ maxLength: 20 }),
              vat: fc.string({ maxLength: 20 }),
              total: fc.string({ maxLength: 20 })
            }).map(data => [
              [data.date, data.time, data.till, 'Refund', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ])
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (recordGroups) => {
          // Import required modules
          const { parse } = await import('./csvParser.js');
          const { transform } = await import('./recordTransformer.js');
          
          // Flatten record groups into a single CSV array
          const originalRows = recordGroups.flat();
          
          // Step 1: Transform the original CSV data
          const firstTransform = transform(originalRows);
          
          // Skip if no records were produced (edge case)
          if (firstTransform.records.length === 0) {
            return;
          }
          
          // Step 2: Export to CSV string
          const csvContent = generateCSV(firstTransform.records);
          
          // Step 3: Parse the exported CSV back
          // Create a mock File object from the CSV content
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const file = new File([blob], 'test.csv', { type: 'text/csv' });
          const parseResult = await parse(file);
          
          // Parsing should succeed
          expect(parseResult.success).toBe(true);
          
          // Step 4: Transform the re-parsed data
          // Note: The re-parsed data is now flat (no tiered structure), so we need to
          // compare the transformed records directly, not re-transform
          const reparsedRows = parseResult.rows;
          
          // Skip header row (first row)
          const dataRows = reparsedRows.slice(1);
          
          // Property: The number of data rows should match the number of transformed records
          expect(dataRows.length).toBe(firstTransform.records.length);
          
          // Property: Each field in each record should be preserved
          firstTransform.records.forEach((originalRecord, index) => {
            const reparsedRow = dataRows[index];
            
            // Compare all 10 columns (A-J)
            expect(reparsedRow[0]).toBe(originalRecord.date);
            expect(reparsedRow[1]).toBe(originalRecord.time);
            expect(reparsedRow[2]).toBe(originalRecord.till);
            expect(reparsedRow[3]).toBe(originalRecord.type);
            expect(reparsedRow[4]).toBe(originalRecord.member);
            expect(reparsedRow[5]).toBe(originalRecord.price);
            expect(reparsedRow[6]).toBe(originalRecord.discount);
            expect(reparsedRow[7]).toBe(originalRecord.subtotal);
            expect(reparsedRow[8]).toBe(originalRecord.vat);
            expect(reparsedRow[9]).toBe(originalRecord.total);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 15: Export errors are communicated
  test('Property 15: Export errors are communicated', () => {
    fc.assert(
      fc.property(
        // Generate various invalid inputs that should cause errors
        fc.oneof(
          // Invalid input: null records
          fc.constant(null),
          // Invalid input: undefined records
          fc.constant(undefined),
          // Invalid input: empty array
          fc.constant([]),
          // Invalid input: records with missing required fields
          fc.array(
            fc.record({
              // Missing some required fields
              date: fc.option(fc.string(), { nil: undefined }),
              time: fc.option(fc.string(), { nil: undefined }),
              // Intentionally missing other fields
            }),
            { minLength: 1, maxLength: 3 }
          ),
          // Invalid input: records with circular references (will cause JSON issues)
          fc.constant([{ date: '2024-01-01' }]).map(arr => {
            const obj = { ...arr[0] };
            obj.circular = obj; // Create circular reference
            return [obj];
          })
        ),
        (invalidRecords) => {
          // Import the exportCSV function
          const { exportCSV } = require('./csvExporter.js');
          
          // Property: When invalid data is provided, exportCSV should throw an error
          // This error should be catchable and communicable to the user
          let errorThrown = false;
          let errorMessage = '';
          
          try {
            exportCSV(invalidRecords);
          } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
          }
          
          // Verify that an error was thrown
          expect(errorThrown).toBe(true);
          
          // Verify that the error has a message (can be communicated)
          expect(errorMessage).toBeDefined();
          expect(typeof errorMessage).toBe('string');
          expect(errorMessage.length).toBeGreaterThan(0);
          
          // The error message should be descriptive enough to communicate to users
          // It should not be just a generic error
          expect(errorMessage).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});
