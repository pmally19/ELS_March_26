import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Database, 
  DollarSign, 
  Package, 
  Factory, 
  TrendingUp, 
  Users, 
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Building2,
  ShoppingCart,
  FileText,
  Activity
} from 'lucide-react';
import { Link } from 'wouter';
import PageHeading from '@/components/ui/page-heading';

interface SystemMetrics {
  timestamp: string;
  database: {
    totalTables: number;
    totalViews: number;
    databaseSizeMB: number;
  };
  masterData: {
    companyCodes: number;
    customers: number;
    vendors: number;
    materials: number;
    plants: number;
    storageLocations: number;
  };
  transactions: {
    salesOrders: number;
    purchaseOrders: number;
    postedGLDocuments: number;
    totalPostedAmount: number;
  };
  financial: {
    glAccounts: number;
    openARItems: number;
    totalAROutstanding: number;
    openAPItems: number;
    totalAPOutstanding: number;
  };
  assets: {
    totalAssets: number;
    activeAssets: number;
    totalAcquisitionValue: number;
    completedDepreciationRuns: number;
  };
  inventory: {
    materialsWithStock: number;
    totalQuantity: number;
    movementsLast30Days: number;
  };
  production: {
    activeProductionOrders: number;
    activeWorkCenters: number;
    activeBOMs: number;
  };
  users: {
    total_users: number;
    active_users: number;
  };
  systemHealth: {
    errorsLast24h: number;
    errorsLast7d: number;
  };
}

export default function SystemMetrics() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: metrics, isLoading, error, refetch } = useQuery<{ success: boolean; data: SystemMetrics }>({
    queryKey: ['/api/system-metrics/overview'],
    queryFn: async () => {
      const response = await apiRequest('/api/system-metrics/overview');
      return await response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="container p-6">
        <PageHeading 
          title="System Metrics" 
          description="View performance metrics and system statistics"
          icon={<LineChart className="h-6 w-6" />}
        />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !metrics?.success) {
    return (
      <div className="container p-6">
        <PageHeading 
          title="System Metrics" 
          description="View performance metrics and system statistics"
          icon={<LineChart className="h-6 w-6" />}
        />
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load system metrics. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = metrics.data;

  return (
    <div className="container p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeading 
          title="System Metrics" 
          description="View performance metrics and system statistics"
          icon={<LineChart className="h-6 w-6" />}
        />
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/tools">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tools
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="master-data">Master Data</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.database.databaseSizeMB)} MB</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.database.totalTables)} tables, {formatNumber(data.database.totalViews)} views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.users.total_users)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.users.active_users)} active in last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.systemHealth.errorsLast24h)}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours ({formatNumber(data.systemHealth.errorsLast7d)} in last 7 days)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posted Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.transactions.totalPostedAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.transactions.postedGLDocuments)} posted documents
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="master-data" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.companyCodes)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.customers)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.vendors)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.materials)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Plants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.plants)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.masterData.storageLocations)}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sales Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.transactions.salesOrders)}</div>
                <p className="text-sm text-muted-foreground mt-2">Total active orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.transactions.purchaseOrders)}</div>
                <p className="text-sm text-muted-foreground mt-2">Total active orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  GL Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.transactions.postedGLDocuments)}</div>
                <p className="text-sm text-muted-foreground mt-2">Posted documents</p>
                <p className="text-lg font-semibold mt-2">{formatCurrency(data.transactions.totalPostedAmount)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>GL Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.financial.glAccounts)}</div>
                <p className="text-sm text-muted-foreground mt-2">Active accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accounts Receivable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.financial.openARItems)}</div>
                <p className="text-sm text-muted-foreground mt-2">Open items</p>
                <p className="text-lg font-semibold mt-2">{formatCurrency(data.financial.totalAROutstanding)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accounts Payable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.financial.openAPItems)}</div>
                <p className="text-sm text-muted-foreground mt-2">Open items</p>
                <p className="text-lg font-semibold mt-2">{formatCurrency(data.financial.totalAPOutstanding)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.assets.totalAssets)}</div>
                <p className="text-sm text-muted-foreground mt-2">{formatNumber(data.assets.activeAssets)} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Acquisition Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(data.assets.totalAcquisitionValue)}</div>
                <p className="text-sm text-muted-foreground mt-2">All assets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Depreciation Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.assets.completedDepreciationRuns)}</div>
                <p className="text-sm text-muted-foreground mt-2">Completed runs</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Materials with Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.inventory.materialsWithStock)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Quantity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.inventory.totalQuantity)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Movements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.inventory.movementsLast30Days)}</div>
                <p className="text-sm text-muted-foreground mt-2">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Production Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.production.activeProductionOrders)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Work Centers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.production.activeWorkCenters)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active BOMs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(data.production.activeBOMs)}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(data.systemHealth.errorsLast24h)}</div>
                    <p className="text-sm text-muted-foreground">Errors in last 24 hours</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(data.systemHealth.errorsLast7d)}</div>
                    <p className="text-sm text-muted-foreground">Errors in last 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(data.database.totalTables)}</div>
                    <p className="text-sm text-muted-foreground">Total tables</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(data.database.totalViews)}</div>
                    <p className="text-sm text-muted-foreground">Total views</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(data.database.databaseSizeMB)} MB</div>
                    <p className="text-sm text-muted-foreground">Database size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

