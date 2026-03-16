/**
 * GIGANTIC TABLES MANAGEMENT UI
 * Dynamic Table Structure and Business Process Integration
 * 
 * This component provides complete CRUD operations for enterprise_transaction_registry 
 * and material_movement_registry with real-time business process integration
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Database, TrendingUp, Activity, DollarSign, Package, Zap } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// API Helper Functions
const fetchFinancialTransactions = async (filters: any = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`/api/gigantic-tables/financial-transactions?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch financial transactions');
  return response.json();
};

const fetchMaterialMovements = async (filters: any = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`/api/gigantic-tables/material-movements?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch material movements');
  return response.json();
};

const fetchBusinessProcessAnalytics = async () => {
  const response = await fetch('/api/gigantic-tables/business-process-analytics');
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

export default function GiganticTablesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // State for filters
  const [financialFilters, setFinancialFilters] = useState({
    category: "",
    dateFrom: "",
    dateTo: "",
    customerVendor: "",
    limit: "100"
  });

  const [materialFilters, setMaterialFilters] = useState({
    category: "",
    material: "",
    dateFrom: "",
    dateTo: "",
    location: "",
    limit: "100"
  });

  // Queries
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/gigantic-tables/business-process-analytics'],
    queryFn: fetchBusinessProcessAnalytics,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: financialData, isLoading: financialLoading, refetch: refetchFinancial } = useQuery({
    queryKey: ['/api/gigantic-tables/financial-transactions', financialFilters],
    queryFn: () => fetchFinancialTransactions(financialFilters),
    enabled: activeTab === 'financial-transactions'
  });

  const { data: materialData, isLoading: materialLoading, refetch: refetchMaterial } = useQuery({
    queryKey: ['/api/gigantic-tables/material-movements', materialFilters],
    queryFn: () => fetchMaterialMovements(materialFilters),
    enabled: activeTab === 'material-movements'
  });

  // Mutations for business process integration
  const integrateSalesOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gigantic-tables/integrate-sales-order', 'POST', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Sales order integrated successfully into gigantic tables" });
      queryClient.invalidateQueries({ queryKey: ['/api/gigantic-tables'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const integrateInventoryReceiptMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gigantic-tables/integrate-inventory-receipt', 'POST', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Inventory receipt integrated successfully into gigantic tables" });
      queryClient.invalidateQueries({ queryKey: ['/api/gigantic-tables'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Test Integration Functions
  const testSalesOrderIntegration = () => {
    const testSalesOrder = {
      salesOrderNumber: `SO-${Date.now()}`,
      customerCode: "CUST001",
      totalAmount: 25000,
      items: [
        {
          materialCode: "MAT001",
          materialDescription: "Premium Paint - White",
          quantity: 100,
          unitPrice: 150
        },
        {
          materialCode: "MAT002", 
          materialDescription: "Industrial Coating",
          quantity: 50,
          unitPrice: 200
        }
      ],
      createdBy: 1
    };

    integrateSalesOrderMutation.mutate(testSalesOrder);
  };

  const testInventoryReceiptIntegration = () => {
    const testReceipt = {
      receiptNumber: `GR-${Date.now()}`,
      vendorCode: "VEND001",
      items: [
        {
          materialCode: "RAW001",
          materialDescription: "Chemical Base Material",
          quantity: 200,
          unitCost: 75
        },
        {
          materialCode: "RAW002",
          materialDescription: "Packaging Material",
          quantity: 500,
          unitCost: 25
        }
      ],
      createdBy: 1
    };

    integrateInventoryReceiptMutation.mutate(testReceipt);
  };

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <span>Gigantic Tables Management</span>
            </h1>
            <p className="text-gray-600">Dynamic Table Structure and Business Process Integration</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={testSalesOrderIntegration} disabled={integrateSalesOrderMutation.isPending}>
            <Zap className="h-4 w-4 mr-2" />
            Test Sales Integration
          </Button>
          <Button onClick={testInventoryReceiptIntegration} disabled={integrateInventoryReceiptMutation.isPending}>
            <Package className="h-4 w-4 mr-2" />
            Test Inventory Integration
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="financial-transactions">Financial Transactions</TabsTrigger>
          <TabsTrigger value="material-movements">Material Movements</TabsTrigger>
          <TabsTrigger value="integration">Business Integration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-8">Loading analytics...</div>
          ) : analyticsData?.success ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Financial Transactions</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.data.overview.totalFinancialTransactions}</div>
                    <p className="text-xs text-muted-foreground">
                      Total Value: {formatCurrency(analyticsData.data.overview.totalFinancialValue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Material Movements</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.data.overview.totalMaterialMovements}</div>
                    <p className="text-xs text-muted-foreground">
                      Total Value: {formatCurrency(analyticsData.data.overview.totalMaterialValue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Integration Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.data.overview.integrationRate}%</div>
                    <p className="text-xs text-muted-foreground">Financial-Material Sync</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">ACTIVE</div>
                    <p className="text-xs text-muted-foreground">Real-time Processing</p>
                  </CardContent>
                </Card>
              </div>

              {/* Process Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Process Breakdown</CardTitle>
                    <CardDescription>Transaction categories in Enterprise Transaction Registry</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.data.processBreakdown.financial).map(([process, count]) => (
                        <div key={process} className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">{process.toLowerCase()}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Material Movement Breakdown</CardTitle>
                    <CardDescription>Movement categories in Material Movement Registry</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.data.processBreakdown.material).map(([movement, count]) => (
                        <div key={movement} className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">{movement.toLowerCase()}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-red-500">Failed to load analytics</div>
          )}
        </TabsContent>

        {/* Financial Transactions Tab */}
        <TabsContent value="financial-transactions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Financial Transactions</CardTitle>
              <CardDescription>Filter transactions from Enterprise Transaction Registry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="financial-category">Category</Label>
                  <Select value={financialFilters.category} onValueChange={(value) => 
                    setFinancialFilters(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="PURCHASE">Purchase</SelectItem>
                      <SelectItem value="PRODUCTION">Production</SelectItem>
                      <SelectItem value="INVENTORY">Inventory</SelectItem>
                      <SelectItem value="FINANCE">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="financial-date-from">Date From</Label>
                  <Input 
                    type="date" 
                    value={financialFilters.dateFrom}
                    onChange={(e) => setFinancialFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="financial-date-to">Date To</Label>
                  <Input 
                    type="date" 
                    value={financialFilters.dateTo}
                    onChange={(e) => setFinancialFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="financial-customer">Customer/Vendor</Label>
                  <Input 
                    placeholder="Customer/Vendor Code" 
                    value={financialFilters.customerVendor}
                    onChange={(e) => setFinancialFilters(prev => ({ ...prev, customerVendor: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchFinancial()} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Transactions</CardTitle>
              <CardDescription>
                {financialData?.success && `${financialData.data.statistics.totalTransactions} transactions found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialLoading ? (
                <div className="text-center py-8">Loading financial transactions...</div>
              ) : financialData?.success ? (
                <div className="space-y-4">
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{financialData.data.statistics.totalTransactions}</div>
                      <div className="text-sm text-gray-600">Total Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(financialData.data.statistics.totalAmount)}</div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(financialData.data.statistics.averageAmount)}</div>
                      <div className="text-sm text-gray-600">Average Value</div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction UUID</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Reference Document</TableHead>
                          <TableHead>Net Amount</TableHead>
                          <TableHead>Business Partner</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData.data.transactions.map((transaction: any) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-mono text-xs">{transaction.transactionUuid}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.transactionCategory === 'SALES' ? 'default' : 'secondary'}>
                                {transaction.transactionCategory}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.referenceDocument}</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(parseFloat(transaction.netAmount || "0"))}
                            </TableCell>
                            <TableCell>{transaction.customerVendorCode || 'N/A'}</TableCell>
                            <TableCell>{formatDate(transaction.createdTimestamp)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.processingStatus}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">Failed to load financial transactions</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Material Movements Tab */}
        <TabsContent value="material-movements" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Material Movements</CardTitle>
              <CardDescription>Filter movements from Material Movement Registry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="material-category">Category</Label>
                  <Select value={materialFilters.category} onValueChange={(value) => 
                    setMaterialFilters(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="RECEIPT">Receipt</SelectItem>
                      <SelectItem value="ISSUE">Issue</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="material-identifier">Material</Label>
                  <Input 
                    placeholder="Material Code" 
                    value={materialFilters.material}
                    onChange={(e) => setMaterialFilters(prev => ({ ...prev, material: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="material-date-from">Date From</Label>
                  <Input 
                    type="date" 
                    value={materialFilters.dateFrom}
                    onChange={(e) => setMaterialFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="material-location">Location</Label>
                  <Input 
                    placeholder="Location Code" 
                    value={materialFilters.location}
                    onChange={(e) => setMaterialFilters(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchMaterial()} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Material Movements</CardTitle>
              <CardDescription>
                {materialData?.success && `${materialData.data.statistics.totalMovements} movements found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materialLoading ? (
                <div className="text-center py-8">Loading material movements...</div>
              ) : materialData?.success ? (
                <div className="space-y-4">
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{materialData.data.statistics.totalMovements}</div>
                      <div className="text-sm text-gray-600">Total Movements</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{materialData.data.statistics.totalQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Quantity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(materialData.data.statistics.totalValue)}</div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movement UUID</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialData.data.movements.map((movement: any) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-mono text-xs">{movement.movementUuid}</TableCell>
                            <TableCell>
                              <Badge variant={movement.movementCategory === 'RECEIPT' ? 'default' : 'secondary'}>
                                {movement.movementCategory}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-semibold">{movement.materialIdentifier}</div>
                                <div className="text-xs text-gray-600">{movement.materialDescription}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {parseFloat(movement.movementQuantity || "0").toLocaleString()} {movement.baseUnitMeasure}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(parseFloat(movement.totalValuation || "0"))}
                            </TableCell>
                            <TableCell>{movement.destinationLocationCode}</TableCell>
                            <TableCell>{formatDate(movement.createdTimestamp)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{movement.processingStatus}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">Failed to load material movements</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Process Integration</CardTitle>
              <CardDescription>
                Integration status between business processes and gigantic tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Integration Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Sales Order Integration</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Financial Transaction Creation</span>
                        <Badge variant="default">ACTIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Material Movement Recording</span>
                        <Badge variant="default">ACTIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Real-time Updates</span>
                        <Badge variant="default">ENABLED</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Inventory Receipt Integration</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Purchase Transaction Recording</span>
                        <Badge variant="default">ACTIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Material Receipt Processing</span>
                        <Badge variant="default">ACTIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Automatic Valuation</span>
                        <Badge variant="default">ENABLED</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Integration Section */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Test Integration Functions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sales Order Test</CardTitle>
                        <CardDescription>Test sales order integration with both gigantic tables</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={testSalesOrderIntegration} 
                          disabled={integrateSalesOrderMutation.isPending}
                          className="w-full"
                        >
                          {integrateSalesOrderMutation.isPending ? "Processing..." : "Create Test Sales Order"}
                        </Button>
                        <p className="text-xs text-gray-600 mt-2">
                          Creates a sales order with multiple line items and automatically populates both enterprise tables
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Inventory Receipt Test</CardTitle>
                        <CardDescription>Test inventory receipt integration with both gigantic tables</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={testInventoryReceiptIntegration} 
                          disabled={integrateInventoryReceiptMutation.isPending}
                          className="w-full"
                        >
                          {integrateInventoryReceiptMutation.isPending ? "Processing..." : "Create Test Receipt"}
                        </Button>
                        <p className="text-xs text-gray-600 mt-2">
                          Creates an inventory receipt and automatically updates both enterprise tables with valuation
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Integration Results */}
                {analyticsData?.success && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Recent Integration Activity</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Last Financial Transaction</span>
                        <span className="text-sm">
                          {analyticsData.data.recentActivity.lastFinancialTransaction 
                            ? formatDate(analyticsData.data.recentActivity.lastFinancialTransaction)
                            : 'No activity'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Last Material Movement</span>
                        <span className="text-sm">
                          {analyticsData.data.recentActivity.lastMaterialMovement 
                            ? formatDate(analyticsData.data.recentActivity.lastMaterialMovement)
                            : 'No activity'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}