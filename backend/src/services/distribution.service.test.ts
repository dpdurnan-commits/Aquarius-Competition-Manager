import { DistributionService } from './distribution.service';
import { DatabaseService } from './database.service';
import { CreateDistributionDTO } from '../types';

describe('DistributionService - Unit Tests', () => {
  let service: DistributionService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;
    service = new DistributionService(mockDb);
  });

  describe('getSeasonWinners', () => {
    it('should return winners for a season with singles and doubles competitions', async () => {
      const seasonId = 1;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competitions query
      const mockCompetitions = [
        { id: 1, name: 'Spring Singles', date: '2024-03-15', type: 'singles' },
        { id: 2, name: 'Summer Doubles', date: '2024-06-20', type: 'doubles' },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockCompetitions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock results for first competition (singles - 1 winner)
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 101, playerName: 'John Smith', finishingPosition: 1 }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock results for second competition (doubles - 2 winners)
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 201, playerName: 'Alice Johnson', finishingPosition: 1 },
          { id: 202, playerName: 'Bob Williams', finishingPosition: 1 }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getSeasonWinners(seasonId);

      expect(result).toHaveLength(2);
      
      // Verify singles competition
      expect(result[0]).toEqual({
        competitionId: 1,
        competitionName: 'Spring Singles',
        competitionDate: '2024-03-15',
        competitionType: 'singles',
        winners: [
          { resultId: 101, playerName: 'John Smith', finishingPosition: 1 }
        ]
      });

      // Verify doubles competition
      expect(result[1]).toEqual({
        competitionId: 2,
        competitionName: 'Summer Doubles',
        competitionDate: '2024-06-20',
        competitionType: 'doubles',
        winners: [
          { resultId: 201, playerName: 'Alice Johnson', finishingPosition: 1 },
          { resultId: 202, playerName: 'Bob Williams', finishingPosition: 1 }
        ]
      });
    });

    it('should return empty winners array for competitions without position 1 results', async () => {
      const seasonId = 2;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competitions query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 3, name: 'Autumn Singles', date: '2024-09-10', type: 'singles' }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock no results for competition
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getSeasonWinners(seasonId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        competitionId: 3,
        competitionName: 'Autumn Singles',
        competitionDate: '2024-09-10',
        competitionType: 'singles',
        winners: []
      });
    });

    it('should return empty array for season with no competitions', async () => {
      const seasonId = 3;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock no competitions
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getSeasonWinners(seasonId);

      expect(result).toEqual([]);
    });

    it('should throw error when season does not exist', async () => {
      const seasonId = 999;

      // Mock season not found
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.getSeasonWinners(seasonId)).rejects.toThrow(
        `Season ${seasonId} not found`
      );

      // Should not query competitions
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should order competitions by date ascending', async () => {
      const seasonId = 4;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competitions query
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getSeasonWinners(seasonId);

      const competitionsQuery = mockDb.query.mock.calls[1][0];
      expect(competitionsQuery).toContain('ORDER BY date ASC');
    });

    it('should query only position 1 results for each competition', async () => {
      const seasonId = 5;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competitions query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 10, name: 'Test Competition', date: '2024-01-01', type: 'singles' }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock results query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 100, playerName: 'Winner Name', finishingPosition: 1 }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getSeasonWinners(seasonId);

      const resultsQuery = mockDb.query.mock.calls[2][0];
      expect(resultsQuery).toContain('finishing_position = 1');
      expect(mockDb.query.mock.calls[2][1]).toEqual([10]);
    });

    it('should handle multiple competitions with mixed winner scenarios', async () => {
      const seasonId = 6;

      // Mock season exists check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: seasonId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competitions query - 3 competitions
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Comp 1', date: '2024-01-01', type: 'singles' },
          { id: 2, name: 'Comp 2', date: '2024-02-01', type: 'doubles' },
          { id: 3, name: 'Comp 3', date: '2024-03-01', type: 'singles' }
        ],
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Comp 1: Has winner
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, playerName: 'Player A', finishingPosition: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Comp 2: No winner
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Comp 3: Has winner
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 3, playerName: 'Player B', finishingPosition: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getSeasonWinners(seasonId);

      expect(result).toHaveLength(3);
      expect(result[0].winners).toHaveLength(1);
      expect(result[1].winners).toHaveLength(0);
      expect(result[2].winners).toHaveLength(1);
    });
  });

  describe('createDistribution', () => {
    it('should prevent duplicate distribution for the same season', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 100 },
          { competitionId: 2, amount: 150 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      // Mock transaction wrapper
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock existing distribution found
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createDistribution(dto)).rejects.toThrow(
        'Distribution already exists for this season'
      );

      // Should only check for existing distribution, not proceed further
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM presentation_night_distributions'),
        [dto.seasonId]
      );
    });

    it('should throw error for invalid season ID', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 999,
        assignments: [
          { competitionId: 1, amount: 100 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing distribution
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competition validation - competition not found in season
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createDistribution(dto)).rejects.toThrow(
        'Competition 1 not in season 999'
      );
    });

    it('should throw error when competition belongs to different season', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 100 },
          { competitionId: 2, amount: 150 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing distribution
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock first competition validation - success
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock second competition validation - failure (different season)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createDistribution(dto)).rejects.toThrow(
        'Competition 2 not in season 1'
      );

      // Should have checked existing distribution and both competitions
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should rollback transaction on failure', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 100 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockClient as any);
        } catch (error) {
          // Simulate transaction rollback behavior
          throw error;
        }
      });

      // Mock no existing distribution
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competition validation - success
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction creation - simulate database error
      mockClient.query.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(service.createDistribution(dto)).rejects.toThrow(
        'Database connection lost'
      );

      // Verify transaction was attempted
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should successfully create distribution with valid data', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 100 },
          { competitionId: 2, amount: 150 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing distribution
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competition validations - both succeed
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 2 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 100 }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock distribution creation
      const mockDistribution = {
        id: 1,
        seasonId: 1,
        transactionId: 100,
        totalAmount: 250,
        transactionDate: '2024-03-15',
        isVoided: false,
        voidedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockDistribution],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock assignment creations
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createDistribution(dto);

      expect(result).toEqual(mockDistribution);
      
      // Verify all database operations were called
      expect(mockClient.query).toHaveBeenCalledTimes(7);
      
      // Verify transaction was created with correct total
      const transactionCall = mockClient.query.mock.calls[3];
      expect(transactionCall[0]).toContain('INSERT INTO transactions');
      expect(transactionCall[1]).toContain('250.00'); // Total amount
      expect(transactionCall[1]).toContain('2024-03-15'); // Transaction date
      expect(transactionCall[1]).toContain('Presentation Night Winnings'); // Type
    });

    it('should calculate total amount correctly from assignments', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 50.50 },
          { competitionId: 2, amount: 75.25 },
          { competitionId: 3, amount: 100.00 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing distribution
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock competition validations
      for (let i = 0; i < 3; i++) {
        mockClient.query.mockResolvedValueOnce({
          rows: [{ id: i + 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });
      }

      // Mock transaction creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 100 }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock distribution creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          seasonId: 1,
          transactionId: 100,
          totalAmount: 225.75,
          transactionDate: '2024-03-15',
          isVoided: false,
          voidedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock assignment creations
      for (let i = 0; i < 3; i++) {
        mockClient.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        });
      }

      await service.createDistribution(dto);

      // Verify transaction was created with correct total (50.50 + 75.25 + 100.00 = 225.75)
      const transactionCall = mockClient.query.mock.calls[4];
      expect(transactionCall[1]).toContain('225.75');
    });

    it('should create assignment records for each competition', async () => {
      const dto: CreateDistributionDTO = {
        seasonId: 1,
        assignments: [
          { competitionId: 1, amount: 100 },
          { competitionId: 2, amount: 150 }
        ],
        transactionDate: '2024-03-15'
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Setup all mocks for successful creation
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100 }], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          seasonId: 1,
          transactionId: 100,
          totalAmount: 250,
          transactionDate: '2024-03-15',
          isVoided: false,
          voidedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      await service.createDistribution(dto);

      // Verify assignment inserts
      const assignment1Call = mockClient.query.mock.calls[5];
      expect(assignment1Call[0]).toContain('INSERT INTO distribution_assignments');
      expect(assignment1Call[1]).toEqual([1, 1, 100]);

      const assignment2Call = mockClient.query.mock.calls[6];
      expect(assignment2Call[0]).toContain('INSERT INTO distribution_assignments');
      expect(assignment2Call[1]).toEqual([1, 2, 150]);
    });
  });

  describe('getDistributionBySeason', () => {
    it('should return null when no distribution exists for season', async () => {
      const seasonId = 1;

      // Mock no distribution found
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getDistributionBySeason(seasonId);

      expect(result).toBeNull();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM presentation_night_distributions'),
        [seasonId]
      );
    });

    it('should return distribution with assignments when distribution exists', async () => {
      const seasonId = 1;
      const mockDistribution = {
        id: 10,
        seasonId: 1,
        transactionId: 100,
        totalAmount: 250,
        transactionDate: '2024-03-15',
        isVoided: false,
        voidedAt: null,
        createdAt: new Date('2024-03-15T10:00:00Z'),
        updatedAt: new Date('2024-03-15T10:00:00Z')
      };

      const mockAssignments = [
        {
          id: 1,
          distributionId: 10,
          competitionId: 1,
          amount: 100,
          createdAt: new Date('2024-03-15T10:00:00Z'),
          updatedAt: new Date('2024-03-15T10:00:00Z')
        },
        {
          id: 2,
          distributionId: 10,
          competitionId: 2,
          amount: 150,
          createdAt: new Date('2024-03-15T10:00:00Z'),
          updatedAt: new Date('2024-03-15T10:00:00Z')
        }
      ];

      // Mock distribution query
      mockDb.query.mockResolvedValueOnce({
        rows: [mockDistribution],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock assignments query
      mockDb.query.mockResolvedValueOnce({
        rows: mockAssignments,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getDistributionBySeason(seasonId);

      expect(result).toEqual({
        ...mockDistribution,
        assignments: mockAssignments
      });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      
      // Verify distribution query
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM presentation_night_distributions'),
        [seasonId]
      );

      // Verify assignments query
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM distribution_assignments'),
        [mockDistribution.id]
      );
    });

    it('should only return non-voided distributions', async () => {
      const seasonId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await service.getDistributionBySeason(seasonId);

      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('is_voided = false');
    });

    it('should order assignments by id ascending', async () => {
      const seasonId = 1;
      const mockDistribution = {
        id: 10,
        seasonId: 1,
        transactionId: 100,
        totalAmount: 250,
        transactionDate: '2024-03-15',
        isVoided: false,
        voidedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockDistribution],
        rowCount: 1,
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

      await service.getDistributionBySeason(seasonId);

      const assignmentsQuery = mockDb.query.mock.calls[1][0];
      expect(assignmentsQuery).toContain('ORDER BY id ASC');
    });

    it('should return distribution with empty assignments array when no assignments exist', async () => {
      const seasonId = 1;
      const mockDistribution = {
        id: 10,
        seasonId: 1,
        transactionId: 100,
        totalAmount: 0,
        transactionDate: '2024-03-15',
        isVoided: false,
        voidedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockDistribution],
        rowCount: 1,
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

      const result = await service.getDistributionBySeason(seasonId);

      expect(result).toEqual({
        ...mockDistribution,
        assignments: []
      });
    });
  });

  describe('voidDistribution', () => {
    it('should successfully void a non-voided distribution', async () => {
      const distributionId = 10;

      // Mock distribution exists and is not voided
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: distributionId, isVoided: false }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock update query
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await service.voidDistribution(distributionId);

      expect(mockDb.query).toHaveBeenCalledTimes(2);

      // Verify SELECT query
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT id, is_voided'),
        [distributionId]
      );

      // Verify UPDATE query
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE presentation_night_distributions'),
        [distributionId]
      );

      const updateQuery = mockDb.query.mock.calls[1][0];
      expect(updateQuery).toContain('is_voided = true');
      expect(updateQuery).toContain('voided_at = CURRENT_TIMESTAMP');
      expect(updateQuery).toContain('updated_at = CURRENT_TIMESTAMP');
    });

    it('should throw error when distribution does not exist', async () => {
      const distributionId = 999;

      // Mock distribution not found
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.voidDistribution(distributionId)).rejects.toThrow(
        `Distribution ${distributionId} not found`
      );

      // Should only check for existence, not proceed to update
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when distribution is already voided', async () => {
      const distributionId = 10;

      // Mock distribution exists but is already voided
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: distributionId, isVoided: true }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.voidDistribution(distributionId)).rejects.toThrow(
        `Distribution ${distributionId} is already voided`
      );

      // Should only check for existence, not proceed to update
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should not void distribution if already voided', async () => {
      const distributionId = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: distributionId, isVoided: true }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.voidDistribution(distributionId)).rejects.toThrow();

      // Verify UPDATE was never called
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query.mock.calls[0][0]).not.toContain('UPDATE');
    });
  });

  describe('createCompetitionCost', () => {
    it('should successfully create a competition cost', async () => {
      const dto = {
        description: 'Trophy Engraving',
        amount: 45.50
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing cost with same description
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock transaction creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 200 }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock competition cost creation
      const mockCost = {
        id: 1,
        description: 'Trophy Engraving',
        amount: 45.50,
        transactionId: 200,
        transactionDate: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockCost],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createCompetitionCost(dto);

      expect(result).toEqual(mockCost);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error for duplicate description', async () => {
      const dto = {
        description: 'Trophy Engraving',
        amount: 45.50
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock existing cost with same description
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, description: 'Trophy Engraving' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createCompetitionCost(dto)).rejects.toThrow(
        'Competition cost with description "Trophy Engraving" already exists'
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-positive amount', async () => {
      const dto = {
        description: 'Invalid Cost',
        amount: -10.00
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing cost
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createCompetitionCost(dto)).rejects.toThrow(
        'Amount must be positive'
      );
    });

    it('should throw error for more than 2 decimal places', async () => {
      const dto = {
        description: 'Invalid Precision',
        amount: 45.555
      };

      const mockClient = {
        query: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      // Mock no existing cost
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(service.createCompetitionCost(dto)).rejects.toThrow(
        'Amount must have at most 2 decimal places'
      );
    });
  });

  describe('getAllCompetitionCosts', () => {
    it('should return all costs with total', async () => {
      const mockCosts = [
        {
          id: 1,
          description: 'Trophy Engraving',
          amount: 45.50,
          transactionId: 200,
          transactionDate: '2024-03-15',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          description: 'Stationery',
          amount: 25.00,
          transactionId: 201,
          transactionDate: '2024-03-10',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockCosts,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getAllCompetitionCosts();

      expect(result.costs).toEqual(mockCosts);
      expect(result.total).toBe(70.50);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY transaction_date DESC')
      );
    });

    it('should return empty array and zero total when no costs exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getAllCompetitionCosts();

      expect(result.costs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getCompetitionCostsByDateRange', () => {
    it('should return filtered costs with total', async () => {
      const mockCosts = [
        {
          id: 2,
          description: 'Stationery',
          amount: 25.00,
          transactionId: 201,
          transactionDate: '2024-03-10',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockCosts,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getCompetitionCostsByDateRange('2024-03-01', '2024-03-15');

      expect(result.costs).toEqual(mockCosts);
      expect(result.total).toBe(25.00);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE transaction_date >= $1 AND transaction_date <= $2'),
        ['2024-03-01', '2024-03-15']
      );
    });

    it('should return empty array and zero total when no costs in range', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getCompetitionCostsByDateRange('2024-01-01', '2024-01-31');

      expect(result.costs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
