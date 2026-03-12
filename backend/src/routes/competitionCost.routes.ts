import { Router, Request, Response, NextFunction } from 'express';
import { DistributionService } from '../services/distribution.service';
import { DatabaseService } from '../services/database.service';
import { CreateCompetitionCostDTO } from '../types';

const router = Router();

// Validation middleware for competition cost creation
function validateCompetitionCostCreate(req: Request, res: Response, next: NextFunction): void {
  const { description, amount } = req.body;
  const errors: string[] = [];

  if (!description || typeof description !== 'string' || description.trim() === '') {
    errors.push('description is required and must be a non-empty string');
  }

  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('amount must be a valid number');
  } else if (amount <= 0) {
    errors.push('amount must be positive');
  } else {
    // Check for up to 2 decimal places
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('amount must have at most 2 decimal places');
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

// Validation middleware for date range query
function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;
  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!startDate || typeof startDate !== 'string') {
    errors.push('startDate is required');
  } else if (!dateRegex.test(startDate)) {
    errors.push('startDate must be in YYYY-MM-DD format');
  }

  if (!endDate || typeof endDate !== 'string') {
    errors.push('endDate is required');
  } else if (!dateRegex.test(endDate)) {
    errors.push('endDate must be in YYYY-MM-DD format');
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
 * /api/competition-costs:
 *   post:
 *     summary: Create a new competition cost
 *     description: Record a general competition cost (engravings, stationery, equipment, etc.)
 *     tags: [Competition Costs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - amount
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Trophy engraving"
 *               amount:
 *                 type: number
 *                 example: 45.50
 *     responses:
 *       201:
 *         description: Competition cost created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate description
 *       503:
 *         description: Database error
 */
router.post('/', validateCompetitionCostCreate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const dto: CreateCompetitionCostDTO = {
      description: req.body.description,
      amount: req.body.amount,
      transactionDate: req.body.transactionDate // Pass the transaction date from request
    };

    const cost = await distributionService.createCompetitionCost(dto);

    res.status(201).json({
      message: 'Competition cost created successfully',
      cost
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Duplicate description',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && (error.message.includes('must be positive') || error.message.includes('decimal places'))) {
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
 * /api/competition-costs:
 *   get:
 *     summary: Get all competition costs
 *     description: Retrieve all competition costs ordered by date (most recent first) with total
 *     tags: [Competition Costs]
 *     responses:
 *       200:
 *         description: Competition costs retrieved successfully
 *       503:
 *         description: Database error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const summary = await distributionService.getAllCompetitionCosts();

    res.status(200).json({
      costs: summary.costs,
      total: summary.total,
      count: summary.costs.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competition-costs/range:
 *   get:
 *     summary: Get competition costs by date range
 *     description: Retrieve competition costs filtered by date range with total
 *     tags: [Competition Costs]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Competition costs retrieved successfully
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.get('/range', validateDateRange, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const distributionService = new DistributionService(db);
    
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const summary = await distributionService.getCompetitionCostsByDateRange(startDate, endDate);

    res.status(200).json({
      costs: summary.costs,
      total: summary.total,
      count: summary.costs.length,
      startDate,
      endDate
    });
  } catch (error) {
    next(error);
  }
});

export default router;
