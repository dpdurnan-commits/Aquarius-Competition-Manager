/**
 * Weekly Drill-Down View Component (Inline Only)
 * Displays all transactions for a selected weekly period with flagging controls
 * Modal functionality removed - only supports inline display
 */

export class WeeklyDrillDownView {
  /**
   * Create a new WeeklyDrillDownView
   * @param {Object} databaseManager - Database manager instance
   * @param {Object} competitionManager - Competition manager instance
   * @param {Object} transactionFlagger - Transaction flagger instance
   * @param {Object} transactionSummaryView - Transaction summary view instance
   */
  constructor(databaseManager, competitionManager, transactionFlagger, transactionSummaryView) {
    this.databaseManager = databaseManager;
    this.competitionManager = competitionManager;
    this.transactionFlagger = transactionFlagger;
    this.transactionSummaryView = transactionSummaryView;
    
    // Only keep inline functionality
    this.currentWeekStart = null;
    this.currentWeekEnd = null;
    this.transactions = [];
    this.competitions = [];
  }

  /**
   * Show the drill-down view for a specific week (redirects to inline)
   * @param {Date} weekStart - Start date of the week
   * @param {Date} weekEnd - End date of the week
   * @returns {Promise<void>}
   */
  async show(weekStart, weekEnd) {
    // Always use inline view
    await this.showInline(weekStart, weekEnd);
  }

  /**
   * Show the drill-down view inline in a container
   * @param {Date} weekStart - Start date of the week
   * @param {Date} weekEnd - End date of the week
   * @param {string} containerId - ID of the container to render into
   * @returns {Promise<void>}
   */
  async showInline(weekStart, weekEnd, containerId = 'weekly-transactions-container') {
    try {
      console.log('WeeklyDrillDownView: Showing inline transactions for week', weekStart, 'to', weekEnd);
      
      this.currentWeekStart = weekStart;
      this.currentWeekEnd = weekEnd;
      
      // Find or create the container
      let container = this._findOrCreateContainer(containerId);
      
      if (!container) {
        console.error('WeeklyDrillDownView: Could not find or create container');
        return;
      }
      
      // Show container and create content
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      container.style.position = 'relative';
      container.style.zIndex = '1000';
      container.innerHTML = `
        <div class="weekly-transactions-header">
          <h3>Transactions for Week ${this.formatDate(weekStart)} to ${this.formatDate(weekEnd)}</h3>
          <button id="close-weekly-transactions" class="close-button">×</button>
        </div>
        <div class="weekly-transactions-summary">
          <div class="summary-item">
            <span class="label">Total Transactions:</span>
            <span id="weekly-total-count" class="value">0</span>
          </div>
          <div class="summary-item">
            <span class="label">Flagged Winnings:</span>
            <span id="weekly-winnings-total" class="value">£0.00</span>
          </div>
        </div>
        <div id="weekly-loading" class="loading" style="display: block;">
          <div class="spinner"></div>
          <span>Loading transactions...</span>
        </div>
        <div class="weekly-transactions-table-wrapper">
          <table id="weekly-transactions-table" class="weekly-transactions-table" style="display: none;">
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
            <tbody id="weekly-transactions-body">
            </tbody>
          </table>
        </div>
      `;
      
      // Add close button handler
      const closeButton = document.getElementById('close-weekly-transactions');
      if (closeButton) {
        closeButton.addEventListener('click', () => this.hideInline(container.id));
      }
      
      // Load and display transactions
      await this._loadAndDisplayTransactions();
      
      // Scroll to the weekly transactions section
      setTimeout(() => {
        container.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
      
    } catch (error) {
      console.error('WeeklyDrillDownView: Error showing inline drill-down:', error);
      alert('Failed to load transactions. Please try again.');
    }
  }
  /**
   * Find or create the container for inline display
   * @param {string} containerId - Preferred container ID
   * @returns {HTMLElement|null} - Container element
   * @private
   */
  _findOrCreateContainer(containerId) {
    // Try to find existing container
    let container = document.getElementById(containerId);
    
    if (container) {
      return container;
    }
    
    // Try alternative locations
    const locations = [
      'transaction-summary-section',
      'competition-accounts-section', 
      'data-viewer'
    ];
    
    for (const locationId of locations) {
      const location = document.getElementById(locationId);
      if (location) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'weekly-transactions-container';
        container.style.display = 'none';
        location.appendChild(container);
        console.log('WeeklyDrillDownView: Created container in', locationId);
        return container;
      }
    }
    
    // Final fallback - create in body
    const body = document.body;
    if (body) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'weekly-transactions-container';
      container.style.display = 'none';
      body.appendChild(container);
      console.log('WeeklyDrillDownView: Created container in body');
      return container;
    }
    
    return null;
  }

