-- Create competition_costs table
CREATE TABLE IF NOT EXISTS competition_costs (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_cost_amount CHECK (amount > 0)
);

-- Index for date-based queries (most recent first)
CREATE INDEX idx_competition_costs_date 
  ON competition_costs(transaction_date DESC);

-- Index for transaction reference
CREATE INDEX idx_competition_costs_transaction_id 
  ON competition_costs(transaction_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_competition_costs_updated_at 
  BEFORE UPDATE ON competition_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
