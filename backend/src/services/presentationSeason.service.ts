import { DatabaseService } from './database.service';
import { PresentationSeason, CreateSeasonDTO, UpdateSeasonDTO } from '../types';

export class PresentationSeasonService {
  constructor(private db: DatabaseService) {}

  async createSeason(dto: CreateSeasonDTO): Promise<PresentationSeason> {
    // Validate season name format
    const nameRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
    if (!nameRegex.test(dto.name)) {
      throw new Error('Invalid season name format. Expected: "Season: Winter YY-Summer YY"');
    }

    // Validate year ordering
    if (dto.startYear > dto.endYear) {
      throw new Error('Start year must be less than or equal to end year');
    }

    const result = await this.db.query<PresentationSeason>(
      `INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
       VALUES ($1, $2, $3, false)
       RETURNING id, name, start_year as "startYear", end_year as "endYear", 
                 is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [dto.name, dto.startYear, dto.endYear]
    );

    return result.rows[0];
  }

  async getAllSeasons(allCompetitionsAdded?: boolean): Promise<PresentationSeason[]> {
    let query = `SELECT id, name, start_year as "startYear", end_year as "endYear", 
              is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM presentation_seasons`;
    
    const values: any[] = [];
    
    if (allCompetitionsAdded !== undefined) {
      query += ` WHERE all_competitions_added = $1`;
      values.push(allCompetitionsAdded);
    }
    
    query += ` ORDER BY start_year ASC, end_year ASC`;

    const result = await this.db.query<PresentationSeason>(query, values);

    return result.rows;
  }

  async getActiveSeason(): Promise<PresentationSeason | null> {
    const result = await this.db.query<PresentationSeason>(
      `SELECT id, name, start_year as "startYear", end_year as "endYear", 
              is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM presentation_seasons
       WHERE is_active = true
       LIMIT 1`
    );

    return result.rows[0] || null;
  }

  async setActiveSeason(id: number): Promise<PresentationSeason> {
    return this.db.transaction(async (client) => {
      // Check if season exists
      const checkResult = await client.query(
        'SELECT id FROM presentation_seasons WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        throw new Error(`Season with id ${id} not found`);
      }

      // Deactivate all seasons
      await client.query('UPDATE presentation_seasons SET is_active = false');

      // Activate the specified season
      const result = await client.query<PresentationSeason>(
        `UPDATE presentation_seasons
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, start_year as "startYear", end_year as "endYear", 
                   is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [id]
      );

      return result.rows[0];
    });
  }

  async autoIncrementSeason(): Promise<PresentationSeason> {
    // Get the most recent season
    const result = await this.db.query<PresentationSeason>(
      `SELECT id, name, start_year as "startYear", end_year as "endYear", 
              is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM presentation_seasons
       ORDER BY start_year DESC, end_year DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      throw new Error('No existing seasons found to auto-increment from');
    }

    const mostRecent = result.rows[0];
    const newStartYear = mostRecent.startYear + 1;
    const newEndYear = mostRecent.endYear + 1;

    // Format years as two digits
    const startYearStr = newStartYear.toString().padStart(2, '0');
    const endYearStr = newEndYear.toString().padStart(2, '0');
    const newName = `Season: Winter ${startYearStr}-Summer ${endYearStr}`;

    return this.createSeason({
      name: newName,
      startYear: newStartYear,
      endYear: newEndYear,
    });
  }

  async updateSeason(id: number, updates: UpdateSeasonDTO): Promise<PresentationSeason> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      // Validate season name format
      const nameRegex = /^Season: Winter \d{2}-Summer \d{2}$/;
      if (!nameRegex.test(updates.name)) {
        throw new Error('Invalid season name format. Expected: "Season: Winter YY-Summer YY"');
      }
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.startYear !== undefined) {
      updateFields.push(`start_year = $${paramIndex++}`);
      values.push(updates.startYear);
    }

    if (updates.endYear !== undefined) {
      updateFields.push(`end_year = $${paramIndex++}`);
      values.push(updates.endYear);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updates.allCompetitionsAdded !== undefined) {
      updateFields.push(`all_competitions_added = $${paramIndex++}`);
      values.push(updates.allCompetitionsAdded);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.query<PresentationSeason>(
      `UPDATE presentation_seasons
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, start_year as "startYear", end_year as "endYear", 
                 is_active as "isActive", all_competitions_added as "allCompetitionsAdded",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Season with id ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteSeason(id: number): Promise<void> {
    // Check for referential integrity - ensure no competitions are associated
    const competitionCheck = await this.db.query(
      'SELECT COUNT(*) as count FROM competitions WHERE season_id = $1',
      [id]
    );

    const count = parseInt(competitionCheck.rows[0].count, 10);
    if (count > 0) {
      throw new Error(`Cannot delete season: ${count} competition(s) are associated with this season`);
    }

    const result = await this.db.query(
      'DELETE FROM presentation_seasons WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Season with id ${id} not found`);
    }
  }
}
