/**
 * Chronological Validator Module
 * Validates that new transaction imports maintain chronological order
 */

import { parseDateTime } from './dateTimeUtils.js';

/**
 * @typedef {Object} EnhancedRecord
 * @property {string} date - Transaction date
 * @property {string} time - Transaction time
 * @property {string} till - Till identifier
 * @property {string} type - Transaction type
 * @property {string} member - Member field
 * @property {string} player - Extracted player name
 * @property {string} competition - Extracted competition name
 * @property {string} price - Price value
 * @property {string} discount - Discount value
 * @property {string} subtotal - Subtotal value
 * @property {string} vat - VAT value
 * @property {string} total - Total value
 * @property {number} sourceRowIndex - Original row position
 * @property {boolean} isComplete - Completeness flag
 */

/**
 * @typedef {Object} DateTime
 * @property {string} date - Date string
 * @property {string} time - Time string
 * @property {number} timestamp - Unix timestamp in milliseconds
 */

/**
 * @typedef {Object} ValidationSuccess
 * @property {boolean} valid - Always true for success
 */

/**
 * @typedef {Object} ValidationFailure
 * @property {boolean} valid - Always false for failure
 * @property {string} error - Error message
 * @property {DateTime} earliestNew - Earliest timestamp in new records
 * @property {DateTime} latestExisting - Latest timestamp in existing database
 */

/**
 * @typedef {ValidationSuccess | ValidationFailure} ValidationResult
 */

/**
 * Chronological Validator class
 * Ensures new imports don't create chronological inconsistencies
 */
