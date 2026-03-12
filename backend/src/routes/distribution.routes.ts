import { Router, Request, Response, NextFunction } from 'express';
import { DistributionService } from '../services/distribution.service';
import { DatabaseService } from '../services/database.service';
import { CreateDistributionDTO } from '../types';

const router = Router();

// Validation middleware for distribution creation
function validateDistributionCreate(req: Request, res: Response, next: NextFunction): void {
  const { seasonId, assignments, transactionDate } = req.body;
  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!seasonId || typeof seasonId !== 'number') {
    errors.push('seasonId is required and must be a number');
  }

  if (!assignments || !Array.isArray(assignments)) {
    errors.push('assignments is required and must be an array');
  } else {
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      if (!assignment.competitionId || typeof assignment.competitionId !== 'number') {
        errors.push(`assignments[${i}].competitionId is required and must be a number`);
      }
      if (assignment.amount === undefined || assignment.amount === null) {
        errors.push(`assignments[${i}].amount is required`);
      } else if (typeof assignment.amount !== 'number' || isNaN(assignment.amount)) {
        errors.push(`assignments[${i}].amount must be a valid number`);
      } else if (assignment.amount < 0) {
        errors.push(`assignments[${i}].amount must be non-negative`);
      }
    }
  }

  if (!transactionDate || typeof transactionDate !== 'string') {
    errors.push('transactionDate is required and must be a string');
  } else if (!dateRegex.test(transactionDate)) {
    errors.push('transactionDate must be in YYYY-MM-DD format');
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
 * /api/distributions/season/{seasonId}/winners:
 *   get:
 *     summary: Get all winners for a presentation season
 *     description: Retrieve all competition winners for a season with competition details
 *     tags: [Distributions]
 *     parameters:
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Presentation season ID
 *     responses:
 *       200:
 *         description: Winners retrieved successfully
 *       404:
 *         description: Season not found
 *       503:
 *         description: Database error
 */
router.get('/season/:seasonId/winners', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'seasonId must be a valid number'
      });
      return;
    }

    const winners = await distributionService.getSeasonWinners(seasonId);

    res.status(200).json({
      winners
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not found',
        message: error.message
      });
      return;
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/distributions:
 *   post:
 *     summary: Create a new distribution
 *     description: Create a distribution with winnings assignments for a presentation season
 *     tags: [Distributions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seasonId
 *               - assignments
 *               - transactionDate
 *             properties:
 *               seasonId:
 *                 type: integer
 *                 example: 1
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     competitionId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *               transactionDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *     responses:
 *       201:
 *         description: Distribution created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Distribution already exists for season
 *       503:
 *         description: Database error
 */
router.post('/', validateDistributionCreate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const dto: CreateDistributionDTO = {
      seasonId: req.body.seasonId,
      assignments: req.body.assignments,
      transactionDate: req.body.transactionDate
    };

    const distribution = await distributionService.createDistribution(dto);

    res.status(201).json({
      message: 'Distribution created successfully',
      distribution
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Duplicate distribution',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('not in season')) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
      return;
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/distributions/season/{seasonId}:
 *   get:
 *     summary: Get distribution for a season
 *     description: Retrieve existing distribution with assignments for a season
 *     tags: [Distributions]
 *     parameters:
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Presentation season ID
 *     responses:
 *       200:
 *         description: Distribution retrieved successfully
 *       404:
 *         description: No distribution exists for season
 *       503:
 *         description: Database error
 */
router.get('/season/:seasonId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'seasonId must be a valid number'
      });
      return;
    }

    const distribution = await distributionService.getDistributionBySeason(seasonId);

    if (!distribution) {
      res.status(404).json({
        error: 'Not found',
        message: `No distribution found for season ${seasonId}`
      });
      return;
    }

    res.status(200).json({
      distribution
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/distributions/{id}/void:
 *   delete:
 *     summary: Void a distribution
 *     description: Mark a distribution as voided
 *     tags: [Distributions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution ID
 *     responses:
 *       200:
 *         description: Distribution voided successfully
 *       404:
 *         description: Distribution not found
 *       503:
 *         description: Database error
 */
router.delete('/:id/void', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const distributionId = parseInt(req.params.id, 10);
    
    if (isNaN(distributionId)) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'distributionId must be a valid number'
      });
      return;
    }

    await distributionService.voidDistribution(distributionId);

    res.status(200).json({
      message: 'Distribution voided successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not found',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('already voided')) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message
      });
      return;
    }
    next(error);
  }
});

export default router;
