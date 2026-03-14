-- Rollback for 011_add_finished_to_competitions.sql

-- Drop index
DROP INDEX IF EXISTS idx_competitions_finished;

-- Drop column
ALTER TABLE competitions DROP COLUMN IF EXISTS finished;
