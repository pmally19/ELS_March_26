import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Download, FileText, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { format } from 'date-fns';

interface PnLItem {
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountGroup: string;
  amount: number;
}

interface PnLReport {
  success: boolean;
  revenue: PnLItem[];
  expenses: PnLItem[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  generatedAt: string;
}

export default function ProfitLossReporting() {
  const permissions = useAgentPermissions();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  // Fetch P&L report data
  const { data: pnlData, isLoading, refetch } = useQuery<PnLReport>({
    queryKey: ['/api/general-ledger/profit-loss', startDate, endDate],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await apiRequest(`/api/general-ledger/profit-loss?${params.toString()}`);
        return response;
      } catch (error: any) {
        console.error('Error fetching P&L report:', error);
        setError(error.message || 'Failed to load Profit & Loss report');
        throw error;
      }
    },
    enabled: !!startDate && !!endDate, // Only fetch when dates are set
  });

  const handleRefresh = () => {
    setError(null);
    refetch();
  };

  const handleBack = () => {
    window.history.back();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    handleRefresh();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality will be implemented');
  };

  // Group revenue and expenses by account group
  const revenueByGroup = useMemo(() => {
    if (!pnlData?.revenue) return {};
    const grouped: Record<string, PnLItem[]> = {};
    pnlData.revenue.forEach(item => {
      const group = item.accountGroup || 'Other';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });
    return grouped;
  }, [pnlData?.revenue]);

  const expensesByGroup = useMemo(() => {
    if (!pnlData?.expenses) return {};
    const grouped: Record<string, PnLItem[]> = {};
    pnlData.expenses.forEach(item => {
      const group = item.accountGroup || 'Other';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });
    return grouped;
  }, [pnlData?.expenses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Reporting</h1>
              <p className="text-gray-600 mt-1">Comprehensive income statement with real-time financial data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              type="button"
            >
              <RefreshCw className={isLoading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading}
              type="button"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Period
            </CardTitle>
            <CardDescription>
              Select the date range for the Profit & Loss report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isLoading || !startDate || !endDate}
                  className="w-full"
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(pnlData?.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingDown className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(pnlData?.totalExpenses || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Net Income</p>
                  <p className={`text-2xl font-bold ${(pnlData?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pnlData?.netIncome || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Revenue Accounts</p>
                  <p className="text-2xl font-bold">
                    {pnlData?.revenue?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main P&L Report */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>
              {pnlData?.period?.startDate && pnlData?.period?.endDate ? (
                `Period: ${format(new Date(pnlData.period.startDate), 'MMM dd, yyyy')} - ${format(new Date(pnlData.period.endDate), 'MMM dd, yyyy')}`
              ) : (
                'Select a date range to generate the report'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading Profit & Loss report...</span>
              </div>
            ) : pnlData ? (
              <Tabs defaultValue="detailed" className="w-full">
                <TabsList>
                  <TabsTrigger value="detailed">Detailed View</TabsTrigger>
                  <TabsTrigger value="summary">Summary by Group</TabsTrigger>
                </TabsList>
                
                <TabsContent value="detailed" className="space-y-6">
                  {/* Revenue Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Revenue</h3>
                    {pnlData.revenue && pnlData.revenue.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Account Group</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pnlData.revenue.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{item.accountNumber}</TableCell>
                              <TableCell className="font-medium">{item.accountName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.accountGroup || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No revenue accounts with transactions found for the selected period
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Revenue</div>
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(pnlData.totalRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-red-700">Expenses</h3>
                    {pnlData.expenses && pnlData.expenses.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Account Group</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pnlData.expenses.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{item.accountNumber}</TableCell>
                              <TableCell className="font-medium">{item.accountName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.accountGroup || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense accounts with transactions found for the selected period
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Expenses</div>
                        <div className="text-xl font-bold text-red-600">
                          {formatCurrency(pnlData.totalExpenses)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="pt-6 border-t-2">
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-2">Net Income / (Loss)</div>
                        <div className={`text-3xl font-bold ${pnlData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(pnlData.netIncome)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="space-y-6">
                  {/* Revenue Summary by Group */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Revenue by Account Group</h3>
                    {Object.keys(revenueByGroup).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(revenueByGroup).map(([group, items]) => (
                          <Card key={group}>
                            <CardHeader>
                              <CardTitle className="text-base">{group}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-mono text-sm">{item.accountNumber}</TableCell>
                                      <TableCell>{item.accountName}</TableCell>
                                      <TableCell className="text-right font-medium text-green-600">
                                        {formatCurrency(item.amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="mt-4 pt-4 border-t flex justify-end">
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">Group Total</div>
                                  <div className="text-lg font-bold text-green-600">
                                    {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No revenue data available for the selected period
                      </div>
                    )}
                  </div>

                  {/* Expenses Summary by Group */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-red-700">Expenses by Account Group</h3>
                    {Object.keys(expensesByGroup).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(expensesByGroup).map(([group, items]) => (
                          <Card key={group}>
                            <CardHeader>
                              <CardTitle className="text-base">{group}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-mono text-sm">{item.accountNumber}</TableCell>
                                      <TableCell>{item.accountName}</TableCell>
                                      <TableCell className="text-right font-medium text-red-600">
                                        {formatCurrency(item.amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="mt-4 pt-4 border-t flex justify-end">
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">Group Total</div>
                                  <div className="text-lg font-bold text-red-600">
                                    {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense data available for the selected period
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a date range and click "Generate Report" to view the Profit & Loss statement
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
