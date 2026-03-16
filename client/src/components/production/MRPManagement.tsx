import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MRPAreasConfiguration from './MRPAreasConfiguration';
import { 
  Play, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Factory,
  Package,
  Calculator,
  FileText,
  Clock,
  Users,
  BarChart3,
  ArrowUpDown,
  Zap
} from 'lucide-react';

interface MRPDashboardData {
  overview: {
    materials_under_mrp: number;
    total_materials: number;
    materials_in_stock: number;
    total_inventory_value: number;
    open_mrp_elements: number;
    purchase_requisitions_needed: number;
    planned_orders_needed: number;
    significant_variances: number;
    monthly_variance_total: number;
    recent_mrp_runs: number;
    last_mrp_run: string;
  };
  topMaterials: Array<{
    material_code: string;
    description: string;
    stock_quantity: number;
    stock_value: number;
    unit_price: number;
  }>;
  varianceAnalysis: Array<{
    variance_type: string;
    variance_category: string;
    variance_count: number;
    total_variance: number;
    avg_variance: number;
  }>;
}

const MRPManagement: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [mrpRunParams, setMrpRunParams] = useState({
    plantId: '',
    mrpArea: 'ALL',
    planningHorizon: '365',
    runType: 'TOTAL'
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch MRP Dashboard Analytics
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<MRPDashboardData>({
    queryKey: ['/api/mrp-integration/dashboard-analytics'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch MRP Controllers
  const { data: mrpControllers, isLoading: isControllersLoading } = useQuery({
    queryKey: ['/api/mrp-integration/controllers'],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch MRP Run History
  const { data: runHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['/api/mrp-integration/run-history'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch Manufacturing Variances
  const { data: manufacturingVariances, isLoading: isVariancesLoading } = useQuery({
    queryKey: ['/api/mrp-integration/manufacturing-variances'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Execute MRP Run Mutation
  const executeMrpRunMutation = useMutation({
    mutationFn: (params: any) => 
      apiRequest('/api/mrp-integration/execute-mrp', {
        method: 'POST',
        body: params,
      }),
    onSuccess: (data) => {
      toast({
        title: "MRP Run Completed",
        description: `Successfully processed ${data.data.results.materialsProcessed} materials`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mrp-integration'] });
    },
    onError: (error: any) => {
      toast({
        title: "MRP Run Failed",
        description: error.message || "Failed to execute MRP run",
        variant: "destructive",
      });
    },
  });

  // Initialize Master Data Mutation
  const initializeMasterDataMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/mrp-integration/initialize-master-data', {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: "Master Data Initialized",
        description: "MRP master data has been successfully initialized",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mrp-integration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize master data",
        variant: "destructive",
      });
    },
  });

  const handleExecuteMrpRun = () => {
    const params = {
      ...mrpRunParams,
      plantId: mrpRunParams.plantId ? parseInt(mrpRunParams.plantId) : undefined,
      planningHorizon: parseInt(mrpRunParams.planningHorizon),
    };
    executeMrpRunMutation.mutate(params);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manufacturing Resource Planning (MRP)</h1>
          <p className="text-muted-foreground">
            Complete MRP system with accounting integration, variance analysis, and enterprise-grade planning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => initializeMasterDataMutation.mutate()}
            disabled={initializeMasterDataMutation.isPending}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Initialize Master Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            MRP Execution
          </TabsTrigger>
          <TabsTrigger value="areas" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            MRP Areas
          </TabsTrigger>
          <TabsTrigger value="controllers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Controllers
          </TabsTrigger>
          <TabsTrigger value="variances" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Variances
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Accounting
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Run History
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {isDashboardLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Materials Under MRP</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.overview.materials_under_mrp || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {dashboardData?.overview.total_materials || 0} total materials
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dashboardData?.overview.total_inventory_value || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData?.overview.materials_in_stock || 0} materials in stock
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open MRP Elements</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.overview.open_mrp_elements || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Req: {dashboardData?.overview.purchase_requisitions_needed || 0} | 
                      Orders: {dashboardData?.overview.planned_orders_needed || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Variances</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dashboardData?.overview.monthly_variance_total || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData?.overview.significant_variances || 0} significant variances
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Materials and Variance Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Materials by Value</CardTitle>
                    <CardDescription>Highest value inventory items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData?.topMaterials.slice(0, 5).map((material, index) => (
                        <div key={material.material_code} className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Badge variant="outline">#{index + 1}</Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {material.material_code}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {material.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(material.stock_value)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(material.stock_quantity)} units
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Variance Analysis</CardTitle>
                    <CardDescription>Manufacturing cost variances by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData?.varianceAnalysis.map((variance, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {variance.variance_type} - {variance.variance_category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {variance.variance_count} occurrences
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              variance.total_variance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(Math.abs(variance.total_variance))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Avg: {formatCurrency(Math.abs(variance.avg_variance))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* MRP Execution Tab */}
        <TabsContent value="execution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Execute MRP Run
              </CardTitle>
              <CardDescription>
                Run Material Requirements Planning with complete accounting integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plantId">Plant</Label>
                  <Select 
                    value={mrpRunParams.plantId} 
                    onValueChange={(value) => setMrpRunParams(prev => ({ ...prev, plantId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant (All plants if empty)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plants</SelectItem>
                      <SelectItem value="1">Main Manufacturing Plant</SelectItem>
                      <SelectItem value="2">Distribution Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mrpArea">MRP Area</Label>
                  <Select 
                    value={mrpRunParams.mrpArea} 
                    onValueChange={(value) => setMrpRunParams(prev => ({ ...prev, mrpArea: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Areas</SelectItem>
                      <SelectItem value="PROD">Production</SelectItem>
                      <SelectItem value="PROC">Procurement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planningHorizon">Planning Horizon (Days)</Label>
                  <Input
                    id="planningHorizon"
                    type="number"
                    value={mrpRunParams.planningHorizon}
                    onChange={(e) => setMrpRunParams(prev => ({ ...prev, planningHorizon: e.target.value }))}
                    min="1"
                    max="365"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="runType">Run Type</Label>
                  <Select 
                    value={mrpRunParams.runType} 
                    onValueChange={(value) => setMrpRunParams(prev => ({ ...prev, runType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOTAL">Total Planning</SelectItem>
                      <SelectItem value="NET">Net Change</SelectItem>
                      <SelectItem value="REGEN">Regenerative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleExecuteMrpRun}
                disabled={executeMrpRunMutation.isPending}
                className="w-full"
                size="lg"
              >
                {executeMrpRunMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing MRP Run...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute MRP Run
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MRP Controllers Tab */}
        <TabsContent value="controllers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MRP Controllers</CardTitle>
              <CardDescription>Manage MRP controller assignments and responsibilities</CardDescription>
            </CardHeader>
            <CardContent>
              {isControllersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {mrpControllers?.data?.map((controller: any) => (
                    <div key={controller.mrp_controllers.controller_code} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{controller.mrp_controllers.controller_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {controller.mrp_controllers.controller_code} | 
                          Plant: {controller.plants.plant_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Planning Horizon: {controller.mrp_controllers.planning_horizon} days
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={controller.mrp_controllers.is_active ? "default" : "secondary"}>
                          {controller.mrp_controllers.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manufacturing Variances Tab */}
        <TabsContent value="variances" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manufacturing Variances</CardTitle>
              <CardDescription>Cost variance analysis and root cause tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {isVariancesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {manufacturingVariances?.data?.slice(0, 10).map((variance: any) => (
                    <div key={variance.variance_number} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{variance.variance_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {variance.material_code} - {variance.material_description}
                          </p>
                        </div>
                        <Badge variant={variance.variance_amount > 0 ? "destructive" : "default"}>
                          {variance.variance_amount > 0 ? "Unfavorable" : "Favorable"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium">{variance.variance_type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium">{variance.variance_category}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Variance Amount</p>
                          <p className={`font-medium ${variance.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(variance.variance_amount))}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Posting Date</p>
                          <p className="font-medium">{new Date(variance.posting_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {variance.reason_text && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Reason: {variance.reason_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounting Integration Tab */}
        <TabsContent value="accounting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounting Integration</CardTitle>
              <CardDescription>Financial postings and account determination for MRP transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Account Determination</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Inventory - Raw Materials:</span>
                      <span className="font-mono">1400001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Work in Process:</span>
                      <span className="font-mono">1300001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost of Goods Sold:</span>
                      <span className="font-mono">5000001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Manufacturing Variances:</span>
                      <span className="font-mono">5100001</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Cost Component Structure</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Material Cost (60%):</span>
                      <span>Direct material consumption</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor Cost (20%):</span>
                      <span>Direct labor hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Machine Cost (10%):</span>
                      <span>Equipment utilization</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overhead (10%):</span>
                      <span>Variable + Fixed allocation</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MRP Areas Configuration Tab */}
        <TabsContent value="areas" className="space-y-6">
          <MRPAreasConfiguration />
        </TabsContent>

        {/* Run History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MRP Run History</CardTitle>
              <CardDescription>Historical MRP execution records and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {runHistory?.data?.map((run: any) => (
                    <div key={run.run_number} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{run.run_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(run.run_start_time).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={run.status === 'COMPLETED' ? "default" : "secondary"}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Plant</p>
                          <p className="font-medium">{run.plant_name || 'All Plants'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Materials Processed</p>
                          <p className="font-medium">{run.materials_processed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Run Type</p>
                          <p className="font-medium">{run.run_type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">
                            {run.run_end_time 
                              ? `${Math.round((new Date(run.run_end_time).getTime() - new Date(run.run_start_time).getTime()) / 1000)}s`
                              : 'In Progress'
                            }
                          </p>
                        </div>
                      </div>
                      {run.planning_run_results && (
                        <div className="mt-2 pt-2 border-t text-sm">
                          <p className="text-muted-foreground">
                            Results: {JSON.parse(run.planning_run_results).materialsProcessed} materials processed, 
                            {JSON.parse(run.planning_run_results).purchaseRequisitionsGenerated} purchase requisitions, 
                            {JSON.parse(run.planning_run_results).plannedOrdersGenerated} planned orders
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MRPManagement;