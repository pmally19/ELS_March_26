import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Settings, 
  RefreshCw,
  Plus,
  Eye,
  Download,
  Ban,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  FileCheck
} from 'lucide-react';

const CreditManagement = () => {
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [creditStatus, setCreditStatus] = useState('ALL');
  const queryClient = useQueryClient();

  const { data: creditData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/credit-management'],
    queryFn: async () => {
      const response = await apiRequest('/api/transaction-tiles/credit-management');
      return await response.json();
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/transaction-tiles/credit-management/refresh', {
        method: 'POST'
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/credit-management'] });
    }
  });

  const configureMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest('/api/transaction-tiles/credit-management/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/credit-management'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CreditCard className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading credit management system...</p>
        </div>
      </div>
    );
  }

  const creditAccounts = creditData?.data || [];
  
  // Credit Management specific KPIs
  const totalCreditExposure = 2450000;
  const availableCredit = 1875000;
  const blockedOrders = 23;
  const overdueCustomers = 8;
  const avgDaysOverdue = 15;
  const creditUtilization = 23.5;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleConfigure = () => {
    configureMutation.mutate({
      customer: selectedCustomer,
      riskLevel: riskLevel,
      status: creditStatus
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Management System</h1>
          <p className="text-muted-foreground">SAP FD32 - Customer credit limits, risk assessment, and exposure monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Credit Data
          </Button>
          <Button onClick={handleConfigure} disabled={configureMutation.isPending}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Limits
          </Button>
        </div>
      </div>

      {/* Credit Management Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditExposure.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all customers</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${availableCredit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unused credit capacity</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Orders</CardTitle>
            <Ban className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedOrders}</div>
            <p className="text-xs text-muted-foreground">Credit limit exceeded</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Customers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCustomers}</div>
            <p className="text-xs text-muted-foreground">{avgDaysOverdue} days avg overdue</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditUtilization}%</div>
            <p className="text-xs text-muted-foreground">Portfolio utilization</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">With credit terms</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="credit-limits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="credit-limits">Credit Limits</TabsTrigger>
          <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
          <TabsTrigger value="credit-blocks">Credit Blocks</TabsTrigger>
          <TabsTrigger value="credit-scoring">Credit Scoring</TabsTrigger>
          <TabsTrigger value="exposure-monitoring">Exposure Monitor</TabsTrigger>
          <TabsTrigger value="credit-approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="credit-limits">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Customer Credit Limits
                </CardTitle>
                <CardDescription>Configure and monitor customer credit exposure limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Selection</label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Customers</SelectItem>
                      <SelectItem value="C001">TechFlow Solutions</SelectItem>
                      <SelectItem value="C002">GreenEarth Manufacturing</SelectItem>
                      <SelectItem value="C003">RetailMax Group</SelectItem>
                      <SelectItem value="C004">Global Industrial Corp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Level Filter</label>
                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Risk Levels</SelectItem>
                      <SelectItem value="LOW">Low Risk</SelectItem>
                      <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                      <SelectItem value="HIGH">High Risk</SelectItem>
                      <SelectItem value="CRITICAL">Critical Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Credit Status</label>
                  <Select value={creditStatus} onValueChange={setCreditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="REVIEW">Under Review</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Credit Limit Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Set Limit
                    </Button>
                    <Button variant="outline" size="sm">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Increase
                    </Button>
                    <Button variant="outline" size="sm">
                      <Ban className="h-3 w-3 mr-1" />
                      Block Credit
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credit Utilization Overview</CardTitle>
                <CardDescription>Real-time credit exposure monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>TechFlow Solutions</span>
                    <span>$485k / $500k</span>
                  </div>
                  <Progress value={97} className="w-full" />
                  <Badge variant="destructive" className="text-xs">97% Utilized</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>GreenEarth Manufacturing</span>
                    <span>$225k / $750k</span>
                  </div>
                  <Progress value={30} className="w-full" />
                  <Badge variant="secondary" className="text-xs">30% Utilized</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>RetailMax Group</span>
                    <span>$890k / $1,000k</span>
                  </div>
                  <Progress value={89} className="w-full" />
                  <Badge variant="outline" className="text-xs">89% Utilized</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Credit Alerts</span>
                    </div>
                    <Badge variant="destructive">5 Active</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Pending Reviews</span>
                    </div>
                    <Badge variant="outline">12 Items</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Auto-Approved</span>
                    </div>
                    <Badge variant="secondary">28 Today</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk-assessment">
          <Card>
            <CardHeader>
              <CardTitle>Customer Risk Assessment Matrix</CardTitle>
              <CardDescription>Credit risk analysis and scoring for all customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search customers..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="critical">Critical Risk</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Report
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Payment History</TableHead>
                    <TableHead>Current Exposure</TableHead>
                    <TableHead>DSO (Days)</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      customer: 'TechFlow Solutions',
                      score: 745,
                      risk: 'Medium',
                      paymentHistory: '94%',
                      exposure: 485000,
                      dso: 42,
                      industry: 'Technology'
                    },
                    {
                      customer: 'GreenEarth Manufacturing',
                      score: 820,
                      risk: 'Low',
                      paymentHistory: '98%',
                      exposure: 225000,
                      dso: 28,
                      industry: 'Manufacturing'
                    },
                    {
                      customer: 'RetailMax Group',
                      score: 680,
                      risk: 'High',
                      paymentHistory: '87%',
                      exposure: 890000,
                      dso: 67,
                      industry: 'Retail'
                    },
                    {
                      customer: 'Global Industrial Corp',
                      score: 590,
                      risk: 'Critical',
                      paymentHistory: '72%',
                      exposure: 125000,
                      dso: 89,
                      industry: 'Industrial'
                    }
                  ].map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.customer}</TableCell>
                      <TableCell>
                        <Badge variant={customer.score >= 750 ? 'default' : customer.score >= 650 ? 'secondary' : 'destructive'}>
                          {customer.score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          customer.risk === 'Low' ? 'default' : 
                          customer.risk === 'Medium' ? 'secondary' : 
                          customer.risk === 'High' ? 'outline' : 'destructive'
                        }>
                          {customer.risk}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.paymentHistory}</TableCell>
                      <TableCell>${customer.exposure.toLocaleString()}</TableCell>
                      <TableCell>{customer.dso}</TableCell>
                      <TableCell>{customer.industry}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileCheck className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-blocks">
          <Card>
            <CardHeader>
              <CardTitle>Credit Block Management</CardTitle>
              <CardDescription>Manage orders blocked due to credit limit violations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <Ban className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">Blocked Orders</p>
                      <p className="text-2xl font-bold text-red-600">23</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Blocked Value</p>
                      <p className="text-2xl font-bold text-orange-600">$2.1M</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Avg Block Time</p>
                      <p className="text-2xl font-bold text-blue-600">2.5 days</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Block Reason</TableHead>
                    <TableHead>Block Date</TableHead>
                    <TableHead>Proposed Action</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>SO-2025-{(i + 1001).toString().padStart(4, '0')}</TableCell>
                      <TableCell>
                        {['TechFlow Solutions', 'RetailMax Group', 'Global Industrial Corp'][i % 3]}
                      </TableCell>
                      <TableCell>${(125000 + i * 15000).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {['Credit Limit Exceeded', 'Payment Overdue', 'Risk Score Too Low'][i % 3]}
                        </Badge>
                      </TableCell>
                      <TableCell>2025-07-{(7 - i).toString().padStart(2, '0')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {['Request Approval', 'Payment Required', 'Manual Review'][i % 3]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Ban className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-scoring">
          <Card>
            <CardHeader>
              <CardTitle>Credit Scoring Engine</CardTitle>
              <CardDescription>Advanced credit scoring algorithms and model management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Scoring Models</h4>
                  {[
                    {
                      name: 'Standard Credit Model',
                      version: 'v2.1',
                      accuracy: '94.2%',
                      status: 'Active',
                      color: 'bg-green-100 text-green-800'
                    },
                    {
                      name: 'Industry-Specific Model',
                      version: 'v1.8',
                      accuracy: '91.7%',
                      status: 'Active',
                      color: 'bg-blue-100 text-blue-800'
                    },
                    {
                      name: 'Behavioral Scoring Model',
                      version: 'v3.0',
                      accuracy: '96.1%',
                      status: 'Testing',
                      color: 'bg-orange-100 text-orange-800'
                    }
                  ].map((model) => (
                    <Card key={model.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{model.name}</h5>
                          <p className="text-sm text-muted-foreground">Version {model.version} • Accuracy: {model.accuracy}</p>
                        </div>
                        <Badge className={model.color}>{model.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Score Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Excellent (750+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                        </div>
                        <span className="text-sm font-medium">35%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Good (650-749)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                        </div>
                        <span className="text-sm font-medium">42%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Fair (550-649)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                        </div>
                        <span className="text-sm font-medium">18%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Poor (&lt; 550)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-600 h-2 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure-monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Customer Risk Assessment Matrix</CardTitle>
              <CardDescription>Credit risk analysis and scoring for all customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search customers..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="critical">Critical Risk</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Report
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Payment History</TableHead>
                    <TableHead>Current Exposure</TableHead>
                    <TableHead>DSO (Days)</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      customer: 'TechFlow Solutions',
                      score: 745,
                      risk: 'Medium',
                      paymentHistory: '94%',
                      exposure: 485000,
                      dso: 42,
                      industry: 'Technology'
                    },
                    {
                      customer: 'GreenEarth Manufacturing',
                      score: 820,
                      risk: 'Low',
                      paymentHistory: '98%',
                      exposure: 225000,
                      dso: 28,
                      industry: 'Manufacturing'
                    },
                    {
                      customer: 'RetailMax Group',
                      score: 680,
                      risk: 'High',
                      paymentHistory: '87%',
                      exposure: 890000,
                      dso: 67,
                      industry: 'Retail'
                    },
                    {
                      customer: 'Global Industrial Corp',
                      score: 590,
                      risk: 'Critical',
                      paymentHistory: '72%',
                      exposure: 125000,
                      dso: 89,
                      industry: 'Industrial'
                    }
                  ].map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.customer}</TableCell>
                      <TableCell>
                        <Badge variant={customer.score >= 750 ? 'default' : customer.score >= 650 ? 'secondary' : 'destructive'}>
                          {customer.score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          customer.risk === 'Low' ? 'default' : 
                          customer.risk === 'Medium' ? 'secondary' : 
                          customer.risk === 'High' ? 'outline' : 'destructive'
                        }>
                          {customer.risk}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.paymentHistory}</TableCell>
                      <TableCell>${customer.exposure.toLocaleString()}</TableCell>
                      <TableCell>{customer.dso}</TableCell>
                      <TableCell>{customer.industry}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileCheck className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-blocks">
          <Card>
            <CardHeader>
              <CardTitle>Credit Block Management</CardTitle>
              <CardDescription>Manage orders blocked due to credit limit violations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <Ban className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">Blocked Orders</p>
                      <p className="text-2xl font-bold text-red-600">23</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Blocked Value</p>
                      <p className="text-2xl font-bold text-orange-600">$2.1M</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Avg Block Time</p>
                      <p className="text-2xl font-bold text-blue-600">2.5 days</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Block Reason</TableHead>
                    <TableHead>Block Date</TableHead>
                    <TableHead>Proposed Action</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>SO-2025-{(i + 1001).toString().padStart(4, '0')}</TableCell>
                      <TableCell>
                        {['TechFlow Solutions', 'RetailMax Group', 'Global Industrial Corp'][i % 3]}
                      </TableCell>
                      <TableCell>${(125000 + i * 15000).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {['Credit Limit Exceeded', 'Payment Overdue', 'Risk Score Too Low'][i % 3]}
                        </Badge>
                      </TableCell>
                      <TableCell>2025-07-{(7 - i).toString().padStart(2, '0')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {['Request Approval', 'Payment Required', 'Manual Review'][i % 3]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Ban className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-scoring">
          <Card>
            <CardHeader>
              <CardTitle>Credit Scoring Engine</CardTitle>
              <CardDescription>Advanced credit scoring algorithms and model management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Scoring Models</h4>
                  {[
                    {
                      name: 'Standard Credit Model',
                      version: 'v2.1',
                      accuracy: '94.2%',
                      status: 'Active',
                      color: 'bg-green-100 text-green-800'
                    },
                    {
                      name: 'Industry-Specific Model',
                      version: 'v1.8',
                      accuracy: '91.7%',
                      status: 'Active',
                      color: 'bg-blue-100 text-blue-800'
                    },
                    {
                      name: 'Behavioral Scoring Model',
                      version: 'v3.0',
                      accuracy: '96.1%',
                      status: 'Testing',
                      color: 'bg-orange-100 text-orange-800'
                    }
                  ].map((model) => (
                    <Card key={model.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{model.name}</h5>
                          <p className="text-sm text-muted-foreground">Version {model.version} • Accuracy: {model.accuracy}</p>
                        </div>
                        <Badge className={model.color}>{model.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Score Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Excellent (750+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                        </div>
                        <span className="text-sm font-medium">35%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Good (650-749)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                        </div>
                        <span className="text-sm font-medium">42%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Fair (550-649)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                        </div>
                        <span className="text-sm font-medium">18%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Poor (&lt; 550)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-600 h-2 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure-monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Credit Exposure Monitoring</CardTitle>
              <CardDescription>Real-time monitoring of credit exposure across all customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="p-4 text-center">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Total Exposure</p>
                  <p className="text-xl font-bold">$2.45M</p>
                </Card>
                <Card className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Available Credit</p>
                  <p className="text-xl font-bold">$1.87M</p>
                </Card>
                <Card className="p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">At Risk Exposure</p>
                  <p className="text-xl font-bold">$425K</p>
                </Card>
                <Card className="p-4 text-center">
                  <Ban className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Blocked Amount</p>
                  <p className="text-xl font-bold">$2.1M</p>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Exposure Concentration</h4>
                <div className="space-y-3">
                  {[
                    { name: 'TechFlow Solutions', exposure: 485000, limit: 500000, percentage: 97 },
                    { name: 'RetailMax Group', exposure: 890000, limit: 1000000, percentage: 89 },
                    { name: 'GreenEarth Manufacturing', exposure: 225000, limit: 750000, percentage: 30 },
                    { name: 'Global Industrial Corp', exposure: 125000, limit: 200000, percentage: 63 }
                  ].map((customer) => (
                    <div key={customer.name} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h5 className="font-medium">{customer.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          ${customer.exposure.toLocaleString()} / ${customer.limit.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <Progress value={customer.percentage} className="w-full" />
                        </div>
                        <Badge variant={customer.percentage >= 90 ? 'destructive' : customer.percentage >= 70 ? 'outline' : 'secondary'}>
                          {customer.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Credit Approval Workflow</CardTitle>
              <CardDescription>Manage credit limit requests and approval processes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search approval requests..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Current Limit</TableHead>
                    <TableHead>Requested Limit</TableHead>
                    <TableHead>Justification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>CR-2025-{(i + 1001).toString().padStart(4, '0')}</TableCell>
                      <TableCell>
                        {['TechFlow Solutions', 'RetailMax Group', 'Global Industrial Corp'][i % 3]}
                      </TableCell>
                      <TableCell>
                        {['Increase', 'New Limit', 'Temporary Increase'][i % 3]}
                      </TableCell>
                      <TableCell>${(500000 + i * 100000).toLocaleString()}</TableCell>
                      <TableCell>${(750000 + i * 150000).toLocaleString()}</TableCell>
                      <TableCell>
                        {['Seasonal increase needed', 'New major project', 'Business expansion'][i % 3]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={i % 3 === 0 ? 'secondary' : i % 3 === 1 ? 'default' : 'destructive'}>
                          {['Pending', 'Approved', 'Rejected'][i % 3]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Ban className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreditManagement;