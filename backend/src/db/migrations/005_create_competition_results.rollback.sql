-- Rollback for 005_create_competition_results.sql

-- Drop trigger
DROP TRIGGER IF EXISTS update_competition_results_updated_at ON competition_results;

-- Drop indexes
DROP INDEX IF EXISTS idx_competition_results_comp_position;
DROP INDEX IF EXISTS idx_competition_results_unpaid;
DROP INDEX IF EXISTS idx_competition_results_player_name;
DROP INDEX IF EXISTS idx_competition_results_competition_id;

-- Drop table
DROP TABLE IF EXISTS competition_results CASCADE;
