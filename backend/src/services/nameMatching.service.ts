import { DatabaseService } from './database.service';
import { CompetitionResult } from '../types';

export class NameMatchingService {
  constructor(private db: DatabaseService) {}

  /**
   * Find a matching competition result for a player name
   * Returns the most recent unpaid result if found
   */
  async findMatchingResult(playerName: string): Promise<CompetitionResult | null> {
    // Search all competition results for matching names
    const results = await this.searchAllResults(playerName);

    if (results.length === 0) {
      return null;
    }

    // Find most recent unpaid result
    return this.findMostRecentUnpaid(results);
  }

  /**
   * Normalize a name for case-insensitive comparison
   * Converts to uppercase and removes extra whitespace
   */
  normalizeName(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  }

  /**
   * Check if two names match, supporting variations like initial + surname
   * Examples:
   * - "A. REID" matches "Alastair REID"
   * - "John SMITH" matches "john smith" (case-insensitive)
   */
  matchesVariation(name1: string, name2: string): boolean {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);

    // Exact match after normalization
    if (normalized1 === normalized2) {
      return true;
    }

    // Check for initial + surname match
    return this.matchesInitialSurname(normalized1, normalized2);
  }

  /**
   * Find the most recent unpaid result from a list of results
   * Returns null if no unpaid results found
   */
  findMostRecentUnpaid(results: CompetitionResult[]): CompetitionResult | null {
    // Filter to unpaid results (swindle_money_paid is null or 0)
    const unpaidResults = results.filter(
      (r) => r.swindleMoneyPaid === null || r.swindleMoneyPaid === 0
    );

    if (unpaidResults.length === 0) {
      return null;
    }

    // Sort by competition date (most recent first)
    // Note: We need to join with competitions table to get the date
    // For now, we'll use the result ID as a proxy for recency
    // (higher ID = more recent, assuming sequential creation)
    unpaidResults.sort((a, b) => b.id - a.id);

    return unpaidResults[0];
  }

  /**
   * Search all competition results for names matching the given player name
   * Uses case-insensitive matching and supports name variations
   */
  private async searchAllResults(playerName: string): Promise<CompetitionResult[]> {
    const normalizedName = this.normalizeName(playerName);

    // Query all results with case-insensitive name matching
    const result = await this.db.query<CompetitionResult>(
      `SELECT 
        cr.id, 
        cr.competition_id as "competitionId", 
        cr.finishing_position as "finishingPosition",
        cr.player_name as "playerName", 
        cr.gross_score as "grossScore", 
        cr.handicap,
        cr.nett_score as "nettScore", 
        cr.entry_paid as "entryPaid", 
        cr.swindle_money_paid as "swindleMoneyPaid",
        cr.created_at as "createdAt", 
        cr.updated_at as "updatedAt",
        c.date as competition_date
       FROM competition_results cr
       JOIN competitions c ON cr.competition_id = c.id
       WHERE UPPER(cr.player_name) = $1
       ORDER BY c.date DESC, cr.id DESC`,
      [normalizedName]
    );

    // If exact match found, return those results
    if (result.rows.length > 0) {
      return result.rows;
    }

    // Try variation matching (initial + surname)
    // Get all results and filter in memory for variation matches
    const allResults = await this.db.query<CompetitionResult>(
      `SELECT 
        cr.id, 
        cr.competition_id as "competitionId", 
        cr.finishing_position as "finishingPosition",
        cr.player_name as "playerName", 
        cr.gross_score as "grossScore", 
        cr.handicap,
        cr.nett_score as "nettScore", 
        cr.entry_paid as "entryPaid", 
        cr.swindle_money_paid as "swindleMoneyPaid",
        cr.created_at as "createdAt", 
        cr.updated_at as "updatedAt",
        c.date as competition_date
       FROM competition_results cr
       JOIN competitions c ON cr.competition_id = c.id
       ORDER BY c.date DESC, cr.id DESC`
    );

    // Filter for variation matches
    return allResults.rows.filter((r) => this.matchesVariation(playerName, r.playerName));
  }

  /**
   * Check if two names match using initial + surname pattern
   * Examples:
   * - "A. REID" matches "ALASTAIR REID"
   * - "J. SMITH" matches "JOHN SMITH"
   */
  private matchesInitialSurname(name1: string, name2: string): boolean {
    const parts1 = name1.split(' ');
    const parts2 = name2.split(' ');

    // Need at least 2 parts (first name + surname) in both
    if (parts1.length < 2 || parts2.length < 2) {
      return false;
    }

    // Check if one name has an initial and the other has a full first name
    const hasInitial1 = parts1[0].length <= 2 && parts1[0].endsWith('.');
    const hasInitial2 = parts2[0].length <= 2 && parts2[0].endsWith('.');

    // If both have initials or both have full names, no variation match
    if (hasInitial1 === hasInitial2) {
      return false;
    }

    // Determine which has the initial and which has the full name
    const [initialParts, fullParts] = hasInitial1 ? [parts1, parts2] : [parts2, parts1];

    // Extract initial (remove the dot)
    const initial = initialParts[0].replace('.', '');

    // Check if initial matches first letter of full first name
    if (fullParts[0][0] !== initial[0]) {
      return false;
    }

    // Check if surnames match (compare all remaining parts)
    const surname1 = initialParts.slice(1).join(' ');
    const surname2 = fullParts.slice(1).join(' ');

    return surname1 === surname2;
  }
}
