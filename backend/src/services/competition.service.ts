import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { Competition, CreateCompetitionDTO, UpdateCompetitionDTO } from '../types';

export class CompetitionService {
  constructor(private db: DatabaseService) {}

  /**
   * Create a new competition
   */
  async createCompetition(dto: CreateCompetitionDTO): Promise<Competition> {
    // Validate type
    if (!dto.type || !['singles', 'doubles'].includes(dto.type)) {
      throw new Error('Competition type must be "singles" or "doubles"');
    }

    // Validate seasonId exists (foreign key check)
    const seasonCheck = await this.db.query(
      'SELECT id FROM presentation_seasons WHERE id = $1',
      [dto.seasonId]
    );

    if (seasonCheck.rows.length === 0) {
      throw new Error(`Presentation season with id ${dto.seasonId} not found`);
    }

    const result = await this.db.query<Competition>(
      `INSERT INTO competitions (name, date, type, season_id, description, prize_structure)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, date, type, season_id as "seasonId", description, 
                 prize_structure as "prizeStructure", finished,
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [dto.name, dto.date, dto.type, dto.seasonId, dto.description || '', dto.prizeStructure || '']
    );

    return result.rows[0];
  }

  /**
   * Get all competitions ordered by date
   * Optionally filter by seasonId and finished status
   */
  async getAllCompetitions(options?: { seasonId?: number; finished?: boolean }): Promise<Competition[]> {
    let query = `SELECT c.id, c.name, c.date, c.type, c.season_id as "seasonId", c.description, 
                        c.prize_structure as "prizeStructure", c.finished,
                        c.created_at as "createdAt", c.updated_at as "updatedAt",
                        COUNT(cr.id)::int as "resultCount"
                 FROM competitions c
                 LEFT JOIN competition_results cr ON c.id = cr.competition_id`;
    const params: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    if (options?.seasonId !== undefined) {
      whereClauses.push(`c.season_id = $${paramIndex++}`);
      params.push(options.seasonId);
    }

    if (options?.finished !== undefined) {
      whereClauses.push(`c.finished = $${paramIndex++}`);
      params.push(options.finished);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY c.id, c.name, c.date, c.type, c.season_id, c.description, c.prize_structure, c.finished, c.created_at, c.updated_at';
    query += ' ORDER BY c.date DESC';

    const result = await this.db.query<Competition>(query, params);

    return result.rows;
  }

  /**
   * Get a competition by ID
   */
  async getCompetitionById(id: number): Promise<Competition | null> {
    const result = await this.db.query<Competition>(
      `SELECT id, name, date, type, season_id as "seasonId", description, 
              prize_structure as "prizeStructure", finished,
              created_at as "createdAt", updated_at as "updatedAt"
       FROM competitions 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Update an existing competition
   */
  async updateCompetition(id: number, updates: UpdateCompetitionDTO): Promise<Competition> {
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      values.push(updates.date);
    }

    if (updates.type !== undefined) {
      // Validate type
      if (!['singles', 'doubles'].includes(updates.type)) {
        throw new Error('Competition type must be "singles" or "doubles"');
      }
      fields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }

    if (updates.seasonId !== undefined) {
      // Validate seasonId exists
      const seasonCheck = await this.db.query(
        'SELECT id FROM presentation_seasons WHERE id = $1',
        [updates.seasonId]
      );

      if (seasonCheck.rows.length === 0) {
        throw new Error(`Presentation season with id ${updates.seasonId} not found`);
      }

      fields.push(`season_id = $${paramIndex++}`);
      values.push(updates.seasonId);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.prizeStructure !== undefined) {
      fields.push(`prize_structure = $${paramIndex++}`);
      values.push(updates.prizeStructure);
    }

    if (updates.finished !== undefined) {
      // Validate finished is boolean
      if (typeof updates.finished !== 'boolean') {
        throw new Error('Finished status must be a boolean value');
      }
      fields.push(`finished = $${paramIndex++}`);
      values.push(updates.finished);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter
    values.push(id);

    const result = await this.db.query<Competition>(
      `UPDATE competitions 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, date, type, season_id as "seasonId", description, 
                 prize_structure as "prizeStructure", finished,
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Competition with id ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Delete a competition and all associated flagged transactions
   * Uses database transaction for cascade delete
   */
  async deleteCompetition(id: number): Promise<void> {
    await this.db.transaction(async (client: PoolClient) => {
      // Delete flagged transaction associations first
      await client.query(
        'DELETE FROM flagged_transactions WHERE competition_id = $1',
        [id]
      );

      // Delete competition
      const result = await client.query(
        'DELETE FROM competitions WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error(`Competition with id ${id} not found`);
      }
    });
  }
}
