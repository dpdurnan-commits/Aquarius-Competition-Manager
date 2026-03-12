import { Request, Response, NextFunction } from 'express';

export class ValidationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export class ChronologicalError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'ChronologicalError';
    this.statusCode = 409;
  }
}

export class DatabaseError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 503;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  // Handle known error types
  if (err instanceof ChronologicalError) {
    res.status(err.statusCode).json({
      error: 'Chronological validation failed',
      message: err.message,
      ...(nodeEnv === 'development' && { stack: err.stack })
    });
    return;
  }
  
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(nodeEnv === 'development' && { stack: err.stack })
    });
    return;
  }
  
  if (err instanceof DatabaseError) {
    res.status(503).json({
      error: nodeEnv === 'production' 
        ? 'Database service unavailable' 
        : err.message,
      ...(nodeEnv === 'development' && { stack: err.stack })
    });
    return;
  }
  
  // Handle unhandled exceptions
  res.status(500).json({
    error: nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(nodeEnv === 'development' && { stack: err.stack })
  });
}
