import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, AlertTriangle, Trash2, Download } from "lucide-react";

interface ErrorLog {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  module: string;
  message: string;
  stack?: string;
  additionalData?: any;
}

interface LogStats {
  size: number;
  lastModified: string;
  errorCount: number;
}

export default function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/logs/recent?limit=${limit}`);
      const data = await response.json();
      setLogs(data.errors || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/logs/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'DELETE' });
      await fetchLogs();
      await fetchStats();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const testLogging = async (level: string) => {
    try {
      await fetch('/api/logs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          module: 'Frontend',
          message: `Test ${level} message from UI`,
          additionalData: { source: 'ErrorLogs UI', timestamp: new Date().toISOString() }
        })
      });
      await fetchLogs();
      await fetchStats();
    } catch (error) {
      console.error('Failed to test logging:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [limit]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      ERROR: 'bg-red-100 text-red-800',
      WARN: 'bg-yellow-100 text-yellow-800',
      INFO: 'bg-blue-100 text-blue-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'all' || log.level === filterLevel;
    const moduleMatch = !filterModule || log.module.toLowerCase().includes(filterModule.toLowerCase());
    return levelMatch && moduleMatch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Error Logs Management</h1>
        <div className="space-x-2">
          <Button onClick={() => fetchLogs()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="destructive" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Log Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.errorCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">File Size</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.size)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Modified</p>
                <p className="text-sm">{new Date(stats.lastModified).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">View Logs</TabsTrigger>
          <TabsTrigger value="test">Test Logging</TabsTrigger>
          <TabsTrigger value="info">Storage Info</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Log Level</label>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                      <SelectItem value="WARN">Warning</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Module</label>
                  <Input
                    placeholder="Filter by module..."
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Limit</label>
                  <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 entries</SelectItem>
                      <SelectItem value="100">100 entries</SelectItem>
                      <SelectItem value="200">200 entries</SelectItem>
                      <SelectItem value="500">500 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => fetchLogs()} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Display */}
          <Card>
            <CardHeader>
              <CardTitle>
                Recent Logs ({filteredLogs.length} of {logs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No logs found</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredLogs.map((log, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getLevelIcon(log.level)}
                          <Badge className={getLevelBadge(log.level)}>
                            {log.level}
                          </Badge>
                          <span className="font-medium">{log.module}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{log.message}</p>
                      {log.stack && (
                        <details className="text-xs bg-white p-2 rounded border">
                          <summary className="cursor-pointer font-medium">Stack Trace</summary>
                          <pre className="mt-2 whitespace-pre-wrap">{log.stack}</pre>
                        </details>
                      )}
                      {log.additionalData && (
                        <details className="text-xs bg-white p-2 rounded border mt-2">
                          <summary className="cursor-pointer font-medium">Additional Data</summary>
                          <pre className="mt-2 whitespace-pre-wrap">
                            {JSON.stringify(log.additionalData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Error Logging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test the error logging system by creating sample log entries.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => testLogging('info')} variant="outline">
                  <Info className="h-4 w-4 mr-2" />
                  Test Info Log
                </Button>
                <Button onClick={() => testLogging('warn')} variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Test Warning Log
                </Button>
                <Button onClick={() => testLogging('error')} variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Test Error Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log Storage Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Storage Location</h4>
                  <p className="text-sm text-gray-600">
                    Logs are stored in the filesystem at: <code className="bg-gray-100 px-1 rounded">logs/error.log</code>
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">File Rotation</h4>
                  <p className="text-sm text-gray-600">
                    When the log file exceeds 10MB, it automatically rotates to keep up to 5 backup files
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Log Levels</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li><strong>ERROR:</strong> Critical errors that need immediate attention</li>
                    <li><strong>WARN:</strong> Warning conditions that should be monitored</li>
                    <li><strong>INFO:</strong> General information about system operations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">API Endpoints</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li><code>/api/logs/recent</code> - Get recent log entries</li>
                    <li><code>/api/logs/module/:module</code> - Get logs for specific module</li>
                    <li><code>/api/logs/stats</code> - Get log file statistics</li>
                    <li><code>/api/logs/clear</code> - Clear all log files</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}