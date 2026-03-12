/**
 * Unit Tests for ResultsTable
 * Tests CRUD operations, rendering, and UI interactions
 */

import { ResultsTable } from './resultsTable.js';

describe('ResultsTable', () => {
  let resultsTable;
  let mockApiClient;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      request: jest.fn()
    };

    // Create instance
    resultsTable = new ResultsTable(mockApiClient);

    // Mock DOM
    document.body.innerHTML = '<div id="results-table-container"></div>';
  });

  afterEach(() => {
    // Clean up
    if (resultsTable) {
      resultsTable.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty results array', () => {
      expect(resultsTable.results).toEqual([]);
      expect(resultsTable.competition).toBeNull();
      expect(resultsTable.editingResultId).toBeNull();
    });
  });

  describe('loadResults', () => {
    test('should fetch and display results', async () => {
      const mockResults = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 85, handicap: 12, nettScore: 73 },
        { id: 2, finishingPosition: 2, playerName: 'Jane DOE', grossScore: 88, handicap: 15, nettScore: 73 }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });

      const result = await resultsTable.loadResults(1);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results?competitionId=1', {
        method: 'GET'
      });
      expect(result).toEqual(mockResults);
      expect(resultsTable.results).toEqual(mockResults);
    });

    test('should sort results by finishing position', async () => {
      const mockResults = [
        { id: 2, finishingPosition: 2, playerName: 'Jane DOE' },
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' },
        { id: 3, finishingPosition: 3, playerName: 'Bob JONES' }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });

      await resultsTable.loadResults(1);

      expect(resultsTable.results[0].finishingPosition).toBe(1);
      expect(resultsTable.results[1].finishingPosition).toBe(2);
      expect(resultsTable.results[2].finishingPosition).toBe(3);
    });

    test('should handle snake_case field names', async () => {
      const mockResults = [
        { id: 1, finishing_position: 1, player_name: 'John SMITH' }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });

      await resultsTable.loadResults(1);

      expect(resultsTable.results).toEqual(mockResults);
    });

    test('should wrap API errors', async () => {
      const apiError = new Error('Network error');
      apiError.code = 'NETWORK_ERROR';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(resultsTable.loadResults(1)).rejects.toThrow('Failed to load results');
    });
  });

  describe('addResult', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.render();
    });

    test('should create new result', async () => {
      const dto = {
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73
      };
      const mockResult = { id: 1, ...dto };

      mockApiClient.request.mockResolvedValue({ result: mockResult });

      const result = await resultsTable.addResult(dto);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results', {
        method: 'POST',
        body: JSON.stringify(dto)
      });
      expect(result).toEqual(mockResult);
      expect(resultsTable.results).toContain(mockResult);
    });

    test('should re-sort results after adding', async () => {
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' }
      ];

      const dto = {
        competitionId: 1,
        finishingPosition: 3,
        playerName: 'Bob JONES'
      };
      const mockResult = { id: 3, ...dto };

      mockApiClient.request.mockResolvedValue({ result: mockResult });

      await resultsTable.addResult(dto);

      expect(resultsTable.results[0].finishingPosition).toBe(1);
      expect(resultsTable.results[1].finishingPosition).toBe(3);
    });

    test('should dispatch results-updated event', async () => {
      const dto = { competitionId: 1, finishingPosition: 1, playerName: 'Test' };
      const mockResult = { id: 1, ...dto };
      mockApiClient.request.mockResolvedValue({ result: mockResult });

      const eventListener = jest.fn();
      document.addEventListener('results-updated', eventListener);

      await resultsTable.addResult(dto);

      expect(eventListener).toHaveBeenCalled();

      document.removeEventListener('results-updated', eventListener);
    });

    test('should wrap API errors', async () => {
      const dto = { competitionId: 1, finishingPosition: 1, playerName: 'Test' };
      const apiError = new Error('Validation failed');
      apiError.code = 'VALIDATION_ERROR';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(resultsTable.addResult(dto)).rejects.toThrow('Failed to add result');
    });
  });

  describe('updateResult', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 85 }
      ];
      resultsTable.render();
    });

    test('should update result fields', async () => {
      const updates = { grossScore: 86, nettScore: 74 };
      const updatedResult = { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 86, nettScore: 74 };

      mockApiClient.request.mockResolvedValue({ result: updatedResult });

      const result = await resultsTable.updateResult(1, updates);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results/1', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      expect(result).toEqual(updatedResult);
      expect(resultsTable.results[0]).toEqual(updatedResult);
    });

    test('should re-sort results after updating position', async () => {
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' },
        { id: 2, finishingPosition: 2, playerName: 'Jane DOE' }
      ];

      const updates = { finishingPosition: 3 };
      const updatedResult = { id: 1, finishingPosition: 3, playerName: 'John SMITH' };

      mockApiClient.request.mockResolvedValue({ result: updatedResult });

      await resultsTable.updateResult(1, updates);

      expect(resultsTable.results[0].id).toBe(2);
      expect(resultsTable.results[1].id).toBe(1);
    });

    test('should dispatch results-updated event', async () => {
      const updates = { grossScore: 86 };
      const updatedResult = { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 86 };
      mockApiClient.request.mockResolvedValue({ result: updatedResult });

      const eventListener = jest.fn();
      document.addEventListener('results-updated', eventListener);

      await resultsTable.updateResult(1, updates);

      expect(eventListener).toHaveBeenCalled();

      document.removeEventListener('results-updated', eventListener);
    });

    test('should wrap API errors', async () => {
      const updates = { grossScore: 86 };
      const apiError = new Error('Not found');
      apiError.code = 'NOT_FOUND';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(resultsTable.updateResult(1, updates)).rejects.toThrow('Failed to update result');
    });
  });

  describe('deleteResult', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' },
        { id: 2, finishingPosition: 2, playerName: 'Jane DOE' }
      ];
      resultsTable.render();

      // Mock window.confirm
      global.confirm = jest.fn();
    });

    afterEach(() => {
      delete global.confirm;
    });

    test('should remove result from table', async () => {
      global.confirm.mockReturnValue(true);
      mockApiClient.request.mockResolvedValue({});

      await resultsTable.deleteResult(1);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results/1', {
        method: 'DELETE'
      });
      expect(resultsTable.results.length).toBe(1);
      expect(resultsTable.results[0].id).toBe(2);
    });

    test('should dispatch results-updated event', async () => {
      global.confirm.mockReturnValue(true);
      mockApiClient.request.mockResolvedValue({});

      const eventListener = jest.fn();
      document.addEventListener('results-updated', eventListener);

      await resultsTable.deleteResult(1);

      expect(eventListener).toHaveBeenCalled();

      document.removeEventListener('results-updated', eventListener);
    });

    test('should wrap API errors', async () => {
      global.confirm.mockReturnValue(true);
      const apiError = new Error('Not found');
      apiError.code = 'NOT_FOUND';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(resultsTable.deleteResult(1)).rejects.toThrow('Failed to delete result');
    });
  });

  describe('render - singles competition', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Singles', type: 'singles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 85, handicap: 12, nettScore: 73, entryPaid: true, swindleMoneyPaid: 50 }
      ];
    });

    test('should show all columns for singles competition', () => {
      resultsTable.render();

      const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent);
      expect(headers).toContain('Pos');
      expect(headers).toContain('Name');
      expect(headers).toContain('Gross');
      expect(headers).toContain('Hcp');
      expect(headers).toContain('Nett');
      expect(headers).toContain('Entry Paid');
      expect(headers).toContain('Swindle Money');
      expect(headers).toContain('Actions');
    });

    test('should display result data correctly', () => {
      resultsTable.render();

      const cells = Array.from(document.querySelectorAll('tbody td'));
      expect(cells[0].textContent).toBe('1'); // Position
      expect(cells[1].textContent).toBe('John SMITH'); // Name
      expect(cells[2].textContent).toBe('85'); // Gross
      expect(cells[3].textContent).toBe('12'); // Handicap
      expect(cells[4].textContent).toBe('73'); // Nett
      expect(cells[5].textContent).toBe('✓'); // Entry Paid
      expect(cells[6].textContent).toBe('£50.00'); // Swindle Money
    });

    test('should show dash for empty optional fields', () => {
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' }
      ];
      resultsTable.render();

      const cells = Array.from(document.querySelectorAll('tbody td'));
      expect(cells[2].textContent).toBe('-'); // Gross
      expect(cells[3].textContent).toBe('-'); // Handicap
      expect(cells[4].textContent).toBe('-'); // Nett
      expect(cells[6].textContent).toBe('-'); // Swindle Money
    });

    test('should render add manual entry button', () => {
      resultsTable.render();

      const addBtn = document.querySelector('.btn-primary');
      expect(addBtn).toBeTruthy();
      expect(addBtn.textContent).toBe('Add Manual Entry');
    });

    test('should show empty state when no results', () => {
      resultsTable.results = [];
      resultsTable.render();

      const emptyCell = document.querySelector('tbody .empty-state');
      expect(emptyCell).toBeTruthy();
      expect(emptyCell.textContent).toBe('No results yet. Add manual entries or upload a CSV.');
    });
  });

  describe('render - doubles competition', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Doubles', type: 'doubles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH', nettScore: 73, entryPaid: true, swindleMoneyPaid: 50 }
      ];
    });

    test('should hide gross/hcp columns for doubles competition', () => {
      resultsTable.render();

      const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent);
      expect(headers).toContain('Pos');
      expect(headers).toContain('Name');
      expect(headers).toContain('Nett');
      expect(headers).toContain('Entry Paid');
      expect(headers).toContain('Swindle Money');
      expect(headers).toContain('Actions');
      expect(headers).not.toContain('Gross');
      expect(headers).not.toContain('Hcp');
    });

    test('should display result data correctly', () => {
      resultsTable.render();

      const cells = Array.from(document.querySelectorAll('tbody td'));
      expect(cells[0].textContent).toBe('1'); // Position
      expect(cells[1].textContent).toBe('John SMITH'); // Name
      expect(cells[2].textContent).toBe('73'); // Nett
      expect(cells[3].textContent).toBe('✓'); // Entry Paid
      expect(cells[4].textContent).toBe('£50.00'); // Swindle Money
    });
  });

  describe('render - no competition selected', () => {
    test('should show empty state when no competition selected', () => {
      resultsTable.competition = null;
      resultsTable.render();

      const emptyState = document.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toBe('Select a competition to view results');
    });
  });

  describe('inline editing', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH', grossScore: 85, handicap: 12, nettScore: 73 }
      ];
      resultsTable.render();
    });

    test('should enter edit mode on edit button click', () => {
      const editBtn = document.querySelector('.btn-edit');
      editBtn.click();

      expect(resultsTable.editingResultId).toBe(1);
      
      // Check for edit inputs
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs.length).toBeGreaterThan(0);
    });

    test('should show save and cancel buttons in edit mode', () => {
      resultsTable.editingResultId = 1;
      resultsTable.render();

      const saveBtn = document.querySelector('.btn-save');
      const cancelBtn = document.querySelector('.btn-cancel');
      
      expect(saveBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
    });

    test('should cancel edit on cancel button click', () => {
      resultsTable.editingResultId = 1;
      resultsTable.render();

      const cancelBtn = document.querySelector('.btn-cancel');
      cancelBtn.click();

      expect(resultsTable.editingResultId).toBeNull();
    });

    test('should update result on save button click', async () => {
      resultsTable.editingResultId = 1;
      resultsTable.render();

      // Modify input values
      const inputs = document.querySelectorAll('.edit-input');
      inputs[0].value = '2'; // Position
      inputs[1].value = 'Jane DOE'; // Name
      inputs[2].value = '90'; // Gross

      const updatedResult = {
        id: 1,
        finishingPosition: 2,
        playerName: 'Jane DOE',
        grossScore: 90,
        handicap: 12,
        nettScore: 73
      };
      mockApiClient.request.mockResolvedValue({ result: updatedResult });

      const saveBtn = document.querySelector('.btn-save');
      await saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalled();
      expect(resultsTable.editingResultId).toBeNull();
    });

    test('should validate required fields on save', async () => {
      resultsTable.editingResultId = 1;
      resultsTable.render();

      // Clear name field
      const inputs = document.querySelectorAll('.edit-input');
      inputs[1].value = ''; // Name

      const saveBtn = document.querySelector('.btn-save');
      await saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    test('should validate position is positive on save', async () => {
      resultsTable.editingResultId = 1;
      resultsTable.render();

      // Set invalid position
      const inputs = document.querySelectorAll('.edit-input');
      inputs[0].value = '0'; // Position

      const saveBtn = document.querySelector('.btn-save');
      await saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('manual entry modal', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.render();
    });

    test('should show modal on add manual entry button click', () => {
      const addBtn = document.querySelector('.btn-primary');
      addBtn.click();

      const modal = document.querySelector('.modal');
      expect(modal).toBeTruthy();
      expect(modal.querySelector('h3').textContent).toBe('Add Manual Entry');
    });

    test('should render all form fields for singles competition', () => {
      resultsTable.showManualEntryModal();

      expect(document.getElementById('result-position-input')).toBeTruthy();
      expect(document.getElementById('result-name-input')).toBeTruthy();
      expect(document.getElementById('result-gross-input')).toBeTruthy();
      expect(document.getElementById('result-hcp-input')).toBeTruthy();
      expect(document.getElementById('result-nett-input')).toBeTruthy();
      expect(document.getElementById('result-entry-input')).toBeTruthy();
    });

    test('should not render gross/hcp fields for doubles competition', () => {
      resultsTable.competition = { id: 1, name: 'Test Doubles', type: 'doubles' };
      resultsTable.showManualEntryModal();

      expect(document.getElementById('result-position-input')).toBeTruthy();
      expect(document.getElementById('result-name-input')).toBeTruthy();
      expect(document.getElementById('result-nett-input')).toBeTruthy();
      expect(document.getElementById('result-entry-input')).toBeTruthy();
      expect(document.getElementById('result-gross-input')).toBeFalsy();
      expect(document.getElementById('result-hcp-input')).toBeFalsy();
    });

    test('should close modal on cancel button click', () => {
      resultsTable.showManualEntryModal();

      const cancelBtn = document.querySelector('.modal-footer .btn-secondary');
      cancelBtn.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should close modal on overlay click', () => {
      resultsTable.showManualEntryModal();

      const overlay = document.querySelector('.modal-overlay');
      overlay.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should not close modal on modal content click', () => {
      resultsTable.showManualEntryModal();

      const modal = document.querySelector('.modal');
      modal.click();

      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should create result on add button click with valid input', async () => {
      const mockResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: true
      };
      mockApiClient.request.mockResolvedValue({ result: mockResult });

      resultsTable.showManualEntryModal();

      document.getElementById('result-position-input').value = '1';
      document.getElementById('result-name-input').value = 'John SMITH';
      document.getElementById('result-gross-input').value = '85';
      document.getElementById('result-hcp-input').value = '12';
      document.getElementById('result-nett-input').value = '73';
      document.getElementById('result-entry-input').checked = true;

      const addBtn = document.querySelector('.modal-footer .btn-primary');
      await addBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should show error when position is missing', async () => {
      resultsTable.showManualEntryModal();

      document.getElementById('result-position-input').value = '';
      document.getElementById('result-name-input').value = 'John SMITH';

      const addBtn = document.querySelector('.modal-footer .btn-primary');
      await addBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should show error when name is missing', async () => {
      resultsTable.showManualEntryModal();

      document.getElementById('result-position-input').value = '1';
      document.getElementById('result-name-input').value = '';

      const addBtn = document.querySelector('.modal-footer .btn-primary');
      await addBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should show error when position is not positive', async () => {
      resultsTable.showManualEntryModal();

      document.getElementById('result-position-input').value = '0';
      document.getElementById('result-name-input').value = 'John SMITH';

      const addBtn = document.querySelector('.modal-footer .btn-primary');
      await addBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('setCompetition', () => {
    test('should load results when competition is set', async () => {
      const competition = { id: 1, name: 'Test Competition', type: 'singles' };
      const mockResults = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });

      await resultsTable.setCompetition(competition);

      expect(resultsTable.competition).toEqual(competition);
      expect(resultsTable.results).toEqual(mockResults);
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results?competitionId=1', {
        method: 'GET'
      });
    });

    test('should clear results when competition is null', async () => {
      resultsTable.results = [{ id: 1, finishingPosition: 1, playerName: 'Test' }];

      await resultsTable.setCompetition(null);

      expect(resultsTable.competition).toBeNull();
      expect(resultsTable.results).toEqual([]);
    });
  });

  describe('refresh', () => {
    test('should reload results for current competition', async () => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      const mockResults = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });

      await resultsTable.refresh();

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results?competitionId=1', {
        method: 'GET'
      });
      expect(resultsTable.results).toEqual(mockResults);
    });

    test('should handle refresh errors gracefully', async () => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      await expect(resultsTable.refresh()).resolves.not.toThrow();
    });

    test('should not reload if no competition is set', async () => {
      resultsTable.competition = null;

      await resultsTable.refresh();

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    test('should clean up DOM', () => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.render();

      const container = document.getElementById('results-table-container');
      expect(container.innerHTML).not.toBe('');

      resultsTable.destroy();

      expect(container.innerHTML).toBe('');
    });

    test('should close modal if open', () => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.showManualEntryModal();

      expect(document.querySelector('.modal-overlay')).toBeTruthy();

      resultsTable.destroy();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });
  });

  describe('notification system', () => {
    test('should show success notification', () => {
      resultsTable.showSuccess('Operation successful');

      const notification = document.querySelector('.notification-success');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation successful');
    });

    test('should show error notification', () => {
      resultsTable.showError('Operation failed');

      const notification = document.querySelector('.notification-error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation failed');
    });

    test('should auto-remove notification after timeout', (done) => {
      resultsTable.showSuccess('Test message');

      const notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      setTimeout(() => {
        expect(document.querySelector('.notification')).toBeFalsy();
        done();
      }, 3500);
    }, 4000);
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      resultsTable.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      resultsTable.results = [
        { id: 1, finishingPosition: 1, playerName: 'John SMITH' }
      ];
      resultsTable.render();

      // Mock window.confirm
      global.confirm = jest.fn();
    });

    afterEach(() => {
      delete global.confirm;
    });

    test('should show confirmation dialog on delete', async () => {
      global.confirm.mockReturnValue(false);

      const deleteBtn = document.querySelector('.btn-delete');
      await deleteBtn.click();

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete the result for "John SMITH"?')
      );
    });

    test('should not delete if user cancels', async () => {
      global.confirm.mockReturnValue(false);

      const deleteBtn = document.querySelector('.btn-delete');
      await deleteBtn.click();

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    test('should delete if user confirms', async () => {
      global.confirm.mockReturnValue(true);
      mockApiClient.request.mockResolvedValue({});

      const deleteBtn = document.querySelector('.btn-delete');
      await deleteBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results/1', {
        method: 'DELETE'
      });
    });
  });
});
