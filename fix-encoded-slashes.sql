-- Fix HTML-encoded forward slashes in existing database records
-- This script replaces &#x2F; with / in all text fields

-- Update transactions table
UPDATE transactions 
SET 
  member = REPLACE(member, '&#x2F;', '/'),
  player = REPLACE(player, '&#x2F;', '/'),
  competition = REPLACE(competition, '&#x2F;', '/');

-- Verify the changes
SELECT 
  id, 
  member, 
  player, 
  competition 
FROM transactions 
WHERE 
  member LIKE '%/%' OR 
  player LIKE '%/%' OR 
  competition LIKE '%/%'
LIMIT 10;
