/**
 * Duplicate Checker Module
 * Checks for and removes duplicate records in the database
 */

export class DuplicateChecker {
  /**
   * Create a new DuplicateChecker
   * @param {Object} databaseManager - Database manager instance
   */
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Check for duplicate records in the database
   * @returns {Promise<Object>} - Result object with duplicates info
   */
  async checkForDuplicates() {
    try {
      const records = await this.databaseManager.getAll();
      
      if (!records || records.length === 0) {
        return {
          hasDuplicates: false,
          totalRecords: 0,
          duplicateCount: 0,
          duplicates: [],
          message: 'No records in database'
        };
      }

      // Create a map to track duplicates
      const recordMap = new Map();
      const duplicates = [];

      records.forEach(record => {
        const signature = this.createRecordSignature(record);
        
        if (recordMap.has(signature)) {
          // Found a duplicate
          const existing = recordMap.get(signature);
          duplicates.push({
            signature,
            records: [existing, record]
          });
        } else {
          recordMap.set(signature, record);
        }
      });

      return {
        hasDuplicates: duplicates.length > 0,
        totalRecords: records.length,
        duplicateCount: duplicates.length,
        duplicates: duplicates,
        message: duplicates.length === 0 
          ? 'No duplicates found' 
          : `Found ${duplicates.length} duplicate record${duplicates.length !== 1 ? 's' : ''}`
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }

  /**
   * Remove duplicate records from the database
   * Keeps the first occurrence and removes subsequent duplicates
   * @returns {Promise<Object>} - Result object with removal info
   */
  async removeDuplicates() {
    try {
      const checkResult = await this.checkForDuplicates();
      
      if (!checkResult.hasDuplicates) {
        return {
          success: true,
          removedCount: 0,
          errorCount: 0,
          message: 'No duplicates to remove'
        };
      }

      // Collect all duplicate IDs to remove (keep first, remove rest)
      const idsToRemove = [];
      checkResult.duplicates.forEach(dup => {
        // Skip the first record (index 0), remove the rest
        for (let i = 1; i < dup.records.length; i++) {
          idsToRemove.push(dup.records[i].id);
        }
      });

      // Remove duplicates
      let removedCount = 0;
      let errorCount = 0;

      for (const id of idsToRemove) {
        try {
          await this.databaseManager.deleteById(id);
          removedCount++;
        } catch (error) {
          console.error(`Failed to remove duplicate ID ${id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        removedCount: removedCount,
        errorCount: errorCount,
        message: `Removed ${removedCount} duplicate record${removedCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} error${errorCount !== 1 ? 's' : ''})` : ''}`
      };
    } catch (error) {
      console.error('Error removing duplicates:', error);
      return {
        success: false,
        removedCount: 0,
        errorCount: 0,
        message: `Failed to remove duplicates: ${error.message}`
      };
    }
  }

  /**
   * Create a unique signature for a record to identify duplicates
   * @param {Object} record - Record to create signature for
   * @returns {string} - Unique signature string
   */
  createRecordSignature(record) {
    return `${record.date}|${record.time}|${record.total}|${record.type}|${record.member}`;
  }

  /**
   * Format duplicate info for display
   * @param {Object} checkResult - Result from checkForDuplicates
   * @returns {string} - Formatted HTML string
   */
  formatDuplicatesForDisplay(checkResult) {
    if (!checkResult.hasDuplicates) {
      return '<p class="success-message">✅ No duplicate records found in the database.</p>';
    }

    let html = `<p class="warning-message">⚠️ Found ${checkResult.duplicateCount} duplicate record${checkResult.duplicateCount !== 1 ? 's' : ''}:</p>`;
    html += '<div class="duplicate-list">';

    checkResult.duplicates.forEach((dup, index) => {
      html += `<div class="duplicate-group">`;
      html += `<h4>Duplicate #${index + 1}</h4>`;
      html += '<ul>';
      dup.records.forEach(record => {
        html += `<li>ID: ${record.id}, Date: ${record.date}, Time: ${record.time}, Type: ${record.type}, Member: ${record.member || '(empty)'}, Total: £${record.total}</li>`;
      });
      html += '</ul>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }
}
