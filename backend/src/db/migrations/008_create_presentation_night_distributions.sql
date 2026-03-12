-- Create presentation_night_distributions table
CREATE TABLE IF NOT EXISTS presentation_night_distributions (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES presentation_seasons(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  is_voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_total_amount CHECK (total_amount >= 0)
);

-- Index for season lookup (most common query)
CREATE INDEX idx_presentation_night_distributions_season_id 
  ON presentation_night_distributions(season_id);

-- Index for transaction reference
CREATE INDEX idx_presentation_night_distributions_transaction_id 
  ON presentation_night_distributions(transaction_id);

-- Partial unique index to ensure only one active distribution per season
CREATE UNIQUE INDEX idx_presentation_night_distributions_unique_active_season 
  ON presentation_night_distributions(season_id) 
  WHERE (is_voided = false);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_presentation_night_distributions_updated_at 
  BEFORE UPDATE ON presentation_night_distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
