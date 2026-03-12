/**
 * API Client Module
 * Handles REST API operations for competition transaction records
 * Provides the same interface as DatabaseManager for minimal code changes
 */

/**
 * @typedef {Object} EnhancedRecord
 * @property {string} date - Transaction date
 * @property {string} time - Transaction time
 * @property {string} till - Till identifier
 * @property {string} type - Transaction type (Topup/Sale/Refund)
 * @property {string} member - Member field (may be cleared after extraction)
 * @property {string} player - Extracted player name
 * @property {string} competition - Extracted competition name
 * @property {string} price - Price value
 * @property {string} discount - Discount value
 * @property {string} subtotal - Subtotal value
 * @property {string} vat - VAT value
 * @property {string} total - Total value
 * @property {number} sourceRowIndex - Original row position in CSV
 * @property {boolean} isComplete - True if all required data present
 */

/**
 * @typedef {Object} DateTime
 * @property {string} date - Date string
 * @property {string} time - Time string
 * @property {number} timestamp - Unix timestamp for comparison
 */

/**
 * @typedef {Object} StorageError
 * @property {EnhancedRecord} record - The record that failed to store
 * @property {string} message - Error message
 */

/**
 * @typedef {Object} StoreResult
 * @property {number} stored - Number of successfully stored records
 * @property {StorageError[]} errors - Array of storage errors
 */

