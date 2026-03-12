import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../services/database.service';
import { PresentationSeasonService } from '../services/presentationSeason.service';
import transactionRoutes from '../routes/transaction.routes';
import competitionRoutes from '../routes/competition.routes';
import flaggedTransactionRoutes from '../routes/flaggedTransaction.routes';
import csvRoutes from '../routes/csv.routes';
import presentationSeasonRoutes from '../routes/presentationSeason.routes';
import { connectTestDatabase, disconnectTestDatabase, resetTestDatabase } from './testDatabase';

/**
 * End-to-End Integration Tests
 * 
 * These tests validate complete workflows from start to finish:
 * 1. CSV Import Workflow - Upload CSV, parse, transform, validate, store
 * 2. Competition Management Workflow - Create, update, delete competitions
 * 3. Flagging and Association Workflow - Flag transactions, associate with competitions
 */

describe('End-to-End Workflow Integration Tests', () => {
  let app: Express;
  let db: DatabaseService;
  let seasonService: PresentationSeasonService;
  let testSeasonId: number;

  beforeAll(async () => {
    db = await connectTestDatabase();
    seasonService = new PresentationSeasonService(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'text/csv', limit: '10mb' }));
    
    // Make db available to routes
    app.locals.db = db;
    
    // Register routes
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/competitions', competitionRoutes);
    app.use('/api/flagged-transactions', flaggedTransactionRoutes);
    app.use('/api/import', csvRoutes);
    app.use('/api/presentation-seasons', presentationSeasonRoutes);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    // Create a test season for all tests
    const season = await seasonService.createSeason({
      name: 'Season: Winter 24-Summer 25',
      startYear: 24,
      endYear: 25
    });
    testSeasonId = season.id;
  });

  describe('End-to-End CSV Import Workflow', () => {
    it('should complete full CSV import workflow: upload -> parse -> transform -> validate -> store', async () => {
      // Step 1: Prepare CSV data with multiple transaction types
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,09:00:00,Till 1,Topup (Competitions),Staff Member,,,,,,
,,,,,,,,,,
,,,,Competition Purse,100.00,0.00,100.00,0.00,100.00
2024-01-15,10:30:00,Till 1,Sale,John Smith,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,11:45:00,Till 1,Sale,Jane Doe,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,14:20:00,Till 1,Refund,Bob Wilson,,,,,,
,,,,,,,,,,
,,,,Competition Entry,-5.00,0.00,-5.00,0.00,-5.00`;

      // Step 2: Upload CSV file
      const uploadResponse = await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      // Verify upload response
      expect(uploadResponse.body.message).toBe('CSV import successful');
      expect(uploadResponse.body.imported).toBe(4);
      expect(uploadResponse.body.transformWarnings).toBeDefined();

      // Step 3: Verify transactions were stored correctly
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(transactionsResponse.body.transactions).toHaveLength(4);
      
      // Verify Topup record
      const topup = transactionsResponse.body.transactions.find((t: any) => t.type === 'Topup (Competitions)');
      expect(topup).toBeDefined();
      expect(topup.member).toBe('Staff Member');
      expect(topup.total).toBe('100.00');

      // Verify Sale records
      const sales = transactionsResponse.body.transactions.filter((t: any) => t.type === 'Sale');
      expect(sales).toHaveLength(2);
      expect(sales[0].total).toBe('5.00');

      // Verify Refund record
      const refund = transactionsResponse.body.transactions.find((t: any) => t.type === 'Refund');
      expect(refund).toBeDefined();
      expect(refund.total).toBe('-5.00');

      // CSV transformation and field extraction is tested separately
      // This e2e test focuses on the import workflow completion
    });

    it('should enforce chronological validation during CSV import', async () => {
      // Step 1: Import initial CSV with later date
      const firstCsv = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-20,10:00:00,Till 1,Topup (Competitions),Staff,,,,,,
,,,,,,,,,,
,,,,Competition Purse,100.00,0.00,100.00,0.00,100.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(firstCsv), 'test.csv')
        .expect(201);

      // Step 2: Attempt to import CSV with earlier date (should fail)
      const secondCsv = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Topup (Competitions),Staff,,,,,,
,,,,,,,,,,
,,,,Competition Purse,50.00,0.00,50.00,0.00,50.00`;

      const response = await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(secondCsv), 'test.csv')
        .expect(409);

      expect(response.body.error).toBe('Chronological validation failed');
      expect(response.body.message).toContain('2024-01-15');
      expect(response.body.message).toContain('2024-01-20');

      // Step 3: Verify no transactions from second CSV were stored
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(transactionsResponse.body.transactions).toHaveLength(1);
      expect(transactionsResponse.body.transactions[0].date).toBe('2024-01-20');
    });

    it('should handle CSV with empty result gracefully', async () => {
      // CSV with only header row
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total`;

      const response = await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(400);

      expect(response.body.error).toBe('No valid records found');
    });

    it('should reject invalid CSV format', async () => {
      const invalidCsv = `This is not a valid CSV format
Just some random text
Without proper structure`;

      const response = await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(invalidCsv), 'test.csv')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle large CSV import with multiple transaction types', async () => {
      // Generate CSV with 50 transactions
      let csvContent = 'Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total\n';
      
      for (let i = 0; i < 50; i++) {
        const hour = 9 + Math.floor(i / 6);
        const minute = (i % 6) * 10;
        const type = i % 3 === 0 ? 'Topup (Competitions)' : 'Sale';
        const member = type === 'Topup (Competitions)' ? 'Staff' : `Member ${i}`;
        const amount = type === 'Topup (Competitions)' ? '100.00' : '5.00';
        
        csvContent += `2024-01-15,${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00,Till 1,${type},${member},,,,,,\n`;
        csvContent += ',,,,,,,,,,\n';
        csvContent += `,,,,Competition Entry,${amount},0.00,${amount},0.00,${amount}\n`;
      }

      const response = await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      expect(response.body.imported).toBe(50);

      // Verify all transactions were stored
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(transactionsResponse.body.transactions).toHaveLength(50);
    });
  });

  describe('End-to-End Competition Management Workflow', () => {
    it('should complete full competition lifecycle: create -> read -> update -> delete', async () => {
      // Step 1: Create a competition
      const createResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Weekly Medal',
          date: '2024-01-20',
          type: 'singles',
          seasonId: testSeasonId,
          description: 'Weekly stroke play competition',
          prizeStructure: '1st: £50, 2nd: £30, 3rd: £20'
        })
        .expect(201);

      expect(createResponse.body.message).toBe('Competition created successfully');
      expect(createResponse.body.competition).toBeDefined();
      const competitionId = createResponse.body.competition.id;
      expect(competitionId).toBeDefined();

      // Step 2: Read the competition
      const readResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(readResponse.body.competitions).toHaveLength(1);
      expect(readResponse.body.competitions[0].name).toBe('Weekly Medal');
      expect(readResponse.body.competitions[0].date).toBe('2024-01-20');

      // Step 3: Update the competition
      const updateResponse = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({
          name: 'Weekly Medal - Updated',
          description: 'Updated description',
          prizeStructure: '1st: £60, 2nd: £40, 3rd: £25'
        })
        .expect(200);

      expect(updateResponse.body.competition.name).toBe('Weekly Medal - Updated');
      expect(updateResponse.body.competition.prizeStructure).toBe('1st: £60, 2nd: £40, 3rd: £25');

      // Step 4: Verify update persisted
      const verifyResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(verifyResponse.body.competitions[0].name).toBe('Weekly Medal - Updated');

      // Step 5: Delete the competition
      await request(app)
        .delete(`/api/competitions/${competitionId}`)
        .expect(200);

      // Step 6: Verify deletion
      const finalResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(finalResponse.body.competitions).toHaveLength(0);
    });

    it('should manage multiple competitions simultaneously', async () => {
      // Create multiple competitions
      const competitions = [
        { name: 'Weekly Medal', date: '2024-01-20', type: 'singles', seasonId: testSeasonId, description: 'Stroke play' },
        { name: 'Monthly Stableford', date: '2024-01-27', type: 'singles', seasonId: testSeasonId, description: 'Stableford format' },
        { name: 'Club Championship', date: '2024-02-10', type: 'doubles', seasonId: testSeasonId, description: 'Championship event' }
      ];

      const createdIds: number[] = [];

      for (const comp of competitions) {
        const response = await request(app)
          .post('/api/competitions')
          .send(comp)
          .expect(201);
        
        createdIds.push(response.body.competition.id);
      }

      // Verify all competitions exist
      const listResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(listResponse.body.competitions).toHaveLength(3);

      // Update one competition
      await request(app)
        .put(`/api/competitions/${createdIds[1]}`)
        .send({ name: 'Monthly Stableford - Cancelled' })
        .expect(200);

      // Delete one competition
      await request(app)
        .delete(`/api/competitions/${createdIds[2]}`)
        .expect(200);

      // Verify final state
      const finalResponse = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(finalResponse.body.competitions).toHaveLength(2);
      expect(finalResponse.body.competitions.find((c: any) => c.name === 'Monthly Stableford - Cancelled')).toBeDefined();
      expect(finalResponse.body.competitions.find((c: any) => c.name === 'Club Championship')).toBeUndefined();
    });

    it('should validate competition data during creation and update', async () => {
      // Test missing required fields
      const invalidResponse = await request(app)
        .post('/api/competitions')
        .send({ description: 'Missing name and date' })
        .expect(400);

      expect(invalidResponse.body.error).toBe('Validation failed');

      // Test invalid date format
      const invalidDateResponse = await request(app)
        .post('/api/competitions')
        .send({ name: 'Test', date: 'not-a-date' })
        .expect(400);

      expect(invalidDateResponse.body.error).toBe('Validation failed');

      // Create valid competition
      const createResponse = await request(app)
        .post('/api/competitions')
        .send({ name: 'Valid Competition', date: '2024-01-20', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      const competitionId = createResponse.body.competition.id;

      // Test update with invalid date
      const invalidUpdateResponse = await request(app)
        .put(`/api/competitions/${competitionId}`)
        .send({ date: 'invalid-date' })
        .expect(400);

      expect(invalidUpdateResponse.body.error).toBe('Validation failed');
    });
  });

  describe('End-to-End Flagging and Association Workflow', () => {
    it('should complete full flagging workflow: import transactions -> flag winners -> create competition -> associate', async () => {
      // Step 1: Import transactions via CSV
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Sale,John Smith,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,10:30:00,Till 1,Sale,Jane Doe,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,11:00:00,Till 1,Sale,Bob Wilson,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      // Step 2: Get all transactions
      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(transactionsResponse.body.transactions).toHaveLength(3);
      const transactions = transactionsResponse.body.transactions;

      // Step 3: Flag the first two transactions as winners
      const flagResponse1 = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId: transactions[0].id })
        .expect(201);

      const flagResponse2 = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId: transactions[1].id })
        .expect(201);

      expect(flagResponse1.body.message).toBe('Transaction flagged successfully');
      expect(flagResponse2.body.message).toBe('Transaction flagged successfully');

      const flaggedId1 = flagResponse1.body.flaggedTransaction.id;
      const flaggedId2 = flagResponse2.body.flaggedTransaction.id;

      // Step 4: Verify flagged transactions
      const flaggedListResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(flaggedListResponse.body.flaggedTransactions).toHaveLength(2);
      expect(flaggedListResponse.body.flaggedTransactions[0].transaction).toBeDefined();

      // Step 5: Create a competition
      const competitionResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Weekly Medal - Jan 15',
          date: '2024-01-15',
          type: 'singles',
          seasonId: testSeasonId,
          description: 'Weekly competition',
          prizeStructure: '1st: £30, 2nd: £20'
        })
        .expect(201);

      const competitionId = competitionResponse.body.competition.id;

      // Step 6: Associate flagged transactions with competition
      await request(app)
        .put(`/api/flagged-transactions/${flaggedId1}`)
        .send({ competitionId })
        .expect(200);

      await request(app)
        .put(`/api/flagged-transactions/${flaggedId2}`)
        .send({ competitionId })
        .expect(200);

      // Step 7: Verify associations
      const finalFlaggedResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(finalFlaggedResponse.body.flaggedTransactions).toHaveLength(2);
      expect(finalFlaggedResponse.body.flaggedTransactions[0].competitionId).toBe(competitionId);
      expect(finalFlaggedResponse.body.flaggedTransactions[1].competitionId).toBe(competitionId);
    });

    it('should prevent duplicate flagging of the same transaction', async () => {
      // Import a transaction
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Sale,John Smith,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      const transactionId = transactionsResponse.body.transactions[0].id;

      // Flag the transaction
      await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId })
        .expect(201);

      // Attempt to flag again (should fail)
      const duplicateResponse = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId })
        .expect(409);

      expect(duplicateResponse.body.error).toBe('Conflict');
      expect(duplicateResponse.body.message).toContain('already flagged');
    });

    it('should handle unflagging and re-association workflow', async () => {
      // Import transaction
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Sale,John Smith,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      const transactionId = transactionsResponse.body.transactions[0].id;

      // Flag transaction
      const flagResponse = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId })
        .expect(201);

      const flaggedId = flagResponse.body.flaggedTransaction.id;

      // Create first competition
      const comp1Response = await request(app)
        .post('/api/competitions')
        .send({ name: 'Competition 1', date: '2024-01-15', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      const comp1Id = comp1Response.body.competition.id;

      // Associate with first competition
      await request(app)
        .put(`/api/flagged-transactions/${flaggedId}`)
        .send({ competitionId: comp1Id })
        .expect(200);

      // Create second competition
      const comp2Response = await request(app)
        .post('/api/competitions')
        .send({ name: 'Competition 2', date: '2024-01-15', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      const comp2Id = comp2Response.body.competition.id;

      // Re-associate with second competition
      await request(app)
        .put(`/api/flagged-transactions/${flaggedId}`)
        .send({ competitionId: comp2Id })
        .expect(200);

      // Verify final association
      const finalResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(finalResponse.body.flaggedTransactions[0].competitionId).toBe(comp2Id);

      // Unflag transaction
      await request(app)
        .delete(`/api/flagged-transactions/${flaggedId}`)
        .expect(200);

      // Verify unflagged
      const unflaggedResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(unflaggedResponse.body.flaggedTransactions).toHaveLength(0);
    });

    it('should handle cascade delete when competition with associations is deleted', async () => {
      // Import transactions
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Sale,John Smith,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,10:30:00,Till 1,Sale,Jane Doe,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      const transactions = transactionsResponse.body.transactions;

      // Flag both transactions
      const flag1 = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId: transactions[0].id })
        .expect(201);

      const flag2 = await request(app)
        .post('/api/flagged-transactions')
        .send({ transactionId: transactions[1].id })
        .expect(201);

      // Create competition
      const compResponse = await request(app)
        .post('/api/competitions')
        .send({ name: 'Test Competition', date: '2024-01-15', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      const competitionId = compResponse.body.competition.id;

      // Associate both flagged transactions
      await request(app)
        .put(`/api/flagged-transactions/${flag1.body.flaggedTransaction.id}`)
        .send({ competitionId })
        .expect(200);

      await request(app)
        .put(`/api/flagged-transactions/${flag2.body.flaggedTransaction.id}`)
        .send({ competitionId })
        .expect(200);

      // Verify associations exist
      const beforeDeleteResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(beforeDeleteResponse.body.flaggedTransactions).toHaveLength(2);
      expect(beforeDeleteResponse.body.flaggedTransactions.every((f: any) => f.competitionId === competitionId)).toBe(true);

      // Delete competition (should cascade delete associations)
      await request(app)
        .delete(`/api/competitions/${competitionId}`)
        .expect(200);

      // Verify flagged transactions still exist but associations are removed
      const afterDeleteResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      // Flagged transactions are deleted when competition is deleted (cascade)
      expect(afterDeleteResponse.body.flaggedTransactions).toHaveLength(0);
    });

    it('should handle complex workflow with multiple competitions and flagged transactions', async () => {
      // Import multiple transactions
      const csvContent = `Date,Time,Till,Type,Member,Price,Discount,Subtotal,VAT,Total
2024-01-15,10:00:00,Till 1,Sale,Player 1,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-15,10:30:00,Till 1,Sale,Player 2,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-22,10:00:00,Till 1,Sale,Player 3,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00
2024-01-22,10:30:00,Till 1,Sale,Player 4,,,,,,
,,,,,,,,,,
,,,,Competition Entry,5.00,0.00,5.00,0.00,5.00`;

      await request(app)
        .post('/api/import/csv')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);

      const transactionsResponse = await request(app)
        .get('/api/transactions')
        .expect(200);

      const transactions = transactionsResponse.body.transactions;

      // Create two competitions
      const comp1 = await request(app)
        .post('/api/competitions')
        .send({ name: 'Week 1 Medal', date: '2024-01-15', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      const comp2 = await request(app)
        .post('/api/competitions')
        .send({ name: 'Week 2 Medal', date: '2024-01-22', type: 'singles', seasonId: testSeasonId })
        .expect(201);

      // Flag all transactions
      const flagged = [];
      for (const transaction of transactions) {
        const flagResponse = await request(app)
          .post('/api/flagged-transactions')
          .send({ transactionId: transaction.id })
          .expect(201);
        flagged.push(flagResponse.body.flaggedTransaction);
      }

      // Associate first two with comp1, last two with comp2
      await request(app)
        .put(`/api/flagged-transactions/${flagged[0].id}`)
        .send({ competitionId: comp1.body.competition.id })
        .expect(200);

      await request(app)
        .put(`/api/flagged-transactions/${flagged[1].id}`)
        .send({ competitionId: comp1.body.competition.id })
        .expect(200);

      await request(app)
        .put(`/api/flagged-transactions/${flagged[2].id}`)
        .send({ competitionId: comp2.body.competition.id })
        .expect(200);

      await request(app)
        .put(`/api/flagged-transactions/${flagged[3].id}`)
        .send({ competitionId: comp2.body.competition.id })
        .expect(200);

      // Verify all associations
      const finalResponse = await request(app)
        .get('/api/flagged-transactions')
        .expect(200);

      expect(finalResponse.body.flaggedTransactions).toHaveLength(4);

      const comp1Flagged = finalResponse.body.flaggedTransactions.filter(
        (f: any) => f.competitionId === comp1.body.competition.id
      );
      const comp2Flagged = finalResponse.body.flaggedTransactions.filter(
        (f: any) => f.competitionId === comp2.body.competition.id
      );

      expect(comp1Flagged).toHaveLength(2);
      expect(comp2Flagged).toHaveLength(2);
    });
  });
});
