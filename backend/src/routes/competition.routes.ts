import { Router, Request, Response, NextFunction } from 'express';
import { CompetitionService } from '../services/competition.service';
import { DatabaseService } from '../services/database.service';
import { CreateCompetitionDTO, UpdateCompetitionDTO } from '../types';
import { validateCompetitionCreate, validateCompetitionUpdate, validateNumericId, DatabaseError } from '../middleware';

const router = Router();

/**
 * @swagger
 * /api/competitions:
 *   post:
 *     summary: Create a new competition
 *     description: Create a new competition record with name, date, type, season, and optional details
 *     tags: [Competitions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *               - type
 *               - seasonId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Weekly Medal"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               type:
 *                 type: string
 *                 enum: [singles, doubles]
 *                 example: "singles"
 *               seasonId:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: "Weekly medal competition"
 *               prizeStructure:
 *                 type: string
 *                 example: "1st: £50, 2nd: £30, 3rd: £20"
 *     responses:
 *       201:
 *         description: Competition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Competition created successfully"
 *                 competition:
 *                   $ref: '#/components/schemas/Competition'
 *       400:
 *         description: Validation error
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
router.post('/', validateCompetitionCreate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const competitionService = new CompetitionService(db);
    
    const dto: CreateCompetitionDTO = {
      name: req.body.name,
      date: req.body.date,
      type: req.body.type,
      seasonId: req.body.seasonId,
      description: req.body.description,
      prizeStructure: req.body.prizeStructure
    };

    const competition = await competitionService.createCompetition(dto);

    res.status(201).json({
      message: 'Competition created successfully',
      competition
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
 * /api/competitions:
 *   get:
 *     summary: Get all competitions
 *     description: Retrieve all competition records ordered by date, optionally filtered by season
 *     tags: [Competitions]
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         schema:
 *           type: integer
 *         description: Filter competitions by presentation season ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Competitions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 competitions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competition'
 *                 count:
 *                   type: integer
 *                   example: 10
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
    const competitionService = new CompetitionService(db);
    
    // Parse seasonId query parameter if provided
    const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string, 10) : undefined;
    
    // Validate seasonId if provided
    if (seasonId !== undefined && (isNaN(seasonId) || seasonId <= 0)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['seasonId must be a positive integer']
      });
    }

    const competitions = await competitionService.getAllCompetitions(seasonId);

    res.status(200).json({
      competitions,
      count: competitions.length
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
 * /api/competitions/{id}:
 *   put:
 *     summary: Update a competition
 *     description: Update an existing competition's details
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Competition ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Monthly Medal"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-20"
 *               type:
 *                 type: string
 *                 enum: [singles, doubles]
 *                 example: "doubles"
 *               seasonId:
 *                 type: integer
 *                 example: 2
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               prizeStructure:
 *                 type: string
 *                 example: "1st: £60, 2nd: £40"
 *     responses:
 *       200:
 *         description: Competition updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Competition updated successfully"
 *                 competition:
 *                   $ref: '#/components/schemas/Competition'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Competition not found
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
router.put('/:id', validateNumericId, validateCompetitionUpdate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const competitionService = new CompetitionService(db);
    
    const id = parseInt(req.params.id, 10);

    const updates: UpdateCompetitionDTO = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.date !== undefined) updates.date = req.body.date;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.seasonId !== undefined) updates.seasonId = req.body.seasonId;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.prizeStructure !== undefined) updates.prizeStructure = req.body.prizeStructure;

    const competition = await competitionService.updateCompetition(id, updates);

    return res.status(200).json({
      message: 'Competition updated successfully',
      competition
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
 * /api/competitions/{id}:
 *   delete:
 *     summary: Delete a competition
 *     description: Delete a competition and all associated flagged transaction associations
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Competition ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Competition deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Competition deleted successfully"
 *       404:
 *         description: Competition not found
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
    const competitionService = new CompetitionService(db);
    
    const id = parseInt(req.params.id, 10);

    await competitionService.deleteCompetition(id);

    return res.status(200).json({
      message: 'Competition deleted successfully'
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
