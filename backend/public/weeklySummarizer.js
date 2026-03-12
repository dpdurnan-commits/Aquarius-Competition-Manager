/**
 * Weekly Summarizer Module
 * Groups transactions into weekly periods and calculates financial summaries
 */

/**
 * @typedef {Object} EnhancedRecord
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
 */

/**
 * @typedef {Object} WeeklySummary
 * @property {Date} fromDate - Monday 00:00:00
 * @property {Date} toDate - Sunday 23:59:59
 * @property {number} startingPurse - Starting Competition Purse Balance
 * @property {number} purseApplicationTopUp - Competition Purse Application Top Up
 * @property {number} purseTillTopUp - Competition Purse Till Top Up
 * @property {number} competitionEntries - Competition Entries
 * @property {number} competitionRefunds - Competition Refunds
 * @property {number} finalPurse - Final Competition Purse
 * @property {number} startingPot - Starting Competition Pot
 * @property {number} winningsPaid - Competition Winnings Paid (placeholder: 0)
 * @property {number} competitionCosts - Competition Costs (placeholder: 0)
 * @property {number} finalPot - Final Competition Pot
 */

/**
 * @typedef {Object} WeeklyPeriod
 * @property {Date} start - Monday 00:00:00
 * @property {Date} end - Sunday 23:59:59
 */

/**
 * Weekly Summarizer class
 * Generates weekly financial summaries from transaction records
 */
export class WeeklySummarizer {
  /**
   * Constructor
   * @param {Object} databaseManager - Database manager instance (optional, for recalculation)
   */
  constructor(databaseManager = null) {
    this.databaseManager = databaseManager;
  }

  /**
   * Generate weekly summaries from an array of records
   * @param {EnhancedRecord[]} records - Array of transaction records
   * @returns {WeeklySummary[]} - Array of weekly summaries
   */
  generateSummaries(records) {
    try {
      // Handle empty records
      if (!records || records.length === 0) {
        return [];
      }

      // Validate and parse dates
      const validRecords = [];
      const invalidRecords = [];
      
      for (const record of records) {
        try {
          // Validate that record has required fields
          if (!record.date || !record.time) {
            invalidRecords.push({ record, reason: 'Missing date or time' });
            continue;
          }
          
          // Try to parse the date to validate it
          this.parseDate(record.date, record.time);
          validRecords.push(record);
        } catch (error) {
          invalidRecords.push({ record, reason: error.message });
        }
      }
      
      // Log invalid records
      if (invalidRecords.length > 0) {
        console.warn(`WeeklySummarizer: Skipping ${invalidRecords.length} record(s) with invalid dates:`, invalidRecords);
      }
      
      // If no valid records, return empty array
      if (validRecords.length === 0) {
        console.warn('WeeklySummarizer: No valid records to summarize');
        return [];
      }

      // Find earliest and latest dates
      const dates = validRecords.map(r => this.parseDate(r.date, r.time));
      const earliestDate = new Date(Math.min(...dates));
      const latestDate = new Date(Math.max(...dates));

      // Generate all weekly periods
      const weeklyPeriods = this.generateWeeklyPeriods(earliestDate, latestDate);

      // Group records by week
      const recordsByWeek = this.groupRecordsByWeek(validRecords, weeklyPeriods);

      // Calculate summaries for each period
      const summaries = [];
      let previousPurseFinal = 0;
      let previousPotFinal = 0;

      for (const period of weeklyPeriods) {
        try {
          const weekRecords = recordsByWeek.get(period) || [];

          // Calculate Competition Purse components
          const purseComponents = this.calculatePurseComponents(weekRecords);
          // Formula: Starting + AppTopUp + TillTopUp - Entries - Refunds
          // Note: Refunds are stored as negative values (e.g., -10.00), so subtracting them adds to purse
          const finalPurse = previousPurseFinal + 
                            purseComponents.applicationTopUp + 
                            purseComponents.tillTopUp - 
                            purseComponents.entries - 
                            purseComponents.refunds;

          // Calculate Competition Pot components
          const potComponents = this.calculatePotComponents(weekRecords);
          // Formula: Starting + Entries - Refunds - Winnings - Costs
          // Note: Refunds are stored as negative values (e.g., -10.00)
          // Subtracting a negative value increases the pot (money returned to club from members)
          const finalPot = previousPotFinal + 
                          purseComponents.entries - 
                          purseComponents.refunds - 
                          potComponents.winningsPaid - 
                          potComponents.costs;

          const summary = {
            fromDate: period.start,
            toDate: period.end,
            startingPurse: previousPurseFinal,
            purseApplicationTopUp: purseComponents.applicationTopUp,
            purseTillTopUp: purseComponents.tillTopUp,
            competitionEntries: purseComponents.entries,
            competitionRefunds: purseComponents.refunds,
            finalPurse: finalPurse,
            startingPot: previousPotFinal,
            winningsPaid: potComponents.winningsPaid,
            competitionCosts: potComponents.costs,
            finalPot: finalPot
          };

          summaries.push(summary);

          // Update for next iteration
          previousPurseFinal = finalPurse;
          previousPotFinal = finalPot;
        } catch (error) {
          // Log error but continue with other weeks
          console.error(`WeeklySummarizer: Error calculating summary for week ${period.start.toISOString()} to ${period.end.toISOString()}:`, error);
          // Return partial results up to this point
          console.warn('WeeklySummarizer: Returning partial results due to calculation error');
          break;
        }
      }

      return summaries;
    } catch (error) {
      console.error('WeeklySummarizer: Fatal error generating summaries:', error);
      // Return empty array on fatal error
      return [];
    }
  }

