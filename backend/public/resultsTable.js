/**
 * Results Table Component
 * Displays and manages competition results for a selected competition
 */

export class ResultsTable {
  constructor(apiClient) {
    this.apiClient = apiClient;
    
    // State
    this.results = [];
    this.competition = null;
    this.editingResultId = null;
    
    // DOM Elements
    this.container = null;
    this.tableEl = null;
    this.manualEntryModal = null;
    
    // Bind methods
    this.handleAddManualEntry = this.handleAddManualEntry.bind(this);
    this.handleEditResult = this.handleEditResult.bind(this);
    this.handleDeleteResult = this.handleDeleteResult.bind(this);
    this.handleSaveEdit = this.handleSaveEdit.bind(this);
    this.handleCancelEdit = this.handleCancelEdit.bind(this);
    this.handleCreateManualEntry = this.handleCreateManualEntry.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleReconcile = this.handleReconcile.bind(this);
  }

  /**
   * Load results for a competition
   * @param {number} competitionId - Competition ID
   */
  async loadResults(competitionId) {
    console.log('ResultsTable: Loading results for competition:', competitionId);
    
    // Only set competition if not already set (to preserve name and other properties)
    if (!this.competition || this.competition.id !== competitionId) {
      this.competition = { id: competitionId };
    }
    
    try {
      const result = await this.apiClient.request(`/api/competition-results?competitionId=${competitionId}`, {
        method: 'GET'
      });

      this.results = result.results || [];
      console.log('ResultsTable: Loaded results:', this.results.length);
      
      // Sort by finishing position
      this.results.sort((a, b) => {
        const posA = a.finishingPosition || a.finishing_position;
        const posB = b.finishingPosition || b.finishing_position;
        return posA - posB;
      });
      
      // Render the table
      this.render();
      console.log('ResultsTable: Render complete');
      
      return this.results;
    } catch (error) {
      console.error('ResultsTable: Error loading results:', error);
      const wrappedError = new Error(`Failed to load results: ${error.message}`);
      wrappedError.code = error.code || 'LOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Add a manual result
   * @param {Object} dto - Result data
   */
  async addResult(dto) {
    try {
      const result = await this.apiClient.request('/api/competition-results', {
        method: 'POST',
        body: JSON.stringify(dto)
      });

      const newResult = result.result;
      
      // Add to local state
      this.results.push(newResult);
      
      // Re-sort by position
      this.results.sort((a, b) => {
        const posA = a.finishingPosition || a.finishing_position;
        const posB = b.finishingPosition || b.finishing_position;
        return posA - posB;
      });
      
      // Refresh display
      this.render();
      
      // Dispatch event
      const event = new CustomEvent('results-updated');
      document.dispatchEvent(event);
      
      return newResult;
    } catch (error) {
      const wrappedError = new Error(`Failed to add result: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update a result
   * @param {number} id - Result ID
   * @param {Object} updates - Fields to update
   */
  async updateResult(id, updates) {
    try {
      const result = await this.apiClient.request(`/api/competition-results/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      const updatedResult = result.result;
      
      // Update local state
      const index = this.results.findIndex(r => r.id === id);
      if (index !== -1) {
        this.results[index] = updatedResult;
      }
      
      // Re-sort by position
      this.results.sort((a, b) => {
        const posA = a.finishingPosition || a.finishing_position;
        const posB = b.finishingPosition || b.finishing_position;
        return posA - posB;
      });
      
      // Refresh display
      this.render();
      
      // Dispatch event
      const event = new CustomEvent('results-updated');
      document.dispatchEvent(event);
      
      return updatedResult;
    } catch (error) {
      const wrappedError = new Error(`Failed to update result: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a result
   * @param {number} id - Result ID
   */
  async deleteResult(id) {
    try {
      await this.apiClient.request(`/api/competition-results/${id}`, {
        method: 'DELETE'
      });

      // Remove from local state
      this.results = this.results.filter(r => r.id !== id);
      
      // Refresh display
      this.render();
      
      // Dispatch event
      const event = new CustomEvent('results-updated');
      document.dispatchEvent(event);
    } catch (error) {
      const wrappedError = new Error(`Failed to delete result: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Render the component
   */
  render() {
    if (!this.container) {
      this.container = document.getElementById('results-table-container');
      if (!this.container) {
        console.error('Results table container not found');
        return;
      }
    }

    // Clear existing content
    this.container.innerHTML = '';

    if (!this.competition) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'Select a competition to view results';
      this.container.appendChild(emptyState);
      return;
    }

    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'results-table';

    // Create header with add button
    const header = document.createElement('div');
    header.className = 'results-table-header';

    const title = document.createElement('h3');
    title.textContent = `Results for ${this.competition.name}`;
    header.appendChild(title);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 10px;';

    const reconcileBtn = document.createElement('button');
    reconcileBtn.className = 'btn btn-secondary';
    reconcileBtn.textContent = 'Reconcile Results';
    reconcileBtn.addEventListener('click', this.handleReconcile);
    buttonGroup.appendChild(reconcileBtn);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = 'Add Manual Entry';
    addBtn.addEventListener('click', this.handleAddManualEntry);
    buttonGroup.appendChild(addBtn);

    header.appendChild(buttonGroup);

    wrapper.appendChild(header);

    // Create table
    this.tableEl = document.createElement('table');
    this.tableEl.className = 'results-table-content';

    // Render table based on competition type
    if (this.competition.type === 'singles') {
      this.renderSinglesTable();
    } else {
      this.renderDoublesTable();
    }

    wrapper.appendChild(this.tableEl);

    // Add to container
    this.container.appendChild(wrapper);

    return this.container;
  }

  /**
   * Render singles competition table
   */
  renderSinglesTable() {
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Pos', 'Name', 'Gross', 'Hcp', 'Nett', 'Entry Paid', 'Refund', 'Swindle Money', 'Actions'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    this.tableEl.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    
    if (this.results.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = headers.length;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = 'No results yet. Add manual entries or upload a CSV.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      this.results.forEach(result => {
        const row = this.renderSinglesRow(result);
        tbody.appendChild(row);
      });
    }
    
    this.tableEl.appendChild(tbody);
    
    // Create footer with totals
    const tfoot = document.createElement('tfoot');
    const totalsRow = document.createElement('tr');
    totalsRow.className = 'totals-row';
    
    // Calculate totals
    const totalEntryPaid = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.entryPaid || r.entry_paid || 0);
      return sum + amount;
    }, 0);
    
    const totalRefund = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.competitionRefund || r.competition_refund || 0);
      return sum + amount;
    }, 0);
    
    const totalSwindleMoney = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.swindleMoneyPaid || r.swindle_money_paid || 0);
      return sum + amount;
    }, 0);
    
    // Empty cells for Pos, Name, Gross, Hcp, Nett
    for (let i = 0; i < 5; i++) {
      const td = document.createElement('td');
      if (i === 0) {
        td.textContent = 'Totals:';
        td.style.fontWeight = 'bold';
        td.style.textAlign = 'right';
      }
      totalsRow.appendChild(td);
    }
    
    // Entry Paid total
    const entryTotalCell = document.createElement('td');
    entryTotalCell.textContent = `£${totalEntryPaid.toFixed(2)}`;
    entryTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(entryTotalCell);
    
    // Refund total
    const refundTotalCell = document.createElement('td');
    refundTotalCell.textContent = `£${totalRefund.toFixed(2)}`;
    refundTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(refundTotalCell);
    
    // Swindle Money total
    const swindleTotalCell = document.createElement('td');
    swindleTotalCell.textContent = `£${totalSwindleMoney.toFixed(2)}`;
    swindleTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(swindleTotalCell);
    
    // Empty cell for Actions
    const actionsCell = document.createElement('td');
    totalsRow.appendChild(actionsCell);
    
    tfoot.appendChild(totalsRow);
    this.tableEl.appendChild(tfoot);
  }

  /**
   * Render doubles competition table
   */
  renderDoublesTable() {
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Pos', 'Name', 'Nett', 'Entry Paid', 'Refund', 'Swindle Money', 'Actions'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    this.tableEl.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    
    if (this.results.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = headers.length;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = 'No results yet. Add manual entries or upload a CSV.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      this.results.forEach(result => {
        const row = this.renderDoublesRow(result);
        tbody.appendChild(row);
      });
    }
    
    this.tableEl.appendChild(tbody);
    
    // Create footer with totals
    const tfoot = document.createElement('tfoot');
    const totalsRow = document.createElement('tr');
    totalsRow.className = 'totals-row';
    
    // Calculate totals
    const totalEntryPaid = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.entryPaid || r.entry_paid || 0);
      return sum + amount;
    }, 0);
    
    const totalRefund = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.competitionRefund || r.competition_refund || 0);
      return sum + amount;
    }, 0);
    
    const totalSwindleMoney = this.results.reduce((sum, r) => {
      const amount = parseFloat(r.swindleMoneyPaid || r.swindle_money_paid || 0);
      return sum + amount;
    }, 0);
    
    // Empty cells for Pos, Name, Nett
    for (let i = 0; i < 3; i++) {
      const td = document.createElement('td');
      if (i === 0) {
        td.textContent = 'Totals:';
        td.style.fontWeight = 'bold';
        td.style.textAlign = 'right';
      }
      totalsRow.appendChild(td);
    }
    
    // Entry Paid total
    const entryTotalCell = document.createElement('td');
    entryTotalCell.textContent = `£${totalEntryPaid.toFixed(2)}`;
    entryTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(entryTotalCell);
    
    // Refund total
    const refundTotalCell = document.createElement('td');
    refundTotalCell.textContent = `£${totalRefund.toFixed(2)}`;
    refundTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(refundTotalCell);
    
    // Swindle Money total
    const swindleTotalCell = document.createElement('td');
    swindleTotalCell.textContent = `£${totalSwindleMoney.toFixed(2)}`;
    swindleTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(swindleTotalCell);
    
    // Empty cell for Actions
    const actionsCell = document.createElement('td');
    totalsRow.appendChild(actionsCell);
    
    tfoot.appendChild(totalsRow);
    this.tableEl.appendChild(tfoot);
  }

  /**
   * Render a singles result row
   * @param {Object} result - Result object
   */
  renderSinglesRow(result) {
    const row = document.createElement('tr');
    row.dataset.resultId = result.id;
    
    const isEditing = this.editingResultId === result.id;

    // Position
    const posCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.finishingPosition || result.finishing_position;
      input.dataset.field = 'finishingPosition';
      posCell.appendChild(input);
    } else {
      posCell.textContent = result.finishingPosition || result.finishing_position;
    }
    row.appendChild(posCell);

    // Name
    const nameCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = result.playerName || result.player_name;
      input.dataset.field = 'playerName';
      nameCell.appendChild(input);
    } else {
      nameCell.textContent = result.playerName || result.player_name;
    }
    row.appendChild(nameCell);

    // Gross Score
    const grossCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.grossScore || result.gross_score || '';
      input.dataset.field = 'grossScore';
      grossCell.appendChild(input);
    } else {
      grossCell.textContent = result.grossScore || result.gross_score || '-';
    }
    row.appendChild(grossCell);

    // Handicap
    const hcpCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.handicap || '';
      input.dataset.field = 'handicap';
      hcpCell.appendChild(input);
    } else {
      hcpCell.textContent = result.handicap || '-';
    }
    row.appendChild(hcpCell);

    // Nett Score
    const nettCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.nettScore || result.nett_score || '';
      input.dataset.field = 'nettScore';
      nettCell.appendChild(input);
    } else {
      nettCell.textContent = result.nettScore || result.nett_score || '-';
    }
    row.appendChild(nettCell);

    // Entry Paid
    const entryCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.entryPaid || result.entry_paid || '';
      input.dataset.field = 'entryPaid';
      entryCell.appendChild(input);
    } else {
      const amount = result.entryPaid || result.entry_paid;
      entryCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(entryCell);

    // Competition Refund
    const refundCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.competitionRefund || result.competition_refund || '';
      input.dataset.field = 'competitionRefund';
      refundCell.appendChild(input);
    } else {
      const amount = result.competitionRefund || result.competition_refund;
      refundCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(refundCell);

    // Swindle Money
    const swindleCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.swindleMoneyPaid || result.swindle_money_paid || '';
      input.dataset.field = 'swindleMoneyPaid';
      swindleCell.appendChild(input);
    } else {
      const amount = result.swindleMoneyPaid || result.swindle_money_paid;
      swindleCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(swindleCell);

    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    
    if (isEditing) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-icon btn-save';
      saveBtn.innerHTML = '✓';
      saveBtn.title = 'Save';
      saveBtn.addEventListener('click', () => this.handleSaveEdit(result.id, row));
      actionsCell.appendChild(saveBtn);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-icon btn-cancel';
      cancelBtn.innerHTML = '✕';
      cancelBtn.title = 'Cancel';
      cancelBtn.addEventListener('click', this.handleCancelEdit);
      actionsCell.appendChild(cancelBtn);
    } else {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon btn-edit';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', () => this.handleEditResult(result.id));
      actionsCell.appendChild(editBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon btn-delete';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', () => this.handleDeleteResult(result.id));
      actionsCell.appendChild(deleteBtn);
    }
    
    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Render a doubles result row
   * @param {Object} result - Result object
   */
  renderDoublesRow(result) {
    const row = document.createElement('tr');
    row.dataset.resultId = result.id;
    
    const isEditing = this.editingResultId === result.id;

    // Position
    const posCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.finishingPosition || result.finishing_position;
      input.dataset.field = 'finishingPosition';
      posCell.appendChild(input);
    } else {
      posCell.textContent = result.finishingPosition || result.finishing_position;
    }
    row.appendChild(posCell);

    // Name
    const nameCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = result.playerName || result.player_name;
      input.dataset.field = 'playerName';
      nameCell.appendChild(input);
    } else {
      nameCell.textContent = result.playerName || result.player_name;
    }
    row.appendChild(nameCell);

    // Nett Score
    const nettCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'edit-input';
      input.value = result.nettScore || result.nett_score || '';
      input.dataset.field = 'nettScore';
      nettCell.appendChild(input);
    } else {
      nettCell.textContent = result.nettScore || result.nett_score || '-';
    }
    row.appendChild(nettCell);

    // Entry Paid
    const entryCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.entryPaid || result.entry_paid || '';
      input.dataset.field = 'entryPaid';
      entryCell.appendChild(input);
    } else {
      const amount = result.entryPaid || result.entry_paid;
      entryCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(entryCell);

    // Competition Refund
    const refundCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.competitionRefund || result.competition_refund || '';
      input.dataset.field = 'competitionRefund';
      refundCell.appendChild(input);
    } else {
      const amount = result.competitionRefund || result.competition_refund;
      refundCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(refundCell);

    // Swindle Money
    const swindleCell = document.createElement('td');
    if (isEditing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.className = 'edit-input';
      input.value = result.swindleMoneyPaid || result.swindle_money_paid || '';
      input.dataset.field = 'swindleMoneyPaid';
      swindleCell.appendChild(input);
    } else {
      const amount = result.swindleMoneyPaid || result.swindle_money_paid;
      swindleCell.textContent = amount ? `£${parseFloat(amount).toFixed(2)}` : '-';
    }
    row.appendChild(swindleCell);

    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    
    if (isEditing) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-icon btn-save';
      saveBtn.innerHTML = '✓';
      saveBtn.title = 'Save';
      saveBtn.addEventListener('click', () => this.handleSaveEdit(result.id, row));
      actionsCell.appendChild(saveBtn);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-icon btn-cancel';
      cancelBtn.innerHTML = '✕';
      cancelBtn.title = 'Cancel';
      cancelBtn.addEventListener('click', this.handleCancelEdit);
      actionsCell.appendChild(cancelBtn);
    } else {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon btn-edit';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', () => this.handleEditResult(result.id));
      actionsCell.appendChild(editBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon btn-delete';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', () => this.handleDeleteResult(result.id));
      actionsCell.appendChild(deleteBtn);
    }
    
    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Handle add manual entry button click
   */
  handleAddManualEntry() {
    this.showManualEntryModal();
  }

  /**
   * Handle reconcile button click
   */
  async handleReconcile() {
    if (!this.competition || !this.competition.id) {
      this.showError('No competition selected');
      return;
    }

    // Show loading state
    const reconcileBtn = document.querySelector('.btn-secondary');
    if (reconcileBtn) {
      reconcileBtn.disabled = true;
      reconcileBtn.textContent = 'Reconciling...';
    }

    try {
      const response = await this.apiClient.request(
        `/api/competition-results/competitions/${this.competition.id}/reconcile`,
        {
          method: 'POST'
        }
      );

      // Refresh results table
      await this.refresh();

      // Show summary modal
      this.showReconciliationSummaryModal(response.summary);
    } catch (error) {
      console.error('Error reconciling results:', error);
      this.showError(`Failed to reconcile results: ${error.message}`);
    } finally {
      // Restore button state
      if (reconcileBtn) {
        reconcileBtn.disabled = false;
        reconcileBtn.textContent = 'Reconcile Results';
      }
    }
  }

  /**
   * Handle edit result
   */
  handleEditResult(resultId) {
    this.editingResultId = resultId;
    this.render();
  }

  /**
   * Handle save edit
   */
  async handleSaveEdit(resultId, row) {
    const inputs = row.querySelectorAll('.edit-input, .edit-checkbox');
    const updates = {};

    inputs.forEach(input => {
      const field = input.dataset.field;
      let value;
      
      if (input.type === 'checkbox') {
        value = input.checked;
      } else if (input.type === 'number') {
        value = input.value ? parseFloat(input.value) : null;
      } else {
        value = input.value.trim();
      }
      
      updates[field] = value;
    });

    // Validation
    if (!updates.playerName) {
      this.showError('Player name is required');
      return;
    }
    if (!updates.finishingPosition || updates.finishingPosition <= 0) {
      this.showError('Finishing position must be a positive number');
      return;
    }

    try {
      await this.updateResult(resultId, updates);
      this.editingResultId = null;
      this.showSuccess('Result updated successfully');
    } catch (error) {
      console.error('Error updating result:', error);
      this.showError(`Failed to update result: ${error.message}`);
    }
  }

  /**
   * Handle cancel edit
   */
  handleCancelEdit() {
    this.editingResultId = null;
    this.render();
  }

  /**
   * Handle delete result
   */
  async handleDeleteResult(resultId) {
    const result = this.results.find(r => r.id === resultId);
    if (!result) return;

    const playerName = result.playerName || result.player_name;
    const confirmed = confirm(`Are you sure you want to delete the result for "${playerName}"?`);
    if (!confirmed) return;

    try {
      await this.deleteResult(resultId);
      this.showSuccess('Result deleted successfully');
    } catch (error) {
      console.error('Error deleting result:', error);
      this.showError(`Failed to delete result: ${error.message}`);
    }
  }

  /**
   * Show manual entry modal
   */
  showManualEntryModal() {
    // Remove any existing modal
    if (this.modalContainer) {
      this.modalContainer.remove();
    }

    // Create modal container
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal';
    this.modalContainer.style.display = 'flex';
    this.modalContainer.setAttribute('role', 'dialog');
    this.modalContainer.setAttribute('aria-modal', 'true');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', this.handleCloseModal);
    this.modalContainer.appendChild(overlay);

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.addEventListener('click', (e) => e.stopPropagation());

    // Modal header
    const header = document.createElement('div');
    header.className = 'modal-header';
    const heading = document.createElement('h2');
    heading.textContent = 'Add Manual Entry';
    header.appendChild(heading);
    modalContent.appendChild(header);

    // Modal body
    const body = document.createElement('div');
    body.className = 'modal-body';

    // Position field
    const posGroup = document.createElement('div');
    posGroup.className = 'form-group';
    const posLabel = document.createElement('label');
    posLabel.textContent = 'Finishing Position';
    posLabel.htmlFor = 'result-position-input';
    posGroup.appendChild(posLabel);
    const posInput = document.createElement('input');
    posInput.type = 'number';
    posInput.id = 'result-position-input';
    posInput.className = 'form-control';
    posInput.required = true;
    posInput.min = '1';
    posInput.placeholder = 'Enter position (1, 2, 3...)';
    posGroup.appendChild(posInput);
    body.appendChild(posGroup);

    // Name field
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Player Name';
    nameLabel.htmlFor = 'result-name-input';
    nameGroup.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'result-name-input';
    nameInput.className = 'form-control';
    nameInput.required = true;
    nameInput.placeholder = 'Enter player name';
    nameGroup.appendChild(nameInput);
    body.appendChild(nameGroup);

    // Singles-specific fields
    if (this.competition && this.competition.type === 'singles') {
      // Gross Score
      const grossGroup = document.createElement('div');
      grossGroup.className = 'form-group';
      const grossLabel = document.createElement('label');
      grossLabel.textContent = 'Gross Score (optional)';
      grossLabel.htmlFor = 'result-gross-input';
      grossGroup.appendChild(grossLabel);
      const grossInput = document.createElement('input');
      grossInput.type = 'number';
      grossInput.id = 'result-gross-input';
      grossInput.className = 'form-control';
      grossInput.placeholder = 'Enter gross score';
      grossGroup.appendChild(grossInput);
      body.appendChild(grossGroup);

      // Handicap
      const hcpGroup = document.createElement('div');
      hcpGroup.className = 'form-group';
      const hcpLabel = document.createElement('label');
      hcpLabel.textContent = 'Handicap (optional)';
      hcpLabel.htmlFor = 'result-hcp-input';
      hcpGroup.appendChild(hcpLabel);
      const hcpInput = document.createElement('input');
      hcpInput.type = 'number';
      hcpInput.id = 'result-hcp-input';
      hcpInput.className = 'form-control';
      hcpInput.placeholder = 'Enter handicap';
      hcpGroup.appendChild(hcpInput);
      body.appendChild(hcpGroup);
    }

    // Nett Score
    const nettGroup = document.createElement('div');
    nettGroup.className = 'form-group';
    const nettLabel = document.createElement('label');
    nettLabel.textContent = 'Nett Score (optional)';
    nettLabel.htmlFor = 'result-nett-input';
    nettGroup.appendChild(nettLabel);
    const nettInput = document.createElement('input');
    nettInput.type = 'number';
    nettInput.id = 'result-nett-input';
    nettInput.className = 'form-control';
    nettInput.placeholder = 'Enter nett score';
    nettGroup.appendChild(nettInput);
    body.appendChild(nettGroup);

    // Entry Paid
    const entryGroup = document.createElement('div');
    entryGroup.className = 'form-group';
    const entryLabel = document.createElement('label');
    entryLabel.textContent = 'Entry Fee Paid (optional)';
    entryLabel.htmlFor = 'result-entry-input';
    entryGroup.appendChild(entryLabel);
    const entryInput = document.createElement('input');
    entryInput.type = 'number';
    entryInput.id = 'result-entry-input';
    entryInput.className = 'form-control';
    entryInput.placeholder = 'Enter entry fee amount';
    entryInput.step = '0.01';
    entryInput.min = '0';
    entryGroup.appendChild(entryInput);
    body.appendChild(entryGroup);

    // Competition Refund
    const refundGroup = document.createElement('div');
    refundGroup.className = 'form-group';
    const refundLabel = document.createElement('label');
    refundLabel.textContent = 'Competition Refund (optional)';
    refundLabel.htmlFor = 'result-refund-input';
    refundGroup.appendChild(refundLabel);
    const refundInput = document.createElement('input');
    refundInput.type = 'number';
    refundInput.id = 'result-refund-input';
    refundInput.className = 'form-control';
    refundInput.placeholder = 'Enter refund amount';
    refundInput.step = '0.01';
    refundInput.min = '0';
    refundGroup.appendChild(refundInput);
    body.appendChild(refundGroup);

    modalContent.appendChild(body);

    // Modal footer with inline styles
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'padding: 16px 24px; border-top: 1px solid #ecf0f1; display: flex; justify-content: flex-end; align-items: center; gap: 10px; background: white;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; background: #95a5a6; color: white; display: inline-flex; align-items: center; gap: 6px; min-width: 100px;';
    cancelBtn.addEventListener('click', this.handleCloseModal);
    footer.appendChild(cancelBtn);

    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'btn btn-primary';
    createBtn.textContent = 'Add Result';
    createBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; background: #3498db; color: white; display: inline-flex; align-items: center; gap: 6px; min-width: 120px;';
    createBtn.addEventListener('click', this.handleCreateManualEntry);
    footer.appendChild(createBtn);

    modalContent.appendChild(footer);

    // Add modal content to container
    this.modalContainer.appendChild(modalContent);

    // Add to DOM
    document.body.appendChild(this.modalContainer);

    // Focus first input after a brief delay
    setTimeout(() => posInput.focus(), 100);
  }

  /**
   * Handle create manual entry from modal
   */
  async handleCreateManualEntry() {
    const posInput = document.getElementById('result-position-input');
    const nameInput = document.getElementById('result-name-input');
    const nettInput = document.getElementById('result-nett-input');
    const entryInput = document.getElementById('result-entry-input');
    const refundInput = document.getElementById('result-refund-input');

    const finishingPosition = parseInt(posInput.value, 10);
    const playerName = nameInput.value.trim();
    const nettScore = nettInput.value ? parseInt(nettInput.value, 10) : null;
    const entryPaid = entryInput.value ? parseFloat(entryInput.value) : null;
    const competitionRefund = refundInput.value ? parseFloat(refundInput.value) : null;

    // Validation
    if (!finishingPosition || finishingPosition <= 0) {
      this.showError('Finishing position must be a positive number');
      return;
    }
    if (!playerName) {
      this.showError('Player name is required');
      return;
    }

    const dto = {
      competitionId: this.competition.id,
      finishingPosition,
      playerName,
      nettScore,
      entryPaid,
      competitionRefund
    };

    // Add singles-specific fields
    if (this.competition.type === 'singles') {
      const grossInput = document.getElementById('result-gross-input');
      const hcpInput = document.getElementById('result-hcp-input');
      
      dto.grossScore = grossInput.value ? parseInt(grossInput.value, 10) : null;
      dto.handicap = hcpInput.value ? parseInt(hcpInput.value, 10) : null;
    }

    try {
      await this.addResult(dto);
      this.showSuccess('Result added successfully');
      this.handleCloseModal();
    } catch (error) {
      console.error('Error adding result:', error);
      this.showError(error.message);
    }
  }

  /**
   * Handle close modal
   */
  handleCloseModal() {
    if (this.modalContainer) {
      this.modalContainer.remove();
      this.modalContainer = null;
    }
  }

  /**
   * Show reconciliation summary modal
   * @param {Object} summary - Reconciliation summary object
   */
  showReconciliationSummaryModal(summary) {
    // Remove any existing modal
    if (this.modalContainer) {
      this.modalContainer.remove();
    }

    // Create modal container
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal';
    this.modalContainer.style.display = 'flex';
    this.modalContainer.setAttribute('role', 'dialog');
    this.modalContainer.setAttribute('aria-modal', 'true');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', this.handleCloseModal);
    this.modalContainer.appendChild(overlay);

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.addEventListener('click', (e) => e.stopPropagation());

    // Modal header
    const header = document.createElement('div');
    header.className = 'modal-header';
    const heading = document.createElement('h2');
    heading.textContent = 'Reconciliation Summary';
    header.appendChild(heading);
    modalContent.appendChild(header);

    // Modal body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.cssText = 'padding: 24px;';

    // Name corrections
    const nameCorrectionsGroup = document.createElement('div');
    nameCorrectionsGroup.className = 'summary-item';
    nameCorrectionsGroup.style.cssText = 'margin-bottom: 16px;';
    const nameCorrectionsLabel = document.createElement('strong');
    nameCorrectionsLabel.textContent = 'Name corrections processed: ';
    nameCorrectionsGroup.appendChild(nameCorrectionsLabel);
    const nameCorrectionsValue = document.createElement('span');
    nameCorrectionsValue.textContent = summary.nameCorrections || 0;
    nameCorrectionsGroup.appendChild(nameCorrectionsValue);
    body.appendChild(nameCorrectionsGroup);

    // DNP entries added
    const dnpEntriesGroup = document.createElement('div');
    dnpEntriesGroup.className = 'summary-item';
    dnpEntriesGroup.style.cssText = 'margin-bottom: 16px;';
    const dnpEntriesLabel = document.createElement('strong');
    dnpEntriesLabel.textContent = 'DNP entries added: ';
    dnpEntriesGroup.appendChild(dnpEntriesLabel);
    const dnpEntriesValue = document.createElement('span');
    dnpEntriesValue.textContent = summary.dnpEntriesAdded || 0;
    dnpEntriesGroup.appendChild(dnpEntriesValue);
    body.appendChild(dnpEntriesGroup);

    // Total value reconciled
    const totalValueGroup = document.createElement('div');
    totalValueGroup.className = 'summary-item';
    totalValueGroup.style.cssText = 'margin-bottom: 16px;';
    const totalValueLabel = document.createElement('strong');
    totalValueLabel.textContent = 'Total value reconciled: ';
    totalValueGroup.appendChild(totalValueLabel);
    const totalValueValue = document.createElement('span');
    const totalValue = parseFloat(summary.totalValueReconciled || 0);
    totalValueValue.textContent = `£${totalValue.toFixed(2)}`;
    totalValueGroup.appendChild(totalValueValue);
    body.appendChild(totalValueGroup);

    // Errors (if any)
    if (summary.errors && summary.errors.length > 0) {
      const errorsGroup = document.createElement('div');
      errorsGroup.className = 'summary-errors';
      errorsGroup.style.cssText = 'margin-top: 24px; padding: 16px; background: #fee; border: 1px solid #fcc; border-radius: 6px;';
      
      const errorsLabel = document.createElement('strong');
      errorsLabel.textContent = 'Errors:';
      errorsLabel.style.cssText = 'display: block; margin-bottom: 8px; color: #c00;';
      errorsGroup.appendChild(errorsLabel);

      const errorsList = document.createElement('ul');
      errorsList.style.cssText = 'margin: 0; padding-left: 20px; color: #c00;';
      summary.errors.forEach(error => {
        const errorItem = document.createElement('li');
        errorItem.textContent = error;
        errorsList.appendChild(errorItem);
      });
      errorsGroup.appendChild(errorsList);
      body.appendChild(errorsGroup);
    }

    modalContent.appendChild(body);

    // Modal footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'padding: 16px 24px; border-top: 1px solid #ecf0f1; display: flex; justify-content: flex-end; align-items: center; background: white;';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-primary';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; background: #3498db; color: white; display: inline-flex; align-items: center; gap: 6px; min-width: 100px;';
    closeBtn.addEventListener('click', this.handleCloseModal);
    footer.appendChild(closeBtn);

    modalContent.appendChild(footer);

    // Add modal content to container
    this.modalContainer.appendChild(modalContent);

    // Add to DOM
    document.body.appendChild(this.modalContainer);

    // Focus close button
    setTimeout(() => closeBtn.focus(), 100);
  }

  /**
   * Set the current competition
   * @param {Object} competition - Competition object
   */
  async setCompetition(competition) {
    this.competition = competition;
    
    if (competition) {
      await this.loadResults(competition.id);
    } else {
      this.results = [];
    }
    
    this.render();
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Refresh the component
   */
  async refresh() {
    if (this.competition) {
      try {
        await this.loadResults(this.competition.id);
        this.render();
      } catch (error) {
        console.error('Error refreshing ResultsTable:', error);
        this.showError('Failed to refresh results');
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Close modal if open
    this.handleCloseModal();

    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
