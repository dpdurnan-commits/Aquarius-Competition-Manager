-- Add new columns to existing competitions table
ALTER TABLE competitions 
  ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES presentation_seasons(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'singles';

-- Add CHECK constraint for competition type
ALTER TABLE competitions 
  ADD CONSTRAINT check_competition_type CHECK (type IN ('singles', 'doubles'));

-- Index for season filtering
CREATE INDEX IF NOT EXISTS idx_competitions_season_id ON competitions(season_id);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);

-- Composite index for season + date ordering
CREATE INDEX IF NOT EXISTS idx_competitions_season_date ON competitions(season_id, date);
