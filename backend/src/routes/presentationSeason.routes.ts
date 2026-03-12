import { Router, Request, Response, NextFunction } from 'express';
import { PresentationSeasonService } from '../services/presentationSeason.service';
import { DatabaseService } from '../services/database.service';
import { CreateSeasonDTO, UpdateSeasonDTO } from '../types';
import { validateNumericId } from '../middleware';

const router = Router();

// Validation middleware for season creation
function validateSeasonCreate(req: Request, res: Response, next: NextFunction): void {
  const { name, startYear, endYear } = req.body;
  const errors: string[] = [];
  const nameRegex = /^Season: Winter \d{2}-Summer \d{2}$/;

  // Log received data for debugging
  console.log('[DEBUG] Season creation request body:', JSON.stringify(req.body));

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  } else if (!nameRegex.test(name)) {
    errors.push('name must match format "Season: Winter YY-Summer YY"');
  }

  if (startYear === undefined || startYear === null) {
    errors.push('startYear is required');
  } else if (typeof startYear !== 'number' || !Number.isInteger(startYear)) {
    errors.push('startYear must be an integer');
  }

  if (endYear === undefined || endYear === null) {
    errors.push('endYear is required');
  } else if (typeof endYear !== 'number' || !Number.isInteger(endYear)) {
    errors.push('endYear must be an integer');
  }

  if (errors.length > 0) {
    console.log('[DEBUG] Validation errors:', errors);
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

// Validation middleware for season update
function validateSeasonUpdate(req: Request, res: Response, next: NextFunction): void {
  const { name, startYear, endYear, isActive, allCompetitionsAdded } = req.body;
  const errors: string[] = [];
  const nameRegex = /^Season: Winter \d{2}-Summer \d{2}$/;

  // At least one field must be provided
  if (name === undefined && startYear === undefined && endYear === undefined && isActive === undefined && allCompetitionsAdded === undefined) {
    errors.push('At least one field must be provided for update');
  }

  // Validate name format if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push('name must be a non-empty string');
    } else if (!nameRegex.test(name)) {
      errors.push('name must match format "Season: Winter YY-Summer YY"');
    }
  }

  // Validate startYear if provided
  if (startYear !== undefined && (typeof startYear !== 'number' || !Number.isInteger(startYear))) {
    errors.push('startYear must be an integer');
  }

  // Validate endYear if provided
  if (endYear !== undefined && (typeof endYear !== 'number' || !Number.isInteger(endYear))) {
    errors.push('endYear must be an integer');
  }

  // Validate isActive if provided
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  // Validate allCompetitionsAdded if provided
  if (allCompetitionsAdded !== undefined && typeof allCompetitionsAdded !== 'boolean') {
    errors.push('allCompetitionsAdded must be a boolean');
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
 * /api/presentation-seasons:
 *   post:
 *     summary: Create a new presentation season
 *     description: Create a new presentation season with format "Season: Winter YY-Summer YY"
 *     tags: [Presentation Seasons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startYear
 *               - endYear
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Season: Winter 25-Summer 26"
 *               startYear:
 *                 type: integer
 *                 example: 25
 *               endYear:
 *                 type: integer
 *                 example: 26
 *     responses:
 *       201:
 *         description: Season created successfully
 *       400:
 *         description: Validation error
 *       503:
 *         description: Database error
 */
router.post('/', validateSeasonCreate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const dto: CreateSeasonDTO = {
      name: req.body.name,
      startYear: req.body.startYear,
      endYear: req.body.endYear
    };

    const season = await seasonService.createSeason(dto);

    res.status(201).json({
      message: 'Presentation season created successfully',
      season
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid season name format')) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('Start year must be less than or equal to end year')) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'A season with this name already exists'
      });
      return;
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/presentation-seasons:
 *   get:
 *     summary: Get all presentation seasons
 *     description: Retrieve all presentation seasons ordered chronologically, optionally filtered by allCompetitionsAdded status
 *     tags: [Presentation Seasons]
 *     parameters:
 *       - in: query
 *         name: allCompetitionsAdded
 *         schema:
 *           type: boolean
 *         description: Filter seasons by allCompetitionsAdded status (true or false)
 *     responses:
 *       200:
 *         description: Seasons retrieved successfully
 *       503:
 *         description: Database error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    // Parse the query parameter
    let allCompetitionsAdded: boolean | undefined;
    if (req.query.allCompetitionsAdded !== undefined) {
      const value = req.query.allCompetitionsAdded as string;
      allCompetitionsAdded = value === 'true';
    }
    
    const seasons = await seasonService.getAllSeasons(allCompetitionsAdded);

    res.status(200).json({
      seasons,
      count: seasons.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/presentation-seasons/active:
 *   get:
 *     summary: Get the active presentation season
 *     description: Retrieve the currently active presentation season
 *     tags: [Presentation Seasons]
 *     responses:
 *       200:
 *         description: Active season retrieved successfully
 *       503:
 *         description: Database error
 */
router.get('/active', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const season = await seasonService.getActiveSeason();

    res.status(200).json({
      season
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/presentation-seasons/{id}:
 *   put:
 *     summary: Update a presentation season
 *     description: Update an existing presentation season's details
 *     tags: [Presentation Seasons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Season ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Season: Winter 26-Summer 27"
 *               startYear:
 *                 type: integer
 *                 example: 26
 *               endYear:
 *                 type: integer
 *                 example: 27
 *               isActive:
 *                 type: boolean
 *                 example: false
 *               allCompetitionsAdded:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Season updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Season not found
 *       503:
 *         description: Database error
 */
router.put('/:id', validateNumericId, validateSeasonUpdate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const id = parseInt(req.params.id, 10);

    const updates: UpdateSeasonDTO = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.startYear !== undefined) updates.startYear = req.body.startYear;
    if (req.body.endYear !== undefined) updates.endYear = req.body.endYear;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.allCompetitionsAdded !== undefined) updates.allCompetitionsAdded = req.body.allCompetitionsAdded;

    const season = await seasonService.updateSeason(id, updates);

    res.status(200).json({
      message: 'Presentation season updated successfully',
      season
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not found',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('Invalid season name format')) {
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
 * /api/presentation-seasons/{id}:
 *   patch:
 *     summary: Partially update a presentation season
 *     description: Update one or more fields of an existing presentation season
 *     tags: [Presentation Seasons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Season ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Season: Winter 26-Summer 27"
 *               startYear:
 *                 type: integer
 *                 example: 26
 *               endYear:
 *                 type: integer
 *                 example: 27
 *               isActive:
 *                 type: boolean
 *                 example: false
 *               allCompetitionsAdded:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Season updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Season not found
 *       503:
 *         description: Database error
 */
router.patch('/:id', validateNumericId, validateSeasonUpdate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const id = parseInt(req.params.id, 10);

    const updates: UpdateSeasonDTO = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.startYear !== undefined) updates.startYear = req.body.startYear;
    if (req.body.endYear !== undefined) updates.endYear = req.body.endYear;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.allCompetitionsAdded !== undefined) updates.allCompetitionsAdded = req.body.allCompetitionsAdded;

    const season = await seasonService.updateSeason(id, updates);

    res.status(200).json({
      message: 'Presentation season updated successfully',
      season
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not found',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('Invalid season name format')) {
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
 * /api/presentation-seasons/{id}/activate:
 *   put:
 *     summary: Set a season as active
 *     description: Set the specified season as active and deactivate all others
 *     tags: [Presentation Seasons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Season ID
 *     responses:
 *       200:
 *         description: Season activated successfully
 *       404:
 *         description: Season not found
 *       503:
 *         description: Database error
 */
router.put('/:id/activate', validateNumericId, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const id = parseInt(req.params.id, 10);

    const season = await seasonService.setActiveSeason(id);

    res.status(200).json({
      message: 'Presentation season activated successfully',
      season
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
 * /api/presentation-seasons/auto-increment:
 *   post:
 *     summary: Auto-increment to create next season
 *     description: Create the next presentation season by incrementing the most recent season's years
 *     tags: [Presentation Seasons]
 *     responses:
 *       201:
 *         description: Season created successfully
 *       400:
 *         description: No existing seasons to increment from
 *       503:
 *         description: Database error
 */
router.post('/auto-increment', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const season = await seasonService.autoIncrementSeason();

    res.status(201).json({
      message: 'Presentation season auto-incremented successfully',
      season
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No existing seasons')) {
      res.status(400).json({
        error: 'Bad request',
        message: error.message
      });
      return;
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/presentation-seasons/{id}:
 *   delete:
 *     summary: Delete a presentation season
 *     description: Delete a presentation season if no competitions are associated
 *     tags: [Presentation Seasons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Season ID
 *     responses:
 *       200:
 *         description: Season deleted successfully
 *       400:
 *         description: Cannot delete season with associated competitions
 *       404:
 *         description: Season not found
 *       503:
 *         description: Database error
 */
router.delete('/:id', validateNumericId, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const seasonService = new PresentationSeasonService(db);
    
    const id = parseInt(req.params.id, 10);

    await seasonService.deleteSeason(id);

    res.status(200).json({
      message: 'Presentation season deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not found',
        message: error.message
      });
      return;
    }
    if (error instanceof Error && error.message.includes('Cannot delete season')) {
      res.status(400).json({
        error: 'Bad request',
        message: error.message
      });
      return;
    }
    next(error);
  }
});

export default router;
