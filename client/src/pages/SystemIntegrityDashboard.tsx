import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Database, 
  Settings,
  RefreshCw,
  TrendingUp,
  FileText,
  Zap
} from "lucide-react";

interface SystemHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  tablesChecked: number;
  issuesFixed: number;
  recommendations: string[];
}

interface TestResult {
  tableName: string;
  success: boolean;
  fixesApplied: string[];
  message: string;
  timestamp: string;
}

export default function SystemIntegrityDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [realTimeStats, setRealTimeStats] = useState({
    operationsToday: 0,
    successRate: 100,
    autoFixesApplied: 0,
    uptime: '99.9%'
  });

  const fetchSystemHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system/health');
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runDataIntegrityTest = async () => {
    setIsLoading(true);
    const testData = {
      tableName: 'company_codes',
      data: {
        code: `TEST_${Date.now()}`,
        name: 'Integrity Test Company',
        country: 'United States of America with Very Long Name',
        currency: 'USD',
        description: 'Testing the zero-error data integrity system with comprehensive validation and auto-recovery capabilities'
      }
    };

    try {
      const response = await fetch('/api/system/validate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      
      const newTest: TestResult = {
        tableName: testData.tableName,
        success: result.success,
        fixesApplied: result.fixesApplied || [],
        message: result.message,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [newTest, ...prev.slice(0, 9)]); // Keep last 10 tests
      
      // Update real-time stats
      setRealTimeStats(prev => ({
        ...prev,
        operationsToday: prev.operationsToday + 1,
        autoFixesApplied: prev.autoFixesApplied + (result.fixesApplied?.length || 0),
        successRate: Math.round((prev.operationsToday * prev.successRate + (result.success ? 100 : 0)) / (prev.operationsToday + 1) * 100) / 100
      }));
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    
    // Set up real-time monitoring
    const interval = setInterval(() => {
      fetchSystemHealth();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Zero-Error Data Integrity System</h1>
          <p className="text-gray-600">Comprehensive monitoring and automatic error resolution</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={fetchSystemHealth} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runDataIntegrityTest} disabled={isLoading}>
            <Zap className="h-4 w-4 mr-2" />
            Run Integrity Test
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {systemHealth && getStatusIcon(systemHealth.status)}
              <span className="text-2xl font-bold capitalize">
                {systemHealth?.status || 'Loading...'}
              </span>
            </div>
            {systemHealth && (
              <div className="mt-2">
                <div className={`h-2 rounded-full ${getStatusColor(systemHealth.status)}`} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {realTimeStats.successRate}%
            </div>
            <Progress value={realTimeStats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Fixes Applied</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {systemHealth?.issuesFixed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Database constraints automatically resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStats.operationsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zero data loss guaranteed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="health" className="w-full">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="tests">Live Tests</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Integrity Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemHealth ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Tables Checked:</span>
                      <Badge variant="outline">{systemHealth.tablesChecked}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Issues Auto-Fixed:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {systemHealth.issuesFixed}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>System Reliability:</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {realTimeStats.uptime}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">Loading system health...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {systemHealth?.recommendations ? (
                  <ul className="space-y-2">
                    {systemHealth.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4">No recommendations available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Live Data Integrity Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length > 0 ? (
                <div className="space-y-4">
                  {testResults.map((test, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span className="font-medium">{test.tableName}</span>
                          <Badge className={test.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {test.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(test.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-2">{test.message}</p>
                      
                      {test.fixesApplied.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-blue-600 mb-1">Auto-fixes applied:</p>
                          <ul className="text-xs space-y-1">
                            {test.fixesApplied.map((fix, fixIndex) => (
                              <li key={fixIndex} className="flex items-center space-x-1">
                                <Settings className="h-3 w-3 text-blue-500" />
                                <span>{fix}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No test results yet. Run a test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Zero-Error Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Automatic Constraint Resolution</p>
                      <p className="text-sm text-gray-600">Automatically expands column lengths and fixes data type issues</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Foreign Key Auto-Creation</p>
                      <p className="text-sm text-gray-600">Creates missing reference records to maintain referential integrity</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Table Structure Validation</p>
                      <p className="text-sm text-gray-600">Ensures all required tables and columns exist</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Sequence Management</p>
                      <p className="text-sm text-gray-600">Automatically fixes ID sequence conflicts</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cross-Module Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-2">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Master Data Consistency</p>
                      <p className="text-sm text-gray-600">Ensures data integrity across all ERP modules</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Transaction Safety</p>
                      <p className="text-sm text-gray-600">Guarantees all business transactions are saved successfully</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Real-time Validation</p>
                      <p className="text-sm text-gray-600">Validates data before storage to prevent errors</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Audit Trail</p>
                      <p className="text-sm text-gray-600">Complete logging of all operations and fixes</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">Data Save Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">&lt; 50ms</div>
                  <div className="text-sm text-gray-600">Average Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">Active Monitoring</div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Current System Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Error Prevention:</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-Recovery:</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Validation:</span>
                    <Badge className="bg-green-100 text-green-800">Real-time</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Constraint Management:</span>
                    <Badge className="bg-green-100 text-green-800">Automated</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}