import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  Database,
  FileText,
  Zap,
  ArrowUp,
  ArrowDown,
  Activity
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TileHealthData {
  timestamp: string;
  overall_status: string;
  tiles_operational: number;
  tiles_missing: number;
  critical_infrastructure: {
    document_number_ranges: {
      status: string;
      endpoints: number;
      last_check: string;
    };
    document_posting_system: {
      status: string;
      endpoints: number;
      last_check: string;
    };
    automatic_clearing: {
      status: string;
      endpoints: number;
      last_check: string;
    };
  };
  performance_metrics: {
    response_time_avg: string;
    success_rate: string;
    error_count_24h: number;
    uptime: string;
  };
}

export default function ApplicationTilesStatus() {
  const [isRestoring, setIsRestoring] = useState(false);
  const queryClient = useQueryClient();

  // Health check query
  const { data: healthData, isLoading, refetch } = useQuery<{
    success: boolean;
    data: TileHealthData;
    message: string;
  }>({
    queryKey: ['/api/application-tiles/health-check'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Restoration mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/application-tiles/restore-tiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to restore tiles');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Restoration Initiated",
        description: "Application tiles restoration has been started successfully",
      });
      setIsRestoring(false);
      queryClient.invalidateQueries({ queryKey: ['/api/application-tiles/health-check'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Restoration Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsRestoring(false);
    },
  });

  const handleRestore = () => {
    setIsRestoring(true);
    restoreMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading application tiles status...</p>
          </div>
        </div>
      </div>
    );
  }

  const health = healthData?.data;
  if (!health) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load application tiles status. Please try refreshing.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate progress percentage
  const targetTiles = 71; // July 1 level
  const progressPercentage = (health.tiles_operational / targetTiles) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Application Tiles Status</h2>
          <p className="text-muted-foreground">
            Sheet 1 - Application Tile Lists in Trans Monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handleRestore} 
            disabled={isRestoring || restoreMutation.isPending}
            className="min-w-[120px]"
          >
            {isRestoring || restoreMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Restore Tiles
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {health.tiles_missing > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Issue:</strong> {health.tiles_missing} application tiles are missing 
            (reduced from 71 on July 1 to {health.tiles_operational} on July 7). 
            Critical infrastructure restoration is required.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Tiles</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.tiles_operational}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progressPercentage} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 71 tiles (July 1 level)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Tiles</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{health.tiles_missing}</div>
            <p className="text-xs text-muted-foreground">
              Need to restore to reach July 1 levels
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {health.performance_metrics.success_rate}
            </div>
            <p className="text-xs text-muted-foreground">
              24h performance metric
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {health.performance_metrics.response_time_avg}
            </div>
            <p className="text-xs text-muted-foreground">
              Average API response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Infrastructure Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Critical Infrastructure Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Document Number Ranges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Document Number Ranges</h4>
                <Badge className={getStatusColor(health.critical_infrastructure.document_number_ranges.status)}>
                  {getStatusIcon(health.critical_infrastructure.document_number_ranges.status)}
                  <span className="ml-1">{health.critical_infrastructure.document_number_ranges.status}</span>
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Endpoints: {health.critical_infrastructure.document_number_ranges.endpoints}</p>
                <p>Last Check: {new Date(health.critical_infrastructure.document_number_ranges.last_check).toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Document Posting System */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Document Posting System</h4>
                <Badge className={getStatusColor(health.critical_infrastructure.document_posting_system.status)}>
                  {getStatusIcon(health.critical_infrastructure.document_posting_system.status)}
                  <span className="ml-1">{health.critical_infrastructure.document_posting_system.status}</span>
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Endpoints: {health.critical_infrastructure.document_posting_system.endpoints}</p>
                <p>Last Check: {new Date(health.critical_infrastructure.document_posting_system.last_check).toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Automatic Clearing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Automatic Clearing</h4>
                <Badge className={getStatusColor(health.critical_infrastructure.automatic_clearing.status)}>
                  {getStatusIcon(health.critical_infrastructure.automatic_clearing.status)}
                  <span className="ml-1">{health.critical_infrastructure.automatic_clearing.status}</span>
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Endpoints: {health.critical_infrastructure.automatic_clearing.endpoints}</p>
                <p>Last Check: {new Date(health.critical_infrastructure.automatic_clearing.last_check).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {health.performance_metrics.uptime}
              </div>
              <p className="text-sm text-muted-foreground">System Uptime</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {health.performance_metrics.success_rate}
              </div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {health.performance_metrics.error_count_24h}
              </div>
              <p className="text-sm text-muted-foreground">Errors (24h)</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {health.performance_metrics.response_time_avg}
              </div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  );
}