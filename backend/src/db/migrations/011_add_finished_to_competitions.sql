-- Add finished column to competitions table
ALTER TABLE competitions 
  ADD COLUMN IF NOT EXISTS finished BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering by finished status
CREATE INDEX IF NOT EXISTS idx_competitions_finished ON competitions(finished);
