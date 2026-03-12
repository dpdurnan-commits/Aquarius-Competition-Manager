/**
 * Jest setup file
 * Configures test environment with necessary polyfills and mocks
 */

import 'fake-indexeddb/auto';

// Polyfill for structuredClone (required by fake-indexeddb)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock PapaParse for testing
global.Papa = {
  parse: (text, config) => {
    try {
      // Simple CSV parsing implementation for tests
      const lines = [];
      let currentLine = [];
      let currentCell = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < text.length) {
        const char = text[i];
        
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            // Escaped quote
            currentCell += '"';
            i += 2; // Skip both quotes
            continue;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
            continue;
          }
        }
        
        if (char === ',' && !inQuotes) {
          // End of cell
          currentLine.push(currentCell);
          currentCell = '';
          i++;
          continue;
        }
        
        if (char === '\n' && !inQuotes) {
          // End of line
          currentLine.push(currentCell);
          lines.push(currentLine);
          currentLine = [];
          currentCell = '';
          i++;
          continue;
        }
        
        // Regular character (including newlines inside quotes)
        currentCell += char;
        i++;
      }
      
      // Add last cell and line if not empty
      if (currentCell !== '' || currentLine.length > 0) {
        currentLine.push(currentCell);
        lines.push(currentLine);
      }
      
      return {
        data: lines,
        errors: []
      };
    } catch (error) {
      return {
        data: [],
        errors: [{ message: error.message, row: 0 }]
      };
    }
  }
};
