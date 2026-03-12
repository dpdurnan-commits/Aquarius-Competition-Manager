import { Router, Request, Response } from 'express';
import multer from 'multer';
import { CSVService } from '../services/csv.service';
import { TransactionService } from '../services/transaction.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// Configure multer for file uploads
// Store in memory with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
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
 * /api/import/csv:
 *   post:
 *     summary: Import CSV file
 *     description: Upload and import a CSV file containing transaction records. The server will parse, transform, validate chronology, and store the records.
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to upload (max 10MB)
 *     responses:
 *       201:
 *         description: CSV import successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "CSV import successful"
 *                 imported:
 *                   type: integer
 *                   example: 150
 *                 transformWarnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *                 importErrors:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: []
 *       400:
 *         description: Validation error or parsing error
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['No file uploaded. Please provide a CSV file.']
      });
    }

    const db = req.app.locals.db as DatabaseService;
    const csvService = new CSVService();
    const transactionService = new TransactionService(db);

    // Step 1: Parse CSV
    const text = req.file.buffer.toString('utf-8');
    const parseResult = csvService.parseCSV(text);

    if (!parseResult.success || !parseResult.rows) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        message: parseResult.error
      });
    }

    // Step 2: Transform records
    const transformResult = csvService.transformRecords(parseResult.rows);

    if (transformResult.records.length === 0) {
      return res.status(400).json({
        error: 'No valid records found',
        message: 'The CSV file does not contain any valid competition records.',
        warnings: transformResult.errors
      });
    }

    // Step 3: Import transactions (includes field extraction and chronological validation)
    try {
      const importResult = await transactionService.importTransactions(transformResult.records);

      // Return success with summary
      return res.status(201).json({
        message: 'CSV import successful',
        imported: importResult.imported,
        transformWarnings: transformResult.errors,
        importErrors: importResult.errors
      });
    } catch (error) {
      // Handle chronological validation errors
      if (error instanceof Error && error.message.includes('Import rejected')) {
        return res.status(409).json({
          error: 'Chronological validation failed',
          message: error.message
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('CSV import error:', error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'CSV file must be smaller than 10MB'
        });
      }
      return res.status(400).json({
        error: 'File upload error',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
