import { SummaryService } from './summary.service';
import { DatabaseService } from './database.service';
import { TransactionRecord } from '../types';

jest.mock('./database.service');

describe('SummaryService - Unit Tests', () => {
  let summaryService: SummaryService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = new DatabaseService('mock-connection-string') as jest.Mocked<DatabaseService>;
    summaryService = new SummaryService(mockDb);
  });

  describe('Empty Database', () => {
    it('should return empty array when no transactions exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 0
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toEqual([]);
    });

    it('should return empty array when date range has no transactions', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 0
      });

      const result = await summaryService.calculateWeeklySummaries('2024-01-01', '2024-01-07');

      expect(result).toEqual([]);
    });
  });

  describe('Weekly Period Boundary Calculations', () => {
    it('should calculate correct Monday-Sunday boundaries for single week', async () => {
      // Transaction on Wednesday 2024-01-03
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '03/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      // Week should start on Monday 2024-01-01 and end on Sunday 2024-01-07
      expect(result[0].fromDate).toBe('2024-01-01');
      expect(result[0].toDate).toBe('2024-01-07');
    });

    it('should calculate correct boundaries when transaction is on Monday', async () => {
      // Transaction on Monday 2024-01-01
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '00:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      expect(result[0].fromDate).toBe('2024-01-01');
      expect(result[0].toDate).toBe('2024-01-07');
    });

    it('should calculate correct boundaries when transaction is on Sunday', async () => {
      // Transaction on Sunday 2024-01-07
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '07/01/2024',
          time: '23:59:59',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      expect(result[0].fromDate).toBe('2024-01-01');
      expect(result[0].toDate).toBe('2024-01-07');
    });

    it('should generate multiple weeks when transactions span multiple weeks', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024', // Monday of week 1
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
          date: '15/01/2024', // Monday of week 3
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      // Should generate 3 weeks: Jan 1-7, Jan 8-14, Jan 15-21
      expect(result).toHaveLength(3);
      expect(result[0].fromDate).toBe('2024-01-01');
      expect(result[0].toDate).toBe('2024-01-07');
      expect(result[1].fromDate).toBe('2024-01-08');
      expect(result[1].toDate).toBe('2024-01-14');
      expect(result[2].fromDate).toBe('2024-01-15');
      expect(result[2].toDate).toBe('2024-01-21');
    });

    it('should include weeks with zero transactions between weeks with data', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
          date: '15/01/2024', // Week 3 (skip week 2)
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(3);
      
      // Week 1 should have transactions
      expect(result[0].competitionEntries).toBe(5.00);
      
      // Week 2 should have zero transactions but still exist
      expect(result[1].competitionEntries).toBe(0);
      expect(result[1].purseApplicationTopUp).toBe(0);
      expect(result[1].purseTillTopUp).toBe(0);
      expect(result[1].competitionRefunds).toBe(0);
      
      // Week 3 should have transactions
      expect(result[2].competitionEntries).toBe(10.00);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter transactions by date range', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '05/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
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
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await summaryService.calculateWeeklySummaries('2024-01-01', '2024-01-07');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.date >= $1 AND t.date <= $2'),
        ['2024-01-01', '2024-01-07']
      );
      expect(result).toHaveLength(1);
    });

    it('should call getAllTransactions when no date range provided', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        fields: [],
        rowCount: 0
      });

      await summaryService.calculateWeeklySummaries();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
    });
  });

  describe('Refund Handling as Negative Values', () => {
    it('should handle refunds as negative values in Competition Purse calculation', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '0.00',
          total: '10.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Refund',
          member: '',
          player: '',
          competition: '',
          price: '-5.00',
          discount: '0.00',
          subtotal: '-5.00',
          vat: '0.00',
          total: '-5.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      expect(result[0].competitionEntries).toBe(10.00);
      expect(result[0].competitionRefunds).toBe(-5.00);
      
      // Formula: Starting + AppTopUp + TillTopUp - Entries - Refunds
      // 0 + 0 + 0 - 10.00 - (-5.00) = -5.00
      expect(result[0].finalPurse).toBe(-5.00);
    });

    it('should handle refunds as negative values in Competition Pot calculation', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '0.00',
          total: '10.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Refund',
          member: '',
          player: '',
          competition: '',
          price: '-5.00',
          discount: '0.00',
          subtotal: '-5.00',
          vat: '0.00',
          total: '-5.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      
      // Formula: Starting + Entries + Refunds - Winnings - Costs
      // 0 + 10.00 + (-5.00) - 0 - 0 = 5.00
      expect(result[0].finalPot).toBe(5.00);
    });

    it('should correctly accumulate refunds across multiple transactions', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Refund',
          member: '',
          player: '',
          competition: '',
          price: '-3.00',
          discount: '0.00',
          subtotal: '-3.00',
          vat: '0.00',
          total: '-3.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Refund',
          member: '',
          player: '',
          competition: '',
          price: '-7.00',
          discount: '0.00',
          subtotal: '-7.00',
          vat: '0.00',
          total: '-7.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      expect(result[0].competitionRefunds).toBe(-10.00);
    });
  });

  describe('Competition Purse Calculation', () => {
    it('should calculate purse components correctly', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: '',
          player: '',
          competition: '',
          price: '100.00',
          discount: '0.00',
          subtotal: '100.00',
          vat: '0.00',
          total: '100.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '02/01/2024',
          time: '11:00:00',
          till: 'Till 1',
          type: 'Topup (Competitions)',
          member: '',
          player: '',
          competition: '',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '0.00',
          total: '50.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          id: 3,
          date: '03/01/2024',
          time: '12:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '0.00',
          total: '5.00',
          sourceRowIndex: 3,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 3
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      expect(result[0].purseApplicationTopUp).toBe(100.00);
      expect(result[0].purseTillTopUp).toBe(50.00);
      expect(result[0].competitionEntries).toBe(5.00);
      
      // Formula: Starting + AppTopUp + TillTopUp - Entries - Refunds
      // 0 + 100 + 50 - 5 - 0 = 145
      expect(result[0].finalPurse).toBe(145.00);
    });

    it('should carry forward purse balance to next week', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: '',
          player: '',
          competition: '',
          price: '100.00',
          discount: '0.00',
          subtotal: '100.00',
          vat: '0.00',
          total: '100.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '08/01/2024', // Week 2
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '0.00',
          total: '5.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(2);
      
      // Week 1: 0 + 100 - 0 - 0 = 100
      expect(result[0].startingPurse).toBe(0);
      expect(result[0].finalPurse).toBe(100.00);
      
      // Week 2: 100 + 0 - 5 - 0 = 95
      expect(result[1].startingPurse).toBe(100.00);
      expect(result[1].finalPurse).toBe(95.00);
    });
  });

  describe('Competition Pot Calculation', () => {
    it('should calculate pot components correctly', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024',
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '10.00',
          discount: '0.00',
          subtotal: '10.00',
          vat: '0.00',
          total: '10.00',
          sourceRowIndex: 1,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 1
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(1);
      
      // Formula: Starting + Entries + Refunds - Winnings - Costs
      // 0 + 10 + 0 - 0 - 0 = 10
      expect(result[0].finalPot).toBe(10.00);
      expect(result[0].winningsPaid).toBe(0); // Not yet implemented
      expect(result[0].competitionCosts).toBe(0); // Placeholder
    });

    it('should carry forward pot balance to next week', async () => {
      const records: TransactionRecord[] = [
        {
          id: 1,
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '20.00',
          discount: '0.00',
          subtotal: '20.00',
          vat: '0.00',
          total: '20.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          id: 2,
          date: '08/01/2024', // Week 2
          time: '10:00:00',
          till: 'Till 1',
          type: 'Sale',
          member: '',
          player: '',
          competition: '',
          price: '15.00',
          discount: '0.00',
          subtotal: '15.00',
          vat: '0.00',
          total: '15.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: records,
        command: '',
        oid: 0,
        fields: [],
        rowCount: 2
      });

      const result = await summaryService.calculateWeeklySummaries();

      expect(result).toHaveLength(2);
      
      // Week 1: 0 + 20 + 0 - 0 - 0 = 20
      expect(result[0].startingPot).toBe(0);
      expect(result[0].finalPot).toBe(20.00);
      
      // Week 2: 20 + 15 + 0 - 0 - 0 = 35
      expect(result[1].startingPot).toBe(20.00);
      expect(result[1].finalPot).toBe(35.00);
    });
  });
});
