import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import {
  CompetitionResult,
  CreateResultDTO,
  UpdateResultDTO,
  BulkResultResponse,
  ResultError,
  ReconciliationSummary,
} from '../types';

export class CompetitionResultService {
  constructor(private db: DatabaseService) {}

  /**
   * Add a single competition result
   */
  async addResult(dto: CreateResultDTO): Promise<CompetitionResult> {
    // Validate required fields
    this.validateResultDTO(dto);

    // Validate competition exists (foreign key check)
    const competitionCheck = await this.db.query(
      'SELECT id FROM competitions WHERE id = $1',
      [dto.competitionId]
    );

    if (competitionCheck.rows.length === 0) {
      throw new Error(`Competition with id ${dto.competitionId} not found`);
    }

    const result = await this.db.query<CompetitionResult>(
      `INSERT INTO competition_results 
       (competition_id, finishing_position, player_name, gross_score, handicap, 
        nett_score, entry_paid, competition_refund, swindle_money_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, competition_id as "competitionId", finishing_position as "finishingPosition",
                 player_name as "playerName", gross_score as "grossScore", handicap,
                 nett_score as "nettScore", entry_paid as "entryPaid", 
                 competition_refund as "competitionRefund",
                 swindle_money_paid as "swindleMoneyPaid",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        dto.competitionId,
        dto.finishingPosition,
        dto.playerName,
        dto.grossScore ?? null,
        dto.handicap ?? null,
        dto.nettScore ?? null,
        dto.entryPaid ?? 0,
        dto.competitionRefund ?? 0,
        dto.swindleMoneyPaid ?? 0,
      ]
    );

    return result.rows[0];
  }

  /**
   * Bulk add results with transaction support
   */
  async bulkAddResults(results: CreateResultDTO[]): Promise<BulkResultResponse> {
    const errors: ResultError[] = [];
    let created = 0;

    await this.db.transaction(async (client: PoolClient) => {
      for (let i = 0; i < results.length; i++) {
        const dto = results[i];

        try {
          // Validate required fields
          this.validateResultDTO(dto);

          // Insert result
          await client.query(
            `INSERT INTO competition_results 
             (competition_id, finishing_position, player_name, gross_score, handicap, 
              nett_score, entry_paid, competition_refund, swindle_money_paid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              dto.competitionId,
              dto.finishingPosition,
              dto.playerName,
              dto.grossScore ?? null,
              dto.handicap ?? null,
              dto.nettScore ?? null,
              dto.entryPaid ?? 0,
              dto.competitionRefund ?? 0,
              dto.swindleMoneyPaid ?? 0,
            ]
          );

          created++;
        } catch (error: any) {
          errors.push({
            row: i + 1,
            message: error.message,
            data: dto,
          });
          // Throw to rollback transaction
          throw error;
        }
      }
    });

    return { created, errors };
  }

  /**
   * Update an existing result
   */
  async updateResult(id: number, updates: UpdateResultDTO): Promise<CompetitionResult> {
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.finishingPosition !== undefined) {
      // Validate positive position
      if (updates.finishingPosition <= 0) {
        throw new Error('Finishing position must be a positive integer');
      }
      fields.push(`finishing_position = $${paramIndex++}`);
      values.push(updates.finishingPosition);
    }

    if (updates.playerName !== undefined) {
      // Validate non-empty name
      if (!updates.playerName || updates.playerName.trim() === '') {
        throw new Error('Player name cannot be empty');
      }
      fields.push(`player_name = $${paramIndex++}`);
      values.push(updates.playerName);
    }

    if (updates.grossScore !== undefined) {
      fields.push(`gross_score = $${paramIndex++}`);
      values.push(updates.grossScore);
    }

    if (updates.handicap !== undefined) {
      fields.push(`handicap = $${paramIndex++}`);
      values.push(updates.handicap);
    }

    if (updates.nettScore !== undefined) {
      fields.push(`nett_score = $${paramIndex++}`);
      values.push(updates.nettScore);
    }

    if (updates.entryPaid !== undefined) {
      fields.push(`entry_paid = $${paramIndex++}`);
      values.push(updates.entryPaid);
    }

    if (updates.competitionRefund !== undefined) {
      fields.push(`competition_refund = $${paramIndex++}`);
      values.push(updates.competitionRefund);
    }

    if (updates.swindleMoneyPaid !== undefined) {
      // Validate non-negative amount
      if (updates.swindleMoneyPaid < 0) {
        throw new Error('Swindle money paid cannot be negative');
      }
      fields.push(`swindle_money_paid = $${paramIndex++}`);
      values.push(updates.swindleMoneyPaid);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter
    values.push(id);

    const result = await this.db.query<CompetitionResult>(
      `UPDATE competition_results 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, competition_id as "competitionId", finishing_position as "finishingPosition",
                 player_name as "playerName", gross_score as "grossScore", handicap,
                 nett_score as "nettScore", entry_paid as "entryPaid", 
                 competition_refund as "competitionRefund",
                 swindle_money_paid as "swindleMoneyPaid",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Competition result with id ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Delete a competition result
   */
  async deleteResult(id: number): Promise<void> {
    const result = await this.db.query('DELETE FROM competition_results WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error(`Competition result with id ${id} not found`);
    }
  }

  /**
   * Get all results for a competition, ordered by finishing position
   */
  async getResultsByCompetition(competitionId: number): Promise<CompetitionResult[]> {
    const result = await this.db.query<CompetitionResult>(
      `SELECT id, competition_id as "competitionId", finishing_position as "finishingPosition",
              player_name as "playerName", gross_score as "grossScore", handicap,
              nett_score as "nettScore", entry_paid as "entryPaid", 
              competition_refund as "competitionRefund",
              swindle_money_paid as "swindleMoneyPaid",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM competition_results
       WHERE competition_id = $1
       ORDER BY finishing_position ASC`,
      [competitionId]
    );

    return result.rows;
  }

  /**
   * Populate financial fields from transactions for all results in a competition
   * Matches player names using fuzzy matching and sums transaction amounts
   */
  async populateFromTransactions(competitionId: number): Promise<{ updated: number; errors: string[] }> {
    // Get competition details
    const competitionResult = await this.db.query<any>(
      'SELECT id, name FROM competitions WHERE id = $1',
      [competitionId]
    );

    if (competitionResult.rows.length === 0) {
      throw new Error(`Competition with id ${competitionId} not found`);
    }

    const competition = competitionResult.rows[0];
    const competitionName = competition.name;

    // Get all results for this competition
    const results = await this.getResultsByCompetition(competitionId);

    if (results.length === 0) {
      return { updated: 0, errors: ['No results found for this competition'] };
    }

    let updated = 0;
    const errors: string[] = [];

    // Process each result
    for (const result of results) {
      try {
        const playerName = result.playerName;

        // Calculate Entry Paid: Sum of all "Sale" transactions matching player and competition
        const entryPaidResult = await this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
           FROM transactions
           WHERE UPPER(player) = UPPER($1)
             AND UPPER(competition) = UPPER($2)
             AND type = 'Sale'`,
          [playerName, competitionName]
        );
        const entryPaid = parseFloat(entryPaidResult.rows[0].sum);

        // Calculate Competition Refund: Sum of all "Refund" transactions matching player and competition
        const refundResult = await this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
           FROM transactions
           WHERE UPPER(player) = UPPER($1)
             AND UPPER(competition) = UPPER($2)
             AND type = 'Refund'`,
          [playerName, competitionName]
        );
        const competitionRefund = parseFloat(refundResult.rows[0].sum);

        // Calculate Swindle Money: Sum of flagged transaction totals matching player and competition
        // Check both player and member fields since player names can be in either
        const swindleMoneyResult = await this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(CAST(t.total AS NUMERIC)), 0) as sum
           FROM flagged_transactions ft
           JOIN transactions t ON ft.transaction_id = t.id
           WHERE (UPPER(t.player) = UPPER($1) OR UPPER(t.member) = UPPER($1))
             AND ft.competition_id = $2`,
          [playerName, competitionId]
        );
        const swindleMoney = parseFloat(swindleMoneyResult.rows[0].sum);

        // Update the result with calculated values
        await this.db.query(
          `UPDATE competition_results
           SET entry_paid = $1,
               competition_refund = $2,
               swindle_money_paid = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [entryPaid, competitionRefund, swindleMoney, result.id]
        );

        updated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to update ${result.playerName}: ${errorMsg}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Reconcile competition results with transactions
   * Phase 1: Updates existing results with recalculated financial fields
   * Phase 2: Adds missing players as DNP entries
   */
  async reconcileResults(competitionId: number): Promise<ReconciliationSummary> {
    const summary: ReconciliationSummary = {
      nameCorrections: 0,
      dnpEntriesAdded: 0,
      totalValueReconciled: 0,
      errors: [],
    };

    try {
      await this.db.transaction(async (client: PoolClient) => {
        // Validate competition exists
        const competitionResult = await client.query<{ id: number; name: string }>(
          'SELECT id, name FROM competitions WHERE id = $1',
          [competitionId]
        );

        if (competitionResult.rows.length === 0) {
          throw new Error(`Competition with id ${competitionId} not found`);
        }

        const competition = competitionResult.rows[0];
        const competitionName = competition.name;

        // Phase 1: Name Correction Reconciliation
        // Get all existing results for this competition
        const resultsQuery = await client.query<CompetitionResult>(
          `SELECT id, competition_id as "competitionId", finishing_position as "finishingPosition",
                  player_name as "playerName", gross_score as "grossScore", handicap,
                  nett_score as "nettScore", entry_paid as "entryPaid", 
                  competition_refund as "competitionRefund",
                  swindle_money_paid as "swindleMoneyPaid",
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM competition_results
           WHERE competition_id = $1
           ORDER BY finishing_position ASC`,
          [competitionId]
        );

        const existingResults = resultsQuery.rows;

        // Update each existing result with recalculated financial values
        for (const result of existingResults) {
          const playerName = result.playerName;

          // Calculate Entry Paid
          const entryPaidResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
             FROM transactions
             WHERE UPPER(player) = UPPER($1)
               AND UPPER(competition) = UPPER($2)
               AND type = 'Sale'`,
            [playerName, competitionName]
          );
          const entryPaid = parseFloat(entryPaidResult.rows[0].sum);

          // Calculate Competition Refund
          const refundResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
             FROM transactions
             WHERE UPPER(player) = UPPER($1)
               AND UPPER(competition) = UPPER($2)
               AND type = 'Refund'`,
            [playerName, competitionName]
          );
          const competitionRefund = parseFloat(refundResult.rows[0].sum);

          // Calculate Swindle Money
          const swindleMoneyResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(t.total AS NUMERIC)), 0) as sum
             FROM flagged_transactions ft
             JOIN transactions t ON ft.transaction_id = t.id
             WHERE (UPPER(t.player) = UPPER($1) OR UPPER(t.member) = UPPER($1))
               AND ft.competition_id = $2`,
            [playerName, competitionId]
          );
          const swindleMoney = parseFloat(swindleMoneyResult.rows[0].sum);

          // Update result with new financial values
          await client.query(
            `UPDATE competition_results
             SET entry_paid = $1,
                 competition_refund = $2,
                 swindle_money_paid = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [entryPaid, competitionRefund, swindleMoney, result.id]
          );

          summary.nameCorrections++;
          summary.totalValueReconciled += entryPaid + competitionRefund + swindleMoney;
        }

        // Phase 2: Missing Player Reconciliation
        // Get all distinct player names from transactions (check both player and member fields)
        const transactionPlayersQuery = await client.query<{ player_name: string }>(
          `SELECT DISTINCT 
             CASE 
               WHEN player != '' THEN player 
               ELSE member 
             END as player_name
           FROM transactions
           WHERE UPPER(competition) = UPPER($1)
             AND (player != '' OR member != '')`,
          [competitionName]
        );

        const transactionPlayers = transactionPlayersQuery.rows.map((row) => row.player_name);

        // Get all distinct player names from existing results (case-insensitive comparison)
        const existingPlayerNames = existingResults.map((r) => r.playerName.toUpperCase());

        // Identify missing players
        const missingPlayers = transactionPlayers.filter(
          (txPlayer) => !existingPlayerNames.includes(txPlayer.toUpperCase())
        );

        // Get max finishing_position for DNP entries
        const maxPositionQuery = await client.query<{ max_position: number }>(
          `SELECT COALESCE(MAX(finishing_position), 0) as max_position
           FROM competition_results
           WHERE competition_id = $1`,
          [competitionId]
        );
        let nextPosition = maxPositionQuery.rows[0].max_position + 1;

        // Add each missing player as DNP
        for (const missingPlayer of missingPlayers) {
          // Calculate financial totals for missing player
          const entryPaidResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
             FROM transactions
             WHERE UPPER(player) = UPPER($1)
               AND UPPER(competition) = UPPER($2)
               AND type = 'Sale'`,
            [missingPlayer, competitionName]
          );
          const entryPaid = parseFloat(entryPaidResult.rows[0].sum);

          const refundResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as sum
             FROM transactions
             WHERE UPPER(player) = UPPER($1)
               AND UPPER(competition) = UPPER($2)
               AND type = 'Refund'`,
            [missingPlayer, competitionName]
          );
          const competitionRefund = parseFloat(refundResult.rows[0].sum);

          const swindleMoneyResult = await client.query<{ sum: string }>(
            `SELECT COALESCE(SUM(CAST(t.total AS NUMERIC)), 0) as sum
             FROM flagged_transactions ft
             JOIN transactions t ON ft.transaction_id = t.id
             WHERE (UPPER(t.player) = UPPER($1) OR UPPER(t.member) = UPPER($1))
               AND ft.competition_id = $2`,
            [missingPlayer, competitionId]
          );
          const swindleMoney = parseFloat(swindleMoneyResult.rows[0].sum);

          // Insert new result with position "DNP"
          await client.query(
            `INSERT INTO competition_results 
             (competition_id, finishing_position, player_name, entry_paid, 
              competition_refund, swindle_money_paid)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [competitionId, nextPosition, missingPlayer, entryPaid, competitionRefund, swindleMoney]
          );

          summary.dnpEntriesAdded++;
          summary.totalValueReconciled += entryPaid + competitionRefund + swindleMoney;
          nextPosition++;
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`Reconciliation failed: ${errorMsg}`);
      console.error(`Reconciliation error for competition ${competitionId}:`, error);
    }

    return summary;
  }

  /**
   * Validate result DTO for required fields and constraints
   */
  private validateResultDTO(dto: CreateResultDTO): void {
    // Validate required fields
    if (!dto.finishingPosition) {
      throw new Error('Finishing position is required');
    }

    // Validate positive finishing position
    if (dto.finishingPosition <= 0) {
      throw new Error('Finishing position must be a positive integer');
    }

    if (!dto.playerName || dto.playerName.trim() === '') {
      throw new Error('Player name is required and cannot be empty');
    }

    // Validate non-negative swindle money
    if (dto.swindleMoneyPaid !== undefined && dto.swindleMoneyPaid < 0) {
      throw new Error('Swindle money paid cannot be negative');
    }
  }
}
