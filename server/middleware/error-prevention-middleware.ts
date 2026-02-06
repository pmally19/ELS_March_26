/**
 * Error Prevention Middleware
 * Intercepts requests and prevents common errors before they occur
 */

import { Request, Response, NextFunction } from 'express';
import { errorMonitoringService } from '../services/error-monitoring-service';

export function errorPreventionMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  const originalJson = res.json;

  // Intercept error responses
  res.send = function(body: any) {
    if (res.statusCode >= 400) {
      // Log the error
      errorMonitoringService.logError(
        req.originalUrl,
        `HTTP ${res.statusCode} Error`,
        res.statusCode,
        req.body,
        getSolutionForError(req.originalUrl, res.statusCode)
      );
    }
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    if (res.statusCode >= 400) {
      // Log the error
      errorMonitoringService.logError(
        req.originalUrl,
        body.error || body.message || `HTTP ${res.statusCode} Error`,
        res.statusCode,
        req.body,
        getSolutionForError(req.originalUrl, res.statusCode)
      );
    }
    return originalJson.call(this, body);
  };

  // Prevent known errors
  const preventionResult = errorMonitoringService.preventError(req.originalUrl, req.body);
  if (!preventionResult.canProceed) {
    return res.status(400).json({
      success: false,
      error: 'Request prevented to avoid error',
      details: preventionResult.message,
      preventedError: true
    });
  }

  next();
}

function getSolutionForError(endpoint: string, statusCode: number): string | undefined {
  const solutions: { [key: string]: string } = {
    '/api/designer-agent/analyze-development-plan_404': 'Add the analyze-development-plan endpoint to designer-agent-routes.ts',
    '/api/designer-agent/analyze_400': 'Ensure content and fileName are provided in request body',
    '/api/designer-agent/documents_500': 'Check database connection and designer_documents table exists'
  };

  const key = `${endpoint}_${statusCode}`;
  return solutions[key];
}