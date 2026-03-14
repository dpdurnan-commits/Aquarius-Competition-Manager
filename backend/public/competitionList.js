/**
 * Competition List Component
 * Displays competitions with filtering by presentation season
 */

export class CompetitionList {
  constructor(apiClient, mode = 'selector') {
    this.apiClient = apiClient;
    this.mode = mode; // 'selector' for transaction flagging, 'management' for competition management
    
    // State
    this.competitions = [];
    this.filteredCompetitions = [];
    this.selectedCompetitionId = null;
    this.currentSeasonFilter = null;
    this.seasons = [];
    this.showFinished = false; // For management mode
    
    // DOM Elements
    this.container = null;
    this.competitionListEl = null;
    this.seasonFilterDropdown = null;
    this.newCompetitionModal = null;
    
    // Callbacks
    this.selectionCallback = null;
    
    // Bind methods
    this.handleCompetitionClick = this.handleCompetitionClick.bind(this);
    this.handleNewCompetitionClick = this.handleNewCompetitionClick.bind(this);
    this.handleSeasonFilterChange = this.handleSeasonFilterChange.bind(this);
    this.handleCreateCompetition = this.handleCreateCompetition.bind(this);
    this.handleDeleteCompetition = this.handleDeleteCompetition.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleViewToggle = this.handleViewToggle.bind(this);
    this.handleMarkFinished = this.handleMarkFinished.bind(this);
    this.handleUnmarkFinished = this.handleUnmarkFinished.bind(this);
  }

  /**
   * Initialize the component
   */
  async initialize() {
    try {
      await this.loadSeasons();
      await this.loadCompetitions();
      console.log('CompetitionList initialized successfully');
    } catch (error) {
      console.error('Error initializing CompetitionList:', error);
      throw error;
    }
  }

