/**
 * Competition Accounts View
 * Main container that integrates Transactional CSV Importer and Competition Results Management
 */

export class CompetitionAccountsView {
  constructor(apiClient, transactionalImporter) {
    this.apiClient = apiClient;
    this.transactionalImporter = transactionalImporter;
    
    // Child components (to be initialized)
    this.competitionList = null;
    this.resultsTable = null;
    this.csvUploader = null;
    
    // State
    this.selectedCompetition = null;
    this.activeSeason = null;
    
    // DOM Elements
    this.container = null;
    this.transactionalSection = null;
    this.competitionSection = null;
  }

  /**
   * Initialize the view and child components
   */
  async initialize() {
    try {
      // Load initial data
      await this.loadActiveSeason();
      
      // Initialize child components
      const { CompetitionList } = await import('./competitionList.js');
      const { ResultsTable } = await import('./resultsTable.js');
      const { CSVUploader } = await import('./csvUploader.js');
      
      this.competitionList = new CompetitionList(this.apiClient);
      await this.competitionList.initialize();
      
      this.resultsTable = new ResultsTable(this.apiClient);
      
      this.csvUploader = new CSVUploader(this.apiClient);
      
      // Set up event listeners for component communication
      this.setupEventListeners();
      
      console.log('CompetitionAccountsView initialized successfully');
    } catch (error) {
      console.error('Error initializing CompetitionAccountsView:', error);
      throw error;
    }
  }

  /**
   * Render the view to a container
   * @param {string} containerId - ID of the container element
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create competition management section
    this.renderCompetitionSection(container);
  }

  /**
   * Render the competition results management section
   * @param {HTMLElement} container - Container element to render into
   */
  renderCompetitionSection(container) {
    this.competitionSection = document.createElement('div');
    this.competitionSection.className = 'competition-section';
    this.competitionSection.id = 'competition-section';
    
    // Create subsections for child components
    const competitionListContainer = document.createElement('div');
    competitionListContainer.className = 'competition-list-container';
    competitionListContainer.id = 'competition-list-container';
    this.competitionSection.appendChild(competitionListContainer);
    
    const resultsTableContainer = document.createElement('div');
    resultsTableContainer.className = 'results-table-container';
    resultsTableContainer.id = 'results-table-container';
    this.competitionSection.appendChild(resultsTableContainer);
    
    const csvUploaderContainer = document.createElement('div');
    csvUploaderContainer.className = 'csv-uploader-container';
    csvUploaderContainer.id = 'csv-uploader-container';
    this.competitionSection.appendChild(csvUploaderContainer);
    
    // Add season management section at the bottom
    const seasonManagementContainer = document.createElement('div');
    seasonManagementContainer.className = 'season-management-container';
    seasonManagementContainer.id = 'season-management-container';
    this.competitionSection.appendChild(seasonManagementContainer);
    
    container.appendChild(this.competitionSection);
    
    // Render child components after DOM is ready
    setTimeout(() => {
      if (this.competitionList) {
        this.competitionList.render('competition-list-container');
      }
      if (this.resultsTable) {
        this.resultsTable.render('results-table-container');
      }
      if (this.csvUploader) {
        this.csvUploader.render('csv-uploader-container');
      }
      // Render season management at the bottom
      this.renderSeasonManagement();
    }, 0);
  }

  /**
   * Set up event listeners for component communication
   */
  setupEventListeners() {
    // Listen for season selection changes
    document.addEventListener('season-selected', (event) => {
      this.handleSeasonSelected(event.detail);
    });
    
    // Listen for competition selection changes
    document.addEventListener('competition-selected', (event) => {
      this.handleCompetitionSelected(event.detail);
    });
    
    // Listen for results updated
    document.addEventListener('results-updated', () => {
      this.handleResultsUpdated();
    });
    
    // Listen for CSV upload complete
    document.addEventListener('csv-upload-complete', (event) => {
      this.handleCsvUploadComplete(event.detail);
    });
    
    // Listen for results uploaded from CSV
    document.addEventListener('results-uploaded', (event) => {
      this.handleResultsUploaded(event.detail);
    });
  }

  /**
   * Load the active presentation season
   */
  async loadActiveSeason() {
    try {
      const season = await this.apiClient.getActivePresentationSeason();
      this.activeSeason = season;
      console.log('Active season loaded:', season);
    } catch (error) {
      console.error('Error loading active season:', error);
      // Don't throw - allow view to render without active season
    }
  }

