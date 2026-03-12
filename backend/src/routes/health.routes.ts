import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';

const router = Router();

// Package version (would typically come from package.json)
const VERSION = '1.0.0';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Check if the application is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: Database connectivity check
 *     description: Check if the database connection is working
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is connected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthCheck'
 *                 - type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "connected"
 *       503:
 *         description: Database is disconnected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthCheck'
 *                 - type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "disconnected"
 *                     error:
 *                       type: string
 */
router.get('/db', async (req: Request, res: Response) => {
  const db = (req as any).db as DatabaseService;
  
  try {
    await db.query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      version: VERSION,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Check if both application and database are ready to serve requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 *                 application:
 *                   type: string
 *                   example: "ok"
 *                 database:
 *                   type: string
 *                   example: "connected"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "not ready"
 *                 application:
 *                   type: string
 *                   example: "ok"
 *                 database:
 *                   type: string
 *                   example: "disconnected"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 */
router.get('/ready', async (req: Request, res: Response) => {
  const db = (req as any).db as DatabaseService;
  
  try {
    await db.query('SELECT NOW()');
    res.status(200).json({
      status: 'ready',
      application: 'ok',
      database: 'connected',
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      application: 'ok',
      database: 'disconnected',
      version: VERSION,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
