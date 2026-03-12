/**
 * WinnersTable Component
 * Displays competition winners and provides input fields for assigning winnings amounts
 */

export class WinnersTable {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.winners = [];
    this.amounts = new Map(); // competitionId -> amount
    this.container = null;
    this.isReadOnly = false;
  }

  /**
   * Render the winners table
   * @param {string} containerId - ID of the container element
   * @param {Object[]} winners - Array of season winners
   * @param {boolean} isReadOnly - Whether to render in read-only mode
   * @param {Object} existingAssignments - Existing assignments (for read-only mode)
   */
  render(containerId, winners, isReadOnly = false, existingAssignments = null) {
    this.winners = winners || [];
    this.isReadOnly = isReadOnly;
    
    console.log('WinnersTable.render called:', { 
      winnersCount: this.winners.length, 
      isReadOnly, 
      hasExistingAssignments: !!existingAssignments 
    });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    
    this.container = container;
    container.innerHTML = '';
    
    // If no winners, show empty message
    if (this.winners.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'No competitions found for this season.';
      emptyMsg.style.cssText = 'text-align: center; padding: 40px 20px; color: #95a5a6; font-size: 1.1rem;';
      container.appendChild(emptyMsg);
      return;
    }
    
    // Populate amounts from existing assignments if in read-only mode
    if (isReadOnly && existingAssignments) {
      existingAssignments.forEach(assignment => {
        this.amounts.set(assignment.competitionId || assignment.competition_id, assignment.amount);
      });
    } else if (!isReadOnly) {
      // Load from localStorage for editable mode
      this.loadFromLocalStorage();
      console.log('Loaded amounts from localStorage:', Array.from(this.amounts.entries()));
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'winners-table';
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin-bottom: 20px;';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Competition</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Date</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Type</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Winner(s)</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Amount (£)</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    
    for (const winner of this.winners) {
      const row = this.createWinnerRow(winner);
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Create a table row for a winner
   * @param {Object} winner - Winner data
   * @returns {HTMLTableRowElement}
   */
  createWinnerRow(winner) {
    const row = document.createElement('tr');
    row.style.cssText = 'border-bottom: 1px solid #e0e0e0; transition: background-color 0.2s ease;';
    row.addEventListener('mouseenter', () => row.style.backgroundColor = '#f8f9fa');
    row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
    
    // Competition name
    const nameCell = document.createElement('td');
    nameCell.textContent = winner.competitionName || winner.competition_name;
    nameCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
    row.appendChild(nameCell);
    
    // Date
    const dateCell = document.createElement('td');
    dateCell.textContent = winner.competitionDate || winner.competition_date;
    dateCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
    row.appendChild(dateCell);
    
    // Type
    const typeCell = document.createElement('td');
    typeCell.textContent = winner.competitionType || winner.competition_type;
    typeCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
    row.appendChild(typeCell);
    
    // Winners
    const winnersCell = document.createElement('td');
    winnersCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
    const hasWinners = winner.winners && winner.winners.length > 0;
    
    if (!hasWinners) {
      winnersCell.textContent = 'No winner recorded';
      winnersCell.className = 'no-winner';
      winnersCell.style.cssText += ' color: #95a5a6; font-style: italic;';
    } else if ((winner.competitionType || winner.competition_type) === 'doubles') {
      // Show both names for doubles
      winnersCell.textContent = winner.winners
        .map(w => w.playerName || w.player_name)
        .join(' & ');
    } else {
      // Show single name for singles
      winnersCell.textContent = winner.winners[0].playerName || winner.winners[0].player_name;
    }
    row.appendChild(winnersCell);
    
    // Amount input
    const amountCell = document.createElement('td');
    amountCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
    const competitionId = winner.competitionId || winner.competition_id;
    
    if (hasWinners) {
      if (this.isReadOnly) {
        // Display amount as text in read-only mode
        const amount = this.amounts.get(competitionId) || 0;
        const numAmount = parseFloat(amount);
        amountCell.textContent = `£${numAmount.toFixed(2)}`;
        amountCell.className = 'amount-readonly';
        amountCell.style.cssText += ' font-weight: 600; color: #27ae60;';
      } else {
        // Create input field
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.min = '0';
        input.className = 'amount-input';
        input.dataset.competitionId = competitionId;
        input.value = this.amounts.get(competitionId) || '';
        input.style.cssText = 'width: 120px; padding: 8px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 0.95rem; transition: border-color 0.2s ease;';
        
        input.addEventListener('input', () => {
          this.handleAmountChange(competitionId, input.value, input);
        });
        
        input.addEventListener('blur', () => {
          this.validateAmountInput(input);
        });
        
        input.addEventListener('focus', () => {
          input.style.borderColor = '#3498db';
        });
        
        input.addEventListener('blur', () => {
          if (!input.classList.contains('invalid')) {
            input.style.borderColor = '#ecf0f1';
          }
        });
        
        amountCell.appendChild(input);
        
        // Add error message container
        const errorMsg = document.createElement('div');
        errorMsg.className = 'input-error';
        errorMsg.style.cssText = 'display: none; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
        amountCell.appendChild(errorMsg);
      }
    } else {
      // No winner - disable input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'N/A';
      input.disabled = true;
      input.className = 'amount-input disabled';
      input.style.cssText = 'width: 120px; padding: 8px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 0.95rem; background: #f8f9fa; color: #95a5a6; cursor: not-allowed;';
      amountCell.appendChild(input);
    }
    row.appendChild(amountCell);
    
    return row;
  }

  /**
   * Handle amount input change
   * @param {number} competitionId - Competition ID
   * @param {string} value - Input value
   * @param {HTMLInputElement} input - Input element
   */
  handleAmountChange(competitionId, value, input) {
    // Clear any previous error
    const errorMsg = input.parentElement.querySelector('.input-error');
    if (errorMsg) {
      errorMsg.style.display = 'none';
    }
    input.classList.remove('invalid');
    
    // Store the value (validation happens on blur)
    if (value === '') {
      this.amounts.delete(competitionId);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        this.amounts.set(competitionId, numValue);
      }
    }
    
    // Persist to localStorage
    this.saveToLocalStorage();
    
    // Emit event for total calculation
    document.dispatchEvent(new CustomEvent('amounts-changed', {
      detail: { amounts: this.getAssignments() }
    }));
  }

  /**
   * Save amounts to localStorage
   */
  saveToLocalStorage() {
    try {
      const data = {
        amounts: Array.from(this.amounts.entries())
      };
      localStorage.setItem('presentation-night-amounts', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Load amounts from localStorage
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('presentation-night-amounts');
      if (saved) {
        const data = JSON.parse(saved);
        // Ensure amounts are numbers when loading
        this.amounts = new Map(
          data.amounts.map(([key, value]) => [key, parseFloat(value)])
        );
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  /**
   * Clear localStorage
   */
  clearLocalStorage() {
    try {
      localStorage.removeItem('presentation-night-amounts');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  /**
   * Validate amount input field
   * @param {HTMLInputElement} input - Input element
   * @returns {boolean} - Whether input is valid
   */
  validateAmountInput(input) {
    const value = input.value.trim();
    const errorMsg = input.parentElement.querySelector('.input-error');
    
    // Empty is allowed (means no assignment yet)
    if (value === '') {
      input.classList.remove('invalid');
      if (errorMsg) errorMsg.style.display = 'none';
      return true;
    }
    
    const numValue = parseFloat(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      input.classList.add('invalid');
      input.style.borderColor = '#e74c3c';
      if (errorMsg) {
        errorMsg.textContent = 'Must be a valid number';
        errorMsg.style.display = 'block';
      }
      return false;
    }
    
    // Check if it's non-negative
    if (numValue < 0) {
      input.classList.add('invalid');
      input.style.borderColor = '#e74c3c';
      if (errorMsg) {
        errorMsg.textContent = 'Amount cannot be negative';
        errorMsg.style.display = 'block';
      }
      return false;
    }
    
    // Check decimal places (up to 2)
    const decimalPart = value.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      input.classList.add('invalid');
      input.style.borderColor = '#e74c3c';
      if (errorMsg) {
        errorMsg.textContent = 'Maximum 2 decimal places allowed';
        errorMsg.style.display = 'block';
      }
      return false;
    }
    
    // Valid input
    input.classList.remove('invalid');
    input.style.borderColor = '#ecf0f1';
    if (errorMsg) errorMsg.style.display = 'none';
    return true;
  }

  /**
   * Get all assignments
   * @returns {Object[]} - Array of {competitionId, amount} objects
   */
  getAssignments() {
    const assignments = [];
    
    for (const winner of this.winners) {
      const competitionId = winner.competitionId || winner.competition_id;
      const hasWinners = winner.winners && winner.winners.length > 0;
      
      // Only include competitions with winners
      if (hasWinners) {
        const amount = this.amounts.get(competitionId);
        if (amount !== undefined) {
          assignments.push({
            competitionId: competitionId,
            amount: amount
          });
        }
      }
    }
    
    return assignments;
  }

  /**
   * Validate assignments completeness
   * @returns {Object} - {valid: boolean, warning: string}
   */
  validateAssignments() {
    const winnersWithoutAmounts = [];
    
    for (const winner of this.winners) {
      const competitionId = winner.competitionId || winner.competition_id;
      const hasWinners = winner.winners && winner.winners.length > 0;
      
      // Check if winner has an assigned amount
      if (hasWinners) {
        const amount = this.amounts.get(competitionId);
        if (amount === undefined) {
          winnersWithoutAmounts.push(winner.competitionName || winner.competition_name);
        }
      }
    }
    
    if (winnersWithoutAmounts.length > 0) {
      return {
        valid: false,
        warning: `The following competitions have no assigned amounts:\n${winnersWithoutAmounts.join('\n')}\n\nNote: You can assign £0.00 for physical prizes.`
      };
    }
    
    return {
      valid: true,
      warning: ''
    };
  }

  /**
   * Validate all input fields
   * @returns {boolean} - Whether all inputs are valid
   */
  validateAllInputs() {
    if (this.isReadOnly) return true;
    
    const inputs = this.container.querySelectorAll('.amount-input:not(.disabled)');
    let allValid = true;
    
    inputs.forEach(input => {
      if (!this.validateAmountInput(input)) {
        allValid = false;
      }
    });
    
    return allValid;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.amounts.clear();
    this.winners = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
