import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Camera, 
  Download,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  PlayCircle,
  Loader2,
  ChevronDown,
  ArrowLeft,
  FolderOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TestResult {
  id: string;
  testNumber: string;
  testName: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  timestamp: string;
  duration: number;
  screenshot?: string;
  domain: string;
  description: string;
  errorMessage?: string;
  testData: {
    component: string;
    functionality: string;
    expectedResult: string;
    actualResult: string;
  };
}

export default function TestResults() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [runningTestType, setRunningTestType] = useState<string | null>(null);

  useEffect(() => {
    fetchTestResults();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTestResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTestResults = async () => {
    try {
      // Add cache-busting parameter to force fresh data
      const response = await fetch(`/api/intelligent-testing/dominos-results?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setTestResults(data.results || []);
      } else {
        console.error('Failed to fetch test results:', data.error);
        setTestResults([]);
      }
    } catch (error) {
      console.error('Failed to fetch test results:', error);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runBusinessFlowTest = async (testType: string, endpoint: string) => {
    setIsRunningTest(true);
    setRunningTestType(testType);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`${testType} test completed:`, result);
        // Refresh test results to show new data
        await fetchTestResults();
      } else {
        console.error(`Failed to run ${testType} test`);
      }
    } catch (error) {
      console.error(`Error running ${testType} test:`, error);
    } finally {
      setIsRunningTest(false);
      setRunningTestType(null);
    }
  };

  const businessFlowTests = [
    {
      name: 'Dominos Sales Flow Test',
      description: 'Company Code → Sales Organization → Distribution Channels → Customer Sales',
      endpoint: '/api/intelligent-testing/run-dominos-sales-flow',
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      name: 'Purchase to Pay Flow',
      description: 'Vendor Master → Purchase Requisition → Purchase Order → Goods Receipt → Invoice',
      endpoint: '/api/intelligent-testing/run-purchase-to-pay-flow',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Order to Cash Flow',
      description: 'Customer Master → Sales Order → Delivery → Billing → Payment',
      endpoint: '/api/intelligent-testing/run-order-to-cash-flow',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Production Planning Flow',
      description: 'Material Master → Production Order → Work Centers → Capacity Planning',
      endpoint: '/api/intelligent-testing/run-production-planning-flow',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'Inventory Management Flow',
      description: 'Material Master → Stock Movements → Warehouse Management → Inventory Valuation',
      endpoint: '/api/intelligent-testing/run-inventory-management-flow',
      color: 'bg-teal-600 hover:bg-teal-700'
    },
    {
      name: 'Financial Reporting Flow',
      description: 'Chart of Accounts → GL Postings → Period End → Financial Statements',
      endpoint: '/api/intelligent-testing/run-financial-reporting-flow',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    }
  ];

  const filteredResults = testResults.filter(result => {
    const matchesFilter = filter === 'all' || result.status === filter;
    const matchesSearch = result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || result.domain === selectedDomain;
    
    return matchesFilter && matchesSearch && matchesDomain;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const domains = Array.from(new Set(testResults.map(result => result.domain)));
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'passed').length;
  const failedTests = testResults.filter(r => r.status === 'failed').length;
  const runningTests = testResults.filter(r => r.status === 'running').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Loading test results...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Results Dashboard</h1>
              <p className="text-gray-600 mt-1">Automated testing results with screenshots and detailed analysis</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchTestResults} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => window.location.href = '/project-test'} 
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            View Screenshots
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={isRunningTest}
              >
                {isRunningTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running {runningTestType}...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Run Business Flow Tests
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              {businessFlowTests.map((test, index) => (
                <DropdownMenuItem
                  key={index}
                  className="flex flex-col items-start p-3 cursor-pointer"
                  onClick={() => runBusinessFlowTest(test.name, test.endpoint)}
                >
                  <div className="flex items-center w-full">
                    <div className={`w-3 h-3 rounded-full ${test.color.split(' ')[0]} mr-3`}></div>
                    <span className="font-medium text-sm">{test.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 ml-6">{test.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Passed</p>
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Running</p>
                <div className="text-2xl font-bold text-blue-600">{runningTests}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results ({filteredResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredResults.map((result) => (
                <Card key={result.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="mt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {result.testNumber}
                              </Badge>
                              <Badge className={getStatusColor(result.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(result.status)}
                                  <span>{result.status.toUpperCase()}</span>
                                </div>
                              </Badge>
                              <Badge variant="secondary">{result.domain}</Badge>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {result.testName}
                            </h3>
                            <p className="text-gray-600 mb-3">{result.description}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTimestamp(result.timestamp)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>Duration: {formatDuration(result.duration)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {result.screenshot && (
                            <div className="ml-4">
                              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
                                <Camera className="w-4 h-4" />
                                <span>Screenshot Available</span>
                              </div>
                              <img 
                                src={result.screenshot} 
                                alt="Test Screenshot"
                                className="w-24 h-16 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="details" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Test Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium">Component:</span> {result.testData.component}</div>
                              <div><span className="font-medium">Functionality:</span> {result.testData.functionality}</div>
                              <div><span className="font-medium">Expected:</span> {result.testData.expectedResult}</div>
                              <div><span className="font-medium">Actual:</span> {result.testData.actualResult}</div>
                            </div>
                          </div>
                          
                          {result.errorMessage && (
                            <div>
                              <h4 className="font-semibold text-red-900 mb-2">Error Details</h4>
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <code className="text-sm text-red-800">{result.errorMessage}</code>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="screenshot" className="mt-4">
                        {result.screenshot ? (
                          <div className="text-center">
                            <img 
                              src={result.screenshot.startsWith('/') ? result.screenshot : `/${result.screenshot}`} 
                              alt="Test Screenshot"
                              className="max-w-full h-auto rounded border shadow-lg"
                              onError={(e) => {
                                console.error('Failed to load screenshot:', result.screenshot);
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden text-center py-8">
                              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">Failed to load screenshot</p>
                              <p className="text-xs text-gray-400 mt-1">Path: {result.screenshot}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              Screenshot captured at {formatTimestamp(result.timestamp)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">No screenshot available for this test</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
              
              {filteredResults.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No test results found</div>
                  <p className="text-sm text-gray-500">
                    {searchTerm || filter !== 'all' || selectedDomain !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Run some tests to see results here'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}