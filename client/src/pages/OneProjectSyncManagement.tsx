import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  RotateCw,
  Clock,
  Activity,
  Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SyncStatus {
  supportedTables: string[];
  queuedOperations: number;
  isProcessing: boolean;
  recentOperations: Record<string, number>;
  syncMappings: number;
}

interface SyncLog {
  id: number;
  operation_type: string;
  source_table: string;
  target_table: string;
  record_id: string;
  sync_status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface SyncMapping {
  businessTable: string;
  syncDirection: string;
  enabled: boolean;
}

const OneProjectSyncManagement: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/oneproject-sync/status'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch sync logs
  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/oneproject-sync/logs'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch sync mappings
  const { data: syncMappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['/api/oneproject-sync/mappings']
  });

  // Trigger manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async (tableName: string) => {
      const response = await fetch(`/api/oneproject-sync/manual-sync/${tableName}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to trigger manual sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oneproject-sync/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/oneproject-sync/logs'] });
    }
  });

  // Trigger full sync mutation
  const fullSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/oneproject-sync/full-sync', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to trigger full sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oneproject-sync/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/oneproject-sync/logs'] });
    }
  });

  const handleManualSync = () => {
    if (selectedTable) {
      manualSyncMutation.mutate(selectedTable);
    }
  };

  const handleFullSync = () => {
    fullSyncMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">OneProject Synchronization Management</h1>
          <p className="text-gray-600 mt-2">
            Real-time parallel data synchronization between OneProject and business domain tables
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleFullSync}
            disabled={fullSyncMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {fullSyncMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4 mr-2" />
            )}
            Full System Sync
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Supported Tables</p>
                <p className="text-2xl font-bold">{syncStatus?.supportedTables?.length || 0}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Queued Operations</p>
                <p className="text-2xl font-bold">{syncStatus?.queuedOperations || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing Status</p>
                <p className="text-sm font-semibold">
                  {syncStatus?.isProcessing ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Activity className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </p>
              </div>
              <Settings className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Success</p>
                <p className="text-2xl font-bold text-green-600">
                  {syncStatus?.recentOperations?.SUCCESS || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mappings">Table Mappings</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="manual">Manual Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Synchronization Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    OneProject Synchronization Agent is operational with {syncStatus?.supportedTables?.length || 0} 
                    business tables configured for bidirectional real-time synchronization.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Supported Business Tables</h4>
                    <div className="flex flex-wrap gap-2">
                      {syncStatus?.supportedTables?.map((table: string) => (
                        <Badge key={table} variant="secondary" className="bg-blue-100 text-blue-800">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Recent Operation Statistics</h4>
                    <div className="space-y-1">
                      {Object.entries(syncStatus?.recentOperations || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="capitalize">{status}:</span>
                          <Badge className={getStatusColor(status)}>{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Synchronization Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              {mappingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {syncMappings?.mappings?.map((mapping: SyncMapping) => (
                    <div 
                      key={mapping.businessTable}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{mapping.businessTable}</p>
                          <p className="text-sm text-gray-600">Business Domain Table</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-800"
                        >
                          {mapping.syncDirection}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          className={mapping.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {mapping.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs?.logs?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No synchronization logs available</p>
                  ) : (
                    syncLogs?.logs?.slice(0, 20).map((log: SyncLog) => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            log.sync_status === 'SUCCESS' ? 'bg-green-500' :
                            log.sync_status === 'PROCESSING' ? 'bg-blue-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium">
                              {log.operation_type} • {log.source_table} → {log.target_table}
                            </p>
                            <p className="text-sm text-gray-600">
                              Record ID: {log.record_id} • {new Date(log.created_at).toLocaleString()}
                            </p>
                            {log.error_message && (
                              <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(log.sync_status)}>
                          {log.sync_status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Synchronization Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <select 
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="flex-1 p-2 border rounded-md"
                  >
                    <option value="">Select a table to sync</option>
                    {syncStatus?.supportedTables?.map((table: string) => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                  <Button 
                    onClick={handleManualSync}
                    disabled={!selectedTable || manualSyncMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {manualSyncMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Table
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Manual synchronization will process all records from the selected business table 
                    and ensure they are properly synchronized with the OneProject table. 
                    This operation is safe and will not duplicate existing records.
                  </AlertDescription>
                </Alert>

                {(manualSyncMutation.isSuccess || fullSyncMutation.isSuccess) && (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription className="text-green-800">
                      Synchronization operation completed successfully. Check the logs tab for details.
                    </AlertDescription>
                  </Alert>
                )}

                {(manualSyncMutation.isError || fullSyncMutation.isError) && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-red-800">
                      Synchronization operation failed. Please check the logs for error details.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OneProjectSyncManagement;