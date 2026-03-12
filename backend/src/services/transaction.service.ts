import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { TransactionRecord, ImportResult, ImportError, ValidationResult, PaginationParams, PaginatedResponse, LastWeekInfo } from '../types';

export class TransactionService {
  constructor(private db: DatabaseService) {}

  /**
   * Extract player and competition fields from member field
   * Migrated from frontend field extraction logic
   * Handles both formats:
   * - "Player & Competition: Entry" (with colon)
   * - "Player & Competition" (without colon)
   */
  private extractFields(record: TransactionRecord): TransactionRecord {
    const memberValue = record.member;
    
    // If player and competition are already extracted, don't re-extract
    if (record.player || record.competition) {
      return record;
    }
    
    const hasAmpersand = memberValue.includes(' &');
    const hasColon = memberValue.includes(':');

    if (hasAmpersand && hasColon) {
      // Format: "Player & Competition: Entry"
      const ampersandPos = memberValue.indexOf(' &');
      const colonPos = memberValue.indexOf(':');

      const player = ampersandPos >= 0 
        ? memberValue.substring(0, ampersandPos).trim() 
        : '';

      const competition = ampersandPos >= 0 && colonPos > ampersandPos
        ? memberValue.substring(ampersandPos + 2, colonPos).trim()
        : '';

      return { ...record, member: '', player, competition };
    } else if (hasAmpersand) {
      // Format: "Player & Competition" (without colon)
      const ampersandPos = memberValue.indexOf(' &');

      const player = ampersandPos >= 0 
        ? memberValue.substring(0, ampersandPos).trim() 
        : '';

      const competition = ampersandPos >= 0
        ? memberValue.substring(ampersandPos + 2).trim()
        : '';

      return { ...record, member: '', player, competition };
    } else {
      return { ...record, player: '', competition: '' };
    }
  }

  /**
   * Parse date and time strings into a comparable timestamp
   */
  private parseDateTime(date: string, time: string): number {
    const dateTimeStr = `${date}T${time}`;
    return new Date(dateTimeStr).getTime();
  }

  /**
   * Find the earliest timestamp in a batch of records
   */
  private findEarliestTimestamp(records: TransactionRecord[]): { date: string; time: string } {
    if (records.length === 0) {
      throw new Error('Cannot find earliest timestamp in empty array');
    }

    let earliest = records[0];
    let earliestTs = this.parseDateTime(earliest.date, earliest.time);

    for (let i = 1; i < records.length; i++) {
      const ts = this.parseDateTime(records[i].date, records[i].time);
      if (ts < earliestTs) {
        earliest = records[i];
        earliestTs = ts;
      }
    }

    return { date: earliest.date, time: earliest.time };
  }

