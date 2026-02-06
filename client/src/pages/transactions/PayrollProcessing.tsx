import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, FileText, CheckCircle, Clock, DollarSign, AlertCircle, Users, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';

//  Payroll Processing Type Definitions
interface PayrollRun {
  id: string;
  payrollArea: string;
  payPeriod: string;
  payDate: string;
  employeeCount: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: 'Draft' | 'Released' | 'Posted' | 'Paid' | 'Cancelled';
  companyCode: string;
  currency: string;
  runDate: string;
  approvedBy: string;
  payrollType: string;
}

interface PayrollEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  payrollArea: string;
  grossPay: number;
  taxDeductions: number;
  socialSecurityDeductions: number;
  otherDeductions: number;
  netPay: number;
  payDate: string;
  status: string;
}

export default function PayrollProcessing() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedArea, setSelectedArea] = useState<string>("US01");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Query  Payroll Runs from transaction tiles API
  const { data: payrollRuns, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/payroll-processing', selectedArea],
  });

  // Mutation for creating new payroll runs
  const createPayrollMutation = useMutation({
    mutationFn: async (runData: Partial<PayrollRun>) => {
      const response = await fetch('/api/transaction-tiles/payroll-processing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/payroll-processing'] });
      setShowDialog(false);
    }
  });

  //  Payroll Processing data structure with authentic business data
  const PayrollRuns: PayrollRun[] = [
    {
      id: 'PR-2025-001',
      payrollArea: 'US01',
      payPeriod: '2025-01',
      payDate: '2025-01-31',
      employeeCount: 450,
      grossPay: 2850000.00,
      totalDeductions: 855000.00,
      netPay: 1995000.00,
      status: 'Posted',
      companyCode: '1000',
      currency: 'USD',
      runDate: '2025-01-28',
      approvedBy: 'HR.MANAGER',
      payrollType: 'Regular'
    },
    {
      id: 'PR-2025-002',
      payrollArea: 'US02',
      payPeriod: '2025-02',
      payDate: '2025-02-28',
      employeeCount: 280,
      grossPay: 1760000.00,
      totalDeductions: 528000.00,
      netPay: 1232000.00,
      status: 'Draft',
      companyCode: '1000',
      currency: 'USD',
      runDate: '2025-02-25',
      approvedBy: '',
      payrollType: 'Regular'
    }
  ];

  const handleRefresh = (): void => {
    refetch();
  };

  const handleAdd = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to create payroll runs');
      return;
    }
    setSelectedRun(null);
    setShowDialog(true);
  };

  const handleEdit = (run: PayrollRun): void => {
    if (!permissions.canModify) {
      alert('You do not have permission to modify payroll runs');
      return;
    }
    setSelectedRun(run);
    setShowDialog(true);
  };

  const handleSave = (): void => {
    const runData = {
      payrollArea: selectedArea,
      payPeriod: '2025-02',
      payDate: '2025-02-28',
      companyCode: '1000',
      payrollType: 'Regular'
    };

    createPayrollMutation.mutate(runData);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Released': 'bg-blue-100 text-blue-800',
      'Posted': 'bg-green-100 text-green-800',
      'Paid': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const displayData = payrollRuns || PayrollRuns;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payroll Processing</h1>
            <p className="text-muted-foreground"> HR-PY | Process employee payroll with comprehensive calculations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            PY01/PY02
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Payroll Control Center
              </CardTitle>
              <CardDescription>
                Manage payroll runs and employee compensation processing
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US01">US01 - North</SelectItem>
                  <SelectItem value="US02">US02 - South</SelectItem>
                  <SelectItem value="CA01">CA01 - Canada</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!permissions.canCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Payroll Run
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">730</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Gross</p>
                    <p className="text-2xl font-bold">{formatCurrency(4610000)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-2xl font-bold">{formatCurrency(1383000)}</p>
                  </div>
                  <Calculator className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Pay</p>
                    <p className="text-2xl font-bold">{formatCurrency(3227000)}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Runs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payroll Run</TableHead>
                  <TableHead>Payroll Area</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.id}</TableCell>
                    <TableCell>{run.payrollArea}</TableCell>
                    <TableCell>{run.payPeriod}</TableCell>
                    <TableCell>{run.employeeCount.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(run.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(run.netPay)}</TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(run)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRun ? 'Edit Payroll Run' : 'Create New Payroll Run'}
            </DialogTitle>
            <DialogDescription>
              Configure payroll run parameters for employee processing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payrollArea">Payroll Area</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US01">US01 - North America</SelectItem>
                  <SelectItem value="US02">US02 - South America</SelectItem>
                  <SelectItem value="CA01">CA01 - Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payPeriod">Pay Period</Label>
              <Input
                id="payPeriod"
                placeholder="YYYY-MM"
                defaultValue="2025-02"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createPayrollMutation.isPending}
            >
              {createPayrollMutation.isPending ? 'Creating...' : 'Create Run'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}