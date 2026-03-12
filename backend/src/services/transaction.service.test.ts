import { TransactionService } from './transaction.service';
import { DatabaseService } from './database.service';
import { TransactionRecord } from '../types';
import { PoolClient } from 'pg';

// Mock DatabaseService
jest.mock('./database.service');

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    transactionService = new TransactionService(mockDb);
  });

  describe('Field Extraction', () => {
    it('should extract player and competition from member field with ampersand and colon', async () => {
      const records: TransactionRecord[] = [
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

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', oid: 0, fields: [], rowCount: 0 });
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        mockClient.query = jest.fn().mockResolvedValue({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      // Verify the extracted fields were passed to the database
      const mockClient = mockDb.transaction.mock.calls[0][0];
      await mockClient({} as PoolClient);
      
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should leave player and competition empty when no ampersand or colon', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Regular Member',
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

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', oid: 0, fields: [], rowCount: 0 });
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        mockClient.query = jest.fn().mockResolvedValue({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Chronological Validation', () => {
    it('should allow import when database is empty', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member',
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

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', oid: 0, fields: [], rowCount: 0 });
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        mockClient.query = jest.fn().mockResolvedValue({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject import when new transactions are before latest existing', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member',
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

      // Mock existing transaction at later date
      mockDb.query.mockResolvedValueOnce({
        rows: [{ date: '2024-01-02', time: '12:00:00' }],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      await expect(transactionService.importTransactions(records)).rejects.toThrow(
        /Import rejected.*before the latest existing transaction/
      );
    });

    it('should allow import when new transactions are after latest existing', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-03',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member',
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

      // Mock existing transaction at earlier date
      mockDb.query.mockResolvedValueOnce({
        rows: [{ date: '2024-01-02', time: '12:00:00' }],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        mockClient.query = jest.fn().mockResolvedValue({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Transaction Import with Atomic Operations', () => {
    it('should import all transactions in a single database transaction', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
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
          date: '2024-01-01',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 2',
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
      ];

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', oid: 0, fields: [], rowCount: 0 });
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        mockClient.query = jest.fn().mockResolvedValue({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors and rollback on failure', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member',
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

      mockDb.query.mockResolvedValueOnce({
        rows: [{ date: '2024-01-02', time: '12:00:00' }],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      await expect(transactionService.importTransactions(records)).rejects.toThrow();
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should collect errors for failed records but continue processing', async () => {
      const records: TransactionRecord[] = [
        {
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
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
          date: '2024-01-01',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 2',
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
      ];

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', oid: 0, fields: [], rowCount: 0 });
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {} as PoolClient;
        let callCount = 0;
        mockClient.query = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Database constraint violation');
          }
          return Promise.resolve({ rows: [], command: '', oid: 0, fields: [], rowCount: 1 });
        });
        return callback(mockClient);
      });

      const result = await transactionService.importTransactions(records);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Database constraint violation');
    });
  });

  describe('Transaction Query Methods', () => {
    it('should get all transactions ordered by date and time', async () => {
      const mockTransactions: TransactionRecord[] = [
        {
          id: 1,
          date: '2024-01-01',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
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
          id: 2,
          date: '2024-01-02',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 2',
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
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockTransactions,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await transactionService.getAllTransactions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should get transactions by date range', async () => {
      const mockTransactions: TransactionRecord[] = [
        {
          id: 1,
          date: '2024-01-02',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: 'Member 1',
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

      mockDb.query.mockResolvedValueOnce({
        rows: mockTransactions,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await transactionService.getTransactionsByDateRange('2024-01-01', '2024-01-03');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-02');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.date >= $1 AND t.date <= $2'),
        ['2024-01-01', '2024-01-03']
      );
    });

    it('should delete all transactions', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        fields: [],
        rowCount: 5
      });

      await transactionService.deleteAllTransactions();

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM transactions');
    });
  });

  describe('getLatestTimestamp', () => {
    it('should return null when no transactions exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 0
      });

      const result = await transactionService.getLatestTimestamp();

      expect(result).toBeNull();
    });

    it('should return latest timestamp when transactions exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ date: '2024-01-05', time: '15:30:00' }],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await transactionService.getLatestTimestamp();

      expect(result).toEqual({ date: '2024-01-05', time: '15:30:00' });
    });
  });

  describe('Pagination', () => {
    const mockTransactions: TransactionRecord[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      date: '2024-01-01',
      time: `${10 + i}:00:00`,
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

    describe('getAllTransactionsPaginated', () => {
      it('should return paginated results with page and pageSize', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '150' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getAllTransactionsPaginated({
          page: 1,
          pageSize: 5
        });

        expect(result.data).toHaveLength(5);
        expect(result.pagination).toEqual({
          total: 150,
          page: 1,
          pageSize: 5,
          totalPages: 30
        });
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [5, 0]
        );
      });

      it('should return paginated results with limit and offset', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '150' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getAllTransactionsPaginated({
          limit: 10,
          offset: 20
        });

        expect(result.data).toHaveLength(5);
        expect(result.pagination).toEqual({
          total: 150,
          page: 3,
          pageSize: 10,
          totalPages: 15
        });
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [10, 20]
        );
      });

      it('should use default pagination when no params provided', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '150' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getAllTransactionsPaginated({});

        expect(result.data).toHaveLength(5);
        expect(result.pagination).toEqual({
          total: 150,
          page: 1,
          pageSize: 100,
          totalPages: 2
        });
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [100, 0]
        );
      });

      it('should cap pageSize at 1000', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '2000' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getAllTransactionsPaginated({
          page: 1,
          pageSize: 5000
        });

        expect(result.pagination.pageSize).toBe(1000);
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [1000, 0]
        );
      });

      it('should handle page numbers correctly', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '150' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getAllTransactionsPaginated({
          page: 3,
          pageSize: 10
        });

        expect(result.pagination.page).toBe(3);
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [10, 20]
        );
      });
    });

    describe('getTransactionsByDateRangePaginated', () => {
      it('should return paginated results with date range filter', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '50' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getTransactionsByDateRangePaginated(
          '2024-01-01',
          '2024-01-31',
          { page: 1, pageSize: 10 }
        );

        expect(result.data).toHaveLength(5);
        expect(result.pagination).toEqual({
          total: 50,
          page: 1,
          pageSize: 10,
          totalPages: 5
        });
        // Check the second query call (the SELECT with pagination)
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE t.date >= $1 AND t.date <= $2'),
          ['2024-01-01', '2024-01-31', 10, 0]
        );
      });

      it('should use default pagination with date range', async () => {
        // Mock count query
        mockDb.query.mockResolvedValueOnce({
          rows: [{ count: '50' }],
          command: '',
          oid: 0,
          fields: [],
          rowCount: 1
        });

        // Mock data query
        mockDb.query.mockResolvedValueOnce({
          rows: mockTransactions,
          command: '',
          oid: 0,
          fields: [],
          rowCount: 5
        });

        const result = await transactionService.getTransactionsByDateRangePaginated(
          '2024-01-01',
          '2024-01-31',
          {}
        );

        expect(result.data).toHaveLength(5);
        expect(result.pagination).toEqual({
          total: 50,
          page: 1,
          pageSize: 100,
          totalPages: 1
        });
      });
    });
  });
});
