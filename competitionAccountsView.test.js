/**
 * Unit tests for CompetitionAccountsView
 */

import { CompetitionAccountsView } from './competitionAccountsView.js';

describe('CompetitionAccountsView', () => {
  let mockApiClient;
  let mockTransactionalImporter;
  let view;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      getActiveSeason: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Season: Winter 25-Summer 26',
        isActive: true
      })
    };

    // Create mock transactional importer
    mockTransactionalImporter = {
      render: jest.fn(),
      initialize: jest.fn()
    };

    // Create view instance
    view = new CompetitionAccountsView(mockApiClient, mockTransactionalImporter);
  });

  afterEach(() => {
    // Clean up DOM
    if (view.container && view.container.parentNode) {
      view.container.parentNode.removeChild(view.container);
    }
  });

  describe('constructor', () => {
    test('should initialize with apiClient and transactionalImporter', () => {
      expect(view.apiClient).toBe(mockApiClient);
      expect(view.transactionalImporter).toBe(mockTransactionalImporter);
    });

    test('should initialize child components as null', () => {
      expect(view.seasonSelector).toBeNull();
      expect(view.competitionList).toBeNull();
      expect(view.resultsTable).toBeNull();
      expect(view.csvUploader).toBeNull();
    });

    test('should initialize state properties', () => {
      expect(view.selectedCompetition).toBeNull();
      expect(view.activeSeason).toBeNull();
    });

    test('should initialize DOM element references as null', () => {
      expect(view.container).toBeNull();
      expect(view.transactionalSection).toBeNull();
      expect(view.competitionSection).toBeNull();
    });
  });

  describe('initialize()', () => {
    test('should load active season', async () => {
      await view.initialize();

      expect(mockApiClient.getActiveSeason).toHaveBeenCalledTimes(1);
    });

    test('should not throw error if active season fails to load', async () => {
      mockApiClient.getActiveSeason.mockRejectedValue(new Error('API error'));

      await expect(view.initialize()).resolves.not.toThrow();
    });

    test('should log success message on successful initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await view.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('CompetitionAccountsView initialized successfully');

      consoleSpy.mockRestore();
    });

    test('should log error if initialization fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Initialization failed');
      
      // Mock loadActiveSeason to throw
      jest.spyOn(view, 'loadActiveSeason').mockRejectedValue(error);

      await expect(view.initialize()).rejects.toThrow('Initialization failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error initializing CompetitionAccountsView:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('render()', () => {
    test('should create main container element', () => {
      const container = view.render();

      expect(container).toBeDefined();
      expect(container.className).toBe('competition-accounts-view');
      expect(container.id).toBe('competition-accounts-view');
    });

    test('should render both sections', () => {
      view.render();

      expect(view.transactionalSection).not.toBeNull();
      expect(view.competitionSection).not.toBeNull();
    });

    test('should append both sections to container', () => {
      const container = view.render();

      expect(container.contains(view.transactionalSection)).toBe(true);
      expect(container.contains(view.competitionSection)).toBe(true);
    });

    test('should return the container element', () => {
      const container = view.render();

      expect(container).toBe(view.container);
    });
  });

  describe('renderTransactionalSection()', () => {
    test('should create transactional section element', () => {
      view.render();

      expect(view.transactionalSection).not.toBeNull();
      expect(view.transactionalSection.className).toBe('transactional-section');
      expect(view.transactionalSection.id).toBe('transactional-section');
    });

    test('should include section header', () => {
      view.render();

      const header = view.transactionalSection.querySelector('.section-header');
      expect(header).not.toBeNull();
      expect(header.querySelector('h2').textContent).toBe('Transactional CSV Importer');
    });

    test('should include transactional content container', () => {
      view.render();

      const content = view.transactionalSection.querySelector('.transactional-content');
      expect(content).not.toBeNull();
      expect(content.id).toBe('transactional-content');
    });
  });

  describe('renderCompetitionSection()', () => {
    test('should create competition section element', () => {
      view.render();

      expect(view.competitionSection).not.toBeNull();
      expect(view.competitionSection.className).toBe('competition-section');
      expect(view.competitionSection.id).toBe('competition-section');
    });

    test('should include section header', () => {
      view.render();

      const header = view.competitionSection.querySelector('.section-header');
      expect(header).not.toBeNull();
      expect(header.querySelector('h2').textContent).toBe('Competition Results Management');
    });

    test('should include season selector container', () => {
      view.render();

      const container = view.competitionSection.querySelector('.season-selector-container');
      expect(container).not.toBeNull();
      expect(container.id).toBe('season-selector-container');
    });

    test('should include competition list container', () => {
      view.render();

      const container = view.competitionSection.querySelector('.competition-list-container');
      expect(container).not.toBeNull();
      expect(container.id).toBe('competition-list-container');
    });

    test('should include results table container', () => {
      view.render();

      const container = view.competitionSection.querySelector('.results-table-container');
      expect(container).not.toBeNull();
      expect(container.id).toBe('results-table-container');
    });

    test('should include CSV uploader container', () => {
      view.render();

      const container = view.competitionSection.querySelector('.csv-uploader-container');
      expect(container).not.toBeNull();
      expect(container.id).toBe('csv-uploader-container');
    });
  });

  describe('setupEventListeners()', () => {
    test('should set up event listeners for component communication', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      view.setupEventListeners();

      expect(addEventListenerSpy).toHaveBeenCalledWith('season-selected', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('competition-selected', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('results-updated', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('csv-upload-complete', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('handleSeasonSelected()', () => {
    test('should update activeSeason state', () => {
      const season = { id: 2, name: 'Season: Winter 26-Summer 27' };

      view.handleSeasonSelected(season);

      expect(view.activeSeason).toBe(season);
    });

    test('should call competitionList.filterBySeason if competitionList exists', () => {
      const season = { id: 2, name: 'Season: Winter 26-Summer 27' };
      view.competitionList = {
        filterBySeason: jest.fn()
      };

      view.handleSeasonSelected(season);

      expect(view.competitionList.filterBySeason).toHaveBeenCalledWith(season.id);
    });

    test('should not throw error if competitionList is null', () => {
      const season = { id: 2, name: 'Season: Winter 26-Summer 27' };
      view.competitionList = null;

      expect(() => view.handleSeasonSelected(season)).not.toThrow();
    });
  });

  describe('handleCompetitionSelected()', () => {
    test('should update selectedCompetition state', () => {
      const competition = { id: 1, name: 'Weekly Medal', type: 'singles' };

      view.handleCompetitionSelected(competition);

      expect(view.selectedCompetition).toBe(competition);
    });

    test('should call resultsTable.loadResults if resultsTable exists', () => {
      const competition = { id: 1, name: 'Weekly Medal', type: 'singles' };
      view.resultsTable = {
        loadResults: jest.fn()
      };

      view.handleCompetitionSelected(competition);

      expect(view.resultsTable.loadResults).toHaveBeenCalledWith(competition.id);
    });

    test('should call csvUploader.setCompetition if csvUploader exists', () => {
      const competition = { id: 1, name: 'Weekly Medal', type: 'singles' };
      view.csvUploader = {
        setCompetition: jest.fn()
      };

      view.handleCompetitionSelected(competition);

      expect(view.csvUploader.setCompetition).toHaveBeenCalledWith(competition);
    });

    test('should not throw error if child components are null', () => {
      const competition = { id: 1, name: 'Weekly Medal', type: 'singles' };
      view.resultsTable = null;
      view.csvUploader = null;

      expect(() => view.handleCompetitionSelected(competition)).not.toThrow();
    });
  });

  describe('handleResultsUpdated()', () => {
    test('should call competitionList.refresh if competitionList exists', () => {
      view.competitionList = {
        refresh: jest.fn()
      };

      view.handleResultsUpdated();

      expect(view.competitionList.refresh).toHaveBeenCalledTimes(1);
    });

    test('should not throw error if competitionList is null', () => {
      view.competitionList = null;

      expect(() => view.handleResultsUpdated()).not.toThrow();
    });
  });

  describe('handleCsvUploadComplete()', () => {
    test('should reload results table if resultsTable and selectedCompetition exist', () => {
      const result = { count: 10, errors: [] };
      view.selectedCompetition = { id: 1, name: 'Weekly Medal' };
      view.resultsTable = {
        loadResults: jest.fn()
      };

      view.handleCsvUploadComplete(result);

      expect(view.resultsTable.loadResults).toHaveBeenCalledWith(1);
    });

    test('should call competitionList.refresh if competitionList exists', () => {
      const result = { count: 10, errors: [] };
      view.competitionList = {
        refresh: jest.fn()
      };

      view.handleCsvUploadComplete(result);

      expect(view.competitionList.refresh).toHaveBeenCalledTimes(1);
    });

    test('should not throw error if child components are null', () => {
      const result = { count: 10, errors: [] };
      view.resultsTable = null;
      view.competitionList = null;
      view.selectedCompetition = null;

      expect(() => view.handleCsvUploadComplete(result)).not.toThrow();
    });
  });

  describe('show()', () => {
    test('should set container display to block', () => {
      view.render();
      view.container.style.display = 'none';

      view.show();

      expect(view.container.style.display).toBe('block');
    });

    test('should not throw error if container is null', () => {
      view.container = null;

      expect(() => view.show()).not.toThrow();
    });
  });

  describe('hide()', () => {
    test('should set container display to none', () => {
      view.render();
      view.container.style.display = 'block';

      view.hide();

      expect(view.container.style.display).toBe('none');
    });

    test('should not throw error if container is null', () => {
      view.container = null;

      expect(() => view.hide()).not.toThrow();
    });
  });

  describe('refresh()', () => {
    test('should reload active season', async () => {
      await view.refresh();

      expect(mockApiClient.getActiveSeason).toHaveBeenCalled();
    });

    test('should refresh seasonSelector if it exists', async () => {
      view.seasonSelector = {
        refresh: jest.fn().mockResolvedValue(undefined)
      };

      await view.refresh();

      expect(view.seasonSelector.refresh).toHaveBeenCalledTimes(1);
    });

    test('should refresh competitionList if it exists', async () => {
      view.competitionList = {
        refresh: jest.fn().mockResolvedValue(undefined)
      };

      await view.refresh();

      expect(view.competitionList.refresh).toHaveBeenCalledTimes(1);
    });

    test('should reload results table if resultsTable and selectedCompetition exist', async () => {
      view.selectedCompetition = { id: 1, name: 'Weekly Medal' };
      view.resultsTable = {
        loadResults: jest.fn().mockResolvedValue(undefined)
      };

      await view.refresh();

      expect(view.resultsTable.loadResults).toHaveBeenCalledWith(1);
    });

    test('should not throw error if child components are null', async () => {
      view.seasonSelector = null;
      view.competitionList = null;
      view.resultsTable = null;
      view.selectedCompetition = null;

      await expect(view.refresh()).resolves.not.toThrow();
    });

    test('should log error if refresh fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Refresh failed');
      mockApiClient.getActiveSeason.mockRejectedValue(error);

      await view.refresh();

      expect(consoleSpy).toHaveBeenCalledWith('Error refreshing CompetitionAccountsView:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('destroy()', () => {
    test('should remove event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      view.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('season-selected', view.handleSeasonSelected);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('competition-selected', view.handleCompetitionSelected);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('results-updated', view.handleResultsUpdated);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('csv-upload-complete', view.handleCsvUploadComplete);

      removeEventListenerSpy.mockRestore();
    });

    test('should call destroy on child components if they exist', () => {
      view.seasonSelector = { destroy: jest.fn() };
      view.competitionList = { destroy: jest.fn() };
      view.resultsTable = { destroy: jest.fn() };
      view.csvUploader = { destroy: jest.fn() };

      view.destroy();

      expect(view.seasonSelector.destroy).toHaveBeenCalledTimes(1);
      expect(view.competitionList.destroy).toHaveBeenCalledTimes(1);
      expect(view.resultsTable.destroy).toHaveBeenCalledTimes(1);
      expect(view.csvUploader.destroy).toHaveBeenCalledTimes(1);
    });

    test('should not throw error if child components do not have destroy method', () => {
      view.seasonSelector = {};
      view.competitionList = {};
      view.resultsTable = {};
      view.csvUploader = {};

      expect(() => view.destroy()).not.toThrow();
    });

    test('should remove container from DOM if it has a parent', () => {
      view.render();
      document.body.appendChild(view.container);

      expect(document.body.contains(view.container)).toBe(true);

      view.destroy();

      expect(document.body.contains(view.container)).toBe(false);
    });

    test('should not throw error if container has no parent', () => {
      view.render();

      expect(() => view.destroy()).not.toThrow();
    });
  });

  describe('Integration: Event communication', () => {
    test('should handle season-selected event', async () => {
      await view.initialize();
      view.competitionList = {
        filterBySeason: jest.fn()
      };

      const season = { id: 2, name: 'Season: Winter 26-Summer 27' };
      const event = new CustomEvent('season-selected', { detail: season });

      document.dispatchEvent(event);

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(view.activeSeason).toBe(season);
      expect(view.competitionList.filterBySeason).toHaveBeenCalledWith(season.id);
    });

    test('should handle competition-selected event', async () => {
      await view.initialize();
      view.resultsTable = {
        loadResults: jest.fn()
      };
      view.csvUploader = {
        setCompetition: jest.fn()
      };

      const competition = { id: 1, name: 'Weekly Medal', type: 'singles' };
      const event = new CustomEvent('competition-selected', { detail: competition });

      document.dispatchEvent(event);

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(view.selectedCompetition).toBe(competition);
      expect(view.resultsTable.loadResults).toHaveBeenCalledWith(competition.id);
      expect(view.csvUploader.setCompetition).toHaveBeenCalledWith(competition);
    });

    test('should handle results-updated event', async () => {
      await view.initialize();
      view.competitionList = {
        refresh: jest.fn()
      };

      const event = new CustomEvent('results-updated');

      document.dispatchEvent(event);

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(view.competitionList.refresh).toHaveBeenCalledTimes(1);
    });

    test('should handle csv-upload-complete event', async () => {
      await view.initialize();
      view.selectedCompetition = { id: 1, name: 'Weekly Medal' };
      view.resultsTable = {
        loadResults: jest.fn()
      };
      view.competitionList = {
        refresh: jest.fn()
      };

      const result = { count: 10, errors: [] };
      const event = new CustomEvent('csv-upload-complete', { detail: result });

      document.dispatchEvent(event);

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(view.resultsTable.loadResults).toHaveBeenCalledWith(1);
      expect(view.competitionList.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    test('should handle API errors gracefully during initialization', async () => {
      mockApiClient.getActiveSeason.mockRejectedValue(new Error('API error'));

      await expect(view.initialize()).resolves.not.toThrow();
      expect(view.activeSeason).toBeNull();
    });

    test('should handle missing child components gracefully', () => {
      view.seasonSelector = null;
      view.competitionList = null;
      view.resultsTable = null;
      view.csvUploader = null;

      expect(() => view.handleSeasonSelected({ id: 1 })).not.toThrow();
      expect(() => view.handleCompetitionSelected({ id: 1 })).not.toThrow();
      expect(() => view.handleResultsUpdated()).not.toThrow();
      expect(() => view.handleCsvUploadComplete({})).not.toThrow();
    });
  });
});
