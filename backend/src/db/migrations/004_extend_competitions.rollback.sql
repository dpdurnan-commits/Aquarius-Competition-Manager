-- Rollback for 004_extend_competitions.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_competitions_season_date;
DROP INDEX IF EXISTS idx_competitions_type;
DROP INDEX IF EXISTS idx_competitions_season_id;

-- Drop constraint
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS check_competition_type;

-- Drop columns
ALTER TABLE competitions DROP COLUMN IF EXISTS type;
ALTER TABLE competitions DROP COLUMN IF EXISTS season_id;
