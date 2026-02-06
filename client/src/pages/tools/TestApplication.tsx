import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface TestResult {
  name: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  details?: string;
  timestamp: Date;
}

interface EndpointTest {
  name: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  expectedStatus?: number;
  validator?: (data: any) => { isValid: boolean; message: string };
}

export default function TestApplication() {
  const [activeTab, setActiveTab] = useState("api-tests");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  // Define the API tests
  const apiTests: EndpointTest[] = [
    {
      name: "Opportunities Listing",
      endpoint: "/api/sales/opportunities",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data) && data.length > 0;
        return {
          isValid,
          message: isValid 
            ? `Successfully retrieved ${data.length} opportunities` 
            : "Failed to retrieve opportunities or returned empty array"
        };
      }
    },
    {
      name: "Opportunities Export",
      endpoint: "/api/sales/opportunities/export",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data) && data.length > 0;
        return {
          isValid,
          message: isValid 
            ? `Successfully exported ${data.length} opportunities` 
            : "Failed to export opportunities or returned empty array"
        };
      }
    },
    {
      name: "Leads for Opportunities Dropdown",
      endpoint: "/api/sales/leads-for-opportunities",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data) && data.length > 0;
        return {
          isValid,
          message: isValid 
            ? `Successfully retrieved ${data.length} leads for dropdown` 
            : "Failed to retrieve leads for dropdown or returned empty array"
        };
      }
    },
    {
      name: "Master Data - Company Codes",
      endpoint: "/api/master-data/company-code",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data);
        return {
          isValid,
          message: isValid 
            ? `Successfully retrieved ${data.length} company codes` 
            : "Failed to retrieve company codes"
        };
      }
    },
    {
      name: "Master Data - Plants",
      endpoint: "/api/master-data/plant",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data);
        return {
          isValid,
          message: isValid 
            ? `Successfully retrieved ${data.length} plants` 
            : "Failed to retrieve plants"
        };
      }
    },
    {
      name: "Dashboard - Sales Chart",
      endpoint: "/api/dashboard/sales-chart",
      method: "GET",
      expectedStatus: 200,
      validator: (data) => {
        const isValid = Array.isArray(data) && data.length > 0;
        return {
          isValid,
          message: isValid 
            ? `Successfully retrieved ${data.length} sales chart data points` 
            : "Failed to retrieve sales chart data"
        };
      }
    }
  ];

  // Define the feature tests
  const featureTests = [
    {
      name: "Add Opportunity Form - Customer Dropdown",
      test: async () => {
        try {
          const response = await fetch('/api/sales/leads-for-opportunities');
          if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
          }
          const data = await response.json();
          
          const isValid = Array.isArray(data) && data.length > 0;
          
          return {
            status: isValid ? "success" : "error",
            message: isValid 
              ? `Customer dropdown has ${data.length} options available` 
              : "Customer dropdown has no options available",
            details: isValid 
              ? `First few options: ${data.slice(0, 3).map(l => l.company_name).join(', ')}...` 
              : "No customer options found"
          };
        } catch (error) {
          return {
            status: "error",
            message: "Failed to test customer dropdown",
            details: error.message
          };
        }
      }
    },
    {
      name: "Export Opportunities Button",
      test: async () => {
        try {
          const response = await fetch('/api/sales/opportunities/export');
          if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
          }
          const data = await response.json();
          
          const isValid = Array.isArray(data) && data.length > 0;
          const hasRequiredFields = isValid && data[0] && 'name' in data[0] && 'customer' in data[0];
          
          if (!isValid) {
            return {
              status: "error",
              message: "Export returned no data",
              details: "The export API returned an empty array"
            };
          } else if (!hasRequiredFields) {
            return {
              status: "warning",
              message: "Export missing required fields",
              details: `Export returned data but is missing required fields. Available fields: ${Object.keys(data[0]).join(', ')}`
            };
          }
          
          return {
            status: "success",
            message: `Export successfully returned ${data.length} records`,
            details: `CSV would contain the following headers: ${Object.keys(data[0]).join(', ')}`
          };
        } catch (error) {
          return {
            status: "error",
            message: "Failed to test export functionality",
            details: error.message
          };
        }
      }
    }
  ];

  // Run all API tests
  const runApiTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results: TestResult[] = [];

    for (const test of apiTests) {
      // Add a pending result
      results.push({
        name: test.name,
        status: "pending",
        message: `Running test for ${test.endpoint}...`,
        timestamp: new Date()
      });
      setTestResults([...results]);
      
      try {
        // Wait a bit to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const options: RequestInit = { method: test.method };
        if (test.body && (test.method === "POST" || test.method === "PUT")) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(test.body);
        }
        
        const response = await fetch(test.endpoint, options);
        const statusMatch = test.expectedStatus ? response.status === test.expectedStatus : response.ok;
        
        let data;
        let validationResult = { isValid: true, message: "No validation performed" };
        
        if (response.headers.get('content-type')?.includes('application/json')) {
          data = await response.json();
          if (test.validator) {
            validationResult = test.validator(data);
          }
        }
        
        // Update the result
        const resultIndex = results.findIndex(r => r.name === test.name);
        if (resultIndex >= 0) {
          if (!statusMatch) {
            results[resultIndex] = {
              name: test.name,
              status: "error",
              message: `Expected status ${test.expectedStatus || 'OK'}, got ${response.status}`,
              details: data ? JSON.stringify(data, null, 2).substring(0, 500) : 'No JSON response',
              timestamp: new Date()
            };
          } else if (!validationResult.isValid) {
            results[resultIndex] = {
              name: test.name,
              status: "warning",
              message: validationResult.message,
              details: data ? JSON.stringify(data, null, 2).substring(0, 500) : 'No JSON response',
              timestamp: new Date()
            };
          } else {
            results[resultIndex] = {
              name: test.name,
              status: "success",
              message: validationResult.message,
              details: data ? JSON.stringify(data, null, 2).substring(0, 500) : 'No JSON response',
              timestamp: new Date()
            };
          }
        }
        
        setTestResults([...results]);
      } catch (error) {
        // Update the result with error
        const resultIndex = results.findIndex(r => r.name === test.name);
        if (resultIndex >= 0) {
          results[resultIndex] = {
            name: test.name,
            status: "error",
            message: `Error: ${error.message}`,
            details: error.stack,
            timestamp: new Date()
          };
        }
        
        setTestResults([...results]);
      }
    }
    
    setIsRunningTests(false);
    setLastRunTime(new Date());
  };

  // Run all feature tests
  const runFeatureTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results: TestResult[] = [];

    for (const feature of featureTests) {
      // Add a pending result
      results.push({
        name: feature.name,
        status: "pending",
        message: `Running test for ${feature.name}...`,
        timestamp: new Date()
      });
      setTestResults([...results]);
      
      try {
        // Wait a bit to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const testResult = await feature.test();
        
        // Update the result
        const resultIndex = results.findIndex(r => r.name === feature.name);
        if (resultIndex >= 0) {
          results[resultIndex] = {
            name: feature.name,
            status: testResult.status,
            message: testResult.message,
            details: testResult.details,
            timestamp: new Date()
          };
        }
        
        setTestResults([...results]);
      } catch (error) {
        // Update the result with error
        const resultIndex = results.findIndex(r => r.name === feature.name);
        if (resultIndex >= 0) {
          results[resultIndex] = {
            name: feature.name,
            status: "error",
            message: `Error: ${error.message}`,
            details: error.stack,
            timestamp: new Date()
          };
        }
        
        setTestResults([...results]);
      }
    }
    
    setIsRunningTests(false);
    setLastRunTime(new Date());
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    await runApiTests();
    await runFeatureTests();
    setIsRunningTests(false);
  };

  // Run tests automatically when the component mounts
  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "pending":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Failed
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Warning
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            Running...
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTestSummary = () => {
    const total = testResults.length;
    const success = testResults.filter(r => r.status === "success").length;
    const failed = testResults.filter(r => r.status === "error").length;
    const warnings = testResults.filter(r => r.status === "warning").length;
    const pending = testResults.filter(r => r.status === "pending").length;
    
    return {
      total,
      success,
      failed,
      warnings,
      pending,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0
    };
  };

  const summary = getTestSummary();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Application</h1>
          <p className="text-gray-600 mt-1">
            Verify application functionality and API endpoints
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={runApiTests} 
            disabled={isRunningTests}
          >
            {isRunningTests && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test APIs
          </Button>
          <Button 
            variant="outline" 
            onClick={runFeatureTests} 
            disabled={isRunningTests}
          >
            {isRunningTests && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Features
          </Button>
          <Button 
            variant="default" 
            onClick={runAllTests} 
            disabled={isRunningTests}
          >
            {isRunningTests && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run All Tests
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{summary.successRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Failed Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{summary.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last Run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-medium">
              {lastRunTime 
                ? lastRunTime.toLocaleTimeString() 
                : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b border-gray-200">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="api-tests">API Tests</TabsTrigger>
                <TabsTrigger value="feature-tests">Feature Tests</TabsTrigger>
                <TabsTrigger value="test-report">Test Report</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="api-tests" className="p-4">
              <div className="space-y-4">
                {isRunningTests && testResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-gray-500">Running API tests...</p>
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No test results yet. Run tests to see results.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-4">
                    {testResults
                      .filter(result => apiTests.some(test => test.name === result.name))
                      .map((result, i) => (
                        <AccordionItem 
                          key={i} 
                          value={`item-${i}`}
                          className={`border rounded-md ${
                            result.status === 'success' ? 'border-green-200 bg-green-50' : 
                            result.status === 'error' ? 'border-red-200 bg-red-50' : 
                            result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 
                            'border-gray-200'
                          }`}
                        >
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(result.status)}
                              <span className="font-medium">{result.name}</span>
                              <span className="ml-auto">{getStatusBadge(result.status)}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-0">
                            <div className="rounded-md bg-white p-4 mt-2">
                              <p className="font-medium mb-2">Message:</p>
                              <p className="text-gray-700 mb-4">{result.message}</p>
                              
                              {result.details && (
                                <>
                                  <p className="font-medium mb-2">Details:</p>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-60">
                                    {result.details}
                                  </pre>
                                </>
                              )}
                              
                              <p className="text-xs text-gray-500 mt-4">
                                Test ran at {result.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="feature-tests" className="p-4">
              <div className="space-y-4">
                {isRunningTests && testResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-gray-500">Running feature tests...</p>
                  </div>
                ) : testResults.filter(result => featureTests.some(test => test.name === result.name)).length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No feature test results yet. Run tests to see results.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-4">
                    {testResults
                      .filter(result => featureTests.some(test => test.name === result.name))
                      .map((result, i) => (
                        <AccordionItem 
                          key={i} 
                          value={`item-${i}`}
                          className={`border rounded-md ${
                            result.status === 'success' ? 'border-green-200 bg-green-50' : 
                            result.status === 'error' ? 'border-red-200 bg-red-50' : 
                            result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 
                            'border-gray-200'
                          }`}
                        >
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(result.status)}
                              <span className="font-medium">{result.name}</span>
                              <span className="ml-auto">{getStatusBadge(result.status)}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-0">
                            <div className="rounded-md bg-white p-4 mt-2">
                              <p className="font-medium mb-2">Message:</p>
                              <p className="text-gray-700 mb-4">{result.message}</p>
                              
                              {result.details && (
                                <>
                                  <p className="font-medium mb-2">Details:</p>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-60">
                                    {result.details}
                                  </pre>
                                </>
                              )}
                              
                              <p className="text-xs text-gray-500 mt-4">
                                Test ran at {result.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="test-report" className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-right">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-32 text-gray-500">
                          No test results yet. Run tests to see results.
                        </TableCell>
                      </TableRow>
                    ) : (
                      testResults.map((result, i) => (
                        <TableRow key={i} className={
                          result.status === 'success' ? 'bg-green-50' : 
                          result.status === 'error' ? 'bg-red-50' : 
                          result.status === 'warning' ? 'bg-yellow-50' : 
                          ''
                        }>
                          <TableCell>{getStatusIcon(result.status)}</TableCell>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell>
                            {apiTests.some(test => test.name === result.name) ? 'API' : 'Feature'}
                          </TableCell>
                          <TableCell>{result.message}</TableCell>
                          <TableCell className="text-right text-gray-500 text-sm">
                            {result.timestamp.toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}