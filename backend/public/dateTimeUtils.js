/**
 * Date/Time Utility Functions
 * Provides date and time parsing utilities for chronological validation
 */

/**
 * @typedef {Object} DateTime
 * @property {string} date - Date string
 * @property {string} time - Time string
 * @property {number} timestamp - Unix timestamp in milliseconds
 */

/**
 * Parse date and time strings into Unix timestamp
 * Supports multiple date formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
 * Supports time formats: HH:MM:SS, HH:MM
 * 
 * @param {string} date - Date string
 * @param {string} time - Time string
 * @returns {number} - Unix timestamp in milliseconds
 * @throws {Error} - If date or time format is invalid
 */
export function parseDateTime(date, time) {
  if (!date || !time) {
    throw new Error('Date and time are required');
  }

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
  if (timeParts.length < 2) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  const seconds = timeParts.length >= 3 ? parseInt(timeParts[2], 10) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error(`Invalid time format: ${time}`);
  }

  parsedDate.setHours(hours, minutes, seconds, 0);

  return parsedDate.getTime();
}

/**
 * Format a timestamp as a readable date/time string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Formatted date/time string (DD/MM/YYYY HH:MM:SS)
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Compare two date/time strings chronologically
 * @param {string} date1 - First date string
 * @param {string} time1 - First time string
 * @param {string} date2 - Second date string
 * @param {string} time2 - Second time string
 * @returns {number} - Negative if first is earlier, positive if later, 0 if equal
 */
export function compareDateTimes(date1, time1, date2, time2) {
  try {
    const timestamp1 = parseDateTime(date1, time1);
    const timestamp2 = parseDateTime(date2, time2);
    return timestamp1 - timestamp2;
  } catch (error) {
    throw new Error(`Failed to compare date/times: ${error.message}`);
  }
}
