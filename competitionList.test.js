/**
 * Unit Tests for CompetitionList
 * Tests CRUD operations, filtering, and UI interactions
 */

import { CompetitionList } from './competitionList.js';

describe('CompetitionList', () => {
  let competitionList;
  let mockApiClient;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      request: jest.fn(),
      getAllCompetitions: jest.fn()
    };

    // Create instance
    competitionList = new CompetitionList(mockApiClient);

    // Mock DOM
    document.body.innerHTML = '<div id="competition-list-container"></div>';
  });

  afterEach(() => {
    // Clean up
    if (competitionList) {
      competitionList.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty competitions array', () => {
      expect(competitionList.competitions).toEqual([]);
      expect(competitionList.filteredCompetitions).toEqual([]);
      expect(competitionList.selectedCompetitionId).toBeNull();
      expect(competitionList.currentSeasonFilter).toBeNull();
    });

    test('should load seasons and competitions on initialize', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25' },
        { id: 2, name: 'Season: Winter 25-Summer 26' }
      ];
      const mockCompetitions = [
        { id: 1, name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: 1 },
        { id: 2, name: 'Competition 2', date: '2024-02-20', type: 'doubles', seasonId: 2 }
      ];

      mockApiClient.request.mockResolvedValueOnce({ seasons: mockSeasons });
      mockApiClient.getAllCompetitions.mockResolvedValueOnce(mockCompetitions);

      await competitionList.initialize();

      expect(competitionList.seasons).toEqual(mockSeasons);
      expect(competitionList.competitions).toEqual(mockCompetitions);
    });

    test('should throw error if initialization fails', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      await expect(competitionList.initialize()).rejects.toThrow();
    });
  });

  describe('loadSeasons', () => {
    test('should fetch and store seasons from API', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25' },
        { id: 2, name: 'Season: Winter 25-Summer 26' }
      ];

      mockApiClient.request.mockResolvedValue({ seasons: mockSeasons });

      const result = await competitionList.loadSeasons();

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons', {
        method: 'GET'
      });
      expect(result).toEqual(mockSeasons);
      expect(competitionList.seasons).toEqual(mockSeasons);
    });

    test('should handle empty seasons array', async () => {
      mockApiClient.request.mockResolvedValue({ seasons: [] });

      const result = await competitionList.loadSeasons();

      expect(result).toEqual([]);
      expect(competitionList.seasons).toEqual([]);
    });
  });

  describe('loadCompetitions', () => {
    test('should fetch all competitions when no seasonId provided', async () => {
      const mockCompetitions = [
        { id: 1, name: 'Competition 1', seasonId: 1 },
        { id: 2, name: 'Competition 2', seasonId: 2 }
      ];

      mockApiClient.getAllCompetitions = jest.fn().mockResolvedValue(mockCompetitions);

      const result = await competitionList.loadCompetitions();

      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(result).toEqual(mockCompetitions);
      expect(competitionList.competitions).toEqual(mockCompetitions);
      expect(competitionList.filteredCompetitions).toEqual(mockCompetitions);
    });

    test('should fetch competitions filtered by seasonId and finished status', async () => {
      const mockCompetitions = [
        { id: 1, name: 'Competition 1', seasonId: 1 }
      ];

      mockApiClient.getAllCompetitions = jest.fn().mockResolvedValue(mockCompetitions);

      await competitionList.loadCompetitions(1);

      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false, seasonId: 1 });
    });

    test('should exclude finished competitions from results', async () => {
      const mockCompetitions = [
        { id: 1, name: 'Active Competition', seasonId: 1, finished: false },
        // Finished competitions should not be returned by API when finished: false is passed
      ];

      mockApiClient.getAllCompetitions = jest.fn().mockResolvedValue(mockCompetitions);

      await competitionList.loadCompetitions();

      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(competitionList.competitions).toEqual(mockCompetitions);
      // All returned competitions should be unfinished
      competitionList.competitions.forEach(comp => {
        expect(comp.finished).not.toBe(true);
      });
    });

    test('should apply current filter after loading', async () => {
      const mockCompetitions = [
        { id: 1, name: 'Competition 1', seasonId: 1 },
        { id: 2, name: 'Competition 2', seasonId: 2 }
      ];

      mockApiClient.getAllCompetitions = jest.fn().mockResolvedValue(mockCompetitions);

      competitionList.currentSeasonFilter = 1;
      await competitionList.loadCompetitions();

      expect(competitionList.filteredCompetitions).toEqual([mockCompetitions[0]]);
    });

    test('should handle empty active competitions list', async () => {
      mockApiClient.getAllCompetitions = jest.fn().mockResolvedValue([]);

      await competitionList.loadCompetitions();

      expect(mockApiClient.getAllCompetitions).toHaveBeenCalledWith({ finished: false });
      expect(competitionList.competitions).toEqual([]);
      expect(competitionList.filteredCompetitions).toEqual([]);
    });

    test('should wrap API errors', async () => {
      const apiError = new Error('Network error');
      mockApiClient.getAllCompetitions = jest.fn().mockRejectedValue(apiError);

      await expect(competitionList.loadCompetitions()).rejects.toThrow('Failed to load competitions');
    });
  });

  describe('filterBySeason', () => {
    beforeEach(() => {
      competitionList.competitions = [
        { id: 1, name: 'Competition 1', seasonId: 1 },
        { id: 2, name: 'Competition 2', seasonId: 2 },
        { id: 3, name: 'Competition 3', seasonId: 1 }
      ];
    });

    test('should filter competitions by season ID', () => {
      competitionList.filterBySeason(1);

      expect(competitionList.filteredCompetitions.length).toBe(2);
      expect(competitionList.filteredCompetitions[0].id).toBe(1);
      expect(competitionList.filteredCompetitions[1].id).toBe(3);
      expect(competitionList.currentSeasonFilter).toBe(1);
    });

    test('should show all competitions when filter is null', () => {
      competitionList.filterBySeason(null);

      expect(competitionList.filteredCompetitions.length).toBe(3);
      expect(competitionList.currentSeasonFilter).toBeNull();
    });

    test('should handle snake_case field names', () => {
      competitionList.competitions = [
        { id: 1, name: 'Competition 1', season_id: 1 },
        { id: 2, name: 'Competition 2', season_id: 2 }
      ];

      competitionList.filterBySeason(1);

      expect(competitionList.filteredCompetitions.length).toBe(1);
      expect(competitionList.filteredCompetitions[0].id).toBe(1);
    });

    test('should return empty array when no matches', () => {
      competitionList.filterBySeason(999);

      expect(competitionList.filteredCompetitions).toEqual([]);
    });
  });

  describe('createCompetition', () => {
    test('should create competition with valid data', async () => {
      const dto = {
        name: 'New Competition',
        date: '2024-03-15',
        type: 'singles',
        seasonId: 1,
        description: 'Test competition'
      };
      const mockCompetition = { id: 1, ...dto };

      mockApiClient.request.mockResolvedValue({ competition: mockCompetition });

      const result = await competitionList.createCompetition(dto);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(dto)
      });
      expect(result).toEqual(mockCompetition);
      expect(competitionList.competitions).toContain(mockCompetition);
    });

    test('should update filtered competitions after creation', async () => {
      const dto = {
        name: 'New Competition',
        date: '2024-03-15',
        type: 'singles',
        seasonId: 1
      };
      const mockCompetition = { id: 1, ...dto };

      mockApiClient.request.mockResolvedValue({ competition: mockCompetition });

      competitionList.currentSeasonFilter = 1;
      await competitionList.createCompetition(dto);

      expect(competitionList.filteredCompetitions).toContain(mockCompetition);
    });

    test('should wrap API errors', async () => {
      const dto = { name: 'Test', date: '2024-01-01', type: 'singles', seasonId: 1 };
      const apiError = new Error('Validation failed');
      apiError.code = 'VALIDATION_ERROR';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(competitionList.createCompetition(dto)).rejects.toThrow('Failed to create competition');
    });
  });

  describe('deleteCompetition', () => {
    beforeEach(() => {
      competitionList.competitions = [
        { id: 1, name: 'Competition 1', seasonId: 1 },
        { id: 2, name: 'Competition 2', seasonId: 2 }
      ];
      competitionList.filteredCompetitions = [...competitionList.competitions];
    });

    test('should delete competition from list', async () => {
      mockApiClient.request.mockResolvedValue({});

      await competitionList.deleteCompetition(1);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions/1', {
        method: 'DELETE'
      });
      expect(competitionList.competitions.length).toBe(1);
      expect(competitionList.competitions[0].id).toBe(2);
    });

    test('should remove from filtered competitions', async () => {
      mockApiClient.request.mockResolvedValue({});

      await competitionList.deleteCompetition(1);

      expect(competitionList.filteredCompetitions.length).toBe(1);
      expect(competitionList.filteredCompetitions[0].id).toBe(2);
    });

    test('should clear selection if deleted competition was selected', async () => {
      mockApiClient.request.mockResolvedValue({});
      competitionList.selectedCompetitionId = 1;

      await competitionList.deleteCompetition(1);

      expect(competitionList.selectedCompetitionId).toBeNull();
    });

    test('should wrap API errors', async () => {
      const apiError = new Error('Competition has results');
      apiError.code = 'HAS_RESULTS';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(competitionList.deleteCompetition(1)).rejects.toThrow('Failed to delete competition');
    });
  });

  describe('onCompetitionSelect', () => {
    test('should register selection callback', () => {
      const callback = jest.fn();
      competitionList.onCompetitionSelect(callback);

      expect(competitionList.selectionCallback).toBe(callback);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      competitionList.seasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25' },
        { id: 2, name: 'Season: Winter 25-Summer 26' }
      ];
      competitionList.filteredCompetitions = [
        { id: 1, name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: 1, resultCount: 10 },
        { id: 2, name: 'Competition 2', date: '2024-02-20', type: 'doubles', seasonId: 2, resultCount: 8 }
      ];
    });

    test('should render season filter dropdown', () => {
      competitionList.render();

      const dropdown = document.getElementById('season-filter-dropdown');
      expect(dropdown).toBeTruthy();
      expect(dropdown.options.length).toBe(3); // "All Seasons" + 2 seasons
      expect(dropdown.options[0].textContent).toBe('All Seasons');
    });

    test('should render new competition button', () => {
      competitionList.render();

      const button = document.querySelector('.btn-primary');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('New Competition');
    });

    test('should render competition items', () => {
      competitionList.render();

      const items = document.querySelectorAll('.competition-item');
      expect(items.length).toBe(2);
    });

    test('should display competition details', () => {
      competitionList.render();

      const firstItem = document.querySelector('.competition-item');
      expect(firstItem.textContent).toContain('Competition 1');
      expect(firstItem.textContent).toContain('15/01/2024');
      expect(firstItem.textContent).toContain('Singles');
      expect(firstItem.textContent).toContain('10 results');
    });

    test('should show empty state when no competitions', () => {
      competitionList.filteredCompetitions = [];
      competitionList.render();

      const emptyState = document.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toBe('No active competitions found');
    });

    test('should highlight selected competition', () => {
      competitionList.selectedCompetitionId = 1;
      competitionList.render();

      const selectedItem = document.querySelector('.competition-item.selected');
      expect(selectedItem).toBeTruthy();
      expect(selectedItem.dataset.competitionId).toBe('1');
    });

    test('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => competitionList.render()).not.toThrow();
    });
  });

  describe('formatDate', () => {
    test('should format YYYY-MM-DD to DD/MM/YYYY', () => {
      const result = competitionList.formatDate('2024-01-15');
      expect(result).toBe('15/01/2024');
    });

    test('should return DD/MM/YYYY unchanged', () => {
      const result = competitionList.formatDate('15/01/2024');
      expect(result).toBe('15/01/2024');
    });

    test('should handle empty string', () => {
      const result = competitionList.formatDate('');
      expect(result).toBe('');
    });

    test('should handle invalid format', () => {
      const result = competitionList.formatDate('invalid');
      expect(result).toBe('invalid');
    });
  });

  describe('Competition selection', () => {
    beforeEach(() => {
      competitionList.filteredCompetitions = [
        { id: 1, name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: 1 }
      ];
      competitionList.render();
    });

    test('should select competition on click', () => {
      const competition = competitionList.filteredCompetitions[0];
      const callback = jest.fn();
      competitionList.onCompetitionSelect(callback);

      const item = document.querySelector('.competition-info');
      item.click();

      expect(competitionList.selectedCompetitionId).toBe(1);
      expect(callback).toHaveBeenCalledWith(competition);
    });

    test('should dispatch competition-selected event', () => {
      const competition = competitionList.filteredCompetitions[0];
      const eventListener = jest.fn();
      document.addEventListener('competition-selected', eventListener);

      const item = document.querySelector('.competition-info');
      item.click();

      expect(eventListener).toHaveBeenCalled();
      expect(eventListener.mock.calls[0][0].detail).toEqual(competition);

      document.removeEventListener('competition-selected', eventListener);
    });
  });

  describe('Modal interactions', () => {
    beforeEach(() => {
      competitionList.seasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', isActive: true },
        { id: 2, name: 'Season: Winter 25-Summer 26', isActive: false }
      ];
      competitionList.render();
    });

    test('should show new competition modal on button click', () => {
      const newCompetitionBtn = document.querySelector('.btn-primary');
      newCompetitionBtn.click();

      const modal = document.querySelector('.modal');
      expect(modal).toBeTruthy();
      expect(modal.querySelector('h2').textContent).toBe('Create New Competition');
    });

    test('should render all form fields in modal', () => {
      competitionList.showNewCompetitionModal();

      expect(document.getElementById('new-competition-name-input')).toBeTruthy();
      expect(document.getElementById('new-competition-date-input')).toBeTruthy();
      expect(document.getElementById('new-competition-type-input')).toBeTruthy();
      expect(document.getElementById('new-competition-season-input')).toBeTruthy();
    });

    test('should pre-select active season in modal', () => {
      competitionList.showNewCompetitionModal();

      const seasonSelect = document.getElementById('new-competition-season-input');
      expect(seasonSelect.value).toBe('1');
    });

    test('should close modal on cancel button click', () => {
      competitionList.showNewCompetitionModal();

      const cancelBtn = document.querySelector('.modal-footer .btn-secondary');
      cancelBtn.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should close modal on overlay click', () => {
      competitionList.showNewCompetitionModal();

      const overlay = document.querySelector('.modal-overlay');
      overlay.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should not close modal on modal content click', () => {
      competitionList.showNewCompetitionModal();

      const modal = document.querySelector('.modal');
      modal.click();

      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should create competition on create button click with valid input', async () => {
      const mockCompetition = {
        id: 1,
        name: 'New Competition',
        date: '2024-03-15',
        type: 'singles',
        seasonId: 1,
        description: 'Test'
      };
      mockApiClient.request.mockResolvedValue({ competition: mockCompetition });

      competitionList.showNewCompetitionModal();

      document.getElementById('new-competition-name-input').value = 'New Competition';
      document.getElementById('new-competition-date-input').value = '2024-03-15';
      document.getElementById('new-competition-type-input').value = 'singles';
      document.getElementById('new-competition-season-input').value = '1';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should show error when name is missing', async () => {
      competitionList.showNewCompetitionModal();

      document.getElementById('new-competition-name-input').value = '';
      document.getElementById('new-competition-date-input').value = '2024-03-15';
      document.getElementById('new-competition-type-input').value = 'singles';
      document.getElementById('new-competition-season-input').value = '1';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should show error when date is missing', async () => {
      competitionList.showNewCompetitionModal();

      document.getElementById('new-competition-name-input').value = 'Test';
      document.getElementById('new-competition-date-input').value = '';
      document.getElementById('new-competition-type-input').value = 'singles';
      document.getElementById('new-competition-season-input').value = '1';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    test('should show error when season is not selected', async () => {
      competitionList.showNewCompetitionModal();

      document.getElementById('new-competition-name-input').value = 'Test';
      document.getElementById('new-competition-date-input').value = '2024-03-15';
      document.getElementById('new-competition-type-input').value = 'singles';
      document.getElementById('new-competition-season-input').value = '';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('Delete confirmation', () => {
    beforeEach(() => {
      competitionList.competitions = [
        { id: 1, name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: 1 }
      ];
      competitionList.filteredCompetitions = [...competitionList.competitions];
      competitionList.render();

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
        expect.stringContaining('Are you sure you want to delete "Competition 1"?')
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

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competitions/1', {
        method: 'DELETE'
      });
    });
  });

  describe('refresh', () => {
    test('should reload seasons and competitions', async () => {
      const mockSeasons = [{ id: 1, name: 'Season: Winter 25-Summer 26' }];
      const mockCompetitions = [{ id: 1, name: 'Competition 1', seasonId: 1 }];

      mockApiClient.request.mockResolvedValueOnce({ seasons: mockSeasons });
      mockApiClient.getAllCompetitions.mockResolvedValueOnce(mockCompetitions);

      await competitionList.refresh();

      expect(competitionList.seasons).toEqual(mockSeasons);
      expect(competitionList.competitions).toEqual(mockCompetitions);
    });

    test('should handle refresh errors gracefully', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      await expect(competitionList.refresh()).resolves.not.toThrow();
    });
  });

  describe('destroy', () => {
    test('should clean up event listeners and DOM', () => {
      competitionList.render();
      
      const dropdown = document.getElementById('season-filter-dropdown');
      expect(dropdown).toBeTruthy();

      competitionList.destroy();

      const container = document.getElementById('competition-list-container');
      expect(container.innerHTML).toBe('');
    });

    test('should close modal if open', () => {
      competitionList.seasons = [{ id: 1, name: 'Season: Winter 25-Summer 26' }];
      competitionList.showNewCompetitionModal();
      
      expect(document.querySelector('.modal-overlay')).toBeTruthy();

      competitionList.destroy();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });
  });

  describe('Notification system', () => {
    test('should show success notification', () => {
      competitionList.showSuccess('Operation successful');

      const notification = document.querySelector('.notification-success');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation successful');
    });

    test('should show error notification', () => {
      competitionList.showError('Operation failed');

      const notification = document.querySelector('.notification-error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation failed');
    });

    test('should auto-remove notification after timeout', (done) => {
      competitionList.showSuccess('Test message');

      const notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      setTimeout(() => {
        expect(document.querySelector('.notification')).toBeFalsy();
        done();
      }, 3500);
    }, 4000);
  });
});