  /**
   * Get Monday 00:00:00 for any date
   * @param {Date} date - Any date
   * @returns {Date} - Monday of that week at 00:00:00
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
   * Get Sunday 23:59:59 for any date
   * @param {Date} date - Any date
   * @returns {Date} - Sunday of that week at 23:59:59
   */
  getSundayOfWeek(date) {
    const monday = this.getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return sunday;
  }

  /**
   * Generate array of weekly periods between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {WeeklyPeriod[]} - Array of weekly periods
   */
  generateWeeklyPeriods(startDate, endDate) {
    const periods = [];
    let current = this.getMondayOfWeek(startDate);
    const end = this.getSundayOfWeek(endDate);

    while (current <= end) {
      const periodStart = new Date(current);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(current);
      periodEnd.setDate(current.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);

      periods.push({
        start: periodStart,
        end: periodEnd
      });

      // Move to next Monday
      current = new Date(current);
      current.setDate(current.getDate() + 7);
    }

    return periods;
  }

  /**
   * Group records by their respective weekly periods
   * @param {EnhancedRecord[]} records - Array of records
   * @param {WeeklyPeriod[]} periods - Array of weekly periods
   * @returns {Map<WeeklyPeriod, EnhancedRecord[]>} - Map of periods to records
   */
  groupRecordsByWeek(records, periods) {
    const grouped = new Map();

    // Initialize map with empty arrays for each period
    for (const period of periods) {
      grouped.set(period, []);
    }

    // Assign each record to its period
    for (const record of records) {
      try {
        const recordDate = this.parseDate(record.date, record.time);

        for (const period of periods) {
          if (recordDate >= period.start && recordDate <= period.end) {
            grouped.get(period).push(record);
            break;
          }
        }
      } catch (error) {
        // Skip records with invalid dates
        console.warn(`Skipping record with invalid date: ${record.date} ${record.time}`);
      }
    }

    return grouped;
  }

