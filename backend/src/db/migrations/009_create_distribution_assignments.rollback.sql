-- Rollback distribution_assignments table
DROP TRIGGER IF EXISTS update_distribution_assignments_updated_at ON distribution_assignments;
DROP INDEX IF EXISTS idx_distribution_assignments_competition_id;
DROP INDEX IF EXISTS idx_distribution_assignments_distribution_id;
DROP TABLE IF EXISTS distribution_assignments;