  /**
   * Handle season selection change
   */
  handleSeasonSelected(season) {
    this.activeSeason = season;
    console.log('Season selected:', season);
    
    // Notify competition list to filter by season
    if (this.competitionList) {
      this.competitionList.filterBySeason(season.id);
    }
  }

  /**
   * Handle competition selection change
   */
  handleCompetitionSelected(competition) {
    console.log('CompetitionAccountsView: Competition selected event received:', competition);
    this.selectedCompetition = competition;
    
    // Load results for selected competition - pass full competition object
    if (this.resultsTable) {
      console.log('Loading results for competition:', competition.id);
      this.resultsTable.setCompetition(competition);
    } else {
      console.error('ResultsTable component not initialized');
    }
    
    // Update CSV uploader context
    if (this.csvUploader) {
      this.csvUploader.setCompetition(competition);
    }
  }

  /**
   * Handle results updated
   */
  handleResultsUpdated() {
    console.log('Results updated');
    
    // Refresh competition list to update result counts
    if (this.competitionList) {
      this.competitionList.refresh();
    }
  }

  /**
   * Handle CSV upload complete
   */
  handleCsvUploadComplete(result) {
    console.log('CSV upload complete:', result);
    
    // Refresh results table
    if (this.resultsTable && this.selectedCompetition) {
      this.resultsTable.loadResults(this.selectedCompetition.id);
    }
    
    // Refresh competition list to update result counts
    if (this.competitionList) {
      this.competitionList.refresh();
    }
  }

