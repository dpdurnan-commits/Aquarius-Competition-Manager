/**
 * Transaction Summary View Component
 * Displays weekly financial summaries in tabular format
 */

/**
 * TransactionSummaryView class
 * Renders weekly financial summaries with Competition Purse and Competition Pot balances
 */
export class TransactionSummaryView {
  /**
   * Create a new TransactionSummaryView
   * @param {string} containerId - ID of the container element
   * @param {Object} weeklyDrillDownView - Optional weekly drill-down view instance
   */
  /**
     * Create a new TransactionSummaryView
     * @param {string} containerId - ID of the container element
     * @param {Object} weeklyDrillDownView - Optional weekly drill-down view instance
     */
    constructor(containerId, weeklyDrillDownView = null) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error(`Container element with ID "${containerId}" not found`);
      }
      this.weeklyDrillDownView = weeklyDrillDownView;
      this.apiClient = null;
      this.weeklySummarizer = null;
    }

  /**
   * Add delete last week button to the view
   * Creates a button at the top of the view for deleting the most recent week's transactions
   */
  addDeleteLastWeekButton() {
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'delete-last-week-container';
    buttonContainer.style.marginBottom = '20px';
    buttonContainer.style.textAlign = 'left';

    // Create delete button
    const button = document.createElement('button');
    button.id = 'delete-last-week-btn';
    button.className = 'delete-last-week-button';
    button.textContent = 'Delete Last Week';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#d32f2f';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';

    // Add hover effect
    button.onmouseenter = () => {
      if (!button.disabled) {
        button.style.backgroundColor = '#b71c1c';
      }
    };
    button.onmouseleave = () => {
      if (!button.disabled) {
        button.style.backgroundColor = '#d32f2f';
      }
    };

    // Attach click handler
    button.onclick = () => this.handleDeleteLastWeek();

    buttonContainer.appendChild(button);

    // Insert at the top of the container
    this.container.insertBefore(buttonContainer, this.container.firstChild);
  }

  /**
   * Handle delete last week button click
   * Retrieves week information, shows confirmation dialog, and deletes transactions
   */
  async handleDeleteLastWeek() {
    const button = document.getElementById('delete-last-week-btn');
    
    if (!button) {
      console.error('Delete last week button not found');
      return;
    }

    // Disable button at start of operation
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';

    try {
      // Check if apiClient is available
      if (!this.apiClient) {
        alert('Error: API client not initialized');
        return;
      }

      // Get last week information
      const weekInfo = await this.apiClient.getLastWeekInfo();

      // Show "No transactions to delete" message if null
      if (!weekInfo) {
        alert('No transactions to delete');
        return;
      }

      // Display confirmation dialog with week details
      const confirmed = confirm(
        `Delete Last Week Transactions?\n\n` +
        `This will permanently delete ${weekInfo.count} transaction(s) ` +
        `from ${weekInfo.startDate} to ${weekInfo.endDate}.\n\n` +
        `This action cannot be undone.`
      );

      // If user cancels, return early
      if (!confirmed) {
        return;
      }

      // Call deleteLastWeek on confirmation
      const result = await this.apiClient.deleteLastWeek();

      // Display success message with deletion count
      alert(`Successfully deleted ${result.deleted} transaction(s)`);

      // Refresh summaries after successful deletion
      await this.refreshSummaries();

    } catch (error) {
      console.error('Error deleting last week:', error);
      alert(`Error: ${error.message}`);
    } finally {
      // Re-enable button in finally block
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }

  /**
   * Refresh summaries after deletion
   * Fetches all remaining transactions and regenerates weekly summaries
   */
  async refreshSummaries() {
    try {
      // Check if dependencies are available
      if (!this.apiClient) {
        throw new Error('API client not initialized');
      }
      if (!this.weeklySummarizer) {
        throw new Error('Weekly summarizer not initialized');
      }

      // Fetch all remaining transactions from backend
      const transactions = await this.apiClient.getAll();

      // Regenerate weekly summaries using weeklySummarizer
      const summaries = this.weeklySummarizer.generateSummaries(transactions);

      // Re-render the summary table
      this.render(summaries);

    } catch (error) {
      console.error('Error refreshing summaries:', error);
      throw error;
    }
  }

  /**
   * Update delete button state based on transaction count
   * Disables button when no transactions exist, enables when transactions exist
   * @param {boolean} hasTransactions - Whether transactions exist
   */
  updateButtonState(hasTransactions) {
    const button = document.getElementById('delete-last-week-btn');
    
    if (!button) {
      return;
    }

    if (hasTransactions) {
      // Enable button when transactions exist
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    } else {
      // Disable button when no transactions exist
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    }
  }


  /**
   * Render weekly summaries in table format
   * Displays summaries in reverse chronological order (latest week first)
   * @param {Array<WeeklySummary>} summaries - Array of weekly summary objects
   */
  render(summaries) {
    try {
      // Clear existing content but preserve the delete button
      const deleteButtonContainer = this.container.querySelector('.delete-last-week-container');
      this.container.innerHTML = '';
      
      // Re-add the delete button if it existed
      if (deleteButtonContainer) {
        this.container.appendChild(deleteButtonContainer);
      }

      // Check if summaries is empty
      if (!summaries || summaries.length === 0) {
        this._renderEmptyState();
        // Update button state - disable when no transactions exist
        this.updateButtonState(false);
        return;
      }

      // Validate summaries array
      if (!Array.isArray(summaries)) {
        console.error('TransactionSummaryView: Invalid summaries data - expected array, got:', typeof summaries);
        this._renderErrorState('Unable to display summaries: Invalid data format');
        return;
      }

      // Reverse the summaries array to show latest week first
      const reversedSummaries = [...summaries].reverse();

      // Create table structure
      const table = this._createTable(reversedSummaries);
      this.container.appendChild(table);
      
      // Update button state - enable when transactions exist
      this.updateButtonState(true);
      
    } catch (error) {
      console.error('TransactionSummaryView: Error in render:', error);
      this._renderErrorState(`Failed to display summaries: ${error.message}`);
    }
  }

  /**
   * Clear the view and show empty state
   */
  clear() {
    this.render([]);
  }

  /**
   * Render empty state message
   * @private
   */
  _renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'transaction-summary-empty';
    emptyState.textContent = 'No transaction data available. Please import a CSV file.';
    this.container.appendChild(emptyState);
  }

  /**
   * Render error state message
   * @param {string} message - Error message to display
   * @private
   */
  _renderErrorState(message) {
    this.container.innerHTML = '';
    const errorState = document.createElement('div');
    errorState.className = 'transaction-summary-error';
    errorState.style.color = '#d32f2f';
    errorState.style.padding = '20px';
    errorState.style.textAlign = 'center';
    errorState.textContent = message || 'An error occurred while displaying the summary.';
    this.container.appendChild(errorState);
  }

  /**
   * Render loading state message
   * @private
   */
  _renderLoadingState() {
    const loadingState = document.createElement('div');
    loadingState.className = 'transaction-summary-loading';
    loadingState.style.padding = '20px';
    loadingState.style.textAlign = 'center';
    loadingState.textContent = 'Calculating summaries...';
    this.container.appendChild(loadingState);
  }

  /**
   * Create the summary table
   * @param {Array<WeeklySummary>} summaries - Array of weekly summary objects
   * @returns {HTMLTableElement} The created table element
   * @private
   */
  _createTable(summaries) {
    try {
      const table = document.createElement('table');
      table.className = 'transaction-summary-table';
      table.setAttribute('aria-label', 'Weekly competition transaction summary');

      // Create table header
      const thead = this._createTableHeader();
      table.appendChild(thead);

      // Create table body
      const tbody = this._createTableBody(summaries);
      table.appendChild(tbody);

      return table;
    } catch (error) {
      console.error('TransactionSummaryView: Error creating table structure:', error);
      throw new Error(`Table creation failed: ${error.message}`);
    }
  }

  /**
   * Create table header with grouped columns
   * @returns {HTMLTableSectionElement} The created thead element
   * @private
   */
  _createTableHeader() {
    const thead = document.createElement('thead');

    // First header row - column groupings
    const groupRow = document.createElement('tr');
    groupRow.innerHTML = `
      <th colspan="2" scope="colgroup">Period</th>
      <th colspan="6" scope="colgroup">Competition Purse (Member Money)</th>
      <th colspan="4" scope="colgroup">Competition Pot (Club Money)</th>
    `;
    thead.appendChild(groupRow);

    // Second header row - individual column headers
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th scope="col">From Date</th>
      <th scope="col">To Date</th>
      <th scope="col">Starting Balance</th>
      <th scope="col">Application Top Up</th>
      <th scope="col">Till Top Up</th>
      <th scope="col">Entries</th>
      <th scope="col">Refunds</th>
      <th scope="col">Final Balance</th>
      <th scope="col">Starting Balance</th>
      <th scope="col">Winnings Paid</th>
      <th scope="col">Costs ${this._createTooltip('Presentation Night Winnings, Trophy Engravings, Stationary etc')}</th>
      <th scope="col">Final Balance</th>
    `;
    thead.appendChild(headerRow);

    return thead;
  }

  /**
   * Create tooltip icon with text
   * @param {string} text - Tooltip text
   * @returns {string} HTML string for tooltip
   * @private
   */
  _createTooltip(text) {
    return `<span class="tooltip" title="${this._escapeHtml(text)}" aria-label="${this._escapeHtml(text)}">ⓘ</span>`;
  }

  /**
   * Create table body with summary rows
   * @param {Array<WeeklySummary>} summaries - Array of weekly summary objects
   * @returns {HTMLTableSectionElement} The created tbody element
   * @private
   */
  _createTableBody(summaries) {
    const tbody = document.createElement('tbody');

    summaries.forEach((summary, index) => {
      try {
        const row = this._createSummaryRow(summary);
        tbody.appendChild(row);
      } catch (error) {
        console.error(`TransactionSummaryView: Error creating row ${index}:`, error, summary);
        // Continue with other rows - don't fail entire table for one bad row
      }
    });

    return tbody;
  }

  /**
   * Create a single summary row
   * @param {WeeklySummary} summary - Weekly summary object
   * @returns {HTMLTableRowElement} The created row element
   * @private
   */
  _createSummaryRow(summary) {
    try {
      const row = document.createElement('tr');

      // Validate summary object has required fields
      if (!summary) {
        throw new Error('Summary object is null or undefined');
      }

      // Make row clickable for drill-down
      row.classList.add('clickable-row');
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `View transactions for week ${this.formatDate(summary.fromDate)} to ${this.formatDate(summary.toDate)}`);
      row.dataset.weekStart = summary.fromDate instanceof Date 
        ? summary.fromDate.toISOString() 
        : new Date(summary.fromDate).toISOString();
      row.dataset.weekEnd = summary.toDate instanceof Date 
        ? summary.toDate.toISOString() 
        : new Date(summary.toDate).toISOString();
      
      // Add click handler to open drill-down view
      if (this.weeklyDrillDownView) {
        const handleClick = () => {
          const weekStart = new Date(row.dataset.weekStart);
          const weekEnd = new Date(row.dataset.weekEnd);
          this.weeklyDrillDownView.show(weekStart, weekEnd);
        };
        
        row.onclick = handleClick;
        
        // Add keyboard support for Enter and Space keys
        row.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        };
      }

      // Date columns
      row.appendChild(this._createCell(this.formatDate(summary.fromDate)));
      row.appendChild(this._createCell(this.formatDate(summary.toDate)));

      // Competition Purse columns - handle null/undefined values
      row.appendChild(this._createCell(this.formatCurrency(summary.startingPurse ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.purseApplicationTopUp ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.purseTillTopUp ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.competitionEntries ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(-(summary.competitionRefunds ?? 0)), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.finalPurse ?? 0), 'monetary'));

      // Competition Pot columns - handle null/undefined values
      row.appendChild(this._createCell(this.formatCurrency(summary.startingPot ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.winningsPaid ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.competitionCosts ?? 0), 'monetary'));
      row.appendChild(this._createCell(this.formatCurrency(summary.finalPot ?? 0), 'monetary'));

      return row;
    } catch (error) {
      console.error('TransactionSummaryView: Error creating summary row:', error);
      throw new Error(`Row creation failed: ${error.message}`);
    }
  }

  /**
   * Create a table cell
   * @param {string} content - Cell content
   * @param {string} className - Optional CSS class name
   * @returns {HTMLTableCellElement} The created cell element
   * @private
   */
  _createCell(content, className = '') {
    const cell = document.createElement('td');
    cell.textContent = content;
    if (className) {
      cell.className = className;
    }
    return cell;
  }

  /**
   * Format a monetary value with currency symbol and 2 decimal places
   * @param {number} value - Monetary value
   * @returns {string} Formatted currency string
   */
  formatCurrency(value) {
    try {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      
      if (isNaN(numValue)) {
        console.warn('TransactionSummaryView: Invalid currency value:', value);
        return '£0.00';
      }
      
      return '£' + numValue.toFixed(2);
    } catch (error) {
      console.error('TransactionSummaryView: Error formatting currency:', error);
      return '£0.00';
    }
  }

  /**
   * Format a date for display
   * @param {Date|string} date - Date object or date string
   * @returns {string} Formatted date string (DD/MM/YYYY)
   */
  formatDate(date) {
    try {
      // Handle null, undefined, or empty values
      if (!date) {
        return '';
      }

      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('TransactionSummaryView: Invalid date value:', date);
        return '';
      }

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('TransactionSummaryView: Error formatting date:', error);
      return '';
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
