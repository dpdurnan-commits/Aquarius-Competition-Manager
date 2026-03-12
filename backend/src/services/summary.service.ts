import { DatabaseService } from './database.service';
import { TransactionRecord, WeeklySummary } from '../types';

interface WeeklyPeriod {
  start: Date;
  end: Date;
}

interface PurseComponents {
  applicationTopUp: number;
  tillTopUp: number;
  entries: number;
  refunds: number;
}

interface PotComponents {
  winningsPaid: number;
  costs: number;
}

export class SummaryService {
  constructor(private db: DatabaseService) {}

  /**
   * Calculate weekly summaries for all transactions or within a date range
   */
  async calculateWeeklySummaries(startDate?: string, endDate?: string): Promise<WeeklySummary[]> {
    // Get transactions from database
    let records: TransactionRecord[];
    
    if (startDate && endDate) {
      records = await this.getTransactionsByDateRange(startDate, endDate);
    } else {
      records = await this.getAllTransactions();
    }

    // Handle empty records
    if (!records || records.length === 0) {
      return [];
    }

    // Find earliest and latest dates
    const dates = records.map(r => this.parseDate(r.date, r.time));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Generate all weekly periods
    const weeklyPeriods = this.generateWeeklyPeriods(earliestDate, latestDate);

    // Group records by week
    const recordsByWeek = this.groupRecordsByWeek(records, weeklyPeriods);

    // Calculate summaries for each period
    const summaries: WeeklySummary[] = [];
    let previousPurseFinal = 0;
    let previousPotFinal = 0;

    for (const period of weeklyPeriods) {
      const weekRecords = recordsByWeek.get(period) || [];

      // Calculate Competition Purse components
      const purseComponents = this.calculatePurseComponents(weekRecords);
      // Formula: Starting + AppTopUp + TillTopUp - Entries - Refunds
      // Note: Refunds are stored as negative values (e.g., -10.00), so subtracting them adds to purse
      const finalPurse = previousPurseFinal + 
                        purseComponents.applicationTopUp + 
                        purseComponents.tillTopUp - 
                        purseComponents.entries - 
                        purseComponents.refunds;

      // Calculate Competition Pot components
      const potComponents = this.calculatePotComponents(weekRecords);
      // Formula: Starting + Entries + Refunds - Winnings - Costs
      // Note: Refunds are stored as negative values (e.g., -10.00)
      // Adding a negative value reduces the pot (money leaving club to return to members)
      const finalPot = previousPotFinal + 
                      purseComponents.entries + 
                      purseComponents.refunds - 
                      potComponents.winningsPaid - 
                      potComponents.costs;

      const summary: WeeklySummary = {
        fromDate: this.formatDate(period.start),
        toDate: this.formatDate(period.end),
        startingPurse: previousPurseFinal,
        purseApplicationTopUp: purseComponents.applicationTopUp,
        purseTillTopUp: purseComponents.tillTopUp,
        competitionEntries: purseComponents.entries,
        competitionRefunds: purseComponents.refunds,
        finalPurse: finalPurse,
        startingPot: previousPotFinal,
        winningsPaid: potComponents.winningsPaid,
        competitionCosts: potComponents.costs,
        finalPot: finalPot
      };

      summaries.push(summary);

      // Update for next iteration
      previousPurseFinal = finalPurse;
      previousPotFinal = finalPot;
    }

    return summaries;
  }

