-- Create distribution_assignments table
CREATE TABLE IF NOT EXISTS distribution_assignments (
  id SERIAL PRIMARY KEY,
  distribution_id INTEGER NOT NULL REFERENCES presentation_night_distributions(id) ON DELETE CASCADE,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_amount CHECK (amount >= 0),
  CONSTRAINT unique_competition_per_distribution UNIQUE (distribution_id, competition_id)
);

-- Index for distribution lookup (most common query)
CREATE INDEX idx_distribution_assignments_distribution_id 
  ON distribution_assignments(distribution_id);

-- Index for competition lookup
CREATE INDEX idx_distribution_assignments_competition_id 
  ON distribution_assignments(competition_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_distribution_assignments_updated_at 
  BEFORE UPDATE ON distribution_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
