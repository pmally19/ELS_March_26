import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, RefreshCw, Database, FileCheck, GitBranch } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CrossCheckValidationTileProps {
  onBack: () => void;
}

export default function CrossCheckValidationTile({ onBack }: CrossCheckValidationTileProps) {
  const [validationType, setValidationType] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [showValidationForm, setShowValidationForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch validation results
  const { data: validationResults, isLoading } = useQuery({
    queryKey: ['/api/ar/crosscheck-validation'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/crosscheck-validation');
      return await response.json();
    },
  });

  // Fetch lineage data
  const { data: lineageData } = useQuery({
    queryKey: ['/api/ar/data-lineage'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/data-lineage');
      return await response.json();
    },
  });

  // Fetch integrity metrics
  const { data: integrityMetrics } = useQuery({
    queryKey: ['/api/ar/integrity-metrics'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/integrity-metrics');
      return await response.json();
    },
  });

  // Fetch customers for validation filtering
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Run validation mutation
  const runValidationMutation = useMutation({
    mutationFn: async (validationData: any) => {
      return await apiRequest('/api/ar/run-crosscheck-validation', {
        method: 'POST',
        body: JSON.stringify(validationData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Validation Completed",
        description: "CrossCheck validation has been completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/crosscheck-validation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/integrity-metrics'] });
      setShowValidationForm(false);
    },
    onError: (error) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fix data integrity mutation
  const fixIntegrityMutation = useMutation({
    mutationFn: async (fixData: any) => {
      return await apiRequest('/api/ar/fix-data-integrity', {
        method: 'POST',
        body: JSON.stringify(fixData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Data Fixed",
        description: "Data integrity issues have been resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/crosscheck-validation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/integrity-metrics'] });
    },
    onError: (error) => {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRunValidation = () => {
    if (!validationType) {
      toast({
        title: "Missing Information",
        description: "Please select validation type.",
        variant: "destructive",
      });
      return;
    }

    runValidationMutation.mutate({
      validation_type: validationType,
      customer_id: selectedCustomer || null,
      date_range: dateRange || null,
      triggered_by: 'Current User',
      triggered_date: new Date().toISOString(),
    });
  };

  const handleFixIntegrity = (issueId: string, fixType: string) => {
    fixIntegrityMutation.mutate({
      issue_id: issueId,
      fix_type: fixType,
      fixed_by: 'Current User',
      fixed_date: new Date().toISOString(),
    });
  };

  const getValidationStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'passed':
        return <Badge className="bg-green-500 text-white">Passed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case 'running':
        return <Badge className="bg-blue-500 text-white">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <Badge className="bg-red-800 text-white">Critical</Badge>;
      case 'high':
        return <Badge className="bg-red-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-yellow-500 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* CrossCheck Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Integrity Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {(integrityMetrics?.overall_score ?? 0)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {Array.isArray(validationResults) ? validationResults.filter((r) => r.severity === 'critical').length : 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lineage Validated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(lineageData?.validated_records ?? 0)}
                </p>
              </div>
              <GitBranch className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Validation</p>
                <p className="text-sm font-bold text-purple-600">
                  {integrityMetrics?.last_validation ?
                    new Date((integrityMetrics?.last_validation ?? {})).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Run CrossCheck Validation</CardTitle>
            <Button
              onClick={() => setShowValidationForm(!showValidationForm)}
              variant={showValidationForm ? "outline" : "default"}
            >
              {showValidationForm ? 'Hide Form' : 'New Validation'}
            </Button>
          </div>
        </CardHeader>
        {showValidationForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Validation Type</Label>
                <Select value={validationType} onValueChange={setValidationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select validation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_system">Full System Validation</SelectItem>
                    <SelectItem value="customer_lineage">Customer Data Lineage</SelectItem>
                    <SelectItem value="invoice_integrity">Invoice Integrity</SelectItem>
                    <SelectItem value="payment_validation">Payment Validation</SelectItem>
                    <SelectItem value="gl_reconciliation">GL Reconciliation</SelectItem>
                    <SelectItem value="foreign_key_check">Foreign Key Constraints</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer (Optional)</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {Array.isArray(customers) &&
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="current_year">Current Year</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleRunValidation}
                disabled={runValidationMutation.isPending}
              >
                {runValidationMutation.isPending ? 'Running Validation...' : 'Run Validation'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Lineage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Lineage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {(lineageData?.company_codes_validated ?? 0)}
              </p>
              <p className="text-sm text-blue-600">Company Codes</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {(lineageData?.customers_validated ?? 0)}
              </p>
              <p className="text-sm text-green-600">Customers</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <GitBranch className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {(lineageData?.invoices_validated ?? 0)}
              </p>
              <p className="text-sm text-purple-600">Invoices</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {(lineageData?.payments_validated ?? 0)}
              </p>
              <p className="text-sm text-orange-600">Payments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validation Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Affected Records</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : !Array.isArray(validationResults) || validationResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-green-600">
                      All validations passed - No issues found
                    </TableCell>
                  </TableRow>
                ) : (
                  validationResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        {result.validation_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>{getValidationStatusBadge(result.status)}</TableCell>
                      <TableCell>{getSeverityBadge(result.severity)}</TableCell>
                      <TableCell className="max-w-xs">{result.description}</TableCell>
                      <TableCell>{result.affected_records || 0}</TableCell>
                      <TableCell>
                        {result.status === 'failed' && (
                          <Button
                            size="sm"
                            onClick={() => handleFixIntegrity(result.id, result.fix_type)}
                            disabled={fixIntegrityMutation.isPending}
                          >
                            Fix Issue
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Integrity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Integrity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Master Data Integrity</span>
                  <span className="text-sm font-bold text-green-600">
                    {(integrityMetrics?.master_data_score ?? 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(integrityMetrics?.master_data_score ?? 0)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Transaction Integrity</span>
                  <span className="text-sm font-bold text-blue-600">
                    {(integrityMetrics?.transaction_score ?? 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(integrityMetrics?.transaction_score ?? 0)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Foreign Key Integrity</span>
                  <span className="text-sm font-bold text-purple-600">
                    {(integrityMetrics?.foreign_key_score ?? 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${(integrityMetrics?.foreign_key_score ?? 0)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Business Logic Integrity</span>
                  <span className="text-sm font-bold text-orange-600">
                    {(integrityMetrics?.business_logic_score ?? 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${(integrityMetrics?.business_logic_score ?? 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}