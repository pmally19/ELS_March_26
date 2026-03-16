import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Truck, 
  FileText, 
  CreditCard, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';

interface IntegrationStats {
  monthlyStats: {
    salesOrders: number;
    deliveries: number;
    billings: number;
    payments: number;
  };
  pendingItems: {
    deliveries: any[];
    billings: any[];
  };
}

export default function SDFIIntegrationDashboard() {
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  // Fetch integration dashboard data
  const { data: dashboardData, isLoading } = useQuery<{data: IntegrationStats}>({
    queryKey: ['/api/sales-finance/integration-dashboard'],
  });

  const processSteps = [
    {
      id: 'sales-order',
      title: 'Sales Order',
      description: 'Customer places order',
      icon: ShoppingCart,
      status: 'completed',
      tile: 'S001',
      color: 'bg-blue-500',
    },
    {
      id: 'delivery',
      title: 'Delivery & PGI',
      description: 'Goods shipped, COGS posted',
      icon: Truck,
      status: 'in-progress',
      tile: 'S002',
      color: 'bg-orange-500',
    },
    {
      id: 'billing',
      title: 'Customer Invoice',
      description: 'Invoice created, revenue posted',
      icon: FileText,
      status: 'pending',
      tile: 'S003',
      color: 'bg-green-500',
    },
    {
      id: 'payment',
      title: 'Customer Payment',
      description: 'Payment received, AR cleared',
      icon: CreditCard,
      status: 'pending',
      tile: 'F001',
      color: 'bg-purple-500',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">Loading integration dashboard...</div>
      </div>
    );
  }

  const stats = dashboardData?.data?.monthlyStats || {
    salesOrders: 0,
    deliveries: 0,
    billings: 0,
    payments: 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales-Finance Integration Dashboard</h1>
            <p className="text-gray-600 mt-1">Order-to-Cash Process with Financial Integration</p>
          </div>
        </div>
      </div>

      {/* Process Flow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Order-to-Cash Process Flow</CardTitle>
          <CardDescription>
            Complete sales and financial integration following standard methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4 overflow-x-auto pb-4">
            {processSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-4 min-w-0">
                <div 
                  className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedProcess === step.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProcess(step.id)}
                >
                  <div className={`p-3 rounded-full ${step.color} text-white mb-2`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm text-center">{step.title}</h3>
                  <p className="text-xs text-gray-500 text-center mt-1">{step.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getStatusIcon(step.status)}
                    <Badge variant={getStatusVariant(step.status)} className="text-xs">
                      {step.tile}
                    </Badge>
                  </div>
                </div>
                {index < processSteps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Orders</p>
                <p className="text-3xl font-bold text-blue-600">{stats.salesOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <Progress value={75} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">75% completed this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deliveries</p>
                <p className="text-3xl font-bold text-orange-600">{stats.deliveries}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4">
              <Progress value={60} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">60% with PGI posted</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Invoices</p>
                <p className="text-3xl font-bold text-green-600">{stats.billings}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <Progress value={85} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">85% revenue posted</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payments</p>
                <p className="text-3xl font-bold text-purple-600">{stats.payments}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <Progress value={90} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">90% collection rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Actions</TabsTrigger>
          <TabsTrigger value="accounting">FI Integration</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Pending Deliveries (PGI)
                </CardTitle>
                <CardDescription>
                  Deliveries requiring Post Goods Issue processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.data?.pendingItems?.deliveries?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.data.pendingItems.deliveries.map((delivery: any) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                          <TableCell>Customer {delivery.customerId}</TableCell>
                          <TableCell>{new Date(delivery.deliveryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Pending PGI</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All deliveries have PGI posted</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Pending Billings
                </CardTitle>
                <CardDescription>
                  Billing documents pending financial posting
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.data?.pendingItems?.billings?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.data.pendingItems.billings.map((billing: any) => (
                        <TableRow key={billing.id}>
                          <TableCell className="font-medium">{billing.billingNumber}</TableCell>
                          <TableCell>Customer {billing.customerId}</TableCell>
                          <TableCell>${parseFloat(billing.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Pending Posting</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All billings have been posted</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Integration Status</CardTitle>
              <CardDescription>
                Automatic posting configuration and account determination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">COGS Posting (PGI)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Dr. COGS (500000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cr. Inventory (140000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Revenue Posting (Billing)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Dr. A/R (110000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cr. Revenue (300000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cr. Tax (210000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Payment Posting</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Dr. Bank (113000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cr. A/R (110000)</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Determination</CardTitle>
                <CardDescription>
                  Configure GL account assignment for revenue posting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Account Key</span>
                      <p>ERL (Sales Revenue)</p>
                    </div>
                    <div>
                      <span className="font-medium">GL Account</span>
                      <p>300000</p>
                    </div>
                    <div>
                      <span className="font-medium">Customer Group</span>
                      <p>01 (Domestic)</p>
                    </div>
                    <div>
                      <span className="font-medium">Material Group</span>
                      <p>03 (Finished Goods)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Configuration</CardTitle>
                <CardDescription>
                  Condition types and pricing procedures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Base Price</span>
                      <p>PR00 (Material Price)</p>
                    </div>
                    <div>
                      <span className="font-medium">Tax</span>
                      <p>MWST (10% Standard)</p>
                    </div>
                    <div>
                      <span className="font-medium">Procedure</span>
                      <p>RVAA01 (Standard)</p>
                    </div>
                    <div>
                      <span className="font-medium">Currency</span>
                      <p>USD</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>
                Standard reports for Sales-Finance integration analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Sales Analysis</div>
                    <div className="text-sm text-gray-500">Order-to-cash cycle analysis</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Revenue Recognition</div>
                    <div className="text-sm text-gray-500">Billing and revenue posting</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">A/R Aging</div>
                    <div className="text-sm text-gray-500">Outstanding customer balances</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">COGS Analysis</div>
                    <div className="text-sm text-gray-500">Cost of goods sold tracking</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Integration Log</div>
                    <div className="text-sm text-gray-500">Sales-Finance posting verification</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Document Flow</div>
                    <div className="text-sm text-gray-500">End-to-end process tracking</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}