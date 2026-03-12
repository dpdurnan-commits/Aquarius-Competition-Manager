/**
 * Unit Tests for Weekly Summarizer
 */

import { WeeklySummarizer } from './weeklySummarizer.js';
import * as fc from 'fast-check';

describe('WeeklySummarizer', () => {
  let summarizer;

  beforeEach(() => {
    summarizer = new WeeklySummarizer();
  });

  describe('getMondayOfWeek', () => {
    test('should return Monday for a date that is already Monday', () => {
      const monday = new Date('2024-01-01'); // This is a Monday
      const result = summarizer.getMondayOfWeek(monday);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    test('should return Monday for a date that is Sunday', () => {
      const sunday = new Date('2024-01-07'); // This is a Sunday
      const result = summarizer.getMondayOfWeek(sunday);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(1); // Should be Jan 1
    });

    test('should return Monday for a date in the middle of the week', () => {
      const wednesday = new Date('2024-01-03'); // This is a Wednesday
      const result = summarizer.getMondayOfWeek(wednesday);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(1); // Should be Jan 1
    });
  });

  describe('getSundayOfWeek', () => {
    test('should return Sunday 23:59:59 for any date in the week', () => {
      const monday = new Date('2024-01-01');
      const result = summarizer.getSundayOfWeek(monday);
      
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(7); // Should be Jan 7
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('generateWeeklyPeriods', () => {
    test('should generate single period for dates within same week', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-03'); // Wednesday
      
      const periods = summarizer.generateWeeklyPeriods(startDate, endDate);
      
      expect(periods).toHaveLength(1);
      expect(periods[0].start.getDay()).toBe(1); // Monday
      expect(periods[0].end.getDay()).toBe(0); // Sunday
    });

    test('should generate multiple periods for dates spanning multiple weeks', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-15'); // Monday two weeks later
      
      const periods = summarizer.generateWeeklyPeriods(startDate, endDate);
      
      expect(periods).toHaveLength(3);
      expect(periods[0].start.getDate()).toBe(1);
      expect(periods[1].start.getDate()).toBe(8);
      expect(periods[2].start.getDate()).toBe(15);
    });

    test('should handle dates spanning year boundary', () => {
      const startDate = new Date('2023-12-25'); // Monday
      const endDate = new Date('2024-01-08'); // Monday
      
      const periods = summarizer.generateWeeklyPeriods(startDate, endDate);
      
      expect(periods.length).toBeGreaterThan(1);
      expect(periods[0].start.getFullYear()).toBe(2023);
      expect(periods[periods.length - 1].end.getFullYear()).toBe(2024);
    });

    /**
     * Property 10: Weekly periods span Monday to Sunday
     * Validates: Requirements 4.1
     */
    test('Property 10: Weekly periods span Monday to Sunday', () => {
      // Generate arbitrary date ranges
      const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
      
      fc.assert(
        fc.property(
          dateArb,
          dateArb,
          (date1, date2) => {
            // Ensure startDate <= endDate
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;
            
            const periods = summarizer.generateWeeklyPeriods(startDate, endDate);
            
            // For each generated period
            for (const period of periods) {
              // Requirement 4.1: Start date should be Monday at 00:00:00
              expect(period.start.getDay()).toBe(1); // Monday
              expect(period.start.getHours()).toBe(0);
              expect(period.start.getMinutes()).toBe(0);
              expect(period.start.getSeconds()).toBe(0);
              expect(period.start.getMilliseconds()).toBe(0);
              
              // Requirement 4.1: End date should be Sunday at 23:59:59
              expect(period.end.getDay()).toBe(0); // Sunday
              expect(period.end.getHours()).toBe(23);
              expect(period.end.getMinutes()).toBe(59);
              expect(period.end.getSeconds()).toBe(59);
              
              // Verify the end date is the Sunday of the same week as the start Monday
              // Calculate by checking that end date is 6 days after start date (accounting for DST)
              const startCopy = new Date(period.start);
              startCopy.setDate(startCopy.getDate() + 6);
              startCopy.setHours(23, 59, 59, 999);
              
              // Compare dates (year, month, day) to avoid DST issues
              expect(period.end.getFullYear()).toBe(startCopy.getFullYear());
              expect(period.end.getMonth()).toBe(startCopy.getMonth());
              expect(period.end.getDate()).toBe(startCopy.getDate());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('groupRecordsByWeek', () => {
    test('should assign records to correct weekly periods', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', total: '10.00', type: 'Sale', till: '' },
        { date: '08/01/2024', time: '10:00:00', total: '20.00', type: 'Sale', till: '' }
      ];
      
      const periods = summarizer.generateWeeklyPeriods(
        new Date('2024-01-01'),
        new Date('2024-01-08')
      );
      
      const grouped = summarizer.groupRecordsByWeek(records, periods);
      
      expect(grouped.get(periods[0])).toHaveLength(1);
      expect(grouped.get(periods[1])).toHaveLength(1);
    });

    test('should handle records with invalid dates gracefully', () => {
      const records = [
        { date: 'invalid', time: '10:00:00', total: '10.00', type: 'Sale', till: '' },
        { date: '01/01/2024', time: '10:00:00', total: '20.00', type: 'Sale', till: '' }
      ];
      
      const periods = summarizer.generateWeeklyPeriods(
        new Date('2024-01-01'),
        new Date('2024-01-01')
      );
      
      const grouped = summarizer.groupRecordsByWeek(records, periods);
      
      // Should only have the valid record
      expect(grouped.get(periods[0])).toHaveLength(1);
    });

    /**
     * Property 11: Transaction assignment to correct week
     * Validates: Requirements 4.2
     */
    test('Property 11: Transaction assignment to correct week', () => {
      // Generate arbitrary dates and times for transactions
      const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
      const timeArb = fc.tuple(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      const recordArb = fc.record({
        date: dateArb.map(d => {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }),
        time: timeArb,
        total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
        till: fc.constantFrom('', 'Till 1')
      });
      
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            // Find earliest and latest dates
            const dates = records.map(r => summarizer.parseDate(r.date, r.time));
            const earliestDate = new Date(Math.min(...dates));
            const latestDate = new Date(Math.max(...dates));
            
            // Generate weekly periods
            const periods = summarizer.generateWeeklyPeriods(earliestDate, latestDate);
            
            // Group records by week
            const grouped = summarizer.groupRecordsByWeek(records, periods);
            
            // Requirement 4.2: Each transaction should be assigned to the weekly period
            // containing its date and time (between period start inclusive and end inclusive)
            for (const record of records) {
              const recordDate = summarizer.parseDate(record.date, record.time);
              
              // Find which period this record should belong to
              let foundInCorrectPeriod = false;
              
              for (const period of periods) {
                const recordsInPeriod = grouped.get(period) || [];
                const isInPeriod = recordsInPeriod.includes(record);
                
                // Check if record date falls within this period
                const shouldBeInPeriod = recordDate >= period.start && recordDate <= period.end;
                
                if (shouldBeInPeriod) {
                  // Record should be in this period
                  expect(isInPeriod).toBe(true);
                  foundInCorrectPeriod = true;
                } else {
                  // Record should NOT be in this period
                  expect(isInPeriod).toBe(false);
                }
              }
              
              // Every record should be assigned to exactly one period
              expect(foundInCorrectPeriod).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Complete weekly period coverage
   * Validates: Requirements 4.3
   */
  test('Property 12: Complete weekly period coverage', () => {
    // Generate arbitrary dates for transactions
    const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
    const timeArb = fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    
    const recordArb = fc.record({
      date: dateArb.map(d => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }),
      time: timeArb,
      total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
      type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
      till: fc.constantFrom('', 'Till 1')
    });
    
    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 1, maxLength: 50 }),
        (records) => {
          const summaries = summarizer.generateSummaries(records);
          
          if (summaries.length === 0) return true;
          
          // Requirement 4.3: Summaries should include one row for each weekly period
          // from the Monday of the earliest transaction's week through the Sunday of
          // the latest transaction's week, with no gaps
          
          // Verify no gaps: each summary's fromDate should be exactly 7 days after the previous
          for (let i = 1; i < summaries.length; i++) {
            const prevEnd = summaries[i - 1].toDate;
            const currentStart = summaries[i].fromDate;
            
            // Current start should be the day after previous end
            const expectedStart = new Date(prevEnd);
            expectedStart.setDate(expectedStart.getDate() + 1);
            expectedStart.setHours(0, 0, 0, 0);
            
            expect(currentStart.getFullYear()).toBe(expectedStart.getFullYear());
            expect(currentStart.getMonth()).toBe(expectedStart.getMonth());
            expect(currentStart.getDate()).toBe(expectedStart.getDate());
          }
          
          // Verify first summary starts on a Monday
          expect(summaries[0].fromDate.getDay()).toBe(1); // Monday
          
          // Verify last summary ends on a Sunday
          const lastSummary = summaries[summaries.length - 1];
          expect(lastSummary.toDate.getDay()).toBe(0); // Sunday
          
          // Verify all transactions fall within the covered period range
          const dates = records.map(r => summarizer.parseDate(r.date, r.time));
          const earliestTransaction = new Date(Math.min(...dates));
          const latestTransaction = new Date(Math.max(...dates));
          
          // First summary should start on or before earliest transaction
          expect(summaries[0].fromDate.getTime()).toBeLessThanOrEqual(earliestTransaction.getTime());
          
          // Last summary should end on or after latest transaction
          expect(lastSummary.toDate.getTime()).toBeGreaterThanOrEqual(latestTransaction.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Weekly summaries are chronologically ordered
   * Validates: Requirements 4.4
   */
  test('Property 13: Weekly summaries are chronologically ordered', () => {
    // Generate arbitrary dates for transactions
    const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
    const timeArb = fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    
    const recordArb = fc.record({
      date: dateArb.map(d => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }),
      time: timeArb,
      total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
      type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
      till: fc.constantFrom('', 'Till 1')
    });
    
    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 1, maxLength: 50 }),
        (records) => {
          const summaries = summarizer.generateSummaries(records);
          
          if (summaries.length <= 1) return true;
          
          // Requirement 4.4: Each summary's fromDate should be later than or equal to
          // all previous summaries' fromDates (chronologically ordered)
          for (let i = 1; i < summaries.length; i++) {
            const prevFromDate = summaries[i - 1].fromDate;
            const currentFromDate = summaries[i].fromDate;
            
            // Current fromDate should be after previous fromDate
            expect(currentFromDate.getTime()).toBeGreaterThan(prevFromDate.getTime());
            
            // Also verify toDate ordering
            const prevToDate = summaries[i - 1].toDate;
            const currentToDate = summaries[i].toDate;
            expect(currentToDate.getTime()).toBeGreaterThan(prevToDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  describe('sumWhere', () => {
    test('should sum Total field for matching records', () => {
      const records = [
        { total: '10.50', type: 'Sale' },
        { total: '20.00', type: 'Sale' },
        { total: '15.00', type: 'Refund' }
      ];
      
      const sum = summarizer.sumWhere(records, r => r.type === 'Sale');
      
      expect(sum).toBe(30.50);
    });

    test('should return 0 for no matching records', () => {
      const records = [
        { total: '10.00', type: 'Sale' }
      ];
      
      const sum = summarizer.sumWhere(records, r => r.type === 'Refund');
      
      expect(sum).toBe(0);
    });

    test('should handle invalid numeric values gracefully', () => {
      const records = [
        { total: '10.00', type: 'Sale' },
        { total: 'invalid', type: 'Sale' },
        { total: '20.00', type: 'Sale' }
      ];
      
      const sum = summarizer.sumWhere(records, r => r.type === 'Sale');
      
      expect(sum).toBe(30.00);
    });
  });

  describe('calculatePurseComponents', () => {
    test('should calculate all purse components correctly', () => {
      const records = [
        { till: '', type: 'Topup (Competitions)', total: '100.00' },
        { till: 'Till 1', type: 'Topup (Competitions)', total: '50.00' },
        { till: '', type: 'Sale', total: '30.00' },
        { till: '', type: 'Refund', total: '10.00' }
      ];
      
      const components = summarizer.calculatePurseComponents(records);
      
      expect(components.applicationTopUp).toBe(100.00);
      expect(components.tillTopUp).toBe(50.00);
      expect(components.entries).toBe(30.00);
      expect(components.refunds).toBe(10.00);
    });
  });

  describe('calculatePotComponents', () => {
    test('should return zero winnings when no transactions are flagged', () => {
      const records = [
        { total: '50.00', type: 'Topup (Competitions)', isWinning: false },
        { total: '30.00', type: 'Topup (Competitions)', isWinning: false }
      ];
      
      const components = summarizer.calculatePotComponents(records);
      
      expect(components.winningsPaid).toBe(0);
      expect(components.costs).toBe(0);
    });

    test('should sum flagged transactions for winnings paid', () => {
      const records = [
        { total: '50.00', type: 'Topup (Competitions)', isWinning: true },
        { total: '30.00', type: 'Topup (Competitions)', isWinning: false },
        { total: '20.00', type: 'Topup (Competitions)', isWinning: true }
      ];
      
      const components = summarizer.calculatePotComponents(records);
      
      expect(components.winningsPaid).toBe(70.00);
      expect(components.costs).toBe(0);
    });

    test('should handle multiple flagged transactions in same week', () => {
      const records = [
        { total: '100.00', type: 'Topup (Competitions)', isWinning: true },
        { total: '50.00', type: 'Topup (Competitions)', isWinning: true },
        { total: '25.00', type: 'Topup (Competitions)', isWinning: true }
      ];
      
      const components = summarizer.calculatePotComponents(records);
      
      expect(components.winningsPaid).toBe(175.00);
    });

    test('should return zero when no transactions are flagged', () => {
      const records = [
        { total: '50.00', type: 'Topup (Competitions)' },
        { total: '30.00', type: 'Sale' }
      ];
      
      const components = summarizer.calculatePotComponents(records);
      
      expect(components.winningsPaid).toBe(0);
    });

    test('should ignore unflagged transactions', () => {
      const records = [
        { total: '50.00', type: 'Topup (Competitions)', isWinning: true },
        { total: '100.00', type: 'Topup (Competitions)', isWinning: false },
        { total: '30.00', type: 'Sale', isWinning: false }
      ];
      
      const components = summarizer.calculatePotComponents(records);
      
      expect(components.winningsPaid).toBe(50.00);
    });
  });

  describe('generateSummaries', () => {
    test('should return empty array for empty records', () => {
      const summaries = summarizer.generateSummaries([]);
      
      expect(summaries).toEqual([]);
    });

    test('should initialize first week with starting balances of 0', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '10.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      expect(summaries).toHaveLength(1);
      expect(summaries[0].startingPurse).toBe(0);
      expect(summaries[0].startingPot).toBe(0);
    });

    test('should calculate single week with multiple transactions', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '100.00' },
        { date: '02/01/2024', time: '10:00:00', till: 'Till 1', type: 'Topup (Competitions)', total: '50.00' },
        { date: '03/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '30.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      expect(summaries).toHaveLength(1);
      expect(summaries[0].purseApplicationTopUp).toBe(100.00);
      expect(summaries[0].purseTillTopUp).toBe(50.00);
      expect(summaries[0].competitionEntries).toBe(30.00);
      expect(summaries[0].finalPurse).toBe(120.00); // 0 + 100 + 50 - 30
      expect(summaries[0].finalPot).toBe(30.00); // 0 + 30 (entries)
    });

    test('should handle multiple weeks with rolling balances', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
        { date: '08/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      expect(summaries).toHaveLength(2);
      
      // First week
      expect(summaries[0].startingPurse).toBe(0);
      expect(summaries[0].competitionEntries).toBe(100.00);
      expect(summaries[0].finalPurse).toBe(-100.00); // 0 - 100
      
      // Second week - starting balance should equal first week's final
      expect(summaries[1].startingPurse).toBe(-100.00);
      expect(summaries[1].competitionEntries).toBe(50.00);
      expect(summaries[1].finalPurse).toBe(-150.00); // -100 - 50
    });

    test('should include weeks with no transactions (gaps)', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
        { date: '15/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      expect(summaries).toHaveLength(3); // Week 1, Week 2 (gap), Week 3
      
      // Middle week should have no transactions but maintain balance
      expect(summaries[1].competitionEntries).toBe(0);
      expect(summaries[1].startingPurse).toBe(-100.00); // From week 1: 0 - 100
      expect(summaries[1].finalPurse).toBe(-100.00);
    });

    test('should apply Competition Purse formula correctly', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '100.00' },
        { date: '02/01/2024', time: '10:00:00', till: 'Till 1', type: 'Topup (Competitions)', total: '50.00' },
        { date: '03/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '30.00' },
        { date: '04/01/2024', time: '10:00:00', till: '', type: 'Refund', total: '-10.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Final Purse = Starting + AppTopUp + TillTopUp - Entries - Refunds
      // = 0 + 100 + 50 - 30 - (-10) = 130
      expect(summaries[0].finalPurse).toBe(130.00);
    });

    test('should apply Competition Pot formula correctly', () => {
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '30.00' },
        { date: '02/01/2024', time: '10:00:00', till: '', type: 'Refund', total: '-10.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Final Pot = Starting + Entries - Refunds - Winnings - Costs
      // = 0 + 30 - (-10) - 0 - 0 = 40
      expect(summaries[0].finalPot).toBe(40.00);
    });

    test('should handle week spanning year boundary', () => {
      const records = [
        { date: '30/12/2023', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
        { date: '02/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' }
      ];
      
      const summaries = summarizer.generateSummaries(records);
      
      // Both transactions should be in the same week (Mon 25 Dec 2023 to Sun 31 Dec 2023 and Mon 1 Jan 2024 to Sun 7 Jan 2024)
      expect(summaries.length).toBeGreaterThanOrEqual(1);
      
      // Verify year boundary is handled correctly
      expect(summaries[0].fromDate.getFullYear()).toBe(2023);
      if (summaries.length > 1) {
        expect(summaries[1].fromDate.getFullYear()).toBe(2024);
      }
      
      // Verify balances roll over correctly across year boundary
      if (summaries.length > 1) {
        expect(summaries[1].startingPurse).toBe(summaries[0].finalPurse);
        expect(summaries[1].startingPot).toBe(summaries[0].finalPot);
      }
    });

    /**
     * Property 14: Rolling balance consistency
     * Validates: Requirements 5.1, 6.1, 8.1
     */
    test('Property 14: Rolling balance consistency', () => {
      // Generate arbitrary dates for transactions
      const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
      const timeArb = fc.tuple(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      const recordArb = fc.record({
        date: dateArb.map(d => {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }),
        time: timeArb,
        total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
        till: fc.constantFrom('', 'Till 1')
      });
      
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 2, maxLength: 50 }),
          (records) => {
            const summaries = summarizer.generateSummaries(records);
            
            if (summaries.length < 2) return true;
            
            // Requirement 5.1, 6.1, 8.1: Each week's starting balance should equal
            // the previous week's final balance
            for (let i = 1; i < summaries.length; i++) {
              const prevSummary = summaries[i - 1];
              const currentSummary = summaries[i];
              
              // Starting Competition Purse should equal previous Final Competition Purse
              expect(currentSummary.startingPurse).toBe(prevSummary.finalPurse);
              
              // Starting Competition Pot should equal previous Final Competition Pot
              expect(currentSummary.startingPot).toBe(prevSummary.finalPot);
            }
            
            // First week should always start with 0
            expect(summaries[0].startingPurse).toBe(0);
            expect(summaries[0].startingPot).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 15: Transaction filtering and summing correctness
     * Validates: Requirements 5.3, 5.4, 5.5, 5.6
     */
    test('Property 15: Transaction filtering and summing correctness', () => {
      // Generate arbitrary dates for transactions within a single week
      const baseDate = new Date('2024-01-01'); // Monday
      const dateArb = fc.integer({ min: 0, max: 6 }).map(dayOffset => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + dayOffset);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      });
      
      const timeArb = fc.tuple(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      const recordArb = fc.record({
        date: dateArb,
        time: timeArb,
        total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
        till: fc.constantFrom('', 'Till 1')
      });
      
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 30 }),
          (records) => {
            const summaries = summarizer.generateSummaries(records);
            
            if (summaries.length === 0) return true;
            
            // Get the first (and likely only) summary
            const summary = summaries[0];
            
            // Manually calculate expected values by filtering and summing
            // Requirement 5.3: Application Top Up = Till is empty AND Type equals "Topup (Competitions)"
            const expectedAppTopUp = records
              .filter(r => r.till === '' && r.type === 'Topup (Competitions)')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);
            
            // Requirement 5.4: Till Top Up = Till equals "Till 1" AND Type equals "Topup (Competitions)"
            const expectedTillTopUp = records
              .filter(r => r.till === 'Till 1' && r.type === 'Topup (Competitions)')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);
            
            // Requirement 5.5: Entries = Type equals "Sale"
            const expectedEntries = records
              .filter(r => r.type === 'Sale')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);
            
            // Requirement 5.6: Refunds = Type equals "Refund"
            const expectedRefunds = records
              .filter(r => r.type === 'Refund')
              .reduce((sum, r) => sum + parseFloat(r.total), 0);
            
            // Verify the calculated sums match expected values
            expect(summary.purseApplicationTopUp).toBeCloseTo(expectedAppTopUp, 2);
            expect(summary.purseTillTopUp).toBeCloseTo(expectedTillTopUp, 2);
            expect(summary.competitionEntries).toBeCloseTo(expectedEntries, 2);
            expect(summary.competitionRefunds).toBeCloseTo(expectedRefunds, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 16: Competition Purse calculation formula
     * Validates: Requirements 5.7
     */
    test('Property 16: Competition Purse calculation formula', () => {
      // Generate arbitrary dates for transactions
      const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
      const timeArb = fc.tuple(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      const recordArb = fc.record({
        date: dateArb.map(d => {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }),
        time: timeArb,
        total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
        till: fc.constantFrom('', 'Till 1')
      });
      
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const summaries = summarizer.generateSummaries(records);
            
            if (summaries.length === 0) return true;
            
            // Requirement 5.7: Final Competition Purse = Starting Competition Purse + 
            // Application Top Up + Till Top Up - Entries - Refunds
            // Note: Refunds are negative values, so subtracting them adds to purse
            for (const summary of summaries) {
              const expectedFinalPurse = 
                summary.startingPurse +
                summary.purseApplicationTopUp +
                summary.purseTillTopUp -
                summary.competitionEntries -
                summary.competitionRefunds;
              
              expect(summary.finalPurse).toBeCloseTo(expectedFinalPurse, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 17: Competition Pot calculation formula
     * Validates: Requirements 6.5
     */
    test('Property 17: Competition Pot calculation formula', () => {
      // Generate arbitrary dates for transactions
      const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
      const timeArb = fc.tuple(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      const recordArb = fc.record({
        date: dateArb.map(d => {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }),
        time: timeArb,
        total: fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
        till: fc.constantFrom('', 'Till 1')
      });
      
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const summaries = summarizer.generateSummaries(records);
            
            if (summaries.length === 0) return true;
            
            // Requirement 6.5: Final Competition Pot = Starting Competition Pot + 
            // Competition Entries - Competition Refunds - Competition Winnings Paid - Competition Costs
            // Note: Refunds are negative values, so subtracting them reduces the pot
            for (const summary of summaries) {
              const expectedFinalPot = 
                summary.startingPot +
                summary.competitionEntries -
                summary.competitionRefunds -
                summary.winningsPaid -
                summary.competitionCosts;
              
              expect(summary.finalPot).toBeCloseTo(expectedFinalPot, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 23: Calculation errors preserve last valid state
     * Validates: Requirements 11.4
     */
    test('Property 23: Calculation errors preserve last valid state', () => {
    // Generate arbitrary dates for transactions
    const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
    const timeArb = fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    
    // Generate records with some potentially invalid data that could cause calculation errors
    const recordArb = fc.record({
      date: dateArb.map(d => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }),
      time: timeArb,
      // Include some potentially problematic total values
      total: fc.oneof(
        fc.double({ min: 0, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
        fc.constant(''), // Empty string
        fc.constant(null), // Null value
        fc.constant(undefined) // Undefined value
      ),
      type: fc.constantFrom('Sale', 'Refund', 'Topup (Competitions)'),
      till: fc.constantFrom('', 'Till 1')
    });
    
    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 5, maxLength: 50 }),
        (records) => {
          // Generate summaries - may encounter errors with invalid data
          const summaries = summarizer.generateSummaries(records);
          
          // Requirement 11.4: If calculation fails, the system should preserve
          // the last successful summary state (partial results)
          
          // The system should always return an array (never throw)
          expect(Array.isArray(summaries)).toBe(true);
          
          // If summaries were generated, verify they are valid
          if (summaries.length > 0) {
            // All returned summaries should have valid structure
            for (const summary of summaries) {
              expect(summary).toHaveProperty('fromDate');
              expect(summary).toHaveProperty('toDate');
              expect(summary).toHaveProperty('startingPurse');
              expect(summary).toHaveProperty('finalPurse');
              expect(summary).toHaveProperty('startingPot');
              expect(summary).toHaveProperty('finalPot');
              
              // All numeric fields should be valid numbers (not NaN)
              expect(typeof summary.startingPurse).toBe('number');
              expect(typeof summary.finalPurse).toBe('number');
              expect(typeof summary.startingPot).toBe('number');
              expect(typeof summary.finalPot).toBe('number');
              expect(isNaN(summary.startingPurse)).toBe(false);
              expect(isNaN(summary.finalPurse)).toBe(false);
              expect(isNaN(summary.startingPot)).toBe(false);
              expect(isNaN(summary.finalPot)).toBe(false);
            }
            
            // Verify rolling balance consistency for all returned summaries
            // (the "last valid state" should maintain consistency)
            for (let i = 1; i < summaries.length; i++) {
              expect(summaries[i].startingPurse).toBe(summaries[i - 1].finalPurse);
              expect(summaries[i].startingPot).toBe(summaries[i - 1].finalPot);
            }
            
            // First summary should start with 0
            expect(summaries[0].startingPurse).toBe(0);
            expect(summaries[0].startingPot).toBe(0);
          }
          
          // The key property: even with invalid data, the system should not crash
          // and should return whatever valid summaries it could calculate
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Unit test: Calculation error recovery with mixed valid/invalid data
   */
  test('should return partial results when calculation error occurs mid-processing', () => {
    // Create records spanning multiple weeks with some invalid data in later weeks
    const records = [
      // Week 1 - valid data
      { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
      { date: '02/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' },
      
      // Week 2 - valid data
      { date: '08/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '75.00' },
      
      // Week 3 - invalid date that will cause parsing error
      { date: 'invalid-date', time: '10:00:00', till: '', type: 'Sale', total: '25.00' }
    ];
    
    const summaries = summarizer.generateSummaries(records);
    
    // Should return summaries for the weeks that were successfully processed
    // The invalid record should be skipped during validation
    expect(Array.isArray(summaries)).toBe(true);
    
    // Should have at least the first two weeks (valid data)
    expect(summaries.length).toBeGreaterThanOrEqual(2);
    
    // Verify the valid summaries maintain consistency
    if (summaries.length >= 2) {
      expect(summaries[0].startingPurse).toBe(0);
      expect(summaries[0].finalPurse).toBe(-150.00); // 0 - 100 - 50
      expect(summaries[1].startingPurse).toBe(-150.00);
      expect(summaries[1].finalPurse).toBe(-225.00); // -150 - 75
    }
  });

  /**
   * Unit test: Graceful handling of all invalid data
   */
  test('should return empty array when all records are invalid', () => {
    const records = [
      { date: 'invalid', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
      { date: 'bad-date', time: '10:00:00', till: '', type: 'Sale', total: '50.00' },
      { date: '', time: '10:00:00', till: '', type: 'Sale', total: '75.00' }
    ];
    
    const summaries = summarizer.generateSummaries(records);
    
    // Should return empty array when no valid records can be processed
    expect(summaries).toEqual([]);
  });

  /**
   * Unit test: Handling of null/undefined total values
   */
  test('should skip records with null/undefined totals and continue processing', () => {
    const records = [
      { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00' },
      { date: '02/01/2024', time: '10:00:00', till: '', type: 'Sale', total: null },
      { date: '03/01/2024', time: '10:00:00', till: '', type: 'Sale', total: undefined },
      { date: '04/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '' },
      { date: '05/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00' }
    ];
    
    const summaries = summarizer.generateSummaries(records);
    
    // Should generate summary for the week
    expect(summaries).toHaveLength(1);
    
    // Should only sum the valid totals (100 + 50 = 150)
    expect(summaries[0].competitionEntries).toBe(150.00);
    expect(summaries[0].finalPurse).toBe(-150.00); // 0 - 150
  });

  describe('recalculateFromDate', () => {
    test('should recalculate summaries from specified date', async () => {
      // Mock database manager
      const mockDbManager = {
        getAll: jest.fn().mockResolvedValue([
          { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00', isWinning: false },
          { date: '08/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '50.00', isWinning: false },
          { date: '15/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '30.00', isWinning: true }
        ])
      };
      
      const summarizerWithDb = new WeeklySummarizer(mockDbManager);
      
      const summaries = await summarizerWithDb.recalculateFromDate('15/01/2024');
      
      // Should return all summaries (recalculated from beginning)
      expect(summaries).toHaveLength(3);
      expect(mockDbManager.getAll).toHaveBeenCalled();
      
      // Verify winnings are calculated in the third week
      expect(summaries[2].winningsPaid).toBe(30.00);
    });

    test('should throw error if database manager not provided', async () => {
      const summarizerWithoutDb = new WeeklySummarizer();
      
      await expect(summarizerWithoutDb.recalculateFromDate('01/01/2024'))
        .rejects.toThrow('Database manager not provided to WeeklySummarizer');
    });

    test('should maintain rolling balances after recalculation', async () => {
      const mockDbManager = {
        getAll: jest.fn().mockResolvedValue([
          { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '100.00', isWinning: false },
          { date: '08/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '50.00', isWinning: true },
          { date: '15/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '75.00', isWinning: false }
        ])
      };
      
      const summarizerWithDb = new WeeklySummarizer(mockDbManager);
      
      const summaries = await summarizerWithDb.recalculateFromDate('08/01/2024');
      
      // Verify rolling balances are consistent
      expect(summaries[1].startingPot).toBe(summaries[0].finalPot);
      expect(summaries[2].startingPot).toBe(summaries[1].finalPot);
      
      // Verify winnings are included in pot calculation
      expect(summaries[1].winningsPaid).toBe(50.00);
      expect(summaries[1].finalPot).toBe(summaries[0].finalPot + summaries[1].competitionEntries - summaries[1].winningsPaid);
    });

    test('should handle empty database', async () => {
      const mockDbManager = {
        getAll: jest.fn().mockResolvedValue([])
      };
      
      const summarizerWithDb = new WeeklySummarizer(mockDbManager);
      
      const summaries = await summarizerWithDb.recalculateFromDate('01/01/2024');
      
      expect(summaries).toEqual([]);
    });

    test('should recalculate with multiple flagged transactions', async () => {
      const mockDbManager = {
        getAll: jest.fn().mockResolvedValue([
          { date: '01/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '100.00', isWinning: true },
          { date: '02/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', total: '50.00', isWinning: true },
          { date: '08/01/2024', time: '10:00:00', till: '', type: 'Sale', total: '75.00', isWinning: false }
        ])
      };
      
      const summarizerWithDb = new WeeklySummarizer(mockDbManager);
      
      const summaries = await summarizerWithDb.recalculateFromDate('01/01/2024');
      
      // First week should have sum of both flagged transactions
      expect(summaries[0].winningsPaid).toBe(150.00);
      
      // Second week should have no winnings
      expect(summaries[1].winningsPaid).toBe(0);
    });
  });
  });
});
