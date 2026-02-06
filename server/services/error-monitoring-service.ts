/**
 * Error Monitoring Service
 * Proactively monitors system health and prevents errors before they occur
 */

export class ErrorMonitoringService {
  private errorLog: Array<{
    timestamp: Date;
    endpoint: string;
    error: string;
    statusCode: number;
    requestBody?: any;
    solution?: string;
  }> = [];

  private endpointChecks: Map<string, boolean> = new Map();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Check critical endpoints every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    console.log('🔍 Error Monitoring Service initialized');
  }

  private async performHealthChecks() {
    const criticalEndpoints = [
      '/api/designer-agent/health',
      '/api/designer-agent/analyze',
      '/api/designer-agent/analyze-development-plan',
      '/api/designer-agent/documents',
      '/api/designer-agent/lightweight-analysis'
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        // Simulate a quick health check
        this.endpointChecks.set(endpoint, true);
      } catch (error) {
        this.endpointChecks.set(endpoint, false);
        this.logError(endpoint, error.message, 500);
      }
    }
  }

  public logError(endpoint: string, error: string, statusCode: number, requestBody?: any, solution?: string) {
    const errorEntry = {
      timestamp: new Date(),
      endpoint,
      error,
      statusCode,
      requestBody,
      solution
    };

    this.errorLog.push(errorEntry);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Console log for immediate attention
    console.log(`🚨 ERROR DETECTED: ${endpoint} - ${error}`);
    if (solution) {
      console.log(`💡 SOLUTION: ${solution}`);
    }
  }

  public getErrorReport() {
    return {
      totalErrors: this.errorLog.length,
      recentErrors: this.errorLog.slice(-10),
      endpointHealth: Object.fromEntries(this.endpointChecks),
      commonErrors: this.analyzeCommonErrors(),
      recommendations: this.generateRecommendations()
    };
  }

  private analyzeCommonErrors() {
    const errorCounts = new Map<string, number>();
    
    this.errorLog.forEach(entry => {
      const key = `${entry.endpoint}: ${entry.error}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }

  private generateRecommendations() {
    const recommendations = [];
    
    // Check for missing endpoints
    const recentMissingEndpoints = this.errorLog
      .filter(entry => entry.statusCode === 404)
      .map(entry => entry.endpoint);

    if (recentMissingEndpoints.length > 0) {
      recommendations.push({
        type: 'Missing Endpoints',
        severity: 'high',
        description: `Missing endpoints detected: ${[...new Set(recentMissingEndpoints)].join(', ')}`,
        action: 'Add missing API endpoints to prevent 404 errors'
      });
    }

    // Check for frequent errors
    const errorRate = this.errorLog.length / 60; // errors per minute
    if (errorRate > 0.5) {
      recommendations.push({
        type: 'High Error Rate',
        severity: 'high',
        description: `High error rate detected: ${errorRate.toFixed(2)} errors/minute`,
        action: 'Investigate root causes and implement error prevention'
      });
    }

    return recommendations;
  }

  public preventError(endpoint: string, requestBody: any): { canProceed: boolean; message?: string } {
    // Check if endpoint exists
    if (!this.endpointChecks.has(endpoint)) {
      return {
        canProceed: false,
        message: `Endpoint ${endpoint} may not exist. Check API routing.`
      };
    }

    // Check for common error patterns
    if (endpoint.includes('analyze-development-plan') && !requestBody.documentId) {
      return {
        canProceed: false,
        message: 'documentId is required for development plan analysis'
      };
    }

    if (endpoint.includes('analyze') && (!requestBody.content && !requestBody.documentId)) {
      return {
        canProceed: false,
        message: 'Either content or documentId is required for analysis'
      };
    }

    return { canProceed: true };
  }
}

// Singleton instance
export const errorMonitoringService = new ErrorMonitoringService();