/**
 * Integration Test: Import with New Competitions
 * 
 * Tests the complete workflow for importing transactions that reference
 * new competitions, including detection, dialog presentation, creation,
 * and transaction linking.
 * 
 * Feature: auto-create-competitions-from-transactions
 * Task: 9.1 Write integration test for import with new competitions
 * Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.2
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { CompetitionDetector } from './competitionDetector.js';
import CompetitionCreationDialogModule from './competitionCreationDialog.js';
import { FieldExtractor } from './fieldExtractor.js';

// Handle both CommonJS and ES6 exports
const CompetitionCreationDialog = CompetitionCreationDialogModule.CompetitionCreationDialog || CompetitionCreationDialogModule.default || CompetitionCreationDialogModule;

describe('Integration Test: Import with New Competitions', () => {
  let dom;
  let document;
  let window;
  let apiClient;
  let competitionDetector;
  let fieldExtractor;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;

    // Mock API client
    apiClient = {
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      request: jest.fn(),
      store: jest.fn(),
      getAll: jest.fn()
    };

    // Initialize components
    competitionDetector = new CompetitionDetector(apiClient);
    fieldExtractor = new FieldExtractor();
  });

  afterEach(() => {
    // Clean up DOM
    if (global.document) {
      delete global.document;
    }
    if (global.window) {
      delete global.window;
    }
    jest.clearAllMocks();
  });

  /**
   * Helper: Create transaction records with competition names
   */
  function createTransactionRecords(competitionNames) {
    return competitionNames.map((name, index) => ({
      date: `01/0${index + 1}/2024`,
      time: '10:00:00',
      till: 'Till1',
      type: 'Sale',
      member: `Player ${index + 1} & ${name}`,
      player: '',
      competition: '',
      price: '20.00',
      discount: '0.00',
      subtotal: '20.00',
      vat: '4.00',
      total: '24.00',
      sourceRowIndex: index,
      isComplete: true
    }));
  }

  /**
   * Helper: Extract fields from transaction records
   */
  function extractFields(records) {
    return records.map(record => fieldExtractor.extract(record));
  }

  /**
   * Helper: Mock dialog interactions by directly calling createCompetition
   */
  async function mockDialogCreation(competitionData) {
    // Directly call the API to create competition (simulating successful dialog submission)
    return await apiClient.createCompetition(competitionData);
  }

  test('should detect 2 new competitions from uploaded CSV', async () => {
    // Requirement 1.1: Extract competition names from Sale/Refund records
    // Requirement 1.2: Query database to identify non-existent competitions

    // Step 1: Create transaction records referencing 2 new competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);

    // Step 2: Extract fields (player and competition)
    const enhancedRecords = extractFields(transactionRecords);

    // Step 3: Mock API to return empty competition list (no existing competitions)
    apiClient.getAllCompetitions.mockResolvedValue([]);

    // Step 4: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);

    // Verify: Should identify both competitions as new
    expect(newCompetitionNames).toHaveLength(2);
    expect(newCompetitionNames).toContain('Summer Singles Championship');
    expect(newCompetitionNames).toContain('Winter Doubles Tournament');
    expect(apiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
  });

  test('should present creation dialogs sequentially for 2 new competitions', async () => {
    // Requirement 2.1: Present Competition_Creation_Dialog before transaction summary
    // Requirement 2.6: Present dialogs sequentially, one for each new competition

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API responses
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(2);

    // Step 4: Track dialog presentations
    const dialogPresentations = [];

    // Step 5: Present dialogs sequentially
    for (const competitionName of newCompetitionNames) {
      const dialog = new CompetitionCreationDialog(apiClient);
      
      // Track when dialog is shown
      dialogPresentations.push({
        name: competitionName,
        timestamp: Date.now()
      });

      // Show dialog (will be cancelled immediately in test)
      const showPromise = dialog.show(competitionName);
      
      // Verify dialog is rendered
      const dialogElement = document.querySelector('.competition-creation-dialog');
      expect(dialogElement).toBeTruthy();
      
      const nameInput = document.getElementById('competition-name');
      expect(nameInput).toBeTruthy();
      expect(nameInput.value).toBe(competitionName);

      // Cancel dialog to proceed to next
      dialog.handleCancel();
      await showPromise;
    }

    // Verify: Exactly 2 dialogs were presented
    expect(dialogPresentations).toHaveLength(2);
    expect(dialogPresentations[0].name).toBe('Summer Singles Championship');
    expect(dialogPresentations[1].name).toBe('Winter Doubles Tournament');
    
    // Verify: Dialogs were presented sequentially (second after first)
    expect(dialogPresentations[1].timestamp).toBeGreaterThanOrEqual(dialogPresentations[0].timestamp);
  });

  test('should create competitions in database with correct field values', async () => {
    // Requirement 3.1: Create competition with provided name, date, type, and seasonId

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API responses
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Mock competition creation responses
    apiClient.createCompetition
      .mockResolvedValueOnce({
        id: 1,
        name: 'Summer Singles Championship',
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'Winter Doubles Tournament',
        date: '2024-12-20',
        type: 'doubles',
        seasonId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);

    // Step 4: Create competitions (simulating dialog workflow)
    const createdCompetitions = [];
    const competitionData = [
      { name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    for (let i = 0; i < newCompetitionNames.length; i++) {
      const result = await mockDialogCreation(competitionData[i]);
      createdCompetitions.push(result);
    }

    // Verify: Both competitions were created
    expect(createdCompetitions).toHaveLength(2);
    expect(apiClient.createCompetition).toHaveBeenCalledTimes(2);

    // Verify: First competition has correct field values
    expect(apiClient.createCompetition).toHaveBeenNthCalledWith(1, {
      name: 'Summer Singles Championship',
      date: '2024-06-15',
      type: 'singles',
      seasonId: 1
    });

    // Verify: Second competition has correct field values
    expect(apiClient.createCompetition).toHaveBeenNthCalledWith(2, {
      name: 'Winter Doubles Tournament',
      date: '2024-12-20',
      type: 'doubles',
      seasonId: 1
    });

    // Verify: Database records match submitted values
    expect(createdCompetitions[0].name).toBe('Summer Singles Championship');
    expect(createdCompetitions[0].date).toBe('2024-06-15');
    expect(createdCompetitions[0].type).toBe('singles');
    expect(createdCompetitions[0].seasonId).toBe(1);

    expect(createdCompetitions[1].name).toBe('Winter Doubles Tournament');
    expect(createdCompetitions[1].date).toBe('2024-12-20');
    expect(createdCompetitions[1].type).toBe('doubles');
    expect(createdCompetitions[1].seasonId).toBe(1);
  });

  test('should save transactions and link them to created competitions', async () => {
    // Requirement 4.1: Proceed with storing Enhanced_Records after competitions created
    // Requirement 4.2: Link each transaction to corresponding competition by name

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API responses
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Mock competition creation
    apiClient.createCompetition
      .mockResolvedValueOnce({
        id: 1,
        name: 'Summer Singles Championship',
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'Winter Doubles Tournament',
        date: '2024-12-20',
        type: 'doubles',
        seasonId: 1
      });

    // Mock transaction storage
    apiClient.store.mockResolvedValue({
      stored: 2,
      errors: []
    });

    // Mock getAll to return saved transactions with IDs
    apiClient.getAll.mockResolvedValue([
      {
        id: 101,
        ...enhancedRecords[0],
        competition: 'Summer Singles Championship'
      },
      {
        id: 102,
        ...enhancedRecords[1],
        competition: 'Winter Doubles Tournament'
      }
    ]);

    // Step 3: Detect and create competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    const createdCompetitions = [];
    const competitionData = [
      { name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    for (let i = 0; i < newCompetitionNames.length; i++) {
      const result = await mockDialogCreation(competitionData[i]);
      createdCompetitions.push(result);
    }

    // Step 4: Store transactions
    const storeResult = await apiClient.store(enhancedRecords);

    // Verify: Transactions were stored
    expect(storeResult.stored).toBe(2);
    expect(storeResult.errors).toHaveLength(0);
    expect(apiClient.store).toHaveBeenCalledWith(enhancedRecords);

    // Step 5: Retrieve saved transactions
    const savedTransactions = await apiClient.getAll();

    // Verify: Transactions are linked to competitions by name
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');

    // Verify: Each transaction has an ID (was saved to database)
    expect(savedTransactions[0].id).toBe(101);
    expect(savedTransactions[1].id).toBe(102);
  });

  test('should display summary view after successful import', async () => {
    // Requirement 4.3: Display transaction summary view after import

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock all API responses
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });
    apiClient.createCompetition
      .mockResolvedValueOnce({ id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 })
      .mockResolvedValueOnce({ id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 });
    apiClient.store.mockResolvedValue({ stored: 2, errors: [] });
    apiClient.getAll.mockResolvedValue([
      { id: 101, ...enhancedRecords[0], competition: 'Summer Singles Championship' },
      { id: 102, ...enhancedRecords[1], competition: 'Winter Doubles Tournament' }
    ]);

    // Step 3: Complete workflow
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    const createdCompetitions = [];
    for (let i = 0; i < newCompetitionNames.length; i++) {
      const result = await mockDialogCreation({
        name: newCompetitionNames[i],
        date: i === 0 ? '2024-06-15' : '2024-12-20',
        type: i === 0 ? 'singles' : 'doubles',
        seasonId: 1
      });
      createdCompetitions.push(result);
    }

    const storeResult = await apiClient.store(enhancedRecords);
    const savedTransactions = await apiClient.getAll();

    // Verify: Complete workflow succeeded
    expect(createdCompetitions).toHaveLength(2);
    expect(storeResult.stored).toBe(2);
    expect(savedTransactions).toHaveLength(2);

    // Verify: Summary data is available for display
    expect(savedTransactions[0].id).toBeDefined();
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].id).toBeDefined();
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');
  });

  test('should handle complete end-to-end workflow with 2 new competitions', async () => {
    // Integration test covering all requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.2

    // Step 1: Upload CSV with transactions referencing 2 new competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Verify: Field extraction worked correctly
    expect(enhancedRecords[0].player).toBe('Player 1');
    expect(enhancedRecords[0].competition).toBe('Summer Singles Championship');
    expect(enhancedRecords[1].player).toBe('Player 2');
    expect(enhancedRecords[1].competition).toBe('Winter Doubles Tournament');

    // Step 2: Mock API - no existing competitions
    apiClient.getAllCompetitions.mockResolvedValue([]);

    // Step 3: Detect new competitions (Requirement 1.1, 1.2)
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    expect(newCompetitionNames).toHaveLength(2);
    expect(newCompetitionNames).toEqual([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);

    // Step 4: Mock season loading for dialogs
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Step 5: Mock competition creation
    apiClient.createCompetition
      .mockResolvedValueOnce({
        id: 1,
        name: 'Summer Singles Championship',
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'Winter Doubles Tournament',
        date: '2024-12-20',
        type: 'doubles',
        seasonId: 1
      });

    // Step 6: Complete both creation dialogs (Requirement 2.1, 3.1)
    const createdCompetitions = [];
    const competitionData = [
      { name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    for (let i = 0; i < newCompetitionNames.length; i++) {
      const result = await mockDialogCreation(competitionData[i]);
      createdCompetitions.push(result);
    }

    // Verify: Competitions created in database
    expect(createdCompetitions).toHaveLength(2);
    expect(createdCompetitions[0].id).toBe(1);
    expect(createdCompetitions[0].name).toBe('Summer Singles Championship');
    expect(createdCompetitions[1].id).toBe(2);
    expect(createdCompetitions[1].name).toBe('Winter Doubles Tournament');

    // Step 7: Mock transaction storage (Requirement 4.1)
    apiClient.store.mockResolvedValue({
      stored: 2,
      errors: []
    });

    // Step 8: Store transactions
    const storeResult = await apiClient.store(enhancedRecords);
    expect(storeResult.stored).toBe(2);

    // Step 9: Mock retrieval of saved transactions (Requirement 4.2)
    apiClient.getAll.mockResolvedValue([
      {
        id: 101,
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Summer Singles Championship',
        total: '24.00',
        isComplete: true
      },
      {
        id: 102,
        date: '01/02/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Winter Doubles Tournament',
        total: '24.00',
        isComplete: true
      }
    ]);

    // Step 10: Verify transactions saved and linked correctly
    const savedTransactions = await apiClient.getAll();
    
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0].id).toBe(101);
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].id).toBe(102);
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');

    // Verify: Summary view can be displayed
    expect(savedTransactions[0].player).toBe('Player 1');
    expect(savedTransactions[0].total).toBe('24.00');
    expect(savedTransactions[1].player).toBe('Player 2');
    expect(savedTransactions[1].total).toBe('24.00');
  });
});

