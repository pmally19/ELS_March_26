import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Cloud, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Shield,
  Activity,
  Server
} from 'lucide-react';

interface SyncStatus {
  connected: boolean;
  host?: string;
  database?: string;
}

interface SyncResult {
  success: boolean;
  summary?: {
    timestamp: string;
    tablesProcessed: number;
    successfulTables: number;
    failedTables: number;
    totalRecordsSynced: number;
    errors: string[];
  };
}

export function AWSSync() {
  const [connectionStatus, setConnectionStatus] = useState<SyncStatus>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
    fetchSyncLogs();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/aws-sync/connection-status');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const response = await fetch('/api/aws-sync/sync-status');
      const data = await response.json();
      if (data.success) {
        setSyncLogs(data.syncLogs);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    }
  };

  const initializeConnection = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/aws-sync/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus(data.connection);
        toast({
          title: "AWS Connection Established",
          description: "Successfully connected to AWS RDS database"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const syncAllData = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/aws-sync/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setLastSyncResult(data);
      
      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.summary.totalRecordsSynced} records across ${data.summary.successfulTables} tables`
        });
        fetchSyncLogs();
      } else {
        toast({
          title: "Sync Failed",
          description: data.summary?.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const verifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/aws-sync/verify-integrity', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        const discrepancyCount = data.discrepancies.length;
        toast({
          title: "Integrity Check Complete",
          description: discrepancyCount === 0 
            ? `All ${data.tablesChecked} tables verified successfully`
            : `Found ${discrepancyCount} discrepancies in ${data.tablesChecked} tables`,
          variant: discrepancyCount === 0 ? "default" : "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AWS RDS Integration</h1>
          <p className="text-muted-foreground">
            Centralized database backup and synchronization for MallyERP
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Cloud className="h-6 w-6 text-blue-500" />
          <Badge variant={connectionStatus.connected ? "default" : "secondary"}>
            {connectionStatus.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Connection Status</span>
          </CardTitle>
          <CardDescription>
            AWS RDS connection details and management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Host</label>
              <p className="text-sm text-muted-foreground">
                database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Database</label>
              <p className="text-sm text-muted-foreground">mallyerp</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <p className="text-sm text-muted-foreground">us-east-1</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={initializeConnection}
              disabled={isConnecting || connectionStatus.connected}
              className="flex items-center space-x-2"
            >
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              <span>
                {isConnecting ? "Connecting..." : connectionStatus.connected ? "Connected" : "Connect to AWS"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Operations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Data Synchronization</span>
          </CardTitle>
          <CardDescription>
            Sync your complete ERP data to AWS RDS for backup and centralized access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={syncAllData}
              disabled={!connectionStatus.connected || isSyncing}
              className="flex items-center space-x-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              <span>
                {isSyncing ? "Syncing..." : "Sync All Data"}
              </span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={verifyIntegrity}
              disabled={!connectionStatus.connected || isVerifying}
              className="flex items-center space-x-2"
            >
              {isVerifying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <span>
                {isVerifying ? "Verifying..." : "Verify Integrity"}
              </span>
            </Button>
          </div>

          {lastSyncResult && (
            <Alert>
              <AlertDescription>
                {lastSyncResult.success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>
                      Last sync: {lastSyncResult.summary?.totalRecordsSynced} records across{' '}
                      {lastSyncResult.summary?.successfulTables} tables
                      {lastSyncResult.summary?.failedTables > 0 && (
                        <span className="text-red-500">
                          ({lastSyncResult.summary.failedTables} failed)
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Sync failed: {lastSyncResult.summary?.error}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>
            Track synchronization history and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <p className="text-muted-foreground">No sync activity yet</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.slice(0, 10).map((log: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    {log.sync_status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : log.sync_status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">{log.table_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.records_successful} records • {log.sync_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      log.sync_status === 'completed' ? 'default' :
                      log.sync_status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {log.sync_status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.start_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}