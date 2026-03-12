import { DatabaseService } from './database.service';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock fs module
jest.mock('fs');

describe('DatabaseService', () => {
  let db: DatabaseService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    };

    // Make Pool constructor return our mock
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
  });

  describe('constructor', () => {
    it('should create a DatabaseService instance with default pool settings', () => {
      db = new DatabaseService('postgresql://localhost/test');
      expect(db).toBeInstanceOf(DatabaseService);
    });

    it('should create a DatabaseService instance with custom pool settings', () => {
      db = new DatabaseService('postgresql://localhost/test', 5, 20);
      expect(db).toBeInstanceOf(DatabaseService);
    });
  });

  describe('connect', () => {
    it('should establish database connection and validate connectivity', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] });

      await db.connect();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost/test',
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use custom pool settings when provided', async () => {
      db = new DatabaseService('postgresql://localhost/test', 5, 20);
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await db.connect();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost/test',
        min: 5,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    });

    it('should throw error when connection fails', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockPool.connect.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(db.connect()).rejects.toThrow('Unable to connect to database');
    });

    it('should throw error when validation query fails', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(db.connect()).rejects.toThrow('Unable to connect to database');
    });
  });

  describe('disconnect', () => {
    it('should close all database connections', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await db.connect();
      await db.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle disconnect when pool is not initialized', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      
      await expect(db.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getPool', () => {
    it('should return undefined before connect is called', () => {
      db = new DatabaseService('postgresql://localhost/test');
      expect(db.getPool()).toBeUndefined();
    });

    it('should return pool instance after connect is called', async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await db.connect();
      
      expect(db.getPool()).toBe(mockPool);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      await db.connect();
    });

    it('should execute query with parameters', async () => {
      const expectedResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockPool.query.mockResolvedValueOnce(expectedResult);

      const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(expectedResult);
    });

    it('should execute query without parameters', async () => {
      const expectedResult = { rows: [{ count: 5 }], rowCount: 1 };
      mockPool.query.mockResolvedValueOnce(expectedResult);

      const result = await db.query('SELECT COUNT(*) FROM users');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users', undefined);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      await db.connect();
      jest.clearAllMocks();
    });

    it('should execute callback within transaction and commit on success', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // callback query
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const callback = jest.fn(async (client: PoolClient) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        return { id: 1 };
      });

      const result = await db.transaction(callback);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Query failed')) // callback query fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const callback = jest.fn(async (client: PoolClient) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
      });

      await expect(db.transaction(callback)).rejects.toThrow('Query failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if rollback fails', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Query failed')) // callback query fails
        .mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK fails

      const callback = jest.fn(async (client: PoolClient) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
      });

      // The original error is thrown, but client should still be released
      await expect(db.transaction(callback)).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle multiple operations in transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // first insert
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // second insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const callback = jest.fn(async (client: PoolClient) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['user1']);
        await client.query('INSERT INTO users (name) VALUES ($1)', ['user2']);
        return { count: 2 };
      });

      const result = await db.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('runMigrations', () => {
    beforeEach(async () => {
      db = new DatabaseService('postgresql://localhost/test');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      await db.connect();
      jest.clearAllMocks();
    });

    it('should create migrations table if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await db.runMigrations();

      const calls = mockPool.query.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0][0];
      expect(firstCall).toMatch(/CREATE TABLE IF NOT EXISTS migrations/);
    });

    it('should skip migrations if directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await db.runMigrations();

      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('should execute new migrations in order', async () => {
      const migrationsDir = path.join(__dirname, '../db/migrations');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '002_create_indexes.sql',
        '001_initial_schema.sql',
        '003_add_users.sql',
      ]);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('001')) return 'CREATE TABLE test1;';
        if (filePath.includes('002')) return 'CREATE INDEX idx1;';
        if (filePath.includes('003')) return 'CREATE TABLE test2;';
        return '';
      });

      // Mock migrations table queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE migrations table
        .mockResolvedValueOnce({ rows: [] }) // Check 001 - not executed
        .mockResolvedValueOnce({ rows: [] }) // Check 002 - not executed
        .mockResolvedValueOnce({ rows: [] }); // Check 003 - not executed

      // Mock transaction queries for each migration
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN for 001
        .mockResolvedValueOnce({ rows: [] }) // Execute 001 SQL
        .mockResolvedValueOnce({ rows: [] }) // Insert migration record
        .mockResolvedValueOnce({ rows: [] }) // COMMIT for 001
        .mockResolvedValueOnce({ rows: [] }) // BEGIN for 002
        .mockResolvedValueOnce({ rows: [] }) // Execute 002 SQL
        .mockResolvedValueOnce({ rows: [] }) // Insert migration record
        .mockResolvedValueOnce({ rows: [] }) // COMMIT for 002
        .mockResolvedValueOnce({ rows: [] }) // BEGIN for 003
        .mockResolvedValueOnce({ rows: [] }) // Execute 003 SQL
        .mockResolvedValueOnce({ rows: [] }) // Insert migration record
        .mockResolvedValueOnce({ rows: [] }); // COMMIT for 003

      await db.runMigrations();

      expect(fs.readdirSync).toHaveBeenCalledWith(migrationsDir);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['001_initial_schema.sql']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['002_create_indexes.sql']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['003_add_users.sql']
      );
    });

    it('should skip already executed migrations', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_initial_schema.sql',
        '002_create_indexes.sql',
      ]);

      // Mock migrations table queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE migrations table
        .mockResolvedValueOnce({ rows: [{ name: '001_initial_schema.sql' }] }) // 001 already executed
        .mockResolvedValueOnce({ rows: [] }); // 002 not executed

      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE INDEX idx1;');

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN for 002
        .mockResolvedValueOnce({ rows: [] }) // Execute 002 SQL
        .mockResolvedValueOnce({ rows: [] }) // Insert migration record
        .mockResolvedValueOnce({ rows: [] }); // COMMIT for 002

      await db.runMigrations();

      // Should only read file for 002
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should rollback migration on error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_initial_schema.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('INVALID SQL;');

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE migrations table
        .mockResolvedValueOnce({ rows: [] }); // Check 001 - not executed

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('SQL syntax error')) // Execute SQL fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(db.runMigrations()).rejects.toThrow('SQL syntax error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should only process .sql files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_initial_schema.sql',
        'README.md',
        '002_create_indexes.sql',
        'notes.txt',
      ]);

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE migrations table
        .mockResolvedValueOnce({ rows: [] }) // Check 001
        .mockResolvedValueOnce({ rows: [] }); // Check 002

      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      mockClient.query
        .mockResolvedValue({ rows: [] }); // All transaction queries

      await db.runMigrations();

      // Should only check for .sql files
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['001_initial_schema.sql']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['002_create_indexes.sql']
      );
      expect(mockPool.query).not.toHaveBeenCalledWith(
        'SELECT * FROM migrations WHERE name = $1',
        ['README.md']
      );
    });
  });
});
