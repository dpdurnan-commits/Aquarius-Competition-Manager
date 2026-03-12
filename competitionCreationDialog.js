/**
 * CompetitionCreationDialog
 * 
 * Modal dialog for creating a competition with required metadata.
 * Displays a form with pre-populated competition name, date picker,
 * type selector, and season dropdown (filtered by allCompetitionsAdded=false).
 */
class CompetitionCreationDialog {
  /**
   * Create a new CompetitionCreationDialog
   * @param {Object} apiClient - API client for making backend requests
   */
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.dialog = null;
    this.overlay = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
  }

  /**
   * Show the dialog for creating a competition
   * @param {string} competitionName - Pre-populated competition name
   * @returns {Promise<Object|null>} - Created competition or null if cancelled
   */
  async show(competitionName) {
    return new Promise(async (resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      try {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        this.overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        `;

        // Create dialog
        this.dialog = document.createElement('div');
        this.dialog.className = 'competition-creation-dialog';
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-labelledby', 'dialog-title');
        this.dialog.setAttribute('aria-modal', 'true');
        this.dialog.style.cssText = `
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Create dialog content
        this.dialog.innerHTML = `
          <h2 id="dialog-title" style="margin-top: 0; margin-bottom: 20px;">Create Competition</h2>
          
          <form id="competition-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group">
              <label for="competition-name" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Competition Name <span style="color: red;" aria-label="required">*</span>
              </label>
              <input 
                type="text" 
                id="competition-name" 
                name="name"
                required
                aria-required="true"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
              />
              <div id="name-error" class="error-message" style="color: red; font-size: 14px; margin-top: 4px; display: none;" role="alert"></div>
            </div>

            <div class="form-group">
              <label for="competition-date" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Date <span style="color: red;" aria-label="required">*</span>
              </label>
              <input 
                type="date" 
                id="competition-date" 
                name="date"
                required
                aria-required="true"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
              />
              <div id="date-error" class="error-message" style="color: red; font-size: 14px; margin-top: 4px; display: none;" role="alert"></div>
            </div>

            <div class="form-group">
              <label for="competition-type" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Type <span style="color: red;" aria-label="required">*</span>
              </label>
              <select 
                id="competition-type" 
                name="type"
                required
                aria-required="true"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
              >
                <option value="">Select type...</option>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
              <div id="type-error" class="error-message" style="color: red; font-size: 14px; margin-top: 4px; display: none;" role="alert"></div>
            </div>

            <div class="form-group">
              <label for="competition-season" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Season <span style="color: red;" aria-label="required">*</span>
              </label>
              <select 
                id="competition-season" 
                name="seasonId"
                required
                aria-required="true"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
              >
                <option value="">Loading seasons...</option>
              </select>
              <div id="season-error" class="error-message" style="color: red; font-size: 14px; margin-top: 4px; display: none;" role="alert"></div>
            </div>

            <div id="form-error" class="error-message" style="color: red; font-size: 14px; margin-top: 8px; display: none;" role="alert"></div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
              <button 
                type="button" 
                id="cancel-button"
                style="padding: 10px 20px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                id="submit-button"
                style="padding: 10px 20px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;"
              >
                Create Competition
              </button>
            </div>
          </form>
        `;

        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // Set competition name value programmatically to avoid HTML escaping issues
        const nameInput = document.getElementById('competition-name');
        if (nameInput) {
          nameInput.value = competitionName;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Load seasons
        await this.loadSeasons();

        // Focus on first input and select it
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }

      } catch (error) {
        this.close();
        reject(error);
      }
    });
  }

  /**
   * Set up event listeners for the dialog
   */
  setupEventListeners() {
    const form = document.getElementById('competition-form');
    const cancelButton = document.getElementById('cancel-button');

    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.handleCancel());
    }

    // Handle Escape key
    this.handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.handleCancel();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);

    // Handle overlay click
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.handleCancel();
        }
      });
    }
  }

  /**
   * Load seasons with allCompetitionsAdded=false filter
   */
  async loadSeasons() {
    const seasonSelect = document.getElementById('competition-season');
    const seasonError = document.getElementById('season-error');

    try {
      // Fetch seasons with filter
      const response = await this.apiClient.request('/api/presentation-seasons?allCompetitionsAdded=false', {
        method: 'GET'
      });

      const seasons = response.seasons || [];

      // Populate dropdown
      seasonSelect.innerHTML = '';
      
      if (seasons.length === 0) {
        seasonSelect.innerHTML = '<option value="">No available seasons</option>';
        seasonSelect.disabled = true;
        this.showError('season-error', 'No seasons available. Please create a season first or mark an existing season as incomplete.');
      } else {
        seasonSelect.innerHTML = '<option value="">Select season...</option>';
        seasons.forEach(season => {
          const option = document.createElement('option');
          option.value = season.id;
          option.textContent = season.name;
          seasonSelect.appendChild(option);
        });
        seasonSelect.disabled = false;
      }

    } catch (error) {
      console.error('Failed to load seasons:', error);
      seasonSelect.innerHTML = '<option value="">Failed to load seasons</option>';
      seasonSelect.disabled = true;
      this.showError('season-error', 'Failed to load seasons. Please try again.');
    }
  }

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Clear previous errors
    this.clearErrors();

    // Get form data
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name')?.trim(),
      date: formData.get('date'),
      type: formData.get('type'),
      seasonId: formData.get('seasonId') ? parseInt(formData.get('seasonId'), 10) : null
    };

    // Validate required fields
    let hasErrors = false;

    if (!data.name) {
      this.showError('name-error', 'Competition name is required');
      hasErrors = true;
    }

    if (!data.date) {
      this.showError('date-error', 'Date is required');
      hasErrors = true;
    }

    if (!data.type) {
      this.showError('type-error', 'Type is required');
      hasErrors = true;
    }

    if (!data.seasonId) {
      this.showError('season-error', 'Season is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Disable submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating...';
    }

    try {
      // Create competition
      const competition = await this.apiClient.createCompetition(data);
      
      // Success - close dialog and resolve with created competition
      this.close();
      if (this.resolvePromise) {
        this.resolvePromise(competition);
      }

    } catch (error) {
      console.error('Failed to create competition:', error);

      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Competition';
      }

      // Handle specific error types
      if (error.message && error.message.includes('already exists')) {
        this.showError('name-error', 'A competition with this name already exists. Please choose a different name.');
      } else if (error.message && error.message.includes('season')) {
        this.showError('season-error', 'Invalid season selected. The season may be marked as complete.');
        // Reload seasons
        await this.loadSeasons();
      } else {
        this.showError('form-error', `Failed to create competition: ${error.message || 'Unknown error'}. Please try again.`);
      }
    }
  }

  /**
   * Handle cancel button click
   */
  handleCancel() {
    this.close();
    if (this.resolvePromise) {
      this.resolvePromise(null);
    }
  }

  /**
   * Close and cleanup dialog
   */
  close() {
    // Remove event listeners
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }

    // Remove DOM elements
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    this.dialog = null;
    this.overlay = null;
  }

  /**
   * Show error message for a field
   * @param {string} elementId - ID of error element
   * @param {string} message - Error message
   */
  showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
   * Clear all error messages
   */
  clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
      element.textContent = '';
      element.style.display = 'none';
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompetitionCreationDialog;
}

// ES6 export for browser
export { CompetitionCreationDialog };
