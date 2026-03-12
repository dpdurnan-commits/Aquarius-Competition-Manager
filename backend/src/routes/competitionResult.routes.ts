import { Router, Request, Response, NextFunction } from 'express';
import { CompetitionResultService } from '../services/competitionResult.service';
import { DatabaseService } from '../services/database.service';
import { CreateResultDTO, UpdateResultDTO } from '../types';
import { validateNumericId, DatabaseError } from '../middleware';

const router = Router();

/**
 * Validation middleware for creating a competition result
 */
function validateResultCreate(req: Request, res: Response, next: NextFunction): void {
  const { competitionId, finishingPosition, playerName } = req.body;
  const errors: string[] = [];

  if (competitionId === undefined || competitionId === null) {
    errors.push('competitionId is required');
  } else if (typeof competitionId !== 'number' || !Number.isInteger(competitionId) || competitionId <= 0) {
    errors.push('competitionId must be a positive integer');
  }

  if (finishingPosition === undefined || finishingPosition === null) {
    errors.push('finishingPosition is required');
  } else if (typeof finishingPosition !== 'number' || !Number.isInteger(finishingPosition) || finishingPosition <= 0) {
    errors.push('finishingPosition must be a positive integer');
  }

  if (!playerName || typeof playerName !== 'string' || playerName.trim() === '') {
    errors.push('playerName is required and must be a non-empty string');
  }

  // Validate optional numeric fields
  if (req.body.grossScore !== undefined && req.body.grossScore !== null) {
    if (typeof req.body.grossScore !== 'number') {
      errors.push('grossScore must be a number');
    }
  }

  if (req.body.handicap !== undefined && req.body.handicap !== null) {
    if (typeof req.body.handicap !== 'number') {
      errors.push('handicap must be a number');
    }
  }

  if (req.body.nettScore !== undefined && req.body.nettScore !== null) {
    if (typeof req.body.nettScore !== 'number') {
      errors.push('nettScore must be a number');
    }
  }

  if (req.body.swindleMoneyPaid !== undefined && req.body.swindleMoneyPaid !== null) {
    if (typeof req.body.swindleMoneyPaid !== 'number' || req.body.swindleMoneyPaid < 0) {
      errors.push('swindleMoneyPaid must be a non-negative number');
    }
  }

  if (req.body.entryPaid !== undefined && req.body.entryPaid !== null) {
    if (typeof req.body.entryPaid !== 'number' || req.body.entryPaid < 0) {
      errors.push('entryPaid must be a non-negative number');
    }
  }

  if (req.body.competitionRefund !== undefined && req.body.competitionRefund !== null) {
    if (typeof req.body.competitionRefund !== 'number' || req.body.competitionRefund < 0) {
      errors.push('competitionRefund must be a non-negative number');
    }
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
 * Validation middleware for bulk result creation
 */
function validateBulkResultCreate(req: Request, res: Response, next: NextFunction): void {
  const { competitionId, results } = req.body;
  const errors: string[] = [];

  if (competitionId === undefined || competitionId === null) {
    errors.push('competitionId is required');
  } else if (typeof competitionId !== 'number' || !Number.isInteger(competitionId) || competitionId <= 0) {
    errors.push('competitionId must be a positive integer');
  }

  if (!Array.isArray(results)) {
    errors.push('results must be an array');
  } else if (results.length === 0) {
    errors.push('results array cannot be empty');
  } else {
    // Validate each result in the array
    results.forEach((result, index) => {
      if (!result.finishingPosition || typeof result.finishingPosition !== 'number' || result.finishingPosition <= 0) {
        errors.push(`results[${index}]: finishingPosition must be a positive integer`);
      }

      if (!result.playerName || typeof result.playerName !== 'string' || result.playerName.trim() === '') {
        errors.push(`results[${index}]: playerName is required and must be a non-empty string`);
      }
    });
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
 * Validation middleware for updating a competition result
 */
function validateResultUpdate(req: Request, res: Response, next: NextFunction): void {
  const { finishingPosition, playerName, grossScore, handicap, nettScore, entryPaid, competitionRefund, swindleMoneyPaid } = req.body;
  const errors: string[] = [];

  // At least one field must be provided
  if (
    finishingPosition === undefined &&
    playerName === undefined &&
    grossScore === undefined &&
    handicap === undefined &&
    nettScore === undefined &&
    entryPaid === undefined &&
    competitionRefund === undefined &&
    swindleMoneyPaid === undefined
  ) {
    errors.push('At least one field must be provided for update');
  }

  // Validate fields if provided
  if (finishingPosition !== undefined) {
    if (typeof finishingPosition !== 'number' || !Number.isInteger(finishingPosition) || finishingPosition <= 0) {
      errors.push('finishingPosition must be a positive integer');
    }
  }

  if (playerName !== undefined) {
    if (typeof playerName !== 'string' || playerName.trim() === '') {
      errors.push('playerName must be a non-empty string');
    }
  }

  if (grossScore !== undefined && grossScore !== null && typeof grossScore !== 'number') {
    errors.push('grossScore must be a number or null');
  }

  if (handicap !== undefined && handicap !== null && typeof handicap !== 'number') {
    errors.push('handicap must be a number or null');
  }

  if (nettScore !== undefined && nettScore !== null && typeof nettScore !== 'number') {
    errors.push('nettScore must be a number or null');
  }

  if (entryPaid !== undefined && entryPaid !== null) {
    if (typeof entryPaid !== 'number' || entryPaid < 0) {
      errors.push('entryPaid must be a non-negative number or null');
    }
  }

  if (competitionRefund !== undefined && competitionRefund !== null) {
    if (typeof competitionRefund !== 'number' || competitionRefund < 0) {
      errors.push('competitionRefund must be a non-negative number or null');
    }
  }

  if (swindleMoneyPaid !== undefined && swindleMoneyPaid !== null) {
    if (typeof swindleMoneyPaid !== 'number' || swindleMoneyPaid < 0) {
      errors.push('swindleMoneyPaid must be a non-negative number or null');
    }
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
 * @swagger
 * /api/competition-results:
 *   post:
 *     summary: Create a single competition result
 *     description: Add a new result record for a competition
 *     tags: [Competition Results]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *               - finishingPosition
 *               - playerName
 *             properties:
 *               competitionId:
 *                 type: integer
 *                 example: 1
 *               finishingPosition:
 *                 type: integer
 *                 example: 1
 *               playerName:
 *                 type: string
 *                 example: "John SMITH"
 *               grossScore:
 *                 type: integer
 *                 example: 85
 *               handicap:
 *                 type: integer
 *                 example: 12
 *               nettScore:
 *                 type: integer
 *                 example: 73
 *               entryPaid:
 *                 type: boolean
 *                 example: true
 *               swindleMoneyPaid:
 *                 type: number
 *                 example: 50.00
 *     responses:
 *       201:
 *         description: Result created successfully
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.post('/', validateResultCreate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const dto: CreateResultDTO = {
      competitionId: req.body.competitionId,
      finishingPosition: req.body.finishingPosition,
      playerName: req.body.playerName,
      grossScore: req.body.grossScore,
      handicap: req.body.handicap,
      nettScore: req.body.nettScore,
      entryPaid: req.body.entryPaid,
      swindleMoneyPaid: req.body.swindleMoneyPaid
    };

    const result = await resultService.addResult(dto);

    res.status(201).json({
      message: 'Competition result created successfully',
      result
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
 * /api/competition-results/bulk:
 *   post:
 *     summary: Bulk create competition results
 *     description: Add multiple result records for a competition in a single transaction
 *     tags: [Competition Results]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *               - results
 *             properties:
 *               competitionId:
 *                 type: integer
 *                 example: 1
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - finishingPosition
 *                     - playerName
 *                   properties:
 *                     finishingPosition:
 *                       type: integer
 *                       example: 1
 *                     playerName:
 *                       type: string
 *                       example: "John SMITH"
 *                     grossScore:
 *                       type: integer
 *                       example: 85
 *                     handicap:
 *                       type: integer
 *                       example: 12
 *                     nettScore:
 *                       type: integer
 *                       example: 73
 *     responses:
 *       201:
 *         description: Results created successfully
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.post('/bulk', validateBulkResultCreate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const { competitionId, results } = req.body;

    // Map results to DTOs
    const dtos: CreateResultDTO[] = results.map((r: any) => ({
      competitionId,
      finishingPosition: r.finishingPosition,
      playerName: r.playerName,
      grossScore: r.grossScore,
      handicap: r.handicap,
      nettScore: r.nettScore,
      entryPaid: r.entryPaid ?? 0,
      swindleMoneyPaid: r.swindleMoneyPaid ?? 0
    }));

    const response = await resultService.bulkAddResults(dtos);

    res.status(201).json({
      message: `Successfully created ${response.created} result(s)`,
      created: response.created,
      errors: response.errors
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
 * /api/competition-results:
 *   get:
 *     summary: Get competition results
 *     description: Retrieve results for a specific competition, ordered by finishing position
 *     tags: [Competition Results]
 *     parameters:
 *       - in: query
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Competition ID to filter results
 *         example: 1
 *     responses:
 *       200:
 *         description: Results retrieved successfully
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const competitionId = req.query.competitionId ? parseInt(req.query.competitionId as string, 10) : undefined;

    if (competitionId === undefined) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId query parameter is required']
      });
    }

    if (isNaN(competitionId) || competitionId <= 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId must be a positive integer']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const results = await resultService.getResultsByCompetition(competitionId);

    res.status(200).json({
      results,
      count: results.length
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
 * /api/competition-results/{id}:
 *   put:
 *     summary: Update a competition result
 *     description: Update an existing competition result's details
 *     tags: [Competition Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               finishingPosition:
 *                 type: integer
 *                 example: 2
 *               playerName:
 *                 type: string
 *                 example: "Jane DOE"
 *               grossScore:
 *                 type: integer
 *                 example: 88
 *               handicap:
 *                 type: integer
 *                 example: 15
 *               nettScore:
 *                 type: integer
 *                 example: 73
 *               entryPaid:
 *                 type: boolean
 *                 example: true
 *               swindleMoneyPaid:
 *                 type: number
 *                 example: 30.00
 *     responses:
 *       200:
 *         description: Result updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Result not found
 *       503:
 *         description: Database error
 */
router.put('/:id', validateNumericId, validateResultUpdate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const id = parseInt(req.params.id, 10);

    const updates: UpdateResultDTO = {};
    if (req.body.finishingPosition !== undefined) updates.finishingPosition = req.body.finishingPosition;
    if (req.body.playerName !== undefined) updates.playerName = req.body.playerName;
    if (req.body.grossScore !== undefined) updates.grossScore = req.body.grossScore;
    if (req.body.handicap !== undefined) updates.handicap = req.body.handicap;
    if (req.body.nettScore !== undefined) updates.nettScore = req.body.nettScore;
    if (req.body.entryPaid !== undefined) updates.entryPaid = req.body.entryPaid;
    if (req.body.swindleMoneyPaid !== undefined) updates.swindleMoneyPaid = req.body.swindleMoneyPaid;

    const result = await resultService.updateResult(id, updates);

    res.status(200).json({
      message: 'Competition result updated successfully',
      result
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
 * /api/competition-results/{id}:
 *   delete:
 *     summary: Delete a competition result
 *     description: Remove a competition result record
 *     tags: [Competition Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Result deleted successfully
 *       404:
 *         description: Result not found
 *       503:
 *         description: Database error
 */
router.delete('/:id', validateNumericId, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const id = parseInt(req.params.id, 10);

    await resultService.deleteResult(id);

    res.status(200).json({
      message: 'Competition result deleted successfully'
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
 * /api/competition-results/populate-from-transactions:
 *   post:
 *     summary: Populate financial fields from transactions
 *     description: Automatically populate Entry Paid, Competition Refund, and Swindle Money fields for all results in a competition by matching transactions
 *     tags: [Competition Results]
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
 *                 example: 1
 *     responses:
 *       200:
 *         description: Financial fields populated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Competition not found
 *       503:
 *         description: Database error
 */
router.post('/populate-from-transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { competitionId } = req.body;

    if (!competitionId || typeof competitionId !== 'number' || competitionId <= 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId must be a positive integer']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const result = await resultService.populateFromTransactions(competitionId);

    res.status(200).json({
      message: `Successfully populated financial fields for ${result.updated} result(s)`,
      updated: result.updated,
      errors: result.errors
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
 * /api/competition-results/competitions/{competitionId}/reconcile:
 *   post:
 *     summary: Reconcile competition results with transactions
 *     description: Synchronize financial transaction data with competition results through name correction and missing player identification
 *     tags: [Competition Results]
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Competition ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Reconciliation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     nameCorrections:
 *                       type: integer
 *                       example: 5
 *                     dnpEntriesAdded:
 *                       type: integer
 *                       example: 2
 *                     totalValueReconciled:
 *                       type: number
 *                       example: 450.00
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *       400:
 *         description: Validation error
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */
router.post('/competitions/:competitionId/reconcile', async (req: Request, res: Response) => {
  try {
    const competitionId = parseInt(req.params.competitionId, 10);

    if (isNaN(competitionId)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId must be a valid number']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const resultService = new CompetitionResultService(db);

    const summary = await resultService.reconcileResults(competitionId);

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;
