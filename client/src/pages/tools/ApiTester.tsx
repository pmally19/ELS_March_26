import { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, ArrowRight, FileDown, History, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define types for API test results
interface ApiTestResult {
  endpoint: string;
  status: "success" | "error" | "pending";
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
  timestamp?: string;
}

interface ApiErrorLog {
  endpoint: string;
  error: string;
  timestamp: string;
  statusCode?: number;
  counts: number;
  lastFix?: string;
  fixAttempts: number;
  fixed: boolean;
}

const ApiTester = () => {
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [fixingEndpoint, setFixingEndpoint] = useState<string | null>(null);
  const [fixStatus, setFixStatus] = useState<string | null>(null);
  const [errorLogs, setErrorLogs] = useState<ApiErrorLog[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);

  // List of crucial API endpoints to test
  const apiEndpoints = [
    "/api/sales/leads-for-opportunities",
    "/api/sales/opportunities/export",
    "/api/materials/top-selling",
    "/api/dashboard/sales-chart",
    "/api/dashboard/revenue-by-category",
    "/api/activities/recent",
    "/api/inventory/low-stock",
    "/api/inventory/stats",
    "/api/master-data/company-code",
    "/api/master-data/plant"
  ];

  // Function to load error logs from localStorage
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('api_error_logs');
      if (savedLogs) {
        setErrorLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      console.error("Failed to load API error logs:", error);
    }
  }, []);

  // Function to save error logs to localStorage
  const saveErrorLogs = (logs: ApiErrorLog[]) => {
    try {
      localStorage.setItem('api_error_logs', JSON.stringify(logs));
    } catch (error) {
      console.error("Failed to save API error logs:", error);
    }
  };

  // Function to update error logs when an endpoint fails
  const updateErrorLogs = (endpoint: string, error: string, statusCode?: number) => {
    const timestamp = new Date().toISOString();

    setErrorLogs(prevLogs => {
      // Check if this endpoint already has logged errors
      const existingLogIndex = prevLogs.findIndex(log => log.endpoint === endpoint);

      if (existingLogIndex !== -1) {
        // Update existing log
        const updatedLogs = [...prevLogs];
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          error,
          statusCode,
          counts: updatedLogs[existingLogIndex].counts + 1,
          timestamp, // Update to latest timestamp
          fixed: false
        };
        saveErrorLogs(updatedLogs);
        return updatedLogs;
      } else {
        // Create new log
        const newLog: ApiErrorLog = {
          endpoint,
          error,
          timestamp,
          statusCode,
          counts: 1,
          fixAttempts: 0,
          fixed: false
        };

        const updatedLogs = [...prevLogs, newLog];
        saveErrorLogs(updatedLogs);
        return updatedLogs;
      }
    });
  };

  // Function to update log when a fix is attempted
  const updateFixAttempt = (endpoint: string, success: boolean) => {
    const timestamp = new Date().toISOString();

    setErrorLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.endpoint === endpoint);

      if (existingLogIndex !== -1) {
        const updatedLogs = [...prevLogs];
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          lastFix: timestamp,
          fixAttempts: updatedLogs[existingLogIndex].fixAttempts + 1,
          fixed: success
        };
        saveErrorLogs(updatedLogs);
        return updatedLogs;
      }
      return prevLogs;
    });
  };

  // Test a single API endpoint
  const testEndpoint = async (endpoint: string): Promise<ApiTestResult> => {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch(endpoint);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        // Log the error
        updateErrorLogs(endpoint, errorMessage, response.status);

        return {
          endpoint,
          status: "error",
          statusCode: response.status,
          responseTime,
          error: errorMessage,
          timestamp
        };
      }

      const data = await response.json();
      return {
        endpoint,
        status: "success",
        statusCode: response.status,
        responseTime,
        data: data,
        timestamp
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log the error
      updateErrorLogs(endpoint, errorMessage);

      return {
        endpoint,
        status: "error",
        responseTime: Math.round(endTime - startTime),
        error: errorMessage,
        timestamp
      };
    }
  };

  // Run tests for all endpoints
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults(apiEndpoints.map(endpoint => ({
      endpoint,
      status: "pending"
    })));

    for (let i = 0; i < apiEndpoints.length; i++) {
      const endpoint = apiEndpoints[i];
      const result = await testEndpoint(endpoint);

      setTestResults(prev => {
        const newResults = [...prev];
        const index = newResults.findIndex(item => item.endpoint === endpoint);
        if (index !== -1) {
          newResults[index] = result;
        }
        return newResults;
      });
    }

    setIsRunningTests(false);
    setLastRunTime(new Date().toLocaleTimeString());
  };

  // Filter tests based on active tab
  const getFilteredResults = () => {
    if (activeTab === "all") return testResults;
    if (activeTab === "failed") return testResults.filter(result => result.status === "error");
    if (activeTab === "successful") return testResults.filter(result => result.status === "success");
    return testResults;
  };

  // Function to export error logs to CSV
  const exportLogs = () => {
    try {
      if (errorLogs.length === 0) {
        alert("No error logs to export");
        return;
      }

      // Create CSV content
      let csvContent = "Endpoint,Error,Timestamp,Status Code,Error Count,Last Fix Attempt,Fix Attempts,Fixed\n";

      errorLogs.forEach(log => {
        const row = [
          `"${log.endpoint}"`,
          `"${log.error.replace(/"/g, '""')}"`,
          `"${log.timestamp}"`,
          log.statusCode || '',
          log.counts,
          log.lastFix || '',
          log.fixAttempts,
          log.fixed ? 'Yes' : 'No'
        ].join(',');

        csvContent += row + '\n';
      });

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `api-error-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("Failed to export logs: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const fixEndpoint = async (endpoint: string) => {
    setFixingEndpoint(endpoint);
    setFixStatus("Analyzing issue...");

    try {
      // First, try to identify the specific issue with this endpoint
      const response = await fetch('/api/tools/diagnose-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint })
      });

      if (!response.ok) {
        setFixStatus(`Diagnostic failed: ${response.statusText}`);
        return;
      }

      const diagnosis = await response.json();
      setFixStatus(`Issue identified: ${diagnosis.issue}`);

      // Now attempt to fix the issue
      const fixResponse = await fetch('/api/tools/fix-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          issue: diagnosis.issue
        })
      });

      if (!fixResponse.ok) {
        setFixStatus(`Fix attempt failed: ${fixResponse.statusText}`);
        return;
      }

      const fixResult = await fixResponse.json();

      if (fixResult.success) {
        setFixStatus("Fix applied successfully! Retesting endpoint...");

        // Wait a moment before retesting
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Retest the endpoint
        const retestResult = await testEndpoint(endpoint);
        setTestResults(prev => {
          const newResults = [...prev];
          const index = newResults.findIndex(item => item.endpoint === endpoint);
          if (index !== -1) {
            newResults[index] = retestResult;
          }
          return newResults;
        });

        setFixStatus(retestResult.status === "success"
          ? "Endpoint fixed and working correctly!"
          : "Fix applied but endpoint still has issues.");
      } else {
        setFixStatus(`Fix attempt result: ${fixResult.message}`);
      }
    } catch (error) {
      setFixStatus(`Error during fix attempt: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTimeout(() => {
        setFixingEndpoint(null);
        setFixStatus(null);
      }, 5000);
    }
  };

  // Run tests on component mount
  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div className="container p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md">
            <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">API Testing Tool</h1>
        </div>
        <p className="text-muted-foreground">Test and diagnose API endpoints to ensure your application is functioning correctly</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="flex items-center gap-2"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                // Get all failed endpoints
                const failedEndpoints = testResults.filter(r => r.status === "error").map(r => r.endpoint);
                if (failedEndpoints.length === 0) {
                  alert("No failed endpoints to fix!");
                  return;
                }

                setFixStatus("Analyzing and fixing all failed endpoints...");
                setIsRunningTests(true);

                // Fix each endpoint one by one - using sequential instead of parallel for better handling
                const fixEndpointsSequentially = async () => {
                  try {
                    // Process endpoints one by one with proper error handling
                    for (const endpoint of failedEndpoints) {
                      try {
                        setFixStatus(`Analyzing ${endpoint}...`);

                        // 1. Diagnose the endpoint
                        const diagResponse = await fetch('/api/tools/diagnose-endpoint', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ endpoint })
                        });

                        if (!diagResponse.ok) {
                          throw new Error(`Diagnosis failed with status ${diagResponse.status}`);
                        }

                        const diagnosis = await diagResponse.json();
                        setFixStatus(`Fixing ${endpoint}: ${diagnosis.issue}`);

                        // 2. Fix the endpoint
                        const fixResponse = await fetch('/api/tools/fix-endpoint', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            endpoint,
                            issue: diagnosis.issue
                          })
                        });

                        if (!fixResponse.ok) {
                          throw new Error(`Fix attempt failed with status ${fixResponse.status}`);
                        }

                        // 3. Record the fix in our logs
                        updateFixAttempt(endpoint, fixResponse.ok);

                        // 4. Wait a moment between fixes
                        await new Promise(resolve => setTimeout(resolve, 500));
                      } catch (endpointError) {
                        console.error(`Error fixing ${endpoint}:`, endpointError);
                        setFixStatus(`Error with ${endpoint}: ${endpointError.message}. Continuing with next endpoint...`);
                        // Continue with other endpoints even if one fails
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      }
                    }

                    // All done, retest everything
                    setFixStatus("Fix attempts completed! Retesting all endpoints...");
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await runAllTests();
                    setFixStatus("Testing completed after fix attempts");

                    // Clear status after a delay
                    setTimeout(() => {
                      setFixStatus(null);
                    }, 2000);

                  } catch (error) {
                    console.error("Error in fix process:", error);
                    setFixStatus(`Error in fix process: ${error instanceof Error ? error.message : String(error)}`);
                  } finally {
                    setIsRunningTests(false);
                  }
                };

                // Start the sequential fixing process
                fixEndpointsSequentially();
              }}
              variant="outline"
              disabled={isRunningTests || testResults.filter(r => r.status === "error").length === 0}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Fix All Errors
            </Button>

            {fixStatus && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs px-3 py-1.5 rounded-md">
                <Loader2 className="h-3 w-3 animate-spin" />
                {fixStatus}
              </div>
            )}

            {lastRunTime && (
              <span className="text-xs text-muted-foreground ml-4">
                Last run: {lastRunTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="mr-4 flex items-center gap-1">
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">
                  {testResults.filter(r => r.status === "success").length}
                </Badge>
                <span>Passed</span>
              </span>
              <span className="flex items-center gap-1 inline-block">
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">
                  {testResults.filter(r => r.status === "error").length}
                </Badge>
                <span>Failed</span>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="flex items-center gap-1"
            >
              <History className="h-4 w-4" />
              {showHistoryPanel ? "Hide Error History" : "View Error History"}
              <ChevronDown className={`h-3 w-3 transition-transform ${showHistoryPanel ? 'rotate-180' : ''}`} />
            </Button>

            {errorLogs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="flex items-center gap-1"
              >
                <FileDown className="h-4 w-4" />
                Export Logs
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Endpoints</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="successful">Successful</TabsTrigger>
          </TabsList>

          {showHistoryPanel && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  API Error History Log
                </CardTitle>
                <CardDescription>
                  Detailed history of API failures and fix attempts. This log helps identify recurring issues and track progress on API stability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No error logs recorded yet. Errors will appear here as they occur.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] w-full">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left font-medium p-2">Endpoint</th>
                          <th className="text-left font-medium p-2">Error</th>
                          <th className="text-left font-medium p-2">Status</th>
                          <th className="text-left font-medium p-2">Count</th>
                          <th className="text-left font-medium p-2">First Occurred</th>
                          <th className="text-left font-medium p-2">Last Attempt</th>
                          <th className="text-left font-medium p-2">Fixed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...errorLogs]
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((log, index) => (
                            <tr key={index} className={`border-b ${log.fixed ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
                              <td className="p-2 text-sm" title={log.endpoint}>
                                {log.endpoint.length > 30 ? log.endpoint.substring(0, 30) + '...' : log.endpoint}
                              </td>
                              <td className="p-2 text-sm" title={log.error}>
                                {log.error.length > 40 ? log.error.substring(0, 40) + '...' : log.error}
                              </td>
                              <td className="p-2 text-sm">
                                {log.statusCode ? (
                                  <Badge variant={log.statusCode >= 500 ? "destructive" : "outline"}>
                                    {log.statusCode}
                                  </Badge>
                                ) : '-'}
                              </td>
                              <td className="p-2 text-sm">{log.counts}</td>
                              <td className="p-2 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="p-2 text-sm">
                                {log.lastFix ? new Date(log.lastFix).toLocaleString() : '-'}
                              </td>
                              <td className="p-2 text-sm">
                                {log.fixed ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">{log.fixAttempts > 0 ? `${log.fixAttempts} attempt(s)` : 'No attempts'}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-xs text-muted-foreground">
                  {errorLogs.length > 0 && (
                    <span>Showing {errorLogs.length} error log entries. {errorLogs.filter(log => log.fixed).length} fixed, {errorLogs.filter(log => !log.fixed).length} unfixed.</span>
                  )}
                </div>
                {errorLogs.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm("Are you sure you want to clear all error logs?")) {
                      setErrorLogs([]);
                      localStorage.removeItem('api_error_logs');
                    }
                  }}>
                    Clear History
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          <TabsContent value={activeTab} className="space-y-4">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              <Accordion type="multiple" className="w-full">
                {getFilteredResults().map((result, index) => (
                  <AccordionItem key={`${result.endpoint}-${index}`} value={result.endpoint}>
                    <AccordionTrigger className="flex items-center gap-3 py-2">
                      <div className="flex items-center gap-3 flex-1">
                        {result.status === "pending" ? (
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : result.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div className="text-left flex-1">
                          <div className="font-semibold">{result.endpoint}</div>
                          {result.statusCode && (
                            <div className="text-xs text-muted-foreground">
                              Status: {result.statusCode} {result.responseTime && `(${result.responseTime}ms)`}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card>
                        <CardContent className="pt-4">
                          {result.status === "error" ? (
                            <div className="space-y-4">
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                  {result.error}
                                </AlertDescription>
                              </Alert>

                              {fixingEndpoint === result.endpoint ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>{fixStatus}</span>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => fixEndpoint(result.endpoint)}
                                >
                                  Attempt to Fix Issue
                                </Button>
                              )}
                            </div>
                          ) : result.status === "success" ? (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Response Data:</h4>
                              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[300px]">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                              <span className="ml-2">Testing endpoint...</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiTester;