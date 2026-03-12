import * as Papa from 'papaparse';
import { CompetitionResult } from '../types';

export class CSVFormatterService {
  /**
   * Format singles competition results to CSV
   * Includes columns: Pos, Name, Gross, Hcp, Nett
   */
  formatSinglesResults(results: CompetitionResult[]): string {
    // Sort by finishing position
    const sortedResults = [...results].sort((a, b) => a.finishingPosition - b.finishingPosition);

    // Map to CSV row format
    const rows = sortedResults.map(result => ({
      Pos: result.finishingPosition,
      Name: result.playerName,
      Gross: result.grossScore ?? '',
      Hcp: result.handicap ?? '',
      Nett: result.nettScore ?? '',
    }));

    // Generate CSV using PapaParse
    return Papa.unparse(rows, {
      header: true,
      columns: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'],
    });
  }

  /**
   * Format doubles competition results to CSV
   * Groups results by position and combines names with " / "
   * Includes columns: Pos, Name, Nett
   */
  formatDoublesResults(results: CompetitionResult[]): string {
    // Sort by finishing position
    const sortedResults = [...results].sort((a, b) => a.finishingPosition - b.finishingPosition);

    // Group by position
    const groupedByPosition = new Map<number, CompetitionResult[]>();
    sortedResults.forEach(result => {
      const existing = groupedByPosition.get(result.finishingPosition) || [];
      existing.push(result);
      groupedByPosition.set(result.finishingPosition, existing);
    });

    // Create CSV rows by combining pairs
    const rows: any[] = [];
    groupedByPosition.forEach((resultsAtPosition, position) => {
      // Combine names with " / "
      const names = resultsAtPosition.map(r => r.playerName).join(' / ');
      
      // Use nett score from first result (they should all be the same for a position)
      const nett = resultsAtPosition[0].nettScore ?? '';

      rows.push({
        Pos: position,
        Name: names,
        Nett: nett,
      });
    });

    // Generate CSV using PapaParse
    return Papa.unparse(rows, {
      header: true,
      columns: ['Pos', 'Name', 'Nett'],
    });
  }
}
