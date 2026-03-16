import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, 
  FileCheck, 
  Globe, 
  Receipt, 
  Settings, 
  RefreshCw,
  Plus,
  Eye,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

const TaxProcessing = () => {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('US');
  const [taxPeriod, setTaxPeriod] = useState('2025-07');
  const [calculationMethod, setCalculationMethod] = useState('standard');
  const queryClient = useQueryClient();

  const { data: taxData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/tax-processing'],
    queryFn: async () => {
      const response = await fetch('/api/transaction-tiles/tax-processing');
      return response.json();
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/transaction-tiles/tax-processing/refresh', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/tax-processing'] });
    }
  });

  const configureMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/transaction-tiles/tax-processing/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/tax-processing'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading tax processing engine...</p>
        </div>
      </div>
    );
  }

  const taxItems = taxData?.data || [];
  
  // Tax Processing specific calculations
  const totalTaxLiability = 287450;
  const federalTax = 198750;
  const stateTax = 52300;
  const localTax = 36400;
  const pendingReturns = 12;
  const complianceRate = 98.7;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleConfigure = () => {
    configureMutation.mutate({
      jurisdiction: selectedJurisdiction,
      period: taxPeriod,
      method: calculationMethod
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Processing Engine</h1>
          <p className="text-muted-foreground">SAP FTXP - Multi-jurisdiction tax calculation and compliance management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={handleConfigure} disabled={configureMutation.isPending}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Rules
          </Button>
        </div>
      </div>

      {/* Tax Engine Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Liability</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalTaxLiability.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Federal Tax</CardTitle>
            <Globe className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${federalTax.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">21% corporate rate</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">State Tax</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stateTax.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Multi-state allocation</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Local Tax</CardTitle>
            <FileCheck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${localTax.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Municipal obligations</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceRate}%</div>
            <p className="text-xs text-muted-foreground">Filing accuracy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tax-calculation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="tax-calculation">Tax Calculation</TabsTrigger>
          <TabsTrigger value="tax-returns">Tax Returns</TabsTrigger>
          <TabsTrigger value="jurisdiction-setup">Jurisdictions</TabsTrigger>
          <TabsTrigger value="compliance-monitoring">Compliance</TabsTrigger>
          <TabsTrigger value="tax-reporting">Reports</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="tax-calculation">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Tax Calculation Engine
                </CardTitle>
                <CardDescription>Configure tax calculation parameters and methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Period</label>
                  <Input 
                    value={taxPeriod} 
                    onChange={(e) => setTaxPeriod(e.target.value)}
                    placeholder="YYYY-MM"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Jurisdiction</label>
                  <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Calculation Method</label>
                  <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Method</SelectItem>
                      <SelectItem value="alternative">Alternative Minimum Tax</SelectItem>
                      <SelectItem value="simplified">Simplified Method</SelectItem>
                      <SelectItem value="consolidated">Consolidated Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Types</label>
                  <div className="space-y-2">
                    {[
                      { id: 'income', label: 'Corporate Income Tax', rate: '21%' },
                      { id: 'sales', label: 'Sales Tax', rate: '8.25%' },
                      { id: 'property', label: 'Property Tax', rate: '1.2%' },
                      { id: 'payroll', label: 'Payroll Tax', rate: '15.3%' }
                    ].map((tax) => (
                      <div key={tax.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked id={tax.id} />
                          <label htmlFor={tax.id} className="text-sm">{tax.label}</label>
                        </div>
                        <Badge variant="outline">{tax.rate}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Taxes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Calculation Progress</CardTitle>
                <CardDescription>Current tax processing status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transactions Processed</span>
                    <span>8,547 / 12,340</span>
                  </div>
                  <Progress value={69} className="w-full" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Income Tax Calculated</span>
                    </div>
                    <Badge variant="outline">$198,750</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Sales Tax Processing</span>
                    </div>
                    <Badge variant="outline">In Progress</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Exceptions Requiring Review</span>
                    </div>
                    <Badge variant="outline">23 items</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Calculation Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax-returns">
          <Card>
            <CardHeader>
              <CardTitle>Tax Return Management</CardTitle>
              <CardDescription>Prepare, file, and track tax returns across jurisdictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search returns by form number..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Returns</SelectItem>
                    <SelectItem value="prepared">Prepared</SelectItem>
                    <SelectItem value="filed">Filed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="amended">Amended</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Return
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Tax Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      form: '1120',
                      type: 'Corporate Income',
                      period: '2024',
                      jurisdiction: 'Federal',
                      amount: 198750,
                      status: 'Filed',
                      dueDate: '2025-03-15'
                    },
                    {
                      form: 'ST-1',
                      type: 'Sales Tax',
                      period: '2025-Q2',
                      jurisdiction: 'California',
                      amount: 24650,
                      status: 'Prepared',
                      dueDate: '2025-07-31'
                    },
                    {
                      form: '941',
                      type: 'Payroll Tax',
                      period: '2025-Q2',
                      jurisdiction: 'Federal',
                      amount: 45230,
                      status: 'Pending',
                      dueDate: '2025-07-31'
                    }
                  ].map((return_, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{return_.form}</TableCell>
                      <TableCell>{return_.type}</TableCell>
                      <TableCell>{return_.period}</TableCell>
                      <TableCell>{return_.jurisdiction}</TableCell>
                      <TableCell>${return_.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={return_.status === 'Filed' ? 'default' : return_.status === 'Prepared' ? 'secondary' : 'outline'}>
                          {return_.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{return_.dueDate}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Upload className="h-3 w-3" />
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

        <TabsContent value="jurisdiction-setup">
          <Card>
            <CardHeader>
              <CardTitle>Tax Jurisdiction Configuration</CardTitle>
              <CardDescription>Configure tax rules and rates by jurisdiction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    jurisdiction: 'Federal (US)',
                    code: 'US-FED',
                    rates: 'Corporate: 21%, Payroll: 15.3%',
                    filingFreq: 'Annual/Quarterly',
                    status: 'Active',
                    color: 'bg-blue-100 text-blue-800'
                  },
                  {
                    jurisdiction: 'California',
                    code: 'US-CA',
                    rates: 'State: 8.84%, Sales: 7.25%',
                    filingFreq: 'Monthly/Quarterly',
                    status: 'Active', 
                    color: 'bg-green-100 text-green-800'
                  },
                  {
                    jurisdiction: 'New York',
                    code: 'US-NY',
                    rates: 'State: 6.5%, NYC: 8.875%',
                    filingFreq: 'Monthly/Quarterly',
                    status: 'Active',
                    color: 'bg-purple-100 text-purple-800'
                  },
                  {
                    jurisdiction: 'Texas',
                    code: 'US-TX',
                    rates: 'Franchise: 0.375%, Sales: 6.25%',
                    filingFreq: 'Annual/Monthly',
                    status: 'Active',
                    color: 'bg-orange-100 text-orange-800'
                  },
                  {
                    jurisdiction: 'Canada',
                    code: 'CA',
                    rates: 'Federal: 15%, GST: 5%',
                    filingFreq: 'Annual/Monthly',
                    status: 'Configured',
                    color: 'bg-indigo-100 text-indigo-800'
                  },
                  {
                    jurisdiction: 'United Kingdom',
                    code: 'UK',
                    rates: 'Corporation: 25%, VAT: 20%',
                    filingFreq: 'Annual/Quarterly',
                    status: 'Inactive',
                    color: 'bg-gray-100 text-gray-800'
                  }
                ].map((jurisdiction) => (
                  <Card key={jurisdiction.code} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{jurisdiction.jurisdiction}</h4>
                      <Badge className={jurisdiction.color}>{jurisdiction.code}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Rates:</span>
                        <span className="text-xs">{jurisdiction.rates}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filing:</span>
                        <span>{jurisdiction.filingFreq}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline">{jurisdiction.status}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Tax Compliance Monitoring</CardTitle>
              <CardDescription>Monitor compliance status and manage deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-semibold mb-3">Compliance Dashboard</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Returns Filed On Time:</span>
                        <span className="font-medium text-green-600">47/48</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending Returns:</span>
                        <span className="font-medium text-orange-600">{pendingReturns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Audit Risk Score:</span>
                        <span className="font-medium">Low</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Compliance Review:</span>
                        <span className="font-medium">2025-06-01</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Upcoming Deadlines</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">941 Due: Jul 31</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">ST-1 Due: Jul 31</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">1120 Filed</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">System Health</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Tax engine operational</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Rate updates current</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Backups completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-reporting">
          <Card>
            <CardHeader>
              <CardTitle>Tax Reporting & Analytics</CardTitle>
              <CardDescription>Generate comprehensive tax reports and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'Tax Liability Report',
                    description: 'Detailed breakdown of tax obligations by jurisdiction',
                    icon: Receipt,
                    color: 'text-blue-600'
                  },
                  {
                    title: 'Compliance Summary',
                    description: 'Filing status and compliance metrics',
                    icon: FileCheck,
                    color: 'text-green-600'
                  },
                  {
                    title: 'Tax Rate Analysis',
                    description: 'Effective tax rates and optimization opportunities',
                    icon: Calculator,
                    color: 'text-purple-600'
                  },
                  {
                    title: 'Jurisdiction Comparison',
                    description: 'Multi-state tax burden analysis',
                    icon: Globe,
                    color: 'text-orange-600'
                  },
                  {
                    title: 'Audit Trail Report',
                    description: 'Complete transaction history for audit support',
                    icon: Eye,
                    color: 'text-indigo-600'
                  },
                  {
                    title: 'Tax Planning Report',
                    description: 'Strategic tax planning recommendations',
                    icon: Settings,
                    color: 'text-red-600'
                  }
                ].map((report) => (
                  <Card key={report.title} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <report.icon className={`h-6 w-6 ${report.color} mt-1`} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{report.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail">
          <Card>
            <CardHeader>
              <CardTitle>Tax Processing Audit Trail</CardTitle>
              <CardDescription>Complete audit trail of tax calculations and adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search audit entries..." className="max-w-sm" />
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Log
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>2025-07-{7 + i} 14:{30 + i}:00</TableCell>
                      <TableCell>TAX-{20250001 + i}</TableCell>
                      <TableCell>{['Income Tax', 'Sales Tax', 'Payroll Tax'][i % 3]}</TableCell>
                      <TableCell>{['Calculated', 'Adjusted', 'Filed'][i % 3]}</TableCell>
                      <TableCell>${(50000 + i * 5000).toLocaleString()}</TableCell>
                      <TableCell>TAX.PROCESSOR</TableCell>
                      <TableCell>
                        <Badge variant={i % 3 === 0 ? 'default' : 'secondary'}>
                          {i % 3 === 0 ? 'Completed' : 'Processing'}
                        </Badge>
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

export default TaxProcessing;