  /**
   * Load and display transactions for the current week
   * @private
   */
  async _loadAndDisplayTransactions() {
    try {
      // Query transactions for the week from backend API
      this.transactions = await this.databaseManager.getByDateRange(this.currentWeekStart, this.currentWeekEnd);
      
      // Get all competitions for enrichment
      this.competitions = await this.competitionManager.getAll();
      
      // Enrich transactions with competition names
      const enrichedTransactions = this._enrichTransactions(this.transactions);
      
      // Hide loading state
      const loadingElement = document.getElementById('weekly-loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      // Show table
      const table = document.getElementById('weekly-transactions-table');
      if (table) {
        table.style.display = 'table';
      }
      
      // Render transactions
      this._renderTransactionsInline(enrichedTransactions);
      
      // Update summary info
      this._updateSummaryInline(enrichedTransactions);
      
    } catch (error) {
      console.error('WeeklyDrillDownView: Error loading transactions:', error);
      
      // Hide loading and show error
      const loadingElement = document.getElementById('weekly-loading');
      if (loadingElement) {
        loadingElement.innerHTML = '<p style="color: red;">Failed to load transactions. Please try again.</p>';
      }
    }
  }
  /**
   * Hide the inline drill-down view
   * @param {string} containerId - ID of the container
   */
  hideInline(containerId = 'weekly-transactions-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
    this.currentWeekStart = null;
    this.currentWeekEnd = null;
  }

  /**
   * Hide the drill-down view (redirects to hideInline)
   */
  hide() {
    this.hideInline();
  }

  /**
   * Refresh the drill-down view with current data
   * @returns {Promise<void>}
   */
  async refresh() {
    if (this.currentWeekStart && this.currentWeekEnd) {
      await this.showInline(this.currentWeekStart, this.currentWeekEnd);
      
      // Call the callback if it exists to refresh the main view
      if (this.onTransactionUpdated) {
        await this.onTransactionUpdated();
      }
    }
  }

  /**
   * Enrich transactions with competition names
   * @param {Array} transactions - Array of transactions
   * @returns {Array} - Enriched transactions
   * @private
   */
  _enrichTransactions(transactions) {
    const competitionMap = new Map(
      this.competitions.map(c => [c.id, c.name])
    );
    
    return transactions.map(t => ({
      ...t,
      winningCompetitionName: t.winningCompetitionId 
        ? competitionMap.get(t.winningCompetitionId) 
        : null
    }));
  }

  /**
   * Render transactions in inline table
   * @param {Array} transactions - Array of enriched transactions
   * @private
   */
  _renderTransactionsInline(transactions) {
    const tbody = document.getElementById('weekly-transactions-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (transactions.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="7" class="empty-message">No transactions found for this week</td>';
      tbody.appendChild(row);
      return;
    }

    transactions.forEach(transaction => {
      const row = this._createTransactionRow(transaction);
      tbody.appendChild(row);
    });

    // Attach event listeners to action buttons
    this._attachInlineActionListeners();
  }
  /**
   * Create a table row for a transaction
   * @param {Object} transaction - Transaction record
   * @returns {HTMLTableRowElement} - Table row element
   * @private
   */
  _createTransactionRow(transaction) {
    const row = document.createElement('tr');
    row.dataset.recordId = transaction.id;

    // Add flagged class if transaction is flagged
    if (transaction.isWinning) {
      row.classList.add('flagged-row');
    }

    // Date
    const dateCell = document.createElement('td');
    dateCell.textContent = this.formatDate(transaction.date);
    row.appendChild(dateCell);

    // Time
    const timeCell = document.createElement('td');
    timeCell.textContent = transaction.time || '';
    row.appendChild(timeCell);

    // Type
    const typeCell = document.createElement('td');
    typeCell.textContent = transaction.type || '';
    row.appendChild(typeCell);

    // Member/Player
    const memberCell = document.createElement('td');
    memberCell.textContent = transaction.member || transaction.player || '';
    row.appendChild(memberCell);

    // Total
    const totalCell = document.createElement('td');
    totalCell.textContent = this.formatCurrency(transaction.total);
    row.appendChild(totalCell);

    // Flag Status
    const flagCell = document.createElement('td');
    if (transaction.isWinning) {
      flagCell.innerHTML = `<span class="flag-indicator">🏆 Flagged</span>`;
    } else {
      flagCell.textContent = 'Not Flagged';
    }
    row.appendChild(flagCell);

    // Actions
    const actionsCell = document.createElement('td');
    
    // Only show flag controls for transactions that can be flagged
    if (this.transactionFlagger.canFlag(transaction)) {
      if (transaction.isWinning) {
        actionsCell.innerHTML = `
          <div class="flagged-indicator">
            <span class="flag-icon" aria-hidden="true">🏆</span>
            <span class="competition-badge">${transaction.winningCompetitionName || 'Unknown Competition'}</span>
            <button class="edit-flag-btn" data-record-id="${transaction.id}" aria-label="Edit flag">Edit</button>
          </div>
        `;
      } else {
        actionsCell.innerHTML = `
          <button class="flag-btn" data-record-id="${transaction.id}" aria-label="Flag as winnings">
            <span class="flag-icon" aria-hidden="true">🏳️</span> Flag as Winnings
          </button>
        `;
      }
    } else {
      actionsCell.innerHTML = '<span class="not-flaggable">Not Flaggable</span>';
    }
    row.appendChild(actionsCell);

    return row;
  }
  /**
   * Update summary info for inline view
   * @param {Array} transactions - Array of enriched transactions
   * @private
   */
  _updateSummaryInline(transactions) {
    const totalCountElement = document.getElementById('weekly-total-count');
    const winningsTotalElement = document.getElementById('weekly-winnings-total');

    if (totalCountElement) {
      totalCountElement.textContent = transactions.length.toString();
    }

    if (winningsTotalElement) {
      const winningsTotal = transactions
        .filter(t => t.isWinning)
        .reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
      winningsTotalElement.textContent = this.formatCurrency(winningsTotal);
    }
  }

  /**
   * Attach event listeners to inline action buttons
   * @private
   */
  _attachInlineActionListeners() {
    // Flag buttons
    const flagButtons = document.querySelectorAll('#weekly-transactions-table .flag-btn');
    flagButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const recordId = parseInt(e.target.closest('.flag-btn').dataset.recordId, 10);
        this._handleFlagTransaction(recordId);
      });
    });

    // Edit flag buttons
    const editButtons = document.querySelectorAll('#weekly-transactions-table .edit-flag-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const recordId = parseInt(e.target.dataset.recordId, 10);
        this._handleEditFlag(recordId);
      });
    });
  }

  /**
   * Handle flag transaction action (uses the same modal as main app)
   * @param {number} recordId - Transaction record ID
   * @private
   */
  async _handleFlagTransaction(recordId) {
    try {
      // Use the same competition selection modal as the main app
      await this._showCompetitionSelectionModal(recordId, 'flag');
    } catch (error) {
      console.error('WeeklyDrillDownView: Error flagging transaction:', error);
      alert(`Failed to flag transaction: ${error.message}`);
    }
  }

  /**
   * Handle edit flag action (uses the same modal as main app)
   * @param {number} recordId - Transaction record ID
   * @private
   */
  async _handleEditFlag(recordId) {
    try {
      // Use the same competition selection modal as the main app
      await this._showCompetitionSelectionModal(recordId, 'edit');
    } catch (error) {
      console.error('WeeklyDrillDownView: Error editing flag:', error);
      alert(`Failed to edit flag: ${error.message}`);
    }
  }
  /**
   * Show competition selection modal (reuses main app modal functionality)
   * @param {number} recordId - Transaction record ID
   * @param {string} mode - 'flag' or 'edit'
   * @private
   */
  async _showCompetitionSelectionModal(recordId, mode) {
    // Get the global showCompetitionSelectionModal function from main app
    if (typeof window.showCompetitionSelectionModal === 'function') {
      await window.showCompetitionSelectionModal(recordId, mode);
      // Refresh after modal closes
      await this.refresh();
    } else {
      // Fallback to simple prompt-based selection
      await this._showSimpleCompetitionSelection(recordId, mode);
    }
  }

  /**
   * Simple competition selection fallback
   * @param {number} recordId - Transaction record ID
   * @param {string} mode - 'flag' or 'edit'
   * @private
   */
  async _showSimpleCompetitionSelection(recordId, mode) {
    try {
      const record = this.transactions.find(r => r.id === recordId);
      if (!record) {
        alert('Transaction not found');
        return;
      }
      
      const competitions = await this.competitionManager.getAll({ finished: false });
      
      if (competitions.length === 0) {
        alert('No active competitions available. Please create a competition first.');
        return;
      }
      
      const competitionNames = competitions.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      let selection;
      
      if (mode === 'edit') {
        selection = prompt(
          `Current competition: ${record.winningCompetitionName || 'None'}\n\n` +
          `Options:\n0. Remove flag\n${competitionNames}\n\nEnter number:`
        );
        
        if (selection !== null) {
          const index = parseInt(selection, 10);
          if (index === 0) {
            await this.transactionFlagger.unflagTransaction(recordId);
          } else if (index > 0 && index <= competitions.length) {
            const competition = competitions[index - 1];
            await this.transactionFlagger.updateFlag(recordId, competition.id);
          }
        }
      } else {
        selection = prompt(`Select competition:\n${competitionNames}\n\nEnter number:`);
        
        if (selection) {
          const index = parseInt(selection, 10) - 1;
          if (index >= 0 && index < competitions.length) {
            const competition = competitions[index];
            await this.transactionFlagger.flagTransaction(recordId, competition.id);
          }
        }
      }
      
      if (selection !== null) {
        await this.refresh();
      }
      
    } catch (error) {
      console.error('WeeklyDrillDownView: Error in simple competition selection:', error);
      alert(`Failed to ${mode} transaction: ${error.message}`);
    }
  }
  /**
   * Format a monetary value with currency symbol
   * @param {number|string} value - Monetary value
   * @returns {string} - Formatted currency string
   */
  formatCurrency(value) {
    try {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      
      if (isNaN(numValue)) {
        return '£0.00';
      }
      
      return '£' + numValue.toFixed(2);
    } catch (error) {
      console.error('WeeklyDrillDownView: Error formatting currency:', error);
      return '£0.00';
    }
  }

  /**
   * Format a date for display
   * @param {Date|string} date - Date object or date string
   * @returns {string} - Formatted date string (DD/MM/YYYY)
   */
  formatDate(date) {
    try {
      if (!date) {
        return '';
      }

      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return '';
      }

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('WeeklyDrillDownView: Error formatting date:', error);
      return '';
    }
  }
}