  /**
   * Load all seasons for filter dropdown
   */
  async loadSeasons() {
    try {
      const result = await this.apiClient.request('/api/presentation-seasons', {
        method: 'GET'
      });

      this.seasons = result.seasons || [];
      return this.seasons;
    } catch (error) {
      const wrappedError = new Error(`Failed to load seasons: ${error.message}`);
      wrappedError.code = error.code || 'LOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Load all competitions from API
   * @param {number} [seasonId] - Optional season ID to filter by
   */
  async loadCompetitions(seasonId = null) {
    try {
      let options = {};
      
      if (this.mode === 'selector') {
        // For selector mode, always filter to show only unfinished competitions
        options.finished = false;
      } else if (this.mode === 'management') {
        // For management mode, filter based on showFinished toggle
        options.finished = this.showFinished;
      }
      
      if (seasonId) {
        options.seasonId = seasonId;
      }
      
      const competitions = await this.apiClient.getAllCompetitions(options);

      this.competitions = competitions || [];
      
      // Apply current filter if set
      if (this.currentSeasonFilter) {
        this.filterBySeason(this.currentSeasonFilter);
      } else {
        this.filteredCompetitions = [...this.competitions];
      }
      
      return this.competitions;
    } catch (error) {
      const wrappedError = new Error(`Failed to load competitions: ${error.message}`);
      wrappedError.code = error.code || 'LOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Filter competitions by season
   * @param {number} seasonId - Season ID to filter by
   */
  filterBySeason(seasonId) {
    this.currentSeasonFilter = seasonId;
    
    if (!seasonId) {
      this.filteredCompetitions = [...this.competitions];
    } else {
      this.filteredCompetitions = this.competitions.filter(
        comp => (comp.seasonId || comp.season_id) === seasonId
      );
    }
    
    this.render();
  }

  /**
   * Create a new competition
   * @param {Object} dto - Competition data
   */
  async createCompetition(dto) {
    try {
      console.log('Creating competition with data:', dto);
      const result = await this.apiClient.request('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(dto)
      });

      const newCompetition = result.competition;
      console.log('Competition created:', newCompetition);
      
      // Add to local state
      this.competitions.push(newCompetition);
      console.log('Total competitions:', this.competitions.length);
      
      // Re-apply filter
      if (this.currentSeasonFilter) {
        console.log('Applying season filter:', this.currentSeasonFilter);
        this.filterBySeason(this.currentSeasonFilter);
      } else {
        console.log('No filter, showing all competitions');
        this.filteredCompetitions = [...this.competitions];
      }
      
      console.log('Filtered competitions:', this.filteredCompetitions.length);
      
      // Refresh display
      this.render();
      console.log('Render complete');
      
      return newCompetition;
    } catch (error) {
      const wrappedError = new Error(`Failed to create competition: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a competition
   * @param {number} id - Competition ID
   */
  async deleteCompetition(id) {
    try {
      await this.apiClient.request(`/api/competitions/${id}`, {
        method: 'DELETE'
      });

      // Remove from local state
      this.competitions = this.competitions.filter(c => c.id !== id);
      this.filteredCompetitions = this.filteredCompetitions.filter(c => c.id !== id);
      
      // Clear selection if deleted competition was selected
      if (this.selectedCompetitionId === id) {
        this.selectedCompetitionId = null;
      }
      
      // Refresh display
      this.render();
    } catch (error) {
      const wrappedError = new Error(`Failed to delete competition: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Register callback for competition selection
   * @param {Function} callback - Callback function that receives competition object
   */
  onCompetitionSelect(callback) {
    this.selectionCallback = callback;
  }

  /**
   * Render the component
   */
  render(containerId) {
    // If containerId is provided, use it to find the container
    if (containerId) {
      this.container = document.getElementById(containerId);
    }
    
    if (!this.container) {
      this.container = document.getElementById('competition-list-container');
      if (!this.container) {
        console.error('Competition list container not found');
        return;
      }
    }

    // Clear existing content
    this.container.innerHTML = '';

    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'competition-list';

    // Create header with filter and new button
    const header = document.createElement('div');
    header.className = 'competition-list-header';

    // Add toggle control for management mode
    if (this.mode === 'management') {
      const toggleSection = document.createElement('div');
      toggleSection.className = 'view-toggle-container';
      
      const activeRadio = document.createElement('input');
      activeRadio.type = 'radio';
      activeRadio.id = 'view-active-competitions';
      activeRadio.name = 'competition-view';
      activeRadio.value = 'active';
      activeRadio.checked = !this.showFinished;
      activeRadio.addEventListener('change', () => this.handleViewToggle(false));
      
      const activeLabel = document.createElement('label');
      activeLabel.htmlFor = 'view-active-competitions';
      activeLabel.textContent = 'Active Competitions';
      
      const finishedRadio = document.createElement('input');
      finishedRadio.type = 'radio';
      finishedRadio.id = 'view-finished-competitions';
      finishedRadio.name = 'competition-view';
      finishedRadio.value = 'finished';
      finishedRadio.checked = this.showFinished;
      finishedRadio.addEventListener('change', () => this.handleViewToggle(true));
      
      const finishedLabel = document.createElement('label');
      finishedLabel.htmlFor = 'view-finished-competitions';
      finishedLabel.textContent = 'Finished Competitions';
      
      toggleSection.appendChild(activeRadio);
      toggleSection.appendChild(activeLabel);
      toggleSection.appendChild(finishedRadio);
      toggleSection.appendChild(finishedLabel);
      
      header.appendChild(toggleSection);
    }

    // Season filter dropdown
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Filter by Season:';
    filterLabel.htmlFor = 'season-filter-dropdown';
    filterSection.appendChild(filterLabel);

    this.seasonFilterDropdown = document.createElement('select');
    this.seasonFilterDropdown.id = 'season-filter-dropdown';
    this.seasonFilterDropdown.className = 'season-filter-dropdown';
    this.seasonFilterDropdown.addEventListener('change', this.handleSeasonFilterChange);

    // Add "All Seasons" option
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Seasons';
    allOption.selected = !this.currentSeasonFilter;
    this.seasonFilterDropdown.appendChild(allOption);

    // Add season options
    this.seasons.forEach(season => {
      const option = document.createElement('option');
      option.value = season.id;
      option.textContent = season.name;
      option.selected = this.currentSeasonFilter === season.id;
      this.seasonFilterDropdown.appendChild(option);
    });

    filterSection.appendChild(this.seasonFilterDropdown);
    header.appendChild(filterSection);

    // New competition button
    const newCompetitionBtn = document.createElement('button');
    newCompetitionBtn.className = 'btn btn-primary';
    newCompetitionBtn.textContent = 'New Competition';
    newCompetitionBtn.addEventListener('click', this.handleNewCompetitionClick);
    header.appendChild(newCompetitionBtn);

    wrapper.appendChild(header);

    // Create competition list
    this.competitionListEl = document.createElement('div');
    this.competitionListEl.className = 'competition-items';

    if (this.filteredCompetitions.length === 0) {
      // Empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      const emptyMessage = this.mode === 'management' && this.showFinished 
        ? 'No finished competitions found' 
        : 'No active competitions found';
      emptyState.textContent = emptyMessage;
      this.competitionListEl.appendChild(emptyState);
    } else {
      // Render competition items
      this.filteredCompetitions.forEach(competition => {
        const item = this.renderCompetitionItem(competition);
        this.competitionListEl.appendChild(item);
      });
    }

    wrapper.appendChild(this.competitionListEl);

    // Add to container
    this.container.appendChild(wrapper);

    return this.container;
  }

  /**
   * Render a single competition item
   * @param {Object} competition - Competition object
   */
  renderCompetitionItem(competition) {
    const item = document.createElement('div');
    item.className = 'competition-item';
    item.dataset.competitionId = competition.id;
    
    // Add finished status class
    if (competition.finished) {
      item.classList.add('finished-competition');
    }
    
    // Highlight if selected
    if (this.selectedCompetitionId === competition.id) {
      item.classList.add('selected');
    }

    // Competition info
    const info = document.createElement('div');
    info.className = 'competition-info';
    info.addEventListener('click', () => this.handleCompetitionClick(competition));

    const name = document.createElement('div');
    name.className = 'competition-name';
    name.textContent = competition.name;
    
    // Add finished status indicator
    if (competition.finished) {
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'status-indicator finished';
      statusIndicator.textContent = ' (Finished)';
      name.appendChild(statusIndicator);
    }
    
    info.appendChild(name);

    const details = document.createElement('div');
    details.className = 'competition-details';

    // Format date (DD/MM/YYYY)
    const dateStr = this.formatDate(competition.date);
    const dateSpan = document.createElement('span');
    dateSpan.className = 'competition-date';
    dateSpan.textContent = dateStr;
    details.appendChild(dateSpan);

    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = `competition-type-badge type-${competition.type}`;
    typeBadge.textContent = competition.type === 'singles' ? 'Singles' : 'Doubles';
    details.appendChild(typeBadge);

    // Result count (placeholder - will be populated from API)
    const resultCount = document.createElement('span');
    resultCount.className = 'result-count';
    resultCount.textContent = `${competition.resultCount || 0} results`;
    details.appendChild(resultCount);

    info.appendChild(details);
    item.appendChild(info);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'competition-actions';

    // Delete button (always present)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete competition';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteCompetition(competition.id);
    });
    actions.appendChild(deleteBtn);

    // Add finished status button for management mode
    if (this.mode === 'management') {
      const finishedBtn = document.createElement('button');
      if (competition.finished) {
        finishedBtn.className = 'btn-icon unmark-finished-button';
        finishedBtn.innerHTML = '↩️';
        finishedBtn.title = 'Unmark as finished';
        finishedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleUnmarkFinished(competition.id);
        });
      } else {
        finishedBtn.className = 'btn-icon mark-finished-button';
        finishedBtn.innerHTML = '✅';
        finishedBtn.title = 'Mark as finished';
        finishedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleMarkFinished(competition.id);
        });
      }
      actions.appendChild(finishedBtn);
    }

    item.appendChild(actions);

    return item;
  }

