import { Router, Request, Response } from 'express';
import { errorLogger } from '../utils/errorLogger';

const router = Router();

// Database log routes
router.get('/database/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await errorLogger.getDatabaseLogs(limit);
    res.json({ logs, total: logs.length, source: 'database' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get database logs', error as Error);
    res.status(500).json({ error: 'Failed to retrieve database logs' });
  }
});

router.get('/database/module/:module', async (req: Request, res: Response) => {
  try {
    const { module } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await errorLogger.getDatabaseLogsByModule(module, limit);
    res.json({ logs, module, total: logs.length, source: 'database' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get database module logs', error as Error);
    res.status(500).json({ error: 'Failed to retrieve database module logs' });
  }
});

router.get('/database/stats', async (req: Request, res: Response) => {
  try {
    const stats = await errorLogger.getDatabaseStats();
    res.json({ ...stats, source: 'database' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get database stats', error as Error);
    res.status(500).json({ error: 'Failed to retrieve database statistics' });
  }
});

router.delete('/database/clear', async (req: Request, res: Response) => {
  try {
    await errorLogger.clearDatabaseLogs();
    errorLogger.info('ErrorLogRoutes', 'Database logs cleared by admin request');
    res.json({ message: 'Database logs cleared successfully', source: 'database' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to clear database logs', error as Error);
    res.status(500).json({ error: 'Failed to clear database logs' });
  }
});

// Get recent errors
router.get('/recent', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const errors = errorLogger.getRecentErrors(limit);
    res.json({ errors, total: errors.length });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get recent errors', error as Error);
    res.status(500).json({ error: 'Failed to retrieve error logs' });
  }
});

// Get errors by module
router.get('/module/:module', (req: Request, res: Response) => {
  try {
    const { module } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const errors = errorLogger.getErrorsByModule(module, limit);
    res.json({ errors, module, total: errors.length });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get errors by module', error as Error);
    res.status(500).json({ error: 'Failed to retrieve module errors' });
  }
});

// Get log statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = errorLogger.getLogStats();
    res.json(stats);
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to get log stats', error as Error);
    res.status(500).json({ error: 'Failed to retrieve log statistics' });
  }
});

// Clear all logs (admin only)
router.delete('/clear', (req: Request, res: Response) => {
  try {
    errorLogger.clearLogs();
    errorLogger.info('ErrorLogRoutes', 'Log files cleared by admin request');
    res.json({ message: 'Error logs cleared successfully' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to clear logs', error as Error);
    res.status(500).json({ error: 'Failed to clear error logs' });
  }
});

// Test error logging endpoint
router.post('/test', (req: Request, res: Response) => {
  try {
    const { level, module, message, additionalData } = req.body;
    
    switch (level) {
      case 'error':
        errorLogger.error(module || 'Test', message || 'Test error message', undefined, additionalData);
        break;
      case 'warn':
        errorLogger.warn(module || 'Test', message || 'Test warning message', additionalData);
        break;
      case 'info':
        errorLogger.info(module || 'Test', message || 'Test info message', additionalData);
        break;
      default:
        errorLogger.info('Test', 'Test log entry created');
    }
    
    res.json({ message: 'Test log entry created successfully' });
  } catch (error) {
    errorLogger.error('ErrorLogRoutes', 'Failed to create test log', error as Error);
    res.status(500).json({ error: 'Failed to create test log entry' });
  }
});

export default router;