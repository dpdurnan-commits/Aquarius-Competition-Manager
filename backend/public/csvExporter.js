/**
 * CSV Exporter Module
 * Handles CSV generation and browser download
 */

/**
 * Escape a field value according to RFC 4180
 * @param {string} field - The field value to escape
 * @returns {string} - Escaped field value
 */
function escapeCSVField(field) {
  // Convert to string and handle null/undefined
  const value = field == null ? '' : String(field);
  
  // Check if field contains special characters (comma, quote, newline)
  const needsQuoting = value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');
  
  if (needsQuoting) {
    // Escape internal quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    // Wrap in quotes
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Generate CSV content from transformed records
 * @param {Array<Object>} records - Array of TransformedRecord or EnhancedRecord objects
 * @returns {string} - CSV content as string
 */
export function generateCSV(records) {
  try {
    // Check if records have Player and Competition fields (EnhancedRecord)
    const hasEnhancedFields = records.length > 0 && ('player' in records[0] || 'competition' in records[0]);
    
    // Generate header row
    const headers = hasEnhancedFields 
      ? ['Date', 'Time', 'Till', 'Type', 'Member', 'Player', 'Competition', 'Price', 'Discount', 'Subtotal', 'VAT', 'Total']
      : ['Date', 'Time', 'Till', 'Type', 'Member', 'Price', 'Discount', 'Subtotal', 'VAT', 'Total'];
    const headerRow = headers.join(',');
    
    // Generate data rows
    const dataRows = records.map(record => {
      const fields = hasEnhancedFields
        ? [
            record.date,
            record.time,
            record.till,
            record.type,
            record.member,
            record.player || '',
            record.competition || '',
            record.price,
            record.discount,
            record.subtotal,
            record.vat,
            record.total
          ]
        : [
            record.date,
            record.time,
            record.till,
            record.type,
            record.member,
            record.price,
            record.discount,
            record.subtotal,
            record.vat,
            record.total
          ];
      
      // Escape each field and join with commas
      return fields.map(escapeCSVField).join(',');
    });
    
    // Combine header and data rows
    const allRows = [headerRow, ...dataRows];
    return allRows.join('\n');
  } catch (error) {
    console.error('CSV Generation Error:', error);
    throw new Error('Failed to generate CSV content');
  }
}

/**
 * Generate filename with timestamp
 * @returns {string} - Filename with timestamp
 */
export function generateFilename() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `competition-records-${timestamp}.csv`;
}

/**
 * Trigger browser download of CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
  try {
    // Create Blob with CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create anchor element for download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV Download Error:', error);
    throw new Error('Failed to trigger CSV download');
  }
}

/**
 * Export transformed records as CSV file
 * @param {Array<Object>} records - Array of TransformedRecord objects
 * @param {string} [filename] - Optional custom filename
 */
export function exportCSV(records, filename) {
  try {
    if (!records || records.length === 0) {
      throw new Error('No records to export');
    }
    
    const csvContent = generateCSV(records);
    const finalFilename = filename || generateFilename();
    downloadCSV(csvContent, finalFilename);
    
    console.log('CSV export successful:', records.length, 'records exported');
  } catch (error) {
    console.error('CSV Export Error:', error);
    throw error; // Re-throw to be caught by caller
  }
}
