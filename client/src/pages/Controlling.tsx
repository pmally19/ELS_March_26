import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, BarChart3, TrendingUp, DollarSign, Users, Factory, Calculator, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from "wouter";

interface CostCenter {
  id: number;
  cost_center: string;
  description: string;
  cost_center_category: string;
  hierarchy_area: string;
  total_planned: number;
  total_actual: number;
  planning_entries: number;
  actual_entries: number;
}

interface VarianceAnalysis {
  cost_center: string;
  description: string;
  cost_center_category: string;
  planned_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
}

interface ProfitabilityData {
  customer_group: string;
  product_group: string;
  sales_organization: string;
  profit_center: string;
  revenue: number;
  cogs: number;
  gross_margin: number;
  operating_expenses: number;
  operating_profit: number;
  transactions: number;
}

export default function Controlling() {
  const [selectedPeriod, setSelectedPeriod] = useState('2025006');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [activeTab, setActiveTab] = useState('overview');
  const [newPlanning, setNewPlanning] = useState({
    cost_center: '',
    account: '',
    planned_amount: '',
    activity_type: ''
  });
  const [newActual, setNewActual] = useState({
    cost_center: '',
    account: '',
    actual_amount: '',
    activity_type: '',
    posting_date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cost centers
  const { data: costCenters, isLoading: loadingCostCenters } = useQuery({
    queryKey: ['/api/controlling/cost-centers'],
    queryFn: async () => {
      const response = await fetch('/api/controlling/cost-centers');
      if (!response.ok) throw new Error('Failed to fetch cost centers');
      const data = await response.json();
      return data.cost_centers;
    }
  });

  // Fetch variance analysis
  const { data: varianceData, isLoading: loadingVariance } = useQuery({
    queryKey: [`/api/controlling/variance-analysis/${selectedYear}/${selectedPeriod.slice(-2)}`],
    queryFn: async () => {
      const response = await fetch(`/api/controlling/variance-analysis/${selectedYear}/${selectedPeriod.slice(-2)}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to generate variance analysis');
      const data = await response.json();
      return data.variance_analysis;
    },
    enabled: !!selectedYear && !!selectedPeriod
  });

  // Fetch CO-PA data
  const { data: copaData, isLoading: loadingCopa } = useQuery({
    queryKey: [`/api/controlling/copa/${selectedYear}/${selectedPeriod.slice(-2)}`],
    queryFn: async () => {
      const response = await fetch(`/api/controlling/copa/${selectedYear}/${selectedPeriod.slice(-2)}`);
      if (!response.ok) throw new Error('Failed to fetch CO-PA data');
      const data = await response.json();
      return data.profitability_analysis;
    },
    enabled: !!selectedYear && !!selectedPeriod
  });

  // Create cost center planning
  const planningMutation = useMutation({
    mutationFn: async (planningData: any) => {
      const response = await fetch('/api/controlling/cost-center-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planningData)
      });
      if (!response.ok) throw new Error('Failed to create planning');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Cost center planning created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/controlling'] });
      setNewPlanning({ cost_center: '', account: '', planned_amount: '', activity_type: '' });
    }
  });

  // Post actual costs - NEW
  const actualMutation = useMutation({
    mutationFn: async (actualData: any) => {
      const response = await fetch('/api/controlling/post-actual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actualData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post actual');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Actual cost posted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/controlling'] });
      setNewActual({
        cost_center: '',
        account: '',
        actual_amount: '',
        activity_type: '',
        posting_date: new Date().toISOString().split('T')[0]
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error posting actual',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleCreatePlanning = () => {
    if (!newPlanning.cost_center || !newPlanning.account || !newPlanning.planned_amount) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    planningMutation.mutate({
      cost_center: newPlanning.cost_center,
      fiscal_year: parseInt(selectedYear),
      period: parseInt(selectedPeriod.slice(-2)),
      planning_data: [{
        account: newPlanning.account,
        activity_type: newPlanning.activity_type || null,
        planned_amount: parseFloat(newPlanning.planned_amount),
        planned_quantity: 0,
        currency: 'USD'
      }]
    });
  };

  const handlePostActual = () => {
    if (!newActual.cost_center || !newActual.account || !newActual.actual_amount || !newActual.posting_date) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    actualMutation.mutate({
      cost_center: newActual.cost_center,
      fiscal_year: parseInt(selectedYear),
      period: parseInt(selectedPeriod.slice(-2)),
      posting_date: newActual.posting_date,
      account: newActual.account,
      activity_type: newActual.activity_type || null,
      actual_amount: parseFloat(newActual.actual_amount),
      actual_quantity: 0,
      currency: 'USD',
      posted_by: 'USER'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRODUCTION': return <Factory className="h-4 w-4" />;
      case 'SALES': return <TrendingUp className="h-4 w-4" />;
      case 'ADMINISTRATIVE': return <Users className="h-4 w-4" />;
      case 'SERVICE': return <Calculator className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 5) return 'text-green-600';
    if (Math.abs(percentage) <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center mb-6">
          <Link href="/" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Controlling</h1>
            <p className="text-gray-600">Cost Center Accounting, Profit Center Analysis & Internal Orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const period = `${selectedYear}${String(i + 1).padStart(3, '0')}`;
                const month = new Date(2025, i).toLocaleString('default', { month: 'long' });
                return (
                  <SelectItem key={period} value={period}>
                    {month} {selectedYear}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="profitability">Profitability (CO-PA)</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="actuals">Post Actuals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cost Centers</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{costCenters?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Across all categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Planned Costs</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold break-all">
                  ${Math.round(costCenters?.reduce((sum: number, cc: CostCenter) => {
                    const planned = Number(cc.total_planned) || 0;
                    return sum + planned;
                  }, 0) || 0).toLocaleString('en-US')}
                </div>
                <p className="text-xs text-muted-foreground">Current period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actual Costs</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold break-all">
                  ${Math.round(costCenters?.reduce((sum: number, cc: CostCenter) => {
                    const actual = Number(cc.total_actual) || 0;
                    return sum + actual;
                  }, 0) || 0).toLocaleString('en-US')}
                </div>
                <p className="text-xs text-muted-foreground">Current period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variance</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {varianceData?.filter((v: VarianceAnalysis) => Math.abs(Number(v.variance_percentage) || 0) > 10).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Cost centers over 10% variance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Center Performance</CardTitle>
                <CardDescription>Top cost centers by actual vs planned variance</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVariance ? (
                  <div className="text-center py-4">Loading variance data...</div>
                ) : (
                  <div className="space-y-3">
                    {varianceData?.slice(0, 5).map((variance: VarianceAnalysis) => (
                      <div key={variance.cost_center} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(variance.cost_center_category)}
                          <div>
                            <div className="font-medium">{variance.cost_center}</div>
                            <div className="text-sm text-gray-500">{variance.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getVarianceColor(Number(variance.variance_percentage) || 0)}`}>
                            {Number(variance.variance_percentage) > 0 ? '+' : ''}{(Number(variance.variance_percentage) || 0).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">
                            ${Math.abs(Number(variance.variance_amount) || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profitability Overview</CardTitle>
                <CardDescription>Revenue and margin analysis by profit center</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCopa ? (
                  <div className="text-center py-4">Loading profitability data...</div>
                ) : (
                  <div className="space-y-3">
                    {copaData?.slice(0, 5).map((copa: ProfitabilityData, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{copa.profit_center}</div>
                          <div className="text-sm text-gray-500">{copa.product_group}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${copa.revenue.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">
                            {copa.revenue > 0 ? ((copa.gross_margin / copa.revenue) * 100).toFixed(1) : 0}% margin
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cost-centers">
          <Card>
            <CardHeader>
              <CardTitle>Cost Centers</CardTitle>
              <CardDescription>Cost center hierarchy and performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCostCenters ? (
                <div className="text-center py-8">Loading cost centers...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Center</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Hierarchy</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenters?.map((cc: CostCenter) => {
                      const variance = cc.total_actual - cc.total_planned;
                      const variancePercentage = cc.total_planned > 0 ?
                        ((variance / cc.total_planned) * 100) : 0;

                      return (
                        <TableRow key={cc.cost_center}>
                          <TableCell className="font-medium">{cc.cost_center}</TableCell>
                          <TableCell>{cc.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {getCategoryIcon(cc.cost_center_category)}
                              {cc.cost_center_category}
                            </Badge>
                          </TableCell>
                          <TableCell>{cc.hierarchy_area}</TableCell>
                          <TableCell className="text-right">
                            ${cc.total_planned?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell className="text-right">
                            ${cc.total_actual?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getVarianceColor(variancePercentage)}>
                              {variance > 0 ? '+' : ''}${variance.toLocaleString()}
                              <br />
                              <span className="text-xs">
                                ({variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%)
                              </span>
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance">
          <Card>
            <CardHeader>
              <CardTitle>Variance Analysis</CardTitle>
              <CardDescription>
                Plan vs actual analysis for {selectedPeriod}
                ({new Date(parseInt(selectedYear), parseInt(selectedPeriod.slice(-2)) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVariance ? (
                <div className="text-center py-8">Generating variance analysis...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Center</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance Amount</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceData?.map((variance: VarianceAnalysis) => (
                      <TableRow key={variance.cost_center}>
                        <TableCell className="font-medium">{variance.cost_center}</TableCell>
                        <TableCell>{variance.description}</TableCell>
                        <TableCell className="text-right">
                          ${Math.round(Number(variance.planned_amount) || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(Number(variance.actual_amount) || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getVarianceColor(Number(variance.variance_percentage) || 0)}>
                            {Number(variance.variance_amount) > 0 ? '+' : ''}${Math.round(Number(variance.variance_amount) || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getVarianceColor(Number(variance.variance_percentage) || 0)}>
                            {Number(variance.variance_percentage) > 0 ? '+' : ''}{(Number(variance.variance_percentage) || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={Math.abs(Number(variance.variance_percentage) || 0) <= 5 ? 'default' :
                              Math.abs(Number(variance.variance_percentage) || 0) <= 10 ? 'secondary' : 'destructive'}
                          >
                            {Math.abs(Number(variance.variance_percentage) || 0) <= 5 ? 'On Target' :
                              Math.abs(Number(variance.variance_percentage) || 0) <= 10 ? 'Watch' : 'Review'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle>Profitability Analysis (CO-PA)</CardTitle>
              <CardDescription>Margin analysis by customer group, product group, and profit center</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCopa ? (
                <div className="text-center py-8">Loading profitability data...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profit Center</TableHead>
                      <TableHead>Product Group</TableHead>
                      <TableHead>Customer Group</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Gross Margin</TableHead>
                      <TableHead className="text-right">Operating Profit</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copaData?.map((copa: ProfitabilityData, index: number) => {
                      const marginPercentage = copa.revenue > 0 ?
                        ((copa.gross_margin / copa.revenue) * 100) : 0;

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{copa.profit_center}</TableCell>
                          <TableCell>{copa.product_group}</TableCell>
                          <TableCell>{copa.customer_group}</TableCell>
                          <TableCell className="text-right">
                            ${copa.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${copa.cogs.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${copa.gross_margin.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${copa.operating_profit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={marginPercentage >= 30 ? 'default' :
                              marginPercentage >= 20 ? 'secondary' : 'destructive'}>
                              {marginPercentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Cost Center Planning</CardTitle>
                <CardDescription>Add planning data for cost centers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_center">Cost Center</Label>
                    <Select
                      value={newPlanning.cost_center}
                      onValueChange={(value) => setNewPlanning(prev => ({ ...prev, cost_center: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost center" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters?.map((cc: CostCenter) => (
                          <SelectItem key={cc.cost_center} value={cc.cost_center}>
                            {cc.cost_center} - {cc.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="account">GL Account</Label>
                    <Input
                      id="account"
                      placeholder="e.g., 5000001"
                      value={newPlanning.account}
                      onChange={(e) => setNewPlanning(prev => ({ ...prev, account: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="planned_amount">Planned Amount</Label>
                    <Input
                      id="planned_amount"
                      type="number"
                      placeholder="0.00"
                      value={newPlanning.planned_amount}
                      onChange={(e) => setNewPlanning(prev => ({ ...prev, planned_amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity_type">Activity Type (Optional)</Label>
                    <Select
                      value={newPlanning.activity_type}
                      onValueChange={(value) => setNewPlanning(prev => ({ ...prev, activity_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MACH-HR">Machine Hours</SelectItem>
                        <SelectItem value="LABOR-HR">Labor Hours</SelectItem>
                        <SelectItem value="SETUP-HR">Setup Hours</SelectItem>
                        <SelectItem value="QC-HR">Quality Control Hours</SelectItem>
                        <SelectItem value="MAINT-HR">Maintenance Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreatePlanning}
                  disabled={planningMutation.isPending}
                  className="w-full"
                >
                  {planningMutation.isPending ? 'Creating...' : 'Create Planning'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Planning Guidelines</CardTitle>
                <CardDescription>Best practices for cost center planning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Primary Cost Elements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 5000001-5000099: Material costs</li>
                    <li>• 5000100-5000199: Labor costs</li>
                    <li>• 5000200-5000299: Machine costs</li>
                    <li>• 5000300-5000399: Overhead costs</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Activity Types</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• MACH-HR: Machine operating hours</li>
                    <li>• LABOR-HR: Direct labor hours</li>
                    <li>• SETUP-HR: Machine setup time</li>
                    <li>• QC-HR: Quality control time</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Planning Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Plan at activity type level for accurate allocation</li>
                    <li>• Consider seasonal variations</li>
                    <li>• Review and update monthly</li>
                    <li>• Align with production schedules</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actuals">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Post Actual Costs</CardTitle>
                <CardDescription>Record actual costs to cost centers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="actual_cost_center">Cost Center *</Label>
                    <Select
                      value={newActual.cost_center}
                      onValueChange={(value) => setNewActual(prev => ({ ...prev, cost_center: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost center" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters?.map((cc: CostCenter) => (
                          <SelectItem key={cc.cost_center} value={cc.cost_center}>
                            {cc.cost_center} - {cc.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="actual_posting_date">Posting Date *</Label>
                    <Input
                      id="actual_posting_date"
                      type="date"
                      value={newActual.posting_date}
                      onChange={(e) => setNewActual(prev => ({ ...prev, posting_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="actual_account">GL Account *</Label>
                    <Input
                      id="actual_account"
                      placeholder="e.g., 5000001"
                      value={newActual.account}
                      onChange={(e) => setNewActual(prev => ({ ...prev, account: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="actual_amount">Actual Amount *</Label>
                    <Input
                      id="actual_amount"
                      type="number"
                      placeholder="0.00"
                      value={newActual.actual_amount}
                      onChange={(e) => setNewActual(prev => ({ ...prev, actual_amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="actual_activity_type">Activity Type (Optional)</Label>
                  <Select
                    value={newActual.activity_type}
                    onValueChange={(value) => setNewActual(prev => ({ ...prev, activity_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MACH-HR">Machine Hours</SelectItem>
                      <SelectItem value="LABOR-HR">Labor Hours</SelectItem>
                      <SelectItem value="SETUP-HR">Setup Hours</SelectItem>
                      <SelectItem value="QC-HR">Quality Control Hours</SelectItem>
                      <SelectItem value="MAINT-HR">Maintenance Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handlePostActual}
                  disabled={actualMutation.isPending}
                  className="w-full"
                >
                  {actualMutation.isPending ? 'Posting...' : 'Post Actual Cost'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Posting Guidelines</CardTitle>
                <CardDescription>Best practices for actual cost posting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Required Fields</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Cost Center: Select the cost center receiving the cost</li>
                    <li>• Posting Date: Date when cost was incurred</li>
                    <li>• GL Account: Primary cost element account</li>
                    <li>• Actual Amount: Total cost amount</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Activity Types</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use for activity-based costing</li>
                    <li>• Links costs to specific activities</li>
                    <li>• Enables better cost allocation</li>
                    <li>• Optional but recommended</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Posting Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Post costs in the correct fiscal period</li>
                    <li>• Use consistent GL account mapping</li>
                    <li>• Review variance after posting</li>
                    <li>• Document significant variances</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}