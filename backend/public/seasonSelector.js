/**
 * Season Selector Component
 * Manages presentation season CRUD operations and active season selection
 */

export class SeasonSelector {
  constructor(apiClient) {
    this.apiClient = apiClient;
    
    // State
    this.seasons = [];
    this.activeSeason = null;
    
    // DOM Elements
    this.container = null;
    this.seasonDropdown = null;
    this.newSeasonModal = null;
    
    // Bind methods
    this.handleSeasonChange = this.handleSeasonChange.bind(this);
    this.handleNewSeasonClick = this.handleNewSeasonClick.bind(this);
    this.handleAutoIncrementClick = this.handleAutoIncrementClick.bind(this);
    this.handleCreateSeason = this.handleCreateSeason.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
  }

  /**
   * Initialize the component
   */
  async initialize() {
    try {
      await this.loadSeasons();
      console.log('SeasonSelector initialized successfully');
    } catch (error) {
      console.error('Error initializing SeasonSelector:', error);
      throw error;
    }
  }

  /**
   * Load all seasons from API
   */
  async loadSeasons() {
    try {
      const result = await this.apiClient.request('/api/presentation-seasons', {
        method: 'GET'
      });

      this.seasons = result.seasons || [];
      
      // Find active season
      this.activeSeason = this.seasons.find(s => s.isActive || s.is_active) || null;
      
      return this.seasons;
    } catch (error) {
      const wrappedError = new Error(`Failed to load seasons: ${error.message}`);
      wrappedError.code = error.code || 'LOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Create a new season
   * @param {string} name - Season name in format "Season: Winter YY-Summer YY"
   */
  async createSeason(name) {
    // Validate format
    if (!this.validateSeasonFormat(name)) {
      const error = new Error('Invalid season format. Expected: "Season: Winter YY-Summer YY"');
      error.code = 'INVALID_FORMAT';
      throw error;
    }

    // Extract years from name
    const match = name.match(/Winter (\d{2})-Summer (\d{2})/);
    if (!match) {
      const error = new Error('Failed to extract years from season name');
      error.code = 'PARSE_ERROR';
      throw error;
    }

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    try {
      const result = await this.apiClient.request('/api/presentation-seasons', {
        method: 'POST',
        body: JSON.stringify({ 
          name,
          startYear,
          endYear
        })
      });

      const newSeason = result.season;
      
      // Add to local state
      this.seasons.push(newSeason);
      this.seasons.sort((a, b) => (a.startYear || a.start_year) - (b.startYear || b.start_year));
      
      // Refresh display
      this.render();
      
      return newSeason;
    } catch (error) {
      const wrappedError = new Error(`Failed to create season: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Auto-increment season from most recent
   */
  async autoIncrementSeason() {
    try {
      const result = await this.apiClient.request('/api/presentation-seasons/auto-increment', {
        method: 'POST'
      });

      const newSeason = result.season;
      
      // Add to local state
      this.seasons.push(newSeason);
      this.seasons.sort((a, b) => (a.startYear || a.start_year) - (b.startYear || b.start_year));
      
      // Refresh display
      this.render();
      
      return newSeason;
    } catch (error) {
      const wrappedError = new Error(`Failed to auto-increment season: ${error.message}`);
      wrappedError.code = error.code || 'AUTO_INCREMENT_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Set a season as active
   * @param {number} seasonId - Season ID to activate
   */
  async setActiveSeason(seasonId) {
    try {
      const result = await this.apiClient.request(`/api/presentation-seasons/${seasonId}/activate`, {
        method: 'PUT'
      });

      const activatedSeason = result.season;
      
      // Update local state - deactivate all, then activate selected
      this.seasons.forEach(s => {
        if (s.id === seasonId) {
          s.isActive = true;
          s.is_active = true;
        } else {
          s.isActive = false;
          s.is_active = false;
        }
      });
      
      this.activeSeason = activatedSeason;
      
      // Refresh display
      this.render();
      
      // Dispatch event for other components
      const event = new CustomEvent('season-selected', {
        detail: activatedSeason
      });
      document.dispatchEvent(event);
      
      return activatedSeason;
    } catch (error) {
      const wrappedError = new Error(`Failed to set active season: ${error.message}`);
      wrappedError.code = error.code || 'ACTIVATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Validate season name format
   * Pattern: "Season: Winter YY-Summer YY" where YY are two-digit years
   * @param {string} name - Season name to validate
   * @returns {boolean}
   */
  validateSeasonFormat(name) {
    const pattern = /^Season: Winter \d{2}-Summer \d{2}$/;
    
    if (!pattern.test(name)) {
      return false;
    }
    
    // Extract years and validate winter <= summer
    const match = name.match(/Winter (\d{2})-Summer (\d{2})/);
    if (match) {
      const winterYear = parseInt(match[1], 10);
      const summerYear = parseInt(match[2], 10);
      return winterYear <= summerYear;
    }
    
    return false;
  }

  /**
   * Render the component
   */
  render(containerId) {
    // Get or use provided container
    if (containerId) {
      this.container = document.getElementById(containerId);
    } else if (!this.container) {
      this.container = document.getElementById('season-selector-container');
    }
    
    if (!this.container) {
      console.error('Season selector container not found');
      return;
    }

    // Clear existing content
    this.container.innerHTML = '';

    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'season-selector';

    // Create season dropdown section
    const dropdownSection = document.createElement('div');
    dropdownSection.className = 'season-dropdown-section';

    const label = document.createElement('label');
    label.textContent = 'Presentation Season:';
    label.htmlFor = 'season-dropdown';
    dropdownSection.appendChild(label);

    this.seasonDropdown = document.createElement('select');
    this.seasonDropdown.id = 'season-dropdown';
    this.seasonDropdown.className = 'season-dropdown';
    this.seasonDropdown.addEventListener('change', this.handleSeasonChange.bind(this));

    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select a season...';
    placeholderOption.disabled = true;
    placeholderOption.selected = !this.activeSeason;
    this.seasonDropdown.appendChild(placeholderOption);

    // Add season options
    this.seasons.forEach(season => {
      const option = document.createElement('option');
      option.value = season.id;
      option.textContent = season.name;
      
      // Mark active season
      if (season.isActive || season.is_active) {
        option.selected = true;
        option.textContent += ' ★'; // Active badge
      }
      
      this.seasonDropdown.appendChild(option);
    });

    dropdownSection.appendChild(this.seasonDropdown);
    wrapper.appendChild(dropdownSection);

    // Create management controls section
    const controlsSection = document.createElement('div');
    controlsSection.className = 'season-controls';

    const newSeasonBtn = document.createElement('button');
    newSeasonBtn.className = 'btn btn-primary';
    newSeasonBtn.textContent = 'New Season';
    newSeasonBtn.addEventListener('click', this.handleNewSeasonClick.bind(this));
    controlsSection.appendChild(newSeasonBtn);

    const autoIncrementBtn = document.createElement('button');
    autoIncrementBtn.className = 'btn btn-secondary';
    autoIncrementBtn.textContent = 'Auto-Increment';
    autoIncrementBtn.addEventListener('click', this.handleAutoIncrementClick.bind(this));
    autoIncrementBtn.disabled = this.seasons.length === 0;
    controlsSection.appendChild(autoIncrementBtn);

    wrapper.appendChild(controlsSection);

    // Add to container
    this.container.appendChild(wrapper);

    return this.container;
  }

  /**
   * Handle season dropdown change
   */
  async handleSeasonChange(event) {
    const seasonId = parseInt(event.target.value, 10);
    
    if (!seasonId) {
      return;
    }

    try {
      await this.setActiveSeason(seasonId);
      this.showSuccess('Season activated successfully');
    } catch (error) {
      console.error('Error setting active season:', error);
      this.showError(`Failed to activate season: ${error.message}`);
    }
  }

  /**
   * Handle new season button click
   */
  handleNewSeasonClick() {
    this.showNewSeasonModal();
  }

  /**
   * Handle auto-increment button click
   */
  async handleAutoIncrementClick() {
    try {
      const newSeason = await this.autoIncrementSeason();
      this.showSuccess(`Season "${newSeason.name}" created successfully`);
    } catch (error) {
      console.error('Error auto-incrementing season:', error);
      this.showError(`Failed to create season: ${error.message}`);
    }
  }

  /**
   * Show new season modal
   */
  showNewSeasonModal() {
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
    heading.textContent = 'Create New Season';
    header.appendChild(heading);
    modalContent.appendChild(header);

    // Modal body
    const body = document.createElement('div');
    body.className = 'modal-body';

    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Season Name';
    label.htmlFor = 'season-name-input';
    formGroup.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'season-name-input';
    input.className = 'form-control';
    input.placeholder = 'Season: Winter 25-Summer 26';
    formGroup.appendChild(input);

    const hint = document.createElement('small');
    hint.className = 'form-hint';
    hint.textContent = 'Format: "Season: Winter YY-Summer YY"';
    formGroup.appendChild(hint);

    body.appendChild(formGroup);
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
    createBtn.textContent = 'Create Season';
    createBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; background: #3498db; color: white; display: inline-flex; align-items: center; gap: 6px; min-width: 120px;';
    createBtn.addEventListener('click', this.handleCreateSeason);
    footer.appendChild(createBtn);

    modalContent.appendChild(footer);

    // Add modal content to container
    this.modalContainer.appendChild(modalContent);

    // Add to DOM
    document.body.appendChild(this.modalContainer);

    // Focus input after a brief delay
    setTimeout(() => input.focus(), 100);

    // Handle Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleCreateSeason();
      }
    });
  }

  /**
   * Handle create season from modal
   */
  async handleCreateSeason() {
    const input = document.getElementById('season-name-input');
    const name = input.value.trim();

    if (!name) {
      this.showError('Season name cannot be empty');
      return;
    }

    try {
      const newSeason = await this.createSeason(name);
      this.showSuccess(`Season "${newSeason.name}" created successfully`);
      this.handleCloseModal();
    } catch (error) {
      console.error('Error creating season:', error);
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
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
      this.render();
    } catch (error) {
      console.error('Error refreshing SeasonSelector:', error);
      this.showError('Failed to refresh seasons');
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    if (this.seasonDropdown) {
      this.seasonDropdown.removeEventListener('change', this.handleSeasonChange);
    }

    // Close modal if open
    this.handleCloseModal();

    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