  /**
   * Format date string to DD/MM/YYYY
   * @param {string} dateStr - Date string (YYYY-MM-DD or DD/MM/YYYY)
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    
    // If already in DD/MM/YYYY format
    if (dateStr.includes('/')) {
      return dateStr;
    }
    
    // Convert from YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    return dateStr;
  }

  /**
   * Handle competition item click
   */
  handleCompetitionClick(competition) {
    console.log('Competition clicked:', competition);
    this.selectedCompetitionId = competition.id;
    
    // Update UI
    this.render();
    
    // Notify callback
    if (this.selectionCallback) {
      console.log('Calling selection callback');
      this.selectionCallback(competition);
    }
    
    // Dispatch event
    const event = new CustomEvent('competition-selected', {
      detail: competition
    });
    console.log('Dispatching competition-selected event');
    document.dispatchEvent(event);
  }

  /**
   * Handle season filter change
   */
  handleSeasonFilterChange(event) {
    const seasonId = event.target.value ? parseInt(event.target.value, 10) : null;
    this.filterBySeason(seasonId);
  }

  /**
   * Handle new competition button click
   */
  handleNewCompetitionClick() {
    this.showNewCompetitionModal();
  }

  /**
   * Handle delete competition
   */
  async handleDeleteCompetition(id) {
    const competition = this.competitions.find(c => c.id === id);
    if (!competition) return;

    const confirmed = confirm(`Are you sure you want to delete "${competition.name}"? This will also delete all associated results.`);
    if (!confirmed) return;

    try {
      await this.deleteCompetition(id);
      this.showSuccess('Competition deleted successfully');
    } catch (error) {
      console.error('Error deleting competition:', error);
      this.showError(`Failed to delete competition: ${error.message}`);
    }
  }

