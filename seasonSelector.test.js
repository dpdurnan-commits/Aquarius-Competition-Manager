/**
 * Unit Tests for SeasonSelector
 * Tests CRUD operations, validation, and UI interactions
 */

import { SeasonSelector } from './seasonSelector.js';

describe('SeasonSelector', () => {
  let seasonSelector;
  let mockApiClient;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      request: jest.fn()
    };

    // Create instance
    seasonSelector = new SeasonSelector(mockApiClient);

    // Mock DOM
    document.body.innerHTML = '<div id="season-selector-container"></div>';
  });

  afterEach(() => {
    // Clean up
    if (seasonSelector) {
      seasonSelector.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty seasons array', () => {
      expect(seasonSelector.seasons).toEqual([]);
      expect(seasonSelector.activeSeason).toBeNull();
    });

    test('should load seasons on initialize', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', startYear: 24, isActive: true },
        { id: 2, name: 'Season: Winter 25-Summer 26', startYear: 25, isActive: false }
      ];

      mockApiClient.request.mockResolvedValue({ seasons: mockSeasons });

      await seasonSelector.initialize();

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons', {
        method: 'GET'
      });
      expect(seasonSelector.seasons).toEqual(mockSeasons);
      expect(seasonSelector.activeSeason).toEqual(mockSeasons[0]);
    });

    test('should throw error if initialization fails', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      await expect(seasonSelector.initialize()).rejects.toThrow();
    });
  });

  describe('loadSeasons', () => {
    test('should fetch and store seasons from API', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', startYear: 24, isActive: false },
        { id: 2, name: 'Season: Winter 25-Summer 26', startYear: 25, isActive: true }
      ];

      mockApiClient.request.mockResolvedValue({ seasons: mockSeasons });

      const result = await seasonSelector.loadSeasons();

      expect(result).toEqual(mockSeasons);
      expect(seasonSelector.seasons).toEqual(mockSeasons);
      expect(seasonSelector.activeSeason).toEqual(mockSeasons[1]);
    });

    test('should handle snake_case field names from API', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', start_year: 24, is_active: true }
      ];

      mockApiClient.request.mockResolvedValue({ seasons: mockSeasons });

      await seasonSelector.loadSeasons();

      expect(seasonSelector.activeSeason).toEqual(mockSeasons[0]);
    });

    test('should handle empty seasons array', async () => {
      mockApiClient.request.mockResolvedValue({ seasons: [] });

      const result = await seasonSelector.loadSeasons();

      expect(result).toEqual([]);
      expect(seasonSelector.activeSeason).toBeNull();
    });

    test('should wrap errors with descriptive message', async () => {
      const originalError = new Error('Network timeout');
      originalError.code = 'TIMEOUT';
      mockApiClient.request.mockRejectedValue(originalError);

      await expect(seasonSelector.loadSeasons()).rejects.toThrow('Failed to load seasons');
      
      try {
        await seasonSelector.loadSeasons();
      } catch (error) {
        expect(error.code).toBe('TIMEOUT');
        expect(error.originalError).toBe(originalError);
      }
    });
  });

  describe('createSeason', () => {
    test('should create season with valid format', async () => {
      const validName = 'Season: Winter 25-Summer 26';
      const mockSeason = { id: 1, name: validName, startYear: 25, isActive: false };

      mockApiClient.request.mockResolvedValue({ season: mockSeason });

      const result = await seasonSelector.createSeason(validName);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons', {
        method: 'POST',
        body: JSON.stringify({ name: validName })
      });
      expect(result).toEqual(mockSeason);
      expect(seasonSelector.seasons).toContain(mockSeason);
    });

    test('should reject invalid format', async () => {
      const invalidName = 'Invalid Format';

      await expect(seasonSelector.createSeason(invalidName)).rejects.toThrow('Invalid season format');
      
      try {
        await seasonSelector.createSeason(invalidName);
      } catch (error) {
        expect(error.code).toBe('INVALID_FORMAT');
      }

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    test('should sort seasons after creation', async () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 25-Summer 26', startYear: 25 },
        { id: 2, name: 'Season: Winter 27-Summer 28', startYear: 27 }
      ];

      const newSeason = { id: 3, name: 'Season: Winter 26-Summer 27', startYear: 26 };
      mockApiClient.request.mockResolvedValue({ season: newSeason });

      await seasonSelector.createSeason('Season: Winter 26-Summer 27');

      expect(seasonSelector.seasons[0].startYear).toBe(25);
      expect(seasonSelector.seasons[1].startYear).toBe(26);
      expect(seasonSelector.seasons[2].startYear).toBe(27);
    });

    test('should handle snake_case field names', async () => {
      const validName = 'Season: Winter 25-Summer 26';
      const mockSeason = { id: 1, name: validName, start_year: 25, is_active: false };

      mockApiClient.request.mockResolvedValue({ season: mockSeason });

      await seasonSelector.createSeason(validName);

      expect(seasonSelector.seasons).toContain(mockSeason);
    });

    test('should wrap API errors', async () => {
      const validName = 'Season: Winter 25-Summer 26';
      const apiError = new Error('Duplicate season name');
      apiError.code = 'DUPLICATE';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(seasonSelector.createSeason(validName)).rejects.toThrow('Failed to create season');
      
      try {
        await seasonSelector.createSeason(validName);
      } catch (error) {
        expect(error.code).toBe('DUPLICATE');
        expect(error.originalError).toBe(apiError);
      }
    });
  });

  describe('autoIncrementSeason', () => {
    test('should auto-increment from most recent season', async () => {
      const newSeason = { id: 2, name: 'Season: Winter 26-Summer 27', startYear: 26 };
      mockApiClient.request.mockResolvedValue({ season: newSeason });

      const result = await seasonSelector.autoIncrementSeason();

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons/auto-increment', {
        method: 'POST'
      });
      expect(result).toEqual(newSeason);
      expect(seasonSelector.seasons).toContain(newSeason);
    });

    test('should sort seasons after auto-increment', async () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 25-Summer 26', startYear: 25 }
      ];

      const newSeason = { id: 2, name: 'Season: Winter 26-Summer 27', startYear: 26 };
      mockApiClient.request.mockResolvedValue({ season: newSeason });

      await seasonSelector.autoIncrementSeason();

      expect(seasonSelector.seasons[0].startYear).toBe(25);
      expect(seasonSelector.seasons[1].startYear).toBe(26);
    });

    test('should wrap API errors', async () => {
      const apiError = new Error('No seasons exist');
      apiError.code = 'NO_SEASONS';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(seasonSelector.autoIncrementSeason()).rejects.toThrow('Failed to auto-increment season');
      
      try {
        await seasonSelector.autoIncrementSeason();
      } catch (error) {
        expect(error.code).toBe('NO_SEASONS');
        expect(error.originalError).toBe(apiError);
      }
    });
  });

  describe('setActiveSeason', () => {
    test('should set season as active and deactivate others', async () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', isActive: true },
        { id: 2, name: 'Season: Winter 25-Summer 26', isActive: false }
      ];

      const activatedSeason = { id: 2, name: 'Season: Winter 25-Summer 26', isActive: true };
      mockApiClient.request.mockResolvedValue({ season: activatedSeason });

      const result = await seasonSelector.setActiveSeason(2);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons/2/activate', {
        method: 'PUT'
      });
      expect(result).toEqual(activatedSeason);
      expect(seasonSelector.seasons[0].isActive).toBe(false);
      expect(seasonSelector.seasons[1].isActive).toBe(true);
      expect(seasonSelector.activeSeason).toEqual(activatedSeason);
    });

    test('should dispatch season-selected event', async () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 25-Summer 26', isActive: false }
      ];

      const activatedSeason = { id: 1, name: 'Season: Winter 25-Summer 26', isActive: true };
      mockApiClient.request.mockResolvedValue({ season: activatedSeason });

      const eventListener = jest.fn();
      document.addEventListener('season-selected', eventListener);

      await seasonSelector.setActiveSeason(1);

      expect(eventListener).toHaveBeenCalled();
      expect(eventListener.mock.calls[0][0].detail).toEqual(activatedSeason);

      document.removeEventListener('season-selected', eventListener);
    });

    test('should wrap API errors', async () => {
      const apiError = new Error('Season not found');
      apiError.code = 'NOT_FOUND';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(seasonSelector.setActiveSeason(999)).rejects.toThrow('Failed to set active season');
      
      try {
        await seasonSelector.setActiveSeason(999);
      } catch (error) {
        expect(error.code).toBe('NOT_FOUND');
        expect(error.originalError).toBe(apiError);
      }
    });
  });

  describe('validateSeasonFormat', () => {
    test('should accept valid format with equal years', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25-Summer 25')).toBe(true);
    });

    test('should accept valid format with winter < summer', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25-Summer 26')).toBe(true);
    });

    test('should reject format with winter > summer', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 26-Summer 25')).toBe(false);
    });

    test('should reject missing "Season:" prefix', () => {
      expect(seasonSelector.validateSeasonFormat('Winter 25-Summer 26')).toBe(false);
    });

    test('should reject missing "Winter" keyword', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Spring 25-Summer 26')).toBe(false);
    });

    test('should reject missing "Summer" keyword', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25-Autumn 26')).toBe(false);
    });

    test('should reject four-digit years', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 2025-Summer 2026')).toBe(false);
    });

    test('should reject single-digit years', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter 5-Summer 6')).toBe(false);
    });

    test('should reject extra spaces', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter  25-Summer 26')).toBe(false);
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25 -Summer 26')).toBe(false);
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25- Summer 26')).toBe(false);
    });

    test('should reject leading/trailing spaces', () => {
      expect(seasonSelector.validateSeasonFormat(' Season: Winter 25-Summer 26')).toBe(false);
      expect(seasonSelector.validateSeasonFormat('Season: Winter 25-Summer 26 ')).toBe(false);
    });

    test('should reject empty string', () => {
      expect(seasonSelector.validateSeasonFormat('')).toBe(false);
    });

    test('should reject non-numeric years', () => {
      expect(seasonSelector.validateSeasonFormat('Season: Winter AA-Summer BB')).toBe(false);
    });
  });

  describe('render', () => {
    test('should render season dropdown with seasons', () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', isActive: false },
        { id: 2, name: 'Season: Winter 25-Summer 26', isActive: true }
      ];

      seasonSelector.render();

      const dropdown = document.getElementById('season-dropdown');
      expect(dropdown).toBeTruthy();
      expect(dropdown.options.length).toBe(3); // Placeholder + 2 seasons
      expect(dropdown.options[1].textContent).toBe('Season: Winter 24-Summer 25');
      expect(dropdown.options[2].textContent).toContain('Season: Winter 25-Summer 26');
      expect(dropdown.options[2].textContent).toContain('★'); // Active badge
    });

    test('should render management buttons', () => {
      seasonSelector.render();

      const buttons = document.querySelectorAll('.season-controls button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('New Season');
      expect(buttons[1].textContent).toBe('Auto-Increment');
    });

    test('should disable auto-increment button when no seasons', () => {
      seasonSelector.seasons = [];
      seasonSelector.render();

      const autoIncrementBtn = document.querySelectorAll('.season-controls button')[1];
      expect(autoIncrementBtn.disabled).toBe(true);
    });

    test('should enable auto-increment button when seasons exist', () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 25-Summer 26', isActive: true }
      ];
      seasonSelector.render();

      const autoIncrementBtn = document.querySelectorAll('.season-controls button')[1];
      expect(autoIncrementBtn.disabled).toBe(false);
    });

    test('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => seasonSelector.render()).not.toThrow();
    });

    test('should select active season in dropdown', () => {
      seasonSelector.seasons = [
        { id: 1, name: 'Season: Winter 24-Summer 25', isActive: false },
        { id: 2, name: 'Season: Winter 25-Summer 26', isActive: true }
      ];
      seasonSelector.activeSeason = seasonSelector.seasons[1];

      seasonSelector.render();

      const dropdown = document.getElementById('season-dropdown');
      expect(dropdown.value).toBe('2');
    });
  });

  describe('refresh', () => {
    test('should reload seasons and re-render', async () => {
      const mockSeasons = [
        { id: 1, name: 'Season: Winter 25-Summer 26', isActive: true }
      ];
      mockApiClient.request.mockResolvedValue({ seasons: mockSeasons });

      await seasonSelector.refresh();

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/presentation-seasons', {
        method: 'GET'
      });
      expect(seasonSelector.seasons).toEqual(mockSeasons);
    });

    test('should handle refresh errors gracefully', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      await expect(seasonSelector.refresh()).resolves.not.toThrow();
    });
  });

  describe('destroy', () => {
    test('should clean up event listeners and DOM', () => {
      seasonSelector.render();
      
      const dropdown = document.getElementById('season-dropdown');
      expect(dropdown).toBeTruthy();

      seasonSelector.destroy();

      const container = document.getElementById('season-selector-container');
      expect(container.innerHTML).toBe('');
    });

    test('should close modal if open', () => {
      seasonSelector.showNewSeasonModal();
      
      expect(document.querySelector('.modal-overlay')).toBeTruthy();

      seasonSelector.destroy();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });
  });

  describe('Modal interactions', () => {
    test('should show new season modal on button click', () => {
      seasonSelector.render();

      const newSeasonBtn = document.querySelectorAll('.season-controls button')[0];
      newSeasonBtn.click();

      const modal = document.querySelector('.modal');
      expect(modal).toBeTruthy();
      expect(modal.querySelector('h3').textContent).toBe('Create New Season');
    });

    test('should close modal on cancel button click', () => {
      seasonSelector.showNewSeasonModal();

      const cancelBtn = document.querySelector('.modal-footer .btn-secondary');
      cancelBtn.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should close modal on overlay click', () => {
      seasonSelector.showNewSeasonModal();

      const overlay = document.querySelector('.modal-overlay');
      overlay.click();

      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should not close modal on modal content click', () => {
      seasonSelector.showNewSeasonModal();

      const modal = document.querySelector('.modal');
      modal.click();

      expect(document.querySelector('.modal-overlay')).toBeTruthy();
    });

    test('should create season on create button click with valid input', async () => {
      const mockSeason = { id: 1, name: 'Season: Winter 25-Summer 26', startYear: 25 };
      mockApiClient.request.mockResolvedValue({ season: mockSeason });

      seasonSelector.showNewSeasonModal();

      const input = document.getElementById('season-name-input');
      input.value = 'Season: Winter 25-Summer 26';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeFalsy();
    });

    test('should show error on create with invalid format', async () => {
      seasonSelector.showNewSeasonModal();

      const input = document.getElementById('season-name-input');
      input.value = 'Invalid Format';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
      expect(document.querySelector('.modal-overlay')).toBeTruthy(); // Modal stays open
    });

    test('should show error on create with empty input', async () => {
      seasonSelector.showNewSeasonModal();

      const input = document.getElementById('season-name-input');
      input.value = '   ';

      const createBtn = document.querySelector('.modal-footer .btn-primary');
      await createBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    test('should submit on Enter key press', async () => {
      const mockSeason = { id: 1, name: 'Season: Winter 25-Summer 26', startYear: 25 };
      mockApiClient.request.mockResolvedValue({ season: mockSeason });

      seasonSelector.showNewSeasonModal();

      const input = document.getElementById('season-name-input');
      input.value = 'Season: Winter 25-Summer 26';

      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalled();
    });
  });

  describe('Notification system', () => {
    test('should show success notification', () => {
      seasonSelector.showSuccess('Operation successful');

      const notification = document.querySelector('.notification-success');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation successful');
    });

    test('should show error notification', () => {
      seasonSelector.showError('Operation failed');

      const notification = document.querySelector('.notification-error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Operation failed');
    });

    test('should auto-remove notification after timeout', (done) => {
      seasonSelector.showSuccess('Test message');

      const notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      setTimeout(() => {
        expect(document.querySelector('.notification')).toBeFalsy();
        done();
      }, 3500);
    }, 4000);
  });
});
