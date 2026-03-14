/**
 * PresentationNightView Component
 * Main container component for the presentation night winnings distribution interface
 */

import { WinnersTable } from './winnersTable.js';
import { DistributionSummary } from './distributionSummary.js';
import { CompetitionCostsManager } from './competitionCostsManager.js';

export class PresentationNightView {
  /**
   * Create a new PresentationNightView
   * @param {Object} apiClient - API client instance
   */
  constructor(apiClient) {
    if (!apiClient) {
      throw new Error('API client is required');
    }
    
    this.apiClient = apiClient;
    this.container = null;
    this.selectedSeasonId = null;
    this.existingDistribution = null;
    
    // Child components
    this.winnersTable = new WinnersTable(apiClient);
    this.distributionSummary = new DistributionSummary();
    this.competitionCostsManager = new CompetitionCostsManager(apiClient);
    
    // Bind event handlers
    this.handleAmountsChanged = this.handleAmountsChanged.bind(this);
  }

  /**
   * Initialize the view
   * @param {string} containerId - ID of the container element
   */
  initialize(containerId) {
    console.log('PresentationNightView.initialize called with containerId:', containerId);
    const container = document.getElementById(containerId);
    console.log('Found container element:', container);
    console.log('Container parent:', container ? container.parentElement : 'null');
    
    if (!container) {
      throw new Error(`Container element with ID "${containerId}" not found`);
    }
    
    this.container = container;
    this.render();
    this.setupEventListeners();
    
    // Restore selected season from localStorage
    this.restoreSelectedSeason();
  }

