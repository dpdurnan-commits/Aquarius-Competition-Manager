import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 * Logs all incoming requests with timestamp, method, path, and status
 * Uses appropriate log levels (info, warn, error)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request (info level)
  console.log(`[${timestamp}] [INFO] ${req.method} ${req.path}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logTimestamp = new Date().toISOString();
    const statusCode = res.statusCode;
    
    // Determine log level based on status code
    let logLevel = 'INFO';
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'WARN';
    } else if (statusCode >= 500) {
      logLevel = 'ERROR';
    }
    
    console.log(
      `[${logTimestamp}] [${logLevel}] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`
    );
  });
  
  next();
}

/**
 * Database query logger for development mode
 * Logs database queries with parameters
 */
export function logDatabaseQuery(sql: string, params?: any[]): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] Database Query:`, sql);
    if (params && params.length > 0) {
      console.log(`[${timestamp}] [DEBUG] Query Parameters:`, params);
    }
  }
}

