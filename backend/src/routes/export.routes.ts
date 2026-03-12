import { Router, Request, Response } from 'express';
import { ExportService } from '../services/export.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// GET /api/export/transactions - export all transactions as JSON
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const exportService = new ExportService(db);
    
    const transactions = await exportService.exportTransactions();

    res.status(200).json({
      transactions,
      count: transactions.length,
      exportTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transaction export error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/export/competitions - export all competitions as JSON
router.get('/competitions', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const exportService = new ExportService(db);
    
    const competitions = await exportService.exportCompetitions();

    res.status(200).json({
      competitions,
      count: competitions.length,
      exportTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Competition export error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/export/all - export complete database
router.get('/all', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseService;
    const exportService = new ExportService(db);
    
    const completeExport = await exportService.exportAll();

    res.status(200).json(completeExport);
  } catch (error) {
    console.error('Complete export error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
