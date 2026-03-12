/**
 * Record Transformer Module
 * Handles identification and transformation of competition records
 */

/**
 * @typedef {Object} TransformedRecord
 * @property {string} date - Column A - original value
 * @property {string} time - Column B - original value
 * @property {string} till - Column C - original value
 * @property {string} type - Column D - original value (Topup/Sale/Refund)
 * @property {string} member - Column E - original or concatenated
 * @property {string} price - Column F - from row+2
 * @property {string} discount - Column G - from row+2
 * @property {string} subtotal - Column H - from row+2
 * @property {string} vat - Column I - from row+2
 * @property {string} total - Column J - from row+2
 * @property {number} sourceRowIndex - Original row position in CSV
 * @property {boolean} isComplete - True if all required data present
 */

/**
 * @typedef {Object} TransformError
 * @property {number} rowIndex - Row where error occurred
 * @property {string} message - Human-readable error description
 * @property {'warning' | 'error'} severity - Error severity level
 */

/**
 * @typedef {Object} TransformResult
 * @property {TransformedRecord[]} records - Array of transformed records
 * @property {TransformError[]} errors - Array of transformation errors
 */

export { };

/**
 * Convert date from DD-MM-YYYY format to ISO 8601 YYYY-MM-DD format
 * @param {string} dateStr - Date string in DD-MM-YYYY format
 * @returns {string} - Date string in YYYY-MM-DD format
 */
function convertDateToISO(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return '';
  }
  
  // Check if already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert from DD-MM-YYYY to YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  
  // Return as-is if format is unexpected
  return dateStr;
}

/**
 * Check if a row is a Topup record
 * @param {string[]} row - The CSV row to check
 * @returns {boolean} - True if row is a Topup record
 */
export function isTopupRecord(row) {
  // Column A (Date) must be non-empty AND Column D (Type) must equal "Topup (Competitions)"
  return !!(row[0] && row[0].trim() !== '' && row[3] === 'Topup (Competitions)');
}

/**
 * Check if a row is a Sale record
 * @param {string[][]} rows - All CSV rows
 * @param {number} rowIndex - Index of the row to check
 * @returns {boolean} - True if row is a Sale record with Competition Entry
 */
export function isSaleRecord(rows, rowIndex) {
  const row = rows[rowIndex];
  
  // Column A (Date) must be non-empty AND Column D (Type) must equal "Sale"
  if (!row[0] || row[0].trim() === '' || row[3] !== 'Sale') {
    return false;
  }
  
  // Check if row+2 exists and has "Competition Entry" in Column E
  const targetRow = rows[rowIndex + 2];
  if (!targetRow) {
    return false;
  }
  
  return targetRow[4] && targetRow[4].includes('Competition Entry');
}

/**
 * Check if a row is a Refund record
 * @param {string[][]} rows - All CSV rows
 * @param {number} rowIndex - Index of the row to check
 * @returns {boolean} - True if row is a Refund record with Competition Entry
 */
export function isRefundRecord(rows, rowIndex) {
  const row = rows[rowIndex];
  
  // Column A (Date) must be non-empty AND Column D (Type) must equal "Refund"
  if (!row[0] || row[0].trim() === '' || row[3] !== 'Refund') {
    return false;
  }
  
  // Check if row+2 exists and has "Competition Entry" in Column E
  const targetRow = rows[rowIndex + 2];
  if (!targetRow) {
    return false;
  }
  
  return targetRow[4] && targetRow[4].includes('Competition Entry');
}

/**
 * Transform a Topup record
 * @param {string[][]} rows - All CSV rows
 * @param {number} rowIndex - Index of the row to transform
 * @returns {TransformedRecord} - Transformed record
 */
export function transformTopupRecord(rows, rowIndex) {
  const row = rows[rowIndex];
  const targetRow = rows[rowIndex + 2];
  
  // Check if row+2 exists
  const isComplete = !!targetRow;
  
  return {
    date: convertDateToISO(row[0] || ''),
    time: row[1] || '',
    till: row[2] || '',
    type: row[3] || '',
    member: row[4] || '',
    price: isComplete ? (targetRow[5] || '') : '',
    discount: isComplete ? (targetRow[6] || '') : '',
    subtotal: isComplete ? (targetRow[7] || '') : '',
    vat: isComplete ? (targetRow[8] || '') : '',
    total: isComplete ? (targetRow[9] || '') : '',
    sourceRowIndex: rowIndex,
    isComplete: isComplete
  };
}

