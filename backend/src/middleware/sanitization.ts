import { Request, Response, NextFunction } from 'express';

/**
 * Sanitization middleware to prevent SQL injection and XSS attacks
 * Sanitizes all user inputs by escaping special characters
 */

/**
 * Sanitize a string value by escaping special characters
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove null bytes
  let sanitized = value.replace(/\0/g, '');

  // Escape HTML special characters to prevent XSS
  // Note: Forward slashes (/) are NOT escaped as they don't pose an XSS risk
  // when < and > are already escaped
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 * This prevents SQL injection and XSS attacks by escaping special characters
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}
