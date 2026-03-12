/**
 * @jest-environment jsdom
 */

import { WeeklyDrillDownView } from './weeklyDrillDownView.js';

describe('WeeklyDrillDownView', () => {
  let drillDownView;
  let mockDatabaseManager;
  let mockCompetitionManager;
  let mockTransactionFlagger;
  let mockTransactionSummaryView;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="weekly-drilldown-modal" class="modal" style="display: none;">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="drill-down-heading">Transactions for Week</h2>
            <button id="close-drill-down" class="close-button">×</button>
          </div>
          <div class="modal-body">
            <div class="drill-down-summary">
              <div class="summary-item">
                <span class="label">Total Transactions:</span>
                <span id="drill-down-total-count" class="value">0</span>
              </div>
              <div class="summary-item">
                <span class="label">Flagged Winnings:</span>
                <span id="drill-down-winnings-total" class="value">£0.00</span>
              </div>
            </div>
            <div id="drill-down-loading" class="loading" style="display: none;">
              <div class="spinner"></div>
              <span>Loading transactions...</span>
            </div>
            <div class="table-wrapper">
              <table id="drill-down-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Member/Player</th>
                    <th>Total</th>
                    <th>Flag Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="drill-down-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create mocks
    mockDatabaseManager = {
      getByDateRange: jest.fn()
    };

    mockCompetitionManager = {
      getAll: jest.fn()
    };

    mockTransactionFlagger = {
      canFlag: jest.fn(),
      flagTransaction: jest.fn(),
      unflagTransaction: jest.fn(),
      updateFlag: jest.fn()
    };

    mockTransactionSummaryView = {
      render: jest.fn()
    };

    // Create instance
    drillDownView = new WeeklyDrillDownView(
      mockDatabaseManager,
      mockCompetitionManager,
      mockTransactionFlagger,
      mockTransactionSummaryView
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct dependencies', () => {
      expect(drillDownView.databaseManager).toBe(mockDatabaseManager);
      expect(drillDownView.competitionManager).toBe(mockCompetitionManager);
      expect(drillDownView.transactionFlagger).toBe(mockTransactionFlagger);
      expect(drillDownView.transactionSummaryView).toBe(mockTransactionSummaryView);
    });

    test('should find all required DOM elements', () => {
      expect(drillDownView.modal).toBeTruthy();
      expect(drillDownView.heading).toBeTruthy();
      expect(drillDownView.totalCountElement).toBeTruthy();
      expect(drillDownView.winningsTotalElement).toBeTruthy();
      expect(drillDownView.loadingElement).toBeTruthy();
      expect(drillDownView.tableBody).toBeTruthy();
      expect(drillDownView.closeButton).toBeTruthy();
    });

    test('should initialize state variables', () => {
      expect(drillDownView.currentWeekStart).toBeNull();
      expect(drillDownView.currentWeekEnd).toBeNull();
      expect(drillDownView.transactions).toEqual([]);
      expect(drillDownView.competitions).toEqual([]);
    });
  });

  describe('show()', () => {
    const weekStart = new Date('2025-08-25');
    const weekEnd = new Date('2025-08-31');

    test('should display modal and load transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: false,
          winningCompetitionId: null
        }
      ];

      const mockCompetitions = [
        { id: 1, name: 'October Medal 2025' }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue(mockCompetitions);

      await drillDownView.show(weekStart, weekEnd);

      expect(drillDownView.modal.style.display).toBe('block');
      expect(mockDatabaseManager.getByDateRange).toHaveBeenCalledWith(weekStart, weekEnd);
      expect(mockCompetitionManager.getAll).toHaveBeenCalled();
      expect(drillDownView.currentWeekStart).toBe(weekStart);
      expect(drillDownView.currentWeekEnd).toBe(weekEnd);
    });

    test('should update heading with week dates', async () => {
      mockDatabaseManager.getByDateRange.mockResolvedValue([]);
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.show(weekStart, weekEnd);

      expect(drillDownView.heading.textContent).toContain('25/08/2025');
      expect(drillDownView.heading.textContent).toContain('31/08/2025');
    });

    test('should render transactions in table', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: false,
          winningCompetitionId: null
        },
        {
          id: 2,
          date: '27-08-2025',
          time: '10:30',
          type: 'Sale (Competition Entry)',
          member: 'Jane Smith',
          player: 'Jane Smith',
          total: '10.00',
          isWinning: false,
          winningCompetitionId: null
        }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.show(weekStart, weekEnd);

      const rows = drillDownView.tableBody.querySelectorAll('tr');
      expect(rows.length).toBe(2);
    });

    test('should enrich transactions with competition names', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: true,
          winningCompetitionId: 1
        }
      ];

      const mockCompetitions = [
        { id: 1, name: 'October Medal 2025' }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue(mockCompetitions);

      await drillDownView.show(weekStart, weekEnd);

      const badge = drillDownView.tableBody.querySelector('.competition-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('October Medal 2025');
    });

    test('should update summary with transaction count and winnings total', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: true,
          winningCompetitionId: 1
        },
        {
          id: 2,
          date: '27-08-2025',
          time: '10:30',
          type: 'Topup (Competitions)',
          member: 'Jane Smith',
          player: 'Jane Smith',
          total: '30.00',
          isWinning: true,
          winningCompetitionId: 1
        },
        {
          id: 3,
          date: '28-08-2025',
          time: '14:00',
          type: 'Sale (Competition Entry)',
          member: 'Bob Jones',
          player: 'Bob Jones',
          total: '10.00',
          isWinning: false,
          winningCompetitionId: null
        }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.show(weekStart, weekEnd);

      expect(drillDownView.totalCountElement.textContent).toBe('3');
      expect(drillDownView.winningsTotalElement.textContent).toBe('£80.00');
    });

    test('should handle empty transaction list', async () => {
      mockDatabaseManager.getByDateRange.mockResolvedValue([]);
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.show(weekStart, weekEnd);

      const emptyState = drillDownView.tableBody.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No transactions found');
    });

    test('should handle errors gracefully', async () => {
      mockDatabaseManager.getByDateRange.mockRejectedValue(new Error('Database error'));
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.show(weekStart, weekEnd);

      const errorState = drillDownView.tableBody.querySelector('.error-state');
      expect(errorState).toBeTruthy();
      expect(errorState.textContent).toContain('Failed to load transactions');
    });
  });

  describe('hide()', () => {
    test('should hide modal and reset state', () => {
      drillDownView.currentWeekStart = new Date('2025-08-25');
      drillDownView.currentWeekEnd = new Date('2025-08-31');
      drillDownView.transactions = [{ id: 1 }];
      drillDownView.modal.style.display = 'block';

      drillDownView.hide();

      expect(drillDownView.modal.style.display).toBe('none');
      expect(drillDownView.currentWeekStart).toBeNull();
      expect(drillDownView.currentWeekEnd).toBeNull();
      expect(drillDownView.transactions).toEqual([]);
    });
  });

  describe('refresh()', () => {
    test('should reload current week data', async () => {
      const weekStart = new Date('2025-08-25');
      const weekEnd = new Date('2025-08-31');

      drillDownView.currentWeekStart = weekStart;
      drillDownView.currentWeekEnd = weekEnd;

      mockDatabaseManager.getByDateRange.mockResolvedValue([]);
      mockCompetitionManager.getAll.mockResolvedValue([]);

      await drillDownView.refresh();

      expect(mockDatabaseManager.getByDateRange).toHaveBeenCalledWith(weekStart, weekEnd);
    });

    test('should do nothing if no current week is set', async () => {
      drillDownView.currentWeekStart = null;
      drillDownView.currentWeekEnd = null;

      await drillDownView.refresh();

      expect(mockDatabaseManager.getByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Row Rendering', () => {
    test('should render unflagged transaction with flag button', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: false,
          winningCompetitionId: null
        }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue([]);
      mockTransactionFlagger.canFlag.mockReturnValue(true);

      await drillDownView.show(new Date('2025-08-25'), new Date('2025-08-31'));

      const flagBtn = drillDownView.tableBody.querySelector('.flag-btn');
      expect(flagBtn).toBeTruthy();
      expect(flagBtn.textContent).toContain('Flag as Winnings');
    });

    test('should render flagged transaction with edit button', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: true,
          winningCompetitionId: 1
        }
      ];

      const mockCompetitions = [
        { id: 1, name: 'October Medal 2025' }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue(mockCompetitions);
      mockTransactionFlagger.canFlag.mockReturnValue(true);

      await drillDownView.show(new Date('2025-08-25'), new Date('2025-08-31'));

      const editBtn = drillDownView.tableBody.querySelector('.edit-flag-btn');
      expect(editBtn).toBeTruthy();
      expect(editBtn.textContent).toContain('Edit Flag');

      const flagIcon = drillDownView.tableBody.querySelector('.flag-icon');
      expect(flagIcon).toBeTruthy();
      expect(flagIcon.textContent).toBe('🏆');

      const badge = drillDownView.tableBody.querySelector('.competition-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('October Medal 2025');
    });

    test('should apply flagged-row class to flagged transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          player: 'John Doe',
          total: '50.00',
          isWinning: true,
          winningCompetitionId: 1
        }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue([]);
      mockTransactionFlagger.canFlag.mockReturnValue(true);

      await drillDownView.show(new Date('2025-08-25'), new Date('2025-08-31'));

      const row = drillDownView.tableBody.querySelector('tr');
      expect(row.classList.contains('flagged-row')).toBe(true);
    });

    test('should not show flag button for non-flaggable transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: '26-08-2025',
          time: '18:19',
          type: 'Sale (Competition Entry)',
          member: 'John Doe',
          player: 'John Doe',
          total: '10.00',
          isWinning: false,
          winningCompetitionId: null
        }
      ];

      mockDatabaseManager.getByDateRange.mockResolvedValue(mockTransactions);
      mockCompetitionManager.getAll.mockResolvedValue([]);
      mockTransactionFlagger.canFlag.mockReturnValue(false);

      await drillDownView.show(new Date('2025-08-25'), new Date('2025-08-31'));

      const flagBtn = drillDownView.tableBody.querySelector('.flag-btn');
      expect(flagBtn).toBeNull();
    });
  });

  describe('Event Handlers', () => {
    test('should close modal when close button is clicked', () => {
      drillDownView.modal.style.display = 'block';

      drillDownView.closeButton.click();

      expect(drillDownView.modal.style.display).toBe('none');
    });

    test('should close modal when overlay is clicked', () => {
      drillDownView.modal.style.display = 'block';
      const overlay = drillDownView.modal.querySelector('.modal-overlay');

      overlay.click();

      expect(drillDownView.modal.style.display).toBe('none');
    });

    test('should close modal on Escape key', () => {
      drillDownView.modal.style.display = 'block';

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(drillDownView.modal.style.display).toBe('none');
    });
  });

  describe('Formatting Methods', () => {
    test('formatCurrency should format numbers correctly', () => {
      expect(drillDownView.formatCurrency(50)).toBe('£50.00');
      expect(drillDownView.formatCurrency('50')).toBe('£50.00');
      expect(drillDownView.formatCurrency(50.5)).toBe('£50.50');
      expect(drillDownView.formatCurrency('50.5')).toBe('£50.50');
    });

    test('formatCurrency should handle invalid values', () => {
      expect(drillDownView.formatCurrency('invalid')).toBe('£0.00');
      expect(drillDownView.formatCurrency(NaN)).toBe('£0.00');
      expect(drillDownView.formatCurrency(null)).toBe('£0.00');
      expect(drillDownView.formatCurrency(undefined)).toBe('£0.00');
    });

    test('formatDate should format dates correctly', () => {
      const date = new Date('2025-08-26');
      expect(drillDownView.formatDate(date)).toBe('26/08/2025');
    });

    test('formatDate should handle date strings', () => {
      expect(drillDownView.formatDate('2025-08-26')).toBe('26/08/2025');
    });

    test('formatDate should handle invalid dates', () => {
      expect(drillDownView.formatDate('invalid')).toBe('');
      expect(drillDownView.formatDate(null)).toBe('');
      expect(drillDownView.formatDate(undefined)).toBe('');
    });
  });
});
