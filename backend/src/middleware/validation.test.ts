import { Request, Response, NextFunction } from 'express';
import {
  validateTransactionImport,
  validateCompetitionCreate,
  validateCompetitionUpdate,
  validateDateRange,
  validateNumericId,
  validateFlagTransaction,
  validateUpdateFlaggedTransaction
} from './validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn();
  });

  describe('validateTransactionImport', () => {
    it('should pass validation for valid transaction records', () => {
      mockRequest.body = [{
        date: '2024-01-15',
        time: '10:30:00',
        type: 'Sale',
        total: '10.00'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject non-array input', () => {
      mockRequest.body = { invalid: 'data' };

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Request body must be an array of transaction records']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject records missing required date field', () => {
      mockRequest.body = [{
        time: '10:30:00',
        type: 'Sale',
        total: '10.00'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: date is required']
      });
    });

    it('should reject records missing required time field', () => {
      mockRequest.body = [{
        date: '2024-01-15',
        type: 'Sale',
        total: '10.00'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: time is required']
      });
    });

    it('should reject records missing required type field', () => {
      mockRequest.body = [{
        date: '2024-01-15',
        time: '10:30:00',
        total: '10.00'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: type is required']
      });
    });

    it('should reject records missing required total field', () => {
      mockRequest.body = [{
        date: '2024-01-15',
        time: '10:30:00',
        type: 'Sale'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: total is required']
      });
    });

    it('should reject records with invalid date format', () => {
      mockRequest.body = [{
        date: '01/15/2024',
        time: '10:30:00',
        type: 'Sale',
        total: '10.00'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: date must be in ISO 8601 format (YYYY-MM-DD)']
      });
    });

    it('should reject records with invalid numeric total', () => {
      mockRequest.body = [{
        date: '2024-01-15',
        time: '10:30:00',
        type: 'Sale',
        total: 'invalid'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['Record 0: total must be a valid number']
      });
    });

    it('should collect multiple validation errors', () => {
      mockRequest.body = [{
        time: '10:30:00',
        total: 'invalid'
      }];

      validateTransactionImport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      const details = jsonMock.mock.calls[0][0].details;
      expect(details).toContain('Record 0: date is required');
      expect(details).toContain('Record 0: type is required');
      expect(details).toContain('Record 0: total must be a valid number');
    });
  });

  describe('validateCompetitionCreate', () => {
    it('should pass validation for valid competition data', () => {
      mockRequest.body = {
        name: 'Summer Tournament',
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1
      };

      validateCompetitionCreate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject missing name field', () => {
      mockRequest.body = {
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1
      };

      validateCompetitionCreate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['name is required and must be a non-empty string']
      });
    });

    it('should reject empty name field', () => {
      mockRequest.body = {
        name: '   ',
        date: '2024-06-15',
        type: 'singles',
        seasonId: 1
      };

      validateCompetitionCreate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['name is required and must be a non-empty string']
      });
    });

    it('should reject missing date field', () => {
      mockRequest.body = {
        name: 'Summer Tournament',
        type: 'singles',
        seasonId: 1
      };

      validateCompetitionCreate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['date is required and must be a string']
      });
    });

    it('should reject invalid date format', () => {
      mockRequest.body = {
        name: 'Summer Tournament',
        date: '06/15/2024',
        type: 'singles',
        seasonId: 1
      };

      validateCompetitionCreate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['date must be in ISO 8601 format (YYYY-MM-DD)']
      });
    });
  });

  describe('validateCompetitionUpdate', () => {
    it('should pass validation for valid update data', () => {
      mockRequest.body = {
        name: 'Updated Tournament'
      };

      validateCompetitionUpdate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject empty update (no fields provided)', () => {
      mockRequest.body = {};

      validateCompetitionUpdate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['At least one field must be provided for update']
      });
    });

    it('should reject invalid date format in update', () => {
      mockRequest.body = {
        date: '06/15/2024'
      };

      validateCompetitionUpdate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['date must be in ISO 8601 format (YYYY-MM-DD)']
      });
    });

    it('should reject empty name in update', () => {
      mockRequest.body = {
        name: '   '
      };

      validateCompetitionUpdate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['name must be a non-empty string']
      });
    });
  });

  describe('validateDateRange', () => {
    it('should pass validation for valid date range', () => {
      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      validateDateRange(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass validation when no dates provided', () => {
      mockRequest.query = {};

      validateDateRange(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject invalid startDate format', () => {
      mockRequest.query = {
        startDate: '01/01/2024'
      };

      validateDateRange(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['startDate must be in ISO 8601 format (YYYY-MM-DD)']
      });
    });

    it('should reject invalid endDate format', () => {
      mockRequest.query = {
        endDate: '12/31/2024'
      };

      validateDateRange(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['endDate must be in ISO 8601 format (YYYY-MM-DD)']
      });
    });
  });

  describe('validateNumericId', () => {
    it('should pass validation for valid numeric ID', () => {
      mockRequest.params = { id: '123' };

      validateNumericId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject non-numeric ID', () => {
      mockRequest.params = { id: 'abc' };

      validateNumericId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['id must be a valid number']
      });
    });
  });

  describe('validateFlagTransaction', () => {
    it('should pass validation for valid transactionId', () => {
      mockRequest.body = { transactionId: 123 };

      validateFlagTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject missing transactionId', () => {
      mockRequest.body = {};

      validateFlagTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['transactionId is required']
      });
    });

    it('should reject non-integer transactionId', () => {
      mockRequest.body = { transactionId: 123.45 };

      validateFlagTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['transactionId must be an integer']
      });
    });
  });

  describe('validateUpdateFlaggedTransaction', () => {
    it('should pass validation for valid competitionId', () => {
      mockRequest.body = { competitionId: 123 };

      validateUpdateFlaggedTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass validation for null competitionId', () => {
      mockRequest.body = { competitionId: null };

      validateUpdateFlaggedTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject missing competitionId', () => {
      mockRequest.body = {};

      validateUpdateFlaggedTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['competitionId is required (use null to disassociate)']
      });
    });

    it('should reject non-integer competitionId', () => {
      mockRequest.body = { competitionId: 123.45 };

      validateUpdateFlaggedTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: ['competitionId must be an integer or null']
      });
    });
  });
});