export class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL || this.detectBaseURL();
    this.maxRetries = 3;
    this.retryDelay = 1000; // Initial retry delay in ms
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Detect base URL based on environment
   * @returns {string}
   */
  detectBaseURL() {
    // In development, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // In production, use same origin
    return window.location.origin;
  }

  /**
   * Initialize the API client (for compatibility with DatabaseManager interface)
   * @returns {Promise<void>}
   */
  async initialize() {
    // No initialization needed for API client, but keep method for interface compatibility
    return Promise.resolve();
  }

  /**
   * Make HTTP request with retry logic and error handling
   * @private
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.code = `HTTP_${response.status}`;
        error.status = response.status;
        error.details = errorData;
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout - the server took too long to respond');
        timeoutError.code = 'REQUEST_TIMEOUT';
        throw timeoutError;
      }

      // Handle network errors with retry
      if (error.message.includes('fetch') || error.message.includes('network') || error.code === 'REQUEST_TIMEOUT') {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(endpoint, options, retryCount + 1);
        }
        
        const networkError = new Error('Network error - unable to connect to server. Please check your connection and try again.');
        networkError.code = 'NETWORK_ERROR';
        networkError.originalError = error;
        throw networkError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Store an array of records via API (import transactions)
   * @param {EnhancedRecord[]} records - Array of records to store
   * @returns {Promise<StoreResult>}
   */
  async store(records) {
    try {
      const result = await this.request('/api/transactions/import', {
        method: 'POST',
        body: JSON.stringify(records)
      });

      return {
        stored: result.imported || 0,
        errors: result.errors || []
      };
    } catch (error) {
      // Handle chronological validation errors (HTTP 409)
      if (error.status === 409) {
        const validationError = new Error(error.details?.message || 'Chronological validation failed');
        validationError.code = 'CHRONOLOGICAL_VALIDATION_FAILED';
        validationError.details = error.details;
        throw validationError;
      }

      // Handle validation errors (HTTP 400)
      if (error.status === 400) {
        const validationError = new Error(error.details?.message || 'Validation failed');
        validationError.code = 'VALIDATION_FAILED';
        validationError.details = error.details;
        throw validationError;
      }

      // Wrap and re-throw
      const wrappedError = new Error(`Failed to import transactions: ${error.message}`);
      wrappedError.code = error.code || 'IMPORT_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Retrieve all records from the API
   * @returns {Promise<EnhancedRecord[]>}
   */
  async getAll() {
    try {
      const result = await this.request('/api/transactions', {
        method: 'GET'
      });

      return result.transactions || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve transactions: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get a single record by ID
   * @param {number} id - Record ID
   * @returns {Promise<EnhancedRecord|null>}
   */
  async getById(id) {
    try {
      const result = await this.request(`/api/transactions/${id}`, {
        method: 'GET'
      });

      return result.transaction || null;
    } catch (error) {
      // Return null for 404 errors
      if (error.status === 404) {
        return null;
      }

      const wrappedError = new Error(`Failed to retrieve transaction: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update an existing record via API
   * @param {number} id - Record ID
   * @param {EnhancedRecord} record - Updated record object
   * @returns {Promise<void>}
   */
  async update(id, record) {
    try {
      await this.request(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ transaction: record })
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to update transaction: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Query records within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<EnhancedRecord[]>}
   */
  async getByDateRange(startDate, endDate) {
    try {
      // Format dates as YYYY-MM-DD for API
      const startDateStr = this.formatDateForAPI(startDate);
      const endDateStr = this.formatDateForAPI(endDate);

      const result = await this.request(
        `/api/transactions?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`,
        { method: 'GET' }
      );

      return result.transactions || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to query date range: ${error.message}`);
      wrappedError.code = error.code || 'QUERY_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get the latest timestamp from the API
   * @returns {Promise<DateTime|null>}
   */
  async getLatestTimestamp() {
    try {
      const result = await this.request('/api/transactions/latest', {
        method: 'GET'
      });

      if (!result.latest) {
        return null;
      }

      return {
        date: result.latest.date,
        time: result.latest.time,
        timestamp: this.parseDateTime(result.latest.date, result.latest.time)
      };
    } catch (error) {
      // Return null for empty database (404)
      if (error.status === 404) {
        return null;
      }

      const wrappedError = new Error(`Failed to get latest timestamp: ${error.message}`);
      wrappedError.code = error.code || 'QUERY_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Clear all records via API
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await this.request('/api/transactions', {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to clear database: ${error.message}`);
      wrappedError.code = error.code || 'CLEAR_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a single record by ID
   * @param {number} id - Record ID to delete
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    try {
      await this.request(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to delete transaction: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get information about the last week of transactions
   * @returns {Promise<LastWeekInfo|null>} - Week info or null if no transactions exist
   * @typedef {Object} LastWeekInfo
   * @property {string} startDate - Monday date (YYYY-MM-DD)
   * @property {string} endDate - Sunday date (YYYY-MM-DD)
   * @property {number} count - Number of transactions in the week
   */
  async getLastWeekInfo() {
    try {
      const result = await this.request('/api/transactions/last-week-info', {
        method: 'GET'
      });

      return result.weekInfo || null;
    } catch (error) {
      // Handle 404 response by returning null
      if (error.status === 404) {
        return null;
      }

      // Wrap and re-throw other errors
      const wrappedError = new Error(`Failed to get last week info: ${error.message}`);
      wrappedError.code = error.code || 'QUERY_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete all transactions from the last week
   * @returns {Promise<DeleteResult>} - Deletion result with count and message
   * @typedef {Object} DeleteResult
   * @property {number} deleted - Number of transactions deleted
   * @property {string} message - Success message
   */
  async deleteLastWeek() {
    try {
      const result = await this.request('/api/transactions/last-week', {
        method: 'DELETE'
      });

      return {
        deleted: result.deleted || 0,
        message: result.message || 'Deletion successful'
      };
    } catch (error) {
      // Wrap and re-throw errors
      const wrappedError = new Error(`Failed to delete last week: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }


  /**
   * Parse date and time strings into Unix timestamp
   * @param {string} date - Date string (DD/MM/YYYY, YYYY-MM-DD, or DD-MM-YYYY)
   * @param {string} time - Time string (HH:MM:SS or HH:MM)
   * @returns {number} - Unix timestamp in milliseconds
   */
  parseDateTime(date, time) {
    // Try to parse different date formats
    let parsedDate;

    // Try DD/MM/YYYY format
    if (date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        parsedDate = new Date(year, month, day);
      }
    }
    // Try YYYY-MM-DD or DD-MM-YYYY format
    else if (date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        // Check if first part is year (4 digits) or day (1-2 digits)
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          parsedDate = new Date(date);
        } else {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          parsedDate = new Date(year, month, day);
        }
      }
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: ${date}`);
    }

    // Parse time
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;

    parsedDate.setHours(hours, minutes, seconds, 0);

    return parsedDate.getTime();
  }

  /**
   * Format a Date object for API queries (YYYY-MM-DD)
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format a Date object for querying (DD/MM/YYYY) - for compatibility
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDateForQuery(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ========== Competition API Methods ==========

  /**
   * Create a new competition
   * @param {Object} competition - Competition data
   * @param {string} competition.name - Competition name
   * @param {string} competition.date - Competition date (YYYY-MM-DD)
   * @param {string} [competition.description] - Competition description
   * @param {string} [competition.prizeStructure] - Prize structure details
   * @returns {Promise<Object>} - Created competition with id
   */
  async createCompetition(competition) {
    try {
      const result = await this.request('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(competition)
      });

      return result.competition;
    } catch (error) {
      const wrappedError = new Error(`Failed to create competition: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get all competitions, optionally filtered by season
   * @param {number} [seasonId] - Optional season ID to filter by
   * @returns {Promise<Object[]>} - Array of competitions
   */
  async getAllCompetitions(seasonId = null) {
    try {
      const endpoint = seasonId 
        ? `/api/competitions?season_id=${seasonId}`
        : '/api/competitions';
      
      const result = await this.request(endpoint, {
        method: 'GET'
      });

      return result.competitions || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competitions: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get a single competition by ID
   * @param {number} id - Competition ID
   * @returns {Promise<Object|null>} - Competition or null
   */
  async getCompetitionById(id) {
    try {
      const result = await this.request(`/api/competitions/${id}`, {
        method: 'GET'
      });

      return result.competition || null;
    } catch (error) {
      // Return null for 404 errors
      if (error.status === 404) {
        return null;
      }

      const wrappedError = new Error(`Failed to retrieve competition: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update an existing competition
   * @param {number} id - Competition ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated competition
   */
  async updateCompetition(id, updates) {
    try {
      const result = await this.request(`/api/competitions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      return result.competition;
    } catch (error) {
      const wrappedError = new Error(`Failed to update competition: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a competition
   * @param {number} id - Competition ID
   * @returns {Promise<void>}
   */
  async deleteCompetition(id) {
    try {
      await this.request(`/api/competitions/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to delete competition: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Competition Results API Methods ==========

  /**
   * Create a single competition result
   * @param {Object} result - Result data
   * @param {number} result.competitionId - Competition ID
   * @param {number} result.finishingPosition - Finishing position
   * @param {string} result.playerName - Player name
   * @param {number} [result.grossScore] - Gross score (singles only)
   * @param {number} [result.handicap] - Handicap (singles only)
   * @param {number} [result.nettScore] - Nett score
   * @param {boolean} [result.entryPaid] - Entry paid status
   * @param {number} [result.swindleMoneyPaid] - Swindle money paid amount
   * @returns {Promise<Object>} - Created result with id
   */
  async createCompetitionResult(result) {
    try {
      const response = await this.request('/api/competition-results', {
        method: 'POST',
        body: JSON.stringify(result)
      });

      return response.result;
    } catch (error) {
      const wrappedError = new Error(`Failed to create competition result: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Create multiple competition results in a batch
   * @param {number} competitionId - Competition ID
   * @param {Object[]} results - Array of result data
   * @returns {Promise<Object>} - Response with created results and count
   */
  async createCompetitionResultsBatch(competitionId, results) {
    try {
      const response = await this.request('/api/competition-results/batch', {
        method: 'POST',
        body: JSON.stringify({ competition_id: competitionId, results })
      });

      return {
        results: response.results || [],
        count: response.count || 0
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to create competition results batch: ${error.message}`);
      wrappedError.code = error.code || 'BATCH_CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get all results for a competition
   * @param {number} competitionId - Competition ID
   * @returns {Promise<Object[]>} - Array of competition results
   */
  async getCompetitionResults(competitionId) {
    try {
      const response = await this.request(`/api/competition-results?competition_id=${competitionId}`, {
        method: 'GET'
      });

      return response.results || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competition results: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update a competition result
   * @param {number} id - Result ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated result
   */
  async updateCompetitionResult(id, updates) {
    try {
      const response = await this.request(`/api/competition-results/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      return response.result;
    } catch (error) {
      const wrappedError = new Error(`Failed to update competition result: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a competition result
   * @param {number} id - Result ID
   * @returns {Promise<void>}
   */
  async deleteCompetitionResult(id) {
    try {
      await this.request(`/api/competition-results/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to delete competition result: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== CSV Upload API Methods ==========

  /**
   * Upload and parse CSV file for competition results
   * @param {File} file - CSV file
   * @param {number} competitionId - Competition ID
   * @param {string} competitionType - Competition type ('singles' or 'doubles')
   * @returns {Promise<Object>} - Parse result with parsed data and errors
   */
  async uploadCompetitionCSV(file, competitionId, competitionType) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('competition_id', competitionId.toString());
      formData.append('competition_type', competitionType);

      const response = await this.request('/api/csv/upload', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData
      });

      return {
        parsed: response.parsed || [],
        count: response.count || 0,
        errors: response.errors || []
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to upload CSV: ${error.message}`);
      wrappedError.code = error.code || 'UPLOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Confirm and save parsed CSV results
   * @param {number} competitionId - Competition ID
   * @param {Object[]} results - Parsed results to save
   * @returns {Promise<Object>} - Response with created results and count
   */
  async confirmCSVUpload(competitionId, results) {
    try {
      const response = await this.request('/api/csv/confirm', {
        method: 'POST',
        body: JSON.stringify({ competition_id: competitionId, results })
      });

      return {
        results: response.results || [],
        count: response.count || 0
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to confirm CSV upload: ${error.message}`);
      wrappedError.code = error.code || 'CONFIRM_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Export competition results as CSV
   * @param {number} competitionId - Competition ID
   * @returns {Promise<Blob>} - CSV file as blob
   */
  async exportCompetitionCSV(competitionId) {
    try {
      const url = `${this.baseURL}/api/csv/export/${competitionId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.code = `HTTP_${response.status}`;
        error.status = response.status;
        throw error;
      }

      return await response.blob();
    } catch (error) {
      const wrappedError = new Error(`Failed to export CSV: ${error.message}`);
      wrappedError.code = error.code || 'EXPORT_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Swindle Money API Methods ==========

  /**
   * Match player name and populate swindle money
   * @param {string} playerName - Player name to match
   * @param {number} amount - Swindle money amount
   * @returns {Promise<Object>} - Match result with status and message
   */
  async populateSwindleMoney(playerName, amount) {
    try {
      const response = await this.request('/api/swindle-money/populate', {
        method: 'POST',
        body: JSON.stringify({ player_name: playerName, amount })
      });

      return {
        matched: response.matched || false,
        result: response.result || null,
        message: response.message || ''
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to populate swindle money: ${error.message}`);
      wrappedError.code = error.code || 'POPULATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Search for potential name matches
   * @param {string} playerName - Player name to search
   * @returns {Promise<Object[]>} - Array of matching results
   */
  async searchNameMatches(playerName) {
    try {
      const response = await this.request(`/api/name-matching/search?name=${encodeURIComponent(playerName)}`, {
        method: 'GET'
      });

      return response.matches || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to search name matches: ${error.message}`);
      wrappedError.code = error.code || 'SEARCH_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Flagged Transaction API Methods ==========

  /**
   * Flag a transaction as a prize winning
   * @param {number} transactionId - Transaction ID to flag
   * @returns {Promise<Object>} - Created flagged transaction with id
   */
  async flagTransaction(transactionId) {
    try {
      const result = await this.request('/api/flagged-transactions', {
        method: 'POST',
        body: JSON.stringify({ transactionId })
      });

      return result.flaggedTransaction;
    } catch (error) {
      const wrappedError = new Error(`Failed to flag transaction: ${error.message}`);
      wrappedError.code = error.code || 'FLAG_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get all flagged transactions with their transaction details
   * @returns {Promise<Object[]>} - Array of flagged transactions
   */
  async getAllFlaggedTransactions() {
    try {
      const result = await this.request('/api/flagged-transactions', {
        method: 'GET'
      });

      return result.flaggedTransactions || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve flagged transactions: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Associate a flagged transaction with a competition
   * @param {number} id - Flagged transaction ID
   * @param {number} competitionId - Competition ID to associate with
   * @returns {Promise<Object>} - Updated flagged transaction
   */
  async associateWithCompetition(id, competitionId) {
    try {
      const result = await this.request(`/api/flagged-transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ competitionId })
      });

      return result.flaggedTransaction;
    } catch (error) {
      const wrappedError = new Error(`Failed to associate with competition: ${error.message}`);
      wrappedError.code = error.code || 'ASSOCIATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Remove a flag from a transaction
   * @param {number} id - Flagged transaction ID
   * @returns {Promise<void>}
   */
  async unflagTransaction(id) {
    try {
      await this.request(`/api/flagged-transactions/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to unflag transaction: ${error.message}`);
      wrappedError.code = error.code || 'UNFLAG_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Presentation Season API Methods ==========

  /**
   * Get all presentation seasons
   * @returns {Promise<Object[]>} - Array of presentation seasons
   */
  async getAllPresentationSeasons() {
    try {
      const result = await this.request('/api/presentation-seasons', {
        method: 'GET'
      });

      return result.seasons || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve presentation seasons: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get active presentation season
   * @returns {Promise<Object|null>} - Active season or null
   */
  async getActivePresentationSeason() {
    try {
      const result = await this.request('/api/presentation-seasons/active', {
        method: 'GET'
      });

      return result.season || null;
    } catch (error) {
      // Return null for 404 errors
      if (error.status === 404) {
        return null;
      }

      const wrappedError = new Error(`Failed to retrieve active season: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Create a new presentation season
   * @param {Object} season - Season data
   * @param {string} season.name - Season name (format: "Season: Winter YY-Summer YY")
   * @returns {Promise<Object>} - Created season with id
   */
  async createPresentationSeason(season) {
    try {
      const result = await this.request('/api/presentation-seasons', {
        method: 'POST',
        body: JSON.stringify(season)
      });

      return result.season;
    } catch (error) {
      const wrappedError = new Error(`Failed to create presentation season: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Auto-increment presentation season
   * @returns {Promise<Object>} - Created season with id
   */
  async autoIncrementPresentationSeason() {
    try {
      const result = await this.request('/api/presentation-seasons/auto-increment', {
        method: 'POST'
      });

      return result.season;
    } catch (error) {
      const wrappedError = new Error(`Failed to auto-increment season: ${error.message}`);
      wrappedError.code = error.code || 'AUTO_INCREMENT_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Set a presentation season as active
   * @param {number} id - Season ID
   * @returns {Promise<Object>} - Updated season
   */
  async setActivePresentationSeason(id) {
    try {
      const result = await this.request(`/api/presentation-seasons/${id}/activate`, {
        method: 'PUT'
      });

      return result.season;
    } catch (error) {
      const wrappedError = new Error(`Failed to activate season: ${error.message}`);
      wrappedError.code = error.code || 'ACTIVATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update a presentation season
   * @param {number} id - Season ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated season
   */
  async updatePresentationSeason(id, updates) {
    try {
      const result = await this.request(`/api/presentation-seasons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      return result.season;
    } catch (error) {
      const wrappedError = new Error(`Failed to update presentation season: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Delete a presentation season
   * @param {number} id - Season ID
   * @returns {Promise<void>}
   */
  async deletePresentationSeason(id) {
    try {
      await this.request(`/api/presentation-seasons/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to delete presentation season: ${error.message}`);
      wrappedError.code = error.code || 'DELETE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Distribution API Methods ==========

  /**
   * Get all winners for a presentation season
   * @param {number} seasonId - Season ID
   * @returns {Promise<Object[]>} - Array of season winners with competition details
   */
  async getSeasonWinners(seasonId) {
    try {
      const result = await this.request(`/api/distributions/season/${seasonId}/winners`, {
        method: 'GET'
      });

      return result.winners || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve season winners: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Create a distribution with assignments
   * @param {Object} dto - Distribution data
   * @param {number} dto.seasonId - Season ID
   * @param {Object[]} dto.assignments - Array of {competitionId, amount}
   * @param {string} dto.transactionDate - Transaction date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Created distribution with id
   */
  async createDistribution(dto) {
    try {
      const result = await this.request('/api/distributions', {
        method: 'POST',
        body: JSON.stringify(dto)
      });

      return result.distribution;
    } catch (error) {
      // Handle duplicate distribution error
      if (error.status === 409) {
        const duplicateError = new Error('Distribution already exists for this season. Void the existing distribution first.');
        duplicateError.code = 'DUPLICATE_DISTRIBUTION';
        duplicateError.originalError = error;
        throw duplicateError;
      }

      const wrappedError = new Error(`Failed to create distribution: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get distribution for a season
   * @param {number} seasonId - Season ID
   * @returns {Promise<Object|null>} - Distribution with assignments or null
   */
  async getDistributionBySeason(seasonId) {
    try {
      const result = await this.request(`/api/distributions/season/${seasonId}`, {
        method: 'GET'
      });

      return result.distribution || null;
    } catch (error) {
      // Return null for 404 errors
      if (error.status === 404) {
        return null;
      }

      const wrappedError = new Error(`Failed to retrieve distribution: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Void a distribution
   * @param {number} distributionId - Distribution ID
   * @returns {Promise<void>}
   */
  async voidDistribution(distributionId) {
    try {
      await this.request(`/api/distributions/${distributionId}/void`, {
        method: 'DELETE'
      });
    } catch (error) {
      const wrappedError = new Error(`Failed to void distribution: ${error.message}`);
      wrappedError.code = error.code || 'VOID_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Competition Costs API Methods ==========

  /**
   * Create a competition cost entry
   * @param {Object} dto - Cost data
   * @param {string} dto.description - Cost description (must be unique)
   * @param {number} dto.amount - Cost amount (positive decimal with up to 2 decimal places)
   * @returns {Promise<Object>} - Created competition cost with id
   */
  async createCompetitionCost(dto) {
    try {
      const result = await this.request('/api/competition-costs', {
        method: 'POST',
        body: JSON.stringify(dto)
      });

      return result.cost;
    } catch (error) {
      // Handle duplicate description error
      if (error.status === 409) {
        const duplicateError = new Error(`A cost with description "${dto.description}" already exists. Please use a unique description.`);
        duplicateError.code = 'DUPLICATE_DESCRIPTION';
        duplicateError.originalError = error;
        throw duplicateError;
      }

      const wrappedError = new Error(`Failed to create competition cost: ${error.message}`);
      wrappedError.code = error.code || 'CREATE_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get all competition costs
   * @returns {Promise<Object>} - Object with costs array and total
   */
  async getAllCompetitionCosts() {
    try {
      const result = await this.request('/api/competition-costs', {
        method: 'GET'
      });

      return {
        costs: result.costs || [],
        total: result.total || 0
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competition costs: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get competition costs by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Object with filtered costs array and total
   */
  async getCompetitionCostsByDateRange(startDate, endDate) {
    try {
      const result = await this.request(
        `/api/competition-costs/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { method: 'GET' }
      );

      return {
        costs: result.costs || [],
        total: result.total || 0
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve competition costs by date range: ${error.message}`);
      wrappedError.code = error.code || 'QUERY_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  // ========== Summary API Methods ==========

  /**
   * Get weekly summaries for all transactions
   * @returns {Promise<Object[]>} - Array of weekly summaries
   */
  async getWeeklySummaries() {
    try {
      const result = await this.request('/api/summaries/weekly', {
        method: 'GET'
      });

      return result.summaries || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve weekly summaries: ${error.message}`);
      wrappedError.code = error.code || 'RETRIEVAL_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Get weekly summaries within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<Object[]>} - Array of weekly summaries
   */
  async getWeeklySummariesByDateRange(startDate, endDate) {
    try {
      // Format dates as YYYY-MM-DD for API
      const startDateStr = this.formatDateForAPI(startDate);
      const endDateStr = this.formatDateForAPI(endDate);

      const result = await this.request(
        `/api/summaries/weekly?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`,
        { method: 'GET' }
      );

      return result.summaries || [];
    } catch (error) {
      const wrappedError = new Error(`Failed to retrieve weekly summaries by date range: ${error.message}`);
      wrappedError.code = error.code || 'QUERY_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }
}
