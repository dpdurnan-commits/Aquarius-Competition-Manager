import { PresentationSeasonService } from './presentationSeason.service';
import { DatabaseService } from './database.service';
import { CreateSeasonDTO } from '../types';

describe('PresentationSeasonService - Unit Tests', () => {
  let service: PresentationSeasonService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;
    service = new PresentationSeasonService(mockDb);
  });

  describe('createSeason', () => {
    it('should create season with valid data', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26,
      };

      const mockSeason = {
        id: 1,
        name: dto.name,
        startYear: dto.startYear,
        endYear: dto.endYear,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockSeason],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createSeason(dto);

      expect(result).toEqual(mockSeason);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO presentation_seasons'),
        [dto.name, dto.startYear, dto.endYear]
      );
    });

    it('should reject season with invalid format - missing prefix', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Winter 25-Summer 26',
        startYear: 25,
        endYear: 26,
      };

      await expect(service.createSeason(dto)).rejects.toThrow(
        'Invalid season name format. Expected: "Season: Winter YY-Summer YY"'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should reject season with invalid format - wrong case', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: winter 25-summer 26',
        startYear: 25,
        endYear: 26,
      };

      await expect(service.createSeason(dto)).rejects.toThrow(
        'Invalid season name format'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should reject season with invalid format - four digit years', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: Winter 2025-Summer 2026',
        startYear: 25,
        endYear: 26,
      };

      await expect(service.createSeason(dto)).rejects.toThrow(
        'Invalid season name format'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should reject season with invalid format - extra spaces', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: Winter  25-Summer 26',
        startYear: 25,
        endYear: 26,
      };

      await expect(service.createSeason(dto)).rejects.toThrow(
        'Invalid season name format'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should reject season with start year greater than end year', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: Winter 26-Summer 25',
        startYear: 26,
        endYear: 25,
      };

      await expect(service.createSeason(dto)).rejects.toThrow(
        'Start year must be less than or equal to end year'
      );

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should accept season with equal start and end years', async () => {
      const dto: CreateSeasonDTO = {
        name: 'Season: Winter 25-Summer 25',
        startYear: 25,
        endYear: 25,
      };

      const mockSeason = {
        id: 1,
        name: dto.name,
        startYear: dto.startYear,
        endYear: dto.endYear,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockSeason],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createSeason(dto);

      expect(result).toEqual(mockSeason);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('getAllSeasons', () => {
    it('should return all seasons ordered chronologically', async () => {
      const mockSeasons = [
        {
          id: 1,
          name: 'Season: Winter 23-Summer 24',
          startYear: 23,
          endYear: 24,
          isActive: false,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          id: 2,
          name: 'Season: Winter 24-Summer 25',
          startYear: 24,
          endYear: 25,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 3,
          name: 'Season: Winter 25-Summer 26',
          startYear: 25,
          endYear: 26,
          isActive: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockSeasons,
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getAllSeasons();

      expect(result).toEqual(mockSeasons);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY start_year ASC, end_year ASC'),
        []
      );
    });

    it('should return empty array when no seasons exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getAllSeasons();

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should verify chronological ordering in query', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getAllSeasons();

      const queryCall = mockDb.query.mock.calls[0][0];
      expect(queryCall).toContain('ORDER BY start_year ASC, end_year ASC');
    });
  });

  describe('setActiveSeason', () => {
    it('should set season as active and deactivate others', async () => {
      const seasonId = 2;
      const mockActiveSeason = {
        id: seasonId,
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ id: seasonId }],
              rowCount: 1,
              command: 'SELECT',
              oid: 0,
              fields: [],
            })
            .mockResolvedValueOnce({
              rows: [],
              rowCount: 3,
              command: 'UPDATE',
              oid: 0,
              fields: [],
            })
            .mockResolvedValueOnce({
              rows: [mockActiveSeason],
              rowCount: 1,
              command: 'UPDATE',
              oid: 0,
              fields: [],
            }),
        };

        return callback(mockClient as any);
      });

      const result = await service.setActiveSeason(seasonId);

      expect(result).toEqual(mockActiveSeason);
      expect(result.isActive).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should deactivate previous active season', async () => {
      const seasonId = 3;

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn(),
        };

        // Check season exists
        mockClient.query.mockResolvedValueOnce({
          rows: [{ id: seasonId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

        // Deactivate all seasons
        mockClient.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 3,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        });

        // Activate specified season
        mockClient.query.mockResolvedValueOnce({
          rows: [{
            id: seasonId,
            name: 'Season: Winter 26-Summer 27',
            startYear: 26,
            endYear: 27,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        });

        const result = await callback(mockClient as any);

        // Verify deactivation query was called
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE presentation_seasons SET is_active = false'
        );

        return result;
      });

      await service.setActiveSeason(seasonId);

      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should throw error when season does not exist', async () => {
      const seasonId = 999;

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [],
            rowCount: 0,
            command: 'SELECT',
            oid: 0,
            fields: [],
          }),
        };

        return callback(mockClient as any);
      });

      await expect(service.setActiveSeason(seasonId)).rejects.toThrow(
        `Season with id ${seasonId} not found`
      );
    });

    it('should use transaction for atomicity', async () => {
      const seasonId = 1;

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: seasonId }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
            .mockResolvedValueOnce({ rows: [], rowCount: 2, command: 'UPDATE', oid: 0, fields: [] })
            .mockResolvedValueOnce({
              rows: [{
                id: seasonId,
                name: 'Season: Winter 25-Summer 26',
                startYear: 25,
                endYear: 26,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }],
              rowCount: 1,
              command: 'UPDATE',
              oid: 0,
              fields: [],
            }),
        };

        return callback(mockClient as any);
      });

      await service.setActiveSeason(seasonId);

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('autoIncrementSeason', () => {
    it('should create next season with incremented years', async () => {
      const existingSeason = {
        id: 1,
        name: 'Season: Winter 25-Summer 26',
        startYear: 25,
        endYear: 26,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedNewSeason = {
        id: 2,
        name: 'Season: Winter 26-Summer 27',
        startYear: 26,
        endYear: 27,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock getting most recent season
      mockDb.query.mockResolvedValueOnce({
        rows: [existingSeason],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock creating new season
      mockDb.query.mockResolvedValueOnce({
        rows: [expectedNewSeason],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.autoIncrementSeason();

      expect(result.startYear).toBe(26);
      expect(result.endYear).toBe(27);
      expect(result.name).toBe('Season: Winter 26-Summer 27');
    });

    it('should correctly format single-digit years with leading zeros', async () => {
      const existingSeason = {
        id: 1,
        name: 'Season: Winter 08-Summer 09',
        startYear: 8,
        endYear: 9,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedNewSeason = {
        id: 2,
        name: 'Season: Winter 09-Summer 10',
        startYear: 9,
        endYear: 10,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [existingSeason],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [expectedNewSeason],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.autoIncrementSeason();

      expect(result.name).toBe('Season: Winter 09-Summer 10');
      expect(result.startYear).toBe(9);
      expect(result.endYear).toBe(10);
    });

    it('should throw error when no existing seasons found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.autoIncrementSeason()).rejects.toThrow(
        'No existing seasons found to auto-increment from'
      );

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should query for most recent season by year ordering', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.autoIncrementSeason()).rejects.toThrow();

      const queryCall = mockDb.query.mock.calls[0][0];
      expect(queryCall).toContain('ORDER BY start_year DESC, end_year DESC');
      expect(queryCall).toContain('LIMIT 1');
    });

    it('should preserve year difference when incrementing', async () => {
      const existingSeason = {
        id: 1,
        name: 'Season: Winter 20-Summer 22',
        startYear: 20,
        endYear: 22,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedNewSeason = {
        id: 2,
        name: 'Season: Winter 21-Summer 23',
        startYear: 21,
        endYear: 23,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [existingSeason],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [expectedNewSeason],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.autoIncrementSeason();

      const originalDiff = existingSeason.endYear - existingSeason.startYear;
      const newDiff = result.endYear - result.startYear;

      expect(newDiff).toBe(originalDiff);
    });
  });

  describe('deleteSeason', () => {
    it('should delete season when no competitions exist', async () => {
      const seasonId = 1;

      // Mock competition check - no competitions
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock delete operation
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await service.deleteSeason(seasonId);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM competitions WHERE season_id = $1',
        [seasonId]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM presentation_seasons WHERE id = $1 RETURNING id',
        [seasonId]
      );
    });

    it('should fail when competitions are associated with season', async () => {
      const seasonId = 1;

      // Mock competition check - 3 competitions exist
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.deleteSeason(seasonId)).rejects.toThrow(
        'Cannot delete season: 3 competition(s) are associated with this season'
      );

      // Should not attempt delete
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should fail when season does not exist', async () => {
      const seasonId = 999;

      // Mock competition check - no competitions
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock delete operation - no rows returned
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await expect(service.deleteSeason(seasonId)).rejects.toThrow(
        `Season with id ${seasonId} not found`
      );
    });

    it('should check referential integrity before deletion', async () => {
      const seasonId = 5;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.deleteSeason(seasonId)).rejects.toThrow(
        'Cannot delete season: 10 competition(s) are associated with this season'
      );

      // Verify referential integrity check was performed
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM competitions WHERE season_id = $1',
        [seasonId]
      );
    });

    it('should handle count as string and parse correctly', async () => {
      const seasonId = 2;

      // Mock returns count as string (typical for PostgreSQL COUNT)
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.deleteSeason(seasonId)).rejects.toThrow(
        'Cannot delete season: 5 competition(s) are associated with this season'
      );
    });
  });
});
