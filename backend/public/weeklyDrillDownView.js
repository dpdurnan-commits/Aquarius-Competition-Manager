/**
 * Weekly Drill-Down View Component
 * Displays all transactions for a selected weekly period with flagging controls
 */

/**
 * @typedef {Object} EnhancedRecord
 * @property {number} [id] - Auto-incrementing primary key
 * @property {string} date - Transaction date
 * @property {string} time - Transaction time
 * @property {string} type - Transaction type
 * @property {string} member - Member field
 * @property {string} player - Player name
 * @property {string} total - Total value
 * @property {boolean} isWinning - True if flagged as winnings
 * @property {number|null} winningCompetitionId - Competition ID if flagged
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
    
    this.modal = document.getElementById('weekly-drilldown-modal');
    this.heading = document.getElementById('drill-down-heading');
    this.totalCountElement = document.getElementById('drill-down-total-count');
    this.winningsTotalElement = document.getElementById('drill-down-winnings-total');
    this.loadingElement = document.getElementById('drill-down-loading');
    this.tableBody = document.getElementById('drill-down-body');
    this.closeButton = document.getElementById('close-drill-down');
    
    this.currentWeekStart = null;
    this.currentWeekEnd = null;
    this.transactions = [];
    this.competitions = [];
    
    this._attachEventListeners();
  }

  /**
   * Show the drill-down view for a specific week
   * @param {Date} weekStart - Start date of the week
   * @param {Date} weekEnd - End date of the week
   * @returns {Promise<void>}
   */
  async show(weekStart, weekEnd) {
    try {
      this.currentWeekStart = weekStart;
      this.currentWeekEnd = weekEnd;
      
      // Update heading
      this.heading.textContent = `Transactions for Week ${this.formatDate(weekStart)} to ${this.formatDate(weekEnd)}`;
      
      // Show modal
      this.modal.style.display = 'block';
      
      // Show loading state
      this._showLoading();
      
      // Query transactions for the week from backend API
      this.transactions = await this.databaseManager.getByDateRange(weekStart, weekEnd);
      
      // Get all competitions for enrichment
      this.competitions = await this.competitionManager.getAll();
      
      // Enrich transactions with competition names
      const enrichedTransactions = this._enrichTransactions(this.transactions);
      
      // Hide loading state
      this._hideLoading();
      
      // Render transactions
      this._renderTransactions(enrichedTransactions);
      
      // Update summary info
      this._updateSummary(enrichedTransactions);
      
    } catch (error) {
      console.error('WeeklyDrillDownView: Error showing drill-down:', error);
      this._hideLoading();
      this._renderError('Failed to load transactions. Please try again.');
    }
  }

  /**
   * Hide the drill-down view
   */
  hide() {
    this.modal.style.display = 'none';
    this.currentWeekStart = null;
    this.currentWeekEnd = null;
    this.transactions = [];
  }

  /**
   * Refresh the drill-down view with current data
   * @returns {Promise<void>}
   */
  async refresh() {
    if (this.currentWeekStart && this.currentWeekEnd) {
      await this.show(this.currentWeekStart, this.currentWeekEnd);
      
      // Call the callback if it exists to refresh the main view
      if (this.onTransactionUpdated) {
        await this.onTransactionUpdated();
      }
    }
  }

  /**
   * Enrich transactions with competition names
   * @param {EnhancedRecord[]} transactions - Array of transactions
   * @returns {EnhancedRecord[]} - Enriched transactions
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
   * Render transactions in the table
   * @param {EnhancedRecord[]} transactions - Array of enriched transactions
   * @private
   */
  _renderTransactions(transactions) {
    this.tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
      this._renderEmptyState();
      return;
    }
    
    transactions.forEach(transaction => {
      const row = this._createTransactionRow(transaction);
      this.tableBody.appendChild(row);
    });
  }

  /**
   * Create a table row for a transaction
   * @param {EnhancedRecord} transaction - Transaction record
   * @returns {HTMLTableRowElement} - Table row element
   * @private
   */
  _createTransactionRow(transaction) {
    const row = document.createElement('tr');
    row.className = transaction.isWinning ? 'flagged-row' : '';
    row.dataset.recordId = transaction.id;
    
    // Date
    const dateCell = document.createElement('td');
    dateCell.textContent = transaction.date;
    row.appendChild(dateCell);
    
    // Time
    const timeCell = document.createElement('td');
    timeCell.textContent = transaction.time;
    row.appendChild(timeCell);
    
    // Type
    const typeCell = document.createElement('td');
    typeCell.textContent = transaction.type;
    row.appendChild(typeCell);
    
    // Member/Player
    const memberCell = document.createElement('td');
    memberCell.textContent = transaction.player || transaction.member || '';
    row.appendChild(memberCell);
    
    // Total
    const totalCell = document.createElement('td');
    totalCell.className = 'monetary';
    totalCell.textContent = this.formatCurrency(transaction.total);
    row.appendChild(totalCell);
    
    // Flag Status
    const flagStatusCell = document.createElement('td');
    if (transaction.isWinning) {
      const flagIcon = document.createElement('span');
      flagIcon.className = 'flag-icon';
      flagIcon.textContent = '🏆';
      flagIcon.setAttribute('aria-label', 'Flagged as winnings');
      flagStatusCell.appendChild(flagIcon);
      
      if (transaction.winningCompetitionName) {
        const badge = document.createElement('span');
        badge.className = 'competition-badge';
        badge.textContent = transaction.winningCompetitionName;
        flagStatusCell.appendChild(document.createTextNode(' '));
        flagStatusCell.appendChild(badge);
      }
    }
    row.appendChild(flagStatusCell);
    
    // Actions
    const actionsCell = document.createElement('td');
    
    if (this.transactionFlagger.canFlag(transaction)) {
      if (transaction.isWinning) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-flag-btn';
        editButton.textContent = 'Edit Flag';
        editButton.dataset.recordId = transaction.id;
        editButton.setAttribute('aria-label', `Edit flag for transaction ${transaction.id}`);
        actionsCell.appendChild(editButton);
      } else {
        const flagButton = document.createElement('button');
        flagButton.className = 'flag-btn';
        flagButton.textContent = 'Flag as Winnings';
        flagButton.dataset.recordId = transaction.id;
        flagButton.setAttribute('aria-label', `Flag transaction ${transaction.id} as winnings`);
        actionsCell.appendChild(flagButton);
      }
    }
    row.appendChild(actionsCell);
    
    return row;
  }

  /**
   * Render empty state message
   * @private
   */
  _renderEmptyState() {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'empty-state';
    cell.textContent = 'No transactions found for this week.';
    row.appendChild(cell);
    this.tableBody.appendChild(row);
  }

  /**
   * Render error message
   * @param {string} message - Error message
   * @private
   */
  _renderError(message) {
    this.tableBody.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'error-state';
    cell.style.color = '#d32f2f';
    cell.style.padding = '20px';
    cell.style.textAlign = 'center';
    cell.textContent = message;
    row.appendChild(cell);
    this.tableBody.appendChild(row);
  }

  /**
   * Update summary information
   * @param {EnhancedRecord[]} transactions - Array of transactions
   * @private
   */
  _updateSummary(transactions) {
    // Total count
    this.totalCountElement.textContent = transactions.length;
    
    // Calculate flagged winnings total
    const winningsTotal = transactions
      .filter(t => t.isWinning)
      .reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
    
    this.winningsTotalElement.textContent = this.formatCurrency(winningsTotal);
  }

  /**
   * Show loading state
   * @private
   */
  _showLoading() {
    this.loadingElement.style.display = 'flex';
    this.tableBody.innerHTML = '';
  }

  /**
   * Hide loading state
   * @private
   */
  _hideLoading() {
    this.loadingElement.style.display = 'none';
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Close button
    this.closeButton.addEventListener('click', () => {
      this.hide();
    });
    
    // Close on overlay click
    const overlay = this.modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', () => {
      this.hide();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.hide();
      }
    });
    
    // Keyboard navigation for table rows
    this.tableBody.addEventListener('keydown', (e) => {
      const currentRow = e.target.closest('tr');
      if (!currentRow) return;
      
      let targetRow = null;
      
      // Arrow key navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        targetRow = currentRow.nextElementSibling;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        targetRow = currentRow.previousElementSibling;
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetRow = this.tableBody.firstElementChild;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetRow = this.tableBody.lastElementChild;
      }
      
      // Focus the target row if found
      if (targetRow) {
        const focusableButton = targetRow.querySelector('.flag-btn, .edit-flag-btn');
        if (focusableButton) {
          focusableButton.focus();
        }
      }
    });
    
    // Delegate flag button clicks
    this.tableBody.addEventListener('click', async (e) => {
      const flagBtn = e.target.closest('.flag-btn');
      const editBtn = e.target.closest('.edit-flag-btn');
      
      if (flagBtn) {
        await this._handleFlagClick(flagBtn);
      } else if (editBtn) {
        await this._handleEditFlagClick(editBtn);
      }
    });
  }

  /**
   * Handle flag button click
   * @param {HTMLElement} button - Flag button element
   * @returns {Promise<void>}
   * @private
   */
  async _handleFlagClick(button) {
    const recordId = parseInt(button.dataset.recordId, 10);
    
    try {
      // Show competition selection (this would be implemented in a separate UI component)
      // For now, we'll just show an alert
      const competitions = await this.competitionManager.getAll();
      
      if (competitions.length === 0) {
        alert('No competitions available. Please create a competition first.');
        return;
      }
      
      // Simple selection for now - in production, this would be a modal
      const competitionNames = competitions.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      const selection = prompt(`Select a competition:\n${competitionNames}\n\nEnter the number:`);
      
      if (selection) {
        const index = parseInt(selection, 10) - 1;
        if (index >= 0 && index < competitions.length) {
          const competition = competitions[index];
          await this.transactionFlagger.flagTransaction(recordId, competition.id);
          
          // Refresh the drill-down view
          await this.refresh();
          
          // Refresh the transaction summary view
          // This will be implemented when the summary view is updated
          console.log('Transaction flagged successfully');
        }
      }
    } catch (error) {
      console.error('WeeklyDrillDownView: Error flagging transaction:', error);
      alert(`Failed to flag transaction: ${error.message}`);
    }
  }

  /**
   * Handle edit flag button click
   * @param {HTMLElement} button - Edit flag button element
   * @returns {Promise<void>}
   * @private
   */
  async _handleEditFlagClick(button) {
    const recordId = parseInt(button.dataset.recordId, 10);
    
    try {
      const transaction = this.transactions.find(t => t.id === recordId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      const competitions = await this.competitionManager.getAll();
      
      // Simple selection for now - in production, this would be a modal
      const competitionNames = competitions.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      const action = prompt(
        `Current competition: ${transaction.winningCompetitionName}\n\n` +
        `Options:\n` +
        `0. Remove flag\n` +
        `${competitionNames}\n\n` +
        `Enter the number:`
      );
      
      if (action !== null) {
        const index = parseInt(action, 10);
        
        if (index === 0) {
          // Remove flag
          await this.transactionFlagger.unflagTransaction(recordId);
        } else if (index > 0 && index <= competitions.length) {
          // Update competition
          const competition = competitions[index - 1];
          await this.transactionFlagger.updateFlag(recordId, competition.id);
        } else {
          return; // Invalid selection
        }
        
        // Refresh the drill-down view
        await this.refresh();
        
        console.log('Transaction flag updated successfully');
      }
    } catch (error) {
      console.error('WeeklyDrillDownView: Error editing flag:', error);
      alert(`Failed to edit flag: ${error.message}`);
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
