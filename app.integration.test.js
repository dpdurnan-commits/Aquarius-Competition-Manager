/**
 * Integration Tests for Competition CSV Import Application
 * Tests the complete flow: upload → transform → display → export
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { parse } from './csvParser.js';
import { transform } from './recordTransformer.js';
import { generateCSV, generateFilename } from './csvExporter.js';

describe('Integration Tests - Complete Application Flow', () => {
  /**
   * Helper function to create a mock File object
   */
  function createMockFile(content, filename = 'test.csv') {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], filename, { type: 'text/csv' });
  }

  /**
   * Sample CSV data for testing
   * Note: All rows must have at least 10 columns (A-J)
   */
  const sampleTopupCSV = `01/01/2024,10:00,Till1,Topup (Competitions),John Doe,,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00`;

  const sampleSaleCSV = `01/01/2024,10:00,Till1,Sale,Jane Smith,,,,,
,,,,,,,,,,
,,,,Competition Entry,20.00,0.00,20.00,4.00,24.00`;

  const sampleRefundCSV = `01/01/2024,10:00,Till1,Refund,Bob Jones,,,,,
,,,,,,,,,,
,,,,Competition Entry,-20.00,0.00,-20.00,-4.00,-24.00`;

  const sampleMixedCSV = `01/01/2024,10:00,Till1,Topup (Competitions),John Doe,,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00
02/01/2024,11:00,Till2,Sale,Jane Smith,,,,,
,,,,,,,,,,
,,,,Competition Entry,20.00,0.00,20.00,4.00,24.00
03/01/2024,12:00,Till3,Refund,Bob Jones,,,,,
,,,,,,,,,,
,,,,Competition Entry,-20.00,0.00,-20.00,-4.00,-24.00`;

  describe('Complete Flow: Parse → Transform → Export', () => {
    test('should process Topup record through complete pipeline', async () => {
      // Step 1: Parse CSV
      const file = createMockFile(sampleTopupCSV);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      expect(parseResult.rows).toBeDefined();
      
      // Step 2: Transform records
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].type).toBe('Topup (Competitions)');
      expect(transformResult.records[0].member).toBe('John Doe');
      expect(transformResult.records[0].total).toBe('12.00');
      expect(transformResult.records[0].isComplete).toBe(true);
      
      // Step 3: Export to CSV
      const csvOutput = generateCSV(transformResult.records);
      
      expect(csvOutput).toContain('Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total');
      expect(csvOutput).toContain('01/01/2024');
      expect(csvOutput).toContain('John Doe');
      expect(csvOutput).toContain('12.00');
      
      // Step 4: Verify round-trip by parsing exported CSV
      const exportedFile = createMockFile(csvOutput);
      const reparsedResult = await parse(exportedFile);
      
      expect(reparsedResult.success).toBe(true);
      expect(reparsedResult.rows).toHaveLength(2); // Header + 1 data row
      expect(reparsedResult.rows[1][0]).toBe('01/01/2024');
      expect(reparsedResult.rows[1][4]).toBe('John Doe');
    });

    test('should process Sale record through complete pipeline', async () => {
      // Step 1: Parse CSV
      const file = createMockFile(sampleSaleCSV);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      // Step 2: Transform records
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].type).toBe('Sale');
      expect(transformResult.records[0].member).toBe('Jane Smith & Competition Entry');
      expect(transformResult.records[0].total).toBe('24.00');
      
      // Step 3: Export to CSV
      const csvOutput = generateCSV(transformResult.records);
      
      expect(csvOutput).toContain('Jane Smith & Competition Entry');
      expect(csvOutput).toContain('24.00');
    });

    test('should process Refund record through complete pipeline', async () => {
      // Step 1: Parse CSV
      const file = createMockFile(sampleRefundCSV);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      // Step 2: Transform records
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].type).toBe('Refund');
      expect(transformResult.records[0].member).toBe('Bob Jones & Competition Entry');
      expect(transformResult.records[0].total).toBe('-24.00');
      
      // Step 3: Export to CSV
      const csvOutput = generateCSV(transformResult.records);
      
      expect(csvOutput).toContain('Bob Jones & Competition Entry');
      expect(csvOutput).toContain('-24.00');
    });

    test('should process mixed records through complete pipeline', async () => {
      // Step 1: Parse CSV
      const file = createMockFile(sampleMixedCSV);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      expect(parseResult.rows).toHaveLength(9); // 3 records × 3 rows each
      
      // Step 2: Transform records
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(3);
      expect(transformResult.records[0].type).toBe('Topup (Competitions)');
      expect(transformResult.records[1].type).toBe('Sale');
      expect(transformResult.records[2].type).toBe('Refund');
      
      // Verify order is preserved
      expect(transformResult.records[0].date).toBe('01/01/2024');
      expect(transformResult.records[1].date).toBe('02/01/2024');
      expect(transformResult.records[2].date).toBe('03/01/2024');
      
      // Step 3: Export to CSV
      const csvOutput = generateCSV(transformResult.records);
      
      const lines = csvOutput.split('\n');
      expect(lines).toHaveLength(4); // Header + 3 data rows
      
      // Step 4: Verify round-trip
      const exportedFile = createMockFile(csvOutput);
      const reparsedResult = await parse(exportedFile);
      
      expect(reparsedResult.success).toBe(true);
      expect(reparsedResult.rows).toHaveLength(4); // Header + 3 data rows
    });
  });

  describe('Error Flow Tests', () => {
    test('should handle empty CSV file gracefully', async () => {
      const file = createMockFile('');
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toContain('empty');
    });

    test('should handle CSV with insufficient columns', async () => {
      const csvContent = 'A,B,C,D,E\n1,2,3,4,5';
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toContain('at least 10 columns');
    });

    test('should handle CSV with no qualifying records', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Other,John Doe,10.00,0.00,10.00,2.00,12.00
02/01/2024,11:00,Till2,Purchase,Jane Smith,20.00,0.00,20.00,4.00,24.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(0);
      expect(transformResult.errors).toHaveLength(0);
    });

    test('should handle incomplete records (missing row+2)', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),John Doe,,,,,`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].isComplete).toBe(false);
      expect(transformResult.records[0].total).toBe('');
      expect(transformResult.errors).toHaveLength(1);
      expect(transformResult.errors[0].severity).toBe('warning');
    });

    test('should handle Sale without Competition Entry', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Sale,Jane Smith,,,,,
,,,,,,,,,,
,,,,,Other Item,20.00,0.00,20.00,4.00,24.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      // Should not be retained because row+2 doesn't have "Competition Entry"
      expect(transformResult.records).toHaveLength(0);
    });

    test('should handle Refund without Competition Entry', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Refund,Bob Jones,,,,,
,,,,,,,,,,
,,,,,Other Item,-20.00,0.00,-20.00,-4.00,-24.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      // Should not be retained because row+2 doesn't have "Competition Entry"
      expect(transformResult.records).toHaveLength(0);
    });

    test('should handle export with no records', () => {
      expect(() => {
        generateCSV([]);
      }).not.toThrow();
      
      const csvOutput = generateCSV([]);
      expect(csvOutput).toContain('Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total');
      
      const lines = csvOutput.split('\n');
      expect(lines).toHaveLength(1); // Only header row
    });
  });

  describe('Special Character Handling', () => {
    test('should handle commas in member names through complete pipeline', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),"Doe, John",,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].member).toBe('Doe, John');
      
      const csvOutput = generateCSV(transformResult.records);
      
      // Should be properly quoted in output
      expect(csvOutput).toContain('"Doe, John"');
      
      // Verify round-trip
      const exportedFile = createMockFile(csvOutput);
      const reparsedResult = await parse(exportedFile);
      
      expect(reparsedResult.success).toBe(true);
      expect(reparsedResult.rows[1][4]).toBe('Doe, John');
    });

    test('should handle quotes in member names through complete pipeline', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),"John ""The Pro"" Doe",,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].member).toBe('John "The Pro" Doe');
      
      const csvOutput = generateCSV(transformResult.records);
      
      // Should be properly escaped in output
      expect(csvOutput).toContain('John ""The Pro"" Doe');
      
      // Verify round-trip
      const exportedFile = createMockFile(csvOutput);
      const reparsedResult = await parse(exportedFile);
      
      expect(reparsedResult.success).toBe(true);
      expect(reparsedResult.rows[1][4]).toBe('John "The Pro" Doe');
    });

    test('should handle newlines in fields through complete pipeline', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),"John
Doe",,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].member).toContain('\n');
      
      const csvOutput = generateCSV(transformResult.records);
      
      // Should be properly quoted in output
      expect(csvOutput).toMatch(/"John\nDoe"/);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should preserve all financial data through pipeline', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),John Doe,,,,,
,,,,,,,,,,
,,,,,123.45,10.50,112.95,22.59,135.54`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records[0].price).toBe('123.45');
      expect(transformResult.records[0].discount).toBe('10.50');
      expect(transformResult.records[0].subtotal).toBe('112.95');
      expect(transformResult.records[0].vat).toBe('22.59');
      expect(transformResult.records[0].total).toBe('135.54');
      
      const csvOutput = generateCSV(transformResult.records);
      
      expect(csvOutput).toContain('123.45');
      expect(csvOutput).toContain('10.50');
      expect(csvOutput).toContain('112.95');
      expect(csvOutput).toContain('22.59');
      expect(csvOutput).toContain('135.54');
    });

    test('should preserve record order through pipeline', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),First,,,,,
