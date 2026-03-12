-- Create presentation_seasons table
CREATE TABLE IF NOT EXISTS presentation_seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_year SMALLINT NOT NULL,
  end_year SMALLINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_year_order CHECK (start_year <= end_year),
  CONSTRAINT check_name_format CHECK (name ~ '^Season: Winter [0-9]{2}-Summer [0-9]{2}$')
);

-- Ensure only one active season (unique partial index)
CREATE UNIQUE INDEX idx_presentation_seasons_active 
  ON presentation_seasons (is_active) 
  WHERE is_active = true;

-- Index for chronological ordering
CREATE INDEX idx_presentation_seasons_years 
  ON presentation_seasons (start_year, end_year);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_presentation_seasons_updated_at 
  BEFORE UPDATE ON presentation_seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
