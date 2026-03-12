import { Router, Request, Response, NextFunction } from 'express';
import { SwindleMoneyService } from '../services/swindleMoney.service';
import { DatabaseService } from '../services/database.service';
import { DatabaseError } from '../middleware';

const router = Router();

/**
 * Validation middleware for swindle money population
 */
function validatePopulateRequest(req: Request, res: Response, next: NextFunction): void {
  const { playerName, amount } = req.body;
  const errors: string[] = [];

  if (!playerName || typeof playerName !== 'string' || playerName.trim() === '') {
    errors.push('playerName is required and must be a non-empty string');
  }

  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (typeof amount !== 'number') {
    errors.push('amount must be a number');
  } else if (amount < 0) {
    errors.push('amount must be non-negative');
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
 * /api/swindle-money/populate:
 *   post:
 *     summary: Auto-populate swindle money for a player
 *     description: Find the most recent unpaid competition result for a player and populate the swindle money paid field
 *     tags: [Swindle Money]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerName
 *               - amount
 *             properties:
 *               playerName:
 *                 type: string
 *                 example: "John SMITH"
 *                 description: Name of the player to match
 *               amount:
 *                 type: number
 *                 example: 50.00
 *                 description: Amount of swindle money paid
 *     responses:
 *       200:
 *         description: Swindle money populated successfully (or warning if no match found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 resultId:
 *                   type: integer
 *                   nullable: true
 *                   example: 42
 *                 message:
 *                   type: string
 *                   example: "Successfully populated swindle money (50) for John SMITH in result 42"
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.post('/populate', validatePopulateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const swindleMoneyService = new SwindleMoneyService(db);

    const { playerName, amount } = req.body;

    const result = await swindleMoneyService.populateSwindleMoney(playerName, amount);

    // Return 200 even if no match found (warning case)
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }
    next(error);
  }
});

export default router;