  /**
   * Show new competition modal
   */
  showNewCompetitionModal() {
    // Remove any existing modal
    if (this.modalContainer) {
      this.modalContainer.remove();
    }

    // Create modal container with proper structure
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal';
    this.modalContainer.style.display = 'flex'; // Ensure it's visible
    this.modalContainer.setAttribute('role', 'dialog');
    this.modalContainer.setAttribute('aria-modal', 'true');
    this.modalContainer.setAttribute('aria-labelledby', 'new-competition-heading');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', this.handleCloseModal);
    this.modalContainer.appendChild(overlay);

    // Create modal content wrapper
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.addEventListener('click', (e) => e.stopPropagation());

    // Modal header
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const heading = document.createElement('h2');
    heading.id = 'new-competition-heading';
    heading.textContent = 'Create New Competition';
    header.appendChild(heading);
    
    modalContent.appendChild(header);

    // Modal body
    const body = document.createElement('div');
    body.className = 'modal-body';

    // Name field
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Competition Name';
    nameLabel.htmlFor = 'new-competition-name-input';
    nameGroup.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'new-competition-name-input';
    nameInput.className = 'form-control';
    nameInput.placeholder = 'Enter competition name';
    nameInput.required = true;
    nameGroup.appendChild(nameInput);
    
    body.appendChild(nameGroup);

    // Date field
    const dateGroup = document.createElement('div');
    dateGroup.className = 'form-group';
    
    const dateLabel = document.createElement('label');
    dateLabel.textContent = 'Date';
    dateLabel.htmlFor = 'new-competition-date-input';
    dateGroup.appendChild(dateLabel);
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'new-competition-date-input';
    dateInput.className = 'form-control';
    dateInput.required = true;
    dateInput.value = new Date().toISOString().split('T')[0];
    dateGroup.appendChild(dateInput);
    
    body.appendChild(dateGroup);

    // Type field
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type';
    typeLabel.htmlFor = 'new-competition-type-input';
    typeGroup.appendChild(typeLabel);
    
    const typeSelect = document.createElement('select');
    typeSelect.id = 'new-competition-type-input';
    typeSelect.className = 'form-control';
    typeSelect.required = true;
    
    const singlesOption = document.createElement('option');
    singlesOption.value = 'singles';
    singlesOption.textContent = 'Singles';
    typeSelect.appendChild(singlesOption);
    
    const doublesOption = document.createElement('option');
    doublesOption.value = 'doubles';
    doublesOption.textContent = 'Doubles';
    typeSelect.appendChild(doublesOption);
    
    typeGroup.appendChild(typeSelect);
    body.appendChild(typeGroup);

    // Season field
    const seasonGroup = document.createElement('div');
    seasonGroup.className = 'form-group';
    
    const seasonLabel = document.createElement('label');
    seasonLabel.textContent = 'Presentation Season';
    seasonLabel.htmlFor = 'new-competition-season-input';
    seasonGroup.appendChild(seasonLabel);
    
    const seasonSelect = document.createElement('select');
    seasonSelect.id = 'new-competition-season-input';
    seasonSelect.className = 'form-control';
    seasonSelect.required = true;
    
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select a season...';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    seasonSelect.appendChild(placeholderOption);
    
    this.seasons.forEach(season => {
      const option = document.createElement('option');
      option.value = season.id;
      option.textContent = season.name;
      if (season.isActive || season.is_active) {
        option.selected = true;
      }
      seasonSelect.appendChild(option);
    });
    
    seasonGroup.appendChild(seasonSelect);
    body.appendChild(seasonGroup);

    modalContent.appendChild(body);

    // Modal footer
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
    createBtn.textContent = 'Create Competition';
    createBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; background: #3498db; color: white; display: inline-flex; align-items: center; gap: 6px; min-width: 120px;';
    createBtn.addEventListener('click', this.handleCreateCompetition);
    footer.appendChild(createBtn);

    modalContent.appendChild(footer);

    // Add modal content to container
    this.modalContainer.appendChild(modalContent);

    // Add to DOM
    document.body.appendChild(this.modalContainer);

    // Focus first input after a brief delay
    setTimeout(() => {
      nameInput.focus();
    }, 100);
  }

