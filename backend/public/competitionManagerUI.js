/**
 * Competition Manager UI Module
 * Handles the user interface for managing competitions
 */

export class CompetitionManagerUI {
  constructor(competitionManager, apiClient) {
    this.competitionManager = competitionManager;
    this.apiClient = apiClient;
    
    // DOM Elements
    this.modal = document.getElementById('competition-manager-modal');
    this.closeButton = document.getElementById('close-competition-manager');
    this.modalOverlay = this.modal?.querySelector('.modal-overlay');
    this.nameInput = document.getElementById('competition-name-input');
    this.typeSelect = document.getElementById('competition-type-select');
    this.seasonSelect = document.getElementById('competition-season-select');
    this.addButton = document.getElementById('add-competition-btn');
    this.listBody = document.getElementById('competition-list-body');
    this.listTable = document.getElementById('competition-list-table');
    this.listEmpty = document.getElementById('competition-list-empty');
    this.errorContainer = document.getElementById('competition-error-container');
    this.errorText = document.getElementById('competition-error-text');
    this.errorDismiss = document.getElementById('competition-error-dismiss');
    
    // State
    this.editingId = null;
    this.seasons = [];
    
    // Bind event handlers
    this.handleClose = this.handleClose.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleSaveEdit = this.handleSaveEdit.bind(this);
    this.handleCancelEdit = this.handleCancelEdit.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.hideError = this.hideError.bind(this);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (this.closeButton) {
      this.closeButton.addEventListener('click', this.handleClose);
    }
    
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', this.handleClose);
    }
    
    if (this.addButton) {
      this.addButton.addEventListener('click', this.handleAdd);
    }
    
