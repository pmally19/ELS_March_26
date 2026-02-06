/**
 * Error Monitoring Dashboard Component
 * Real-time system health monitoring and error prevention
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Activity, TrendingUp } from 'lucide-react';

interface ErrorReport {
  totalErrors: number;
  recentErrors: Array<{
    timestamp: string;
    endpoint: string;
    error: string;
    statusCode: number;
    requestBody?: any;
    solution?: string;
  }>;
  endpointHealth: { [key: string]: boolean };
  commonErrors: Array<{
    error: string;
    count: number;
  }>;
  recommendations: Array<{
    type: string;
    severity: string;
    description: string;
    action: string;
  }>;
}

const ErrorMonitoringDashboard: React.FC = () => {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const { data: errorReport, isLoading, error, refetch } = useQuery<ErrorReport>({
    queryKey: ['/api/designer-agent/error-report'],
    refetchInterval: isAutoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Calculate system health percentage
  const systemHealth = errorReport ? 
    Math.round((Object.values(errorReport.endpointHealth).filter(Boolean).length / Object.values(errorReport.endpointHealth).length) * 100) : 0;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode < 400) return 'text-green-600';
    if (statusCode < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading error monitoring dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load error monitoring data. Please check system connectivity.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Monitoring Dashboard</h2>
          <p className="text-muted-foreground">Real-time system health and error prevention</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh: {isAutoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {systemHealth > 80 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-2xl font-bold">{systemHealth}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.values(errorReport?.endpointHealth || {}).filter(Boolean).length} / {Object.values(errorReport?.endpointHealth || {}).length} endpoints healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{errorReport?.totalErrors || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {errorReport?.recentErrors.length || 0} recent errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">
                {errorReport?.totalErrors ? (errorReport.totalErrors / 60).toFixed(2) : '0.00'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">errors per minute</p>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health Status</CardTitle>
          <CardDescription>Real-time monitoring of critical API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(errorReport?.endpointHealth || {}).map(([endpoint, isHealthy]) => (
              <div key={endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium truncate">{endpoint}</span>
                <Badge variant={isHealthy ? 'default' : 'destructive'}>
                  {isHealthy ? 'Healthy' : 'Down'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest system errors with solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errorReport?.recentErrors.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No recent errors detected</p>
              </div>
            ) : (
              errorReport?.recentErrors.map((error, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{error.endpoint}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(error.statusCode)}>
                        {error.statusCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{error.error}</p>
                  {error.solution && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Solution:</strong> {error.solution}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Common Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Common Error Patterns</CardTitle>
          <CardDescription>Most frequent errors requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errorReport?.commonErrors.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No common error patterns detected</p>
            ) : (
              errorReport?.commonErrors.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{error.error}</span>
                  <Badge variant="secondary">{error.count} occurrences</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>System Recommendations</CardTitle>
          <CardDescription>Proactive suggestions to prevent errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errorReport?.recommendations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No recommendations - system is running smoothly</p>
              </div>
            ) : (
              errorReport?.recommendations.map((rec, index) => (
                <Alert key={index} variant={rec.severity === 'high' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong>{rec.type}</strong>
                        <Badge variant={getSeverityColor(rec.severity) as any}>
                          {rec.severity}
                        </Badge>
                      </div>
                      <p className="text-sm">{rec.description}</p>
                      <p className="text-sm font-medium">Action: {rec.action}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorMonitoringDashboard;