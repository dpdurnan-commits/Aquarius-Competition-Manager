import { DatabaseService } from './database.service';
import { TransactionRecord, Competition, FlaggedTransaction } from '../types';

export interface ExportMetadata {
  exportTimestamp: string;
  transactionCount: number;
  competitionCount: number;
  flaggedTransactionCount: number;
}

export interface CompleteExport {
  metadata: ExportMetadata;
  transactions: TransactionRecord[];
  competitions: Competition[];
  flaggedTransactions: FlaggedTransaction[];
}

export class ExportService {
  constructor(private db: DatabaseService) {}

  /**
   * Export all transactions as JSON
   */
  async exportTransactions(): Promise<TransactionRecord[]> {
    const result = await this.db.query<TransactionRecord>(
      `SELECT id, date, time, till, type, member, player, competition, 
              price, discount, subtotal, vat, total, source_row_index as "sourceRowIndex", 
              is_complete as "isComplete", created_at as "createdAt", updated_at as "updatedAt"
       FROM transactions 
       ORDER BY date ASC, time ASC`
    );

    return result.rows;
  }

  /**
   * Export all competitions as JSON
   */
  async exportCompetitions(): Promise<Competition[]> {
    const result = await this.db.query<Competition>(
      `SELECT id, name, date, description, prize_structure as "prizeStructure", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM competitions 
       ORDER BY date DESC`
    );

    return result.rows;
  }

  /**
   * Export complete database including all tables
   */
  async exportAll(): Promise<CompleteExport> {
    const transactions = await this.exportTransactions();
    const competitions = await this.exportCompetitions();
    
    const flaggedResult = await this.db.query<FlaggedTransaction>(
      `SELECT id, transaction_id as "transactionId", competition_id as "competitionId", 
              flagged_at as "flaggedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM flagged_transactions 
       ORDER BY flagged_at DESC`
    );

    const flaggedTransactions = flaggedResult.rows;

    const metadata: ExportMetadata = {
      exportTimestamp: new Date().toISOString(),
      transactionCount: transactions.length,
      competitionCount: competitions.length,
      flaggedTransactionCount: flaggedTransactions.length
    };

    return {
      metadata,
      transactions,
      competitions,
      flaggedTransactions
    };
  }
}