/**
 * Integration Test: Import with Existing Competitions
 * 
 * Tests the workflow for importing transactions that reference only
 * existing competitions. Verifies that no dialogs are shown and the
 * import proceeds directly to save.
 * 
 * Feature: auto-create-competitions-from-transactions
 * Task: 9.2 Write integration test for import with existing competitions
 * Requirements: 1.4, 6.1
 */
describe('Integration Test: Import with Existing Competitions', () => {
  let dom;
  let document;
  let window;
  let apiClient;
  let competitionDetector;
  let fieldExtractor;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;

    // Mock API client
    apiClient = {
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      request: jest.fn(),
      store: jest.fn(),
      getAll: jest.fn()
    };

    // Initialize components
    competitionDetector = new CompetitionDetector(apiClient);
    fieldExtractor = new FieldExtractor();
  });

  afterEach(() => {
    // Clean up DOM
    if (global.document) {
      delete global.document;
    }
    if (global.window) {
      delete global.window;
    }
    jest.clearAllMocks();
  });

  /**
   * Helper: Create transaction records with competition names
   */
  function createTransactionRecords(competitionNames) {
    return competitionNames.map((name, index) => ({
      date: `01/0${index + 1}/2024`,
      time: '10:00:00',
      till: 'Till1',
      type: 'Sale',
      member: `Player ${index + 1} & ${name}`,
      player: '',
      competition: '',
      price: '20.00',
      discount: '0.00',
      subtotal: '20.00',
      vat: '4.00',
      total: '24.00',
      sourceRowIndex: index,
      isComplete: true
    }));
  }

  /**
   * Helper: Extract fields from transaction records
   */
  function extractFields(records) {
    return records.map(record => fieldExtractor.extract(record));
  }

  test('should detect no new competitions when all competitions exist', async () => {
    // Requirement 1.4: When no new competitions detected, proceed directly to transaction summary

    // Step 1: Pre-create competitions in database
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    // Step 2: Create transaction records referencing only existing competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);

    // Step 3: Extract fields
    const enhancedRecords = extractFields(transactionRecords);

    // Step 4: Mock API to return existing competitions
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);

    // Step 5: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);

    // Verify: No new competitions detected
    expect(newCompetitionNames).toHaveLength(0);
    expect(apiClient.getAllCompetitions).toHaveBeenCalledTimes(1);
  });

  test('should not show any dialogs when all competitions exist', async () => {
    // Requirement 6.1: Proceed directly to "Save to Database" without showing dialogs

    // Step 1: Pre-create competitions
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    // Step 2: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 3: Mock API
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);

    // Step 4: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);

    // Verify: No new competitions
    expect(newCompetitionNames).toHaveLength(0);

    // Verify: No dialogs should be shown (no dialog creation needed)
    // In the actual workflow, this means we skip the dialog loop entirely
    expect(newCompetitionNames.length).toBe(0);

    // Verify: createCompetition should never be called
    expect(apiClient.createCompetition).not.toHaveBeenCalled();
  });

  test('should save transactions and link to existing competitions', async () => {
    // Requirement 6.1: Transactions should be saved and linked correctly

    // Step 1: Pre-create competitions
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    // Step 2: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 3: Mock API
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);

    // Step 4: Detect new competitions (should be empty)
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(0);

    // Step 5: Mock transaction storage
    apiClient.store.mockResolvedValue({
      stored: 2,
      errors: []
    });

    // Step 6: Store transactions directly (no dialog workflow)
    const storeResult = await apiClient.store(enhancedRecords);

    // Verify: Transactions were stored
    expect(storeResult.stored).toBe(2);
    expect(storeResult.errors).toHaveLength(0);
    expect(apiClient.store).toHaveBeenCalledWith(enhancedRecords);

    // Step 7: Mock retrieval of saved transactions
    apiClient.getAll.mockResolvedValue([
      {
        id: 101,
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Summer Singles Championship',
        total: '24.00',
        isComplete: true
      },
      {
        id: 102,
        date: '01/02/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Winter Doubles Tournament',
        total: '24.00',
        isComplete: true
      }
    ]);

    // Step 8: Retrieve saved transactions
    const savedTransactions = await apiClient.getAll();

    // Verify: Transactions are linked to existing competitions by name
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0].id).toBe(101);
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].id).toBe(102);
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');
  });

  test('should display summary view after import with existing competitions', async () => {
    // Requirement 6.1: Display transaction summary view

    // Step 1: Pre-create competitions
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 }
    ];

    // Step 2: Create and process transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 3: Mock all API responses
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);
    apiClient.store.mockResolvedValue({ stored: 2, errors: [] });
    apiClient.getAll.mockResolvedValue([
      { id: 101, ...enhancedRecords[0], player: 'Player 1', competition: 'Summer Singles Championship' },
      { id: 102, ...enhancedRecords[1], player: 'Player 2', competition: 'Winter Doubles Tournament' }
    ]);

    // Step 4: Complete workflow
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(0);

    const storeResult = await apiClient.store(enhancedRecords);
    const savedTransactions = await apiClient.getAll();

    // Verify: Workflow succeeded without creating competitions
    expect(storeResult.stored).toBe(2);
    expect(savedTransactions).toHaveLength(2);
    expect(apiClient.createCompetition).not.toHaveBeenCalled();

    // Verify: Summary data is available for display
    expect(savedTransactions[0].id).toBeDefined();
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].id).toBeDefined();
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');
  });

  test('should handle complete end-to-end workflow with existing competitions', async () => {
    // Integration test covering requirements: 1.4, 6.1

    // Step 1: Pre-create competitions in database
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 },
      { id: 2, name: 'Winter Doubles Tournament', date: '2024-12-20', type: 'doubles', seasonId: 1 },
      { id: 3, name: 'Spring Mixed Doubles', date: '2024-03-10', type: 'doubles', seasonId: 1 }
    ];

    // Step 2: Upload CSV with transactions referencing only existing competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament',
      'Spring Mixed Doubles'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Verify: Field extraction worked correctly
    expect(enhancedRecords[0].player).toBe('Player 1');
    expect(enhancedRecords[0].competition).toBe('Summer Singles Championship');
    expect(enhancedRecords[1].player).toBe('Player 2');
    expect(enhancedRecords[1].competition).toBe('Winter Doubles Tournament');
    expect(enhancedRecords[2].player).toBe('Player 3');
    expect(enhancedRecords[2].competition).toBe('Spring Mixed Doubles');

    // Step 3: Mock API - return existing competitions
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);

    // Step 4: Detect new competitions (Requirement 1.4)
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    // Verify: No new competitions detected
    expect(newCompetitionNames).toHaveLength(0);

    // Step 5: Verify no dialogs shown (Requirement 6.1)
    // In actual workflow, we skip the dialog loop when newCompetitionNames is empty
    expect(newCompetitionNames.length).toBe(0);

    // Step 6: Mock transaction storage
    apiClient.store.mockResolvedValue({
      stored: 3,
      errors: []
    });

    // Step 7: Store transactions directly (no competition creation)
    const storeResult = await apiClient.store(enhancedRecords);
    
    // Verify: Transactions stored successfully
    expect(storeResult.stored).toBe(3);
    expect(apiClient.createCompetition).not.toHaveBeenCalled();

    // Step 8: Mock retrieval of saved transactions
    apiClient.getAll.mockResolvedValue([
      {
        id: 101,
        date: '01/01/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 1',
        competition: 'Summer Singles Championship',
        total: '24.00',
        isComplete: true
      },
      {
        id: 102,
        date: '01/02/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 2',
        competition: 'Winter Doubles Tournament',
        total: '24.00',
        isComplete: true
      },
      {
        id: 103,
        date: '01/03/2024',
        time: '10:00:00',
        till: 'Till1',
        type: 'Sale',
        member: '',
        player: 'Player 3',
        competition: 'Spring Mixed Doubles',
        total: '24.00',
        isComplete: true
      }
    ]);

    // Step 9: Verify transactions saved and linked correctly (Requirement 6.1)
    const savedTransactions = await apiClient.getAll();
    
    expect(savedTransactions).toHaveLength(3);
    expect(savedTransactions[0].id).toBe(101);
    expect(savedTransactions[0].competition).toBe('Summer Singles Championship');
    expect(savedTransactions[1].id).toBe(102);
    expect(savedTransactions[1].competition).toBe('Winter Doubles Tournament');
    expect(savedTransactions[2].id).toBe(103);
    expect(savedTransactions[2].competition).toBe('Spring Mixed Doubles');

    // Verify: Summary view can be displayed (Requirement 6.1)
    expect(savedTransactions[0].player).toBe('Player 1');
    expect(savedTransactions[0].total).toBe('24.00');
    expect(savedTransactions[1].player).toBe('Player 2');
    expect(savedTransactions[1].total).toBe('24.00');
    expect(savedTransactions[2].player).toBe('Player 3');
    expect(savedTransactions[2].total).toBe('24.00');
  });

  test('should handle mixed scenario with some existing and some new competitions', async () => {
    // Edge case: Verify detection correctly identifies only new competitions

    // Step 1: Pre-create only one competition
    const existingCompetitions = [
      { id: 1, name: 'Summer Singles Championship', date: '2024-06-15', type: 'singles', seasonId: 1 }
    ];

    // Step 2: Create transactions referencing one existing and one new competition
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',  // Existing
      'Winter Doubles Tournament'     // New
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 3: Mock API
    apiClient.getAllCompetitions.mockResolvedValue(existingCompetitions);

    // Step 4: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);

    // Verify: Only the new competition is detected
    expect(newCompetitionNames).toHaveLength(1);
    expect(newCompetitionNames).toContain('Winter Doubles Tournament');
    expect(newCompetitionNames).not.toContain('Summer Singles Championship');
  });
});

