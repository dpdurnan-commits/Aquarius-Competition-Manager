-- Rollback Migration: Remove all_competitions_added column from presentation_seasons table

DROP INDEX IF EXISTS idx_presentation_seasons_all_competitions_added;
ALTER TABLE presentation_seasons DROP COLUMN IF EXISTS all_competitions_added;
