-- Migration: Add all_competitions_added column to presentation_seasons table
-- This column tracks whether all competitions for a season have been added
-- Used to filter seasons in the competition creation dialog during transaction imports

ALTER TABLE presentation_seasons 
  ADD COLUMN IF NOT EXISTS all_competitions_added BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering seasons by completion status
CREATE INDEX IF NOT EXISTS idx_presentation_seasons_all_competitions_added 
  ON presentation_seasons (all_competitions_added);
