import { DatabaseService } from '../services/database.service';

let testDb: DatabaseService | null = null;

/**
 * Get or create test database instance
 * Uses a separate test database to avoid interfering with development data
 */
export function getTestDatabase(): DatabaseService {
  if (!testDb) {
    const testConnectionString = process.env.TEST_DATABASE_URL || 
      'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';
    
    testDb = new DatabaseService(testConnectionString, 2, 5);
  }
  return testDb;
}

/**
 * Connect to test database
 * Should be called in beforeAll or at the start of test suites
 */
export async function connectTestDatabase(): Promise<DatabaseService> {
  const db = getTestDatabase();
  await db.connect();
  await db.runMigrations();
  return db;
}

/**
 * Disconnect from test database
 * Should be called in afterAll to clean up connections
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.disconnect();
    testDb = null;
  }
}

/**
 * Reset test database by truncating all tables
 * Should be called in beforeEach to ensure clean state between tests
 */
export async function resetTestDatabase(): Promise<void> {
  const db = getTestDatabase();
  
  await db.query('TRUNCATE TABLE competition_results CASCADE');
  await db.query('TRUNCATE TABLE flagged_transactions CASCADE');
  await db.query('TRUNCATE TABLE competitions RESTART IDENTITY CASCADE');
  await db.query('TRUNCATE TABLE presentation_seasons RESTART IDENTITY CASCADE');
  await db.query('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
}

/**
 * Seed test database with sample data
 * Useful for integration tests that need pre-populated data
 */
export async function seedTestDatabase(data: {
  transactions?: any[];
  competitions?: any[];
  flaggedTransactions?: any[];
}): Promise<void> {
  const db = getTestDatabase();

  // Insert transactions
  if (data.transactions && data.transactions.length > 0) {
    for (const transaction of data.transactions) {
      await db.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          transaction.date,
          transaction.time,
          transaction.till || '',
          transaction.type,
          transaction.member || '',
          transaction.player || '',
          transaction.competition || '',
          transaction.price || '',
          transaction.discount || '',
          transaction.subtotal || '',
          transaction.vat || '',
          transaction.total,
          transaction.sourceRowIndex || 0,
          transaction.isComplete !== undefined ? transaction.isComplete : true,
        ]
      );
    }
  }

  // Insert competitions
  if (data.competitions && data.competitions.length > 0) {
    for (const competition of data.competitions) {
      await db.query(
        `INSERT INTO competitions (name, date, description, prize_structure)
         VALUES ($1, $2, $3, $4)`,
        [
          competition.name,
          competition.date,
          competition.description || '',
          competition.prizeStructure || '',
        ]
      );
    }
  }

  // Insert flagged transactions
  if (data.flaggedTransactions && data.flaggedTransactions.length > 0) {
    for (const flagged of data.flaggedTransactions) {
      await db.query(
        `INSERT INTO flagged_transactions (transaction_id, competition_id)
         VALUES ($1, $2)`,
        [flagged.transactionId, flagged.competitionId || null]
      );
    }
  }
}

/**
 * Execute a query on the test database
 * Convenience method for tests that need direct database access
 */
export async function queryTestDatabase<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const db = getTestDatabase();
  const result = await db.query(sql, params);
  return result.rows as T[];
}
