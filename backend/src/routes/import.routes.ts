import { Router, Request, Response } from 'express';
import { ImportService } from '../services/import.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// POST /api/import/backup - restore from backup file
router.post('/backup', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const importService = new ImportService(db);
    
    const backup = req.body;
    const result = await importService.restoreFromBackup(backup);

    if (result.errors.length > 0) {
      return res.status(207).json({
        message: 'Backup restored with errors',
        transactionsImported: result.transactionsImported,
        competitionsImported: result.competitionsImported,
        flaggedTransactionsImported: result.flaggedTransactionsImported,
        errors: result.errors
      });
    }

    return res.status(200).json({
      message: 'Backup restored successfully',
      transactionsImported: result.transactionsImported,
      competitionsImported: result.competitionsImported,
      flaggedTransactionsImported: result.flaggedTransactionsImported
    });
  } catch (error) {
    console.error('Backup restore error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
