/**
 * Unit tests for CompetitionCostsManager component
 */

import { CompetitionCostsManager } from './competitionCostsManager.js';

describe('CompetitionCostsManager', () => {
  let costsManager;
  let mockApiClient;
  let container;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      getAllCompetitionCosts: jest.fn(),
      createCompetitionCost: jest.fn(),
      getCompetitionCostsByDateRange: jest.fn()
    };

    // Create container element
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create instance
    costsManager = new CompetitionCostsManager(mockApiClient);
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('render()', () => {
    test('should render form with description and amount input fields', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async loadCosts

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      
      expect(descriptionInput).toBeTruthy();
      expect(descriptionInput.type).toBe('text');
      expect(descriptionInput.required).toBe(true);
      
      expect(amountInput).toBeTruthy();
      expect(amountInput.type).toBe('number');
      expect(amountInput.step).toBe('0.01');
      expect(amountInput.min).toBe('0.01');
      expect(amountInput.required).toBe(true);
    });

    test('should render submit button', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
      expect(submitButton.textContent).toBe('Record Cost');
    });

    test('should render cost history table container', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const tableContainer = container.querySelector('#costs-table-container');
      expect(tableContainer).toBeTruthy();
    });

    test('should display total of all costs', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const totalDiv = container.querySelector('#costs-total');
      expect(totalDiv).toBeTruthy();
      expect(totalDiv.textContent).toContain('Total:');
      expect(totalDiv.textContent).toContain('£0.00');
    });

    test('should render date range filter inputs', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const startDateInput = container.querySelector('#filter-start-date');
      const endDateInput = container.querySelector('#filter-end-date');
      
      expect(startDateInput).toBeTruthy();
      expect(startDateInput.type).toBe('date');
      
      expect(endDateInput).toBeTruthy();
      expect(endDateInput.type).toBe('date');
    });
  });

  describe('loadCosts()', () => {
    test('should fetch all costs from API', async () => {
      const mockCosts = [
        {
          id: 1,
          description: 'Trophy Engraving',
          amount: 50.00,
          transaction_date: '2024-01-15'
        },
        {
          id: 2,
          description: 'Stationery',
          amount: 25.50,
          transaction_date: '2024-01-20'
        }
      ];

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: mockCosts,
        total: 75.50
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.getAllCompetitionCosts).toHaveBeenCalled();
      expect(costsManager.costs).toEqual(mockCosts);
      expect(costsManager.total).toBe(75.50);
    });

    test('should display costs in table ordered by date', async () => {
      const mockCosts = [
        {
          id: 2,
          description: 'Stationery',
          amount: 25.50,
          transaction_date: '2024-01-20'
        },
        {
          id: 1,
          description: 'Trophy Engraving',
          amount: 50.00,
          transaction_date: '2024-01-15'
        }
      ];

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: mockCosts,
        total: 75.50
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const rows = container.querySelectorAll('.costs-table tbody tr');
      expect(rows.length).toBe(2);
      
      const row1Cells = rows[0].querySelectorAll('td');
      expect(row1Cells[0].textContent).toBe('2024-01-20');
      expect(row1Cells[1].textContent).toBe('Stationery');
      expect(row1Cells[2].textContent).toBe('£25.50');
    });

    test('should calculate and display total', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Cost 1', amount: 50.00, transaction_date: '2024-01-15' },
          { id: 2, description: 'Cost 2', amount: 25.50, transaction_date: '2024-01-20' }
        ],
        total: 75.50
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const totalDiv = container.querySelector('#costs-total');
      expect(totalDiv.textContent).toContain('£75.50');
    });

    test('should display empty message when no costs exist', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const emptyMessage = container.querySelector('.empty-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.textContent).toContain('No competition costs recorded');
    });

    test('should handle API errors gracefully', async () => {
      mockApiClient.getAllCompetitionCosts.mockRejectedValue(new Error('API Error'));
      
      // Mock alert to prevent actual alert dialog
      global.alert = jest.fn();

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
    });
  });

  describe('handleSubmitCost()', () => {
    beforeEach(async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    test('should validate description is not empty', async () => {
      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = '';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionError = container.querySelector('#description-error');
      expect(descriptionError.style.display).toBe('block');
      expect(descriptionError.textContent).toContain('required');
      expect(mockApiClient.createCompetitionCost).not.toHaveBeenCalled();
    });

    test('should validate description is unique', async () => {
      // Set up existing costs
      costsManager.costs = [
        { id: 1, description: 'Trophy Engraving', amount: 50.00, transaction_date: '2024-01-15' }
      ];

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Trophy Engraving'; // Duplicate
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionError = container.querySelector('#description-error');
      expect(descriptionError.style.display).toBe('block');
      expect(descriptionError.textContent).toContain('already exists');
      expect(mockApiClient.createCompetitionCost).not.toHaveBeenCalled();
    });

    test('should validate description uniqueness case-insensitively', async () => {
      costsManager.costs = [
        { id: 1, description: 'Trophy Engraving', amount: 50.00, transaction_date: '2024-01-15' }
      ];

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'trophy engraving'; // Different case
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionError = container.querySelector('#description-error');
      expect(descriptionError.style.display).toBe('block');
      expect(mockApiClient.createCompetitionCost).not.toHaveBeenCalled();
    });

    test('should validate amount is positive', async () => {
      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '0'; // Not positive
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const amountError = container.querySelector('#amount-error');
      expect(amountError.style.display).toBe('block');
      expect(amountError.textContent).toContain('positive');
      expect(mockApiClient.createCompetitionCost).not.toHaveBeenCalled();
    });

    test('should validate amount has up to 2 decimal places', async () => {
      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.123'; // Too many decimals
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const amountError = container.querySelector('#amount-error');
      expect(amountError.style.display).toBe('block');
      expect(amountError.textContent).toContain('2 decimal places');
      expect(mockApiClient.createCompetitionCost).not.toHaveBeenCalled();
    });

    test('should call API to create cost with valid data', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.00,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Test Cost', amount: 50.00, transaction_date: '2024-01-15' }
        ],
        total: 50.00
      });

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.createCompetitionCost).toHaveBeenCalledWith({
        description: 'Test Cost',
        amount: 50.00
      });
    });

    test('should display success message after creating cost', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.00,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Test Cost', amount: 50.00, transaction_date: '2024-01-15' }
        ],
        total: 50.00
      });

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const successMessage = container.querySelector('#cost-success-message');
      expect(successMessage.style.display).toBe('block');
      expect(successMessage.textContent).toContain('successfully');
    });

    test('should refresh cost list after creating cost', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.00,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Test Cost', amount: 50.00, transaction_date: '2024-01-15' }
        ],
        total: 50.00
      });

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      // getAllCompetitionCosts should be called twice: once on render, once after create
      expect(mockApiClient.getAllCompetitionCosts).toHaveBeenCalledTimes(2);
    });

    test('should clear form inputs after successful submission', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.00,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Test Cost', amount: 50.00, transaction_date: '2024-01-15' }
        ],
        total: 50.00
      });

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(descriptionInput.value).toBe('');
      expect(amountInput.value).toBe('');
    });

    test('should handle duplicate description error from API', async () => {
      const error = new Error('Duplicate description');
      error.code = 'DUPLICATE_DESCRIPTION';
      mockApiClient.createCompetitionCost.mockRejectedValue(error);

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionError = container.querySelector('#description-error');
      expect(descriptionError.style.display).toBe('block');
      expect(descriptionError.textContent).toBe(error.message);
    });

    test('should handle API errors', async () => {
      mockApiClient.createCompetitionCost.mockRejectedValue(new Error('API Error'));
      global.alert = jest.fn();

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to record cost'));
    });
  });

  describe('applyDateRangeFilter()', () => {
    beforeEach(async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    test('should call API with date range parameters', async () => {
      mockApiClient.getCompetitionCostsByDateRange.mockResolvedValue({
        costs: [
          { id: 1, description: 'Cost 1', amount: 50.00, transaction_date: '2024-01-15' }
        ],
        total: 50.00
      });

      const startDateInput = container.querySelector('#filter-start-date');
      const endDateInput = container.querySelector('#filter-end-date');
      const filterButton = container.querySelector('.date-range-filter button');
      
      startDateInput.value = '2024-01-01';
      endDateInput.value = '2024-01-31';
      
      filterButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.getCompetitionCostsByDateRange).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });

    test('should update displayed costs and total after filtering', async () => {
      mockApiClient.getCompetitionCostsByDateRange.mockResolvedValue({
        costs: [
          { id: 1, description: 'Filtered Cost', amount: 30.00, transaction_date: '2024-01-15' }
        ],
        total: 30.00
      });

      const startDateInput = container.querySelector('#filter-start-date');
      const endDateInput = container.querySelector('#filter-end-date');
      const filterButton = container.querySelector('.date-range-filter button');
      
      startDateInput.value = '2024-01-01';
      endDateInput.value = '2024-01-31';
      
      filterButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      const totalDiv = container.querySelector('#costs-total');
      expect(totalDiv.textContent).toContain('£30.00');
      
      const rows = container.querySelectorAll('.costs-table tbody tr');
      expect(rows.length).toBe(1);
    });

    test('should show error if start date is missing', async () => {
      global.alert = jest.fn();

      const endDateInput = container.querySelector('#filter-end-date');
      const filterButton = container.querySelector('.date-range-filter button');
      
      endDateInput.value = '2024-01-31';
      
      filterButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('select both'));
      expect(mockApiClient.getCompetitionCostsByDateRange).not.toHaveBeenCalled();
    });

    test('should show error if end date is missing', async () => {
      global.alert = jest.fn();

      const startDateInput = container.querySelector('#filter-start-date');
      const filterButton = container.querySelector('.date-range-filter button');
      
      startDateInput.value = '2024-01-01';
      
      filterButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('select both'));
      expect(mockApiClient.getCompetitionCostsByDateRange).not.toHaveBeenCalled();
    });

    test('should show error if start date is after end date', async () => {
      global.alert = jest.fn();

      const startDateInput = container.querySelector('#filter-start-date');
      const endDateInput = container.querySelector('#filter-end-date');
      const filterButton = container.querySelector('.date-range-filter button');
      
      startDateInput.value = '2024-01-31';
      endDateInput.value = '2024-01-01';
      
      filterButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('before or equal'));
      expect(mockApiClient.getCompetitionCostsByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('clearDateRangeFilter()', () => {
    beforeEach(async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    test('should clear date input fields', async () => {
      const startDateInput = container.querySelector('#filter-start-date');
      const endDateInput = container.querySelector('#filter-end-date');
      const clearButton = container.querySelectorAll('.date-range-filter button')[1];
      
      startDateInput.value = '2024-01-01';
      endDateInput.value = '2024-01-31';
      
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(startDateInput.value).toBe('');
      expect(endDateInput.value).toBe('');
    });

    test('should reload all costs after clearing filter', async () => {
      const clearButton = container.querySelectorAll('.date-range-filter button')[1];
      
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // getAllCompetitionCosts should be called twice: once on render, once after clear
      expect(mockApiClient.getAllCompetitionCosts).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    test('should handle costs with camelCase field names', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          {
            id: 1,
            description: 'Test Cost',
            amount: 50.00,
            transactionDate: '2024-01-15' // camelCase
          }
        ],
        total: 50.00
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const rows = container.querySelectorAll('.costs-table tbody tr');
      expect(rows.length).toBe(1);
      
      const cells = rows[0].querySelectorAll('td');
      expect(cells[0].textContent).toBe('2024-01-15');
    });

    test('should format amounts with 2 decimal places', async () => {
      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [
          { id: 1, description: 'Cost 1', amount: 50, transaction_date: '2024-01-15' },
          { id: 2, description: 'Cost 2', amount: 25.5, transaction_date: '2024-01-20' }
        ],
        total: 75.50
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const rows = container.querySelectorAll('.costs-table tbody tr');
      const row1Cells = rows[0].querySelectorAll('td');
      const row2Cells = rows[1].querySelectorAll('td');
      
      expect(row1Cells[2].textContent).toBe('£50.00');
      expect(row2Cells[2].textContent).toBe('£25.50');
    });

    test('should trim whitespace from description input', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.00,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = '  Test Cost  '; // With whitespace
      amountInput.value = '50.00';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.createCompetitionCost).toHaveBeenCalledWith({
        description: 'Test Cost', // Trimmed
        amount: 50.00
      });
    });

    test('should accept amounts with 1 decimal place', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50.5,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50.5';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.createCompetitionCost).toHaveBeenCalledWith({
        description: 'Test Cost',
        amount: 50.5
      });
    });

    test('should accept integer amounts', async () => {
      mockApiClient.createCompetitionCost.mockResolvedValue({
        id: 1,
        description: 'Test Cost',
        amount: 50,
        transaction_date: '2024-01-15'
      });

      mockApiClient.getAllCompetitionCosts.mockResolvedValue({
        costs: [],
        total: 0
      });

      costsManager.render('test-container');
      await new Promise(resolve => setTimeout(resolve, 0));

      const descriptionInput = container.querySelector('#cost-description');
      const amountInput = container.querySelector('#cost-amount');
      const form = container.querySelector('#cost-form');
      
      descriptionInput.value = 'Test Cost';
      amountInput.value = '50';
      
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.createCompetitionCost).toHaveBeenCalledWith({
        description: 'Test Cost',
        amount: 50
      });
    });
  });
});
