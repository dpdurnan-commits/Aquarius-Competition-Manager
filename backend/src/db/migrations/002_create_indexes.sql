-- Create indexes for query performance

-- Indexes on transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date_time ON transactions(date, time);

-- Indexes on competitions table
CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(date);

-- Indexes on flagged_transactions table
CREATE INDEX IF NOT EXISTS idx_flagged_transactions_transaction_id ON flagged_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_flagged_transactions_competition_id ON flagged_transactions(competition_id);
