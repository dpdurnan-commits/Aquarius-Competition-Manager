/**
 * Field Extractor Tests
 * Unit tests for field extraction logic
 */

import { FieldExtractor } from './fieldExtractor.js';
import * as fc from 'fast-check';

describe('FieldExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new FieldExtractor();
  });

  describe('extract() - with both delimiters present', () => {
    test('should extract Player before " &"', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('John Smith');
    });

    test('should extract Competition between "& " and ":"', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.competition).toBe('Stableford');
    });

    test('should clear Member field when extraction occurs', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('');
    });

    test('should preserve all other fields', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.date).toBe('01/01/2024');
      expect(result.time).toBe('10:00:00');
      expect(result.till).toBe('Till 1');
      expect(result.type).toBe('Sale');
      expect(result.price).toBe('5.00');
      expect(result.discount).toBe('0.00');
      expect(result.subtotal).toBe('5.00');
      expect(result.vat).toBe('0.00');
      expect(result.total).toBe('5.00');
      expect(result.sourceRowIndex).toBe(0);
      expect(result.isComplete).toBe(true);
    });
  });

  describe('extract() - without both delimiters', () => {
    test('should preserve Member field when only "&" present (no ":")', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: 'John Smith & Jane Doe',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('John Smith & Jane Doe');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });

    test('should preserve Member field when only ":" present (no " &")', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: 'Competition Entry: Stableford',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('Competition Entry: Stableford');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });

    test('should preserve Member field when no delimiters present', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: 'John Smith',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('John Smith');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });
  });

  describe('extract() - edge cases', () => {
    test('should handle empty Member field', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: '',
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });

    test('should handle null Member field', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: null,
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });

    test('should handle undefined Member field', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup Competitions',
        member: undefined,
        price: '10.00',
        discount: '0.00',
        subtotal: '10.00',
        vat: '0.00',
        total: '10.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.member).toBe('');
      expect(result.player).toBe('');
      expect(result.competition).toBe('');
    });

    test('should handle " &" at the start of Member field', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: ' & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('');
      expect(result.competition).toBe('Stableford');
      expect(result.member).toBe('');
    });

    test('should handle ":" at the end of Member field', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford:',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('John Smith');
      expect(result.competition).toBe('Stableford');
      expect(result.member).toBe('');
    });

    test('should handle multiple " &" characters (use first occurrence)', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John & Jane & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('John');
      expect(result.competition).toBe('Jane & Stableford');
      expect(result.member).toBe('');
    });

    test('should handle multiple ":" characters (use first occurrence)', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith & Stableford: Competition: Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('John Smith');
      expect(result.competition).toBe('Stableford');
      expect(result.member).toBe('');
    });

    test('should trim whitespace from extracted Player', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: '  John Smith   & Stableford: Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.player).toBe('John Smith');
    });

    test('should trim whitespace from extracted Competition', () => {
      const record = {
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Smith &   Stableford  : Competition Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '0.00',
        total: '5.00',
        sourceRowIndex: 0,
        isComplete: true
      };

      const result = extractor.extract(record);

      expect(result.competition).toBe('Stableford');
    });
  });
});

  describe('Property-Based Tests', () => {
    /**
     * Property 1: Player and Competition extraction when delimiters present
     * Validates: Requirements 1.1, 1.2, 1.3
     * 
     * For any TransformedRecord where the Member field contains both " &" and ":" substrings,
     * extracting fields should produce:
     * - A Player field equal to the substring before " &"
     * - A Competition field equal to the substring between "& " and ":"
     * - An empty Member field
     */
    test('Property 1: Player and Competition extraction when delimiters present', () => {
      const extractor = new FieldExtractor();

      // Arbitrary for generating player names (non-empty strings without delimiters)
      const playerArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => !s.includes(' &') && !s.includes(':'));

      // Arbitrary for generating competition names (non-empty strings without delimiters)
      const competitionArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => !s.includes(' &') && !s.includes(':'));

      // Arbitrary for generating optional suffix after colon
      const suffixArb = fc.string({ maxLength: 50 });

      // Arbitrary for generating a complete record with constructed Member field
      const recordArb = fc.record({
        date: fc.string(),
        time: fc.string(),
        till: fc.string(),
        type: fc.string(),
        player: playerArb,
        competition: competitionArb,
        suffix: suffixArb,
        price: fc.string(),
        discount: fc.string(),
        subtotal: fc.string(),
        vat: fc.string(),
        total: fc.string(),
        sourceRowIndex: fc.nat(),
        isComplete: fc.boolean()
      }).map(data => {
        // Construct Member field with both delimiters
        const member = `${data.player} & ${data.competition}:${data.suffix}`;
        
        return {
          record: {
            date: data.date,
            time: data.time,
            till: data.till,
            type: data.type,
            member: member,
            price: data.price,
            discount: data.discount,
            subtotal: data.subtotal,
            vat: data.vat,
            total: data.total,
            sourceRowIndex: data.sourceRowIndex,
            isComplete: data.isComplete
          },
          // Expected values should be trimmed since the implementation trims
          expectedPlayer: data.player.trim(),
          expectedCompetition: data.competition.trim()
        };
      });

      fc.assert(
        fc.property(recordArb, ({ record, expectedPlayer, expectedCompetition }) => {
          const result = extractor.extract(record);

          // Requirement 1.1: Player field should equal substring before " &"
          expect(result.player).toBe(expectedPlayer);

          // Requirement 1.2: Competition field should equal substring between "& " and ":"
          expect(result.competition).toBe(expectedCompetition);

          // Requirement 1.3: Member field should be cleared (empty string)
          expect(result.member).toBe('');

          // All other fields should be preserved
          expect(result.date).toBe(record.date);
          expect(result.time).toBe(record.time);
          expect(result.till).toBe(record.till);
          expect(result.type).toBe(record.type);
          expect(result.price).toBe(record.price);
          expect(result.discount).toBe(record.discount);
          expect(result.subtotal).toBe(record.subtotal);
          expect(result.vat).toBe(record.vat);
          expect(result.total).toBe(record.total);
          expect(result.sourceRowIndex).toBe(record.sourceRowIndex);
          expect(result.isComplete).toBe(record.isComplete);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2: No extraction when delimiters absent
     * Validates: Requirements 1.4
     * 
     * For any TransformedRecord where the Member field does NOT contain both " &" and ":" substrings,
     * extracting fields should:
     * - Preserve the Member field unchanged
     * - Set both Player and Competition fields to empty strings
     */
    test('Property 2: No extraction when delimiters absent', () => {
      const extractor = new FieldExtractor();

      // Generate member strings that lack at least one delimiter
      const memberWithoutBothDelimitersArb = fc.oneof(
        // Case 1: No delimiters at all
        fc.string({ minLength: 0, maxLength: 50 })
          .filter(s => !s.includes(' &') && !s.includes(':')),
        
        // Case 2: Has "&" but not " &" (space before ampersand)
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => s.includes('&') && !s.includes(' &') && !s.includes(':')),
        
        // Case 3: Has ":" but not " &"
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !s.includes(' &') && s.includes(':')),
        
        // Case 4: Has " &" but not ":"
        fc.string({ minLength: 3, maxLength: 50 })
          .map(s => {
            // Ensure it has " &" but not ":"
            if (!s.includes(' &')) {
              return s + ' & something';
            }
            return s;
          })
          .filter(s => s.includes(' &') && !s.includes(':'))
      );

      // Arbitrary for generating a complete record
      const recordArb = fc.record({
        date: fc.string(),
        time: fc.string(),
        till: fc.string(),
        type: fc.string(),
        member: memberWithoutBothDelimitersArb,
        price: fc.string(),
        discount: fc.string(),
        subtotal: fc.string(),
        vat: fc.string(),
        total: fc.string(),
        sourceRowIndex: fc.nat(),
        isComplete: fc.boolean()
      });

      fc.assert(
        fc.property(recordArb, (record) => {
          const originalMember = record.member;
          const result = extractor.extract(record);

          // Requirement 1.4: Member field should be preserved unchanged
          expect(result.member).toBe(originalMember);

          // Requirement 1.4: Player field should be empty string
          expect(result.player).toBe('');

          // Requirement 1.4: Competition field should be empty string
          expect(result.competition).toBe('');

          // All other fields should be preserved
          expect(result.date).toBe(record.date);
          expect(result.time).toBe(record.time);
          expect(result.till).toBe(record.till);
          expect(result.type).toBe(record.type);
          expect(result.price).toBe(record.price);
          expect(result.discount).toBe(record.discount);
          expect(result.subtotal).toBe(record.subtotal);
          expect(result.vat).toBe(record.vat);
          expect(result.total).toBe(record.total);
          expect(result.sourceRowIndex).toBe(record.sourceRowIndex);
          expect(result.isComplete).toBe(record.isComplete);
        }),
        { numRuns: 100 }
      );
    });
  });