  /**
   * Restore selected season from localStorage
   */
  restoreSelectedSeason() {
    try {
      const saved = localStorage.getItem('presentation-night-selected-season');
      if (saved) {
        const seasonId = parseInt(saved);
        const seasonSelect = document.getElementById('season-select');
        if (seasonSelect && seasonId) {
          // Wait for seasons to load, then select the saved season
          setTimeout(() => {
            seasonSelect.value = seasonId;
            if (seasonSelect.value) {
              this.loadSeasonWinners(seasonId);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to restore selected season:', error);
    }
  }

  /**
   * Save selected season to localStorage
   * @param {number} seasonId - Season ID
   */
  saveSelectedSeason(seasonId) {
    try {
      localStorage.setItem('presentation-night-selected-season', seasonId.toString());
    } catch (error) {
      console.error('Failed to save selected season:', error);
    }
  }

  /**
   * Clear saved season from localStorage
   */
  clearSelectedSeason() {
    try {
      localStorage.removeItem('presentation-night-selected-season');
    } catch (error) {
      console.error('Failed to clear selected season:', error);
    }
  }

  /**
   * Render the main view structure
   */
  render() {
    if (!this.container) {
      console.error('Container not initialized');
      return;
    }
    
    this.container.innerHTML = '';
    
    // Create main container
    const mainDiv = document.createElement('div');
    mainDiv.className = 'presentation-night-view';
    mainDiv.style.cssText = 'display: flex; flex-direction: column; gap: 30px;';
    
    // Create header section
    const headerSection = this.createHeaderSection();
    mainDiv.appendChild(headerSection);
    
    // Create distribution section (winners table + summary)
    const distributionSection = this.createDistributionSection();
    mainDiv.appendChild(distributionSection);
    
    // Create competition costs section
    const costsSection = this.createCostsSection();
    mainDiv.appendChild(costsSection);
    
    this.container.appendChild(mainDiv);
    
    // Render the competition costs manager
    this.competitionCostsManager.render('competition-costs-container');
  }

  /**
   * Create the header section with season selection
   * @returns {HTMLElement}
   */
  createHeaderSection() {
    const section = document.createElement('div');
    section.className = 'presentation-night-header';
    section.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #e67e22;';
    
    const heading = document.createElement('h2');
    heading.textContent = 'Presentation Night Winnings Distribution';
    heading.style.cssText = 'color: #2c3e50; font-size: 1.5rem; margin-bottom: 15px;';
    section.appendChild(heading);
    
    // Season selection
    const selectionDiv = document.createElement('div');
    selectionDiv.className = 'season-selection';
    selectionDiv.style.cssText = 'display: flex; align-items: center; gap: 15px;';
    
    const label = document.createElement('label');
    label.htmlFor = 'season-select';
    label.textContent = 'Select Presentation Season:';
    label.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 1rem;';
    selectionDiv.appendChild(label);
    
    const select = document.createElement('select');
    select.id = 'season-select';
    select.className = 'season-select';
    select.style.cssText = 'flex: 1; max-width: 300px; padding: 10px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 1rem; background: white; cursor: pointer;';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a season --';
    select.appendChild(defaultOption);
    
    selectionDiv.appendChild(select);
    section.appendChild(selectionDiv);
    
    // Load seasons
    this.loadSeasons();
    
    return section;
  }

  /**
   * Create the distribution section
   * @returns {HTMLElement}
   */
  createDistributionSection() {
    const section = document.createElement('div');
    section.className = 'distribution-section';
    section.id = 'distribution-section';
    section.style.cssText = 'background: white; padding: 25px; border-radius: 8px; border: 2px solid #ecf0f1; display: none;';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Winnings Distribution';
    heading.style.cssText = 'color: #2c3e50; font-size: 1.3rem; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1;';
    section.appendChild(heading);
    
    // Status message container
    const statusDiv = document.createElement('div');
    statusDiv.id = 'distribution-status';
    statusDiv.className = 'distribution-status';
    statusDiv.style.display = 'none';
    section.appendChild(statusDiv);
    
    // Winners table container
    const winnersContainer = document.createElement('div');
    winnersContainer.id = 'winners-table-container';
    winnersContainer.className = 'winners-table-container';
    winnersContainer.style.cssText = 'margin-bottom: 20px;';
    section.appendChild(winnersContainer);
    
    // Summary container
    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'distribution-summary-container';
    summaryContainer.className = 'distribution-summary-container';
    summaryContainer.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;';
    section.appendChild(summaryContainer);
    
    // Action buttons container
    const actionsDiv = document.createElement('div');
    actionsDiv.id = 'distribution-actions';
    actionsDiv.className = 'distribution-actions';
    actionsDiv.style.cssText = 'display: none; justify-content: center; gap: 15px; padding-top: 20px; border-top: 2px solid #ecf0f1;';
    
    const clearButton = document.createElement('button');
    clearButton.id = 'clear-distribution-btn';
    clearButton.className = 'btn btn-secondary';
    clearButton.textContent = 'Clear All';
    clearButton.style.cssText = 'padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; background: #e74c3c; color: white; transition: background 0.2s;';
    clearButton.addEventListener('mouseenter', () => clearButton.style.background = '#c0392b');
    clearButton.addEventListener('mouseleave', () => clearButton.style.background = '#e74c3c');
    actionsDiv.appendChild(clearButton);
    
    const confirmButton = document.createElement('button');
    confirmButton.id = 'confirm-distribution-btn';
    confirmButton.className = 'btn btn-primary';
    confirmButton.textContent = 'Confirm Distribution';
    confirmButton.style.cssText = 'padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; background: #27ae60; color: white; transition: background 0.2s;';
    confirmButton.addEventListener('mouseenter', () => confirmButton.style.background = '#229954');
    confirmButton.addEventListener('mouseleave', () => confirmButton.style.background = '#27ae60');
    actionsDiv.appendChild(confirmButton);
    
    section.appendChild(actionsDiv);
    
    return section;
  }

  /**
   * Create the competition costs section
   * @returns {HTMLElement}
   */
  createCostsSection() {
    const section = document.createElement('div');
    section.className = 'costs-section';
    section.style.cssText = 'background: white; padding: 25px; border-radius: 8px; border: 2px solid #ecf0f1;';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Competition Costs';
    heading.style.cssText = 'color: #2c3e50; font-size: 1.3rem; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1;';
    section.appendChild(heading);
    
    // Costs manager container
    const costsContainer = document.createElement('div');
    costsContainer.id = 'competition-costs-container';
    costsContainer.className = 'competition-costs-container';
    section.appendChild(costsContainer);
    
    return section;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Season selection change
    const seasonSelect = document.getElementById('season-select');
    if (seasonSelect) {
      seasonSelect.addEventListener('change', (e) => {
        const seasonId = parseInt(e.target.value);
        if (seasonId) {
          this.saveSelectedSeason(seasonId);
          this.loadSeasonWinners(seasonId);
        } else {
          this.clearSelectedSeason();
          this.hideDistributionSection();
        }
      });
    }
    
    // Clear distribution button
    const clearButton = document.getElementById('clear-distribution-btn');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.handleClearDistribution();
      });
    }
    
    // Confirm distribution button
    const confirmButton = document.getElementById('confirm-distribution-btn');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => {
        this.handleConfirmDistribution();
      });
    }
    
    // Listen for amount changes from winners table
    document.addEventListener('amounts-changed', this.handleAmountsChanged);
  }

