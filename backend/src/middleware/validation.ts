import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware for transaction import
 * Validates required fields: date, time, type, total
 * Validates date format (ISO 8601 YYYY-MM-DD)
 * Validates numeric fields
 */
export function validateTransactionImport(req: Request, res: Response, next: NextFunction): void {
  const records = req.body;

  console.log('[VALIDATION] Received request body type:', Array.isArray(records) ? 'array' : typeof records);
  console.log('[VALIDATION] First record sample:', records && records[0] ? JSON.stringify(records[0]).substring(0, 200) : 'N/A');

  if (!Array.isArray(records)) {
    res.status(400).json({
      error: 'Validation failed',
      details: ['Request body must be an array of transaction records']
    });
    return;
  }

  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  records.forEach((record, index) => {
    // Required field validation
    if (!record.date) {
      errors.push(`Record ${index}: date is required`);
    } else if (!dateRegex.test(record.date)) {
      errors.push(`Record ${index}: date must be in ISO 8601 format (YYYY-MM-DD)`);
    }

    if (!record.time) {
      errors.push(`Record ${index}: time is required`);
    }

    if (!record.type) {
      errors.push(`Record ${index}: type is required`);
    }

    if (record.total === undefined || record.total === null) {
      errors.push(`Record ${index}: total is required`);
    } else if (typeof record.total !== 'number' && typeof record.total !== 'string') {
      errors.push(`Record ${index}: total must be a number`);
    } else if (typeof record.total === 'string' && isNaN(parseFloat(record.total))) {
      errors.push(`Record ${index}: total must be a valid number`);
    }

    // Validate other numeric fields if present
    const numericFields = ['price', 'discount', 'subtotal', 'vat'];
    numericFields.forEach(field => {
      if (record[field] !== undefined && record[field] !== null) {
        if (typeof record[field] !== 'number' && typeof record[field] !== 'string') {
          errors.push(`Record ${index}: ${field} must be a number`);
        } else if (typeof record[field] === 'string' && isNaN(parseFloat(record[field]))) {
          errors.push(`Record ${index}: ${field} must be a valid number`);
        }
      }
    });
  });

  if (errors.length > 0) {
    console.error('[VALIDATION ERROR] Transaction import validation failed:', errors);
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validation middleware for competition creation
 * Validates required fields: name, date, type, seasonId
 * Validates date format (ISO 8601 YYYY-MM-DD)
 * Validates type is 'singles' or 'doubles'
 * Validates seasonId is a positive integer
 */
export function validateCompetitionCreate(req: Request, res: Response, next: NextFunction): void {
  const { name, date, type, seasonId } = req.body;
  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  }

  if (!date || typeof date !== 'string') {
    errors.push('date is required and must be a string');
  } else if (!dateRegex.test(date)) {
    errors.push('date must be in ISO 8601 format (YYYY-MM-DD)');
  }

  if (!type || typeof type !== 'string') {
    errors.push('type is required and must be a string');
  } else if (!['singles', 'doubles'].includes(type)) {
    errors.push('type must be either "singles" or "doubles"');
  }

  if (seasonId === undefined || seasonId === null) {
    errors.push('seasonId is required');
  } else if (typeof seasonId !== 'number' || !Number.isInteger(seasonId) || seasonId <= 0) {
    errors.push('seasonId must be a positive integer');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validation middleware for competition update
 * Validates date format if provided (ISO 8601 YYYY-MM-DD)
 * Validates type if provided ('singles' or 'doubles')
 * Validates seasonId if provided (positive integer)
 */
export function validateCompetitionUpdate(req: Request, res: Response, next: NextFunction): void {
  const { name, date, type, seasonId, description, prizeStructure, finished } = req.body;
  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // At least one field must be provided
  if (name === undefined && date === undefined && type === undefined && seasonId === undefined && description === undefined && prizeStructure === undefined && finished === undefined) {
    errors.push('At least one field must be provided for update');
  }

  // Validate date format if provided
  if (date !== undefined) {
    if (typeof date !== 'string' || !dateRegex.test(date)) {
      errors.push('date must be in ISO 8601 format (YYYY-MM-DD)');
    }
  }

  // Validate name if provided
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    errors.push('name must be a non-empty string');
  }

  // Validate type if provided
  if (type !== undefined) {
    if (typeof type !== 'string' || !['singles', 'doubles'].includes(type)) {
      errors.push('type must be either "singles" or "doubles"');
    }
  }

  // Validate seasonId if provided
  if (seasonId !== undefined) {
    if (typeof seasonId !== 'number' || !Number.isInteger(seasonId) || seasonId <= 0) {
      errors.push('seasonId must be a positive integer');
    }
  }

  // Validate finished if provided
  if (finished !== undefined && typeof finished !== 'boolean') {
    errors.push('finished must be a boolean value');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validation middleware for date range queries
 * Validates date format (ISO 8601 YYYY-MM-DD)
 */
export function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const errors: string[] = [];

  if (startDate && !dateRegex.test(startDate as string)) {
    errors.push('startDate must be in ISO 8601 format (YYYY-MM-DD)');
  }

  if (endDate && !dateRegex.test(endDate as string)) {
    errors.push('endDate must be in ISO 8601 format (YYYY-MM-DD)');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validation middleware for numeric ID parameters
 */
export function validateNumericId(req: Request, res: Response, next: NextFunction): void {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({
      error: 'Validation failed',
      details: ['id must be a valid number']
    });
    return;
  }

  next();
}

/**
 * Validation middleware for flagging a transaction
 * Validates transactionId is a valid integer
 */
export function validateFlagTransaction(req: Request, res: Response, next: NextFunction): void {
  const { transactionId } = req.body;
  const errors: string[] = [];

  if (transactionId === undefined || transactionId === null) {
    errors.push('transactionId is required');
  } else if (typeof transactionId !== 'number' || !Number.isInteger(transactionId)) {
    errors.push('transactionId must be an integer');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validation middleware for updating flagged transaction
 * Validates competitionId is a valid integer or null
 */
export function validateUpdateFlaggedTransaction(req: Request, res: Response, next: NextFunction): void {
  const { competitionId } = req.body;
  const errors: string[] = [];

  if (competitionId === undefined) {
    errors.push('competitionId is required (use null to disassociate)');
  } else if (competitionId !== null && (typeof competitionId !== 'number' || !Number.isInteger(competitionId))) {
    errors.push('competitionId must be an integer or null');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}
