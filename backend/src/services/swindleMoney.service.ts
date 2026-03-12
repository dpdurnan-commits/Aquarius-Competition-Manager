import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { NameMatchingService } from './nameMatching.service';
import { PopulateResult, CompetitionResult } from '../types';

export class SwindleMoneyService {
  private nameMatchingService: NameMatchingService;

  constructor(private db: DatabaseService) {
    this.nameMatchingService = new NameMatchingService(db);
  }

  /**
   * Populate swindle money for a player by finding their most recent unpaid result
   * Returns success with result ID if match found, or warning if no match
   */
  async populateSwindleMoney(playerName: string, amount: number): Promise<PopulateResult> {
    // Validate amount is non-negative
    if (amount < 0) {
      return {
        success: false,
        resultId: null,
        message: 'Amount cannot be negative',
      };
    }

    try {
      // Find matching result using NameMatchingService
      const matchingResult = await this.nameMatchingService.findMatchingResult(playerName);

      if (!matchingResult) {
        // Log warning but don't fail
        console.warn(
          `No matching unpaid competition result found for player: ${playerName}`
        );

        return {
          success: true, // Still success, just no match
          resultId: null,
          message: `Warning: No matching unpaid result found for player "${playerName}"`,
        };
      }

      // Update swindle_money_paid field using transaction
      await this.db.transaction(async (client: PoolClient) => {
        await client.query(
          `UPDATE competition_results 
           SET swindle_money_paid = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [amount, matchingResult.id]
        );
      });

      return {
        success: true,
        resultId: matchingResult.id,
        message: `Successfully populated swindle money (${amount}) for ${playerName} in result ${matchingResult.id}`,
      };
    } catch (error: any) {
      console.error('Error populating swindle money:', error);
      return {
        success: false,
        resultId: null,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Populate swindle money for multiple players in a single transaction
   * Useful for batch processing of winnings
   */
  async populateSwindleMoneyBatch(
    entries: Array<{ playerName: string; amount: number }>
  ): Promise<PopulateResult[]> {
    const results: PopulateResult[] = [];

    for (const entry of entries) {
      const result = await this.populateSwindleMoney(entry.playerName, entry.amount);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all unpaid results for a player (for preview/debugging)
   */
  async getUnpaidResultsForPlayer(playerName: string): Promise<CompetitionResult[]> {
    const normalizedName = this.nameMatchingService.normalizeName(playerName);

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
        cr.updated_at as "updatedAt"
       FROM competition_results cr
       JOIN competitions c ON cr.competition_id = c.id
       WHERE UPPER(cr.player_name) = $1
         AND (cr.swindle_money_paid IS NULL OR cr.swindle_money_paid = 0)
       ORDER BY c.date DESC, cr.id DESC`,
      [normalizedName]
    );

    return result.rows;
  }
}
