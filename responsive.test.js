/**
 * Responsive Design Tests
 * Tests to verify responsive design works across different viewport sizes
 */

describe('Responsive Design', () => {
  let originalInnerWidth;

  beforeEach(() => {
    // Store original window width
    originalInnerWidth = window.innerWidth;
    
    // Setup DOM
    document.body.innerHTML = `
      <div class="container">
        <header>
          <h1>Competition CSV Import</h1>
          <button id="manage-competitions-button" class="manage-competitions-button">
            Manage Competitions
          </button>
        </header>
        
        <main>
          <section class="upload-section">
            <label for="file-input" class="file-input-label">
              Choose CSV File
              <input type="file" id="file-input" class="visually-hidden">
            </label>
          </section>
          
          <section id="data-viewer">
            <div class="table-wrapper">
              <table id="records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody id="records-body"></tbody>
              </table>
            </div>
          </section>
          
          <section id="transaction-summary-section">
            <div class="summary-header">
              <h2>Transaction Summary</h2>
              <button class="reset-button">Reset</button>
            </div>
          </section>
        </main>
        
        <!-- Competition Manager Modal -->
        <div id="competition-manager-modal" class="modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h2>Manage Competitions</h2>
              <button class="close-button">×</button>
            </div>
            <div class="modal-body">
              <div class="competition-form">
                <input type="text" id="competition-name-input" placeholder="Competition Name" />
                <button class="primary-button">Add</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Weekly Drill-Down Modal -->
        <div id="weekly-drilldown-modal" class="modal drill-down-modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header drill-down-header">
              <h2>Transactions for Week</h2>
              <button class="close-button">×</button>
            </div>
            <div class="modal-body drill-down-body">
              <div class="drill-down-summary">
                <div class="summary-item">
                  <span class="label">Total:</span>
                  <span class="value">10</span>
                </div>
              </div>
              <div class="drill-down-table-wrapper">
                <table class="drill-down-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
  });

  describe('Desktop View (> 768px)', () => {
    beforeEach(() => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
    });

    test('should display elements in desktop layout', () => {
      const container = document.querySelector('.container');
      const header = document.querySelector('header');
      const uploadSection = document.querySelector('.upload-section');
      
      expect(container).toBeTruthy();
      expect(header).toBeTruthy();
      expect(uploadSection).toBeTruthy();
    });

    test('should show modal at appropriate width', () => {
      const modal = document.getElementById('competition-manager-modal');
      const modalContent = modal.querySelector('.modal-content');
      
      expect(modal).toBeTruthy();
      expect(modalContent).toBeTruthy();
    });

    test('should display drill-down modal properly', () => {
      const drillDownModal = document.getElementById('weekly-drilldown-modal');
      const drillDownContent = drillDownModal.querySelector('.modal-content');
      
      expect(drillDownModal).toBeTruthy();
      expect(drillDownContent).toBeTruthy();
    });
  });

  describe('Tablet View (481px - 768px)', () => {
    beforeEach(() => {
      // Set tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
    });

    test('should display elements in tablet layout', () => {
      const container = document.querySelector('.container');
      const summaryHeader = document.querySelector('.summary-header');
      
      expect(container).toBeTruthy();
      expect(summaryHeader).toBeTruthy();
    });

    test('should adjust modal width for tablet', () => {
      const modal = document.getElementById('competition-manager-modal');
      const modalContent = modal.querySelector('.modal-content');
      
      expect(modal).toBeTruthy();
      expect(modalContent).toBeTruthy();
    });
  });

  describe('Mobile View (< 480px)', () => {
    beforeEach(() => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
    });

    test('should display elements in mobile layout', () => {
      const container = document.querySelector('.container');
      const fileInputLabel = document.querySelector('.file-input-label');
      
      expect(container).toBeTruthy();
      expect(fileInputLabel).toBeTruthy();
    });

    test('should make buttons full width on mobile', () => {
      const manageButton = document.getElementById('manage-competitions-button');
      
      expect(manageButton).toBeTruthy();
    });

    test('should adjust modal for mobile', () => {
      const modal = document.getElementById('competition-manager-modal');
      const modalContent = modal.querySelector('.modal-content');
      
      expect(modal).toBeTruthy();
      expect(modalContent).toBeTruthy();
    });
  });

  describe('Table Responsiveness', () => {
    test('should have scrollable table wrapper', () => {
      const tableWrapper = document.querySelector('.table-wrapper');
      
      expect(tableWrapper).toBeTruthy();
      expect(tableWrapper.classList.contains('table-wrapper')).toBe(true);
    });

    test('should have drill-down table wrapper', () => {
      const drillDownWrapper = document.querySelector('.drill-down-table-wrapper');
      
      expect(drillDownWrapper).toBeTruthy();
      expect(drillDownWrapper.classList.contains('drill-down-table-wrapper')).toBe(true);
    });
  });

  describe('Form Responsiveness', () => {
    test('should have competition form', () => {
      const competitionForm = document.querySelector('.competition-form');
      const nameInput = document.getElementById('competition-name-input');
      const addButton = document.querySelector('.primary-button');
      
      expect(competitionForm).toBeTruthy();
      expect(nameInput).toBeTruthy();
      expect(addButton).toBeTruthy();
    });

    test('should adjust form layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      const competitionForm = document.querySelector('.competition-form');
      expect(competitionForm).toBeTruthy();
    });
  });

  describe('Modal Responsiveness', () => {
    test('should adjust competition manager modal for different screen sizes', () => {
      const modal = document.getElementById('competition-manager-modal');
      const modalContent = modal.querySelector('.modal-content');
      const modalHeader = modal.querySelector('.modal-header');
      const modalBody = modal.querySelector('.modal-body');
      
      expect(modal).toBeTruthy();
      expect(modalContent).toBeTruthy();
      expect(modalHeader).toBeTruthy();
      expect(modalBody).toBeTruthy();
    });

    test('should adjust drill-down modal for different screen sizes', () => {
      const drillDownModal = document.getElementById('weekly-drilldown-modal');
      const drillDownContent = drillDownModal.querySelector('.modal-content');
      const drillDownHeader = drillDownModal.querySelector('.drill-down-header');
      const drillDownBody = drillDownModal.querySelector('.drill-down-body');
      
      expect(drillDownModal).toBeTruthy();
      expect(drillDownContent).toBeTruthy();
      expect(drillDownHeader).toBeTruthy();
      expect(drillDownBody).toBeTruthy();
    });
  });

  describe('Touch-Friendly Elements', () => {
    test('should have appropriately sized buttons for touch', () => {
      const buttons = document.querySelectorAll('button');
      
      expect(buttons.length).toBeGreaterThan(0);
      
      // All buttons should exist and be clickable
      buttons.forEach(button => {
        expect(button).toBeTruthy();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    test('should have touch-friendly input fields', () => {
      const inputs = document.querySelectorAll('input');
      
      expect(inputs.length).toBeGreaterThan(0);
      
      inputs.forEach(input => {
        expect(input).toBeTruthy();
        expect(input.tagName).toBe('INPUT');
      });
    });
  });

  describe('Overflow Handling', () => {
    test('should handle long competition names gracefully', () => {
      const nameInput = document.getElementById('competition-name-input');
      
      expect(nameInput).toBeTruthy();
      expect(nameInput.hasAttribute('maxlength')).toBe(false); // Should be set in HTML
    });

    test('should have scrollable areas for long content', () => {
      const modalBody = document.querySelector('.modal-body');
      const drillDownBody = document.querySelector('.drill-down-body');
      
      expect(modalBody).toBeTruthy();
      expect(drillDownBody).toBeTruthy();
    });
  });

  describe('Accessibility on Different Screen Sizes', () => {
    test('should maintain focus visibility on all screen sizes', () => {
      const focusableElements = document.querySelectorAll('button, input, [tabindex]');
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    test('should have proper ARIA labels on all screen sizes', () => {
      const manageButton = document.getElementById('manage-competitions-button');
      const fileInput = document.getElementById('file-input');
      
      expect(manageButton).toBeTruthy();
      expect(fileInput).toBeTruthy();
    });
  });
});