  /**
   * Filter and sum Total field based on predicate
   * @param {EnhancedRecord[]} records - Array of records
   * @param {Function} predicate - Filter function
   * @returns {number} - Sum of Total fields for matching records
   */
  sumWhere(records, predicate) {
    let sum = 0;
    let invalidCount = 0;
    
    for (const record of records) {
      try {
        if (predicate(record)) {
          // Validate and parse total field
          if (record.total === null || record.total === undefined || record.total === '') {
            invalidCount++;
            continue;
          }
          
          const total = parseFloat(record.total);
          
          if (isNaN(total)) {
            console.warn(`WeeklySummarizer: Invalid total value "${record.total}" in record at ${record.date} ${record.time}`);
            invalidCount++;
            continue;
          }
          
          sum += total;
        }
      } catch (error) {
        console.warn(`WeeklySummarizer: Error processing record at ${record.date} ${record.time}:`, error);
        invalidCount++;
      }
    }
    
    if (invalidCount > 0) {
      console.warn(`WeeklySummarizer: Skipped ${invalidCount} record(s) with invalid or missing total values`);
    }
    
    return sum;
  }

  /**
   * Calculate all Competition Purse component values
   * @param {EnhancedRecord[]} records - Array of records for the week
   * @returns {Object} - Object with purse component values
   */
  calculatePurseComponents(records) {
    // Application Top Up: Till is empty AND Type equals "Topup (Competitions)"
    const applicationTopUp = this.sumWhere(
      records,
      r => r.till === '' && r.type === 'Topup (Competitions)'
    );

    // Till Top Up: Till equals "Till 1" AND Type equals "Topup (Competitions)"
    const tillTopUp = this.sumWhere(
      records,
      r => r.till === 'Till 1' && r.type === 'Topup (Competitions)'
    );

    // Entries: Type equals "Sale"
    const entries = this.sumWhere(
      records,
      r => r.type === 'Sale'
    );

    // Refunds: Type equals "Refund"
    const refunds = this.sumWhere(
      records,
      r => r.type === 'Refund'
    );

    return {
      applicationTopUp,
      tillTopUp,
      entries,
      refunds
    };
  }

  /**
   * Calculate all Competition Pot component values
   * @param {EnhancedRecord[]} records - Array of records for the week
   * @returns {Object} - Object with pot component values
   */
  calculatePotComponents(records) {
    // Winnings Paid: Sum of Total for flagged transactions
    const winningsPaid = this.sumWhere(
      records,
      r => r.isWinning === true
    );

    // Competition Costs: Placeholder (0)
    const costs = 0;

    return {
      winningsPaid,
      costs
    };
  }

  /**
   * Parse date and time strings into Date object
   * @param {string} date - Date string (DD/MM/YYYY, YYYY-MM-DD, or DD-MM-YYYY)
   * @param {string} time - Time string (HH:MM:SS or HH:MM)
   * @returns {Date} - Parsed Date object
   */
  parseDate(date, time) {
    // Validate inputs
    if (!date || !time) {
      throw new Error(`Missing date or time: date="${date}", time="${time}"`);
    }
    
    // Try to parse different date formats
    let parsedDate;

    try {
      // Try DD/MM/YYYY format
      if (date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(parts[2], 10);
          
          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            throw new Error(`Invalid date components in "${date}"`);
          }
          
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
            
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
              throw new Error(`Invalid date components in "${date}"`);
            }
            
            parsedDate = new Date(year, month, day);
          }
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: "${date}"`);
      }

      // Parse time
      const timeParts = time.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = parseInt(timeParts[2], 10) || 0;
      
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid time format: "${time}"`);
      }

      parsedDate.setHours(hours, minutes, seconds, 0);

      return parsedDate;
    } catch (error) {
      throw new Error(`Failed to parse date/time "${date} ${time}": ${error.message}`);
    }
  }

  /**
   * Recalculate weekly summaries from a specific date forward
   * @param {string} startDate - Date string to start recalculation from
   * @returns {Promise<WeeklySummary[]>} - Array of recalculated weekly summaries
   */
  async recalculateFromDate(startDate) {
    if (!this.databaseManager) {
      throw new Error('Database manager not provided to WeeklySummarizer');
    }

    // Get all records from database
    const allRecords = await this.databaseManager.getAll();

    // Find the Monday of the week containing startDate
    const affectedWeekStart = this.getMondayOfWeek(this.parseDate(startDate, '00:00:00'));

    // Regenerate all summaries (this will recalculate from the beginning to maintain rolling balances)
    const summaries = this.generateSummaries(allRecords);

    return summaries;
  }
}
