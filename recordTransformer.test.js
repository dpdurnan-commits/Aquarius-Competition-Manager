/**
 * Record Transformer Tests
 */

import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import {
  isTopupRecord,
  isSaleRecord,
  isRefundRecord,
  transformTopupRecord,
  transformSaleRecord,
  transformRefundRecord,
  transform
} from './recordTransformer.js';

describe('Record Identification', () => {
  test('identifies Topup record correctly', () => {
    const row = ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''];
    expect(isTopupRecord(row)).toBe(true);
  });

  test('rejects row with empty date', () => {
    const row = ['', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''];
    expect(isTopupRecord(row)).toBe(false);
  });

  test('rejects row with wrong type', () => {
    const row = ['2024-01-15', '10:30', 'Till 1', 'Other', 'John Doe', '', '', '', '', ''];
    expect(isTopupRecord(row)).toBe(false);
  });

  test('identifies Sale record with Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '10.00', '0.00', '10.00', '2.00', '12.00']
    ];
    expect(isSaleRecord(rows, 0)).toBe(true);
  });

  test('rejects Sale record without Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Other Item', '10.00', '0.00', '10.00', '2.00', '12.00']
    ];
    expect(isSaleRecord(rows, 0)).toBe(false);
  });

  test('identifies Refund record with Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Refund', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '-10.00', '0.00', '-10.00', '-2.00', '-12.00']
    ];
    expect(isRefundRecord(rows, 0)).toBe(true);
  });

  test('rejects Refund record without Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Refund', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Other Item', '-10.00', '0.00', '-10.00', '-2.00', '-12.00']
    ];
    expect(isRefundRecord(rows, 0)).toBe(false);
  });

  // Feature: competition-csv-import, Property 5: Topup records are correctly identified
  test('Property 5: Topup records are correctly identified', () => {
    fc.assert(
      fc.property(
        // Generate rows with at least 10 columns
        fc.array(fc.string(), { minLength: 10, maxLength: 15 }),
        (row) => {
          const result = isTopupRecord(row);
          
          // A row should be identified as Topup if and only if:
          // 1. Column A (Date) is non-empty (not null, not empty string, not whitespace-only)
          // 2. Column D (Type) equals exactly "Topup Competitions"
          const hasNonEmptyDate = row[0] && row[0].trim() !== '';
          const isTopupType = row[3] === 'Topup Competitions';
          
          const expectedResult = hasNonEmptyDate && isTopupType;
          
          // The function result should match our expected result (both are booleans)
          if (expectedResult) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 6: Only qualifying records are retained
  test('Property 6: Only qualifying records are retained', () => {
    fc.assert(
      fc.property(
        // Generate random CSV data with at least 10 columns per row
        fc.array(
          fc.array(fc.string(), { minLength: 10, maxLength: 15 }),
          { minLength: 0, maxLength: 50 }
        ),
        (rows) => {
          const result = transform(rows);
          
          // For each record in the output, verify it meets one of the three criteria
          for (const record of result.records) {
            const sourceRow = rows[record.sourceRowIndex];
            
            // Must have non-empty date
            expect(sourceRow[0]).toBeTruthy();
            expect(sourceRow[0].trim()).not.toBe('');
            
            const recordType = sourceRow[3];
            
            // Must be one of the three qualifying types
            const isValidType = 
              recordType === 'Topup Competitions' ||
              recordType === 'Sale' ||
              recordType === 'Refund';
            
            expect(isValidType).toBe(true);
            
            // If Sale or Refund, row+2 must exist and have "Competition Entry" in Column E
            if (recordType === 'Sale' || recordType === 'Refund') {
              const targetRow = rows[record.sourceRowIndex + 2];
              expect(targetRow).toBeDefined();
              expect(targetRow[4]).toBeDefined();
              expect(targetRow[4]).toContain('Competition Entry');
            }
          }
          
          // Verify that all qualifying records are included
          // Count how many rows should qualify
          let expectedCount = 0;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip rows with empty date
            if (!row[0] || row[0].trim() === '') {
              continue;
            }
            
            const type = row[3];
            
            // Check if it's a Topup
            if (type === 'Topup Competitions') {
              expectedCount++;
              continue;
            }
            
            // Check if it's a Sale with Competition Entry
            if (type === 'Sale') {
              const targetRow = rows[i + 2];
              if (targetRow && targetRow[4] && targetRow[4].includes('Competition Entry')) {
                expectedCount++;
                continue;
              }
            }
            
            // Check if it's a Refund with Competition Entry
            if (type === 'Refund') {
              const targetRow = rows[i + 2];
              if (targetRow && targetRow[4] && targetRow[4].includes('Competition Entry')) {
                expectedCount++;
                continue;
              }
            }
          }
          
          // The number of records should match the expected count
          expect(result.records.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Record Transformation', () => {
  test('transforms Topup record with complete data', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '50.00', '0.00', '50.00', '10.00', '60.00']
    ];
    
    const result = transformTopupRecord(rows, 0);
    
    expect(result.date).toBe('2024-01-15');
    expect(result.time).toBe('10:30');
    expect(result.till).toBe('Till 1');
    expect(result.type).toBe('Topup Competitions');
    expect(result.member).toBe('John Doe');
    expect(result.price).toBe('50.00');
    expect(result.discount).toBe('0.00');
    expect(result.subtotal).toBe('50.00');
    expect(result.vat).toBe('10.00');
    expect(result.total).toBe('60.00');
    expect(result.isComplete).toBe(true);
  });

  test('transforms Topup record with missing row+2', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
    ];
    
    const result = transformTopupRecord(rows, 0);
    
    expect(result.isComplete).toBe(false);
    expect(result.price).toBe('');
    expect(result.total).toBe('');
  });

  test('transforms Sale record with concatenated member', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '15.00', '0.00', '15.00', '3.00', '18.00']
    ];
    
    const result = transformSaleRecord(rows, 0);
    
    expect(result.member).toBe('Jane Smith & Competition Entry');
    expect(result.price).toBe('15.00');
    expect(result.isComplete).toBe(true);
  });

  test('transforms Refund record with concatenated member', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Refund', 'Bob Jones', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '-15.00', '0.00', '-15.00', '-3.00', '-18.00']
    ];
    
    const result = transformRefundRecord(rows, 0);
    
    expect(result.member).toBe('Bob Jones & Competition Entry');
    expect(result.price).toBe('-15.00');
    expect(result.isComplete).toBe(true);
  });

  // Feature: competition-csv-import, Property 7: Transformation preserves original columns
  test('Property 7: Transformation preserves original columns', () => {
    fc.assert(
      fc.property(
        // Generate qualifying records with random data
        fc.oneof(
          // Topup record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'topup',
            rows: [
              [data.date, data.time, data.till, 'Topup Competitions', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', '', data.price, data.discount, data.subtotal, data.vat, data.total]
            ]
          })),
          // Sale record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'sale',
            rows: [
              [data.date, data.time, data.till, 'Sale', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ]
          })),
          // Refund record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'refund',
            rows: [
              [data.date, data.time, data.till, 'Refund', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ]
          }))
        ),
        (testData) => {
          const { type, rows } = testData;
          const result = transform(rows);
          
          // Should have exactly one record
          expect(result.records.length).toBe(1);
          
          const record = result.records[0];
          const originalRow = rows[0];
          
          // Property: Columns A-D must be preserved for all record types
          expect(record.date).toBe(originalRow[0]);
          expect(record.time).toBe(originalRow[1]);
          expect(record.till).toBe(originalRow[2]);
          expect(record.type).toBe(originalRow[3]);
          
          // For Topup records, Column E (Member) should also be preserved
          if (type === 'topup') {
            expect(record.member).toBe(originalRow[4]);
          }
          
          // For Sale and Refund records, Column E is concatenated (tested in Property 9)
          // but Columns A-D must still be preserved
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 8: Financial data comes from row+2
  test('Property 8: Financial data comes from row+2', () => {
    fc.assert(
      fc.property(
        // Generate qualifying records with random financial data
        fc.oneof(
          // Topup record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'topup',
            rows: [
              [data.date, data.time, data.till, 'Topup Competitions', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', '', data.price, data.discount, data.subtotal, data.vat, data.total]
            ],
            expectedFinancials: {
              price: data.price,
              discount: data.discount,
              subtotal: data.subtotal,
              vat: data.vat,
              total: data.total
            }
          })),
          // Sale record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'sale',
            rows: [
              [data.date, data.time, data.till, 'Sale', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ],
            expectedFinancials: {
              price: data.price,
              discount: data.discount,
              subtotal: data.subtotal,
              vat: data.vat,
              total: data.total
            }
          })),
          // Refund record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'refund',
            rows: [
              [data.date, data.time, data.till, 'Refund', data.member, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ],
            expectedFinancials: {
              price: data.price,
              discount: data.discount,
              subtotal: data.subtotal,
              vat: data.vat,
              total: data.total
            }
          }))
        ),
        (testData) => {
          const { rows, expectedFinancials } = testData;
          const result = transform(rows);
          
          // Should have exactly one record
          expect(result.records.length).toBe(1);
          
          const record = result.records[0];
          
          // Property: Financial data (Columns F-J) must come from row+2
          // The transformed record's financial columns should match the values from row index 2
          expect(record.price).toBe(expectedFinancials.price);
          expect(record.discount).toBe(expectedFinancials.discount);
          expect(record.subtotal).toBe(expectedFinancials.subtotal);
          expect(record.vat).toBe(expectedFinancials.vat);
          expect(record.total).toBe(expectedFinancials.total);
          
          // Record should be marked as complete since row+2 exists
          expect(record.isComplete).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 9: Member concatenation for Sale and Refund
  test('Property 9: Member concatenation for Sale and Refund', () => {
    fc.assert(
      fc.property(
        // Generate Sale or Refund records with random member names
        fc.oneof(
          // Sale record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            memberCurrent: fc.string(),
            memberRow2: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'sale',
            rows: [
              [data.date, data.time, data.till, 'Sale', data.memberCurrent, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', data.memberRow2 + ' Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ],
            expectedMember: data.memberCurrent + ' & ' + data.memberRow2 + ' Competition Entry'
          })),
          // Refund record generator
          fc.record({
            date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
            time: fc.string(),
            till: fc.string(),
            memberCurrent: fc.string(),
            memberRow2: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string()
          }).map(data => ({
            type: 'refund',
            rows: [
              [data.date, data.time, data.till, 'Refund', data.memberCurrent, '', '', '', '', ''],
              ['', '', '', '', '', '', '', '', '', ''],
              ['', '', '', '', data.memberRow2 + ' Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
            ],
            expectedMember: data.memberCurrent + ' & ' + data.memberRow2 + ' Competition Entry'
          }))
        ),
        (testData) => {
          const { rows, expectedMember } = testData;
          const result = transform(rows);
          
          // Should have exactly one record
          expect(result.records.length).toBe(1);
          
          const record = result.records[0];
          
          // Property: For Sale and Refund records, Column E (Member) should be concatenated
          // as: currentRow[E] + " & " + row+2[E]
          expect(record.member).toBe(expectedMember);
          
          // Verify the concatenation format
          expect(record.member).toContain(' & ');
          
          // Verify it contains both parts
          const parts = record.member.split(' & ');
          expect(parts.length).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: competition-csv-import, Property 10: Record order is preserved
  test('Property 10: Record order is preserved', () => {
    fc.assert(
      fc.property(
        // Generate CSV data with multiple qualifying records
        fc.array(
          fc.oneof(
            // Topup record (3 rows)
            fc.record({
              date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
              time: fc.string(),
              till: fc.string(),
              member: fc.string(),
              price: fc.string(),
              discount: fc.string(),
              subtotal: fc.string(),
              vat: fc.string(),
              total: fc.string()
            }).map(data => ({
              rows: [
                [data.date, data.time, data.till, 'Topup Competitions', data.member, '', '', '', '', ''],
                ['', '', '', '', '', '', '', '', '', ''],
                ['', '', '', '', '', data.price, data.discount, data.subtotal, data.vat, data.total]
              ],
              isQualifying: true
            })),
            // Sale record with Competition Entry (3 rows)
            fc.record({
              date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
              time: fc.string(),
              till: fc.string(),
              member: fc.string(),
              price: fc.string(),
              discount: fc.string(),
              subtotal: fc.string(),
              vat: fc.string(),
              total: fc.string()
            }).map(data => ({
              rows: [
                [data.date, data.time, data.till, 'Sale', data.member, '', '', '', '', ''],
                ['', '', '', '', '', '', '', '', '', ''],
                ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
              ],
              isQualifying: true
            })),
            // Refund record with Competition Entry (3 rows)
            fc.record({
              date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
              time: fc.string(),
              till: fc.string(),
              member: fc.string(),
              price: fc.string(),
              discount: fc.string(),
              subtotal: fc.string(),
              vat: fc.string(),
              total: fc.string()
            }).map(data => ({
              rows: [
                [data.date, data.time, data.till, 'Refund', data.member, '', '', '', '', ''],
                ['', '', '', '', '', '', '', '', '', ''],
                ['', '', '', '', 'Competition Entry', data.price, data.discount, data.subtotal, data.vat, data.total]
              ],
              isQualifying: true
            })),
            // Non-qualifying record (Sale without Competition Entry)
            fc.record({
              date: fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
              time: fc.string(),
              till: fc.string(),
              member: fc.string()
            }).map(data => ({
              rows: [
                [data.date, data.time, data.till, 'Sale', data.member, '', '', '', '', ''],
                ['', '', '', '', '', '', '', '', '', ''],
                ['', '', '', '', 'Other Item', '10.00', '0.00', '10.00', '2.00', '12.00']
              ],
              isQualifying: false
            })),
            // Non-qualifying record (empty date)
            fc.record({
              time: fc.string(),
              till: fc.string(),
              member: fc.string()
            }).map(data => ({
              rows: [
                ['', data.time, data.till, 'Topup Competitions', data.member, '', '', '', '', ''],
                ['', '', '', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '10.00', '0.00', '10.00', '2.00', '12.00']
              ],
              isQualifying: false
            }))
          ),
          { minLength: 2, maxLength: 10 }
        ),
        (recordGroups) => {
          // Flatten the record groups into a single CSV array
          const rows = [];
          const qualifyingIndices = [];
          
          for (const group of recordGroups) {
            const startIndex = rows.length;
            rows.push(...group.rows);
            
            // Track which row indices should produce qualifying records
            if (group.isQualifying) {
              qualifyingIndices.push(startIndex);
            }
          }
          
          // Transform the CSV data
          const result = transform(rows);
          
          // Property: The order of records in the output should match their order in the input
          // Extract the sourceRowIndex values from the transformed records
          const outputIndices = result.records.map(r => r.sourceRowIndex);
          
          // Verify that the output indices are in ascending order
          for (let i = 1; i < outputIndices.length; i++) {
            expect(outputIndices[i]).toBeGreaterThan(outputIndices[i - 1]);
          }
          
          // Verify that the output indices match the expected qualifying indices
          // (they should be the same set, just filtered)
          const expectedIndices = qualifyingIndices.filter(idx => {
            // Only include indices that actually qualify
            const row = rows[idx];
            if (!row || !row[0] || row[0].trim() === '') return false;
            
            const type = row[3];
            if (type === 'Topup Competitions') return true;
            
            if (type === 'Sale' || type === 'Refund') {
              const targetRow = rows[idx + 2];
              return targetRow && targetRow[4] && targetRow[4].includes('Competition Entry');
            }
            
            return false;
          });
          
          expect(outputIndices).toEqual(expectedIndices);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Full Transform', () => {
  test('transforms multiple records and filters correctly', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '50.00', '0.00', '50.00', '10.00', '60.00'],
      ['2024-01-15', '11:00', 'Till 2', 'Sale', 'Jane Smith', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '15.00', '0.00', '15.00', '3.00', '18.00'],
      ['2024-01-15', '12:00', 'Till 1', 'Sale', 'Other', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Not Competition', '20.00', '0.00', '20.00', '4.00', '24.00']
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(2);
    expect(result.records[0].type).toBe('Topup Competitions');
    expect(result.records[1].type).toBe('Sale');
    expect(result.records[1].member).toBe('Jane Smith & Competition Entry');
  });

  test('handles empty input', () => {
    const result = transform([]);
    expect(result.records.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  test('collects errors for incomplete records', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(1);
    expect(result.records[0].isComplete).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].severity).toBe('warning');
  });
});

describe('Edge Cases', () => {
  test('handles records at end of file (no row+2) - Topup', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '']
      // Missing row+2
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(1);
    expect(result.records[0].isComplete).toBe(false);
    expect(result.records[0].price).toBe('');
    expect(result.records[0].total).toBe('');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('row+2 does not exist');
  });

  test('handles records at end of file (no row+2) - Sale', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '']
      // Missing row+2 with Competition Entry
    ];
    
    const result = transform(rows);
    
    // Sale without row+2 should not qualify
    expect(result.records.length).toBe(0);
  });

  test('handles records at end of file (no row+2) - Refund', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Refund', 'Bob Jones', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '']
      // Missing row+2 with Competition Entry
    ];
    
    const result = transform(rows);
    
    // Refund without row+2 should not qualify
    expect(result.records.length).toBe(0);
  });

  test('handles records with empty cells', () => {
    const rows = [
      ['2024-01-15', '', '', 'Topup Competitions', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '']
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(1);
    expect(result.records[0].time).toBe('');
    expect(result.records[0].till).toBe('');
    expect(result.records[0].member).toBe('');
    expect(result.records[0].price).toBe('');
    expect(result.records[0].isComplete).toBe(true);
  });

  test('handles multiple qualifying records in sequence', () => {
    const rows = [
      // First Topup
      ['2024-01-15', '10:00', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '50.00', '0.00', '50.00', '10.00', '60.00'],
      // Second Topup immediately after
      ['2024-01-15', '10:30', 'Till 2', 'Topup Competitions', 'Jane Smith', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '25.00', '0.00', '25.00', '5.00', '30.00'],
      // Sale
      ['2024-01-15', '11:00', 'Till 1', 'Sale', 'Bob Jones', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Competition Entry', '15.00', '0.00', '15.00', '3.00', '18.00']
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(3);
    expect(result.records[0].type).toBe('Topup Competitions');
    expect(result.records[0].member).toBe('John Doe');
    expect(result.records[0].total).toBe('60.00');
    expect(result.records[1].type).toBe('Topup Competitions');
    expect(result.records[1].member).toBe('Jane Smith');
    expect(result.records[1].total).toBe('30.00');
    expect(result.records[2].type).toBe('Sale');
    expect(result.records[2].member).toBe('Bob Jones & Competition Entry');
    expect(result.records[2].total).toBe('18.00');
  });

  test('handles Sale record where row+2 exists but no Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Regular Item', '15.00', '0.00', '15.00', '3.00', '18.00']
    ];
    
    const result = transform(rows);
    
    // Should not qualify because row+2 doesn't contain "Competition Entry"
    expect(result.records.length).toBe(0);
  });

  test('handles Refund record where row+2 exists but no Competition Entry', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Refund', 'Bob Jones', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', 'Regular Item', '-15.00', '0.00', '-15.00', '-3.00', '-18.00']
    ];
    
    const result = transform(rows);
    
    // Should not qualify because row+2 doesn't contain "Competition Entry"
    expect(result.records.length).toBe(0);
  });

  test('handles Topup at exact end of file (only 1 row)', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Topup Competitions', 'John Doe', '', '', '', '', '']
    ];
    
    const result = transform(rows);
    
    expect(result.records.length).toBe(1);
    expect(result.records[0].isComplete).toBe(false);
    expect(result.errors.length).toBe(1);
  });

  test('handles Sale at exact end of file (only 1 row)', () => {
    const rows = [
      ['2024-01-15', '10:30', 'Till 1', 'Sale', 'Jane Smith', '', '', '', '', '']
    ];
    
    const result = transform(rows);
    
    // Should not qualify because row+2 doesn't exist
    expect(result.records.length).toBe(0);
  });
});
