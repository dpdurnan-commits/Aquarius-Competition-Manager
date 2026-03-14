import { NameMatchingService } from './nameMatching.service';
import { DatabaseService } from './database.service';
import { CompetitionResult } from '../types';

describe('NameMatchingService - Unit Tests', () => {
  let service: NameMatchingService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new NameMatchingService(mockDb);
  });

  describe('findMatchingResult', () => {
    it('should find exact name match (case-insensitive)', async () => {
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

      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('john smith');

      expect(result).toEqual(mockResult);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPPER(cr.player_name) = $1'),
        ['JOHN SMITH']
      );
    });

    it('should find initial + surname match', async () => {
      const mockResult: CompetitionResult = {
        id: 2,
        competitionId: 1,
        finishingPosition: 2,
        playerName: 'Alastair REID',
        grossScore: 88,
        handicap: 15,
        nettScore: 73,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      // First query returns no exact match
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Second query returns all results for variation matching
      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('A. REID');

      expect(result).toEqual(mockResult);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when no match found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('Unknown Player');

      expect(result).toBeNull();
    });

    it('should select most recent unpaid result when multiple matches exist', async () => {
      const olderResult: CompetitionResult = {
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
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
      };

      const newerResult: CompetitionResult = {
        id: 5,
        competitionId: 2,
        finishingPosition: 2,
        playerName: 'John SMITH',
        grossScore: 88,
        handicap: 12,
        nettScore: 76,
        entryPaid: 1,
        competitionRefund: 0,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [newerResult, olderResult],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('John SMITH');

      expect(result).toEqual(newerResult);
      expect(result?.id).toBe(5);
    });

    it('should handle whitespace normalization', async () => {
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

      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('  John   SMITH  ');

      expect(result).toEqual(mockResult);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['JOHN SMITH']
      );
    });

    it('should handle case normalization', async () => {
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

      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.findMatchingResult('jOhN sMiTh');

      expect(result).toEqual(mockResult);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['JOHN SMITH']
      );
    });
  });

  describe('normalizeName', () => {
    it('should convert to uppercase', () => {
      expect(service.normalizeName('john smith')).toBe('JOHN SMITH');
    });

    it('should trim whitespace', () => {
      expect(service.normalizeName('  John SMITH  ')).toBe('JOHN SMITH');
    });

    it('should replace multiple spaces with single space', () => {
      expect(service.normalizeName('John   SMITH')).toBe('JOHN SMITH');
    });

    it('should handle mixed case and whitespace', () => {
      expect(service.normalizeName('  jOhN   sMiTh  ')).toBe('JOHN SMITH');
    });

    it('should handle tabs and newlines', () => {
      expect(service.normalizeName('John\t\nSMITH')).toBe('JOHN SMITH');
    });
  });

  describe('matchesVariation', () => {
    it('should match exact names (case-insensitive)', () => {
      expect(service.matchesVariation('John SMITH', 'john smith')).toBe(true);
    });

    it('should match initial + surname variation', () => {
      expect(service.matchesVariation('A. REID', 'Alastair REID')).toBe(true);
      expect(service.matchesVariation('Alastair REID', 'A. REID')).toBe(true);
    });

    it('should match with whitespace differences', () => {
      expect(service.matchesVariation('  John  SMITH  ', 'John SMITH')).toBe(true);
    });

    it('should not match different names', () => {
      expect(service.matchesVariation('John SMITH', 'Jane DOE')).toBe(false);
    });

    it('should not match wrong initial', () => {
      expect(service.matchesVariation('B. REID', 'Alastair REID')).toBe(false);
    });

    it('should not match different surnames', () => {
      expect(service.matchesVariation('A. REID', 'Alastair SMITH')).toBe(false);
    });
  });

  describe('findMostRecentUnpaid', () => {
    it('should return most recent unpaid result', () => {
      const results: CompetitionResult[] = [
        {
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
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
        {
          id: 5,
          competitionId: 2,
          finishingPosition: 2,
          playerName: 'John SMITH',
          grossScore: 88,
          handicap: 12,
          nettScore: 76,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 0,
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
        },
      ];

      const result = service.findMostRecentUnpaid(results);

      expect(result?.id).toBe(5);
    });

    it('should skip paid results (swindleMoneyPaid > 0)', () => {
      const results: CompetitionResult[] = [
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
          swindleMoneyPaid: 50,
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
        },
        {
          id: 1,
          competitionId: 1,
          finishingPosition: 2,
          playerName: 'John SMITH',
          grossScore: 88,
          handicap: 12,
          nettScore: 76,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 0,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      const result = service.findMostRecentUnpaid(results);

      expect(result?.id).toBe(1);
    });

    it('should treat swindleMoneyPaid = 0 as unpaid', () => {
      const results: CompetitionResult[] = [
        {
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
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      const result = service.findMostRecentUnpaid(results);

      expect(result?.id).toBe(1);
    });

    it('should return null when all results are paid', () => {
      const results: CompetitionResult[] = [
        {
          id: 1,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 50,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
        {
          id: 2,
          competitionId: 2,
          finishingPosition: 2,
          playerName: 'John SMITH',
          grossScore: 88,
          handicap: 12,
          nettScore: 76,
          entryPaid: 1,
          competitionRefund: 0,
          swindleMoneyPaid: 30,
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
        },
      ];

      const result = service.findMostRecentUnpaid(results);

      expect(result).toBeNull();
    });

    it('should return null for empty results array', () => {
      const results: CompetitionResult[] = [];

      const result = service.findMostRecentUnpaid(results);

      expect(result).toBeNull();
    });
  });
});
