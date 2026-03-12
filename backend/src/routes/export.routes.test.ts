import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import exportRoutes from './export.routes';
import importRoutes from './import.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('Export and Import Routes Integration', () => {
  let app: Express;
  let db: DatabaseService;

  beforeAll(async () => {
    // Setup test database
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use('/api/export', exportRoutes);
    app.use('/api/import', importRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM transactions');
  });

  describe('GET /api/export/transactions', () => {
    it('should export empty transactions array when no data exists', async () => {
      const response = await request(app)
        .get('/api/export/transactions')
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('count', 0);
      expect(response.body).toHaveProperty('exportTimestamp');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions).toHaveLength(0);
    });

    it('should export all transactions with correct format', async () => {
      // Insert test transaction
      await db.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        ['2024-01-15', '10:30:00', 'Till 1', 'Sale', 'John Doe', 'John', 'Monthly Cup', 
         '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
      );

      const response = await request(app)
        .get('/api/export/transactions')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0]).toMatchObject({
        date: '2024-01-15',
        time: '10:30:00',
        till: 'Till 1',
        type: 'Sale',
        member: 'John Doe'
      });
    });
  });

  describe('GET /api/export/competitions', () => {
    it('should export empty competitions array when no data exists', async () => {
      const response = await request(app)
        .get('/api/export/competitions')
        .expect(200);

      expect(response.body).toHaveProperty('competitions');
      expect(response.body).toHaveProperty('count', 0);
      expect(response.body).toHaveProperty('exportTimestamp');
      expect(Array.isArray(response.body.competitions)).toBe(true);
      expect(response.body.competitions).toHaveLength(0);
    });

    it('should export all competitions with correct format', async () => {
      // Insert test competition
      await db.query(
        `INSERT INTO competitions (name, date, description, prize_structure)
         VALUES ($1, $2, $3, $4)`,
        ['Monthly Cup', '2024-01-15', 'Monthly competition', 'Standard']
      );

      const response = await request(app)
        .get('/api/export/competitions')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.competitions).toHaveLength(1);
      expect(response.body.competitions[0]).toMatchObject({
        name: 'Monthly Cup',
        date: '2024-01-15',
        description: 'Monthly competition'
      });
    });
  });

  describe('GET /api/export/all', () => {
    it('should export complete database with metadata', async () => {
      // Insert test data
      await db.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        ['2024-01-15', '10:30:00', 'Till 1', 'Sale', 'John Doe', 'John', 'Monthly Cup', 
         '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
      );

      await db.query(
        `INSERT INTO competitions (name, date, description, prize_structure)
         VALUES ($1, $2, $3, $4)`,
        ['Monthly Cup', '2024-01-15', 'Monthly competition', 'Standard']
      );

      const response = await request(app)
        .get('/api/export/all')
        .expect(200);

      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('competitions');
      expect(response.body).toHaveProperty('flaggedTransactions');

      expect(response.body.metadata).toMatchObject({
        transactionCount: 1,
        competitionCount: 1,
        flaggedTransactionCount: 0
      });
      expect(response.body.metadata).toHaveProperty('exportTimestamp');
    });
  });

  describe('POST /api/import/backup', () => {
    it('should reject invalid backup format', async () => {
      const invalidBackup = { invalid: 'data' };

      const response = await request(app)
        .post('/api/import/backup')
        .send(invalidBackup)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should restore backup successfully', async () => {
      const backup = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          transactionCount: 1,
          competitionCount: 1,
          flaggedTransactionCount: 0
        },
        transactions: [
          {
            date: '2024-01-15',
            time: '10:30:00',
            till: 'Till 1',
            type: 'Sale',
            member: 'John Doe',
            player: 'John',
            competition: 'Monthly Cup',
            price: '10.00',
            discount: '0.00',
            subtotal: '10.00',
            vat: '2.00',
            total: '12.00',
            sourceRowIndex: 1,
            isComplete: true
          }
        ],
        competitions: [
          {
            name: 'Monthly Cup',
            date: '2024-01-15',
            description: 'Monthly competition',
            prizeStructure: 'Standard'
          }
        ],
        flaggedTransactions: []
      };

      const response = await request(app)
        .post('/api/import/backup')
        .send(backup)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Backup restored successfully',
        transactionsImported: 1,
        competitionsImported: 1,
        flaggedTransactionsImported: 0
      });

      // Verify data was imported
      const transactions = await db.query('SELECT * FROM transactions');
      expect(transactions.rows).toHaveLength(1);

      const competitions = await db.query('SELECT * FROM competitions');
      expect(competitions.rows).toHaveLength(1);
    });

    it('should handle backup with flagged transactions', async () => {
      // First insert data to get IDs
      await db.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        ['2024-01-15', '10:30:00', 'Till 1', 'Sale', 'John Doe', 'John', 'Monthly Cup', 
         '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
      );

      await db.query(
        `INSERT INTO competitions (name, date, description, prize_structure)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['Monthly Cup', '2024-01-15', 'Monthly competition', 'Standard']
      );

      const backup = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          transactionCount: 1,
          competitionCount: 1,
          flaggedTransactionCount: 1
        },
        transactions: [
          {
            date: '2024-01-15',
            time: '10:30:00',
            till: 'Till 1',
            type: 'Sale',
            member: 'John Doe',
            player: 'John',
            competition: 'Monthly Cup',
            price: '10.00',
            discount: '0.00',
            subtotal: '10.00',
            vat: '2.00',
            total: '12.00',
            sourceRowIndex: 1,
            isComplete: true
          }
        ],
        competitions: [
          {
            name: 'Monthly Cup',
            date: '2024-01-15',
            description: 'Monthly competition',
            prizeStructure: 'Standard'
          }
        ],
        flaggedTransactions: [
          {
            transactionId: 1,
            competitionId: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/import/backup')
        .send(backup)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Backup restored successfully',
        transactionsImported: 1,
        competitionsImported: 1,
        flaggedTransactionsImported: 1
      });

      // Verify flagged transaction was imported
      const flagged = await db.query('SELECT * FROM flagged_transactions');
      expect(flagged.rows).toHaveLength(1);
    });
  });

  describe('Export and Import Round-trip', () => {
    it('should export and restore data successfully', async () => {
      // Insert test data
      await db.query(
        `INSERT INTO transactions 
         (date, time, till, type, member, player, competition, price, discount, 
          subtotal, vat, total, source_row_index, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        ['2024-01-15', '10:30:00', 'Till 1', 'Sale', 'John Doe', 'John', 'Monthly Cup', 
         '10.00', '0.00', '10.00', '2.00', '12.00', 1, true]
      );

      await db.query(
        `INSERT INTO competitions (name, date, description, prize_structure)
         VALUES ($1, $2, $3, $4)`,
        ['Monthly Cup', '2024-01-15', 'Monthly competition', 'Standard']
      );

      // Export all data
      const exportResponse = await request(app)
        .get('/api/export/all')
        .expect(200);

      const backup = exportResponse.body;

      // Clear database
      await db.query('DELETE FROM flagged_transactions');
      await db.query('DELETE FROM competitions');
      await db.query('DELETE FROM transactions');

      // Verify empty
      const emptyCheck = await db.query('SELECT * FROM transactions');
      expect(emptyCheck.rows).toHaveLength(0);

      // Restore from backup
      const importResponse = await request(app)
        .post('/api/import/backup')
        .send(backup)
        .expect(200);

      expect(importResponse.body.transactionsImported).toBe(1);
      expect(importResponse.body.competitionsImported).toBe(1);

      // Verify data restored
      const transactions = await db.query('SELECT * FROM transactions');
      expect(transactions.rows).toHaveLength(1);
      expect(transactions.rows[0]).toMatchObject({
        date: '2024-01-15',
        time: '10:30:00',
        type: 'Sale'
      });

      const competitions = await db.query('SELECT * FROM competitions');
      expect(competitions.rows).toHaveLength(1);
      expect(competitions.rows[0]).toMatchObject({
        name: 'Monthly Cup',
        date: '2024-01-15'
      });
    });
  });
});
