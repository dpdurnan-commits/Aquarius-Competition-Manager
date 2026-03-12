/**
 * Transaction Flagger Module
 * Handles flagging transactions as competition winnings
 */

/**
 * @typedef {Object} EnhancedRecord
 * @property {number} [id] - Auto-incrementing primary key
 * @property {string} date - Transaction date
 * @property {string} time - Transaction time
 * @property {string} till - Till identifier
 * @property {string} type - Transaction type (Topup/Sale/Refund)
 * @property {string} member - Member field
 * @property {string} player - Extracted player name
 * @property {string} competition - Extracted competition name
 * @property {string} price - Price value
 * @property {string} discount - Discount value
 * @property {string} subtotal - Subtotal value
 * @property {string} vat - VAT value
 * @property {string} total - Total value
 * @property {number} sourceRowIndex - Original row position in CSV
 * @property {boolean} isComplete - True if all required data present
 * @property {boolean} isWinning - True if flagged as winnings
 * @property {number|null} winningCompetitionId - Competition ID if flagged
 */

export class TransactionFlagger {
  constructor(apiClient, competitionManager, weeklySummarizer) {
    this.apiClient = apiClient;
    this.competitionManager = competitionManager;
    this.weeklySummarizer = weeklySummarizer;
  }

  /**
   * Flag a transaction as competition winnings
   * @param {number} recordId - Transaction record ID
   * @param {number} competitionId - Competition ID to associate
   * @returns {Promise<void>}
   * @throws {Error} If validation fails
   */
  async flagTransaction(recordId, competitionId) {
    // Get transaction record
    const transaction = await this.apiClient.getById(recordId);

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // Validate transaction type
    if (transaction.type !== 'Topup (Competitions)') {
      const error = new Error('Only Topup (Competitions) transactions can be flagged');
      error.code = 'INVALID_TRANSACTION_TYPE';
      throw error;
    }

    // Validate competition exists
    const competition = await this.competitionManager.getById(competitionId);
    if (!competition) {
      const error = new Error('Competition not found');
      error.code = 'COMPETITION_NOT_FOUND';
      throw error;
    }

    // Check if transaction is already flagged
    if (transaction.isWinning) {
      // Transaction is already flagged, just update the competition association
      const flaggedTransactions = await this.apiClient.getAllFlaggedTransactions();
      const flagged = flaggedTransactions.find(ft => 
        (ft.transactionId === recordId || ft.transaction_id === recordId)
      );
      
      if (flagged) {
        await this.apiClient.associateWithCompetition(flagged.id, competitionId);
      }
    } else {
      // Transaction is not flagged yet, create new flag
      try {
        await this.apiClient.flagTransaction(recordId);
        
        // Associate with competition
        const flaggedTransactions = await this.apiClient.getAllFlaggedTransactions();
        const flagged = flaggedTransactions.find(ft => 
          (ft.transactionId === recordId || ft.transaction_id === recordId)
        );
        
        if (flagged) {
          await this.apiClient.associateWithCompetition(flagged.id, competitionId);
        }
      } catch (error) {
        const wrappedError = new Error(`Failed to flag transaction: ${error.message}`);
        wrappedError.code = error.code || 'FLAG_FAILED';
        wrappedError.originalError = error;
        throw wrappedError;
      }
    }

    // Trigger recalculation
    await this.recalculateFromTransaction(transaction);
  }

  /**
   * Unflag a transaction (remove winnings flag)
   * @param {number} recordId - Transaction record ID
   * @returns {Promise<void>}
   * @throws {Error} If transaction not found
   */
  async unflagTransaction(recordId) {
    // Get transaction record
    const transaction = await this.apiClient.getById(recordId);

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // Find and remove the flag via API
    try {
      const flaggedTransactions = await this.apiClient.getAllFlaggedTransactions();
      const flagged = flaggedTransactions.find(ft => 
        (ft.transactionId === recordId || ft.transaction_id === recordId)
      );
      
      if (flagged) {
        await this.apiClient.unflagTransaction(flagged.id);
      }

      // Trigger recalculation
      await this.recalculateFromTransaction(transaction);
    } catch (error) {
      const wrappedError = new Error(`Failed to unflag transaction: ${error.message}`);
      wrappedError.code = error.code || 'UNFLAG_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Update the competition association for a flagged transaction
   * @param {number} recordId - Transaction record ID
   * @param {number} competitionId - New competition ID
   * @returns {Promise<void>}
   * @throws {Error} If validation fails
   */
  async updateFlag(recordId, competitionId) {
    // Get transaction record
    const transaction = await this.apiClient.getById(recordId);

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // Validate competition exists
    const competition = await this.competitionManager.getById(competitionId);
    if (!competition) {
      const error = new Error('Competition not found');
      error.code = 'COMPETITION_NOT_FOUND';
      throw error;
    }

    // Update competition association via API
    try {
      const flaggedTransactions = await this.apiClient.getAllFlaggedTransactions();
      const flagged = flaggedTransactions.find(ft => 
        (ft.transactionId === recordId || ft.transaction_id === recordId)
      );
      
      if (flagged) {
        await this.apiClient.associateWithCompetition(flagged.id, competitionId);
      }

      // Trigger recalculation
      await this.recalculateFromTransaction(transaction);
    } catch (error) {
      const wrappedError = new Error(`Failed to update flag: ${error.message}`);
      wrappedError.code = error.code || 'UPDATE_FLAG_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Check if a transaction can be flagged as winnings
   * @param {EnhancedRecord} record - Transaction record
   * @returns {boolean} - True if transaction can be flagged
   */
  canFlag(record) {
    return record.type === 'Topup (Competitions)';
  }

  /**
   * Trigger recalculation of weekly summaries from a transaction's date
   * @param {EnhancedRecord} transaction - Transaction that was modified
   * @returns {Promise<void>}
   * @private
   */
  async recalculateFromTransaction(transaction) {
    // This method will be implemented when Weekly Summarizer is updated
    // For now, it's a placeholder that can be called
    // The actual recalculation logic will be added in Task 5
    
    // Parse the transaction date to find the Monday of that week
    const transactionDate = this.parseDate(transaction.date, transaction.time);
    const monday = this.getMondayOfWeek(transactionDate);
    
    // In Task 5, this will call weeklySummarizer.recalculateFromDate(monday)
    // For now, we just log that recalculation would happen
    console.log(`Recalculation triggered from date: ${monday.toISOString()}`);
  }

  /**
   * Get Monday 00:00:00 for any date
   * @param {Date} date - Any date
   * @returns {Date} - Monday of that week at 00:00:00
   * @private
   */
  getMondayOfWeek(date) {
    const result = new Date(date);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to subtract to get to Monday
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    result.setDate(result.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }

  /**
   * Parse date and time strings into Date object
   * @param {string} date - Date string (DD/MM/YYYY, YYYY-MM-DD, or DD-MM-YYYY)
   * @param {string} time - Time string (HH:MM:SS or HH:MM)
   * @returns {Date} - Parsed Date object
   * @private
   */
  parseDate(date, time) {
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

    return parsedDate;
  }
}
