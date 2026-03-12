/**
 * Unit tests for PresentationNightView component
 */

import { PresentationNightView } from './presentationNightView.js';
import { WinnersTable } from './winnersTable.js';
import { DistributionSummary } from './distributionSummary.js';
import { CompetitionCostsManager } from './competitionCostsManager.js';

// Mock child components
jest.mock('./winnersTable.js');
jest.mock('./distributionSummary.js');
jest.mock('./competitionCostsManager.js');

describe('PresentationNightView', () => {
  let view;
  let mockApiClient;
  let container;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      getAllPresentationSeasons: jest.fn(),
      getSeasonWinners: jest.fn(),
      getDistributionBySeason: jest.fn(),
      createDistribution: jest.fn()
    };

    // Create container element
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Clear mock implementations
    WinnersTable.mockClear();
    DistributionSummary.mockClear();
    CompetitionCostsManager.mockClear();

    // Setup mock instances
    WinnersTable.mockImplementation(() => ({
      render: jest.fn(),
      getAssignments: jest.fn(() => []),
      validateAssignments: jest.fn(() => ({ valid: true, warning: '' })),
      validateAllInputs: jest.fn(() => true),
      destroy: jest.fn()
    }));

    DistributionSummary.mockImplementation(() => ({
      render: jest.fn(),
      updateTotals: jest.fn(),
      destroy: jest.fn()
    }));

    CompetitionCostsManager.mockImplementation(() => ({
      render: jest.fn(),
      destroy: jest.fn()
    }));
  });

  afterEach(() => {
    if (view) {
      view.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('constructor()', () => {
    test('should throw error if apiClient is not provided', () => {
      expect(() => new PresentationNightView()).toThrow('API client is required');
    });

    test('should create child components', () => {
      view = new PresentationNightView(mockApiClient);
      
      expect(WinnersTable).toHaveBeenCalledWith(mockApiClient);
      expect(DistributionSummary).toHaveBeenCalled();
      expect(CompetitionCostsManager).toHaveBeenCalledWith(mockApiClient);
    });

    test('should initialize with null state', () => {
      view = new PresentationNightView(mockApiClient);
      
      expect(view.selectedSeasonId).toBeNull();
      expect(view.existingDistribution).toBeNull();
      expect(view.container).toBeNull();
    });
  });

  describe('initialize()', () => {
    test('should throw error if container not found', () => {
      view = new PresentationNightView(mockApiClient);
      
      expect(() => view.initialize('non-existent-container')).toThrow('Container element with ID "non-existent-container" not found');
    });

    test('should set container and render view', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      expect(view.container).toBe(container);
      expect(container.innerHTML).not.toBe('');
    });

    test('should create season selection dropdown', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      const select = container.querySelector('#season-select');
      expect(select).toBeTruthy();
    });

    test('should create distribution section (hidden initially)', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      const section = container.querySelector('#distribution-section');
      expect(section).toBeTruthy();
      expect(section.style.display).toBe('none');
    });

    test('should create confirm distribution button', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      const button = container.querySelector('#confirm-distribution-btn');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Confirm Distribution');
    });
  });

  describe('loadSeasons()', () => {
    test('should fetch seasons from API', async () => {
      const mockSeasons = [
        { id: 1, start_year: 2023, end_year: 2024 },
        { id: 2, start_year: 2024, end_year: 2025 }
      ];
      
      mockApiClient.getAllPresentationSeasons.mockResolvedValue(mockSeasons);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockApiClient.getAllPresentationSeasons).toHaveBeenCalled();
    });

    test('should populate season dropdown with options', async () => {
      const mockSeasons = [
        { id: 1, start_year: 2023, end_year: 2024 },
        { id: 2, start_year: 2024, end_year: 2025 }
      ];
      
      mockApiClient.getAllPresentationSeasons.mockResolvedValue(mockSeasons);
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const select = container.querySelector('#season-select');
      expect(select.options.length).toBe(3); // Default + 2 seasons
      expect(select.options[1].value).toBe('1');
      expect(select.options[1].textContent).toBe('2023 - 2024');
    });

    test('should handle API errors gracefully', async () => {
      mockApiClient.getAllPresentationSeasons.mockRejectedValue(new Error('API Error'));
      global.alert = jest.fn();
      
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
    });
  });

  describe('loadSeasonWinners()', () => {
    beforeEach(() => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
    });

    test('should fetch winners and distribution from API', async () => {
      const mockWinners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.loadSeasonWinners(1);
      
      expect(mockApiClient.getSeasonWinners).toHaveBeenCalledWith(1);
      expect(mockApiClient.getDistributionBySeason).toHaveBeenCalledWith(1);
    });

    test('should render winners table with fetched data', async () => {
      const mockWinners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.loadSeasonWinners(1);
      
      expect(view.winnersTable.render).toHaveBeenCalledWith(
        'winners-table-container',
        mockWinners,
        false,
        null
      );
    });

    test('should render in read-only mode if distribution exists', async () => {
      const mockWinners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];
      
      const mockDistribution = {
        id: 1,
        seasonId: 1,
        totalAmount: 100.00,
        is_voided: false,
        assignments: [
          { competitionId: 1, amount: 100.00 }
        ]
      };
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(mockDistribution);
      
      await view.loadSeasonWinners(1);
      
      expect(view.winnersTable.render).toHaveBeenCalledWith(
        'winners-table-container',
        mockWinners,
        true,
        mockDistribution.assignments
      );
    });

    test('should show distribution status if distribution exists', async () => {
      const mockWinners = [];
      const mockDistribution = {
        id: 1,
        seasonId: 1,
        totalAmount: 100.00,
        is_voided: false,
        assignments: []
      };
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(mockDistribution);
      
      await view.loadSeasonWinners(1);
      
      const statusDiv = container.querySelector('#distribution-status');
      expect(statusDiv.style.display).toBe('block');
      expect(statusDiv.textContent).toContain('already has a confirmed distribution');
    });

    test('should hide confirm button if distribution exists', async () => {
      const mockWinners = [];
      const mockDistribution = {
        id: 1,
        seasonId: 1,
        totalAmount: 100.00,
        is_voided: false,
        assignments: []
      };
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(mockDistribution);
      
      await view.loadSeasonWinners(1);
      
      const actionsDiv = container.querySelector('#distribution-actions');
      expect(actionsDiv.style.display).toBe('none');
    });

    test('should show confirm button if no distribution exists', async () => {
      const mockWinners = [];
      
      mockApiClient.getSeasonWinners.mockResolvedValue(mockWinners);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.loadSeasonWinners(1);
      
      const actionsDiv = container.querySelector('#distribution-actions');
      expect(actionsDiv.style.display).toBe('block');
    });

    test('should handle API errors', async () => {
      mockApiClient.getSeasonWinners.mockRejectedValue(new Error('API Error'));
      global.alert = jest.fn();
      
      await view.loadSeasonWinners(1);
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
    });
  });

  describe('handleConfirmDistribution()', () => {
    beforeEach(() => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      view.selectedSeasonId = 1;
    });

    test('should validate input fields before proceeding', async () => {
      view.winnersTable.validateAllInputs.mockReturnValue(false);
      global.alert = jest.fn();
      
      await view.handleConfirmDistribution();
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('fix invalid amounts'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should show error if no assignments', async () => {
      view.winnersTable.getAssignments.mockReturnValue([]);
      global.alert = jest.fn();
      
      await view.handleConfirmDistribution();
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No winnings have been assigned'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should show warning if assignments incomplete', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      view.winnersTable.validateAssignments.mockReturnValue({
        valid: false,
        warning: 'Some competitions have no assigned amounts'
      });
      global.confirm = jest.fn(() => false);
      
      await view.handleConfirmDistribution();
      
      expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Some competitions'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should prompt for transaction date', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      global.prompt = jest.fn(() => null);
      
      await view.handleConfirmDistribution();
      
      expect(global.prompt).toHaveBeenCalledWith(expect.stringContaining('transaction date'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should validate date format', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      global.prompt = jest.fn(() => 'invalid-date');
      global.alert = jest.fn();
      
      await view.handleConfirmDistribution();
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Invalid date format'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should show confirmation dialog with total amount', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 },
        { competitionId: 2, amount: 30.00 }
      ]);
      global.prompt = jest.fn(() => '2024-01-15');
      global.confirm = jest.fn(() => false);
      
      await view.handleConfirmDistribution();
      
      expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('£80.00'));
      expect(mockApiClient.createDistribution).not.toHaveBeenCalled();
    });

    test('should call API to create distribution with valid data', async () => {
      const assignments = [
        { competitionId: 1, amount: 50.00 },
        { competitionId: 2, amount: 30.00 }
      ];
      
      view.winnersTable.getAssignments.mockReturnValue(assignments);
      global.prompt = jest.fn(() => '2024-01-15');
      global.confirm = jest.fn(() => true);
      global.alert = jest.fn();
      
      mockApiClient.createDistribution.mockResolvedValue({ id: 1 });
      mockApiClient.getSeasonWinners.mockResolvedValue([]);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.handleConfirmDistribution();
      
      expect(mockApiClient.createDistribution).toHaveBeenCalledWith({
        seasonId: 1,
        assignments: assignments,
        transactionDate: '2024-01-15'
      });
    });

    test('should show success message after creating distribution', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      global.prompt = jest.fn(() => '2024-01-15');
      global.confirm = jest.fn(() => true);
      global.alert = jest.fn();
      
      mockApiClient.createDistribution.mockResolvedValue({ id: 1 });
      mockApiClient.getSeasonWinners.mockResolvedValue([]);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.handleConfirmDistribution();
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    test('should refresh view after successful creation', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      global.prompt = jest.fn(() => '2024-01-15');
      global.confirm = jest.fn(() => true);
      global.alert = jest.fn();
      
      mockApiClient.createDistribution.mockResolvedValue({ id: 1 });
      mockApiClient.getSeasonWinners.mockResolvedValue([]);
      mockApiClient.getDistributionBySeason.mockResolvedValue(null);
      
      await view.handleConfirmDistribution();
      
      expect(mockApiClient.getSeasonWinners).toHaveBeenCalledWith(1);
    });

    test('should handle API errors', async () => {
      view.winnersTable.getAssignments.mockReturnValue([
        { competitionId: 1, amount: 50.00 }
      ]);
      global.prompt = jest.fn(() => '2024-01-15');
      global.confirm = jest.fn(() => true);
      global.alert = jest.fn();
      
      mockApiClient.createDistribution.mockRejectedValue(new Error('API Error'));
      
      await view.handleConfirmDistribution();
      
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('destroy()', () => {
    test('should destroy child components', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      view.destroy();
      
      expect(view.winnersTable.destroy).toHaveBeenCalled();
      expect(view.distributionSummary.destroy).toHaveBeenCalled();
      expect(view.competitionCostsManager.destroy).toHaveBeenCalled();
    });

    test('should clear container', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      
      view.destroy();
      
      expect(container.innerHTML).toBe('');
    });

    test('should reset state', () => {
      mockApiClient.getAllPresentationSeasons.mockResolvedValue([]);
      view = new PresentationNightView(mockApiClient);
      view.initialize('test-container');
      view.selectedSeasonId = 1;
      view.existingDistribution = { id: 1 };
      
      view.destroy();
      
      expect(view.selectedSeasonId).toBeNull();
      expect(view.existingDistribution).toBeNull();
    });
  });
});
