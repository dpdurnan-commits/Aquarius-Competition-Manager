// Load environment variables from .env file for tests
require('dotenv').config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

// Increase test timeout for database operations
jest.setTimeout(10000);
