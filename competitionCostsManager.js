/**
 * CompetitionCostsManager Component
 * Manages general competition costs (engravings, stationery, equipment, etc.)
 */

export class CompetitionCostsManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.costs = [];
    this.total = 0;
    this.container = null;
  }

  /**
   * Render the competition costs manager
   * @param {string} containerId - ID of the container element
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    
    this.container = container;
    container.innerHTML = '';
    
    // Create main container
    const mainDiv = document.createElement('div');
    mainDiv.className = 'competition-costs-manager';
    mainDiv.style.cssText = 'display: flex; flex-direction: column; gap: 25px;';
    
    // Create form section
    const formSection = this.createFormSection();
    mainDiv.appendChild(formSection);
    
    // Create history section
    const historySection = this.createHistorySection();
    mainDiv.appendChild(historySection);
    
    container.appendChild(mainDiv);
    
    // Load existing costs
    this.loadCosts();
  }

  /**
   * Create the form section for adding new costs
   * @returns {HTMLElement}
   */
  createFormSection() {
    const section = document.createElement('div');
    section.className = 'cost-form-section';
    section.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px solid #ecf0f1;';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Record Competition Cost';
    heading.style.cssText = 'color: #2c3e50; font-size: 1.2rem; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;';
    section.appendChild(heading);
    
    const form = document.createElement('form');
    form.className = 'cost-form';
    form.id = 'cost-form';
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    
    // Description field
    const descriptionGroup = document.createElement('div');
    descriptionGroup.className = 'form-group';
    descriptionGroup.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    
    const descriptionLabel = document.createElement('label');
    descriptionLabel.htmlFor = 'cost-description';
    descriptionLabel.textContent = 'Description:';
    descriptionLabel.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 0.95rem;';
    descriptionGroup.appendChild(descriptionLabel);
    
    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.id = 'cost-description';
    descriptionInput.className = 'form-input';
    descriptionInput.placeholder = 'e.g., Trophy Engraving, Stationery, Equipment';
    descriptionInput.required = true;
    descriptionInput.style.cssText = 'padding: 10px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 1rem;';
    descriptionGroup.appendChild(descriptionInput);
    
    const descriptionError = document.createElement('div');
    descriptionError.className = 'input-error';
    descriptionError.id = 'description-error';
    descriptionError.style.cssText = 'display: none; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
    descriptionGroup.appendChild(descriptionError);
    
    form.appendChild(descriptionGroup);
    
    // Date field
    const dateGroup = document.createElement('div');
    dateGroup.className = 'form-group';
    dateGroup.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    
    const dateLabel = document.createElement('label');
    dateLabel.htmlFor = 'cost-date';
    dateLabel.textContent = 'Date:';
    dateLabel.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 0.95rem;';
    dateGroup.appendChild(dateLabel);
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'cost-date';
    dateInput.className = 'form-input';
    dateInput.value = new Date().toISOString().split('T')[0]; // Default to today
    dateInput.required = true;
    dateInput.style.cssText = 'padding: 10px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 1rem;';
    dateGroup.appendChild(dateInput);
    
    const dateError = document.createElement('div');
    dateError.className = 'input-error';
    dateError.id = 'date-error';
    dateError.style.cssText = 'display: none; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
    dateGroup.appendChild(dateError);
    
    form.appendChild(dateGroup);
    
    // Amount field
    const amountGroup = document.createElement('div');
    amountGroup.className = 'form-group';
    amountGroup.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    
    const amountLabel = document.createElement('label');
    amountLabel.htmlFor = 'cost-amount';
    amountLabel.textContent = 'Amount (£):';
    amountLabel.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 0.95rem;';
    amountGroup.appendChild(amountLabel);
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.id = 'cost-amount';
    amountInput.className = 'form-input';
    amountInput.step = '0.01';
    amountInput.style.cssText = 'padding: 10px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 1rem;';
    amountInput.min = '0.01';
    amountInput.placeholder = '0.00';
    amountInput.required = true;
    amountGroup.appendChild(amountInput);
    
    const amountError = document.createElement('div');
    amountError.className = 'input-error';
    amountError.id = 'amount-error';
    amountError.style.cssText = 'display: none; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
    amountGroup.appendChild(amountError);
    
    form.appendChild(amountGroup);
    
    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = 'Record Cost';
    submitButton.style.cssText = 'padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: all 0.2s; font-weight: 600;';
    submitButton.addEventListener('mouseenter', () => submitButton.style.background = '#2980b9');
    submitButton.addEventListener('mouseleave', () => submitButton.style.background = '#3498db');
    form.appendChild(submitButton);
    
    // Success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.id = 'cost-success-message';
    successMessage.style.cssText = 'display: none; padding: 12px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 6px; font-size: 0.95rem;';
    form.appendChild(successMessage);
    
    // Form submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmitCost();
    });
    
    section.appendChild(form);
    
    return section;
  }

  /**
   * Create the history section for displaying costs
   * @returns {HTMLElement}
   */
  createHistorySection() {
    const section = document.createElement('div');
    section.className = 'cost-history-section';
    section.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Competition Cost History';
    heading.style.cssText = 'color: #2c3e50; font-size: 1.2rem; margin-bottom: 10px;';
    section.appendChild(heading);
    
    // Date range filter
    const filterDiv = this.createDateRangeFilter();
    section.appendChild(filterDiv);
    
    // Costs table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'costs-table-container';
    tableContainer.className = 'costs-table-container';
    section.appendChild(tableContainer);
    
    // Total display
    const totalDiv = document.createElement('div');
    totalDiv.className = 'costs-total';
    totalDiv.id = 'costs-total';
    totalDiv.innerHTML = '<strong>Total:</strong> £0.00';
    totalDiv.style.cssText = 'display: flex; justify-content: flex-end; padding: 15px; background: #f8f9fa; border-radius: 6px; margin-top: 10px; font-size: 1.1rem;';
    section.appendChild(totalDiv);
    
    return section;
  }

  /**
   * Create date range filter controls
   * @returns {HTMLElement}
   */
  createDateRangeFilter() {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'date-range-filter';
    filterDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 15px; background: #f8f9fa; border-radius: 6px;';
    
    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Filter by date range:';
    filterLabel.style.cssText = 'font-weight: 600; color: #2c3e50;';
    filterDiv.appendChild(filterLabel);
    
    // Start date
    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.id = 'filter-start-date';
    startDateInput.className = 'date-input';
    startDateInput.style.cssText = 'padding: 8px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 0.95rem;';
    filterDiv.appendChild(startDateInput);
    
    const toLabel = document.createElement('span');
    toLabel.textContent = ' to ';
    toLabel.style.cssText = 'color: #2c3e50;';
    filterDiv.appendChild(toLabel);
    
    // End date
    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.id = 'filter-end-date';
    endDateInput.className = 'date-input';
    endDateInput.style.cssText = 'padding: 8px 12px; border: 2px solid #ecf0f1; border-radius: 6px; font-size: 0.95rem;';
    filterDiv.appendChild(endDateInput);
    
    // Filter button
    const filterButton = document.createElement('button');
    filterButton.type = 'button';
    filterButton.className = 'btn btn-secondary';
    filterButton.textContent = 'Apply Filter';
    filterButton.style.cssText = 'padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: all 0.2s;';
    filterButton.addEventListener('mouseenter', () => filterButton.style.background = '#7f8c8d');
    filterButton.addEventListener('mouseleave', () => filterButton.style.background = '#95a5a6');
    filterButton.addEventListener('click', () => this.applyDateRangeFilter());
    filterDiv.appendChild(filterButton);
    
    // Clear filter button
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'btn btn-secondary';
    clearButton.textContent = 'Clear Filter';
    clearButton.style.cssText = 'padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: all 0.2s;';
    clearButton.addEventListener('mouseenter', () => clearButton.style.background = '#7f8c8d');
    clearButton.addEventListener('mouseleave', () => clearButton.style.background = '#95a5a6');
    clearButton.addEventListener('click', () => this.clearDateRangeFilter());
    filterDiv.appendChild(clearButton);
    
    return filterDiv;
  }

  /**
   * Load all costs from API
   */
  async loadCosts() {
    try {
      const result = await this.apiClient.getAllCompetitionCosts();
      this.costs = result.costs || [];
      this.total = result.total || 0;
      this.renderCostsTable();
    } catch (error) {
      console.error('Failed to load costs:', error);
      this.showError('Failed to load competition costs. Please try again.');
    }
  }

  /**
   * Render the costs table
   */
  renderCostsTable() {
    const container = document.getElementById('costs-table-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.costs.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'No competition costs recorded yet.';
      emptyMsg.style.cssText = 'text-align: center; padding: 40px 20px; color: #95a5a6; font-size: 1.1rem;';
      container.appendChild(emptyMsg);
      this.updateTotalDisplay();
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'costs-table';
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin-bottom: 20px;';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Date</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Description</th>
        <th style="padding: 12px 15px; text-align: left; background-color: #2c3e50; color: white; font-weight: 600;">Amount</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    
    for (const cost of this.costs) {
      const row = document.createElement('tr');
      row.style.cssText = 'border-bottom: 1px solid #e0e0e0; transition: background-color 0.2s ease;';
      row.addEventListener('mouseenter', () => row.style.backgroundColor = '#f8f9fa');
      row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
      
      // Date
      const dateCell = document.createElement('td');
      dateCell.textContent = cost.transaction_date || cost.transactionDate;
      dateCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
      row.appendChild(dateCell);
      
      // Description
      const descCell = document.createElement('td');
      descCell.textContent = cost.description;
      descCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem;';
      row.appendChild(descCell);
      
      // Amount
      const amountCell = document.createElement('td');
      amountCell.textContent = `£${parseFloat(cost.amount).toFixed(2)}`;
      amountCell.className = 'amount-cell';
      amountCell.style.cssText = 'padding: 12px 15px; font-size: 0.95rem; font-weight: 600; color: #e74c3c;';
      row.appendChild(amountCell);
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    this.updateTotalDisplay();
  }

  /**
   * Update the total display
   */
  updateTotalDisplay() {
    const totalDiv = document.getElementById('costs-total');
    if (totalDiv) {
      totalDiv.innerHTML = `<strong>Total:</strong> £${this.total.toFixed(2)}`;
      totalDiv.style.cssText = 'display: flex; justify-content: flex-end; padding: 15px; background: #f8f9fa; border-radius: 6px; margin-top: 10px; font-size: 1.1rem; font-weight: 600; color: #2c3e50;';
    }
  }

  /**
   * Handle cost form submission
   */
  async handleSubmitCost() {
    const descriptionInput = document.getElementById('cost-description');
    const dateInput = document.getElementById('cost-date');
    const amountInput = document.getElementById('cost-amount');
    const descriptionError = document.getElementById('description-error');
    const dateError = document.getElementById('date-error');
    const amountError = document.getElementById('amount-error');
    const successMessage = document.getElementById('cost-success-message');
    
    // Clear previous errors and messages
    descriptionError.style.display = 'none';
    dateError.style.display = 'none';
    amountError.style.display = 'none';
    successMessage.style.display = 'none';
    descriptionInput.classList.remove('invalid');
    dateInput.classList.remove('invalid');
    amountInput.classList.remove('invalid');
    
    const description = descriptionInput.value.trim();
    const transactionDate = dateInput.value;
    const amount = parseFloat(amountInput.value);
    
    // Validate description
    if (!description) {
      descriptionError.textContent = 'Description is required';
      descriptionError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      descriptionInput.classList.add('invalid');
      descriptionInput.style.borderColor = '#e74c3c';
      return;
    }
    
    // Validate date
    if (!transactionDate) {
      dateError.textContent = 'Date is required';
      dateError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      dateInput.classList.add('invalid');
      dateInput.style.borderColor = '#e74c3c';
      return;
    }
    
    // Validate description uniqueness
    const isDuplicate = this.costs.some(cost => 
      cost.description.toLowerCase() === description.toLowerCase()
    );
    
    if (isDuplicate) {
      descriptionError.textContent = `A cost with description "${description}" already exists. Please use a unique description.`;
      descriptionError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      descriptionInput.classList.add('invalid');
      descriptionInput.style.borderColor = '#e74c3c';
      return;
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      amountError.textContent = 'Amount must be a positive number';
      amountError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      amountInput.classList.add('invalid');
      amountInput.style.borderColor = '#e74c3c';
      return;
    }
    
    // Check decimal places
    const decimalPart = amountInput.value.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      amountError.textContent = 'Maximum 2 decimal places allowed';
      amountError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      amountInput.classList.add('invalid');
      amountInput.style.borderColor = '#e74c3c';
      return;
    }
    
    // Submit to API
    try {
      await this.apiClient.createCompetitionCost({
        description: description,
        amount: amount,
        transactionDate: transactionDate
      });
      
      // Show success message
      successMessage.textContent = 'Cost recorded successfully!';
      successMessage.style.cssText = 'display: block; padding: 12px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 6px; font-size: 0.95rem;';
      
      // Clear form
      descriptionInput.value = '';
      dateInput.value = new Date().toISOString().split('T')[0]; // Reset to today
      amountInput.value = '';
      descriptionInput.style.borderColor = '#ecf0f1';
      dateInput.style.borderColor = '#ecf0f1';
      amountInput.style.borderColor = '#ecf0f1';
      
      // Refresh cost list
      await this.loadCosts();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3000);
      
    } catch (error) {
      console.error('Failed to create cost:', error);
      
      // Handle duplicate description error from API
      if (error.code === 'DUPLICATE_DESCRIPTION') {
        descriptionError.textContent = error.message;
        descriptionError.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
        descriptionInput.classList.add('invalid');
        descriptionInput.style.borderColor = '#e74c3c';
      } else {
        this.showError(`Failed to record cost: ${error.message}`);
      }
    }
  }

  /**
   * Apply date range filter
   */
  async applyDateRangeFilter() {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
      this.showError('Please select both start and end dates');
      return;
    }
    
    if (startDate > endDate) {
      this.showError('Start date must be before or equal to end date');
      return;
    }
    
    try {
      const result = await this.apiClient.getCompetitionCostsByDateRange(startDate, endDate);
      this.costs = result.costs || [];
      this.total = result.total || 0;
      this.renderCostsTable();
    } catch (error) {
      console.error('Failed to filter costs:', error);
      this.showError('Failed to filter costs. Please try again.');
    }
  }

  /**
   * Clear date range filter
   */
  clearDateRangeFilter() {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    
    startDateInput.value = '';
    endDateInput.value = '';
    
    // Reload all costs
    this.loadCosts();
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // You can implement a global notification system here
    // For now, just use alert
    alert(message);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.costs = [];
    this.total = 0;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
