import * as Papa from 'papaparse';
import { SinglesRow, DoublesRow, ParsedResult, ParseError, CreateResultDTO } from '../types';

export class CSVParserService {
  /**
   * Parse singles competition CSV
   * Validates required columns: Pos, Name, Gross, Hcp, Nett
   * Skips rows with empty names or whitespace-only names
   * Skips rows matching pattern "Division [0-9]+"
   * Trims whitespace from all field values
   */
  async parseSinglesCSV(csvContent: string): Promise<ParsedResult<CreateResultDTO>> {
    const errors: ParseError[] = [];
    const data: CreateResultDTO[] = [];

    try {
      // Parse CSV using PapaParse with header mode
      const parseResult = Papa.parse<SinglesRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
      });

      // Check for parsing errors
      if (parseResult.errors && parseResult.errors.length > 0) {
        parseResult.errors.forEach((err: Papa.ParseError) => {
          errors.push({
            row: err.row || 0,
            field: '',
            message: err.message,
          });
        });
      }

      // Validate required columns
      const headers = parseResult.meta.fields || [];
      const requiredColumns = ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        errors.push({
          row: 0,
          field: missingColumns.join(', '),
          message: `Missing required columns: ${missingColumns.join(', ')}`,
        });
        return { valid: false, data: [], errors };
      }

      // Process each row
      parseResult.data.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // +2 because index is 0-based and header is row 1

        // Skip rows with empty names or whitespace-only names
        if (!row.Name || row.Name.trim() === '') {
          return;
        }

        // Skip rows matching pattern "Division [0-9]+"
        if (/^Division\s+\d+$/i.test(row.Name.trim())) {
          return;
        }

        // Validate and parse position
        const pos = parseInt(row.Pos, 10);
        if (isNaN(pos) || pos <= 0) {
          errors.push({
            row: rowNumber,
            field: 'Pos',
            message: `Invalid position value: "${row.Pos}". Must be a positive integer.`,
          });
          return;
        }

        // Parse numeric fields (allow empty/null)
        const gross = row.Gross && row.Gross.trim() !== '' ? parseInt(row.Gross, 10) : undefined;
        const hcp = row.Hcp && row.Hcp.trim() !== '' ? parseInt(row.Hcp, 10) : undefined;
        const nett = row.Nett && row.Nett.trim() !== '' ? parseInt(row.Nett, 10) : undefined;

        // Validate numeric fields if provided
        if (row.Gross && row.Gross.trim() !== '' && isNaN(gross!)) {
          errors.push({
            row: rowNumber,
            field: 'Gross',
            message: `Invalid gross score value: "${row.Gross}". Must be a number.`,
          });
          return;
        }

        if (row.Hcp && row.Hcp.trim() !== '' && isNaN(hcp!)) {
          errors.push({
            row: rowNumber,
            field: 'Hcp',
            message: `Invalid handicap value: "${row.Hcp}". Must be a number.`,
          });
          return;
        }

        if (row.Nett && row.Nett.trim() !== '' && isNaN(nett!)) {
          errors.push({
            row: rowNumber,
            field: 'Nett',
            message: `Invalid nett score value: "${row.Nett}". Must be a number.`,
          });
          return;
        }

        // Create result DTO (competitionId will be set by caller)
        data.push({
          competitionId: 0, // Placeholder, will be set by caller
          finishingPosition: pos,
          playerName: row.Name.trim(),
          grossScore: gross,
          handicap: hcp,
          nettScore: nett,
        });
      });

      return {
        valid: errors.length === 0,
        data,
        errors,
      };
    } catch (error) {
      errors.push({
        row: 0,
        field: '',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
      });
      return { valid: false, data: [], errors };
    }
  }

  /**
   * Parse doubles competition CSV
   * Validates required columns: Pos, Name, Nett
   * Splits Name field on "/" character into two player names
   * Trims whitespace from each split name
   * Creates two CreateResultDTO records per row with same position and nett score
   * Skips rows with empty names or whitespace-only names
   * Skips rows matching pattern "Division [0-9]+"
   * Returns error if Name field doesn't contain "/"
   */
  async parseDoublesCSV(csvContent: string): Promise<ParsedResult<CreateResultDTO>> {
    const errors: ParseError[] = [];
    const data: CreateResultDTO[] = [];

    try {
      // Parse CSV using PapaParse with header mode
      const parseResult = Papa.parse<DoublesRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
      });

      // Check for parsing errors
      if (parseResult.errors && parseResult.errors.length > 0) {
        parseResult.errors.forEach((err: Papa.ParseError) => {
          errors.push({
            row: err.row || 0,
            field: '',
            message: err.message,
          });
        });
      }

      // Validate required columns
      const headers = parseResult.meta.fields || [];
      const requiredColumns = ['Pos', 'Name', 'Nett'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        errors.push({
          row: 0,
          field: missingColumns.join(', '),
          message: `Missing required columns: ${missingColumns.join(', ')}`,
        });
        return { valid: false, data: [], errors };
      }

      // Process each row
      parseResult.data.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // +2 because index is 0-based and header is row 1

        // Skip rows with empty names or whitespace-only names
        if (!row.Name || row.Name.trim() === '') {
          return;
        }

        // Skip rows matching pattern "Division [0-9]+"
        if (/^Division\s+\d+$/i.test(row.Name.trim())) {
          return;
        }

        // Validate and parse position
        const pos = parseInt(row.Pos, 10);
        if (isNaN(pos) || pos <= 0) {
          errors.push({
            row: rowNumber,
            field: 'Pos',
            message: `Invalid position value: "${row.Pos}". Must be a positive integer.`,
          });
          return;
        }

        // Check if Name contains "/"
        if (!row.Name.includes('/')) {
          errors.push({
            row: rowNumber,
            field: 'Name',
            message: `Invalid doubles format: Name field must contain "/" separator. Found: "${row.Name}"`,
          });
          return;
        }

        // Split name on "/" and trim each part
        const names = row.Name.split('/').map((name: string) => name.trim());

        // Validate we have exactly 2 names
        if (names.length !== 2 || names[0] === '' || names[1] === '') {
          errors.push({
            row: rowNumber,
            field: 'Name',
            message: `Invalid doubles format: Name field must contain exactly two non-empty names separated by "/". Found: "${row.Name}"`,
          });
          return;
        }

        // Parse nett score (allow empty/null)
        const nett = row.Nett && row.Nett.trim() !== '' ? parseInt(row.Nett, 10) : undefined;

        // Validate nett score if provided
        if (row.Nett && row.Nett.trim() !== '' && isNaN(nett!)) {
          errors.push({
            row: rowNumber,
            field: 'Nett',
            message: `Invalid nett score value: "${row.Nett}". Must be a number.`,
          });
          return;
        }

        // Create two result DTOs (one for each player)
        data.push({
          competitionId: 0, // Placeholder, will be set by caller
          finishingPosition: pos,
          playerName: names[0],
          nettScore: nett,
        });

        data.push({
          competitionId: 0, // Placeholder, will be set by caller
          finishingPosition: pos,
          playerName: names[1],
          nettScore: nett,
        });
      });

      return {
        valid: errors.length === 0,
        data,
        errors,
      };
    } catch (error) {
      errors.push({
        row: 0,
        field: '',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
      });
      return { valid: false, data: [], errors };
    }
  }
}
