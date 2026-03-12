import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  ValidationError,
  ChronologicalError,
  DatabaseError
} from './errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn();

    // Spy on console.error to suppress error logs in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('ChronologicalError', () => {
    it('should handle ChronologicalError with 409 status', () => {
      const error = new ChronologicalError('Import rejected: chronological validation failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Chronological validation failed',
        message: 'Import rejected: chronological validation failed'
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ChronologicalError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Chronological validation failed',
          message: 'Test error',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ChronologicalError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Chronological validation failed',
        message: 'Test error'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('ValidationError', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input data');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid input data'
      });
    });

    it('should handle ValidationError with custom status code', () => {
      const error = new ValidationError('Forbidden', 403);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden'
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ValidationError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('DatabaseError', () => {
    it('should handle DatabaseError with 503 status in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new DatabaseError('Connection failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection failed'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new DatabaseError('Connection failed with sensitive info');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database service unavailable'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new DatabaseError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Unhandled Exceptions', () => {
    it('should handle generic Error with 500 status in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Unexpected error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unexpected error'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive error information');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging', () => {
    it('should log all errors to console', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Error:/),
        error
      );
    });
  });

  describe('Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Test message', 422);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error instanceof Error).toBe(true);
    });

    it('should create ValidationError with default status code', () => {
      const error = new ValidationError('Test message');

      expect(error.statusCode).toBe(400);
    });

    it('should create ChronologicalError with correct properties', () => {
      const error = new ChronologicalError('Test message');

      expect(error.name).toBe('ChronologicalError');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(409);
      expect(error instanceof Error).toBe(true);
    });

    it('should create DatabaseError with correct properties', () => {
      const error = new DatabaseError('Test message');

      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(503);
      expect(error instanceof Error).toBe(true);
    });
  });
});
