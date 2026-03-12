-- Create competition_results table
CREATE TABLE IF NOT EXISTS competition_results (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  finishing_position INTEGER NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  gross_score INTEGER,
  handicap INTEGER,
  nett_score INTEGER,
  entry_paid BOOLEAN DEFAULT false,
  swindle_money_paid DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_finishing_position CHECK (finishing_position > 0),
  CONSTRAINT check_swindle_money CHECK (swindle_money_paid >= 0)
);

-- Index for competition lookup (most common query)
CREATE INDEX idx_competition_results_competition_id 
  ON competition_results(competition_id);

-- Index for name matching (swindle money auto-population)
CREATE INDEX idx_competition_results_player_name 
  ON competition_results(player_name);

-- Partial index for finding unpaid results
CREATE INDEX idx_competition_results_unpaid 
  ON competition_results(competition_id, swindle_money_paid) 
  WHERE swindle_money_paid = 0;

-- Composite index for position ordering within competition
CREATE INDEX idx_competition_results_comp_position 
  ON competition_results(competition_id, finishing_position);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_competition_results_updated_at 
  BEFORE UPDATE ON competition_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
