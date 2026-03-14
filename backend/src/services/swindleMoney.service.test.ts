import { SwindleMoneyService } from './swindleMoney.service';
import { DatabaseService } from './database.service';
import { NameMatchingService } from './nameMatching.service';
import { CompetitionResult } from '../types';

describe('SwindleMoneyService - Unit Tests', () => {
  let service: SwindleMoneyService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockNameMatchingService: jest.Mocked<NameMatchingService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    service = new SwindleMoneyService(mockDb);

    // Mock the NameMatchingService instance
    mockNameMatchingService = {
      findMatchingResult: jest.fn(),
      normalizeName: jest.fn(),
      matchesVariation: jest.fn(),
      findMostRecentUnpaid: jest.fn(),
    } as any;

    // Replace the service's nameMatchingService with our mock
    (service as any).nameMatchingService = mockNameMatchingService;
  });

  describe('populateSwindleMoney', () => {
    it('should update result when match is found', async () => {
      const mockResult: CompetitionResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(mockResult);

      // Mock the transaction to execute the callback
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 1 }),
        };
        return await callback(mockClient);
      });

      const result = await service.populateSwindleMoney('John SMITH', 50);

      expect(result.success).toBe(true);
      expect(result.resultId).toBe(1);
      expect(result.message).toContain('Successfully populated swindle money');
      expect(result.message).toContain('50');
      expect(result.message).toContain('John SMITH');
      expect(mockNameMatchingService.findMatchingResult).toHaveBeenCalledWith('John SMITH');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should return warning when no match is found', async () => {
      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(null);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.populateSwindleMoney('Unknown Player', 50);

      expect(result.success).toBe(true);
      expect(result.resultId).toBeNull();
      expect(result.message).toContain('Warning');
      expect(result.message).toContain('No matching unpaid result found');
      expect(result.message).toContain('Unknown Player');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No matching unpaid competition result found for player: Unknown Player')
      );
      expect(mockDb.transaction).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should persist amount to database', async () => {
      const mockResult: CompetitionResult = {
        id: 5,
        competitionId: 2,
        finishingPosition: 1,
        playerName: 'Jane DOE',
        grossScore: 88,
        handicap: 15,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      };

      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(mockResult);

      let capturedQuery: string | undefined;
      let capturedParams: any[] | undefined;

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockImplementation((query: string, params: any[]) => {
            capturedQuery = query;
            capturedParams = params;
            return Promise.resolve({ rows: [], rowCount: 1 });
          }),
        };
        return await callback(mockClient);
      });

      const amount = 75.50;
      await service.populateSwindleMoney('Jane DOE', amount);

      expect(capturedQuery).toContain('UPDATE competition_results');
      expect(capturedQuery).toContain('SET swindle_money_paid = $1');
      expect(capturedQuery).toContain('WHERE id = $2');
      expect(capturedParams).toEqual([amount, mockResult.id]);
    });

    it('should select most recent unpaid result', async () => {
      const mockResult: CompetitionResult = {
        id: 10,
        competitionId: 5,
        finishingPosition: 1,
        playerName: 'Bob JONES',
        grossScore: 82,
        handicap: 10,
        nettScore: 72,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      // The NameMatchingService is responsible for finding the most recent unpaid result
      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(mockResult);

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 1 }),
        };
        return await callback(mockClient);
      });

      const result = await service.populateSwindleMoney('Bob JONES', 100);

      expect(result.success).toBe(true);
      expect(result.resultId).toBe(10);
      expect(mockNameMatchingService.findMatchingResult).toHaveBeenCalledWith('Bob JONES');
    });

    it('should reject negative amounts', async () => {
      const result = await service.populateSwindleMoney('John SMITH', -50);

      expect(result.success).toBe(false);
      expect(result.resultId).toBeNull();
      expect(result.message).toBe('Amount cannot be negative');
      expect(mockNameMatchingService.findMatchingResult).not.toHaveBeenCalled();
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockResult: CompetitionResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(mockResult);

      const dbError = new Error('Database connection failed');
      mockDb.transaction.mockRejectedValueOnce(dbError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.populateSwindleMoney('John SMITH', 50);

      expect(result.success).toBe(false);
      expect(result.resultId).toBeNull();
      expect(result.message).toContain('Error: Database connection failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error populating swindle money:',
        dbError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should accept zero amount', async () => {
      const mockResult: CompetitionResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      mockNameMatchingService.findMatchingResult.mockResolvedValueOnce(mockResult);

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 1 }),
        };
        return await callback(mockClient);
      });

      const result = await service.populateSwindleMoney('John SMITH', 0);

      expect(result.success).toBe(true);
      expect(result.resultId).toBe(1);
    });
  });

  describe('populateSwindleMoneyBatch', () => {
    it('should process multiple entries', async () => {
      const mockResult1: CompetitionResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const mockResult2: CompetitionResult = {
        id: 2,
        competitionId: 1,
        finishingPosition: 2,
        playerName: 'Jane DOE',
        grossScore: 88,
        handicap: 15,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      mockNameMatchingService.findMatchingResult
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        };
        return await callback(mockClient);
      });

      const entries = [
        { playerName: 'John SMITH', amount: 50 },
        { playerName: 'Jane DOE', amount: 30 },
      ];

      const results = await service.populateSwindleMoneyBatch(entries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].resultId).toBe(1);
      expect(results[1].success).toBe(true);
      expect(results[1].resultId).toBe(2);
    });

    it('should handle mixed success and failure', async () => {
      const mockResult: CompetitionResult = {
        id: 1,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      mockNameMatchingService.findMatchingResult
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce(null);

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        };
        return await callback(mockClient);
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const entries = [
        { playerName: 'John SMITH', amount: 50 },
        { playerName: 'Unknown Player', amount: 30 },
      ];

      const results = await service.populateSwindleMoneyBatch(entries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].resultId).toBe(1);
      expect(results[1].success).toBe(true);
      expect(results[1].resultId).toBeNull();
      expect(results[1].message).toContain('Warning');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getUnpaidResultsForPlayer', () => {
    it('should return unpaid results for a player', async () => {
      const mockResults: CompetitionResult[] = [
        {
          id: 5,
          competitionId: 2,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 0,
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
        },
        {
          id: 1,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 82,
          handicap: 12,
          nettScore: 70,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 0,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      mockNameMatchingService.normalizeName.mockReturnValue('JOHN SMITH');
      mockDb.query.mockResolvedValueOnce({
        rows: mockResults,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const results = await service.getUnpaidResultsForPlayer('John SMITH');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(5);
      expect(results[1].id).toBe(1);
      expect(mockNameMatchingService.normalizeName).toHaveBeenCalledWith('John SMITH');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE UPPER(cr.player_name) = $1'),
        ['JOHN SMITH']
      );
    });

    it('should return empty array when no unpaid results exist', async () => {
      mockNameMatchingService.normalizeName.mockReturnValue('UNKNOWN PLAYER');
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const results = await service.getUnpaidResultsForPlayer('Unknown Player');

      expect(results).toHaveLength(0);
    });

    it('should filter out paid results', async () => {
      mockNameMatchingService.normalizeName.mockReturnValue('JOHN SMITH');
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getUnpaidResultsForPlayer('John SMITH');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('swindle_money_paid IS NULL OR cr.swindle_money_paid = 0'),
        ['JOHN SMITH']
      );
    });

    it('should order results by competition date descending', async () => {
      mockNameMatchingService.normalizeName.mockReturnValue('JOHN SMITH');
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getUnpaidResultsForPlayer('John SMITH');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c.date DESC, cr.id DESC'),
        ['JOHN SMITH']
      );
    });
  });
});
