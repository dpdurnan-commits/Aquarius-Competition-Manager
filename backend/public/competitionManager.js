/**
 * Competition Manager Module
 * Handles CRUD operations for competition records
 */

/**
 * @typedef {Object} Competition
 * @property {number} id - Auto-incrementing primary key
 * @property {string} name - Unique competition name
 * @property {Date} createdAt - Timestamp of creation
 */

/**
 * @typedef {Object} DeleteResult
 * @property {boolean} success - Whether deletion succeeded
 * @property {string} [reason] - Reason for failure (if success is false)
 * @property {number} [count] - Number of associated transactions (if reason is 'has_transactions')
 */

export class CompetitionManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Create a new competition with uniqueness validation
   * @param {string} name - Competition name
   * @returns {Promise<Competition>}
   * @throws {Error} If name is empty or duplicate
   */
  async create(name) {
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const error = new Error('Competition name cannot be empty');
      error.code = 'INVALID_NAME';
      throw error;
    }

    const trimmedName = name.trim();

    // Check uniqueness
    const existingCompetitions = await this.getAll();
    const duplicate = existingCompetitions.find(
      comp => comp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      const error = new Error('Competition name must be unique');
      error.code = 'DUPLICATE_NAME';
      throw error;
    }

    // Get active season or create a default one
    let activeSeason;
    try {
      activeSeason = await this.apiClient.getActivePresentationSeason();
      
      // If no active season exists, create a default one
      if (!activeSeason) {
        const currentYear = new Date().getFullYear();
        const yearSuffix = currentYear.toString().slice(-2);
        const nextYearSuffix = (currentYear + 1).toString().slice(-2);
        const defaultSeasonName = `Season: Winter ${yearSuffix}-Summer ${nextYearSuffix}`;
        
        activeSeason = await this.apiClient.createPresentationSeason({
          name: defaultSeasonName
        });
        
        // Set it as active
        await this.apiClient.setActivePresentationSeason(activeSeason.id);
      }
    } catch (error) {
      console.warn('Failed to get/create active season:', error);
      // If season operations fail, throw a more helpful error
      const wrappedError = new Error('No active season found. Please create a presentation season first in Competition Accounts.');
      wrappedError.code = 'NO_ACTIVE_SEASON';
      throw wrappedError;
    }

    // Create competition via API
    try {
      const competition = await this.apiClient.createCompetition({
        name: trimmedName,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        type: 'singles', // Default to singles
        seasonId: activeSeason.id
      });

      return {
        id: competition.id,
        name: competition.name,
        createdAt: new Date(competition.createdAt || competition.created_at)
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to create competition: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update an existing competition with uniqueness validation
   * @param {number} id - Competition ID
   * @param {string} name - New competition name
   * @returns {Promise<Competition>}
   * @throws {Error} If competition not found, name is empty, or duplicate
   */
  async update(id, name) {
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const error = new Error('Competition name cannot be empty');
      error.code = 'INVALID_NAME';
      throw error;
    }

    const trimmedName = name.trim();

    // Get existing competition
    const existing = await this.getById(id);
    if (!existing) {
      const error = new Error('Competition not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Check uniqueness (excluding current competition)
    const allCompetitions = await this.getAll();
    const duplicate = allCompetitions.find(
      comp => comp.id !== id && comp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      const error = new Error('Competition name must be unique');
      error.code = 'DUPLICATE_NAME';
      throw error;
    }

    // Update competition via API
    try {
      const updated = await this.apiClient.updateCompetition(id, {
        name: trimmedName
      });

      return {
        id: updated.id,
        name: updated.name,
        createdAt: new Date(updated.createdAt || updated.created_at)
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to update competition: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a competition with transaction check
   * @param {number} id - Competition ID
   * @returns {Promise<DeleteResult>}
   */
  async delete(id) {
    // Check for associated transactions
    const count = await this.checkAssociatedTransactions(id);

    if (count > 0) {
      return {
        success: false,
        reason: 'has_transactions',
        count: count
      };
    }

    // Delete competition via API
    try {
      await this.apiClient.deleteCompetition(id);
      return { success: true };
    } catch (error) {
      const wrappedError = new Error(`Failed to delete competition: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get all competitions
   * @returns {Promise<Competition[]>}
   */
  async getAll() {
    try {
      const competitions = await this.apiClient.getAllCompetitions();
      
      // Transform API response to match expected format
      const transformed = competitions.map(comp => ({
        id: comp.id,
        name: comp.name,
        createdAt: new Date(comp.createdAt || comp.created_at)
      }));

      // Sort by name alphabetically
      transformed.sort((a, b) => a.name.localeCompare(b.name));
      return transformed;
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competitions: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get a competition by ID
   * @param {number} id - Competition ID
   * @returns {Promise<Competition|null>}
   */
  async getById(id) {
    try {
      const competitions = await this.getAll();
      return competitions.find(comp => comp.id === id) || null;
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competition: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Check how many transactions are associated with a competition
   * @param {number} id - Competition ID
   * @returns {Promise<number>}
   */
  async checkAssociatedTransactions(id) {
    try {
      // Get all flagged transactions and count those with matching competition_id
      const flaggedTransactions = await this.apiClient.getAllFlaggedTransactions();
      const count = flaggedTransactions.filter(ft => 
        ft.competitionId === id || ft.competition_id === id
      ).length;
      return count;
    } catch (error) {
      // If endpoint doesn't exist or fails, return 0 to allow deletion
      console.warn('Failed to check associated transactions:', error);
      return 0;
    }
  }
}
