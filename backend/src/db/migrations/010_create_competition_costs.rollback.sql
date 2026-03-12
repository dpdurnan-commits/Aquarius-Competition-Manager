-- Rollback competition_costs table
DROP TRIGGER IF EXISTS update_competition_costs_updated_at ON competition_costs;
DROP INDEX IF EXISTS idx_competition_costs_transaction_id;
DROP INDEX IF EXISTS idx_competition_costs_date;
DROP TABLE IF EXISTS competition_costs;
