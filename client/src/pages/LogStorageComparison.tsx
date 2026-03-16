import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Database, Info, AlertTriangle, CheckCircle } from "lucide-react";

export default function LogStorageComparison() {
  const [fileLogs, setFileLogs] = useState<any[]>([]);
  const [databaseLogs, setDatabaseLogs] = useState<any[]>([]);
  const [fileStats, setFileStats] = useState<any>(null);
  const [databaseStats, setDatabaseStats] = useState<any>(null);

  const fetchData = async () => {
    try {
      // Fetch file-based logs
      const fileResponse = await fetch('/api/logs/recent?limit=10');
      const fileData = await fileResponse.json();
      setFileLogs(fileData.errors || []);

      // Fetch file stats
      const fileStatsResponse = await fetch('/api/logs/stats');
      const fileStatsData = await fileStatsResponse.json();
      setFileStats(fileStatsData);

      // Fetch database logs
      const dbResponse = await fetch('/api/logs/database/recent?limit=10');
      const dbData = await dbResponse.json();
      setDatabaseLogs(dbData.logs || []);

      // Fetch database stats
      const dbStatsResponse = await fetch('/api/logs/database/stats');
      const dbStatsData = await dbStatsResponse.json();
      setDatabaseStats(dbStatsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const testBothStorages = async () => {
    await fetch('/api/logs/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'info',
        module: 'StorageTest',
        message: 'Testing both file and database storage',
        additionalData: { 
          timestamp: new Date().toISOString(),
          testType: 'dual-storage-demo'
        }
      })
    });
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <h1 className="text-3xl font-bold">Log Storage Methods Comparison</h1>
        <Button onClick={testBothStorages}>
          Test Both Storages
        </Button>
      </div>

      {/* Storage Method Overview */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>File Storage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ul className="text-sm space-y-1">
                <li>• Each line = one JSON log entry</li>
                <li>• Appends new entries continuously</li>
                <li>• Rotates when file exceeds 10MB</li>
                <li>• Keeps up to 5 backup files</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Location:</h4>
              <code className="text-xs bg-gray-100 p-1 rounded">logs/error.log</code>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Structure:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded border">
{`{"timestamp":"2025-06-04T22:46:16.621Z","level":"INFO","module":"TestModule","message":"Testing error logging system","additionalData":{"test":true}}`}
              </pre>
            </div>
            {fileStats && (
              <div className="space-y-1">
                <p className="text-sm"><strong>Entries:</strong> {fileStats.errorCount}</p>
                <p className="text-sm"><strong>File Size:</strong> {formatFileSize(fileStats.size)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Storage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ul className="text-sm space-y-1">
                <li>• Structured table with columns</li>
                <li>• Proper data types and indexes</li>
                <li>• SQL queries for complex filtering</li>
                <li>• Enforced schema and constraints</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Table:</h4>
              <code className="text-xs bg-gray-100 p-1 rounded">system_error_logs</code>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Schema:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded border">
{`id (SERIAL PRIMARY KEY)
timestamp (TIMESTAMP WITH TIME ZONE)
level (VARCHAR(10))
module (VARCHAR(100))
message (TEXT)
stack (TEXT)
additional_data (JSONB)`}
              </pre>
            </div>
            {databaseStats && (
              <div className="space-y-1">
                <p className="text-sm"><strong>Total:</strong> {databaseStats.totalLogs}</p>
                <p className="text-sm"><strong>Errors:</strong> {databaseStats.errorCount}</p>
                <p className="text-sm"><strong>Warnings:</strong> {databaseStats.warnCount}</p>
                <p className="text-sm"><strong>Info:</strong> {databaseStats.infoCount}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Feature</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">File Storage</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Database Storage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">Performance</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-yellow-100 text-yellow-800">Fast writes, slow searches</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Indexed queries, fast filtering</Badge>
                  </td>
                </tr>
                <tr className="bg-gray-25">
                  <td className="border border-gray-300 px-4 py-2 font-medium">Storage Space</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Very compact JSON</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-yellow-100 text-yellow-800">More overhead</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">Searchability</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-red-100 text-red-800">Limited (grep/text search)</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Full SQL capabilities</Badge>
                  </td>
                </tr>
                <tr className="bg-gray-25">
                  <td className="border border-gray-300 px-4 py-2 font-medium">Backup/Recovery</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Simple file copy</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-yellow-100 text-yellow-800">Database backup required</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">Data Integrity</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-yellow-100 text-yellow-800">No validation</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Schema enforced</Badge>
                  </td>
                </tr>
                <tr className="bg-gray-25">
                  <td className="border border-gray-300 px-4 py-2 font-medium">External Tools</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">Any text editor</Badge>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">SQL clients, BI tools</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs Comparison */}
      <Tabs defaultValue="file" className="w-full">
        <TabsList>
          <TabsTrigger value="file">File Logs (Recent 10)</TabsTrigger>
          <TabsTrigger value="database">Database Logs (Recent 10)</TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle>File-based Log Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {fileLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No file logs found</p>
              ) : (
                <div className="space-y-2">
                  {fileLogs.map((log, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={
                          log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                          log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {log.level}
                        </Badge>
                        <span className="font-medium">{log.module}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.additionalData && (
                        <pre className="text-xs mt-2 bg-white p-2 rounded border">
                          {JSON.stringify(log.additionalData, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Log Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {databaseLogs.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-500">No database logs found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Database logging may need initialization or there may be a connection issue
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {databaseLogs.map((log, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={
                          log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                          log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {log.level}
                        </Badge>
                        <span className="font-medium">{log.module}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.additionalData && (
                        <pre className="text-xs mt-2 bg-white p-2 rounded border">
                          {JSON.stringify(log.additionalData, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Options */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>File Storage: <strong>Enabled</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Database Storage: <strong>Enabled</strong></span>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded border">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Dual Storage Active</p>
                <p className="text-sm text-blue-600">
                  Your system is currently logging to both file and database storage simultaneously. 
                  This provides redundancy and gives you the benefits of both storage methods.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}