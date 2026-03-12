/**
 * Database Manager Module
 * Handles IndexedDB operations for competition transaction records
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

export class DatabaseManager {
  constructor() {
    this.dbName = 'CompetitionAccountDB';
    this.version = 2;
    this.storeName = 'summarised_period_transactions';
    this.competitionsStoreName = 'competitions';
    this.db = null;
  }

  /**
   * Initialize the database connection and schema
   * @returns {Promise<void>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // Check IndexedDB support
      if (!window.indexedDB) {
        const error = new Error('IndexedDB is not supported in this browser. Please use a modern browser with IndexedDB support.');
        error.code = 'INDEXEDDB_NOT_SUPPORTED';
        reject(error);
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        const error = new Error(`Database initialization failed: ${request.error?.message || 'Unknown error'}`);
        error.code = 'INITIALIZATION_FAILED';
        error.originalError = request.error;
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Add error handler for database connection errors
        this.db.onerror = (event) => {
          console.error('Database error:', event.target.error);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = event.target.result;
          const oldVersion = event.oldVersion;

          // Create object store if it doesn't exist (version 1)
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, {
              keyPath: 'id',
              autoIncrement: true
            });

            // Create indexes
            store.createIndex('by-date', 'date', { unique: false });
            store.createIndex('by-datetime', ['date', 'time'], { unique: false });
          }

          // Upgrade from version 1 to version 2
          if (oldVersion < 2) {
            // Create competitions object store
            if (!db.objectStoreNames.contains(this.competitionsStoreName)) {
              const competitionsStore = db.createObjectStore(this.competitionsStoreName, {
                keyPath: 'id',
                autoIncrement: true
              });
              
              // Add unique index on name field
              competitionsStore.createIndex('by-name', 'name', { unique: true });
            }

            // Add isWinning index to transactions store
            if (db.objectStoreNames.contains(this.storeName)) {
              const transaction = event.target.transaction;
              const transactionStore = transaction.objectStore(this.storeName);
              
              // Add index if it doesn't exist
              if (!transactionStore.indexNames.contains('by-isWinning')) {
                transactionStore.createIndex('by-isWinning', 'isWinning', { unique: false });
              }
            }
          }
        } catch (error) {
          console.error('Error during database upgrade:', error);
          const upgradeError = new Error(`Database schema creation failed: ${error.message}`);
          upgradeError.code = 'SCHEMA_CREATION_FAILED';
          upgradeError.originalError = error;
          reject(upgradeError);
        }
      };
    });
  }

  /**
   * Store an array of records in the database
   * @param {EnhancedRecord[]} records - Array of records to store
   * @returns {Promise<StoreResult>}
   */
  async store(records) {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const errors = [];
        let stored = 0;

        // Process each record
        records.forEach((record, index) => {
          try {
            const request = store.add(record);

            request.onsuccess = () => {
              stored++;
            };

            request.onerror = () => {
              const errorMessage = request.error?.message || 'Unknown storage error';
              errors.push({
                record,
                message: errorMessage,
                index: index
              });
              // Continue processing other records
              request.transaction.db.onerror = null;
            };
          } catch (error) {
            errors.push({
              record,
              message: `Failed to add record: ${error.message}`,
              index: index
            });
          }
        });

        transaction.oncomplete = () => {
          resolve({ stored, errors });
        };

        transaction.onerror = () => {
          const error = new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`);
          error.code = 'TRANSACTION_FAILED';
          error.originalError = transaction.error;
          reject(error);
        };

        transaction.onabort = () => {
          const error = new Error(`Transaction aborted: ${transaction.error?.message || 'Storage quota may be exceeded'}`);
          error.code = 'TRANSACTION_ABORTED';
          error.originalError = transaction.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Retrieve all records from the database
   * @returns {Promise<EnhancedRecord[]>}
   */
  async getAll() {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = request.result || [];
          // Apply defaults for new fields if missing
          const enhancedRecords = records.map(record => ({
            ...record,
            isWinning: record.isWinning !== undefined ? record.isWinning : false,
            winningCompetitionId: record.winningCompetitionId !== undefined ? record.winningCompetitionId : null
          }));
          resolve(enhancedRecords);
        };

        request.onerror = () => {
          const error = new Error(`Failed to retrieve records: ${request.error?.message || 'Unknown error'}`);
          error.code = 'RETRIEVAL_FAILED';
          error.originalError = request.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Get a single record by ID
   * @param {number} id - Record ID
   * @returns {Promise<EnhancedRecord|null>}
   */
  async getById(id) {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const record = request.result;
          
          if (record) {
            // Apply defaults for new fields if missing
            if (record.isWinning === undefined) {
              record.isWinning = false;
            }
            if (record.winningCompetitionId === undefined) {
              record.winningCompetitionId = null;
            }
          }
          
          resolve(record || null);
        };

        request.onerror = () => {
          const error = new Error(`Failed to retrieve record: ${request.error?.message || 'Unknown error'}`);
          error.code = 'RETRIEVAL_FAILED';
          error.originalError = request.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Update an existing record in the database
   * @param {number} id - Record ID
   * @param {EnhancedRecord} record - Updated record object
   * @returns {Promise<void>}
   */
  async update(id, record) {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // Ensure record has the correct ID
        const updatedRecord = { ...record, id };
        
        const request = store.put(updatedRecord);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          const error = new Error(`Failed to update record: ${request.error?.message || 'Unknown error'}`);
          error.code = 'UPDATE_FAILED';
          error.originalError = request.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Query records within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<EnhancedRecord[]>}
   */
  async getByDateRange(startDate, endDate) {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        // Get all records and filter by date range
        const request = store.getAll();

        request.onsuccess = () => {
          try {
            const allRecords = request.result || [];
            
            // Set start to beginning of day and end to end of day
            const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
            const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
            
            // Filter records by date range
            const filtered = allRecords.filter(record => {
              try {
                const recordTimestamp = this.parseDateTime(record.date, record.time);
                return recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp;
              } catch (error) {
                // Skip records with invalid dates
                console.warn(`Skipping record with invalid date during range query: ${record.date} ${record.time}`, error);
                return false;
              }
            });
            
            // Apply defaults for new fields if missing
            const enhancedRecords = filtered.map(record => ({
              ...record,
              isWinning: record.isWinning !== undefined ? record.isWinning : false,
              winningCompetitionId: record.winningCompetitionId !== undefined ? record.winningCompetitionId : null
            }));
            
            resolve(enhancedRecords);
          } catch (error) {
            const wrappedError = new Error(`Failed to filter records by date range: ${error.message}`);
            wrappedError.code = 'FILTER_FAILED';
            wrappedError.originalError = error;
            reject(wrappedError);
          }
        };

        request.onerror = () => {
          const error = new Error(`Failed to query date range: ${request.error?.message || 'Unknown error'}`);
          error.code = 'QUERY_FAILED';
          error.originalError = request.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Get the latest timestamp from the database
   * @returns {Promise<DateTime|null>}
   */
  async getLatestTimestamp() {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('by-datetime');

        // Open cursor in reverse order to get the latest record
        const request = index.openCursor(null, 'prev');

        request.onsuccess = () => {
          try {
            const cursor = request.result;
            
            if (cursor) {
              const record = cursor.value;
              resolve({
                date: record.date,
                time: record.time,
                timestamp: this.parseDateTime(record.date, record.time)
              });
            } else {
              // Database is empty
              resolve(null);
            }
          } catch (error) {
            const wrappedError = new Error(`Failed to parse latest timestamp: ${error.message}`);
            wrappedError.code = 'PARSE_FAILED';
            wrappedError.originalError = error;
            reject(wrappedError);
          }
        };

        request.onerror = () => {
          const error = new Error(`Failed to get latest timestamp: ${request.error?.message || 'Unknown error'}`);
          error.code = 'QUERY_FAILED';
          error.originalError = request.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }

  /**
   * Clear all records from the database
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName, this.competitionsStoreName], 'readwrite');
        const transactionsStore = transaction.objectStore(this.storeName);
        const competitionsStore = transaction.objectStore(this.competitionsStoreName);
        
        const clearTransactions = transactionsStore.clear();
        const clearCompetitions = competitionsStore.clear();

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          const error = new Error(`Failed to clear database: ${transaction.error?.message || 'Unknown error'}`);
          error.code = 'CLEAR_FAILED';
          error.originalError = transaction.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
  }
  /**
   * Delete a single record by ID
   * @param {number} id - Record ID to delete
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    if (!this.db) {
      const error = new Error('Database not initialized. Call initialize() first.');
      error.code = 'DATABASE_NOT_INITIALIZED';
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const deleteRequest = store.delete(id);

        deleteRequest.onsuccess = () => {
          resolve();
        };

        deleteRequest.onerror = () => {
          const error = new Error(`Failed to delete record ${id}: ${deleteRequest.error?.message || 'Unknown error'}`);
          error.code = 'DELETE_FAILED';
          error.originalError = deleteRequest.error;
          reject(error);
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to create transaction: ${error.message}`);
        wrappedError.code = 'TRANSACTION_CREATION_FAILED';
        wrappedError.originalError = error;
        reject(wrappedError);
      }
    });
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
   * Format a Date object for querying (DD/MM/YYYY)
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDateForQuery(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
