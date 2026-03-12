import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import { PresentationSeasonService } from '../services/presentationSeason.service';
import transactionRoutes from './transaction.routes';
import competitionRoutes from './competition.routes';
import flaggedTransactionRoutes from './flaggedTransaction.routes';
import summaryRoutes from './summary.routes';
import presentationSeasonRoutes from './presentationSeason.routes';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Letsdance@localhost:5432/competition_account_test';

describe('API Routes Integration Tests', () => {
  let app: Express;
  let db: DatabaseService;
  let seasonService: PresentationSeasonService;
  let testSeasonId: number;

  beforeAll(async () => {
    // Initialize database connection
    db = new DatabaseService(TEST_DATABASE_URL, 2, 5);
    await db.connect();
    await db.runMigrations();
    seasonService = new PresentationSeasonService(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Make db available to routes
    app.locals.db = db;
    
    // Register routes
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/competitions', competitionRoutes);
    app.use('/api/flagged-transactions', flaggedTransactionRoutes);
    app.use('/api/summaries', summaryRoutes);
    app.use('/api/presentation-seasons', presentationSeasonRoutes);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await db.query('DELETE FROM flagged_transactions');
    await db.query('DELETE FROM competition_results');
    await db.query('DELETE FROM competitions');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM presentation_seasons');
    
    // Create a test season for all tests
    const season = await seasonService.createSeason({
      name: 'Season: Winter 24-Summer 25',
      startYear: 24,
      endYear: 25
    });
    testSeasonId = season.id;
  });

  describe('Transaction Endpoints', () => {
    describe('POST /api/transactions/import', () => {
      it('should import valid transactions', async () => {
        const transactions = [
          {
            date: '2024-01-01',
            time: '10:00:00',
            till: 'Till 1',
            type: 'Sale',
            member: 'John Doe & Weekly Medal: Entry',
            player: '',
            competition: '',
            price: '5.00',
            discount: '0.00',
            subtotal: '5.00',
            vat: '0.00',
            total: '5.00',
            sourceRowIndex: 1,
            isComplete: true
          }
        ];

        const response = await request(app)
          .post('/api/transactions/import')
          .send(transactions)
          .expect(201);

        expect(response.body.message).toBe('Import successful');
        expect(response.body.imported).toBe(1);
      });

      it('should reject non-array input', async () => {
        const response = await request(app)
          .post('/api/transactions/import')
          .send({ invalid: 'data' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details).toContain('Request body must be an array of transaction records');
      });

      it('should validate required fields', async () => {
        const transactions = [
          {
            // Missing date, time, type, total
            till: 'Till 1',
            member: 'John Doe',
            sourceRowIndex: 1,
            isComplete: true
          }
        ];

        const response = await request(app)
          .post('/api/transactions/import')
          .send(transactions)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details.length).toBeGreaterThan(0);
      });

      it('should enforce chronological validation', async () => {
        // Import first transaction
        await request(app)
          .post('/api/transactions/import')
          .send([{
            date: '2024-01-02',
            time: '10:00:00',
            till: 'Till 1',
            type: 'Sale',
            member: 'John Doe',
            player: '',
            competition: '',
            price: '5.00',
            discount: '0.00',
            subtotal: '5.00',
            vat: '0.00',
            total: '5.00',
            sourceRowIndex: 1,
            isComplete: true
          }])
          .expect(201);

        // Try to import earlier transaction
        const response = await request(app)
          .post('/api/transactions/import')
          .send([{
            date: '2024-01-01',
            time: '10:00:00',
            till: 'Till 1',
            type: 'Sale',
            member: 'Jane Smith',
            player: '',
            competition: '',
            price: '5.00',
            discount: '0.00',
            subtotal: '5.00',
            vat: '0.00',
            total: '5.00',
            sourceRowIndex: 1,
            isComplete: true
          }])
          .expect(409);

        expect(response.body.error).toBe('Chronological validation failed');
      });
    });

    describe('GET /api/transactions', () => {
      it('should return all transactions', async () => {
        // Import test data
        await request(app)
          .post('/api/transactions/import')
          .send([
            {
              date: '2024-01-01',
              time: '10:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'John Doe',
              player: '',
              competition: '',
              price: '5.00',
              discount: '0.00',
              subtotal: '5.00',
              vat: '0.00',
              total: '5.00',
              sourceRowIndex: 1,
              isComplete: true
            },
            {
              date: '2024-01-02',
              time: '11:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Jane Smith',
              player: '',
              competition: '',
              price: '10.00',
              discount: '0.00',
              subtotal: '10.00',
              vat: '0.00',
              total: '10.00',
              sourceRowIndex: 2,
              isComplete: true
            }
          ]);

        const response = await request(app)
          .get('/api/transactions')
          .expect(200);

        expect(response.body.transactions).toHaveLength(2);
        expect(response.body.count).toBe(2);
      });

      it('should filter transactions by date range', async () => {
        // Import test data
        await request(app)
          .post('/api/transactions/import')
          .send([
            {
              date: '2024-01-01',
              time: '10:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'John Doe',
              player: '',
              competition: '',
              price: '5.00',
              discount: '0.00',
              subtotal: '5.00',
              vat: '0.00',
              total: '5.00',
              sourceRowIndex: 1,
              isComplete: true
            },
            {
              date: '2024-01-15',
              time: '11:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'Jane Smith',
              player: '',
              competition: '',
              price: '10.00',
              discount: '0.00',
              subtotal: '10.00',
              vat: '0.00',
              total: '10.00',
              sourceRowIndex: 2,
              isComplete: true
            }
          ]);

        const response = await request(app)
          .get('/api/transactions')
          .query({ startDate: '2024-01-01', endDate: '2024-01-10' })
          .expect(200);

        expect(response.body.transactions).toHaveLength(1);
        expect(response.body.transactions[0].date).toBe('2024-01-01');
      });

      it('should validate date format', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ startDate: 'invalid-date' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('GET /api/transactions/latest', () => {
      it('should return latest timestamp', async () => {
        await request(app)
          .post('/api/transactions/import')
          .send([
            {
              date: '2024-01-01',
              time: '10:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'John Doe',
              player: '',
              competition: '',
              price: '5.00',
              discount: '0.00',
              subtotal: '5.00',
              vat: '0.00',
              total: '5.00',
              sourceRowIndex: 1,
              isComplete: true
            }
          ]);

        const response = await request(app)
          .get('/api/transactions/latest')
          .expect(200);

        expect(response.body.latest).toEqual({
          date: '2024-01-01',
          time: '10:00:00'
        });
      });

      it('should return null when no transactions exist', async () => {
        const response = await request(app)
          .get('/api/transactions/latest')
          .expect(200);

        expect(response.body.latest).toBeNull();
      });
    });

    describe('DELETE /api/transactions', () => {
      it('should delete all transactions', async () => {
        await request(app)
          .post('/api/transactions/import')
          .send([
            {
              date: '2024-01-01',
              time: '10:00:00',
              till: 'Till 1',
              type: 'Sale',
              member: 'John Doe',
              player: '',
              competition: '',
              price: '5.00',
              discount: '0.00',
              subtotal: '5.00',
              vat: '0.00',
              total: '5.00',
              sourceRowIndex: 1,
              isComplete: true
            }
          ]);

        await request(app)
          .delete('/api/transactions')
          .expect(200);

        const response = await request(app)
          .get('/api/transactions')
          .expect(200);

        expect(response.body.transactions).toHaveLength(0);
      });
    });

    describe('GET /api/transactions with pagination', () => {
      beforeEach(async () => {
        // Import 25 test transactions
        const transactions = Array.from({ length: 25 }, (_, i) => ({
          date: '2024-01-01',
          time: `${10 + Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}:00`,
          till: 'Till 1',
          type: 'Sale',
          member: `Member ${i + 1}`,
          player: '',
          competition: '',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '0.00',
          total: '5.00',
          sourceRowIndex: i + 1,
          isComplete: true
        }));

        await request(app)
          .post('/api/transactions/import')
          .send(transactions);
      });

      it('should return paginated results with page and pageSize', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ page: 1, pageSize: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination).toEqual({
          total: 25,
          page: 1,
          pageSize: 10,
          totalPages: 3
        });
      });

      it('should return second page of results', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ page: 2, pageSize: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination).toEqual({
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3
        });
      });

      it('should return last page with remaining records', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ page: 3, pageSize: 10 })
          .expect(200);

        expect(response.body.data).toHaveLength(5);
        expect(response.body.pagination).toEqual({
          total: 25,
          page: 3,
          pageSize: 10,
          totalPages: 3
        });
      });

      it('should support limit and offset parameters', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ limit: 10, offset: 5 })
          .expect(200);

        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination.total).toBe(25);
        expect(response.body.pagination.page).toBe(1);
      });

      it('should cap pageSize at 1000', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ page: 1, pageSize: 5000 })
          .expect(200);

        expect(response.body.pagination.pageSize).toBe(1000);
      });

      it('should work with date range filtering', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .query({ 
            startDate: '2024-01-01', 
            endDate: '2024-01-01',
            page: 1,
            pageSize: 10
          })
          .expect(200);

        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination.total).toBe(25);
      });

      it('should return non-paginated response when no pagination params', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .expect(200);

        expect(response.body.transactions).toHaveLength(25);
        expect(response.body.count).toBe(25);
        expect(response.body.pagination).toBeUndefined();
      });
    });
  });

  describe('Competition Endpoints', () => {
    describe('POST /api/competitions', () => {
      it('should create a competition', async () => {
        const competition = {
          name: 'Weekly Medal',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId,
          description: 'Weekly competition',
          prizeStructure: '1st: £50, 2nd: £30, 3rd: £20'
        };

        const response = await request(app)
          .post('/api/competitions')
          .send(competition)
          .expect(201);

        expect(response.body.message).toBe('Competition created successfully');
        expect(response.body.competition.name).toBe('Weekly Medal');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/competitions')
          .send({ description: 'Missing name and date' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });

      it('should validate date format', async () => {
        const response = await request(app)
          .post('/api/competitions')
          .send({ name: 'Test', date: 'invalid-date', type: 'singles', seasonId: testSeasonId })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('GET /api/competitions', () => {
      it('should return all competitions', async () => {
        await request(app)
          .post('/api/competitions')
          .send({ name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: testSeasonId });

        await request(app)
          .post('/api/competitions')
          .send({ name: 'Competition 2', date: '2024-01-20', type: 'doubles', seasonId: testSeasonId });

        const response = await request(app)
          .get('/api/competitions')
          .expect(200);

        expect(response.body.competitions).toHaveLength(2);
        expect(response.body.count).toBe(2);
      });
    });

    describe('PUT /api/competitions/:id', () => {
      it('should update a competition', async () => {
        const createResponse = await request(app)
          .post('/api/competitions')
          .send({ name: 'Original Name', date: '2024-01-15', type: 'singles', seasonId: testSeasonId });

        const competitionId = createResponse.body.competition.id;

        const response = await request(app)
          .put(`/api/competitions/${competitionId}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.competition.name).toBe('Updated Name');
      });

      it('should return 404 for non-existent competition', async () => {
        const response = await request(app)
          .put('/api/competitions/99999')
          .send({ name: 'Updated Name' })
          .expect(404);

        expect(response.body.error).toBe('Not found');
      });
    });

    describe('DELETE /api/competitions/:id', () => {
      it('should delete a competition', async () => {
        const createResponse = await request(app)
          .post('/api/competitions')
          .send({ name: 'To Delete', date: '2024-01-15', type: 'singles', seasonId: testSeasonId });

        const competitionId = createResponse.body.competition.id;

        await request(app)
          .delete(`/api/competitions/${competitionId}`)
          .expect(200);

        const getResponse = await request(app)
          .get('/api/competitions')
          .expect(200);

        expect(getResponse.body.competitions).toHaveLength(0);
      });
    });
  });

  describe('Flagged Transaction Endpoints', () => {
    let transactionId: number;

    beforeEach(async () => {
      // Create a transaction to flag
      await request(app)
        .post('/api/transactions/import')
        .send([{
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'John Doe',
          player: '',
          competition: '',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '0.00',
          total: '5.00',
          sourceRowIndex: 1,
          isComplete: true
        }]);

      const transactions = await request(app).get('/api/transactions');
      transactionId = transactions.body.transactions[0].id;
    });

    describe('POST /api/flagged-transactions', () => {
      it('should flag a transaction', async () => {
        const response = await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId })
          .expect(201);

        expect(response.body.message).toBe('Transaction flagged successfully');
        expect(response.body.flaggedTransaction.transactionId).toBe(transactionId);
      });

      it('should prevent duplicate flagging', async () => {
        await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId });

        const response = await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId })
          .expect(409);

        expect(response.body.error).toBe('Conflict');
      });
    });

    describe('GET /api/flagged-transactions', () => {
      it('should return all flagged transactions with details', async () => {
        await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId });

        const response = await request(app)
          .get('/api/flagged-transactions')
          .expect(200);

        expect(response.body.flaggedTransactions).toHaveLength(1);
        expect(response.body.flaggedTransactions[0].transaction).toBeDefined();
      });
    });

    describe('PUT /api/flagged-transactions/:id', () => {
      it('should associate flagged transaction with competition', async () => {
        const flagResponse = await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId });

        const flaggedId = flagResponse.body.flaggedTransaction.id;

        const compResponse = await request(app)
          .post('/api/competitions')
          .send({ name: 'Test Competition', date: '2024-01-15', type: 'singles', seasonId: testSeasonId });

        const competitionId = compResponse.body.competition.id;

        const response = await request(app)
          .put(`/api/flagged-transactions/${flaggedId}`)
          .send({ competitionId })
          .expect(200);

        expect(response.body.flaggedTransaction.competitionId).toBe(competitionId);
      });
    });

    describe('DELETE /api/flagged-transactions/:id', () => {
      it('should remove flagged transaction', async () => {
        const flagResponse = await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId });

        const flaggedId = flagResponse.body.flaggedTransaction.id;

        await request(app)
          .delete(`/api/flagged-transactions/${flaggedId}`)
          .expect(200);

        const getResponse = await request(app)
          .get('/api/flagged-transactions')
          .expect(200);

        expect(getResponse.body.flaggedTransactions).toHaveLength(0);
      });
    });
  });

  describe('Summary Endpoints', () => {
    describe('GET /api/summaries/weekly', () => {
      it('should return empty array when no transactions', async () => {
        const response = await request(app)
          .get('/api/summaries/weekly')
          .expect(200);

        expect(response.body.summaries).toEqual([]);
      });

      it('should calculate weekly summaries', async () => {
        await request(app)
          .post('/api/transactions/import')
          .send([
            {
              date: '2024-01-01',
              time: '10:00:00',
              till: 'Till 1',
              type: 'Topup (Competitions)',
              member: 'John Doe',
              player: '',
              competition: '',
              price: '100.00',
              discount: '0.00',
              subtotal: '100.00',
              vat: '0.00',
              total: '100.00',
              sourceRowIndex: 1,
              isComplete: true
            }
          ]);

        const response = await request(app)
          .get('/api/summaries/weekly')
          .expect(200);

        expect(response.body.summaries.length).toBeGreaterThan(0);
        expect(response.body.summaries[0]).toHaveProperty('fromDate');
        expect(response.body.summaries[0]).toHaveProperty('toDate');
        expect(response.body.summaries[0]).toHaveProperty('finalPurse');
      });
    });
  });
});