  /**
   * Load available presentation seasons
   */
  async loadSeasons() {
    try {
      const seasons = await this.apiClient.getAllPresentationSeasons();
      
      const select = document.getElementById('season-select');
      if (!select) return;
      
      // Clear existing options except the default
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add season options
      seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season.id;
        option.textContent = `${season.start_year || season.startYear} - ${season.end_year || season.endYear}`;
        select.appendChild(option);
      });
      
    } catch (error) {
      console.error('Failed to load seasons:', error);
      this.showNotification('Failed to load presentation seasons. Please try again.', 'error');
    }
  }

  /**
   * Load season winners and render the distribution interface
   * @param {number} seasonId - Season ID
   */
  async loadSeasonWinners(seasonId) {
    this.selectedSeasonId = seasonId;
    
    try {
      // Show loading state
      this.showDistributionSection();
      this.showLoadingState();
      
      // Fetch winners and existing distribution in parallel
      const [winners, distribution] = await Promise.all([
        this.apiClient.getSeasonWinners(seasonId),
        this.apiClient.getDistributionBySeason(seasonId)
      ]);
      
      this.existingDistribution = distribution;
      
      // Check if distribution already exists
      const isReadOnly = distribution !== null && !distribution.is_voided && !distribution.isVoided;
      
      console.log('loadSeasonWinners:', {
        seasonId,
        winnersCount: winners.length,
        hasDistribution: !!distribution,
        isReadOnly,
        distribution
      });
      
      if (isReadOnly) {
        this.showDistributionStatus('This season already has a confirmed distribution. Amounts are shown in read-only mode.');
      } else {
        this.hideDistributionStatus();
      }
      
      // Render winners table
      this.winnersTable.render(
        'winners-table-container',
        winners,
        isReadOnly,
        distribution ? distribution.assignments : null
      );
      
      // Calculate and render summary
      const totalDistribution = this.calculateTotalDistribution(winners, distribution);
      this.distributionSummary.render('distribution-summary-container', totalDistribution);
      
      // Show/hide action buttons based on read-only state
      const actionsDiv = document.getElementById('distribution-actions');
      console.log('Actions div:', actionsDiv, 'isReadOnly:', isReadOnly);
      if (actionsDiv) {
        actionsDiv.style.display = isReadOnly ? 'none' : 'flex';
        console.log('Set actionsDiv display to:', actionsDiv.style.display);
      }
      
    } catch (error) {
      console.error('Failed to load season winners:', error);
      this.showNotification(`Failed to load season data: ${error.message}`, 'error');
      this.hideDistributionSection();
    }
  }

  /**
   * Calculate total distribution amount
   * @param {Object[]} winners - Winners array
   * @param {Object} distribution - Existing distribution (if any)
   * @returns {number} Total distribution amount
   */
  calculateTotalDistribution(winners, distribution) {
    if (distribution && distribution.assignments) {
      // Use existing distribution amounts
      return distribution.assignments.reduce((sum, assignment) => {
        return sum + parseFloat(assignment.amount);
      }, 0);
    }
    
    // Calculate from current assignments
    const assignments = this.winnersTable.getAssignments();
    return assignments.reduce((sum, assignment) => sum + assignment.amount, 0);
  }

  /**
   * Handle amounts changed event from winners table
   * @param {CustomEvent} event - Custom event with amounts data
   */
  handleAmountsChanged(event) {
    const assignments = event.detail.amounts;
    const total = assignments.reduce((sum, assignment) => sum + assignment.amount, 0);
    this.distributionSummary.updateTotals(total);
  }

  /**
   * Handle clear distribution button click
   */
  async handleClearDistribution() {
    const confirmed = await this.showConfirmDialog(
      'Clear All Amounts',
      'Are you sure you want to clear all entered amounts?\n\nThis will reset the form and cannot be undone.'
    );
    
    if (!confirmed) return;
    
    // Clear localStorage
    this.winnersTable.clearLocalStorage();
    
    // Reload the current season to refresh the form
    if (this.selectedSeasonId) {
      await this.loadSeasonWinners(this.selectedSeasonId);
      this.showNotification('All amounts cleared successfully', 'success');
    }
  }

  /**
   * Handle confirm distribution button click
   */
  async handleConfirmDistribution() {
    // Validate all input fields first
    if (!this.winnersTable.validateAllInputs()) {
      this.showNotification('Please fix invalid amounts before confirming.', 'error');
      return;
    }
    
    // Get assignments
    const assignments = this.winnersTable.getAssignments();
    
    if (assignments.length === 0) {
      this.showNotification('No winnings have been assigned. Please assign amounts before confirming.', 'error');
      return;
    }
    
    // Validate completeness
    const validation = this.winnersTable.validateAssignments();
    if (!validation.valid) {
      const proceed = await this.showConfirmDialog(
        'Incomplete Assignments',
        validation.warning + '\n\nProceed anyway?'
      );
      if (!proceed) return;
    }
    
    // Prompt for transaction date
    const transactionDate = await this.showDatePickerDialog();
    if (!transactionDate) return;
    
    // Calculate total amount
    const totalAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    
    // Show confirmation dialog
    const confirmed = await this.showConfirmDialog(
      'Confirm Distribution',
      `Confirm distribution of £${totalAmount.toFixed(2)}?\n\n` +
      `This will create a cost transaction and cannot be undone.\n\n` +
      `Transaction Date: ${transactionDate}`
    );
    
    if (!confirmed) return;
    
    // Submit to backend
    try {
      await this.apiClient.createDistribution({
        seasonId: this.selectedSeasonId,
        assignments: assignments,
        transactionDate: transactionDate
      });
      
      this.showNotification('Distribution recorded successfully!', 'success');
      
      // Clear localStorage after successful submission
      this.winnersTable.clearLocalStorage();
      this.clearSelectedSeason();
      
      // Call callback to refresh main app summaries if available
      if (this.onDistributionCreated && typeof this.onDistributionCreated === 'function') {
        try {
          await this.onDistributionCreated();
        } catch (error) {
          console.error('Error in onDistributionCreated callback:', error);
        }
      }
      
      // Refresh view to show read-only state
      await this.loadSeasonWinners(this.selectedSeasonId);
      
    } catch (error) {
      console.error('Failed to create distribution:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Show a date picker dialog
   * @returns {Promise<string|null>} Selected date in YYYY-MM-DD format or null if cancelled
   */
  showDatePickerDialog() {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
      
      // Create modal dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
      
      // Title
      const title = document.createElement('h3');
      title.textContent = 'Select Transaction Date';
      title.style.cssText = 'margin: 0 0 20px 0; color: #2c3e50; font-size: 1.3rem;';
      dialog.appendChild(title);
      
      // Date input
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.style.cssText = 'width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 1rem; margin-bottom: 20px;';
      dateInput.value = new Date().toISOString().split('T')[0]; // Default to today
      dialog.appendChild(dateInput);
      
      // Buttons container
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;';
      cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#7f8c8d');
      cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#95a5a6');
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(null);
      });
      buttonsDiv.appendChild(cancelBtn);
      
      // Confirm button
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm';
      confirmBtn.style.cssText = 'padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;';
      confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#2980b9');
      confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#3498db');
      confirmBtn.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) {
          document.body.removeChild(overlay);
          resolve(selectedDate);
        }
      });
      buttonsDiv.appendChild(confirmBtn);
      
      dialog.appendChild(buttonsDiv);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Focus the date input
      dateInput.focus();
      
      // Handle Enter key
      dateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        } else if (e.key === 'Escape') {
          cancelBtn.click();
        }
      });
    });
  }

  /**
   * Show a confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @returns {Promise<boolean>} True if confirmed, false if cancelled
   */
  showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
      
      // Create modal dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 500px; width: 90%;';
      
      // Title
      const titleEl = document.createElement('h3');
      titleEl.textContent = title;
      titleEl.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50; font-size: 1.3rem;';
      dialog.appendChild(titleEl);
      
      // Message
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      messageEl.style.cssText = 'margin: 0 0 25px 0; color: #34495e; font-size: 1rem; line-height: 1.5; white-space: pre-wrap;';
      dialog.appendChild(messageEl);
      
      // Buttons container
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;';
      cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#7f8c8d');
      cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#95a5a6');
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      buttonsDiv.appendChild(cancelBtn);
      
      // Confirm button
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm';
      confirmBtn.style.cssText = 'padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;';
      confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#229954');
      confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#27ae60');
      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      buttonsDiv.appendChild(confirmBtn);
      
      dialog.appendChild(buttonsDiv);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Focus the confirm button
      confirmBtn.focus();
      
      // Handle Escape key
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          cancelBtn.click();
        }
      });
    });
  }

  /**
   * Show the distribution section
   */
  showDistributionSection() {
    const section = document.getElementById('distribution-section');
    if (section) {
      section.style.display = 'block';
    }
  }

  /**
   * Hide the distribution section
   */
  hideDistributionSection() {
    const section = document.getElementById('distribution-section');
    if (section) {
      section.style.display = 'none';
    }
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const container = document.getElementById('winners-table-container');
    if (container) {
      container.innerHTML = '<p class="loading-message">Loading season data...</p>';
    }
  }

  /**
   * Show distribution status message
   * @param {string} message - Status message
   */
  showDistributionStatus(message) {
    const statusDiv = document.getElementById('distribution-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
      statusDiv.className = 'distribution-status info';
    }
  }

  /**
   * Hide distribution status message
   */
  hideDistributionStatus() {
    const statusDiv = document.getElementById('distribution-status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  /**
   * Show notification message
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    
    // Set background color based on type
    let bgColor = '#3498db'; // info
    if (type === 'success') bgColor = '#27ae60';
    if (type === 'error') bgColor = '#e74c3c';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 1rem;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentElement) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('amounts-changed', this.handleAmountsChanged);
    
    // Destroy child components
    if (this.winnersTable) {
      this.winnersTable.destroy();
    }
    if (this.distributionSummary) {
      this.distributionSummary.destroy();
    }
    if (this.competitionCostsManager) {
      this.competitionCostsManager.destroy();
    }
    
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.selectedSeasonId = null;
    this.existingDistribution = null;
  }
}
