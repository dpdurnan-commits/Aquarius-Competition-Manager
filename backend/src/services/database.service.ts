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
    // In production (Docker), migrations are in src/db/migrations relative to process.cwd()
    // In development, migrations are relative to the compiled dist directory
    let migrationsDir = path.join(__dirname, '../db/migrations');
    
    // Check if we're in production (compiled code in dist/)
    if (!fs.existsSync(migrationsDir)) {
      // Try production path (relative to process.cwd())
      migrationsDir = path.join(process.cwd(), 'src/db/migrations');
      console.log(`Development path not found, trying production path: ${migrationsDir}`);
    }
    
    console.log(`Looking for migrations in: ${migrationsDir}`);
    console.log(`Current directory: ${__dirname}`);
    console.log(`Process cwd: ${process.cwd()}`);
    
    // Create migrations tracking table if it doesn't exist
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Migrations tracking table created/verified');
    } catch (error) {
      console.error('Failed to create migrations tracking table:', error);
      throw error;
    }

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.error(`ERROR: Migrations directory not found at: ${migrationsDir}`);
      console.log('Directory contents of __dirname:', fs.readdirSync(__dirname));
      console.log('Directory contents of process.cwd():', fs.readdirSync(process.cwd()));
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }
    
    console.log('Migrations directory found');

    // Get list of migration files (exclude rollback files)
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
      .sort();
    
    console.log(`Found ${files.length} migration files:`, files);

    for (const file of files) {
      // Check if migration has already been executed
      const result = await this.query(
        'SELECT * FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        console.log(`Reading migration from: ${migrationPath}`);
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        
        try {
          await this.transaction(async (client) => {
            await client.query(sql);
            await client.query(
              'INSERT INTO migrations (name) VALUES ($1)',
              [file]
            );
          });

          console.log(`Migration completed: ${file}`);
        } catch (error) {
          console.error(`Migration failed: ${file}`, error);
          throw error;
        }
      } else {
        console.log(`Migration already executed: ${file}`);
      }
    }

    console.log('All migrations completed');
  }
}