  /**
   * Get all transactions from database
   * Includes flagging information from flagged_transactions table
   */
  private async getAllTransactions(): Promise<TransactionRecord[]> {
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
   * Get transactions within a date range
   * Includes flagging information from flagged_transactions table
   */
  private async getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionRecord[]> {
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
   * Get Monday 00:00:00 for any date
   */
  private getMondayOfWeek(date: Date): Date {
    const result = new Date(date);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to subtract to get to Monday
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    result.setDate(result.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }

  /**
   * Get Sunday 23:59:59 for any date
   */
  private getSundayOfWeek(date: Date): Date {
    const monday = this.getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return sunday;
  }

  /**
   * Generate array of weekly periods between two dates
   */
  private generateWeeklyPeriods(startDate: Date, endDate: Date): WeeklyPeriod[] {
    const periods: WeeklyPeriod[] = [];
    let current = this.getMondayOfWeek(startDate);
    const end = this.getSundayOfWeek(endDate);

    while (current <= end) {
      const periodStart = new Date(current);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(current);
      periodEnd.setDate(current.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);

      periods.push({
        start: periodStart,
        end: periodEnd
      });

      // Move to next Monday
      current = new Date(current);
      current.setDate(current.getDate() + 7);
    }

    return periods;
  }

  /**
   * Group records by their respective weekly periods
   */
  private groupRecordsByWeek(records: TransactionRecord[], periods: WeeklyPeriod[]): Map<WeeklyPeriod, TransactionRecord[]> {
    const grouped = new Map<WeeklyPeriod, TransactionRecord[]>();

    // Initialize map with empty arrays for each period
    for (const period of periods) {
      grouped.set(period, []);
    }

    // Assign each record to its period
    for (const record of records) {
      const recordDate = this.parseDate(record.date, record.time);

      for (const period of periods) {
        if (recordDate >= period.start && recordDate <= period.end) {
          grouped.get(period)!.push(record);
          break;
        }
      }
    }

    return grouped;
  }

  /**
   * Filter and sum Total field based on predicate
   */
  private sumWhere(records: TransactionRecord[], predicate: (record: TransactionRecord) => boolean): number {
    let sum = 0;
    
    for (const record of records) {
      if (predicate(record)) {
        const total = parseFloat(record.total);
        
        if (!isNaN(total)) {
          sum += total;
        }
      }
    }
    
    return sum;
  }

  /**
   * Calculate all Competition Purse component values
   */
  private calculatePurseComponents(records: TransactionRecord[]): PurseComponents {
    // Application Top Up: Till is empty AND Type equals "Topup (Competitions)"
    const applicationTopUp = this.sumWhere(
      records,
      r => r.till === '' && r.type === 'Topup (Competitions)'
    );

    // Till Top Up: Till equals "Till 1" AND Type equals "Topup (Competitions)"
    const tillTopUp = this.sumWhere(
      records,
      r => r.till === 'Till 1' && r.type === 'Topup (Competitions)'
    );

    // Entries: Type equals "Sale"
    const entries = this.sumWhere(
      records,
      r => r.type === 'Sale'
    );

    // Refunds: Type equals "Refund"
    const refunds = this.sumWhere(
      records,
      r => r.type === 'Refund'
    );

    return {
      applicationTopUp,
      tillTopUp,
      entries,
      refunds
    };
  }

  /**
   * Calculate all Competition Pot component values
   */
  private calculatePotComponents(records: TransactionRecord[]): PotComponents {
    // Winnings Paid: Sum of Total for flagged transactions
    // A transaction is flagged if isWinning is true
    const winningsPaid = this.sumWhere(
      records,
      r => r.isWinning === true
    );

    // Competition Costs: Sum of transactions with type 'Competition Cost' or 'Presentation Night Winnings'
    const costs = this.sumWhere(
      records,
      r => r.type === 'Competition Cost' || r.type === 'Presentation Night Winnings'
    );

    return {
      winningsPaid,
      costs
    };
  }

  /**
   * Parse date and time strings into Date object
   */
  private parseDate(date: string, time: string): Date {
    // Try to parse different date formats
    let parsedDate: Date;

    // Try DD/MM/YYYY format
    if (date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        
        parsedDate = new Date(year, month, day);
      } else {
        throw new Error(`Invalid date format: "${date}"`);
      }
    }
    // Try YYYY-MM-DD or DD-MM-YYYY format
    else if (date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        // Check if first part is year (4 digits) or day (1-2 digits)
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          parsedDate = new Date(date);
        } else {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          
          parsedDate = new Date(year, month, day);
        }
      } else {
        throw new Error(`Invalid date format: "${date}"`);
      }
    } else {
      throw new Error(`Invalid date format: "${date}"`);
    }

    // Parse time
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10) || 0;

    parsedDate.setHours(hours, minutes, seconds, 0);

    return parsedDate;
  }

  /**
   * Format Date object to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}
