import { DatabaseService } from '../services/database.service';
import { connectTestDatabase, disconnectTestDatabase } from '../test/testDatabase';

describe('Database Migrations', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    db = await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    // Clean up in correct order due to foreign key constraints
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM presentation_seasons');
  });

  describe('003_create_presentation_seasons', () => {
    it('should create presentation_seasons table with correct schema', async () => {
      // Check table exists
      const tableResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'presentation_seasons'
        );
      `);
      expect(tableResult.rows[0].exists).toBe(true);

      // Check columns exist
      const columnsResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'presentation_seasons'
        ORDER BY ordinal_position;
      `);

      const columns = columnsResult.rows.map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('start_year');
      expect(columns).toContain('end_year');
      expect(columns).toContain('is_active');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should enforce name format constraint', async () => {
      await expect(
        db.query(`
          INSERT INTO presentation_seasons (name, start_year, end_year)
          VALUES ('Invalid Format', 25, 26)
        `)
      ).rejects.toThrow();
    });

    it('should enforce year ordering constraint', async () => {
      await expect(
        db.query(`
          INSERT INTO presentation_seasons (name, start_year, end_year)
          VALUES ('Season: Winter 26-Summer 25', 26, 25)
        `)
      ).rejects.toThrow();
    });

    it('should enforce unique active season constraint', async () => {
      // Insert first active season
      await db.query(`
        INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
        VALUES ('Season: Winter 25-Summer 26', 25, 26, true)
      `);

      // Try to insert second active season - should fail
      await expect(
        db.query(`
          INSERT INTO presentation_seasons (name, start_year, end_year, is_active)
          VALUES ('Season: Winter 26-Summer 27', 26, 27, true)
        `)
      ).rejects.toThrow();

      // Clean up
      await db.query('DELETE FROM presentation_seasons');
    });
  });

  describe('004_extend_competitions', () => {
    it('should add season_id and type columns to competitions table', async () => {
      const columnsResult = await db.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'competitions'
        ORDER BY ordinal_position;
      `);

      const columns = columnsResult.rows.map(r => r.column_name);
      expect(columns).toContain('season_id');
      expect(columns).toContain('type');

      // Check default value for type
      const typeColumn = columnsResult.rows.find(r => r.column_name === 'type');
      expect(typeColumn?.column_default).toContain('singles');
    });

    it('should enforce competition type constraint', async () => {
      await expect(
        db.query(`
          INSERT INTO competitions (name, date, type)
          VALUES ('Test Competition', '2024-01-15', 'invalid')
        `)
      ).rejects.toThrow();
    });

    it('should create indexes for season_id and type', async () => {
      const indexResult = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'competitions'
        AND indexname IN ('idx_competitions_season_id', 'idx_competitions_type', 'idx_competitions_season_date');
      `);

      const indexes = indexResult.rows.map(r => r.indexname);
      expect(indexes).toContain('idx_competitions_season_id');
      expect(indexes).toContain('idx_competitions_type');
      expect(indexes).toContain('idx_competitions_season_date');
    });
  });

  describe('005_create_competition_results', () => {
    it('should create competition_results table with correct schema', async () => {
      // Check table exists
      const tableResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'competition_results'
        );
      `);
      expect(tableResult.rows[0].exists).toBe(true);

      // Check columns exist
      const columnsResult = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'competition_results'
        ORDER BY ordinal_position;
      `);

      const columns = columnsResult.rows.map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('competition_id');
      expect(columns).toContain('finishing_position');
      expect(columns).toContain('player_name');
      expect(columns).toContain('gross_score');
      expect(columns).toContain('handicap');
      expect(columns).toContain('nett_score');
      expect(columns).toContain('entry_paid');
      expect(columns).toContain('swindle_money_paid');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should enforce finishing_position constraint', async () => {
      // Create a test competition first
      const compResult = await db.query(`
        INSERT INTO competitions (name, date)
        VALUES ('Test Competition', '2024-01-15')
        RETURNING id
      `);
      const competitionId = compResult.rows[0].id;

      // Try to insert result with invalid position
      await expect(
        db.query(`
          INSERT INTO competition_results (competition_id, finishing_position, player_name)
          VALUES ($1, 0, 'Test Player')
        `, [competitionId])
      ).rejects.toThrow();

      // Clean up
      await db.query('DELETE FROM competitions WHERE id = $1', [competitionId]);
    });

    it('should enforce swindle_money_paid constraint', async () => {
      // Create a test competition first
      const compResult = await db.query(`
        INSERT INTO competitions (name, date)
        VALUES ('Test Competition', '2024-01-15')
        RETURNING id
      `);
      const competitionId = compResult.rows[0].id;

      // Try to insert result with negative swindle money
      await expect(
        db.query(`
          INSERT INTO competition_results (competition_id, finishing_position, player_name, swindle_money_paid)
          VALUES ($1, 1, 'Test Player', -10.00)
        `, [competitionId])
      ).rejects.toThrow();

      // Clean up
      await db.query('DELETE FROM competitions WHERE id = $1', [competitionId]);
    });

    it('should cascade delete results when competition is deleted', async () => {
      // Create a test competition
      const compResult = await db.query(`
        INSERT INTO competitions (name, date)
        VALUES ('Test Competition', '2024-01-15')
        RETURNING id
      `);
      const competitionId = compResult.rows[0].id;

      // Create a result
      await db.query(`
        INSERT INTO competition_results (competition_id, finishing_position, player_name)
        VALUES ($1, 1, 'Test Player')
      `, [competitionId]);

      // Delete competition
      await db.query('DELETE FROM competitions WHERE id = $1', [competitionId]);

      // Check that result was also deleted
      const resultCount = await db.query(`
        SELECT COUNT(*) FROM competition_results WHERE competition_id = $1
      `, [competitionId]);

      expect(parseInt(resultCount.rows[0].count)).toBe(0);
    });

    it('should create required indexes', async () => {
      const indexResult = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'competition_results'
        AND indexname IN (
          'idx_competition_results_competition_id',
          'idx_competition_results_player_name',
          'idx_competition_results_unpaid',
          'idx_competition_results_comp_position'
        );
      `);

      const indexes = indexResult.rows.map(r => r.indexname);
      expect(indexes).toContain('idx_competition_results_competition_id');
      expect(indexes).toContain('idx_competition_results_player_name');
      expect(indexes).toContain('idx_competition_results_unpaid');
      expect(indexes).toContain('idx_competition_results_comp_position');
    });
  });
});
