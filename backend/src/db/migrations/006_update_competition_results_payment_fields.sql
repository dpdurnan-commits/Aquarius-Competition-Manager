-- Migration 006: Update competition_results payment fields
-- Change entry_paid from boolean to numeric and add competition_refund field

-- Drop the default value first
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid DROP DEFAULT;

-- Change entry_paid from boolean to numeric (DECIMAL(10,2))
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid TYPE DECIMAL(10,2) USING (CASE WHEN entry_paid THEN 0.00 ELSE 0.00 END);

-- Set new default value for entry_paid
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid SET DEFAULT 0.00;

-- Add competition_refund column
ALTER TABLE competition_results 
  ADD COLUMN competition_refund DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to columns
COMMENT ON COLUMN competition_results.entry_paid IS 'Competition entry fee paid by the player';
COMMENT ON COLUMN competition_results.competition_refund IS 'Competition refund amount for the player';
