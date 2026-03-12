-- Rollback Migration 006: Revert competition_results payment fields changes

-- Remove competition_refund column
ALTER TABLE competition_results 
  DROP COLUMN IF EXISTS competition_refund;

-- Drop the numeric default first
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid DROP DEFAULT;

-- Change entry_paid back to boolean
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid TYPE BOOLEAN USING (entry_paid > 0);

-- Set default value for entry_paid back to false
ALTER TABLE competition_results 
  ALTER COLUMN entry_paid SET DEFAULT false;
