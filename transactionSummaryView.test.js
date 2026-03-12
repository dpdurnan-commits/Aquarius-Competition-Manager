/**
 * Unit tests for TransactionSummaryView
 */

import { TransactionSummaryView } from './transactionSummaryView.js';

describe('TransactionSummaryView', () => {
  let container;
  let view;

  beforeEach(() => {
    // Create a container element
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    
    view = new TransactionSummaryView('test-container');
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  describe('constructor', () => {
    test('should throw error if container not found', () => {
      expect(() => {
        new TransactionSummaryView('non-existent-id');
      }).toThrow('Container element with ID "non-existent-id" not found');
    });

    test('should initialize with valid container', () => {
      expect(view.container).toBe(container);
    });
  });

  describe('render with empty summaries', () => {
    test('should display empty state when summaries array is empty', () => {
      view.render([]);
      
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();
      expect(emptyState.textContent).toBe('No transaction data available. Please import a CSV file.');
    });

    test('should display empty state when summaries is null', () => {
      view.render(null);
      
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();
    });

    test('should display empty state when summaries is undefined', () => {
      view.render(undefined);
      
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();
    });

    test('should not display table when summaries is empty', () => {
      view.render([]);
      
      const table = container.querySelector('.transaction-summary-table');
      expect(table).toBeNull();
    });
  });

  describe('render with summaries', () => {
    const mockSummaries = [
      {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      },
      {
        fromDate: new Date('2024-01-08'),
        toDate: new Date('2024-01-14'),
        startingPurse: 240.00,
        purseApplicationTopUp: 0.00,
        purseTillTopUp: 0.00,
        competitionEntries: 50.00,
        competitionRefunds: 5.00,
        finalPurse: 285.00,
        startingPot: 275.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 320.00
      }
    ];

    test('should create table with correct structure', () => {
      view.render(mockSummaries);
      
      const table = container.querySelector('.transaction-summary-table');
      expect(table).not.toBeNull();
      expect(table.getAttribute('aria-label')).toBe('Weekly competition transaction summary');
    });

    test('should create table with correct number of header rows', () => {
      view.render(mockSummaries);
      
      const headerRows = container.querySelectorAll('thead tr');
      expect(headerRows.length).toBe(2);
    });

    test('should create table with correct column groupings', () => {
      view.render(mockSummaries);
      
      const groupRow = container.querySelector('thead tr:first-child');
      const groupHeaders = groupRow.querySelectorAll('th');
      
      expect(groupHeaders.length).toBe(3);
      expect(groupHeaders[0].textContent).toBe('Period');
      expect(groupHeaders[0].getAttribute('colspan')).toBe('2');
      expect(groupHeaders[1].textContent).toBe('Competition Purse (Member Money)');
      expect(groupHeaders[1].getAttribute('colspan')).toBe('6');
      expect(groupHeaders[2].textContent).toBe('Competition Pot (Club Money)');
      expect(groupHeaders[2].getAttribute('colspan')).toBe('4');
    });

    test('should create table with 12 column headers', () => {
      view.render(mockSummaries);
      
      const headerRow = container.querySelector('thead tr:nth-child(2)');
      const headers = headerRow.querySelectorAll('th');
      
      expect(headers.length).toBe(12);
      expect(headers[0].textContent).toBe('From Date');
      expect(headers[1].textContent).toBe('To Date');
      expect(headers[2].textContent).toBe('Starting Balance');
      expect(headers[11].textContent).toBe('Final Balance');
    });

    test('should create correct number of data rows', () => {
      view.render(mockSummaries);
      
      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows.length).toBe(2);
    });

    test('should create rows with 12 cells each', () => {
      view.render(mockSummaries);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      expect(cells.length).toBe(12);
    });

    test('should display dates in DD/MM/YYYY format', () => {
      view.render(mockSummaries);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      expect(cells[0].textContent).toBe('01/01/2024');
      expect(cells[1].textContent).toBe('07/01/2024');
    });

    test('should display monetary values with £ symbol and 2 decimals', () => {
      view.render(mockSummaries);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      expect(cells[2].textContent).toBe('£100.00');
      expect(cells[3].textContent).toBe('£50.00');
      expect(cells[7].textContent).toBe('£240.00');
    });

    test('should display refunds as negative values', () => {
      view.render(mockSummaries);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      // Refunds column (index 6)
      expect(cells[6].textContent).toBe('£-10.00');
    });

    test('should apply monetary class to monetary value cells', () => {
      view.render(mockSummaries);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      // Date cells should not have monetary class
      expect(cells[0].classList.contains('monetary')).toBe(false);
      expect(cells[1].classList.contains('monetary')).toBe(false);
      
      // Monetary cells should have monetary class
      expect(cells[2].classList.contains('monetary')).toBe(true);
      expect(cells[3].classList.contains('monetary')).toBe(true);
    });

    test('should include tooltip in Costs column header', () => {
      view.render(mockSummaries);
      
      const headerRow = container.querySelector('thead tr:nth-child(2)');
      const costsHeader = headerRow.querySelectorAll('th')[10];
      
      const tooltip = costsHeader.querySelector('.tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip.getAttribute('title')).toBe('Presentation Night Winnings, Trophy Engravings, Stationary etc');
      expect(tooltip.textContent).toBe('ⓘ');
    });

    test('should hide empty state when rendering summaries', () => {
      view.render(mockSummaries);
      
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).toBeNull();
    });
  });

  describe('clear method', () => {
    test('should display empty state after clear', () => {
      const mockSummaries = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      view.render(mockSummaries);
      expect(container.querySelector('.transaction-summary-table')).not.toBeNull();

      view.clear();
      
      const emptyState = container.querySelector('.transaction-summary-empty');
      expect(emptyState).not.toBeNull();
      expect(container.querySelector('.transaction-summary-table')).toBeNull();
    });
  });

  describe('formatCurrency', () => {
    test('should format positive numbers correctly', () => {
      expect(view.formatCurrency(100)).toBe('£100.00');
      expect(view.formatCurrency(50.5)).toBe('£50.50');
      expect(view.formatCurrency(0.99)).toBe('£0.99');
    });

    test('should format negative numbers correctly', () => {
      expect(view.formatCurrency(-10)).toBe('£-10.00');
      expect(view.formatCurrency(-5.50)).toBe('£-5.50');
    });

    test('should format zero correctly', () => {
      expect(view.formatCurrency(0)).toBe('£0.00');
    });

    test('should handle string numbers', () => {
      expect(view.formatCurrency('100')).toBe('£100.00');
      expect(view.formatCurrency('50.5')).toBe('£50.50');
    });

    test('should handle invalid values', () => {
      expect(view.formatCurrency(null)).toBe('£0.00');
      expect(view.formatCurrency(undefined)).toBe('£0.00');
      expect(view.formatCurrency('invalid')).toBe('£0.00');
    });

    test('should always show 2 decimal places', () => {
      expect(view.formatCurrency(100)).toBe('£100.00');
      expect(view.formatCurrency(100.1)).toBe('£100.10');
      expect(view.formatCurrency(100.123)).toBe('£100.12');
    });
  });

  describe('formatDate', () => {
    test('should format Date objects correctly', () => {
      const date = new Date('2024-01-15');
      expect(view.formatDate(date)).toBe('15/01/2024');
    });

    test('should format date strings correctly', () => {
      expect(view.formatDate('2024-01-15')).toBe('15/01/2024');
      expect(view.formatDate('2024-12-31')).toBe('31/12/2024');
    });

    test('should pad single digit days and months', () => {
      expect(view.formatDate('2024-01-05')).toBe('05/01/2024');
      expect(view.formatDate('2024-09-09')).toBe('09/09/2024');
    });

    test('should handle invalid dates', () => {
      expect(view.formatDate('invalid')).toBe('');
      expect(view.formatDate(null)).toBe('');
      expect(view.formatDate(undefined)).toBe('');
    });

    test('should format dates across different months', () => {
      expect(view.formatDate('2024-02-29')).toBe('29/02/2024'); // Leap year
      expect(view.formatDate('2024-06-15')).toBe('15/06/2024');
      expect(view.formatDate('2024-11-30')).toBe('30/11/2024');
    });
  });

  describe('edge cases', () => {
    test('should handle single week summary', () => {
      const singleSummary = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 0,
        purseApplicationTopUp: 0,
        purseTillTopUp: 0,
        competitionEntries: 0,
        competitionRefunds: 0,
        finalPurse: 0,
        startingPot: 0,
        winningsPaid: 0,
        competitionCosts: 0,
        finalPot: 0
      }];

      view.render(singleSummary);
      
      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows.length).toBe(1);
    });

    test('should handle large monetary values', () => {
      const largeSummary = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 999999.99,
        purseApplicationTopUp: 0,
        purseTillTopUp: 0,
        competitionEntries: 0,
        competitionRefunds: 0,
        finalPurse: 999999.99,
        startingPot: 0,
        winningsPaid: 0,
        competitionCosts: 0,
        finalPot: 0
      }];

      view.render(largeSummary);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      expect(cells[2].textContent).toBe('£999999.99');
    });

    test('should handle zero values correctly', () => {
      const zeroSummary = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 0,
        purseApplicationTopUp: 0,
        purseTillTopUp: 0,
        competitionEntries: 0,
        competitionRefunds: 0,
        finalPurse: 0,
        startingPot: 0,
        winningsPaid: 0,
        competitionCosts: 0,
        finalPot: 0
      }];

      view.render(zeroSummary);
      
      const firstRow = container.querySelector('tbody tr:first-child');
      const cells = firstRow.querySelectorAll('td');
      
      // All monetary values should be £0.00
      for (let i = 2; i < 12; i++) {
        expect(cells[i].textContent).toBe('£0.00');
      }
    });

    test('should handle many weeks for scrolling', () => {
      const manySummaries = Array.from({ length: 52 }, (_, i) => ({
        fromDate: new Date(2024, 0, 1 + i * 7),
        toDate: new Date(2024, 0, 7 + i * 7),
        startingPurse: i * 100,
        purseApplicationTopUp: 0,
        purseTillTopUp: 0,
        competitionEntries: 0,
        competitionRefunds: 0,
        finalPurse: i * 100,
        startingPot: 0,
        winningsPaid: 0,
        competitionCosts: 0,
        finalPot: 0
      }));

      view.render(manySummaries);
      
      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows.length).toBe(52);
    });
  });

  describe('Property 18: Monetary value formatting', () => {
    /**
     * Property-Based Test: Monetary value formatting
     * 
     * Property: For any monetary value displayed in the Transaction Summary View,
     * the rendered string should include a currency symbol and exactly two decimal places.
     * 
     * Validates: Requirements 7.2
     */
    test('should format all monetary values with currency symbol and 2 decimal places', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-999999.99), max: Math.fround(999999.99), noNaN: true }),
          (value) => {
            const formatted = view.formatCurrency(value);
            
            // Should start with currency symbol
            expect(formatted).toMatch(/^£/);
            
            // Should have exactly 2 decimal places
            expect(formatted).toMatch(/£-?\d+\.\d{2}$/);
            
            // Extract numeric part and verify precision
            const numericPart = formatted.substring(1); // Remove £
            const decimalPart = numericPart.split('.')[1];
            expect(decimalPart).toBeDefined();
            expect(decimalPart.length).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Refunds displayed as negative', () => {
    /**
     * Property-Based Test: Refunds displayed as negative
     * 
     * Property: For any weekly summary where Competition Refunds is non-zero,
     * the displayed value should be negative (prefixed with minus sign).
     * 
     * Validates: Requirements 7.3
     */
    test('should display refunds as negative values in rendered table', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          // Generate arbitrary weekly summaries with non-zero refunds
          fc.array(
            fc.record({
              fromDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              toDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              startingPurse: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              purseApplicationTopUp: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              purseTillTopUp: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionEntries: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionRefunds: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }), // Non-zero refunds
              finalPurse: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              startingPot: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              winningsPaid: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionCosts: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              finalPot: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (summaries) => {
            // Render the summaries
            view.render(summaries);
            
            // Get all data rows
            const dataRows = container.querySelectorAll('tbody tr');
            
            // For each row, check that the refunds column (index 6) displays a negative value
            dataRows.forEach((row, index) => {
              const cells = row.querySelectorAll('td');
              const refundsCell = cells[6]; // Refunds column
              const refundsText = refundsCell.textContent;
              
              // Extract the numeric value (remove £ symbol)
              const numericValue = parseFloat(refundsText.substring(1));
              
              // The displayed value should be negative
              expect(numericValue).toBeLessThan(0);
              
              // Verify it matches the negated refund value
              const expectedValue = -summaries[index].competitionRefunds;
              expect(Math.abs(numericValue - expectedValue)).toBeLessThan(0.01); // Allow small floating point errors
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should display zero refunds as £0.00', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          // Generate summaries with zero refunds
          fc.array(
            fc.record({
              fromDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              toDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              startingPurse: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              purseApplicationTopUp: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              purseTillTopUp: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionEntries: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionRefunds: fc.constant(0), // Zero refunds
              finalPurse: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              startingPot: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
              winningsPaid: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              competitionCosts: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
              finalPot: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (summaries) => {
            // Render the summaries
            view.render(summaries);
            
            // Get all data rows
            const dataRows = container.querySelectorAll('tbody tr');
            
            // For each row, check that the refunds column displays £0.00
            dataRows.forEach((row) => {
              const cells = row.querySelectorAll('td');
              const refundsCell = cells[6]; // Refunds column
              const refundsText = refundsCell.textContent;
              
              // Should display as £0.00 (or £-0.00 which is equivalent)
              expect(refundsText).toMatch(/^£-?0\.00$/);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Drill-down interaction', () => {
    let mockWeeklyDrillDownView;
    let drillDownContainer;
    let drillDownView;

    beforeEach(() => {
      // Create a separate container for drill-down tests
      drillDownContainer = document.createElement('div');
      drillDownContainer.id = 'drill-down-test-container';
      document.body.appendChild(drillDownContainer);

      // Create mock weekly drill-down view
      mockWeeklyDrillDownView = {
        show: jest.fn()
      };

      // Create view with drill-down view
      drillDownView = new TransactionSummaryView('drill-down-test-container', mockWeeklyDrillDownView);
    });

    afterEach(() => {
      // Clean up drill-down container
      if (drillDownContainer && drillDownContainer.parentNode) {
        document.body.removeChild(drillDownContainer);
      }
    });

    test('should make rows clickable when weeklyDrillDownView is provided', () => {
      const mockSummaries = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      drillDownView.render(mockSummaries);

      const row = drillDownContainer.querySelector('tbody tr');
      expect(row.classList.contains('clickable-row')).toBe(true);
    });

    test('should add data attributes for week dates to clickable rows', () => {
      const mockSummaries = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      drillDownView.render(mockSummaries);

      const row = drillDownContainer.querySelector('tbody tr');
      expect(row.dataset.weekStart).toBeDefined();
      expect(row.dataset.weekEnd).toBeDefined();
      
      // Verify dates are in ISO format
      expect(new Date(row.dataset.weekStart).toISOString()).toBe(mockSummaries[0].fromDate.toISOString());
      expect(new Date(row.dataset.weekEnd).toISOString()).toBe(mockSummaries[0].toDate.toISOString());
    });

    test('should call drill-down view show() when row is clicked', () => {
      const mockSummaries = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      drillDownView.render(mockSummaries);

      const row = drillDownContainer.querySelector('tbody tr');
      row.click();

      expect(mockWeeklyDrillDownView.show).toHaveBeenCalledTimes(1);
      
      // Verify correct dates are passed
      const callArgs = mockWeeklyDrillDownView.show.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
      expect(callArgs[0].toISOString()).toBe(mockSummaries[0].fromDate.toISOString());
      expect(callArgs[1].toISOString()).toBe(mockSummaries[0].toDate.toISOString());
    });

    test('should call drill-down view with correct dates for multiple rows', () => {
      const mockSummaries = [
        {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-01-07'),
          startingPurse: 100.00,
          purseApplicationTopUp: 50.00,
          purseTillTopUp: 25.00,
          competitionEntries: 75.00,
          competitionRefunds: 10.00,
          finalPurse: 240.00,
          startingPot: 200.00,
          winningsPaid: 0.00,
          competitionCosts: 0.00,
          finalPot: 275.00
        },
        {
          fromDate: new Date('2024-01-08'),
          toDate: new Date('2024-01-14'),
          startingPurse: 240.00,
          purseApplicationTopUp: 0.00,
          purseTillTopUp: 0.00,
          competitionEntries: 50.00,
          competitionRefunds: 5.00,
          finalPurse: 285.00,
          startingPot: 275.00,
          winningsPaid: 0.00,
          competitionCosts: 0.00,
          finalPot: 320.00
        }
      ];

      drillDownView.render(mockSummaries);

      const rows = drillDownContainer.querySelectorAll('tbody tr');
      
      // Click first row
      rows[0].click();
      expect(mockWeeklyDrillDownView.show).toHaveBeenCalledTimes(1);
      let callArgs = mockWeeklyDrillDownView.show.mock.calls[0];
      expect(callArgs[0].toISOString()).toBe(mockSummaries[0].fromDate.toISOString());
      expect(callArgs[1].toISOString()).toBe(mockSummaries[0].toDate.toISOString());

      // Click second row
      rows[1].click();
      expect(mockWeeklyDrillDownView.show).toHaveBeenCalledTimes(2);
      callArgs = mockWeeklyDrillDownView.show.mock.calls[1];
      expect(callArgs[0].toISOString()).toBe(mockSummaries[1].fromDate.toISOString());
      expect(callArgs[1].toISOString()).toBe(mockSummaries[1].toDate.toISOString());
    });

    test('should not make rows clickable when weeklyDrillDownView is not provided', () => {
      // Create view without drill-down view
      const viewWithoutDrillDown = new TransactionSummaryView('drill-down-test-container');

      const mockSummaries = [{
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      viewWithoutDrillDown.render(mockSummaries);

      const row = drillDownContainer.querySelector('tbody tr');
      
      // Row should still have clickable-row class for styling
      expect(row.classList.contains('clickable-row')).toBe(true);
      
      // But onclick should not be set
      expect(row.onclick).toBeNull();
    });

    test('should display actual winnings values in rendered table', () => {
      const mockSummaries = [
        {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-01-07'),
          startingPurse: 100.00,
          purseApplicationTopUp: 50.00,
          purseTillTopUp: 25.00,
          competitionEntries: 75.00,
          competitionRefunds: 10.00,
          finalPurse: 240.00,
          startingPot: 200.00,
          winningsPaid: 50.00, // Actual winnings value
          competitionCosts: 0.00,
          finalPot: 225.00
        },
        {
          fromDate: new Date('2024-01-08'),
          toDate: new Date('2024-01-14'),
          startingPurse: 240.00,
          purseApplicationTopUp: 0.00,
          purseTillTopUp: 0.00,
          competitionEntries: 50.00,
          competitionRefunds: 5.00,
          finalPurse: 285.00,
          startingPot: 225.00,
          winningsPaid: 120.00, // Actual winnings value
          competitionCosts: 0.00,
          finalPot: 155.00
        }
      ];

      drillDownView.render(mockSummaries);

      const rows = drillDownContainer.querySelectorAll('tbody tr');
      
      // Check first row winnings paid (column index 9)
      const firstRowCells = rows[0].querySelectorAll('td');
      expect(firstRowCells[9].textContent).toBe('£50.00');
      
      // Check second row winnings paid
      const secondRowCells = rows[1].querySelectorAll('td');
      expect(secondRowCells[9].textContent).toBe('£120.00');
    });

    test('should handle date strings in addition to Date objects', () => {
      const mockSummaries = [{
        fromDate: '2024-01-01',
        toDate: '2024-01-07',
        startingPurse: 100.00,
        purseApplicationTopUp: 50.00,
        purseTillTopUp: 25.00,
        competitionEntries: 75.00,
        competitionRefunds: 10.00,
        finalPurse: 240.00,
        startingPot: 200.00,
        winningsPaid: 0.00,
        competitionCosts: 0.00,
        finalPot: 275.00
      }];

      drillDownView.render(mockSummaries);

      const row = drillDownContainer.querySelector('tbody tr');
      row.click();

      expect(mockWeeklyDrillDownView.show).toHaveBeenCalledTimes(1);
      
      // Verify dates are converted correctly
      const callArgs = mockWeeklyDrillDownView.show.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
    });
  });

  describe('Delete Last Week functionality', () => {
    let mockApiClient;
    let mockWeeklySummarizer;

    beforeEach(() => {
      // Create mock API client
      mockApiClient = {
        getLastWeekInfo: jest.fn(),
        deleteLastWeek: jest.fn(),
        getAll: jest.fn()
      };

      // Create mock weekly summarizer
      mockWeeklySummarizer = {
        generateSummaries: jest.fn()
      };

      // Wire up dependencies
      view.apiClient = mockApiClient;
      view.weeklySummarizer = mockWeeklySummarizer;

      // Mock window.confirm and window.alert
      global.confirm = jest.fn();
      global.alert = jest.fn();
    });

    afterEach(() => {
      delete global.confirm;
      delete global.alert;
    });

    describe('addDeleteLastWeekButton', () => {
      test('should create delete button with correct attributes', () => {
        view.addDeleteLastWeekButton();

        const button = document.getElementById('delete-last-week-btn');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Delete Last Week');
        expect(button.className).toBe('delete-last-week-button');
      });

      test('should position button at top of container', () => {
        view.addDeleteLastWeekButton();

        const buttonContainer = container.querySelector('.delete-last-week-container');
        expect(buttonContainer).not.toBeNull();
        expect(buttonContainer).toBe(container.firstChild);
      });

      test('should attach click handler to button', () => {
        view.addDeleteLastWeekButton();

        const button = document.getElementById('delete-last-week-btn');
        expect(button.onclick).toBeDefined();
      });
    });

    describe('handleDeleteLastWeek', () => {
      beforeEach(() => {
        view.addDeleteLastWeekButton();
      });

      test('should disable button at start of operation', async () => {
        mockApiClient.getLastWeekInfo.mockResolvedValue(null);

        const button = document.getElementById('delete-last-week-btn');
        const handlePromise = view.handleDeleteLastWeek();

        // Button should be disabled immediately
        expect(button.disabled).toBe(true);

        await handlePromise;
      });

      test('should show "No transactions to delete" when weekInfo is null', async () => {
        mockApiClient.getLastWeekInfo.mockResolvedValue(null);

        await view.handleDeleteLastWeek();

        expect(global.alert).toHaveBeenCalledWith('No transactions to delete');
        expect(mockApiClient.deleteLastWeek).not.toHaveBeenCalled();
      });

      test('should display confirmation dialog with week details', async () => {
        const weekInfo = {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          count: 5
        };
        mockApiClient.getLastWeekInfo.mockResolvedValue(weekInfo);
        global.confirm.mockReturnValue(false);

        await view.handleDeleteLastWeek();

        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Delete Last Week Transactions?')
        );
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('5 transaction(s)')
        );
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('2024-01-01')
        );
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('2024-01-07')
        );
      });

      test('should not delete when user cancels confirmation', async () => {
        const weekInfo = {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          count: 5
        };
        mockApiClient.getLastWeekInfo.mockResolvedValue(weekInfo);
        global.confirm.mockReturnValue(false);

        await view.handleDeleteLastWeek();

        expect(mockApiClient.deleteLastWeek).not.toHaveBeenCalled();
      });

      test('should call deleteLastWeek on confirmation', async () => {
        const weekInfo = {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          count: 5
        };
        const deleteResult = {
          deleted: 5,
          message: 'Success'
        };
        mockApiClient.getLastWeekInfo.mockResolvedValue(weekInfo);
        mockApiClient.deleteLastWeek.mockResolvedValue(deleteResult);
        mockApiClient.getAll.mockResolvedValue([]);
        mockWeeklySummarizer.generateSummaries.mockReturnValue([]);
        global.confirm.mockReturnValue(true);

        await view.handleDeleteLastWeek();

        expect(mockApiClient.deleteLastWeek).toHaveBeenCalledTimes(1);
      });

      test('should display success message with deletion count', async () => {
        const weekInfo = {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          count: 5
        };
        const deleteResult = {
          deleted: 5,
          message: 'Success'
        };
        mockApiClient.getLastWeekInfo.mockResolvedValue(weekInfo);
        mockApiClient.deleteLastWeek.mockResolvedValue(deleteResult);
        mockApiClient.getAll.mockResolvedValue([]);
        mockWeeklySummarizer.generateSummaries.mockReturnValue([]);
        global.confirm.mockReturnValue(true);

        await view.handleDeleteLastWeek();

        expect(global.alert).toHaveBeenCalledWith('Successfully deleted 5 transaction(s)');
      });

      test('should call refreshSummaries after successful deletion', async () => {
        const weekInfo = {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          count: 5
        };
        const deleteResult = {
          deleted: 5,
          message: 'Success'
        };
        mockApiClient.getLastWeekInfo.mockResolvedValue(weekInfo);
        mockApiClient.deleteLastWeek.mockResolvedValue(deleteResult);
        mockApiClient.getAll.mockResolvedValue([]);
        mockWeeklySummarizer.generateSummaries.mockReturnValue([]);
        global.confirm.mockReturnValue(true);

        await view.handleDeleteLastWeek();

        expect(mockApiClient.getAll).toHaveBeenCalledTimes(1);
        expect(mockWeeklySummarizer.generateSummaries).toHaveBeenCalledTimes(1);
      });

      test('should re-enable button after operation completes', async () => {
        mockApiClient.getLastWeekInfo.mockResolvedValue(null);

        const button = document.getElementById('delete-last-week-btn');
        await view.handleDeleteLastWeek();

        expect(button.disabled).toBe(false);
      });

      test('should re-enable button even if error occurs', async () => {
        mockApiClient.getLastWeekInfo.mockRejectedValue(new Error('Network error'));

        const button = document.getElementById('delete-last-week-btn');
        await view.handleDeleteLastWeek();

        expect(button.disabled).toBe(false);
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
      });
    });

    describe('refreshSummaries', () => {
      test('should fetch all remaining transactions', async () => {
        mockApiClient.getAll.mockResolvedValue([]);
        mockWeeklySummarizer.generateSummaries.mockReturnValue([]);

        await view.refreshSummaries();

        expect(mockApiClient.getAll).toHaveBeenCalledTimes(1);
      });

      test('should regenerate weekly summaries', async () => {
        const transactions = [{ id: 1 }, { id: 2 }];
        mockApiClient.getAll.mockResolvedValue(transactions);
        mockWeeklySummarizer.generateSummaries.mockReturnValue([]);

        await view.refreshSummaries();

        expect(mockWeeklySummarizer.generateSummaries).toHaveBeenCalledWith(transactions);
      });

      test('should re-render the summary table', async () => {
        const summaries = [{ fromDate: new Date(), toDate: new Date() }];
        mockApiClient.getAll.mockResolvedValue([]);
        mockWeeklySummarizer.generateSummaries.mockReturnValue(summaries);

        const renderSpy = jest.spyOn(view, 'render');

        await view.refreshSummaries();

        expect(renderSpy).toHaveBeenCalledWith(summaries);
      });

      test('should throw error if apiClient not initialized', async () => {
        view.apiClient = null;

        await expect(view.refreshSummaries()).rejects.toThrow('API client not initialized');
      });

      test('should throw error if weeklySummarizer not initialized', async () => {
        view.weeklySummarizer = null;

        await expect(view.refreshSummaries()).rejects.toThrow('Weekly summarizer not initialized');
      });
    });

    describe('updateButtonState', () => {
      beforeEach(() => {
        view.addDeleteLastWeekButton();
      });

      test('should enable button when transactions exist', () => {
        const button = document.getElementById('delete-last-week-btn');
        
        view.updateButtonState(true);

        expect(button.disabled).toBe(false);
        expect(button.style.opacity).toBe('1');
        expect(button.style.cursor).toBe('pointer');
      });

      test('should disable button when no transactions exist', () => {
        const button = document.getElementById('delete-last-week-btn');
        
        view.updateButtonState(false);

        expect(button.disabled).toBe(true);
        expect(button.style.opacity).toBe('0.5');
        expect(button.style.cursor).toBe('not-allowed');
      });

      test('should handle missing button gracefully', () => {
        // Remove button
        const button = document.getElementById('delete-last-week-btn');
        button.remove();

        // Should not throw error
        expect(() => view.updateButtonState(true)).not.toThrow();
      });
    });

    describe('render with button state management', () => {
      beforeEach(() => {
        view.addDeleteLastWeekButton();
      });

      test('should disable button when rendering empty summaries', () => {
        const button = document.getElementById('delete-last-week-btn');
        
        view.render([]);

        expect(button.disabled).toBe(true);
      });

      test('should enable button when rendering summaries with data', () => {
        const button = document.getElementById('delete-last-week-btn');
        const mockSummaries = [{
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-01-07'),
          startingPurse: 100.00,
          purseApplicationTopUp: 50.00,
          purseTillTopUp: 25.00,
          competitionEntries: 75.00,
          competitionRefunds: 10.00,
          finalPurse: 240.00,
          startingPot: 200.00,
          winningsPaid: 0.00,
          competitionCosts: 0.00,
          finalPot: 275.00
        }];
        
        view.render(mockSummaries);

        expect(button.disabled).toBe(false);
      });
    });
  });
});