/**
 * Transform a Sale record
 * @param {string[][]} rows - All CSV rows
 * @param {number} rowIndex - Index of the row to transform
 * @returns {TransformedRecord} - Transformed record
 */
export function transformSaleRecord(rows, rowIndex) {
  const row = rows[rowIndex];
  const targetRow = rows[rowIndex + 2];
  
  // Check if row+2 exists
  const isComplete = !!targetRow;
  
  // Concatenate Column E (Member): current + " & " + row+2
  const memberValue = isComplete 
    ? `${row[4] || ''} & ${targetRow[4] || ''}`
    : row[4] || '';
  
  return {
    date: convertDateToISO(row[0] || ''),
    time: row[1] || '',
    till: row[2] || '',
    type: row[3] || '',
    member: memberValue,
    price: isComplete ? (targetRow[5] || '') : '',
    discount: isComplete ? (targetRow[6] || '') : '',
    subtotal: isComplete ? (targetRow[7] || '') : '',
    vat: isComplete ? (targetRow[8] || '') : '',
    total: isComplete ? (targetRow[9] || '') : '',
    sourceRowIndex: rowIndex,
    isComplete: isComplete
  };
}

/**
 * Transform a Refund record
 * @param {string[][]} rows - All CSV rows
 * @param {number} rowIndex - Index of the row to transform
 * @returns {TransformedRecord} - Transformed record
 */
export function transformRefundRecord(rows, rowIndex) {
  const row = rows[rowIndex];
  const targetRow = rows[rowIndex + 2];
  
  // Check if row+2 exists
  const isComplete = !!targetRow;
  
  // Concatenate Column E (Member): current + " & " + row+2
  const memberValue = isComplete 
    ? `${row[4] || ''} & ${targetRow[4] || ''}`
    : row[4] || '';
  
  return {
    date: convertDateToISO(row[0] || ''),
    time: row[1] || '',
    till: row[2] || '',
    type: row[3] || '',
    member: memberValue,
    price: isComplete ? (targetRow[5] || '') : '',
    discount: isComplete ? (targetRow[6] || '') : '',
    subtotal: isComplete ? (targetRow[7] || '') : '',
    vat: isComplete ? (targetRow[8] || '') : '',
    total: isComplete ? (targetRow[9] || '') : '',
    sourceRowIndex: rowIndex,
    isComplete: isComplete
  };
}

/**
 * Transform CSV rows into competition records
 * @param {string[][]} rows - Parsed CSV data as 2D array
 * @returns {TransformResult} - Transformed records and errors
 */
export function transform(rows) {
  const records = [];
  const errors = [];
  
  if (!rows || rows.length === 0) {
    return { records, errors };
  }
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip rows with empty Column A (Date)
    if (!row[0] || row[0].trim() === '') {
      continue;
    }
    
    // Check for Topup record
    if (isTopupRecord(row)) {
      const record = transformTopupRecord(rows, i);
      records.push(record);
      
      // Log error if incomplete
      if (!record.isComplete) {
        errors.push({
          rowIndex: i,
          message: `Topup record at row ${i} is incomplete: row+2 does not exist`,
          severity: 'warning'
        });
      }
      continue;
    }
    
    // Check for Sale record
    if (isSaleRecord(rows, i)) {
      const record = transformSaleRecord(rows, i);
      records.push(record);
      
      // Log error if incomplete
      if (!record.isComplete) {
        errors.push({
          rowIndex: i,
          message: `Sale record at row ${i} is incomplete: row+2 does not exist`,
          severity: 'warning'
        });
      }
      continue;
    }
    
    // Check for Refund record
    if (isRefundRecord(rows, i)) {
      const record = transformRefundRecord(rows, i);
      records.push(record);
      
      // Log error if incomplete
      if (!record.isComplete) {
        errors.push({
          rowIndex: i,
          message: `Refund record at row ${i} is incomplete: row+2 does not exist`,
          severity: 'warning'
        });
      }
      continue;
    }
    
    // Row does not match any criteria - skip silently
  }
  
  return { records, errors };
}