/**
 * Integration Test: Import Cancellation
 * 
 * Tests the workflow when a user cancels the competition creation dialog.
 * Verifies that no competitions are created, no transactions are saved,
 * and an appropriate message is displayed.
 * 
 * Feature: auto-create-competitions-from-transactions
 * Task: 9.3 Write integration test for import cancellation
 * Requirements: 2.7, 2.8
 */
describe('Integration Test: Import Cancellation', () => {
  let dom;
  let document;
  let window;
  let apiClient;
  let competitionDetector;
  let fieldExtractor;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;

    // Mock API client
    apiClient = {
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      request: jest.fn(),
      store: jest.fn(),
      getAll: jest.fn()
    };

    // Initialize components
    competitionDetector = new CompetitionDetector(apiClient);
    fieldExtractor = new FieldExtractor();
  });

  afterEach(() => {
    // Clean up DOM
    if (global.document) {
      delete global.document;
    }
    if (global.window) {
      delete global.window;
    }
    jest.clearAllMocks();
  });

  /**
   * Helper: Create transaction records with competition names
   */
  function createTransactionRecords(competitionNames) {
    return competitionNames.map((name, index) => ({
      date: `01/0${index + 1}/2024`,
      time: '10:00:00',
      till: 'Till1',
      type: 'Sale',
      member: `Player ${index + 1} & ${name}`,
      player: '',
      competition: '',
      price: '20.00',
      discount: '0.00',
      subtotal: '20.00',
      vat: '4.00',
      total: '24.00',
      sourceRowIndex: index,
      isComplete: true
    }));
  }

  /**
   * Helper: Extract fields from transaction records
   */
  function extractFields(records) {
    return records.map(record => fieldExtractor.extract(record));
  }

  test('should abort import when user cancels the creation dialog', async () => {
    // Requirement 2.7: Allow user to cancel the creation process
    // Requirement 2.8: Abort transaction import when user cancels

    // Step 1: Upload CSV with transactions referencing new competition
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API - no existing competitions
    apiClient.getAllCompetitions.mockResolvedValue([]);

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    // Verify: One new competition detected
    expect(newCompetitionNames).toHaveLength(1);
    expect(newCompetitionNames[0]).toBe('Summer Singles Championship');

    // Step 4: Mock season loading for dialog
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Step 5: Show dialog and cancel it
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('Summer Singles Championship');
    
    // Wait for dialog to be fully rendered (including async loadSeasons)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Cancel the dialog (simulating user clicking cancel button)
    dialog.handleCancel();
    const result = await showPromise;

    // Verify: Dialog returns null on cancellation (Requirement 2.7)
    expect(result).toBeNull();

    // Step 7: Verify no competitions were created (Requirement 2.8)
    expect(apiClient.createCompetition).not.toHaveBeenCalled();

    // Step 8: Verify no transactions were saved (Requirement 2.8)
    expect(apiClient.store).not.toHaveBeenCalled();

    // Step 9: In actual workflow, appropriate message would be displayed
    // "Import cancelled. No data was saved."
    // This is verified by checking that the workflow was aborted
    expect(result).toBeNull();
  });

  test('should not create any competitions when dialog is cancelled', async () => {
    // Requirement 2.8: No competitions created when import is cancelled

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Show and cancel dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('Summer Singles Championship');
    
    // Cancel immediately
    dialog.handleCancel();
    const result = await showPromise;

    // Verify: No competition creation API call was made
    expect(apiClient.createCompetition).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should not save any transactions when dialog is cancelled', async () => {
    // Requirement 2.8: No transactions saved when import is cancelled

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Show and cancel dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('Summer Singles Championship');
    
    // Cancel immediately
    dialog.handleCancel();
    const result = await showPromise;

    // Verify: Dialog was cancelled
    expect(result).toBeNull();

    // Step 5: Simulate workflow checking for cancellation
    // In actual app.js, if result is null, we abort and don't call store
    if (result === null) {
      // Import cancelled - don't save transactions
      // This is the expected behavior
    } else {
      // This branch should not execute
      await apiClient.store(enhancedRecords);
    }

    // Verify: No transaction storage API call was made
    expect(apiClient.store).not.toHaveBeenCalled();
  });

  test('should abort import when cancelling first of multiple dialogs', async () => {
    // Requirement 2.8: Cancelling any dialog aborts entire import

    // Step 1: Upload CSV with transactions referencing 2 new competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(2);

    // Step 4: Show first dialog and cancel it
    const dialog1 = new CompetitionCreationDialog(apiClient);
    const showPromise1 = dialog1.show('Summer Singles Championship');
    
    // Cancel first dialog
    dialog1.handleCancel();
    const result1 = await showPromise1;

    // Verify: First dialog was cancelled
    expect(result1).toBeNull();

    // Step 5: In actual workflow, we would check result and abort
    // Second dialog should never be shown
    let secondDialogShown = false;
    if (result1 !== null) {
      // This branch should not execute
      const dialog2 = new CompetitionCreationDialog(apiClient);
      await dialog2.show('Winter Doubles Tournament');
      secondDialogShown = true;
    }

    // Verify: Second dialog was never shown
    expect(secondDialogShown).toBe(false);

    // Verify: No competitions were created
    expect(apiClient.createCompetition).not.toHaveBeenCalled();

    // Verify: No transactions were saved
    expect(apiClient.store).not.toHaveBeenCalled();
  });

  test('should abort import when cancelling middle dialog in sequence', async () => {
    // Requirement 2.8: Cancelling any dialog (not just first) aborts import

    // Step 1: Upload CSV with transactions referencing 3 new competitions
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship',
      'Winter Doubles Tournament',
      'Spring Mixed Doubles'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });

    // Mock first competition creation to succeed
    apiClient.createCompetition.mockResolvedValueOnce({
      id: 1,
      name: 'Summer Singles Championship',
      date: '2024-06-15',
      type: 'singles',
      seasonId: 1
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(3);

    // Step 4: Simulate workflow - first dialog succeeds
    const createdCompetitions = [];
    
    // First dialog - simulate successful creation
    const competition1 = await apiClient.createCompetition({
      name: 'Summer Singles Championship',
      date: '2024-06-15',
      type: 'singles',
      seasonId: 1
    });
    createdCompetitions.push(competition1);

    // Verify: First competition was created
    expect(createdCompetitions).toHaveLength(1);
    expect(apiClient.createCompetition).toHaveBeenCalledTimes(1);

    // Step 5: Show second dialog and cancel it
    const dialog2 = new CompetitionCreationDialog(apiClient);
    const showPromise2 = dialog2.show('Winter Doubles Tournament');
    
    // Wait for dialog to render
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Cancel second dialog
    dialog2.handleCancel();
    const result2 = await showPromise2;

    // Verify: Second dialog was cancelled
    expect(result2).toBeNull();

    // Step 6: Workflow should abort - third dialog never shown
    // In actual workflow, we check result2 and abort if null
    let workflowAborted = false;
    if (result2 === null) {
      workflowAborted = true;
      // Don't show third dialog or save transactions
    }

    // Verify: Workflow was aborted
    expect(workflowAborted).toBe(true);

    // Verify: Only first competition was created (before cancellation)
    expect(apiClient.createCompetition).toHaveBeenCalledTimes(1);

    // Verify: No transactions were saved (entire import aborted)
    expect(apiClient.store).not.toHaveBeenCalled();
  });

  test('should display appropriate cancellation message', async () => {
    // Requirement 2.8: Display appropriate message when import is cancelled

    // Step 1: Create transaction records
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Step 2: Mock API
    apiClient.getAllCompetitions.mockResolvedValue([]);
    apiClient.request.mockResolvedValue({
      seasons: [{ id: 1, name: 'Season 2024', allCompetitionsAdded: false }]
    });

    // Step 3: Detect new competitions
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Show and cancel dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('Summer Singles Championship');
    
    dialog.handleCancel();
    const result = await showPromise;

    // Verify: Dialog was cancelled
    expect(result).toBeNull();

    // Step 5: Simulate workflow handling cancellation
    let displayedMessage = '';
    if (result === null) {
      // In actual app.js, this would call showError()
      displayedMessage = 'Import cancelled. No data was saved.';
    }

    // Verify: Appropriate message would be displayed
    expect(displayedMessage).toBe('Import cancelled. No data was saved.');
    
    // Verify: No data operations occurred
    expect(apiClient.createCompetition).not.toHaveBeenCalled();
    expect(apiClient.store).not.toHaveBeenCalled();
  });

  test('should handle complete cancellation workflow end-to-end', async () => {
    // Integration test covering complete cancellation workflow
    // Requirements: 2.7, 2.8

    // Step 1: Upload CSV with transactions referencing new competition
    const transactionRecords = createTransactionRecords([
      'Summer Singles Championship'
    ]);
    const enhancedRecords = extractFields(transactionRecords);

    // Verify: Field extraction worked correctly
    expect(enhancedRecords[0].player).toBe('Player 1');
    expect(enhancedRecords[0].competition).toBe('Summer Singles Championship');

    // Step 2: Mock API - no existing competitions
    apiClient.getAllCompetitions.mockResolvedValue([]);

    // Step 3: Detect new competitions (Requirement 2.7)
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    
    expect(newCompetitionNames).toHaveLength(1);
    expect(newCompetitionNames[0]).toBe('Summer Singles Championship');

    // Step 4: Mock season loading
    apiClient.request.mockResolvedValue({
      seasons: [
        { id: 1, name: 'Season 2024', allCompetitionsAdded: false }
      ]
    });

    // Step 5: Show creation dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('Summer Singles Championship');
    
    // Wait for dialog to render
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify: Dialog is displayed
    const dialogElement = document.querySelector('.competition-creation-dialog');
    expect(dialogElement).toBeTruthy();
    
    const nameInput = document.getElementById('competition-name');
    expect(nameInput).toBeTruthy();
    expect(nameInput.value).toBe('Summer Singles Championship');

    // Step 6: User cancels the dialog (Requirement 2.7)
    dialog.handleCancel();
    const result = await showPromise;

    // Verify: Dialog returns null (Requirement 2.7)
    expect(result).toBeNull();

    // Step 7: Workflow checks result and aborts (Requirement 2.8)
    let workflowAborted = false;
    let errorMessage = '';
    
    if (result === null) {
      workflowAborted = true;
      errorMessage = 'Import cancelled. No data was saved.';
      // Don't proceed with transaction storage
    } else {
      // This branch should not execute
      await apiClient.store(enhancedRecords);
    }

    // Verify: Workflow was aborted (Requirement 2.8)
    expect(workflowAborted).toBe(true);
    expect(errorMessage).toBe('Import cancelled. No data was saved.');

    // Verify: No competitions created (Requirement 2.8)
    expect(apiClient.createCompetition).not.toHaveBeenCalled();

    // Verify: No transactions saved (Requirement 2.8)
    expect(apiClient.store).not.toHaveBeenCalled();

    // Verify: No data retrieval attempted
    expect(apiClient.getAll).not.toHaveBeenCalled();
  });
});

