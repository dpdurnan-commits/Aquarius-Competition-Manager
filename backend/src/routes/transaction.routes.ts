import { Router, Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { DatabaseService } from '../services/database.service';
import { TransactionRecord, PaginationParams } from '../types';
import { validateTransactionImport, validateDateRange, ChronologicalError, DatabaseError } from '../middleware';

const router = Router();

/**
 * @swagger
 * /api/transactions/import:
 *   post:
 *     summary: Import transaction records
 *     description: Import an array of transaction records into the database with chronological validation
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/TransactionRecord'
 *           example:
 *             - date: "2024-01-15"
 *               time: "14:30:00"
 *               till: "TILL1"
 *               type: "Sale"
 *               member: "John Doe & Weekly Medal: Entry"
 *               price: "10.00"
 *               discount: "0.00"
 *               subtotal: "10.00"
 *               vat: "2.00"
 *               total: "12.00"
 *               sourceRowIndex: 1
 *               isComplete: true
 *     responses:
 *       201:
 *         description: Import successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Import successful"
 *                 imported:
 *                   type: integer
 *                   example: 150
 *       207:
 *         description: Import completed with errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResult'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Chronological validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/import', validateTransactionImport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const records: TransactionRecord[] = req.body;
    const result = await transactionService.importTransactions(records);

    if (result.errors.length > 0) {
      return res.status(207).json({
        message: 'Import completed with errors',
        imported: result.imported,
        errors: result.errors
      });
    }

    return res.status(201).json({
      message: 'Import successful',
      imported: result.imported
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Import rejected')) {
      const chronologicalError = new ChronologicalError(error.message);
      return res.status(chronologicalError.statusCode).json({
        error: 'Chronological validation failed',
        message: chronologicalError.message
      });
    }
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions or filter by date range
 *     description: Retrieve all transactions or filter by date range using query parameters. Supports pagination for large result sets.
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO 8601 format YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO 8601 format YYYY-MM-DD)
 *         example: "2024-01-31"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (1-indexed, use with pageSize)
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Number of records per page (use with page)
 *         example: 100
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of records to return (use with offset)
 *         example: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of records to skip (use with limit)
 *         example: 0
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Non-paginated response (when no pagination params provided)
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TransactionRecord'
 *                     count:
 *                       type: integer
 *                       example: 150
 *                 - type: object
 *                   description: Paginated response (when pagination params provided)
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TransactionRecord'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         pageSize:
 *                           type: integer
 *                           example: 100
 *                         totalPages:
 *                           type: integer
 *                           example: 15
 *       400:
 *         description: Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validateDateRange, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const { startDate, endDate, page, pageSize, limit, offset } = req.query;

    // Check if pagination parameters are provided
    const hasPaginationParams = page !== undefined || pageSize !== undefined || 
                                 limit !== undefined || offset !== undefined;

    if (hasPaginationParams) {
      // Use pagination
      const paginationParams: PaginationParams = {
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined
      };

      let result;
      if (startDate && endDate) {
        result = await transactionService.getTransactionsByDateRangePaginated(
          startDate as string,
          endDate as string,
          paginationParams
        );
      } else {
        result = await transactionService.getAllTransactionsPaginated(paginationParams);
      }

      return res.status(200).json(result);
    } else {
      // No pagination - return all results (backward compatible)
      let transactions: TransactionRecord[];

      if (startDate && endDate) {
        transactions = await transactionService.getTransactionsByDateRange(
          startDate as string,
          endDate as string
        );
      } else {
        transactions = await transactionService.getAllTransactions();
      }

      return res.status(200).json({
        transactions,
        count: transactions.length
      });
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/transactions/latest:
 *   get:
 *     summary: Get latest transaction timestamp
 *     description: Retrieve the date and time of the most recent transaction for chronological validation
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Latest timestamp retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latest:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-15"
 *                     time:
 *                       type: string
 *                       example: "14:30:00"
 *                 message:
 *                   type: string
 *                   example: "No transactions found"
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const latest = await transactionService.getLatestTimestamp();

    if (!latest) {
      return res.status(200).json({
        latest: null,
        message: 'No transactions found'
      });
    }

    return res.status(200).json({
      latest
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/transactions/last-week-info:
 *   get:
 *     summary: Get last week information
 *     description: Retrieve information about the most recent week (Monday-Sunday) containing transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Last week information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weekInfo:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-15"
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-21"
 *                     count:
 *                       type: integer
 *                       example: 42
 *       404:
 *         description: No transactions found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weekInfo:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "No transactions found"
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/last-week-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const weekInfo = await transactionService.getLastWeekInfo();
    
    if (!weekInfo) {
      return res.status(404).json({
        weekInfo: null,
        message: 'No transactions found'
      });
    }
    
    return res.status(200).json({ weekInfo });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/transactions/last-week:
 *   delete:
 *     summary: Delete last week transactions
 *     description: Delete all transactions from the most recent week (Monday-Sunday)
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Last week transactions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: integer
 *                   example: 42
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 42 transaction(s) from last week"
 *       404:
 *         description: No transactions to delete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Not found"
 *                 message:
 *                   type: string
 *                   example: "No transactions to delete"
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/last-week', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const deleted = await transactionService.deleteLastWeek();
    
    return res.status(200).json({
      deleted,
      message: `Successfully deleted ${deleted} transaction(s) from last week`
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'No transactions to delete') {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/transactions:
 *   delete:
 *     summary: Delete all transactions
 *     description: Remove all transaction records from the database
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: All transactions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All transactions deleted successfully"
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    await transactionService.deleteAllTransactions();

    return res.status(200).json({
      message: 'All transactions deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

/**
 * Get a single transaction by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const transactionService = new TransactionService(db);
    
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Transaction ID must be a valid number'
      });
    }
    
    const transaction = await transactionService.getTransactionById(id);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Not found',
        message: `Transaction with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      transaction
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

export default router;

