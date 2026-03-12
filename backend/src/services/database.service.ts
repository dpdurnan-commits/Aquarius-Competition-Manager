import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logDatabaseQuery } from '../middleware';

export class DatabaseService {
  private pool!: Pool;
  private connectionString: string;
  private poolMin: number;
  private poolMax: number;

  constructor(connectionString: string, poolMin: number = 2, poolMax: number = 10) {
    this.connectionString = connectionString;
    this.poolMin = poolMin;
    this.poolMax = poolMax;
  }

  async connect(): Promise<void> {
    // Parse connection string to check if SSL is required
    // Cloud providers (Railway, Heroku, AWS RDS) typically require SSL
    const sslConfig = this.connectionString.includes('sslmode=require') || 
                      process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false } // Accept self-signed certificates from cloud providers
      : undefined;

    this.pool = new Pool({
      connectionString: this.connectionString,
      min: this.poolMin,
      max: this.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error('Unable to connect to database');
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Database disconnected');
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T extends QueryResultRow>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    logDatabaseQuery(sql, params);
    return this.pool.query<T>(sql, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    
    // Create migrations tracking table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping migrations');
      return;
    }

    // Get list of migration files (exclude rollback files)
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
      .sort();

    for (const file of files) {
      // Check if migration has already been executed
      const result = await this.query(
        'SELECT * FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        await this.transaction(async (client) => {
          await client.query(sql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
        });

        console.log(`Migration completed: ${file}`);
      }
    }

    console.log('All migrations completed');
  }
}