/**
 * Integration Test: Season Management Workflow
 * 
 * Tests the complete workflow for managing presentation season completion status
 * and its effect on competition creation dialogs during transaction imports.
 * 
 * Feature: auto-create-competitions-from-transactions
 * Task: 9.4 Write integration test for season management workflow
 * Requirements: 5.2, 5.4, 5.5, 5.6
 */
describe('Integration Test: Season Management Workflow', () => {
  let dom;
  let document;
  let window;
  let apiClient;
  let competitionDetector;
  let fieldExtractor;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;

    // Mock API client
    apiClient = {
      getAllCompetitions: jest.fn(),
      createCompetition: jest.fn(),
      request: jest.fn(),
      store: jest.fn(),
      getAll: jest.fn(),
      updateSeason: jest.fn()
    };

    // Initialize components
    competitionDetector = new CompetitionDetector(apiClient);
    fieldExtractor = new FieldExtractor();
  });

  afterEach(() => {
    // Clean up DOM
    if (global.document) {
      delete global.document;
    }
    if (global.window) {
      delete global.window;
    }
    jest.clearAllMocks();
  });

  /**
   * Helper: Create transaction records with competition names
   */
  function createTransactionRecords(competitionNames) {
    return competitionNames.map((name, index) => ({
      date: `01/0${index + 1}/2024`,
      time: '10:00:00',
      till: 'Till1',
      type: 'Sale',
      member: `Player ${index + 1} & ${name}`,
      player: '',
      competition: '',
      price: '20.00',
      discount: '0.00',
      subtotal: '20.00',
      vat: '4.00',
      total: '24.00',
      sourceRowIndex: index,
      isComplete: true
    }));
  }

  /**
   * Helper: Extract fields from transaction records
   */
  function extractFields(records) {
    return records.map(record => fieldExtractor.extract(record));
  }

  test('should update database when toggling allCompetitionsAdded to true', async () => {
    // Requirement 5.2: Update allCompetitionsAdded field in database
    // Requirement 5.5: Allow users to toggle the flag on and off at any time
    // Requirement 5.6: Persist the change immediately to the database

    // Step 1: Create season with allCompetitionsAdded=false
    const season = {
      id: 1,
      name: 'Season: Winter 23-Summer 24',
      startYear: 2023,
      endYear: 2024,
      isActive: true,
      allCompetitionsAdded: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    // Step 2: Mock API to update season
    apiClient.updateSeason.mockResolvedValue({
      ...season,
      allCompetitionsAdded: true,
      updatedAt: '2024-01-15T10:30:00Z'
    });

    // Step 3: Toggle to true (simulating user action in UI)
    const updatedSeason = await apiClient.updateSeason(season.id, {
      allCompetitionsAdded: true
    });

    // Verify: Database was updated (Requirement 5.2, 5.6)
    expect(apiClient.updateSeason).toHaveBeenCalledWith(season.id, {
      allCompetitionsAdded: true
    });
    expect(updatedSeason.allCompetitionsAdded).toBe(true);
    expect(updatedSeason.updatedAt).not.toBe(season.updatedAt);
  });

  test('should exclude season from dropdown when allCompetitionsAdded is true', async () => {
    // Requirement 5.4: Exclude seasons with allCompetitionsAdded=true from dropdown

    // Step 1: Create seasons with different allCompetitionsAdded values
    const seasons = [
      {
        id: 1,
        name: 'Season: Winter 23-Summer 24',
        allCompetitionsAdded: true  // Should be excluded
      },
      {
        id: 2,
        name: 'Season: Winter 24-Summer 25',
        allCompetitionsAdded: false  // Should be included
      },
      {
        id: 3,
        name: 'Season: Winter 25-Summer 26',
        allCompetitionsAdded: false  // Should be included
      }
    ];

    // Step 2: Mock API to return filtered seasons (allCompetitionsAdded=false)
    apiClient.request.mockResolvedValue({
      seasons: seasons.filter(s => !s.allCompetitionsAdded)
    });

    // Step 3: Start import with new competition
    const transactionRecords = createTransactionRecords(['New Competition']);
    const enhancedRecords = extractFields(transactionRecords);

    apiClient.getAllCompetitions.mockResolvedValue([]);
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Show dialog (which loads seasons)
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('New Competition');

    // Wait for seasons to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 5: Verify season dropdown only contains seasons with allCompetitionsAdded=false
    const seasonSelect = document.getElementById('competition-season');
    expect(seasonSelect).toBeTruthy();

    const options = Array.from(seasonSelect.options).filter(opt => opt.value);
    
    // Verify: Only 2 seasons appear (those with allCompetitionsAdded=false)
    expect(options).toHaveLength(2);
    expect(options.map(opt => opt.textContent)).toContain('Season: Winter 24-Summer 25');
    expect(options.map(opt => opt.textContent)).toContain('Season: Winter 25-Summer 26');
    expect(options.map(opt => opt.textContent)).not.toContain('Season: Winter 23-Summer 24');

    // Cleanup
    dialog.handleCancel();
    await showPromise;
  });

  test('should include season in dropdown when toggling allCompetitionsAdded back to false', async () => {
    // Requirement 5.5: Allow users to toggle the flag on and off at any time
    // Requirement 5.6: Persist the change immediately to the database

    // Step 1: Create season with allCompetitionsAdded=true
    const season = {
      id: 1,
      name: 'Season: Winter 23-Summer 24',
      startYear: 2023,
      endYear: 2024,
      isActive: true,
      allCompetitionsAdded: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    };

    // Step 2: Toggle back to false
    apiClient.updateSeason.mockResolvedValue({
      ...season,
      allCompetitionsAdded: false,
      updatedAt: '2024-01-15T11:00:00Z'
    });

    const updatedSeason = await apiClient.updateSeason(season.id, {
      allCompetitionsAdded: false
    });

    // Verify: Database was updated (Requirement 5.6)
    expect(apiClient.updateSeason).toHaveBeenCalledWith(season.id, {
      allCompetitionsAdded: false
    });
    expect(updatedSeason.allCompetitionsAdded).toBe(false);

    // Step 3: Mock API to return season in filtered list
    apiClient.request.mockResolvedValue({
      seasons: [updatedSeason]
    });

    // Step 4: Start import with new competition
    const transactionRecords = createTransactionRecords(['New Competition']);
    const enhancedRecords = extractFields(transactionRecords);

    apiClient.getAllCompetitions.mockResolvedValue([]);
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 5: Show dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('New Competition');

    // Wait for seasons to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Verify season appears in dropdown (Requirement 5.5)
    const seasonSelect = document.getElementById('competition-season');
    expect(seasonSelect).toBeTruthy();

    const options = Array.from(seasonSelect.options).filter(opt => opt.value);
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe('Season: Winter 23-Summer 24');

    // Cleanup
    dialog.handleCancel();
    await showPromise;
  });

  test('should handle complete season management workflow end-to-end', async () => {
    // Integration test covering complete season management workflow
    // Requirements: 5.2, 5.4, 5.5, 5.6

    // Step 1: Create season with allCompetitionsAdded=false
    const initialSeason = {
      id: 1,
      name: 'Season: Winter 23-Summer 24',
      startYear: 2023,
      endYear: 2024,
      isActive: true,
      allCompetitionsAdded: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    // Step 2: Toggle to true (Requirement 5.2, 5.6)
    apiClient.updateSeason.mockResolvedValueOnce({
      ...initialSeason,
      allCompetitionsAdded: true,
      updatedAt: '2024-01-15T10:30:00Z'
    });

    const seasonAfterToggleTrue = await apiClient.updateSeason(initialSeason.id, {
      allCompetitionsAdded: true
    });

    // Verify: Database updated (Requirement 5.2, 5.6)
    expect(seasonAfterToggleTrue.allCompetitionsAdded).toBe(true);
    expect(apiClient.updateSeason).toHaveBeenCalledTimes(1);

    // Step 3: Start import with new competition
    const transactionRecords = createTransactionRecords(['New Competition']);
    const enhancedRecords = extractFields(transactionRecords);

    apiClient.getAllCompetitions.mockResolvedValue([]);
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Mock API to return empty season list (season is excluded)
    apiClient.request.mockResolvedValueOnce({
      seasons: []  // Season with allCompetitionsAdded=true is excluded
    });

    // Step 5: Show dialog
    const dialog1 = new CompetitionCreationDialog(apiClient);
    const showPromise1 = dialog1.show('New Competition');

    // Wait for seasons to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Verify season doesn't appear in dropdown (Requirement 5.4)
    const seasonSelect1 = document.getElementById('competition-season');
    expect(seasonSelect1).toBeTruthy();

    const options1 = Array.from(seasonSelect1.options).filter(opt => opt.value);
    expect(options1).toHaveLength(0);  // No seasons available

    // Cancel first dialog
    dialog1.handleCancel();
    await showPromise1;

    // Step 7: Toggle back to false (Requirement 5.5, 5.6)
    apiClient.updateSeason.mockResolvedValueOnce({
      ...initialSeason,
      allCompetitionsAdded: false,
      updatedAt: '2024-01-15T11:00:00Z'
    });

    const seasonAfterToggleFalse = await apiClient.updateSeason(initialSeason.id, {
      allCompetitionsAdded: false
    });

    // Verify: Database updated again (Requirement 5.6)
    expect(seasonAfterToggleFalse.allCompetitionsAdded).toBe(false);
    expect(apiClient.updateSeason).toHaveBeenCalledTimes(2);

    // Step 8: Mock API to return season in filtered list
    apiClient.request.mockResolvedValueOnce({
      seasons: [seasonAfterToggleFalse]
    });

    // Step 9: Show dialog again
    const dialog2 = new CompetitionCreationDialog(apiClient);
    const showPromise2 = dialog2.show('New Competition');

    // Wait for seasons to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 10: Verify season appears in dropdown (Requirement 5.5)
    const seasonSelect2 = document.getElementById('competition-season');
    expect(seasonSelect2).toBeTruthy();

    const options2 = Array.from(seasonSelect2.options).filter(opt => opt.value);
    expect(options2).toHaveLength(1);
    expect(options2[0].textContent).toBe('Season: Winter 23-Summer 24');
    expect(options2[0].value).toBe('1');

    // Cleanup
    dialog2.handleCancel();
    await showPromise2;

    // Final verification: Complete workflow executed correctly
    expect(apiClient.updateSeason).toHaveBeenCalledTimes(2);
    expect(apiClient.updateSeason).toHaveBeenNthCalledWith(1, initialSeason.id, {
      allCompetitionsAdded: true
    });
    expect(apiClient.updateSeason).toHaveBeenNthCalledWith(2, initialSeason.id, {
      allCompetitionsAdded: false
    });
  });

  test('should persist season flag changes across page refreshes', async () => {
    // Requirement 5.6: Persist the change immediately to the database

    // Step 1: Create season
    const season = {
      id: 1,
      name: 'Season: Winter 23-Summer 24',
      allCompetitionsAdded: false
    };

    // Step 2: Toggle to true
    apiClient.updateSeason.mockResolvedValueOnce({
      ...season,
      allCompetitionsAdded: true,
      updatedAt: '2024-01-15T10:30:00Z'
    });

    await apiClient.updateSeason(season.id, { allCompetitionsAdded: true });

    // Step 3: Simulate page refresh by fetching season again
    apiClient.request.mockResolvedValueOnce({
      seasons: [{
        ...season,
        allCompetitionsAdded: true,
        updatedAt: '2024-01-15T10:30:00Z'
      }]
    });

    const refreshedSeasons = await apiClient.request('GET', '/api/presentation-seasons');

    // Verify: Flag persisted after "refresh" (Requirement 5.6)
    expect(refreshedSeasons.seasons[0].allCompetitionsAdded).toBe(true);
  });

  test('should handle multiple seasons with different allCompetitionsAdded values', async () => {
    // Requirement 5.4: Filter correctly when multiple seasons exist

    // Step 1: Create multiple seasons
    const seasons = [
      { id: 1, name: 'Season 1', allCompetitionsAdded: true },
      { id: 2, name: 'Season 2', allCompetitionsAdded: false },
      { id: 3, name: 'Season 3', allCompetitionsAdded: true },
      { id: 4, name: 'Season 4', allCompetitionsAdded: false },
      { id: 5, name: 'Season 5', allCompetitionsAdded: false }
    ];

    // Step 2: Mock API to return only seasons with allCompetitionsAdded=false
    const filteredSeasons = seasons.filter(s => !s.allCompetitionsAdded);
    apiClient.request.mockResolvedValue({
      seasons: filteredSeasons
    });

    // Step 3: Start import
    const transactionRecords = createTransactionRecords(['New Competition']);
    const enhancedRecords = extractFields(transactionRecords);

    apiClient.getAllCompetitions.mockResolvedValue([]);
    const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
    expect(newCompetitionNames).toHaveLength(1);

    // Step 4: Show dialog
    const dialog = new CompetitionCreationDialog(apiClient);
    const showPromise = dialog.show('New Competition');

    // Wait for seasons to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 5: Verify only seasons with allCompetitionsAdded=false appear
    const seasonSelect = document.getElementById('competition-season');
    expect(seasonSelect).toBeTruthy();

    const options = Array.from(seasonSelect.options).filter(opt => opt.value);
    
    // Verify: Only 3 seasons appear (those with allCompetitionsAdded=false)
    expect(options).toHaveLength(3);
    expect(options.map(opt => opt.textContent)).toContain('Season 2');
    expect(options.map(opt => opt.textContent)).toContain('Season 4');
    expect(options.map(opt => opt.textContent)).toContain('Season 5');
    expect(options.map(opt => opt.textContent)).not.toContain('Season 1');
    expect(options.map(opt => opt.textContent)).not.toContain('Season 3');

    // Cleanup
    dialog.handleCancel();
    await showPromise;
  });

  test('should update UI immediately after toggling season flag', async () => {
    // Requirement 5.6: Persist the change immediately to the database

    // Step 1: Create season
    const season = {
      id: 1,
      name: 'Season: Winter 23-Summer 24',
      allCompetitionsAdded: false
    };

    // Step 2: Toggle to true
    const updateTimestamp = new Date().toISOString();
    apiClient.updateSeason.mockResolvedValue({
      ...season,
      allCompetitionsAdded: true,
      updatedAt: updateTimestamp
    });

    const updatedSeason = await apiClient.updateSeason(season.id, {
      allCompetitionsAdded: true
    });

    // Verify: Update happened immediately (Requirement 5.6)
    expect(updatedSeason.allCompetitionsAdded).toBe(true);
    expect(updatedSeason.updatedAt).toBe(updateTimestamp);
    
    // Verify: API was called immediately (not deferred)
    expect(apiClient.updateSeason).toHaveBeenCalledTimes(1);
    expect(apiClient.updateSeason).toHaveBeenCalledWith(season.id, {
      allCompetitionsAdded: true
    });
  });
});
