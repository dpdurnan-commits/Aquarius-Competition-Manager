import { DatabaseService } from './database.service';
import { SwindleMoneyService } from './swindleMoney.service';
import { FlaggedTransaction, FlaggedTransactionWithDetails } from '../types';

export class FlaggedTransactionService {
  private swindleMoneyService: SwindleMoneyService;

  constructor(private db: DatabaseService) {
    this.swindleMoneyService = new SwindleMoneyService(db);
  }

  /**
   * Create a new flagged transaction
   * Prevents duplicate flagging of the same transaction
   * Automatically populates swindle money for the player if a matching result is found
   */
  async createFlaggedTransaction(transactionId: number): Promise<FlaggedTransaction> {
    // Check if transaction is already flagged
    const existing = await this.db.query<FlaggedTransaction>(
      'SELECT * FROM flagged_transactions WHERE transaction_id = $1',
      [transactionId]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Transaction ${transactionId} is already flagged`);
    }

    // Get transaction details to extract player name and amount
    const transactionResult = await this.db.query<any>(
      'SELECT player, total FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const transaction = transactionResult.rows[0];
    const playerName = transaction.player;
    const amount = parseFloat(transaction.total);

    // Create flagged transaction
    const result = await this.db.query<FlaggedTransaction>(
      `INSERT INTO flagged_transactions (transaction_id, competition_id)
       VALUES ($1, NULL)
       RETURNING id, transaction_id as "transactionId", competition_id as "competitionId", 
                 flagged_at as "flaggedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [transactionId]
    );

    const flaggedTransaction = result.rows[0];

    // Attempt to populate swindle money for the player
    // This is done asynchronously and doesn't fail the flagging operation
    try {
      const populateResult = await this.swindleMoneyService.populateSwindleMoney(playerName, amount);
      
      if (populateResult.success && populateResult.resultId) {
        console.log(`Successfully populated swindle money for ${playerName}: ${populateResult.message}`);
      } else {
        console.warn(`Swindle money population warning for ${playerName}: ${populateResult.message}`);
      }
    } catch (error) {
      // Log error but don't fail the flagging operation
      console.error(`Error populating swindle money for ${playerName}:`, error);
    }

    return flaggedTransaction;
  }

  /**
   * Get all flagged transactions with their associated transaction details
   * Uses JOIN to include full transaction information
   */
  async getAllFlaggedTransactions(): Promise<FlaggedTransactionWithDetails[]> {
    const result = await this.db.query<any>(
      `SELECT 
         ft.id, 
         ft.transaction_id as "transactionId", 
         ft.competition_id as "competitionId", 
         ft.flagged_at as "flaggedAt", 
         ft.created_at as "createdAt", 
         ft.updated_at as "updatedAt",
         t.id as "t_id",
         t.date as "t_date",
         t.time as "t_time",
         t.till as "t_till",
         t.type as "t_type",
         t.member as "t_member",
         t.player as "t_player",
         t.competition as "t_competition",
         t.price as "t_price",
         t.discount as "t_discount",
         t.subtotal as "t_subtotal",
         t.vat as "t_vat",
         t.total as "t_total",
         t.source_row_index as "t_sourceRowIndex",
         t.is_complete as "t_isComplete",
         t.created_at as "t_createdAt",
         t.updated_at as "t_updatedAt"
       FROM flagged_transactions ft
       INNER JOIN transactions t ON ft.transaction_id = t.id
       ORDER BY ft.flagged_at DESC`
    );

    // Transform flat result into nested structure
    return result.rows.map(row => ({
      id: row.id,
      transactionId: row.transactionId,
      competitionId: row.competitionId,
      flaggedAt: row.flaggedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      transaction: {
        id: row.t_id,
        date: row.t_date,
        time: row.t_time,
        till: row.t_till,
        type: row.t_type,
        member: row.t_member,
        player: row.t_player,
        competition: row.t_competition,
        price: row.t_price,
        discount: row.t_discount,
        subtotal: row.t_subtotal,
        vat: row.t_vat,
        total: row.t_total,
        sourceRowIndex: row.t_sourceRowIndex,
        isComplete: row.t_isComplete,
        createdAt: row.t_createdAt,
        updatedAt: row.t_updatedAt
      }
    }));
  }

  /**
   * Update a flagged transaction to associate it with a competition
   */
  async updateFlaggedTransaction(id: number, competitionId: number | null): Promise<FlaggedTransaction> {
    const result = await this.db.query<FlaggedTransaction>(
      `UPDATE flagged_transactions 
       SET competition_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, transaction_id as "transactionId", competition_id as "competitionId", 
                 flagged_at as "flaggedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [competitionId, id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Flagged transaction with id ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Delete a flagged transaction record
   */
  async deleteFlaggedTransaction(id: number): Promise<void> {
    const result = await this.db.query(
      'DELETE FROM flagged_transactions WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error(`Flagged transaction with id ${id} not found`);
    }
  }
}
