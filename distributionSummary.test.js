/**
 * Unit tests for DistributionSummary component
 */

import { DistributionSummary } from './distributionSummary.js';

describe('DistributionSummary', () => {
  let distributionSummary;
  let container;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create instance
    distributionSummary = new DistributionSummary();
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('render()', () => {
    test('should render summary with zero total when no amount provided', () => {
      distributionSummary.render('test-container');

      const summaryDiv = container.querySelector('.distribution-summary');
      expect(summaryDiv).toBeTruthy();

      const totalValue = container.querySelector('.total-value');
      expect(totalValue).toBeTruthy();
      expect(totalValue.textContent).toBe('£0.00');
    });

    test('should render summary with provided total distribution amount', () => {
      distributionSummary.render('test-container', 150.50);

      const totalValue = container.querySelector('.total-value');
      expect(totalValue).toBeTruthy();
      expect(totalValue.textContent).toBe('£150.50');
    });

    test('should render with correct CSS classes', () => {
      distributionSummary.render('test-container', 100.00);

      const summaryDiv = container.querySelector('.distribution-summary');
      expect(summaryDiv).toBeTruthy();
      expect(summaryDiv.className).toBe('distribution-summary');

      const totalRow = container.querySelector('.total-row');
      expect(totalRow).toBeTruthy();
      expect(totalRow.className).toContain('summary-row');
      expect(totalRow.className).toContain('total-row');

      const totalLabel = container.querySelector('.summary-label');
      expect(totalLabel).toBeTruthy();
      expect(totalLabel.textContent).toBe('Total Distribution:');

      const totalValue = container.querySelector('.summary-value');
      expect(totalValue).toBeTruthy();
      expect(totalValue.className).toContain('summary-value');
      expect(totalValue.className).toContain('total-value');
    });

    test('should format amounts with two decimal places', () => {
      distributionSummary.render('test-container', 100);

      const totalValue = container.querySelector('.total-value');
      expect(totalValue.textContent).toBe('£100.00');
    });

    test('should handle floating point precision correctly', () => {
      // Test with a value that might have floating point issues
      distributionSummary.render('test-container', 0.1 + 0.2);

      const totalValue = container.querySelector('.total-value');
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      // Should be formatted as £0.30
      expect(totalValue.textContent).toBe('£0.30');
    });

    test('should handle very large amounts', () => {
      distributionSummary.render('test-container', 999999.99);

      const totalValue = container.querySelector('.total-value');
      expect(totalValue.textContent).toBe('£999999.99');
    });

    test('should handle very small amounts', () => {
      distributionSummary.render('test-container', 0.01);

      const totalValue = container.querySelector('.total-value');
      expect(totalValue.textContent).toBe('£0.01');
    });

    test('should log error when container not found', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      distributionSummary.render('non-existent-container', 100.00);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Container with ID "non-existent-container" not found'
      );

      consoleSpy.mockRestore();
    });

    test('should clear previous content when rendering', () => {
      // First render
      distributionSummary.render('test-container', 100.00);
      expect(container.querySelector('.total-value').textContent).toBe('£100.00');

      // Second render with different amount
      distributionSummary.render('test-container', 200.00);
      expect(container.querySelector('.total-value').textContent).toBe('£200.00');

      // Should only have one summary div
      const summaryDivs = container.querySelectorAll('.distribution-summary');
      expect(summaryDivs.length).toBe(1);
    });
  });

  describe('updateTotals()', () => {
    test('should update total distribution amount immediately', () => {
      // Initial render
      distributionSummary.render('test-container', 100.00);
      expect(container.querySelector('.total-value').textContent).toBe('£100.00');

      // Update totals
      distributionSummary.updateTotals(250.75);
      expect(container.querySelector('.total-value').textContent).toBe('£250.75');
    });

    test('should update internal state when totals change', () => {
      distributionSummary.render('test-container', 100.00);
      expect(distributionSummary.totalDistribution).toBe(100.00);

      distributionSummary.updateTotals(200.00);
      expect(distributionSummary.totalDistribution).toBe(200.00);
    });

    test('should handle multiple updates correctly', () => {
      distributionSummary.render('test-container', 100.00);

      distributionSummary.updateTotals(150.00);
      expect(container.querySelector('.total-value').textContent).toBe('£150.00');

      distributionSummary.updateTotals(200.50);
      expect(container.querySelector('.total-value').textContent).toBe('£200.50');

      distributionSummary.updateTotals(0);
      expect(container.querySelector('.total-value').textContent).toBe('£0.00');
    });

    test('should format updated amounts with two decimal places', () => {
      distributionSummary.render('test-container', 100.00);

      distributionSummary.updateTotals(75);
      expect(container.querySelector('.total-value').textContent).toBe('£75.00');
    });

    test('should handle floating point precision in updates', () => {
      distributionSummary.render('test-container', 0);

      // Update with floating point arithmetic result
      distributionSummary.updateTotals(0.1 + 0.2);
      expect(container.querySelector('.total-value').textContent).toBe('£0.30');
    });

    test('should handle updates before render gracefully', () => {
      // Update without rendering first
      distributionSummary.updateTotals(100.00);
      expect(distributionSummary.totalDistribution).toBe(100.00);

      // Element won't exist, but should not throw error
      expect(() => {
        distributionSummary.updateTotals(200.00);
      }).not.toThrow();
    });

    test('should update display when element exists', () => {
      distributionSummary.render('test-container', 100.00);

      // Verify element exists
      const totalValueElement = document.getElementById('total-distribution-value');
      expect(totalValueElement).toBeTruthy();

      // Update and verify
      distributionSummary.updateTotals(300.00);
      expect(totalValueElement.textContent).toBe('£300.00');
    });

    test('should handle zero amounts in updates', () => {
      distributionSummary.render('test-container', 100.00);

      distributionSummary.updateTotals(0);
      expect(container.querySelector('.total-value').textContent).toBe('£0.00');
      expect(distributionSummary.totalDistribution).toBe(0);
    });

    test('should handle negative amounts in updates', () => {
      // While the system shouldn't allow negative amounts,
      // the component should handle them gracefully if they occur
      distributionSummary.render('test-container', 100.00);

      distributionSummary.updateTotals(-50.00);
      expect(container.querySelector('.total-value').textContent).toBe('£-50.00');
      expect(distributionSummary.totalDistribution).toBe(-50.00);
    });
  });

  describe('destroy()', () => {
    test('should clear container content', () => {
      distributionSummary.render('test-container', 100.00);
      expect(container.innerHTML).not.toBe('');

      distributionSummary.destroy();
      expect(container.innerHTML).toBe('');
    });

    test('should reset total distribution to zero', () => {
      distributionSummary.render('test-container', 100.00);
      expect(distributionSummary.totalDistribution).toBe(100.00);

      distributionSummary.destroy();
      expect(distributionSummary.totalDistribution).toBe(0);
    });

    test('should handle destroy when not rendered', () => {
      expect(() => {
        distributionSummary.destroy();
      }).not.toThrow();
    });

    test('should allow re-render after destroy', () => {
      distributionSummary.render('test-container', 100.00);
      distributionSummary.destroy();

      distributionSummary.render('test-container', 200.00);
      expect(container.querySelector('.total-value').textContent).toBe('£200.00');
    });
  });

  describe('Edge cases and integration scenarios', () => {
    test('should handle rapid successive updates', () => {
      distributionSummary.render('test-container', 0);

      for (let i = 1; i <= 10; i++) {
        distributionSummary.updateTotals(i * 10);
      }

      expect(container.querySelector('.total-value').textContent).toBe('£100.00');
      expect(distributionSummary.totalDistribution).toBe(100);
    });

    test('should maintain correct state across render and update cycles', () => {
      // Initial render
      distributionSummary.render('test-container', 50.00);
      expect(distributionSummary.totalDistribution).toBe(50.00);

      // Update
      distributionSummary.updateTotals(75.00);
      expect(distributionSummary.totalDistribution).toBe(75.00);

      // Re-render with new amount
      distributionSummary.render('test-container', 100.00);
      expect(distributionSummary.totalDistribution).toBe(100.00);
      expect(container.querySelector('.total-value').textContent).toBe('£100.00');
    });

    test('should handle amounts with many decimal places by rounding', () => {
      distributionSummary.render('test-container', 123.456789);

      const totalValue = container.querySelector('.total-value');
      expect(totalValue.textContent).toBe('£123.46');
    });

    test('should handle sum of multiple small amounts correctly', () => {
      distributionSummary.render('test-container', 0);

      // Simulate adding multiple small amounts (common in winnings distribution)
      let total = 0;
      const amounts = [25.50, 30.75, 15.25, 40.00, 22.50];
      
      for (const amount of amounts) {
        total += amount;
      }

      distributionSummary.updateTotals(total);
      expect(container.querySelector('.total-value').textContent).toBe('£134.00');
    });

    test('should display correct format for whole pound amounts', () => {
      const wholeAmounts = [10, 50, 100, 500, 1000];

      for (const amount of wholeAmounts) {
        distributionSummary.render('test-container', amount);
        expect(container.querySelector('.total-value').textContent).toBe(`£${amount}.00`);
      }
    });

    test('should handle amounts with single decimal place', () => {
      distributionSummary.render('test-container', 50.5);
      expect(container.querySelector('.total-value').textContent).toBe('£50.50');
    });

    test('should maintain element ID for easy DOM access', () => {
      distributionSummary.render('test-container', 100.00);

      const totalValueElement = document.getElementById('total-distribution-value');
      expect(totalValueElement).toBeTruthy();
      expect(totalValueElement.textContent).toBe('£100.00');
    });

    test('should handle container reference correctly', () => {
      distributionSummary.render('test-container', 100.00);
      expect(distributionSummary.container).toBe(container);

      distributionSummary.destroy();
      // Container reference should still exist but be empty
      expect(distributionSummary.container).toBe(container);
      expect(container.innerHTML).toBe('');
    });
  });
});