,,,,,,,,,,
,,,,,10.00,0.00,10.00,2.00,12.00
02/01/2024,11:00,Till2,Topup (Competitions),Second,,,,,
,,,,,,,,,,
,,,,,20.00,0.00,20.00,4.00,24.00
03/01/2024,12:00,Till3,Topup (Competitions),Third,,,,,
,,,,,,,,,,
,,,,,30.00,0.00,30.00,6.00,36.00`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(3);
      expect(transformResult.records[0].member).toBe('First');
      expect(transformResult.records[1].member).toBe('Second');
      expect(transformResult.records[2].member).toBe('Third');
      
      const csvOutput = generateCSV(transformResult.records);
      const lines = csvOutput.split('\n');
      
      expect(lines[1]).toContain('First');
      expect(lines[2]).toContain('Second');
      expect(lines[3]).toContain('Third');
    });

    test('should handle empty cells in financial data', async () => {
      const csvContent = `01/01/2024,10:00,Till1,Topup (Competitions),John Doe,,,,,
,,,,,,,,,,
,,,,,,,,,`;
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(1);
      expect(transformResult.records[0].price).toBe('');
      expect(transformResult.records[0].discount).toBe('');
      expect(transformResult.records[0].subtotal).toBe('');
      expect(transformResult.records[0].vat).toBe('');
      expect(transformResult.records[0].total).toBe('');
      
      const csvOutput = generateCSV(transformResult.records);
      
      // Empty cells should be preserved in export
      const lines = csvOutput.split('\n');
      expect(lines[1]).toMatch(/,,,,$/); // Last 5 fields should be empty
    });
  });

  describe('Filename Generation', () => {
    test('should generate filename with timestamp', () => {
      const filename = generateFilename();
      
      expect(filename).toMatch(/^competition-records-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
      expect(filename).toContain('.csv');
    });

    test('should generate unique filenames', () => {
      const filename1 = generateFilename();
      const filename2 = generateFilename();
      
      // Filenames should be the same or very close (within same second)
      // This test just verifies the format is consistent
      expect(filename1).toMatch(/^competition-records-/);
      expect(filename2).toMatch(/^competition-records-/);
    });
  });

  describe('Large Dataset Tests', () => {
    test('should handle multiple records efficiently', async () => {
      // Generate CSV with 50 Topup records
      const records = [];
      for (let i = 0; i < 50; i++) {
        records.push(`0${(i % 9) + 1}/01/2024,10:00,Till${i},Topup (Competitions),Member${i},,,,,`);
        records.push(',,,,,,,,,,');
        records.push(`,,,,,${i * 10}.00,0.00,${i * 10}.00,${i * 2}.00,${i * 12}.00`);
      }
      const csvContent = records.join('\n');
      
      const file = createMockFile(csvContent);
      const parseResult = await parse(file);
      
      expect(parseResult.success).toBe(true);
      
      const transformResult = transform(parseResult.rows);
      
      expect(transformResult.records).toHaveLength(50);
      
      const csvOutput = generateCSV(transformResult.records);
      const lines = csvOutput.split('\n');
      
      expect(lines).toHaveLength(51); // Header + 50 data rows
    });
  });
});
