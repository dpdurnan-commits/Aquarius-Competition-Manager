import { DatabaseService } from './database.service';
import {
  SeasonWinner,
  Competition,
  CompetitionResult,
  CreateDistributionDTO,
  PresentationNightDistribution,
  DistributionWithAssignments,
  DistributionAssignment,
  TransactionRecord,
  CompetitionCost,
  CreateCompetitionCostDTO,
  CompetitionCostSummary
} from '../types';

export class DistributionService {
  constructor(private db: DatabaseService) {}

  /**
   * Get all winners for a presentation season
   * Queries competitions for a season and identifies position 1 winners
   * Handles both singles (1 winner) and doubles (2 winners) competitions
   */
  async getSeasonWinners(seasonId: number): Promise<SeasonWinner[]> {
    // 1. Validate season exists
    const season = await this.db.query(
      'SELECT id FROM presentation_seasons WHERE id = $1',
      [seasonId]
    );
    
    if (season.rows.length === 0) {
      throw new Error(`Season ${seasonId} not found`);
    }
    
    // 2. Get all competitions for the season
    const competitions = await this.db.query<Competition>(
      `SELECT id, name, date, type 
       FROM competitions 
       WHERE season_id = $1 
       ORDER BY date ASC`,
      [seasonId]
    );
    
    // 3. For each competition, get position 1 results
    const seasonWinners: SeasonWinner[] = [];
    
    for (const comp of competitions.rows) {
      const results = await this.db.query<CompetitionResult>(
        `SELECT id, player_name as "playerName", finishing_position as "finishingPosition"
         FROM competition_results
         WHERE competition_id = $1 AND finishing_position = 1
         ORDER BY id ASC`,
        [comp.id]
      );
      
      // 4. Structure winner data
      const winners = results.rows.map(r => ({
        resultId: r.id,
        playerName: r.playerName,
        finishingPosition: r.finishingPosition
      }));
      
      seasonWinners.push({
        competitionId: comp.id,
        competitionName: comp.name,
        competitionDate: comp.date,
        competitionType: comp.type,
        winners: winners
      });
    }
    
    return seasonWinners;
  }


    /**
     * Create a new distribution for a presentation season
     * Validates season, creates transaction, distribution record, and assignments
     * All operations wrapped in database transaction for atomicity
     */
    async createDistribution(dto: CreateDistributionDTO): Promise<PresentationNightDistribution> {
      return await this.db.transaction(async (client) => {
        // 1. Validate season exists and has no active distribution
        const existingDist = await client.query(
          `SELECT id FROM presentation_night_distributions
           WHERE season_id = $1 AND is_voided = false`,
          [dto.seasonId]
        );

        if (existingDist.rows.length > 0) {
          throw new Error('Distribution already exists for this season');
        }

        // 2. Validate all competitions belong to the season
        for (const assignment of dto.assignments) {
          const compCheck = await client.query(
            'SELECT id FROM competitions WHERE id = $1 AND season_id = $2',
            [assignment.competitionId, dto.seasonId]
          );

          if (compCheck.rows.length === 0) {
            throw new Error(`Competition ${assignment.competitionId} not in season ${dto.seasonId}`);
          }
        }

        // 3. Calculate total amount
        const totalAmount = dto.assignments.reduce((sum, a) => sum + a.amount, 0);

        // 4. Create cost transaction
        const transactionResult = await client.query<TransactionRecord>(
          `INSERT INTO transactions
           (date, time, till, type, member, player, competition,
            price, discount, subtotal, vat, total, source_row_index, is_complete)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id`,
          [
            dto.transactionDate,
            '00:00:00',
            '',
            'Presentation Night Winnings',
            'Presentation Night Winnings',
            '',
            '',
            totalAmount.toFixed(2),
            '0.00',
            totalAmount.toFixed(2),
            '0.00',
            totalAmount.toFixed(2),
            0,
            true
          ]
        );

        const transactionId = transactionResult.rows[0].id!;

        // 5. Create distribution record
        const distResult = await client.query<PresentationNightDistribution>(
          `INSERT INTO presentation_night_distributions
           (season_id, transaction_id, total_amount, transaction_date)
           VALUES ($1, $2, $3, $4)
           RETURNING id, season_id as "seasonId", transaction_id as "transactionId",
                     total_amount as "totalAmount", transaction_date as "transactionDate",
                     is_voided as "isVoided", voided_at as "voidedAt",
                     created_at as "createdAt", updated_at as "updatedAt"`,
          [dto.seasonId, transactionId, totalAmount, dto.transactionDate]
        );

        const distribution = distResult.rows[0];

        // 6. Create assignment records
        for (const assignment of dto.assignments) {
          await client.query(
            `INSERT INTO distribution_assignments
             (distribution_id, competition_id, amount)
             VALUES ($1, $2, $3)`,
            [distribution.id, assignment.competitionId, assignment.amount]
          );
        }

        return distribution;
      });
    }

