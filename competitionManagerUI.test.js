/**
 * Competition Manager UI Integration Tests
 */

import { CompetitionManagerUI } from './competitionManagerUI.js';
import { CompetitionManager } from './competitionManager.js';
import { DatabaseManager } from './databaseManager.js';

describe('CompetitionManagerUI Integration Tests', () => {
  let databaseManager;
  let competitionManager;
  let competitionManagerUI;
  let container;

  beforeEach(async () => {
    // Create container for modal
    container = document.createElement('div');
    container.innerHTML = `
      <div id="competition-manager-modal" class="modal" style="display: none;">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Manage Competitions</h2>
            <button id="close-competition-manager" class="close-button">×</button>
          </div>
          <div class="modal-body">
            <div id="competition-error-container" class="competition-message" style="display: none;">
              <span id="competition-error-text"></span>
              <button id="competition-error-dismiss">×</button>
            </div>
            <div class="competition-form">
              <input type="text" id="competition-name-input" placeholder="Competition Name" />
              <button id="add-competition-btn" class="primary-button">Add Competition</button>
            </div>
            <div class="competition-list-container">
              <div id="competition-list-empty" class="empty-state" style="display: none;">
                No competitions yet.
              </div>
              <table id="competition-list-table" class="competition-table" style="display: none;">
                <thead>
                  <tr>
                    <th>Competition Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="competition-list-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Initialize components
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    
    // Clear all data including competitions
    if (databaseManager.db) {
      const transaction = databaseManager.db.transaction(['competitions', 'summarised_period_transactions'], 'readwrite');
      const competitionsStore = transaction.objectStore('competitions');
      const transactionsStore = transaction.objectStore('summarised_period_transactions');
      
      await new Promise((resolve, reject) => {
        competitionsStore.clear();
        transactionsStore.clear();
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
      });
    }

    competitionManager = new CompetitionManager(databaseManager);
    competitionManagerUI = new CompetitionManagerUI(competitionManager);
  });

  afterEach(async () => {
    if (databaseManager && databaseManager.db) {
      // Clear all data
      const transaction = databaseManager.db.transaction(['competitions', 'summarised_period_transactions'], 'readwrite');
      const competitionsStore = transaction.objectStore('competitions');
      const transactionsStore = transaction.objectStore('summarised_period_transactions');
      
      await new Promise((resolve) => {
        competitionsStore.clear();
        transactionsStore.clear();
        transaction.oncomplete = resolve;
        transaction.onerror = resolve;
      });
      
      databaseManager.db.close();
    }
    document.body.removeChild(container);
  });

  describe('Modal Display', () => {
    test('should show modal when show() is called', async () => {
      const modal = document.getElementById('competition-manager-modal');
      expect(modal.style.display).toBe('none');

      await competitionManagerUI.show();

      expect(modal.style.display).toBe('flex');
    });

    test('should hide modal when close button is clicked', async () => {
      await competitionManagerUI.show();
      const modal = document.getElementById('competition-manager-modal');
      const closeButton = document.getElementById('close-competition-manager');

      closeButton.click();

      expect(modal.style.display).toBe('none');
    });

    test('should hide modal when overlay is clicked', async () => {
      await competitionManagerUI.show();
      const modal = document.getElementById('competition-manager-modal');
      const overlay = modal.querySelector('.modal-overlay');

      overlay.click();

      expect(modal.style.display).toBe('none');
    });
  });

  describe('Competition List Rendering', () => {
    test('should show empty state when no competitions exist', async () => {
      await competitionManagerUI.show();

      const emptyState = document.getElementById('competition-list-empty');
      const table = document.getElementById('competition-list-table');

      expect(emptyState.style.display).toBe('block');
      expect(table.style.display).toBe('none');
    });

    test('should render competition list when competitions exist', async () => {
      await competitionManager.create('Summer Cup 2025');
      await competitionManager.create('October Medal 2025');

      await competitionManagerUI.show();

      const emptyState = document.getElementById('competition-list-empty');
      const table = document.getElementById('competition-list-table');
      const tbody = document.getElementById('competition-list-body');

      expect(emptyState.style.display).toBe('none');
      expect(table.style.display).toBe('table');
      expect(tbody.children.length).toBe(2);
    });

    test('should display competition names in alphabetical order', async () => {
      await competitionManager.create('Zebra Cup');
      await competitionManager.create('Alpha Medal');
      await competitionManager.create('Beta Trophy');

      await competitionManagerUI.show();

      const tbody = document.getElementById('competition-list-body');
      const rows = Array.from(tbody.children);
      const names = rows.map(row => row.querySelector('.competition-name-cell').textContent);

      expect(names).toEqual(['Alpha Medal', 'Beta Trophy', 'Zebra Cup']);
    });
  });

  describe('Add Competition Flow', () => {
    test('should add competition when form is submitted', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');

      input.value = 'New Competition';
      addButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const competitions = await competitionManager.getAll();
      expect(competitions.length).toBe(1);
      expect(competitions[0].name).toBe('New Competition');
    });

    test('should clear input after successful add', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');

      input.value = 'Test Competition';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(input.value).toBe('');
    });

    test('should show success message after adding competition', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const errorContainer = document.getElementById('competition-error-container');

      input.value = 'Success Test';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('success');
    });

    test('should show error when adding empty name', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const errorContainer = document.getElementById('competition-error-container');

      input.value = '';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('error');
    });

    test('should show error when adding duplicate name', async () => {
      await competitionManager.create('Duplicate Test');
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const errorContainer = document.getElementById('competition-error-container');

      input.value = 'Duplicate Test';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('error');
      expect(errorContainer.textContent).toContain('already exists');
    });

    test('should refresh list after adding competition', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const tbody = document.getElementById('competition-list-body');

      expect(tbody.children.length).toBe(0);

      input.value = 'First Competition';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(tbody.children.length).toBe(1);
    });
  });

  describe('Edit Competition Flow', () => {
    test('should show edit form when edit button is clicked', async () => {
      const competition = await competitionManager.create('Edit Test');
      await competitionManagerUI.show();

      const editButton = document.querySelector('.edit-button');
      editButton.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const input = document.querySelector('.competition-name-input');
      expect(input).toBeTruthy();
      expect(input.value).toBe('Edit Test');
    });

    test('should update competition when save is clicked', async () => {
      const competition = await competitionManager.create('Original Name');
      await competitionManagerUI.show();

      const editButton = document.querySelector('.edit-button');
      editButton.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const input = document.querySelector('.competition-name-input');
      const saveButton = document.querySelector('.save-edit-button');

      input.value = 'Updated Name';
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const updated = await competitionManager.getById(competition.id);
      expect(updated.name).toBe('Updated Name');
    });

    test('should cancel edit when cancel button is clicked', async () => {
      const competition = await competitionManager.create('Cancel Test');
      await competitionManagerUI.show();

      const editButton = document.querySelector('.edit-button');
      editButton.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const input = document.querySelector('.competition-name-input');
      const cancelButton = document.querySelector('.cancel-edit-button');

      input.value = 'Changed Name';
      cancelButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const unchanged = await competitionManager.getById(competition.id);
      expect(unchanged.name).toBe('Cancel Test');
    });

    test('should show error when updating to duplicate name', async () => {
      await competitionManager.create('Existing Name');
      const editMeComp = await competitionManager.create('Edit Me');
      await competitionManagerUI.show();

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find the row for "Edit Me" specifically
      const rows = Array.from(document.querySelectorAll('#competition-list-body tr'));
      const editMeRow = rows.find(row => row.querySelector('.competition-name-cell').textContent === 'Edit Me');
      const editButton = editMeRow.querySelector('.edit-button');
      
      editButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const input = document.querySelector('.competition-name-input');
      const saveButton = document.querySelector('.save-edit-button');
      const errorContainer = document.getElementById('competition-error-container');

      input.value = 'Existing Name';
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('error');
      expect(errorContainer.textContent).toContain('already exists');
    });
  });

  describe('Delete Competition Flow', () => {
    test('should delete competition when confirmed', async () => {
      const competition = await competitionManager.create('Delete Me');
      await competitionManagerUI.show();

      // Mock confirm to return true
      global.confirm = jest.fn(() => true);

      const deleteButton = document.querySelector('.delete-button');
      deleteButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const competitions = await competitionManager.getAll();
      expect(competitions.length).toBe(0);
    });

    test('should not delete competition when cancelled', async () => {
      const competition = await competitionManager.create('Keep Me');
      await competitionManagerUI.show();

      // Mock confirm to return false
      global.confirm = jest.fn(() => false);

      const deleteButton = document.querySelector('.delete-button');
      deleteButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const competitions = await competitionManager.getAll();
      expect(competitions.length).toBe(1);
    });

    test('should show error when deleting competition with transactions', async () => {
      const competition = await competitionManager.create('Has Transactions');
      
      // Add a transaction with this competition
      const transaction = {
        date: '01-01-2025',
        time: '12:00',
        till: 'Till 1',
        type: 'Topup (Competitions)',
        member: 'Test Member',
        player: '',
        competition: '',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '0.00',
        total: '50.00',
        sourceRowIndex: 1,
        isComplete: true,
        isWinning: true,
        winningCompetitionId: competition.id
      };
      await databaseManager.store([transaction]);

      await competitionManagerUI.show();

      global.confirm = jest.fn(() => true);

      const deleteButton = document.querySelector('.delete-button');
      const errorContainer = document.getElementById('competition-error-container');

      deleteButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('error');
      expect(errorContainer.textContent).toContain('associated transaction');

      const competitions = await competitionManager.getAll();
      expect(competitions.length).toBe(1);
    });

    test('should refresh list after deleting competition', async () => {
      await competitionManager.create('Delete Test');
      await competitionManagerUI.show();

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      let tbody = document.getElementById('competition-list-body');
      expect(tbody.children.length).toBe(1);

      global.confirm = jest.fn(() => true);

      const deleteButton = document.querySelector('.delete-button');
      deleteButton.click();

      // Wait for delete and refresh
      await new Promise(resolve => setTimeout(resolve, 400));

      // Verify competition was deleted from database
      const competitions = await competitionManager.getAll();
      expect(competitions.length).toBe(0);
      
      // Verify empty state is shown
      const emptyState = document.getElementById('competition-list-empty');
      const table = document.getElementById('competition-list-table');
      expect(emptyState.style.display).toBe('block');
      expect(table.style.display).toBe('none');
    });
  });

  describe('Error Handling', () => {
    test('should dismiss error message when dismiss button is clicked', async () => {
      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const errorContainer = document.getElementById('competition-error-container');
      const dismissButton = document.getElementById('competition-error-dismiss');

      input.value = '';
      addButton.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorContainer.style.display).toBe('flex');

      dismissButton.click();

      expect(errorContainer.style.display).toBe('none');
    });

    test('should auto-hide success messages after 3 seconds', async () => {
      jest.useFakeTimers();

      await competitionManagerUI.show();

      const input = document.getElementById('competition-name-input');
      const addButton = document.getElementById('add-competition-btn');
      const errorContainer = document.getElementById('competition-error-container');

      input.value = 'Auto Hide Test';
      addButton.click();

      // Wait for async operation with real timers briefly
      await new Promise(resolve => {
        jest.useRealTimers();
        setTimeout(resolve, 100);
        jest.useFakeTimers();
      });

      expect(errorContainer.style.display).toBe('flex');
      expect(errorContainer.className).toContain('success');

      jest.advanceTimersByTime(3000);

      expect(errorContainer.style.display).toBe('none');

      jest.useRealTimers();
    });
  });
});