  /**
   * Handle results uploaded from CSV
   */
  handleResultsUploaded(detail) {
    console.log('Results uploaded:', detail);
    
    const { competitionId, count } = detail;
    
    // Show success message
    this.showNotification(`Successfully uploaded ${count} player${count !== 1 ? 's' : ''}`, 'success');
    
    // Refresh results table if this is the currently selected competition
    if (this.resultsTable && this.selectedCompetition && this.selectedCompetition.id === competitionId) {
      this.resultsTable.loadResults(competitionId);
    }
    
    // Refresh competition list to update result counts
    if (this.competitionList) {
      this.competitionList.refresh();
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Show the view
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide the view
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Refresh the view
   */
  async refresh() {
    try {
      await this.loadActiveSeason();
      
      if (this.competitionList) {
        await this.competitionList.refresh();
      }
      
      if (this.resultsTable && this.selectedCompetition) {
        await this.resultsTable.loadResults(this.selectedCompetition.id);
      }
      
      // Refresh season management section
      await this.loadAndRenderSeasons();
    } catch (error) {
      console.error('Error refreshing CompetitionAccountsView:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('season-selected', this.handleSeasonSelected);
    document.removeEventListener('competition-selected', this.handleCompetitionSelected);
    document.removeEventListener('results-updated', this.handleResultsUpdated);
    document.removeEventListener('csv-upload-complete', this.handleCsvUploadComplete);
    
    // Clean up child components
    if (this.competitionList) {
      this.competitionList.destroy?.();
    }
    if (this.resultsTable) {
      this.resultsTable.destroy?.();
    }
    if (this.csvUploader) {
      this.csvUploader.destroy?.();
    }
    
    // Remove DOM elements
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Render season management section with creation and toggle controls
   */
  async renderSeasonManagement() {
    const container = document.getElementById('season-management-container');
    if (!container) {
      console.warn('Season management container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="season-management-section">
        <h3>Presentation Seasons Management</h3>
        
        <div class="season-creation-section">
          <h4>Create New Presentation Season</h4>
          <p class="section-description">Create a new season to group competitions</p>
          <div class="season-creation-form">
            <input type="text" id="new-season-name" class="form-control" placeholder="e.g., Season: Winter 25-Summer 26" />
            <button id="create-season-btn" class="btn btn-primary">Create Season</button>
          </div>
        </div>
        
        <div class="season-list-section">
          <h4>Manage Existing Seasons</h4>
          <p class="section-description">Mark seasons as complete to hide them from competition creation dialogs</p>
          <div id="season-management-list"></div>
        </div>
      </div>
    `;
    
    // Add event listener for create button
    const createBtn = document.getElementById('create-season-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateSeason());
    }
    
    await this.loadAndRenderSeasons();
  }
  
  /**
   * Handle create new season
   */
  async handleCreateSeason() {
    const nameInput = document.getElementById('new-season-name');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
      this.showMessage('Please enter a season name', 'error');
      return;
    }
    
    // Validate format
    const nameRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
    if (!nameRegex.test(name)) {
      this.showMessage('Invalid format. Expected: "Season: Winter YY-Summer YY"', 'error');
      return;
    }
    
    // Extract years from name
    const match = name.match(/Winter (\d{2})-Summer (\d{2})/);
    if (!match) {
      this.showMessage('Failed to extract years from season name', 'error');
      return;
    }
    
    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    
    if (startYear > endYear) {
      this.showMessage('Winter year must be less than or equal to Summer year', 'error');
      return;
    }
    
    try {
      await this.apiClient.createPresentationSeason({ name, startYear, endYear });
      this.showMessage('Season created successfully', 'success');
      nameInput.value = '';
      await this.loadAndRenderSeasons();
      
      // Refresh season selector if it exists
      if (this.seasonSelector) {
        await this.seasonSelector.refresh();
      }
    } catch (error) {
      console.error('Error creating season:', error);
      this.showMessage('Failed to create season', 'error');
    }
  }
  
  /**
   * Load and render the list of seasons with toggle controls
   */
  async loadAndRenderSeasons() {
    const listContainer = document.getElementById('season-management-list');
    if (!listContainer) return;
    
    try {
      const seasons = await this.apiClient.getAllPresentationSeasons();
      
      if (seasons.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No presentation seasons yet.</p>';
        return;
      }
      
      listContainer.innerHTML = `
        <table class="season-table">
          <thead>
            <tr>
              <th>Season Name</th>
              <th>All Competitions Added</th>
            </tr>
          </thead>
          <tbody id="season-table-body"></tbody>
        </table>
      `;
      
      const tbody = document.getElementById('season-table-body');
      seasons.forEach(season => {
        const row = this.createSeasonRow(season);
        tbody.appendChild(row);
      });
      
    } catch (error) {
      console.error('Error loading seasons:', error);
      listContainer.innerHTML = '<p class="error-message">Failed to load seasons</p>';
    }
  }
  
  /**
   * Create a table row for a season
   */
  createSeasonRow(season) {
    const row = document.createElement('tr');
    
    // Name cell
    const nameCell = document.createElement('td');
    nameCell.textContent = season.name;
    row.appendChild(nameCell);
    
    // Toggle cell
    const toggleCell = document.createElement('td');
    toggleCell.className = 'toggle-cell';
    
    const label = document.createElement('label');
    label.className = 'toggle-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = season.allCompetitionsAdded || season.all_competitions_added || false;
    checkbox.addEventListener('change', (e) => this.handleToggleSeasonComplete(season.id, e.target.checked));
    
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    
    label.appendChild(checkbox);
    label.appendChild(slider);
    toggleCell.appendChild(label);
    row.appendChild(toggleCell);
    
    return row;
  }
  
  /**
   * Handle toggle of season completion status
   */
  async handleToggleSeasonComplete(seasonId, isComplete) {
    try {
      await this.apiClient.updatePresentationSeason(seasonId, {
        allCompetitionsAdded: isComplete
      });
      
      // Show success message
      this.showMessage('Season status updated successfully', 'success');
      
      // Refresh the season list
      await this.loadAndRenderSeasons();
      
    } catch (error) {
      console.error('Error updating season:', error);
      this.showMessage('Failed to update season status', 'error');
      
      // Reload to revert the toggle
      await this.loadAndRenderSeasons();
    }
  }
  
  /**
   * Show a temporary message
   */
  showMessage(message, type = 'info') {
    console.log('showMessage called:', message, type);
    
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('season-management-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'season-management-message';
      messageEl.className = 'message';
      const container = document.getElementById('season-management-container');
      if (container) {
        container.insertBefore(messageEl, container.firstChild);
        console.log('Message element created and inserted');
      } else {
        console.error('season-management-container not found');
        return;
      }
    }
    
    messageEl.textContent = message;
    messageEl.className = `message message-${type}`;
    messageEl.style.display = 'block';
    console.log('Message displayed:', messageEl.textContent, messageEl.className);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
      console.log('Message hidden');
    }, 3000);
  }

}