    if (this.nameInput) {
      this.nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleAdd();
        }
      });
    }
    
    if (this.errorDismiss) {
      this.errorDismiss.addEventListener('click', this.hideError);
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this.handleClose();
      }
    });
  }

  /**
   * Show the competition manager modal
   */
  async show() {
    console.log('CompetitionManagerUI.show() called');
    if (!this.modal) return;
    
    this.modal.style.display = 'flex';
    this.hideError();
    this.nameInput.value = '';
    this.editingId = null;
    
    // Load seasons
    await this.loadSeasons();
    
    // Load and render competitions
    await this.renderCompetitions();
    
    console.log('About to call renderSeasons()');
    // Load and render seasons
    await this.renderSeasons();
    console.log('renderSeasons() completed');
    
    // Focus on name input
    setTimeout(() => {
      if (this.nameInput) {
        this.nameInput.focus();
      }
    }, 100);
  }
  
  /**
   * Load presentation seasons
   */
  async loadSeasons() {
    try {
      if (!this.apiClient) {
        console.warn('API client not available, cannot load seasons');
        return;
      }
      
      this.seasons = await this.apiClient.getAllPresentationSeasons();
      
      // Update season dropdown
      if (this.seasonSelect) {
        this.seasonSelect.innerHTML = '';
        
        if (this.seasons.length === 0) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No seasons available - create one first';
          option.disabled = true;
          this.seasonSelect.appendChild(option);
        } else {
          this.seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.id;
            option.textContent = season.name;
            if (season.isActive || season.is_active) {
              option.selected = true;
            }
            this.seasonSelect.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
      if (this.seasonSelect) {
        this.seasonSelect.innerHTML = '<option value="">Error loading seasons</option>';
      }
    }
  }

  /**
   * Hide the competition manager modal
   */
  handleClose() {
    if (!this.modal) return;
    
    this.modal.style.display = 'none';
    this.hideError();
    this.nameInput.value = '';
    this.editingId = null;
  }

  /**
   * Render the list of competitions
   */
  async renderCompetitions() {
    try {
      const competitions = await this.competitionManager.getAll();
      
      if (competitions.length === 0) {
        this.listTable.style.display = 'none';
        this.listEmpty.style.display = 'block';
        return;
      }
      
      this.listEmpty.style.display = 'none';
      this.listTable.style.display = 'table';
      
      // Clear existing rows
      this.listBody.innerHTML = '';
      
      // Add rows for each competition
      competitions.forEach(competition => {
        const row = this.createCompetitionRow(competition);
        this.listBody.appendChild(row);
      });
      
    } catch (error) {
      console.error('Error rendering competitions:', error);
      this.showError(`Failed to load competitions: ${error.message}`, 'error');
    }
  }

  /**
   * Create a table row for a competition
   */
  createCompetitionRow(competition) {
    const row = document.createElement('tr');
    row.dataset.competitionId = competition.id;
    
    // Name cell
    const nameCell = document.createElement('td');
    nameCell.className = 'competition-name-cell';
    nameCell.textContent = competition.name;
    row.appendChild(nameCell);
    
    // Actions cell
    const actionsCell = document.createElement('td');
    actionsCell.className = 'action-buttons';
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.textContent = 'Edit';
    editButton.setAttribute('aria-label', `Edit ${competition.name}`);
    editButton.addEventListener('click', () => this.handleEdit(competition.id));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${competition.name}`);
    deleteButton.addEventListener('click', () => this.handleDelete(competition.id));
    
    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);
    
    return row;
  }

  /**
   * Handle add competition
   */
  async handleAdd() {
    const name = this.nameInput.value.trim();
    const type = this.typeSelect?.value || 'singles';
    const seasonId = this.seasonSelect?.value;
    
    if (!name) {
      this.showError('Please enter a competition name.', 'error');
      return;
    }
    
    if (!seasonId) {
      this.showError('Please select a presentation season.', 'error');
      return;
    }
    
    try {
      this.addButton.disabled = true;
      this.addButton.classList.add('loading');
      
      // Create competition directly via API client with all required fields
      if (this.apiClient) {
        await this.apiClient.createCompetition({
          name: name,
          date: new Date().toISOString().split('T')[0],
          type: type,
          seasonId: parseInt(seasonId)
        });
      } else {
        // Fallback to old method (will auto-create season)
        await this.competitionManager.create(name);
      }
      
      this.nameInput.value = '';
      this.showError(`Competition "${name}" added successfully.`, 'success');
      
      // Refresh the list
      await this.renderCompetitions();
      
    } catch (error) {
      console.error('Error adding competition:', error);
      
      if (error.code === 'DUPLICATE_NAME') {
        this.showError(`Competition name "${name}" already exists. Please choose a unique name.`, 'error');
      } else {
        this.showError(`Failed to add competition: ${error.message}`, 'error');
      }
    } finally {
      this.addButton.disabled = false;
      this.addButton.classList.remove('loading');
      this.nameInput.focus();
    }
  }

  /**
   * Handle edit competition
   */
  async handleEdit(competitionId) {
    try {
      const competition = await this.competitionManager.getById(competitionId);
      
      if (!competition) {
        this.showError('Competition not found.', 'error');
        return;
      }
      
      // Find the row
      const row = this.listBody.querySelector(`tr[data-competition-id="${competitionId}"]`);
      if (!row) return;
      
      const nameCell = row.querySelector('.competition-name-cell');
      const actionsCell = row.querySelector('.action-buttons');
      
      // Store original name for cancel
      nameCell.dataset.originalName = competition.name;
      
      // Replace name cell with input
      nameCell.className = 'competition-name-cell editing';
      nameCell.innerHTML = '';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'competition-name-input';
      input.value = competition.name;
      input.maxLength = 255;
      nameCell.appendChild(input);
      
      // Replace action buttons
      actionsCell.innerHTML = '';
      
      const saveButton = document.createElement('button');
      saveButton.className = 'save-edit-button';
      saveButton.textContent = 'Save';
      saveButton.setAttribute('aria-label', 'Save changes');
      saveButton.addEventListener('click', () => this.handleSaveEdit(competitionId));
      
      const cancelButton = document.createElement('button');
      cancelButton.className = 'cancel-edit-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.setAttribute('aria-label', 'Cancel editing');
      cancelButton.addEventListener('click', () => this.handleCancelEdit(competitionId));
      
      actionsCell.appendChild(saveButton);
      actionsCell.appendChild(cancelButton);
      
      // Focus on input
      input.focus();
      input.select();
      
      // Handle Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSaveEdit(competitionId);
        } else if (e.key === 'Escape') {
          this.handleCancelEdit(competitionId);
        }
      });
      
      this.editingId = competitionId;
      
    } catch (error) {
      console.error('Error editing competition:', error);
      this.showError(`Failed to edit competition: ${error.message}`, 'error');
    }
  }

  /**
   * Handle save edit
   */
  async handleSaveEdit(competitionId) {
    const row = this.listBody.querySelector(`tr[data-competition-id="${competitionId}"]`);
    if (!row) return;
    
    const nameCell = row.querySelector('.competition-name-cell');
    const input = nameCell.querySelector('.competition-name-input');
    const actionsCell = row.querySelector('.action-buttons');
    const saveButton = actionsCell.querySelector('.save-edit-button');
    
    if (!input) return;
    
    const newName = input.value.trim();
    
    if (!newName) {
      this.showError('Competition name cannot be empty.', 'error');
      input.focus();
      return;
    }
    
    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.classList.add('loading');
      }
      
      await this.competitionManager.update(competitionId, newName);
      
      this.showError(`Competition updated successfully.`, 'success');
      this.editingId = null;
      
      // Refresh the list
      await this.renderCompetitions();
      
    } catch (error) {
      console.error('Error saving competition:', error);
      
      if (error.code === 'DUPLICATE_NAME') {
        this.showError(`Competition name "${newName}" already exists. Please choose a unique name.`, 'error');
      } else {
        this.showError(`Failed to update competition: ${error.message}`, 'error');
      }
      
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
      }
      
      input.focus();
      input.select();
    }
  }

  /**
   * Handle cancel edit
   */
  handleCancelEdit(competitionId) {
    this.editingId = null;
    
    // Re-render to restore original state
    this.renderCompetitions();
  }

  /**
   * Handle delete competition
   */
  async handleDelete(competitionId) {
    try {
      const competition = await this.competitionManager.getById(competitionId);
      
      if (!competition) {
        this.showError('Competition not found.', 'error');
        return;
      }
      
      // Confirm deletion
      const confirmed = confirm(`Are you sure you want to delete "${competition.name}"?`);
      
      if (!confirmed) {
        return;
      }
      
      // Find the delete button and add loading state
      const row = this.listBody.querySelector(`tr[data-competition-id="${competitionId}"]`);
      const deleteButton = row?.querySelector('.delete-button');
      
      if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.classList.add('loading');
      }
      
      const result = await this.competitionManager.delete(competitionId);
      
      if (result.success) {
        this.showError(`Competition "${competition.name}" deleted successfully.`, 'success');
        
        // Refresh the list
        await this.renderCompetitions();
      } else if (result.reason === 'has_transactions') {
        this.showError(
          `Cannot delete "${competition.name}". It has ${result.count} associated transaction${result.count !== 1 ? 's' : ''}. Please unflag these transactions first.`,
          'error'
        );
        
        if (deleteButton) {
          deleteButton.disabled = false;
          deleteButton.classList.remove('loading');
        }
      } else {
        this.showError(`Failed to delete competition.`, 'error');
        
        if (deleteButton) {
          deleteButton.disabled = false;
          deleteButton.classList.remove('loading');
        }
      }
      
    } catch (error) {
      console.error('Error deleting competition:', error);
      this.showError(`Failed to delete competition: ${error.message}`, 'error');
      
      // Remove loading state on error
      const row = this.listBody.querySelector(`tr[data-competition-id="${competitionId}"]`);
      const deleteButton = row?.querySelector('.delete-button');
      if (deleteButton) {
        deleteButton.disabled = false;
        deleteButton.classList.remove('loading');
      }
    }
  }

  /**
   * Show error/success message
   */
  showError(message, type = 'error') {
    if (!this.errorContainer || !this.errorText) return;
    
    this.errorText.textContent = message;
    this.errorContainer.className = `competition-message ${type}`;
    this.errorContainer.style.display = 'flex';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.hideError();
      }, 3000);
    }
  }

  /**
   * Hide error/success message
   */
  hideError() {
    if (!this.errorContainer) return;
    
    this.errorContainer.style.display = 'none';
    this.errorText.textContent = '';
    this.errorContainer.className = 'competition-message';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

    /**
     * Render the list of presentation seasons
     */
    async renderSeasons() {
      try {
        const seasonListBody = document.getElementById('season-list-body');
        const seasonListTable = document.getElementById('season-list-table');
        const seasonListEmpty = document.getElementById('season-list-empty');

        console.log('Season list DOM elements:', { seasonListBody, seasonListTable, seasonListEmpty });

        if (!seasonListBody || !seasonListTable || !seasonListEmpty) {
          console.warn('Season list DOM elements not found');
          return;
        }

        // Fetch all presentation seasons
        const seasons = await this.apiClient.getAllPresentationSeasons();
        console.log('Fetched seasons:', seasons);

        if (seasons.length === 0) {
          seasonListTable.style.display = 'none';
          seasonListEmpty.style.display = 'block';
          return;
        }

        seasonListEmpty.style.display = 'none';
        seasonListTable.style.display = 'table';

        // Clear existing rows
        seasonListBody.innerHTML = '';

        // Add rows for each season
        seasons.forEach(season => {
          const row = this.createSeasonRow(season);
          seasonListBody.appendChild(row);
        });

      } catch (error) {
        console.error('Error rendering seasons:', error);
        this.showError(`Failed to load seasons: ${error.message}`, 'error');
      }
    }

    /**
     * Create a table row for a season
     */
    createSeasonRow(season) {
      const row = document.createElement('tr');
      row.dataset.seasonId = season.id;

      // Name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = season.name;
      row.appendChild(nameCell);

      // Status cell
      const statusCell = document.createElement('td');
      const isActive = season.isActive || season.is_active;
      statusCell.textContent = isActive ? 'Active' : 'Inactive';
      statusCell.className = isActive ? 'status-active' : 'status-inactive';
      row.appendChild(statusCell);

      // All Competitions Added cell with toggle
      const toggleCell = document.createElement('td');
      toggleCell.className = 'toggle-cell';

      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'toggle-switch';
      toggleLabel.setAttribute('aria-label', `Toggle all competitions added for ${season.name}`);

      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = season.allCompetitionsAdded || season.all_competitions_added || false;
      toggleInput.dataset.seasonId = season.id;
      toggleInput.addEventListener('change', (e) => this.handleToggleAllCompetitionsAdded(season.id, e.target.checked));

      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'toggle-slider';

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSlider);
      toggleCell.appendChild(toggleLabel);

      row.appendChild(toggleCell);

      return row;
    }

    /**
     * Handle toggle of allCompetitionsAdded flag
     */
    async handleToggleAllCompetitionsAdded(seasonId, newValue) {
      try {
        // Update season via API
        await this.apiClient.updatePresentationSeason(seasonId, {
          allCompetitionsAdded: newValue
        });

        // Show success message
        this.showError(`Season status updated successfully.`, 'success');
        
        // Refresh season list to ensure consistency
        await this.renderSeasons();

      } catch (error) {
        console.error('Error updating season:', error);
        this.showError(`Failed to update season status: ${error.message}`, 'error');

        // Revert toggle state
        const toggle = document.querySelector(`input[type="checkbox"][data-season-id="${seasonId}"]`);
        if (toggle) {
          toggle.checked = !newValue;
        }
      }
    }

}