export class ChronologicalValidator {
  /**
   * Create a new ChronologicalValidator
   * @param {Object} databaseManager - DatabaseManager instance for querying existing data
   */
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Validate that new records maintain chronological order and don't duplicate existing records
   * @param {EnhancedRecord[]} newRecords - Array of new records to validate
   * @returns {Promise<ValidationResult>}
   */
  async validate(newRecords) {
    try {
      // Empty array is valid
      if (!newRecords || newRecords.length === 0) {
        return { valid: true };
      }

      // Find earliest timestamp in new records
      const earliestNew = this.findEarliestTimestamp(newRecords);
      
      if (!earliestNew) {
        // All records have invalid dates
        return {
          valid: false,
          error: 'Validation failed: No valid date/time found in new records. Please check the date and time formats in your CSV file.',
          earliestNew: null,
          latestExisting: null
        };
      }

      // Query database for latest existing timestamp
      let latestExisting;
      try {
        latestExisting = await this.databaseManager.getLatestTimestamp();
      } catch (error) {
        // Database query failed
        return {
          valid: false,
          error: `Validation failed: Unable to query existing data. ${error.message}`,
          earliestNew: earliestNew,
          latestExisting: null
        };
      }

      // If database is empty, allow any import
      if (!latestExisting) {
        return { valid: true };
      }

      // Compare timestamps
      if (earliestNew.timestamp < latestExisting.timestamp) {
        // Format dates for display
        const earliestNewFormatted = this.formatDateTime(earliestNew);
        const latestExistingFormatted = this.formatDateTime(latestExisting);
        
        return {
          valid: false,
          error: `Import rejected: Chronological validation failed.\n\nThe new data contains transactions dated ${earliestNewFormatted}, which is before the latest existing transaction at ${latestExistingFormatted}.\n\nTo maintain data integrity, new imports must contain only transactions that occur after existing data. Please check your CSV file and ensure it contains only newer transactions.`,
          earliestNew: earliestNew,
          latestExisting: latestExisting
        };
      }

      // Check for duplicate records
      const duplicateCheck = await this.checkForDuplicates(newRecords);
      if (!duplicateCheck.valid) {
        return duplicateCheck;
      }

      // Validation passed
      return { valid: true };
    } catch (error) {
      // Unexpected error during validation
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        earliestNew: null,
        latestExisting: null
      };
    }
  }

  /**
   * Check if any new records already exist in the database
   * @param {EnhancedRecord[]} newRecords - Array of new records to check
   * @returns {Promise<ValidationResult>}
   */
  async checkForDuplicates(newRecords) {
    try {
      // Get all existing records from database
      const existingRecords = await this.databaseManager.getAll();
      
      if (!existingRecords || existingRecords.length === 0) {
        return { valid: true };
      }

      // Create a Set of existing record signatures for fast lookup
      const existingSignatures = new Set();
      existingRecords.forEach(record => {
        const signature = this.createRecordSignature(record);
        existingSignatures.add(signature);
      });

      // Check each new record for duplicates
      const duplicates = [];
      newRecords.forEach(record => {
        const signature = this.createRecordSignature(record);
        if (existingSignatures.has(signature)) {
          duplicates.push(record);
        }
      });

      if (duplicates.length > 0) {
        const duplicateCount = duplicates.length;
        const sampleDuplicate = duplicates[0];
        
        return {
          valid: false,
          error: `Import rejected: Duplicate records detected.\n\n${duplicateCount} record${duplicateCount !== 1 ? 's' : ''} in the new import already exist${duplicateCount === 1 ? 's' : ''} in the database.\n\nExample duplicate: ${sampleDuplicate.date} at ${sampleDuplicate.time}, ${sampleDuplicate.type}, ${sampleDuplicate.member}, £${sampleDuplicate.total}\n\nPlease check your CSV file and ensure you're not importing the same data twice.`,
          earliestNew: null,
          latestExisting: null
        };
      }

      return { valid: true };
    } catch (error) {
      // If duplicate check fails, log warning but allow import
      console.warn('Duplicate check failed:', error);
      return { valid: true };
    }
  }

  /**
   * Create a unique signature for a record to identify duplicates
   * @param {EnhancedRecord} record - Record to create signature for
   * @returns {string} - Unique signature string
   */
  createRecordSignature(record) {
    // Combine key fields that should be unique for each transaction
    return `${record.date}|${record.time}|${record.total}|${record.type}|${record.member}`;
  }

  /**
   * Find the earliest timestamp in an array of records
   * @param {EnhancedRecord[]} records - Array of records to search
   * @returns {DateTime|null} - Earliest timestamp or null if no valid dates found
   */
  findEarliestTimestamp(records) {
    let earliest = null;

    for (const record of records) {
      try {
        // Skip records without date or time
        if (!record.date || !record.time) {
          continue;
        }

        const timestamp = parseDateTime(record.date, record.time);
        
        if (!earliest || timestamp < earliest.timestamp) {
          earliest = {
            date: record.date,
            time: record.time,
            timestamp: timestamp
          };
        }
      } catch (error) {
        // Skip records with invalid date/time formats
        continue;
      }
    }

    return earliest;
  }

  /**
   * Find the latest timestamp in an array of records
   * @param {EnhancedRecord[]} records - Array of records to search
   * @returns {DateTime|null} - Latest timestamp or null if no valid dates found
   */
  findLatestTimestamp(records) {
    let latest = null;

    for (const record of records) {
      try {
        // Skip records without date or time
        if (!record.date || !record.time) {
          continue;
        }

        const timestamp = parseDateTime(record.date, record.time);
        
        if (!latest || timestamp > latest.timestamp) {
          latest = {
            date: record.date,
            time: record.time,
            timestamp: timestamp
          };
        }
      } catch (error) {
        // Skip records with invalid date/time formats
        continue;
      }
    }

    return latest;
  }

  /**
   * Format a DateTime object for display
   * @param {DateTime} dateTime - DateTime object to format
   * @returns {string} - Formatted date/time string
   */
  formatDateTime(dateTime) {
    if (!dateTime) {
      return 'Unknown';
    }
    return `${dateTime.date} at ${dateTime.time}`;
  }
}
