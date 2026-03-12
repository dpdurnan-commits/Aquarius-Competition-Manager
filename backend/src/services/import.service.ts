import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { CompleteExport } from './export.service';

export interface ImportResult {
  transactionsImported: number;
  competitionsImported: number;
  flaggedTransactionsImported: number;
  errors: string[];
}

export class ImportService {
  constructor(private db: DatabaseService) {}

  /**
   * Validate backup file format
   */
  private validateBackupFormat(backup: any): backup is CompleteExport {
    if (!backup || typeof backup !== 'object') {
      return false;
    }

    if (!backup.metadata || typeof backup.metadata !== 'object') {
      return false;
    }

    if (!Array.isArray(backup.transactions)) {
      return false;
    }

    if (!Array.isArray(backup.competitions)) {
      return false;
    }

    if (!Array.isArray(backup.flaggedTransactions)) {
      return false;
    }

    return true;
  }

  /**
   * Restore from backup file
   * Uses database transaction for atomic restore
   */
  async restoreFromBackup(backup: any): Promise<ImportResult> {
    // Validate format
    if (!this.validateBackupFormat(backup)) {
      throw new Error('Invalid backup file format');
    }

    const result: ImportResult = {
      transactionsImported: 0,
      competitionsImported: 0,
      flaggedTransactionsImported: 0,
      errors: []
    };

    await this.db.transaction(async (client: PoolClient) => {
      // Clear existing data
      await client.query('DELETE FROM flagged_transactions');
      await client.query('DELETE FROM competitions');
      await client.query('DELETE FROM transactions');

      // Reset sequences
      await client.query('ALTER SEQUENCE transactions_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE competitions_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE flagged_transactions_id_seq RESTART WITH 1');

      // Import transactions
      for (const transaction of backup.transactions) {
        try {
          await client.query(
            `INSERT INTO transactions 
             (date, time, till, type, member, player, competition, price, discount, 
              subtotal, vat, total, source_row_index, is_complete)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              transaction.date, transaction.time, transaction.till, transaction.type,
              transaction.member, transaction.player, transaction.competition,
              transaction.price, transaction.discount, transaction.subtotal,
              transaction.vat, transaction.total, transaction.sourceRowIndex,
              transaction.isComplete
            ]
          );
          result.transactionsImported++;
        } catch (error) {
          result.errors.push(`Transaction import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import competitions
      for (const competition of backup.competitions) {
        try {
          await client.query(
            `INSERT INTO competitions (name, date, description, prize_structure)
             VALUES ($1, $2, $3, $4)`,
            [competition.name, competition.date, competition.description, competition.prizeStructure]
          );
          result.competitionsImported++;
        } catch (error) {
          result.errors.push(`Competition import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import flagged transactions
      for (const flagged of backup.flaggedTransactions) {
        try {
          await client.query(
            `INSERT INTO flagged_transactions (transaction_id, competition_id)
             VALUES ($1, $2)`,
            [flagged.transactionId, flagged.competitionId]
          );
          result.flaggedTransactionsImported++;
        } catch (error) {
          result.errors.push(`Flagged transaction import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    return result;
  }
}