  /**
   * Handle create competition from modal
   */
  async handleCreateCompetition() {
    const nameInput = document.getElementById('new-competition-name-input');
    const dateInput = document.getElementById('new-competition-date-input');
    const typeSelect = document.getElementById('new-competition-type-input');
    const seasonSelect = document.getElementById('new-competition-season-input');

    const name = nameInput.value.trim();
    const date = dateInput.value;
    const type = typeSelect.value;
    const seasonId = parseInt(seasonSelect.value, 10);

    // Validation
    if (!name) {
      this.showError('Competition name is required');
      nameInput.focus();
      return;
    }
    if (!date) {
      this.showError('Date is required');
      dateInput.focus();
      return;
    }
    if (!type) {
      this.showError('Type is required');
      typeSelect.focus();
      return;
    }
    if (!seasonId || isNaN(seasonId)) {
      this.showError('Presentation season is required');
      seasonSelect.focus();
      return;
    }

    try {
      const dto = {
        name,
        date,
        type,
        seasonId,
        description: ''
      };

      const newCompetition = await this.createCompetition(dto);
      this.showSuccess(`Competition "${newCompetition.name}" created successfully`);
      this.handleCloseModal();
    } catch (error) {
      console.error('Error creating competition:', error);
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
    this.newCompetitionModal = null;
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
    try {
      await this.loadSeasons();
      await this.loadCompetitions(this.currentSeasonFilter);
      this.render();
    } catch (error) {
      console.error('Error refreshing CompetitionList:', error);
      this.showError('Failed to refresh competitions');
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    if (this.seasonFilterDropdown) {
      this.seasonFilterDropdown.removeEventListener('change', this.handleSeasonFilterChange);
    }

    // Close modal if open
    this.handleCloseModal();

    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Handle toggle between active/finished view (management mode only)
   */
  async handleViewToggle(showFinished) {
    if (this.mode !== 'management') return;
    
    this.showFinished = showFinished;
    await this.loadCompetitions(this.currentSeasonFilter);
    this.render();
  }

  /**
   * Handle marking competition as finished (management mode only)
   */
  async handleMarkFinished(competitionId) {
    if (this.mode !== 'management') return;
    
    try {
      await this.apiClient.updateCompetition(competitionId, { finished: true });
      
      // Refresh the list
      await this.loadCompetitions(this.currentSeasonFilter);
      this.render();
      
      // Show success message
      this.showMessage('Competition marked as finished successfully.', 'success');
      
    } catch (error) {
      console.error('Error marking competition as finished:', error);
      this.showError('Failed to mark competition as finished.');
    }
  }

  /**
   * Handle unmarking competition as finished (management mode only)
   */
  async handleUnmarkFinished(competitionId) {
    if (this.mode !== 'management') return;
    
    try {
      await this.apiClient.updateCompetition(competitionId, { finished: false });
      
      // Refresh the list
      await this.loadCompetitions(this.currentSeasonFilter);
      this.render();
      
      // Show success message
      this.showMessage('Competition unmarked as finished successfully.', 'success');
      
    } catch (error) {
      console.error('Error unmarking competition as finished:', error);
      this.showError('Failed to unmark competition as finished.');
    }
  }

  /**
   * Show a temporary success message
   */
  showMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('competition-list-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'competition-list-message';
      messageEl.className = 'message';
      
      // Insert at the top of the container
      if (this.container) {
        this.container.insertBefore(messageEl, this.container.firstChild);
      }
    }
    
    messageEl.textContent = message;
    messageEl.className = `message message-${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}
