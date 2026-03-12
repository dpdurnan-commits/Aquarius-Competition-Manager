import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { CSVParserService } from '../services/csvParser.service';
import { CSVFormatterService } from '../services/csvFormatter.service';
import { CompetitionResultService } from '../services/competitionResult.service';
import { CompetitionService } from '../services/competition.service';
import { DatabaseService } from '../services/database.service';
import { DatabaseError } from '../middleware';

const router = Router();

// Configure multer for file uploads
// Store in memory with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      return cb(null, true);
    } else {
      return cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/csv/upload/singles:
 *   post:
 *     summary: Upload singles competition CSV
 *     description: Upload and parse a CSV file containing singles competition results
 *     tags: [CSV Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - competitionId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to upload (max 5MB)
 *               competitionId:
 *                 type: integer
 *                 description: Competition ID to associate results with
 *     responses:
 *       201:
 *         description: CSV uploaded and results created successfully
 *       400:
 *         description: Validation error or parsing error
 *       404:
 *         description: Competition not found
 *       503:
 *         description: Database error
 */
router.post('/upload/singles', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['No file uploaded. Please provide a CSV file.']
      });
    }

    // Validate competitionId
    const competitionId = req.body.competitionId ? parseInt(req.body.competitionId, 10) : undefined;
    
    if (competitionId === undefined || isNaN(competitionId) || competitionId <= 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId is required and must be a positive integer']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const csvParserService = new CSVParserService();
    const competitionResultService = new CompetitionResultService(db);
    const competitionService = new CompetitionService(db);

    // Verify competition exists and is singles type
    const competition = await competitionService.getCompetitionById(competitionId);
    
    if (!competition) {
      return res.status(404).json({
        error: 'Not found',
        message: `Competition with id ${competitionId} not found`
      });
    }

    if (competition.type !== 'singles') {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Competition ${competitionId} is not a singles competition. Use /upload/doubles endpoint instead.`]
      });
    }

    // Parse CSV
    const text = req.file.buffer.toString('utf-8');
    const parseResult = await csvParserService.parseSinglesCSV(text);

    if (!parseResult.valid || parseResult.errors.length > 0) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        message: 'The CSV file contains validation errors',
        errors: parseResult.errors
      });
    }

    if (parseResult.data.length === 0) {
      return res.status(400).json({
        error: 'No valid records found',
        message: 'The CSV file does not contain any valid competition results.'
      });
    }

    // Set competitionId for all results
    const resultsWithCompetitionId = parseResult.data.map(result => ({
      ...result,
      competitionId
    }));

    // Bulk create results
    const bulkResponse = await competitionResultService.bulkAddResults(resultsWithCompetitionId);

    return res.status(201).json({
      message: `Successfully created ${bulkResponse.created} result(s)`,
      created: bulkResponse.created,
      errors: bulkResponse.errors
    });
  } catch (error) {
    console.error('CSV upload error:', error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'CSV file must be smaller than 5MB'
        });
      }
      return res.status(400).json({
        error: 'File upload error',
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
 * /api/csv/upload/doubles:
 *   post:
 *     summary: Upload doubles competition CSV
 *     description: Upload and parse a CSV file containing doubles competition results
 *     tags: [CSV Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - competitionId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to upload (max 5MB)
 *               competitionId:
 *                 type: integer
 *                 description: Competition ID to associate results with
 *     responses:
 *       201:
 *         description: CSV uploaded and results created successfully
 *       400:
 *         description: Validation error or parsing error
 *       404:
 *         description: Competition not found
 *       503:
 *         description: Database error
 */
router.post('/upload/doubles', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['No file uploaded. Please provide a CSV file.']
      });
    }

    // Validate competitionId
    const competitionId = req.body.competitionId ? parseInt(req.body.competitionId, 10) : undefined;
    
    if (competitionId === undefined || isNaN(competitionId) || competitionId <= 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId is required and must be a positive integer']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const csvParserService = new CSVParserService();
    const competitionResultService = new CompetitionResultService(db);
    const competitionService = new CompetitionService(db);

    // Verify competition exists and is doubles type
    const competition = await competitionService.getCompetitionById(competitionId);
    
    if (!competition) {
      return res.status(404).json({
        error: 'Not found',
        message: `Competition with id ${competitionId} not found`
      });
    }

    if (competition.type !== 'doubles') {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Competition ${competitionId} is not a doubles competition. Use /upload/singles endpoint instead.`]
      });
    }

    // Parse CSV
    const text = req.file.buffer.toString('utf-8');
    const parseResult = await csvParserService.parseDoublesCSV(text);

    if (!parseResult.valid || parseResult.errors.length > 0) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        message: 'The CSV file contains validation errors',
        errors: parseResult.errors
      });
    }

    if (parseResult.data.length === 0) {
      return res.status(400).json({
        error: 'No valid records found',
        message: 'The CSV file does not contain any valid competition results.'
      });
    }

    // Set competitionId for all results
    const resultsWithCompetitionId = parseResult.data.map(result => ({
      ...result,
      competitionId
    }));

    // Bulk create results
    const bulkResponse = await competitionResultService.bulkAddResults(resultsWithCompetitionId);

    return res.status(201).json({
      message: `Successfully created ${bulkResponse.created} result(s)`,
      created: bulkResponse.created,
      errors: bulkResponse.errors
    });
  } catch (error) {
    console.error('CSV upload error:', error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'CSV file must be smaller than 5MB'
        });
      }
      return res.status(400).json({
        error: 'File upload error',
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
 * /api/csv/export/{competitionId}:
 *   get:
 *     summary: Export competition results as CSV
 *     description: Export competition results in CSV format for download
 *     tags: [CSV Upload]
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Competition ID to export results from
 *     responses:
 *       200:
 *         description: CSV file generated successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: Competition not found
 *       503:
 *         description: Database error
 */
router.get('/export/:competitionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const competitionId = parseInt(req.params.competitionId, 10);

    if (isNaN(competitionId) || competitionId <= 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['competitionId must be a positive integer']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const csvFormatterService = new CSVFormatterService();
    const competitionResultService = new CompetitionResultService(db);
    const competitionService = new CompetitionService(db);

    // Get competition to determine type
    const competition = await competitionService.getCompetitionById(competitionId);
    
    if (!competition) {
      return res.status(404).json({
        error: 'Not found',
        message: `Competition with id ${competitionId} not found`
      });
    }

    // Get results
    const results = await competitionResultService.getResultsByCompetition(competitionId);

    if (results.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: `No results found for competition ${competitionId}`
      });
    }

    // Format based on competition type
    let csvContent: string;
    if (competition.type === 'singles') {
      csvContent = csvFormatterService.formatSinglesResults(results);
    } else {
      csvContent = csvFormatterService.formatDoublesResults(results);
    }

    // Set headers for CSV download
    const filename = `${competition.name.replace(/[^a-z0-9]/gi, '_')}_results.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);

    if (error instanceof Error && (error.message.includes('database') || error.message.includes('connection'))) {
      return next(new DatabaseError(error.message));
    }

    next(error);
  }
});

export default router;
