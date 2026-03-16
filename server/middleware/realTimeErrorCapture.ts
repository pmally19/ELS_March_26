/**
 * Real-time Error Capture Middleware
 * Captures all errors immediately as they occur
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

interface ErrorCapture {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  errorMessage: string;
  requestBody: any;
  userAgent: string;
  stackTrace?: string;
}

class RealTimeErrorCapture {
  private errorBuffer: ErrorCapture[] = [];

  async captureError(req: Request, res: Response, error: any): Promise<void> {
    const errorCapture: ErrorCapture = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode || 500,
      errorMessage: error.message || error.toString(),
      requestBody: req.body,
      userAgent: req.get('User-Agent') || 'unknown',
      stackTrace: error.stack
    };

    // Add to buffer
    this.errorBuffer.push(errorCapture);

    // Log immediately to console with highlight
    console.log('\n🚨🚨🚨 REAL-TIME ERROR CAPTURED 🚨🚨🚨');
    console.log(`Timestamp: ${errorCapture.timestamp}`);
    console.log(`Method: ${errorCapture.method} ${errorCapture.url}`);
    console.log(`Status: ${errorCapture.statusCode}`);
    console.log(`Error: ${errorCapture.errorMessage}`);
    console.log(`Request Body:`, JSON.stringify(errorCapture.requestBody, null, 2));

    // Show full error data if available
    if (error.data) {
      console.log(`Response Data:`, typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2));
    }

    if (errorCapture.stackTrace) {
      console.log(`Stack Trace: ${errorCapture.stackTrace}`);
    }
    console.log('🚨🚨🚨 END ERROR CAPTURE 🚨🚨🚨\n');

    // Store in database
    try {
      await pool.query(`
        INSERT INTO comprehensive_issues_log 
        (error_message, module, operation, severity, category, request_data, stack_trace, user_impact, resolution_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        errorCapture.errorMessage,
        this.extractModule(errorCapture.url),
        `${errorCapture.method} ${errorCapture.url}`,
        'HIGH',
        'SYSTEM',
        JSON.stringify(errorCapture.requestBody),
        errorCapture.stackTrace,
        'User operation failed',
        'PENDING'
      ]);
    } catch (dbError) {
      console.error('Failed to store error in database:', dbError);
    }
  }

  private extractModule(url: string): string {
    if (url.includes('/master-data/')) return 'MASTER_DATA';
    if (url.includes('/sales/')) return 'SALES';
    if (url.includes('/finance/')) return 'FINANCE';
    if (url.includes('/inventory/')) return 'INVENTORY';
    if (url.includes('/purchase/')) return 'PURCHASE';
    if (url.includes('/production/')) return 'PRODUCTION';
    if (url.includes('/controlling/')) return 'CONTROLLING';
    return 'SYSTEM';
  }

  getRecentErrors(count: number = 5): ErrorCapture[] {
    return this.errorBuffer.slice(-count);
  }

  clearBuffer(): void {
    this.errorBuffer = [];
  }
}

export const realTimeErrorCapture = new RealTimeErrorCapture();

// Middleware function
export function errorCaptureMiddleware(error: any, req: Request, res: Response, next: NextFunction) {
  // Capture the error immediately
  realTimeErrorCapture.captureError(req, res, error);

  // Continue with normal error handling
  next(error);
}

// Response interceptor to catch failed responses
export function responseInterceptor(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    if (res.statusCode >= 400) {
      realTimeErrorCapture.captureError(req, res, {
        message: `HTTP ${res.statusCode} Error`,
        data: data
      });
    }
    return originalSend.call(this, data);
  };

  res.json = function (data) {
    if (res.statusCode >= 400) {
      realTimeErrorCapture.captureError(req, res, {
        message: `HTTP ${res.statusCode} Error`,
        data: data
      });
    }
    return originalJson.call(this, data);
  };

  next();
}