  /**
   * Get distribution for a season with assignment records
   * Returns null if no distribution exists
   */
  async getDistributionBySeason(seasonId: number): Promise<DistributionWithAssignments | null> {
    // Query distribution by season ID
    const distResult = await this.db.query<PresentationNightDistribution>(
      `SELECT id, season_id as "seasonId", transaction_id as "transactionId",
              total_amount as "totalAmount", transaction_date as "transactionDate",
              is_voided as "isVoided", voided_at as "voidedAt",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM presentation_night_distributions
       WHERE season_id = $1 AND is_voided = false`,
      [seasonId]
    );

    // Return null if no distribution exists
    if (distResult.rows.length === 0) {
      return null;
    }

    const distribution = distResult.rows[0];

    // Include assignment records
    const assignmentsResult = await this.db.query<DistributionAssignment>(
      `SELECT id, distribution_id as "distributionId", competition_id as "competitionId",
              amount, created_at as "createdAt", updated_at as "updatedAt"
       FROM distribution_assignments
       WHERE distribution_id = $1
       ORDER BY id ASC`,
      [distribution.id]
    );

    return {
      ...distribution,
      assignments: assignmentsResult.rows
    };
  }

  /**
   * Void a distribution
   * Marks distribution as voided and sets voided_at timestamp
   * Prevents voiding already voided distributions
   */
  async voidDistribution(distributionId: number): Promise<void> {
    // Check if distribution exists and is not already voided
    const distResult = await this.db.query<PresentationNightDistribution>(
      `SELECT id, is_voided as "isVoided"
       FROM presentation_night_distributions
       WHERE id = $1`,
      [distributionId]
    );

    if (distResult.rows.length === 0) {
      throw new Error(`Distribution ${distributionId} not found`);
    }

    const distribution = distResult.rows[0];

    // Prevent voiding already voided distributions
    if (distribution.isVoided) {
      throw new Error(`Distribution ${distributionId} is already voided`);
    }

    // Mark distribution as voided and set voided_at timestamp
    await this.db.query(
      `UPDATE presentation_night_distributions
       SET is_voided = true, voided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [distributionId]
    );
  }

  /**
   * Create a new competition cost entry
   * Validates description uniqueness and amount format
   * Creates cost transaction and competition_costs record
   * All operations wrapped in database transaction for atomicity
   */
  async createCompetitionCost(dto: CreateCompetitionCostDTO): Promise<CompetitionCost> {
    return await this.db.transaction(async (client) => {
      // 1. Validate description is unique (check existing costs)
      const existingCost = await client.query(
        'SELECT id, description FROM competition_costs WHERE description = $1',
        [dto.description]
      );

      if (existingCost.rows.length > 0) {
        throw new Error(`Competition cost with description "${dto.description}" already exists`);
      }

      // 2. Validate amount is positive with up to 2 decimal places
      if (dto.amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Check for up to 2 decimal places
      const decimalPlaces = (dto.amount.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Amount must have at most 2 decimal places');
      }

      // 3. Create cost transaction with specified or current date
      const transactionDate = dto.transactionDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const transactionResult = await client.query<TransactionRecord>(
        `INSERT INTO transactions
         (date, time, till, type, member, player, competition,
          price, discount, subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          transactionDate,
          '00:00:00',
          '',
          'Competition Cost',
          dto.description,
          '',
          '',
          dto.amount.toFixed(2),
          '0.00',
          dto.amount.toFixed(2),
          '0.00',
          dto.amount.toFixed(2),
          0,
          true
        ]
      );

      const transactionId = transactionResult.rows[0].id!;

      // 4. Create competition_costs record with transaction reference
      const costResult = await client.query<CompetitionCost>(
        `INSERT INTO competition_costs
         (description, amount, transaction_id, transaction_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id, description, amount, transaction_id as "transactionId",
                   transaction_date as "transactionDate",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [dto.description, dto.amount, transactionId, transactionDate]
      );

      return costResult.rows[0];
    });
  }

  /**
   * Get all competition costs ordered by date (most recent first)
   * Calculates total of all costs
   * Returns costs array and total
   */
  async getAllCompetitionCosts(): Promise<CompetitionCostSummary> {
    // Query all competition costs ordered by date (most recent first)
    const costsResult = await this.db.query<CompetitionCost>(
      `SELECT id, description, amount, transaction_id as "transactionId",
              transaction_date as "transactionDate",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM competition_costs
       ORDER BY transaction_date DESC, id DESC`
    );

    const costs = costsResult.rows;

    // Calculate total of all costs
    const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);

    return {
      costs,
      total
    };
  }

  /**
   * Get competition costs filtered by date range
   * Calculates total of filtered costs
   * Returns filtered costs and total
   */
  async getCompetitionCostsByDateRange(startDate: string, endDate: string): Promise<CompetitionCostSummary> {
    // Query costs filtered by date range
    const costsResult = await this.db.query<CompetitionCost>(
      `SELECT id, description, amount, transaction_id as "transactionId",
              transaction_date as "transactionDate",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM competition_costs
       WHERE transaction_date >= $1 AND transaction_date <= $2
       ORDER BY transaction_date DESC, id DESC`,
      [startDate, endDate]
    );

    const costs = costsResult.rows;

    // Calculate total of filtered costs
    const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);

    return {
      costs,
      total
    };
  }

}
