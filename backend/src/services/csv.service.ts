import Papa from 'papaparse';
import { TransactionRecord } from '../types';

export interface CSVParseResult {
  success: boolean;
  rows?: string[][];
  error?: string;
}

export interface TransformResult {
  records: TransactionRecord[];
  errors: TransformError[];
}

export interface TransformError {
  rowIndex: number;
  message: string;
  severity: 'warning' | 'error';
}

export class CSVService {
  /**
   * Parse CSV text content
   */
  parseCSV(text: string): CSVParseResult {
    try {
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'File is empty'
        };
      }

      // Parse CSV using PapaParse
      const parseResult = Papa.parse<string[]>(text, {
        skipEmptyLines: false,
        delimiter: ',',
        quoteChar: '"',
        escapeChar: '"',
        header: false
      });

      // Check for parsing errors
      if (parseResult.errors && parseResult.errors.length > 0) {
        const errorMessages = parseResult.errors
          .map((err: Papa.ParseError) => `Row ${err.row}: ${err.message}`)
          .join('; ');
        return {
          success: false,
          error: `Unable to parse CSV file: ${errorMessages}`
        };
      }

      const rows = parseResult.data;

      // Filter out completely empty rows
      const nonEmptyRows = rows.filter((row: string[]) => 
        Array.isArray(row) && row.some(cell => cell && cell.trim() !== '')
      );

      // Validate minimum column count on first non-empty row (header)
      if (nonEmptyRows.length > 0) {
        const headerRow = nonEmptyRows[0];
        if (headerRow.length < 10) {
          return {
            success: false,
            error: `CSV file must contain at least 10 columns (A through J). Found ${headerRow.length} columns.`
          };
        }
      }

      return {
        success: true,
        rows: rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a row is a Topup record
   */
  private isTopupRecord(row: string[]): boolean {
    return !!(row[0] && row[0].trim() !== '' && row[3] === 'Topup (Competitions)');
  }

  /**
   * Check if a row is a Sale record
   */
  private isSaleRecord(rows: string[][], rowIndex: number): boolean {
    const row = rows[rowIndex];
    
    if (!row[0] || row[0].trim() === '' || row[3] !== 'Sale') {
      return false;
    }
    
    const targetRow = rows[rowIndex + 2];
    if (!targetRow) {
      return false;
    }
    
    return !!(targetRow[4] && targetRow[4].includes('Competition Entry'));
  }

  /**
   * Check if a row is a Refund record
   */
  private isRefundRecord(rows: string[][], rowIndex: number): boolean {
    const row = rows[rowIndex];
    
    if (!row[0] || row[0].trim() === '' || row[3] !== 'Refund') {
      return false;
    }
    
    const targetRow = rows[rowIndex + 2];
    if (!targetRow) {
      return false;
    }
    
    return !!(targetRow[4] && targetRow[4].includes('Competition Entry'));
  }

  /**
   * Transform a Topup record
   */
  private transformTopupRecord(rows: string[][], rowIndex: number): TransactionRecord {
    const row = rows[rowIndex];
    const targetRow = rows[rowIndex + 2];

    return {
      date: row[0] || '',
      time: row[1] || '',
      till: row[2] || '',
      type: row[3] || '',
      member: row[4] || '',
      price: targetRow ? targetRow[5] || '' : '',
      discount: targetRow ? targetRow[6] || '' : '',
      subtotal: targetRow ? targetRow[7] || '' : '',
      vat: targetRow ? targetRow[8] || '' : '',
      total: targetRow ? targetRow[9] || '' : '',
      sourceRowIndex: rowIndex,
      isComplete: !!targetRow,
      player: '',
      competition: ''
    };
  }

  /**
   * Transform a Sale record
   */
  private transformSaleRecord(rows: string[][], rowIndex: number): TransactionRecord {
    const row = rows[rowIndex];
    const targetRow = rows[rowIndex + 2];

    // Concatenate member with Competition Entry
    const member = row[4] ? `${row[4]} & Competition Entry` : '';

    return {
      date: row[0] || '',
      time: row[1] || '',
      till: row[2] || '',
      type: row[3] || '',
      member: member,
      price: targetRow ? targetRow[5] || '' : '',
      discount: targetRow ? targetRow[6] || '' : '',
      subtotal: targetRow ? targetRow[7] || '' : '',
      vat: targetRow ? targetRow[8] || '' : '',
      total: targetRow ? targetRow[9] || '' : '',
      sourceRowIndex: rowIndex,
      isComplete: !!targetRow,
      player: '',
      competition: ''
    };
  }

  /**
   * Transform a Refund record
   */
  private transformRefundRecord(rows: string[][], rowIndex: number): TransactionRecord {
    const row = rows[rowIndex];
    const targetRow = rows[rowIndex + 2];

    // Concatenate member with Competition Entry
    const member = row[4] ? `${row[4]} & Competition Entry` : '';

    return {
      date: row[0] || '',
      time: row[1] || '',
      till: row[2] || '',
      type: row[3] || '',
      member: member,
      price: targetRow ? targetRow[5] || '' : '',
      discount: targetRow ? targetRow[6] || '' : '',
      subtotal: targetRow ? targetRow[7] || '' : '',
      vat: targetRow ? targetRow[8] || '' : '',
      total: targetRow ? targetRow[9] || '' : '',
      sourceRowIndex: rowIndex,
      isComplete: !!targetRow,
      player: '',
      competition: ''
    };
  }

  /**
   * Transform CSV rows into transaction records
   */
  transformRecords(rows: string[][]): TransformResult {
    const records: TransactionRecord[] = [];
    const errors: TransformError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        continue;
      }

      // Check for Topup record
      if (this.isTopupRecord(row)) {
        const record = this.transformTopupRecord(rows, i);
        records.push(record);
        
        if (!record.isComplete) {
          errors.push({
            rowIndex: i,
            message: `Topup record at row ${i} is missing financial data (row+2 not found)`,
            severity: 'warning'
          });
        }
        continue;
      }

      // Check for Sale record
      if (this.isSaleRecord(rows, i)) {
        const record = this.transformSaleRecord(rows, i);
        records.push(record);
        
        if (!record.isComplete) {
          errors.push({
            rowIndex: i,
            message: `Sale record at row ${i} is missing financial data (row+2 not found)`,
            severity: 'warning'
          });
        }
        continue;
      }

      // Check for Refund record
      if (this.isRefundRecord(rows, i)) {
        const record = this.transformRefundRecord(rows, i);
        records.push(record);
        
        if (!record.isComplete) {
          errors.push({
            rowIndex: i,
            message: `Refund record at row ${i} is missing financial data (row+2 not found)`,
            severity: 'warning'
          });
        }
        continue;
      }
    }

    return { records, errors };
  }
}
