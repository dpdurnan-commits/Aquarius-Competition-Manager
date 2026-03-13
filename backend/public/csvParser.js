/**
 * CSV Parser Module
 * Handles CSV file reading and parsing using PapaParse library
 */

// Papa is loaded globally from CDN
/* global Papa */

/**
 * Parse a CSV file and return structured data
 * @param {File} file - The CSV file to parse
 * @returns {Promise<ParseResult>} - Parsed data or error
 */
export async function parse(file) {
  try {
    // Validate input
    if (!file) {
      const error = 'No file provided';
      console.error('CSV Parser Error:', error);
      return {
        success: false,
        error: error
      };
    }

    // Read file content
    const text = await readFileAsText(file);
    
    if (!text || text.trim().length === 0) {
      const error = 'File is empty';
      console.error('CSV Parser Error:', error);
      return {
        success: false,
        error: error
      };
    }

    // Parse CSV using PapaParse (access from window object in module context)
    const Papa = window.Papa;
    if (!Papa || typeof Papa.parse !== 'function') {
      const error = 'PapaParse library not loaded. Please refresh the page.';
      console.error('CSV Parser Error:', error);
      return {
        success: false,
        error: error
      };
    }
    
    const parseResult = Papa.parse(text, {
      skipEmptyLines: false, // Preserve empty lines for accurate row indexing
      delimiter: ',',
      newline: '',
      quoteChar: '"',
      escapeChar: '"',
      header: false // We want raw 2D array, not objects
    });

    // Check for parsing errors
    if (parseResult.errors && parseResult.errors.length > 0) {
      const errorMessages = parseResult.errors
        .map(err => `Row ${err.row}: ${err.message}`)
        .join('; ');
      const userMessage = 'Unable to parse CSV file. Please ensure the file is a valid CSV format.';
      console.error('CSV Parser Error:', errorMessages);
      return {
        success: false,
        error: userMessage
      };
    }

    const rows = parseResult.data;

    // Filter out completely empty rows
    const nonEmptyRows = rows.filter(row => row.some(cell => cell && cell.trim() !== ''));

    // Validate minimum column count on first non-empty row (header)
    if (nonEmptyRows.length > 0) {
      const headerRow = nonEmptyRows[0];
      if (headerRow.length < 10) {
        const error = `CSV file must contain at least 10 columns (A through J). Found ${headerRow.length} columns.`;
        console.error('CSV Parser Error:', error);
        return {
          success: false,
          error: error
        };
      }
    }

    console.log('CSV parsed successfully:', rows.length, 'rows');
    return {
      success: true,
      rows: rows
    };

  } catch (error) {
    const userMessage = `Error reading file: ${error.message}`;
    console.error('CSV Parser Error:', error);
    return {
      success: false,
      error: userMessage
    };
  }
}

/**
 * Read file content as text using FileReader API
 * @param {File} file - The file to read
 * @returns {Promise<string>} - File content as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * @typedef {Object} ParseResult
 * @property {boolean} success - Whether parsing succeeded
 * @property {string[][]} [rows] - Parsed CSV data as 2D array (if success)
 * @property {string} [error] - Error message (if failure)
 */
