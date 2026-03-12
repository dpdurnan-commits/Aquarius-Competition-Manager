import { Router, Request, Response, NextFunction } from 'express';
import { SummaryService } from '../services/summary.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// Validation middleware for date range queries
function validateDateRange(req: Request, res: Response, next: NextFunction) {
  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
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
  }

  next();
}

/**
 * @swagger
 * /api/summaries/weekly:
 *   get:
 *     summary: Calculate weekly financial summaries
 *     description: Calculate and return weekly summaries for all transactions or filtered by date range. Summaries are grouped by Monday-Sunday periods.
 *     tags: [Summaries]
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
 *     responses:
 *       200:
 *         description: Weekly summaries calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summaries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WeeklySummary'
 *                 count:
 *                   type: integer
 *                   example: 4
 *       400:
 *         description: Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/weekly', validateDateRange, async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const summaryService = new SummaryService(db);
    
    const { startDate, endDate } = req.query;

    let summaries;

    if (startDate && endDate) {
      summaries = await summaryService.calculateWeeklySummaries(
        startDate as string,
        endDate as string
      );
    } else {
      summaries = await summaryService.calculateWeeklySummaries();
    }

    return res.status(200).json({
      summaries,
      count: summaries.length
    });
  } catch (error) {
    console.error('Weekly summary calculation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
