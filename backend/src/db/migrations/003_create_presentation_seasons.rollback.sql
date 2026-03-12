-- Rollback for 003_create_presentation_seasons.sql

-- Drop trigger
DROP TRIGGER IF EXISTS update_presentation_seasons_updated_at ON presentation_seasons;

-- Drop indexes
DROP INDEX IF EXISTS idx_presentation_seasons_years;
DROP INDEX IF EXISTS idx_presentation_seasons_active;

-- Drop table
DROP TABLE IF EXISTS presentation_seasons CASCADE;
