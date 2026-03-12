import { CompetitionResultService } from './competitionResult.service';
import { DatabaseService } from './database.service';
import { CreateResultDTO, UpdateResultDTO } from '../types';

describe('CompetitionResultService - Unit Tests', () => {
  let service: CompetitionResultService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;
    service = new CompetitionResultService(mockDb);
  });

  describe('addResult', () => {
    it('should add result with valid data', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
        entryPaid: 10.00,
        swindleMoneyPaid: 50,
      };

      const mockResult = {
        id: 1,
        competitionId: dto.competitionId,
        finishingPosition: dto.finishingPosition,
        playerName: dto.playerName,
        grossScore: dto.grossScore,
        handicap: dto.handicap,
        nettScore: dto.nettScore,
        entryPaid: dto.entryPaid,
        swindleMoneyPaid: dto.swindleMoneyPaid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock competition exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock insert result
      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.addResult(dto);

      expect(result).toEqual(mockResult);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM competitions WHERE id = $1',
        [dto.competitionId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO competition_results'),
        [
          dto.competitionId,
          dto.finishingPosition,
          dto.playerName,
          dto.grossScore,
          dto.handicap,
          dto.nettScore,
          dto.entryPaid,
          0, // competition_refund defaults to 0
          dto.swindleMoneyPaid,
        ]
      );
    });

    it('should add result with optional fields as null', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: 2,
        playerName: 'Jane DOE',
      };

      const mockResult = {
        id: 2,
        competitionId: dto.competitionId,
        finishingPosition: dto.finishingPosition,
        playerName: dto.playerName,
        grossScore: null,
        handicap: null,
        nettScore: null,
        entryPaid: false,
        swindleMoneyPaid: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [mockResult],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.addResult(dto);

      expect(result.grossScore).toBeNull();
      expect(result.handicap).toBeNull();
      expect(result.nettScore).toBeNull();
      expect(result.entryPaid).toBe(false);
      expect(result.swindleMoneyPaid).toBe(0);
    });

    it('should fail when missing required field - finishingPosition', async () => {
      const dto = {
        competitionId: 1,
        playerName: 'John SMITH',
      } as CreateResultDTO;

      await expect(service.addResult(dto)).rejects.toThrow(
        'Finishing position is required'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when missing required field - playerName', async () => {
      const dto = {
        competitionId: 1,
        finishingPosition: 1,
        playerName: '',
      } as CreateResultDTO;

      await expect(service.addResult(dto)).rejects.toThrow(
        'Player name is required and cannot be empty'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when playerName is only whitespace', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: 1,
        playerName: '   ',
      };

      await expect(service.addResult(dto)).rejects.toThrow(
        'Player name is required and cannot be empty'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail with invalid position - zero', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: 0,
        playerName: 'John SMITH',
      };

      await expect(service.addResult(dto)).rejects.toThrow(
        'Finishing position is required'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail with invalid position - negative', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: -5,
        playerName: 'John SMITH',
      };

      await expect(service.addResult(dto)).rejects.toThrow(
        'Finishing position must be a positive integer'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when competition does not exist', async () => {
      const dto: CreateResultDTO = {
        competitionId: 999,
        finishingPosition: 1,
        playerName: 'John SMITH',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.addResult(dto)).rejects.toThrow(
        'Competition with id 999 not found'
      );

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should fail with negative swindle money', async () => {
      const dto: CreateResultDTO = {
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        swindleMoneyPaid: -10,
      };

      await expect(service.addResult(dto)).rejects.toThrow(
        'Swindle money paid cannot be negative'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('updateResult', () => {
    it('should update only specified fields', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        nettScore: 75,
        entryPaid: 10.00,
      };

      const mockUpdatedResult = {
        id: resultId,
        competitionId: 1,
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 75,
        entryPaid: 10.00,
        swindleMoneyPaid: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedResult],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await service.updateResult(resultId, updates);

      expect(result).toEqual(mockUpdatedResult);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE competition_results'),
        expect.arrayContaining([75, 10.00, resultId])
      );
    });

    it('should update all fields when provided', async () => {
      const resultId = 2;
      const updates: UpdateResultDTO = {
        finishingPosition: 2,
        playerName: 'Jane DOE',
        grossScore: 90,
        handicap: 15,
        nettScore: 75,
        entryPaid: 10.00,
        swindleMoneyPaid: 30,
      };

      const mockUpdatedResult = {
        id: resultId,
        competitionId: 1,
        ...updates,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedResult],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await service.updateResult(resultId, updates);

      expect(result.finishingPosition).toBe(updates.finishingPosition);
      expect(result.playerName).toBe(updates.playerName);
      expect(result.grossScore).toBe(updates.grossScore);
      expect(result.handicap).toBe(updates.handicap);
      expect(result.nettScore).toBe(updates.nettScore);
      expect(result.entryPaid).toBe(updates.entryPaid);
      expect(result.swindleMoneyPaid).toBe(updates.swindleMoneyPaid);
    });

    it('should fail when no fields provided', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {};

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'No fields to update'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when result does not exist', async () => {
      const resultId = 999;
      const updates: UpdateResultDTO = {
        nettScore: 75,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        `Competition result with id ${resultId} not found`
      );
    });

    it('should fail when updating position to zero', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        finishingPosition: 0,
      };

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'Finishing position must be a positive integer'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when updating position to negative', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        finishingPosition: -3,
      };

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'Finishing position must be a positive integer'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when updating playerName to empty string', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        playerName: '',
      };

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'Player name cannot be empty'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when updating playerName to whitespace', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        playerName: '   ',
      };

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'Player name cannot be empty'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail when updating swindle money to negative', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        swindleMoneyPaid: -20,
      };

      await expect(service.updateResult(resultId, updates)).rejects.toThrow(
        'Swindle money paid cannot be negative'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should include updated_at in update query', async () => {
      const resultId = 1;
      const updates: UpdateResultDTO = {
        nettScore: 72,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: resultId,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 72,
          entryPaid: false,
          swindleMoneyPaid: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await service.updateResult(resultId, updates);

      const queryCall = mockDb.query.mock.calls[0][0];
      expect(queryCall).toContain('updated_at = CURRENT_TIMESTAMP');
    });
  });

  describe('bulkAddResults', () => {
    it('should process all results in transaction', async () => {
      const results: CreateResultDTO[] = [
        {
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
        },
        {
          competitionId: 1,
          finishingPosition: 2,
          playerName: 'Jane DOE',
          grossScore: 88,
          handicap: 14,
          nettScore: 74,
        },
        {
          competitionId: 1,
          finishingPosition: 3,
          playerName: 'Bob JONES',
          grossScore: 90,
          handicap: 15,
          nettScore: 75,
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({
            rows: [],
            rowCount: 1,
            command: 'INSERT',
            oid: 0,
            fields: [],
          }),
        };

        return callback(mockClient as any);
      });

      const response = await service.bulkAddResults(results);

      expect(response.created).toBe(3);
      expect(response.errors).toHaveLength(0);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      const results: CreateResultDTO[] = [
        {
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
        },
        {
          competitionId: 1,
          finishingPosition: 0, // Invalid position
          playerName: 'Jane DOE',
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn(),
        };

        try {
          await callback(mockClient as any);
        } catch (error) {
          // Transaction should rollback on error
          throw error;
        }
      });

      await expect(service.bulkAddResults(results)).rejects.toThrow();
    });

    it('should return errors for invalid results', async () => {
      const results: CreateResultDTO[] = [
        {
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
        },
        {
          competitionId: 1,
          finishingPosition: -1, // Invalid
          playerName: 'Jane DOE',
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn(),
        };

        await callback(mockClient as any);
      });

      await expect(service.bulkAddResults(results)).rejects.toThrow();
    });

    it('should handle empty results array', async () => {
      const results: CreateResultDTO[] = [];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn(),
        };

        return callback(mockClient as any);
      });

      const response = await service.bulkAddResults(results);

      expect(response.created).toBe(0);
      expect(response.errors).toHaveLength(0);
    });

    it('should validate each result before insertion', async () => {
      const results: CreateResultDTO[] = [
        {
          competitionId: 1,
          finishingPosition: 1,
          playerName: '', // Invalid - empty name
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn(),
        };

        await callback(mockClient as any);
      });

      await expect(service.bulkAddResults(results)).rejects.toThrow();
    });

    it('should use transaction for atomicity', async () => {
      const results: CreateResultDTO[] = [
        {
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
        },
      ];

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({
            rows: [],
            rowCount: 1,
            command: 'INSERT',
            oid: 0,
            fields: [],
          }),
        };

        return callback(mockClient as any);
      });

      await service.bulkAddResults(results);

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('getResultsByCompetition', () => {
    it('should return results ordered by position', async () => {
      const competitionId = 1;
      const mockResults = [
        {
          id: 1,
          competitionId,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: 10.00,
          swindleMoneyPaid: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          competitionId,
          finishingPosition: 2,
          playerName: 'Jane DOE',
          grossScore: 88,
          handicap: 14,
          nettScore: 74,
          entryPaid: 10.00,
          swindleMoneyPaid: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          competitionId,
          finishingPosition: 3,
          playerName: 'Bob JONES',
          grossScore: 90,
          handicap: 15,
          nettScore: 75,
          entryPaid: false,
          swindleMoneyPaid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockResults,
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const results = await service.getResultsByCompetition(competitionId);

      expect(results).toEqual(mockResults);
      expect(results).toHaveLength(3);
      expect(results[0].finishingPosition).toBe(1);
      expect(results[1].finishingPosition).toBe(2);
      expect(results[2].finishingPosition).toBe(3);
    });

    it('should verify ORDER BY clause in query', async () => {
      const competitionId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getResultsByCompetition(competitionId);

      const queryCall = mockDb.query.mock.calls[0][0];
      expect(queryCall).toContain('ORDER BY finishing_position ASC');
    });

    it('should return empty array when no results exist', async () => {
      const competitionId = 999;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const results = await service.getResultsByCompetition(competitionId);

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });

    it('should filter by competition ID', async () => {
      const competitionId = 5;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getResultsByCompetition(competitionId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE competition_id = $1'),
        [competitionId]
      );
    });

    it('should handle ties with same finishing position', async () => {
      const competitionId = 1;
      const mockResults = [
        {
          id: 1,
          competitionId,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: 10.00,
          swindleMoneyPaid: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          competitionId,
          finishingPosition: 1,
          playerName: 'Jane DOE',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: 10.00,
          swindleMoneyPaid: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockResults,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const results = await service.getResultsByCompetition(competitionId);

      expect(results).toHaveLength(2);
      expect(results[0].finishingPosition).toBe(1);
      expect(results[1].finishingPosition).toBe(1);
    });
  });

  describe('deleteResult', () => {
    it('should delete result successfully', async () => {
      const resultId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await service.deleteResult(resultId);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM competition_results WHERE id = $1',
        [resultId]
      );
    });

    it('should fail when result does not exist', async () => {
      const resultId = 999;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await expect(service.deleteResult(resultId)).rejects.toThrow(
        `Competition result with id ${resultId} not found`
      );
    });

    it('should verify rowCount for deletion confirmation', async () => {
      const resultId = 5;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await service.deleteResult(resultId);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });
});