  /**
   * Get the latest transaction timestamp from the database
   */
  async getLatestTimestamp(): Promise<{ date: string; time: string } | null> {
    const result = await this.db.query<{ date: string; time: string }>(
      `SELECT date, time FROM transactions 
       ORDER BY date DESC, time DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Validate that new transactions are chronologically after existing ones
   */
  private async validateChronology(records: TransactionRecord[]): Promise<ValidationResult> {
    if (records.length === 0) {
      return { valid: true };
    }

    // Find earliest in new batch
    const earliestNew = this.findEarliestTimestamp(records);

    // Query database for latest existing
    const latestExisting = await this.getLatestTimestamp();

    if (!latestExisting) {
      return { valid: true }; // Empty database
    }

    const earliestNewTs = this.parseDateTime(earliestNew.date, earliestNew.time);
    const latestExistingTs = this.parseDateTime(latestExisting.date, latestExisting.time);

    if (earliestNewTs < latestExistingTs) {
      return {
        valid: false,
        error: `Import rejected: New data contains transactions from ${earliestNew.date} ${earliestNew.time} which is before the latest existing transaction at ${latestExisting.date} ${latestExisting.time}`,
        earliestNew,
        latestExisting
      };
    }

    return { valid: true };
  }

  /**
   * Import transactions with field extraction and chronological validation
   */
  async importTransactions(records: TransactionRecord[]): Promise<ImportResult> {
    // Step 1: Extract fields (migrate from frontend)
    const enhancedRecords = records.map(r => this.extractFields(r));

    // Step 2: Validate chronology
    const validation = await this.validateChronology(enhancedRecords);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Step 3: Store in database (atomic transaction)
    return await this.db.transaction(async (client: PoolClient) => {
      let imported = 0;
      const errors: ImportError[] = [];

      for (const record of enhancedRecords) {
        try {
          await client.query(
            `INSERT INTO transactions 
             (date, time, till, type, member, player, competition, price, discount, 
              subtotal, vat, total, source_row_index, is_complete)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              record.date, record.time, record.till, record.type, record.member,
              record.player, record.competition, record.price, record.discount,
              record.subtotal, record.vat, record.total, record.sourceRowIndex, record.isComplete
            ]
          );
          imported++;
        } catch (error) {
          errors.push({ 
            record, 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      return { imported, errors };
    });
  }

  /**
   * Get all transactions ordered by date and time
   * Includes flagging information from flagged_transactions table
   */
  async getAllTransactions(): Promise<TransactionRecord[]> {
    const result = await this.db.query<any>(
      `SELECT t.id, t.date, t.time, t.till, t.type, t.member, t.player, t.competition, 
              t.price, t.discount, t.subtotal, t.vat, t.total, t.source_row_index as "sourceRowIndex", 
              t.is_complete as "isComplete", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN ft.id IS NOT NULL THEN true ELSE false END as "isWinning",
              ft.competition_id as "winningCompetitionId"
       FROM transactions t
       LEFT JOIN flagged_transactions ft ON t.id = ft.transaction_id
       ORDER BY t.date ASC, t.time ASC`
    );

    return result.rows;
  }

  /**
   * Get a single transaction by ID
   * Includes flagging information from flagged_transactions table
   */
  async getTransactionById(id: number): Promise<TransactionRecord | null> {
    const result = await this.db.query<any>(
      `SELECT t.id, t.date, t.time, t.till, t.type, t.member, t.player, t.competition, 
              t.price, t.discount, t.subtotal, t.vat, t.total, t.source_row_index as "sourceRowIndex", 
              t.is_complete as "isComplete", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN ft.id IS NOT NULL THEN true ELSE false END as "isWinning",
              ft.competition_id as "winningCompetitionId"
       FROM transactions t
       LEFT JOIN flagged_transactions ft ON t.id = ft.transaction_id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get all transactions with pagination support
   */
  async getAllTransactionsPaginated(params: PaginationParams): Promise<PaginatedResponse<TransactionRecord>> {
    // Calculate limit and offset from either page/pageSize or limit/offset
    let limit: number;
    let offset: number;
    let page: number;
    let pageSize: number;

    if (params.page !== undefined && params.pageSize !== undefined) {
      // Use page-based pagination
      page = Math.max(1, params.page);
      pageSize = Math.max(1, Math.min(1000, params.pageSize)); // Cap at 1000
      limit = pageSize;
      offset = (page - 1) * pageSize;
    } else if (params.limit !== undefined && params.offset !== undefined) {
      // Use limit/offset pagination
      limit = Math.max(1, Math.min(1000, params.limit)); // Cap at 1000
      offset = Math.max(0, params.offset);
      pageSize = limit;
      page = Math.floor(offset / limit) + 1;
    } else {
      // Default pagination
      page = 1;
      pageSize = 100;
      limit = 100;
      offset = 0;
    }

    // Get total count
    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM transactions'
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const result = await this.db.query<any>(
      `SELECT t.id, t.date, t.time, t.till, t.type, t.member, t.player, t.competition, 
              t.price, t.discount, t.subtotal, t.vat, t.total, t.source_row_index as "sourceRowIndex", 
              t.is_complete as "isComplete", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN ft.id IS NOT NULL THEN true ELSE false END as "isWinning",
              ft.competition_id as "winningCompetitionId"
       FROM transactions t
       LEFT JOIN flagged_transactions ft ON t.id = ft.transaction_id
       ORDER BY t.date ASC, t.time ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: result.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      }
    };
  }

  /**
   * Get transactions within a date range
   * Includes flagging information from flagged_transactions table
   */
  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionRecord[]> {
    const result = await this.db.query<any>(
      `SELECT t.id, t.date, t.time, t.till, t.type, t.member, t.player, t.competition, 
              t.price, t.discount, t.subtotal, t.vat, t.total, t.source_row_index as "sourceRowIndex", 
              t.is_complete as "isComplete", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN ft.id IS NOT NULL THEN true ELSE false END as "isWinning",
              ft.competition_id as "winningCompetitionId"
       FROM transactions t
       LEFT JOIN flagged_transactions ft ON t.id = ft.transaction_id
       WHERE t.date >= $1 AND t.date <= $2
       ORDER BY t.date ASC, t.time ASC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Get transactions within a date range with pagination support
   */
  async getTransactionsByDateRangePaginated(
    startDate: string, 
    endDate: string, 
    params: PaginationParams
  ): Promise<PaginatedResponse<TransactionRecord>> {
    // Calculate limit and offset from either page/pageSize or limit/offset
    let limit: number;
    let offset: number;
    let page: number;
    let pageSize: number;

    if (params.page !== undefined && params.pageSize !== undefined) {
      // Use page-based pagination
      page = Math.max(1, params.page);
      pageSize = Math.max(1, Math.min(1000, params.pageSize)); // Cap at 1000
      limit = pageSize;
      offset = (page - 1) * pageSize;
    } else if (params.limit !== undefined && params.offset !== undefined) {
      // Use limit/offset pagination
      limit = Math.max(1, Math.min(1000, params.limit)); // Cap at 1000
      offset = Math.max(0, params.offset);
      pageSize = limit;
      page = Math.floor(offset / limit) + 1;
    } else {
      // Default pagination
      page = 1;
      pageSize = 100;
      limit = 100;
      offset = 0;
    }

    // Get total count for date range
    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM transactions WHERE date >= $1 AND date <= $2',
      [startDate, endDate]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const result = await this.db.query<any>(
      `SELECT t.id, t.date, t.time, t.till, t.type, t.member, t.player, t.competition, 
              t.price, t.discount, t.subtotal, t.vat, t.total, t.source_row_index as "sourceRowIndex", 
              t.is_complete as "isComplete", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN ft.id IS NOT NULL THEN true ELSE false END as "isWinning",
              ft.competition_id as "winningCompetitionId"
       FROM transactions t
       LEFT JOIN flagged_transactions ft ON t.id = ft.transaction_id
       WHERE t.date >= $1 AND t.date <= $2
       ORDER BY t.date ASC, t.time ASC
       LIMIT $3 OFFSET $4`,
      [startDate, endDate, limit, offset]
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: result.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      }
    };
  }

  /**
   * Delete all transactions
   */
  async deleteAllTransactions(): Promise<void> {
    await this.db.query('DELETE FROM transactions');
  }

  /**
   * Get the Monday of the week for a given date (ISO 8601 standard)
   * Returns Monday at 00:00:00.000
   */
  getMondayOfWeek(date: Date): Date {
    const result = new Date(date);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate days to subtract to get to Monday
    // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    result.setDate(result.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }

  /**
   * Get the Sunday of the week for a given date (ISO 8601 standard)
   * Returns Sunday at 23:59:59.999
   */
  getSundayOfWeek(date: Date): Date {
    const monday = this.getMondayOfWeek(date);
    const sunday = new Date(monday);
    
    // Add 6 days to Monday to get Sunday
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return sunday;
  }

  /**
   * Get information about the last week (most recent Monday-Sunday range with transactions)
   * Returns null if no transactions exist
   */
  async getLastWeekInfo(): Promise<LastWeekInfo | null> {
    // Step 1: Get the most recent transaction date
    const result = await this.db.query<{ latest_date: string }>(
      'SELECT MAX(date) as latest_date FROM transactions'
    );

    if (!result.rows[0]?.latest_date) {
      return null;
    }

    const latestDate = new Date(result.rows[0].latest_date);

    // Step 2: Calculate Monday and Sunday of that week
    const monday = this.getMondayOfWeek(latestDate);
    const sunday = this.getSundayOfWeek(latestDate);

    // Step 3: Format dates as YYYY-MM-DD
    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];

    // Step 4: Count transactions in the week range
    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM transactions WHERE date >= $1 AND date <= $2',
      [startDate, endDate]
    );

    const count = parseInt(countResult.rows[0].count, 10);

    return {
      startDate,
      endDate,
      count
    };
  }

  /**
   * Delete all transactions from the last week (most recent Monday-Sunday range)
   * Uses database transaction for atomic deletion
   * Returns the count of deleted transactions
   * Throws error if no transactions exist
   */
  async deleteLastWeek(): Promise<number> {
    // Step 1: Get last week information
    const weekInfo = await this.getLastWeekInfo();

    if (!weekInfo) {
      throw new Error('No transactions to delete');
    }

    // Step 2: Delete transactions within the date range using database transaction
    return await this.db.transaction(async (client: PoolClient) => {
      const result = await client.query(
        'DELETE FROM transactions WHERE date >= $1 AND date <= $2',
        [weekInfo.startDate, weekInfo.endDate]
      );

      return result.rowCount || 0;
    });
  }

}
