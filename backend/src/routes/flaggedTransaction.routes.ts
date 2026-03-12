import { Router, Request, Response, NextFunction } from 'express';
import { FlaggedTransactionService } from '../services/flaggedTransaction.service';
import { DatabaseService } from '../services/database.service';
import { validateNumericId, validateFlagTransaction, validateUpdateFlaggedTransaction, DatabaseError } from '../middleware';

const router = Router();

/**
 * @swagger
 * /api/flagged-transactions:
 *   post:
 *     summary: Flag a transaction
 *     description: Mark a transaction as a prize winning that should be associated with a competition
 *     tags: [Flagged Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       201:
 *         description: Transaction flagged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transaction flagged successfully"
 *                 flaggedTransaction:
 *                   $ref: '#/components/schemas/FlaggedTransaction'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Transaction already flagged
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
router.post('/', validateFlagTransaction, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const flaggedTransactionService = new FlaggedTransactionService(db);
    
    const { transactionId } = req.body;
    const flaggedTransaction = await flaggedTransactionService.createFlaggedTransaction(transactionId);

    return res.status(201).json({
      message: 'Transaction flagged successfully',
      flaggedTransaction
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already flagged')) {
      return res.status(409).json({
        error: 'Conflict',
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
 * /api/flagged-transactions:
 *   get:
 *     summary: Get all flagged transactions
 *     description: Retrieve all flagged transactions with their associated transaction details
 *     tags: [Flagged Transactions]
 *     responses:
 *       200:
 *         description: Flagged transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flaggedTransactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FlaggedTransaction'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       503:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const flaggedTransactionService = new FlaggedTransactionService(db);
    
    const flaggedTransactions = await flaggedTransactionService.getAllFlaggedTransactions();

    res.status(200).json({
      flaggedTransactions,
      count: flaggedTransactions.length
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
 * /api/flagged-transactions/{id}:
 *   put:
 *     summary: Associate flagged transaction with competition
 *     description: Update a flagged transaction to associate it with a specific competition
 *     tags: [Flagged Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Flagged transaction ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *             properties:
 *               competitionId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Flagged transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Flagged transaction updated successfully"
 *                 flaggedTransaction:
 *                   $ref: '#/components/schemas/FlaggedTransaction'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Flagged transaction not found
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
router.put('/:id', validateNumericId, validateUpdateFlaggedTransaction, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const flaggedTransactionService = new FlaggedTransactionService(db);
    
    const id = parseInt(req.params.id, 10);

    const { competitionId } = req.body;
    const flaggedTransaction = await flaggedTransactionService.updateFlaggedTransaction(id, competitionId);

    return res.status(200).json({
      message: 'Flagged transaction updated successfully',
      flaggedTransaction
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
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
 * /api/flagged-transactions/{id}:
 *   delete:
 *     summary: Remove flag from transaction
 *     description: Delete a flagged transaction record
 *     tags: [Flagged Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Flagged transaction ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Flagged transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Flagged transaction deleted successfully"
 *       404:
 *         description: Flagged transaction not found
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
router.delete('/:id', validateNumericId, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const flaggedTransactionService = new FlaggedTransactionService(db);
    
    const id = parseInt(req.params.id, 10);

    await flaggedTransactionService.deleteFlaggedTransaction(id);

    return res.status(200).json({
      message: 'Flagged transaction deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
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

export default router;
