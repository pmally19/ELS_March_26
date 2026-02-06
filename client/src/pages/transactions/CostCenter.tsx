import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PieChart, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

interface CostCenter {
  id: string;
  costCenterNumber: string;
  costCenterName: string;
  description: string;
  companyCode: string;
  controllingArea: string;
  validFromDate: string;
  validToDate: string;
  responsiblePerson: string;
  department: string;
  plant: string;
  businessArea: string;
  profitCenter: string;
  category: string;
  costCenterType: string;
  currency: string;
  planCosts: number;
  actualCosts: number;
  commitments: number;
  budget: number;
  budgetUtilization: number;
  variance: number;
  variancePercentage: number;
  activityType: string;
  costCenterGroup: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function CostCenter() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: costCenterData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/cost-center'],
  });

  const costCenters = costCenterData?.data || [];

  const getVarianceColor = (variance: number): string => {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getBudgetUtilizationColor = (utilization: number): string => {
    if (utilization > 100) return 'bg-red-100 text-red-800';
    if (utilization > 80) return 'bg-orange-100 text-orange-800';
    if (utilization > 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Cost Center</h1>
          <Badge variant="secondary">SAP KS01/KS02</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PieChart className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{costCenters.length}</div>
                <p className="text-xs text-gray-600">Total Cost Centers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(costCenters.reduce((sum, cc) => sum + cc.actualCosts, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Actual Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(costCenters.reduce((sum, cc) => sum + cc.budget, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {costCenters.filter(cc => cc.budgetUtilization > 100).length}
                </div>
                <p className="text-xs text-gray-600">Over Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Cost Centers</TabsTrigger>
          <TabsTrigger value="budget">Budget Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Cost Centers (KS03)</CardTitle>
              <CardDescription>Cost center management and controlling</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Responsible Person</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Plan Costs</TableHead>
                    <TableHead>Actual Costs</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Budget Utilization</TableHead>
                    <TableHead>Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((costCenter) => (
                    <TableRow key={costCenter.id}>
                      <TableCell>
                        <div>
                          <div className="font-mono font-bold">{costCenter.costCenterNumber}</div>
                          <div className="text-sm text-gray-600">{costCenter.costCenterName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{costCenter.description}</TableCell>
                      <TableCell>{costCenter.responsiblePerson}</TableCell>
                      <TableCell>{costCenter.department}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(costCenter.planCosts)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(costCenter.actualCosts)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(costCenter.budget)}</TableCell>
                      <TableCell>
                        <Badge className={getBudgetUtilizationColor(costCenter.budgetUtilization)}>
                          {formatPercentage(costCenter.budgetUtilization)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getVarianceColor(costCenter.variance)}`}>
                        {formatAmount(costCenter.variance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Budget Analysis</CardTitle>
              <CardDescription>Cost center budget performance and variance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingDown className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Under Budget</h3>
                        <p className="text-sm text-gray-600">Cost centers with favorable variance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <PieChart className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">On Target</h3>
                        <p className="text-sm text-gray-600">Cost centers within budget tolerance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold">Over Budget</h3>
                        <p className="text-sm text-gray-600">Cost centers requiring attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}