import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, FileText, TrendingUp, DollarSign, Plus, Eye, Calculator, ArrowLeft, CheckCircle2, Search, Filter, Play, History, AlertCircle, Info, ExternalLink, XCircle, ShoppingCart, ArrowRightLeft, Trash2, MoreVertical, Download, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AssetAcquisitionDialog } from "@/components/finance/AssetAcquisitionDialog";
import { AssetTransferDialog } from "@/components/finance/AssetTransferDialog";
import { AssetRetirementDialog } from "@/components/finance/AssetRetirementDialog";
import UnplannedDepreciationTile from "@/pages/finance/tiles/UnplannedDepreciationTile";

// Depreciation Run Form Component
function DepreciationRunForm({ companyCodes, onSuccess, onClose }: any) {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [fiscalPeriod, setFiscalPeriod] = useState(new Date().getMonth() + 1);
  const [companyCodeId, setCompanyCodeId] = useState<string>("");
  const [depreciationAreaId, setDepreciationAreaId] = useState<string>("");
  const [postToGL, setPostToGL] = useState(true);
  const [testRun, setTestRun] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch depreciation areas
  const { data: depreciationAreas = [] } = useQuery({
    queryKey: ['depreciation-areas'],
    queryFn: async () => {
      const response = await fetch('/api/finance-enhanced/asset-management/depreciation-areas');
      if (!response.ok) {
        console.warn('Failed to fetch depreciation areas, returning empty array');
        return [];
      }
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const runDepreciationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/finance-enhanced/asset-management/depreciation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to run depreciation');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Depreciation run completed. Processed ${data.assetsProcessed} assets. Total depreciation: ${formatCurrency(data.totalDepreciation)}`
      });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run depreciation",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runDepreciationMutation.mutate({
      fiscal_year: fiscalYear,
      fiscal_period: fiscalPeriod,
      company_code_id: companyCodeId || null,
      depreciation_area_id: depreciationAreaId || null,
      post_to_gl: postToGL && !testRun,
      test_run: testRun
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fiscalYear">Fiscal Year</Label>
          <Input
            id="fiscalYear"
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value))}
            required
            min={2000}
            max={2100}
          />
        </div>
        <div>
          <Label htmlFor="fiscalPeriod">Fiscal Period (Month)</Label>
          <Input
            id="fiscalPeriod"
            type="number"
            value={fiscalPeriod}
            onChange={(e) => setFiscalPeriod(parseInt(e.target.value))}
            required
            min={1}
            max={12}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="companyCode">Company Code (Optional)</Label>
        <Select value={companyCodeId || "all"} onValueChange={(value) => setCompanyCodeId(value === "all" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="All Company Codes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Company Codes</SelectItem>
            {companyCodes.map((cc: any) => (
              <SelectItem key={cc.id} value={cc.id.toString()}>
                {cc.code} - {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="depreciationArea">Depreciation Area (Optional)</Label>
        <Select
          value={depreciationAreaId || "all"}
          onValueChange={(value) => setDepreciationAreaId(value === "all" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Depreciation Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depreciation Areas</SelectItem>
            {depreciationAreas.map((da: any) => (
              <SelectItem key={da.id} value={da.id.toString()}>
                {da.code || da.name} - {da.name || da.description || ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="testRun"
          checked={testRun}
          onChange={(e) => {
            setTestRun(e.target.checked);
            if (e.target.checked) {
              setPostToGL(false);
            }
          }}
          className="rounded"
        />
        <Label htmlFor="testRun" className="cursor-pointer">
          Test Run (Calculate without posting to GL)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="postToGL"
          checked={postToGL}
          onChange={(e) => {
            setPostToGL(e.target.checked);
            if (e.target.checked) {
              setTestRun(false);
            }
          }}
          disabled={testRun}
          className="rounded"
        />
        <Label htmlFor="postToGL" className={`cursor-pointer ${testRun ? 'opacity-50' : ''}`}>
          Post to General Ledger
        </Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={runDepreciationMutation.isPending}>
          {runDepreciationMutation.isPending ? "Running..." : "Run Depreciation"}
        </Button>
      </div>
    </form>
  );
}

// Depreciation Calculation Details Dialog Component
function DepreciationCalculationDetailsDialog({ runId, runNumber, open, onOpenChange }: any) {
  const { toast } = useToast();
  const { data: runDetails, isLoading } = useQuery({
    queryKey: [`/api/finance-enhanced/asset-management/depreciation-runs/${runId}`],
    queryFn: async () => {
      const response = await fetch(`/api/finance-enhanced/asset-management/depreciation-runs/${runId}`);
      if (!response.ok) throw new Error('Failed to fetch depreciation run details');
      return response.json();
    },
    enabled: open && !!runId
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount && amount !== 0) return "$0.00";
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToCSV = () => {
    if (!runDetails?.postings || runDetails.postings.length === 0) {
      toast({
        title: "No Data",
        description: "No calculation data to export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Asset Number',
      'Asset Name',
      'Depreciation Amount',
      'Accumulated Depreciation Before',
      'Accumulated Depreciation After',
      'Net Book Value Before',
      'Net Book Value After'
    ];

    const rows = runDetails.postings.map((posting: any) => [
      posting.asset_number || '-',
      posting.asset_name || '-',
      posting.depreciation_amount || 0,
      posting.accumulated_depreciation_before || 0,
      posting.accumulated_depreciation_after || 0,
      posting.net_book_value_before || 0,
      posting.net_book_value_after || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `depreciation_calculations_${runNumber}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${runDetails.postings.length} calculation records to CSV`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Depreciation Calculation Details</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Run {runNumber} - Fiscal {runDetails?.fiscal_year}/{String(runDetails?.fiscal_period || '').padStart(2, '0')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!runDetails?.postings}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading calculation details...</div>
        ) : runDetails?.postings && runDetails.postings.length > 0 ? (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Assets Processed</p>
                    <p className="text-2xl font-bold">{runDetails.total_assets_processed || runDetails.postings.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Depreciation</p>
                    <p className="text-2xl font-bold">{formatCurrency(runDetails.total_depreciation_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GL Posted</p>
                    <p className="text-2xl font-bold">{runDetails.posted_to_gl ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GL Document</p>
                    <p className="text-lg font-medium text-blue-600">{runDetails.gl_document_number || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Calculations Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Asset Number</TableHead>
                    <TableHead className="min-w-[150px]">Asset Name</TableHead>
                    <TableHead className="text-right w-[140px]">Period Depreciation</TableHead>
                    <TableHead className="text-right w-[150px]">Accumulated (Before)</TableHead>
                    <TableHead className="text-right w-[150px]">Accumulated (After)</TableHead>
                    <TableHead className="text-right w-[140px]">NBV (Before)</TableHead>
                    <TableHead className="text-right w-[140px]">NBV (After)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runDetails.postings.map((posting: any) => (
                    <TableRow key={posting.id}>
                      <TableCell className="font-medium">{posting.asset_number || '-'}</TableCell>
                      <TableCell>{posting.asset_name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(posting.depreciation_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(posting.accumulated_depreciation_before)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(posting.accumulated_depreciation_after)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(posting.net_book_value_before)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(posting.net_book_value_after)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Row */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Depreciation for Period:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      runDetails.postings.reduce((sum: number, p: any) => sum + (parseFloat(p.depreciation_amount) || 0), 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No calculation data available for this run.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Depreciation Run History Component
function DepreciationRunHistory() {
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRunNumber, setSelectedRunNumber] = useState<string>("");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: runs, isLoading } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/depreciation-runs'],
    queryFn: async () => {
      const response = await fetch('/api/finance-enhanced/asset-management/depreciation-runs');
      if (!response.ok) throw new Error('Failed to fetch depreciation runs');
      return response.json();
    }
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-500 text-white">Running</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getGLDocumentCell = (run: any) => {
    if (run.gl_document_number) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-600">{run.gl_document_number}</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Posted to GL on {formatDateTime(run.completed_at)}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (run.posted_to_gl === false && run.status === 'COMPLETED') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Not Posted</span>
              {run.error_message && <AlertCircle className="h-4 w-4 text-orange-500" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p>GL posting was not performed or failed</p>
              {run.error_message && (
                <p className="text-xs text-red-500 mt-1">Error: {run.error_message}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <span className="text-muted-foreground">-</span>;
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading depreciation runs...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-sm font-medium">Recent Depreciation Runs</div>
        {runs && runs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Run Number</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Fiscal Year/Period</TableHead>
                  <TableHead className="w-[130px]">Assets Processed</TableHead>
                  <TableHead className="w-[150px]">Total Depreciation</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[180px]">GL Document</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run: any) => (
                  <TableRow
                    key={run.id}
                    className={run.status === 'FAILED' ? 'bg-red-50/50' : run.total_assets_processed === 0 ? 'bg-yellow-50/50' : ''}
                  >
                    <TableCell className="font-medium">{run.run_number}</TableCell>
                    <TableCell>{formatDate(run.run_date)}</TableCell>
                    <TableCell>{run.fiscal_year}/{String(run.fiscal_period).padStart(2, '0')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{run.total_assets_processed || 0}</span>
                        {run.total_assets_processed === 0 && run.status === 'COMPLETED' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-orange-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No assets were processed in this run</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(run.total_depreciation_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(run.status)}
                        {run.error_message && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <div>
                                <p className="font-semibold mb-1">Error Details:</p>
                                <p className="text-sm">{run.error_message}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getGLDocumentCell(run)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {run.status === 'COMPLETED' && (run.total_assets_processed || 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  setSelectedRunId(run.id);
                                  setSelectedRunNumber(run.run_number);
                                  setIsDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Calculations
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View detailed asset depreciation calculations</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {run.error_message && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Info className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <div>
                                <p className="font-semibold mb-1">Run Details:</p>
                                <p className="text-sm mb-1"><strong>Started:</strong> {formatDateTime(run.started_at)}</p>
                                {run.completed_at && (
                                  <p className="text-sm mb-1"><strong>Completed:</strong> {formatDateTime(run.completed_at)}</p>
                                )}
                                <p className="text-sm"><strong>Error:</strong> {run.error_message}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No depreciation runs found. Run depreciation to get started.
          </div>
        )}

        {/* Depreciation Calculation Details Dialog */}
        <DepreciationCalculationDetailsDialog
          runId={selectedRunId}
          runNumber={selectedRunNumber}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
      </div>
    </TooltipProvider>
  );
}


// Asset View Details Component (Read-only)
function AssetViewDetails({ asset, companyCodes, costCenters, depreciationMethods, assetClasses, onClose }: any) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return date;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getCompanyName = (id: number | null) => {
    if (!id) return "-";
    const company = companyCodes.find((cc: any) => cc.id === id);
    return company ? `${company.code} - ${company.name}` : "-";
  };

  const getCostCenterName = (id: number | null) => {
    if (!id) return "-";
    const cc = costCenters.find((c: any) => c.id === id);
    return cc ? `${cc.cost_center} - ${cc.description || ""}` : "-";
  };

  const getDepreciationMethodName = (method: string | null) => {
    if (!method) return "-";
    const dm = depreciationMethods.find((d: any) => d.code === method || d.name === method || d.method_name === method);
    return dm ? (dm.name || dm.method_name) : method;
  };

  const getAssetClassName = () => {
    if (asset.asset_class_name) return asset.asset_class_name;
    if (asset.asset_class_code) {
      const ac = assetClasses.find((a: any) => a.code === asset.asset_class_code);
      return ac ? ac.name : asset.asset_class_code;
    }
    return asset.asset_class || "-";
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    } else if (statusLower === 'inactive' || statusLower === 'retired') {
      return <Badge variant="destructive">Inactive</Badge>;
    } else if (statusLower === 'maintenance') {
      return <Badge className="bg-yellow-500">Maintenance</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  // Fetch transaction history for this asset
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/asset-management/transactions', asset.id],
    queryFn: async () => {
      const response = await fetch(`/api/asset-management/transactions/${asset.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!asset.id,
  });

  const getTransactionTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'ACQUISITION':
        return <Badge className="bg-blue-500 text-white">Acquisition</Badge>;
      case 'TRANSFER':
        return <Badge className="bg-orange-500 text-white">Transfer</Badge>;
      case 'RETIREMENT':
        return <Badge className="bg-red-500 text-white">Retirement</Badge>;
      case 'DEPRECIATION':
        return <Badge className="bg-purple-500 text-white">Depreciation</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Asset Number</Label>
            <p className="text-sm font-medium mt-1">{asset.asset_number || "-"}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Asset Name</Label>
            <p className="text-sm font-medium mt-1">{asset.name || "-"}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-sm text-muted-foreground">Description</Label>
            <p className="text-sm mt-1">{asset.description || "-"}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Asset Class</Label>
            <p className="text-sm font-medium mt-1">{getAssetClassName()}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <div className="mt-1">{getStatusBadge(asset.status)}</div>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Financial Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Acquisition Date</Label>
            <p className="text-sm font-medium mt-1">{formatDate(asset.acquisition_date)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Acquisition Cost</Label>
            <p className="text-sm font-medium mt-1">{formatCurrency(asset.acquisition_cost)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Current Value</Label>
            <p className="text-sm font-medium mt-1">{formatCurrency(asset.current_value)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Depreciation Method</Label>
            <p className="text-sm font-medium mt-1">{getDepreciationMethodName(asset.depreciation_method)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Useful Life (Years)</Label>
            <p className="text-sm font-medium mt-1">{asset.useful_life_years ? `${asset.useful_life_years} years` : "-"}</p>
          </div>
        </div>
      </div>

      {/* Organizational Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Organizational Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Company Code</Label>
            <p className="text-sm font-medium mt-1">{getCompanyName(asset.company_code_id)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Cost Center</Label>
            <p className="text-sm font-medium mt-1">{getCostCenterName(asset.cost_center_id)}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-sm text-muted-foreground">Location</Label>
            <p className="text-sm font-medium mt-1">{asset.location || "-"}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </h3>
        {isLoadingTransactions ? (
          <div className="text-center py-4 text-muted-foreground">Loading transactions...</div>
        ) : transactions.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell>{getTransactionTypeBadge(tx.transaction_type)}</TableCell>
                    <TableCell className="text-sm">{tx.amount ? formatCurrency(tx.amount) : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={tx.description}>
                      {tx.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-lg">
            No transactions recorded for this asset
          </div>
        )}
      </div>

      {/* Timestamps */}
      {(asset.created_at || asset.updated_at) && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Timestamps</h3>
          <div className="grid grid-cols-2 gap-4">
            {asset.created_at && (
              <div>
                <Label className="text-sm text-muted-foreground">Created At</Label>
                <p className="text-sm font-medium mt-1">{formatDate(asset.created_at)}</p>
              </div>
            )}
            {asset.updated_at && (
              <div>
                <Label className="text-sm text-muted-foreground">Last Updated</Label>
                <p className="text-sm font-medium mt-1">{formatDate(asset.updated_at)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
}

export default function AssetManagementEnhanced() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDepreciationDialogOpen, setIsDepreciationDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // States for asset action dialogs
  const [actionAsset, setActionAsset] = useState<any>(null);
  const [isAcquisitionOpen, setIsAcquisitionOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isRetirementOpen, setIsRetirementOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Asset Management Enhanced - MallyERP";
  }, []);

  // Fetch Asset Management statistics
  const { data: assetStats } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/asset-management/statistics');
      return await response.json();
    },
  });

  // Fetch assets
  const { data: assets, isLoading: isLoadingAssets, refetch: refetchAssets } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/assets', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await apiRequest(`/api/finance-enhanced/asset-management/assets?${params.toString()}`);
      return await response.json();
    },
  });

  // Fetch depreciation methods
  const { data: depreciationMethods, isLoading: isLoadingDepreciationMethods } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/depreciation-methods'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/asset-management/depreciation-methods');
      if (!response.ok) {
        console.error('Failed to fetch depreciation methods:', response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('Depreciation methods fetched:', data.length, data);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  // Fetch asset classes
  const { data: assetClasses } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/asset-classes'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/asset-management/asset-classes');
      return await response.json();
    },
  });

  // Fetch company codes
  const { data: companyCodes } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/company-codes'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/asset-management/company-codes');
      return await response.json();
    },
  });

  // Fetch cost centers
  const { data: costCenters } = useQuery({
    queryKey: ['/api/finance-enhanced/asset-management/cost-centers'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/asset-management/cost-centers');
      return await response.json();
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (assetData: any) => {
      const response = await fetch('/api/finance-enhanced/asset-management/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create asset');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
      toast({
        title: "Success",
        description: `Asset ${data.asset_number || data.name || 'created'} created successfully`
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create asset",
        variant: "destructive"
      });
    }
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, assetData }: { id: number; assetData: any }) => {
      const response = await fetch(`/api/finance-enhanced/asset-management/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update asset');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
      toast({
        title: "Success",
        description: `Asset updated successfully`
      });
      setIsViewDialogOpen(false);
      setSelectedAsset(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset",
        variant: "destructive"
      });
    }
  });

  // Fetch asset details
  const fetchAssetDetails = async (assetId: number) => {
    try {
      const response = await fetch(`/api/finance-enhanced/asset-management/assets/${assetId}`);
      if (!response.ok) throw new Error('Failed to fetch asset');
      const data = await response.json();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch asset details",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleViewAsset = async (asset: any) => {
    const details = await fetchAssetDetails(asset.id);
    if (details) {
      setSelectedAsset(details);
      setIsViewDialogOpen(true);
    }
  };

  const StatCard = ({ title, value, icon: Icon, badge }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value || 0}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return "$0.00";
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'retired':
        return <Badge className="bg-gray-500 text-white">Retired</Badge>;
      case 'under construction':
        return <Badge className="bg-yellow-500 text-white">Under Construction</Badge>;
      case 'disposed':
        return <Badge className="bg-red-500 text-white">Disposed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Export assets to CSV
  const exportToCSV = () => {
    if (!assets || assets.length === 0) {
      toast({
        title: "No Data",
        description: "No assets to export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Asset Number',
      'Name',
      'Description',
      'Asset Class',
      'Acquisition Date',
      'Acquisition Cost',
      'Current Value',
      'Accumulated Depreciation',
      'Location',
      'Company Code',
      'Cost Center',
      'Status'
    ];

    const rows = assets.map((asset: any) => [
      asset.asset_number || '',
      asset.name || '',
      (asset.description || '').replace(/[\n\r,]/g, ' '),
      asset.asset_class_name || asset.asset_class || '',
      asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString() : '',
      asset.acquisition_cost || 0,
      asset.current_value || asset.net_book_value || 0,
      asset.accumulated_depreciation || 0,
      (asset.location || '').replace(/[\n\r,]/g, ' '),
      asset.company_code_name || asset.company_code || '',
      asset.cost_center_name || asset.cost_center || '',
      asset.status || 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asset_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${assets.length} assets to CSV`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Asset Management Enhanced</h1>
            <p className="text-muted-foreground">Complete asset lifecycle management, depreciation, and reporting</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Asset</DialogTitle>
            </DialogHeader>
            <AssetForm
              onSubmit={(data) => createAssetMutation.mutate(data)}
              onCancel={() => setIsCreateDialogOpen(false)}
              companyCodes={companyCodes || []}
              costCenters={costCenters || []}
              depreciationMethods={depreciationMethods || []}
              assetClasses={assetClasses || []}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={assetStats?.total_assets || 0}
          icon={Building}
          badge="All Assets"
        />
        <StatCard
          title="Active Assets"
          value={assetStats?.active_assets || 0}
          icon={CheckCircle2}
          badge="In Use"
        />
        <StatCard
          title="Total Acquisition Value"
          value={formatCurrency(assetStats?.total_acquisition_value)}
          icon={DollarSign}
          badge="Acquisition"
        />
        <StatCard
          title="Total Current Value"
          value={formatCurrency(assetStats?.total_current_value)}
          icon={TrendingUp}
          badge="Current"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="unplanned" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Unplanned Depreciation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Status Overview Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Status Overview</CardTitle>
              <CardDescription>
                Distribution of assets by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-muted-foreground mb-1">Active Assets</div>
                  <div className="text-2xl font-bold text-green-700">{assetStats?.active_assets || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {assetStats?.total_assets ?
                      `${Math.round(((assetStats.active_assets || 0) / assetStats.total_assets) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-muted-foreground mb-1">Under Construction</div>
                  <div className="text-2xl font-bold text-yellow-700">{assetStats?.under_construction_assets || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {assetStats?.total_assets ?
                      `${Math.round(((assetStats.under_construction_assets || 0) / assetStats.total_assets) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-muted-foreground mb-1">Retired Assets</div>
                  <div className="text-2xl font-bold text-gray-700">{assetStats?.retired_assets || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {assetStats?.total_assets ?
                      `${Math.round(((assetStats.retired_assets || 0) / assetStats.total_assets) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-muted-foreground mb-1">Total Assets</div>
                  <div className="text-2xl font-bold text-blue-700">{assetStats?.total_assets || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">All statuses</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Asset values and depreciation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Acquisition Value</div>
                    <div className="text-xl font-bold">{formatCurrency(assetStats?.total_acquisition_value)}</div>
                  </div>
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Current Value</div>
                    <div className="text-xl font-bold">{formatCurrency(assetStats?.total_current_value)}</div>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Depreciation</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(
                        (parseFloat(assetStats?.total_acquisition_value || 0) -
                          parseFloat(assetStats?.total_current_value || 0))
                      )}
                    </div>
                  </div>
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                {assetStats?.total_acquisition_value && parseFloat(assetStats.total_acquisition_value) > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Depreciation Rate: {
                      Math.round(
                        ((parseFloat(assetStats.total_acquisition_value) -
                          parseFloat(assetStats.total_current_value || 0)) /
                          parseFloat(assetStats.total_acquisition_value)) * 100
                      )
                    }%
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Configuration and methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Depreciation Methods</div>
                    <div className="text-xl font-bold">{assetStats?.total_depreciation_methods || 0}</div>
                  </div>
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Asset Classes</div>
                    <div className="text-xl font-bold">{assetClasses?.length || 0}</div>
                  </div>
                  <Building className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  <div>• {assetStats?.total_assets || 0} total assets registered</div>
                  <div>• {assetStats?.active_assets || 0} currently active</div>
                  <div>• {depreciationMethods?.length || 0} depreciation methods configured</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Assets */}
          {assets && assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Assets</CardTitle>
                <CardDescription>Latest assets added to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Asset Class</TableHead>
                      <TableHead>Acquisition Cost</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.slice(0, 5).map((asset: any) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_number || "-"}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.asset_class_name || asset.asset_class_code || asset.asset_class || "-"}</TableCell>
                        <TableCell>{formatCurrency(asset.acquisition_cost)}</TableCell>
                        <TableCell>{formatCurrency(asset.current_value)}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {assets.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => setSelectedTab("assets")}>
                      View All Assets ({assets.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assets</CardTitle>
                  <CardDescription>Manage and track all company assets</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Under Construction">Under Construction</SelectItem>
                      <SelectItem value="Retired">Retired</SelectItem>
                      <SelectItem value="Disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!assets || assets.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAssets ? (
                <div className="text-center py-8">Loading assets...</div>
              ) : assets && assets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Asset Class</TableHead>
                      <TableHead>Acquisition Date</TableHead>
                      <TableHead className="text-right">Acquisition Cost</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset: any) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_number || "-"}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.asset_class_name || asset.asset_class_code || asset.asset_class || "-"}</TableCell>
                        <TableCell>{formatDate(asset.acquisition_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.acquisition_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.current_value)}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewAsset(asset)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setActionAsset(asset);
                                setIsAcquisitionOpen(true);
                              }}>
                                <ShoppingCart className="mr-2 h-4 w-4 text-blue-600" />
                                Record Acquisition
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionAsset(asset);
                                  setIsTransferOpen(true);
                                }}
                                disabled={asset.status === 'Retired' || asset.status === 'Disposed'}
                              >
                                <ArrowRightLeft className="mr-2 h-4 w-4 text-orange-600" />
                                Transfer Asset
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionAsset(asset);
                                  setIsRetirementOpen(true);
                                }}
                                disabled={asset.status === 'Retired' || asset.status === 'Disposed'}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Retire Asset
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No assets match your search criteria.'
                    : 'No assets found. Create your first asset to get started.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          {/* Depreciation Run Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Depreciation Run</CardTitle>
                  <CardDescription>
                    Calculate and post depreciation for assets
                  </CardDescription>
                </div>
                <Dialog open={isDepreciationDialogOpen} onOpenChange={setIsDepreciationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Calculator className="mr-2 h-4 w-4" />
                      Run Depreciation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Run Depreciation</DialogTitle>
                    </DialogHeader>
                    <DepreciationRunForm
                      companyCodes={companyCodes || []}
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/depreciation-runs'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/assets'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
                      }}
                      onClose={() => setIsDepreciationDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DepreciationRunHistory />
            </CardContent>
          </Card>

          {/* Depreciation Methods Section */}
          <Card>
            <CardHeader>
              <CardTitle>Depreciation Methods</CardTitle>
              <CardDescription>
                Configure and manage depreciation methods and calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Depreciation methods available: {depreciationMethods?.length || 0}
                </div>
                {depreciationMethods && depreciationMethods.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depreciationMethods.map((method: any) => (
                        <TableRow key={method.id}>
                          <TableCell className="font-medium">{method.name || method.method_name || method.code}</TableCell>
                          <TableCell>{method.description || "-"}</TableCell>
                          <TableCell>
                            {method.is_active ? (
                              <Badge className="bg-green-500 text-white">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No depreciation methods configured. Configure depreciation methods in Master Data.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unplanned Depreciation Tab */}
        <TabsContent value="unplanned" className="space-y-4">
          <UnplannedDepreciationTile onBack={() => setSelectedTab("assets")} />
        </TabsContent>
      </Tabs>

      {/* View Asset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <AssetViewDetails
              asset={selectedAsset}
              companyCodes={companyCodes || []}
              costCenters={costCenters || []}
              depreciationMethods={depreciationMethods || []}
              assetClasses={assetClasses || []}
              onClose={() => {
                setIsViewDialogOpen(false);
                setSelectedAsset(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Asset Acquisition Dialog */}
      {actionAsset && (
        <AssetAcquisitionDialog
          open={isAcquisitionOpen}
          onOpenChange={(open) => {
            setIsAcquisitionOpen(open);
            if (!open) setActionAsset(null);
          }}
          assetId={actionAsset.id}
          assetNumber={actionAsset.asset_number}
          assetName={actionAsset.name}
          onSuccess={() => {
            refetchAssets();
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
          }}
        />
      )}

      {/* Asset Transfer Dialog */}
      {actionAsset && (
        <AssetTransferDialog
          open={isTransferOpen}
          onOpenChange={(open) => {
            setIsTransferOpen(open);
            if (!open) setActionAsset(null);
          }}
          assetId={actionAsset.id}
          assetNumber={actionAsset.asset_number}
          assetName={actionAsset.name}
          currentCostCenter={actionAsset.cost_center_name || actionAsset.cost_center_code}
          currentCompanyCode={actionAsset.company_code_name || actionAsset.company_code}
          onSuccess={() => {
            refetchAssets();
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
          }}
        />
      )}

      {/* Asset Retirement Dialog */}
      {actionAsset && (
        <AssetRetirementDialog
          open={isRetirementOpen}
          onOpenChange={(open) => {
            setIsRetirementOpen(open);
            if (!open) setActionAsset(null);
          }}
          assetId={actionAsset.id}
          assetNumber={actionAsset.asset_number}
          assetName={actionAsset.name}
          currentValue={actionAsset.current_value}
          acquisitionCost={actionAsset.acquisition_cost}
          onSuccess={() => {
            refetchAssets();
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
          }}
        />
      )}
    </div>
  );
}

// Asset Form Component
function AssetForm({ asset, onSubmit, onCancel, companyCodes, costCenters, depreciationMethods, assetClasses }: any) {
  const [formData, setFormData] = useState({
    asset_number: asset?.asset_number || "",
    name: asset?.name || "",
    description: asset?.description || "",
    asset_class_id: asset?.asset_class_id || "",
    asset_class: asset?.asset_class || asset?.asset_class_name || "",
    acquisition_date: asset?.acquisition_date || "",
    acquisition_cost: asset?.acquisition_cost || "",
    current_value: asset?.current_value || "",
    depreciation_method: asset?.depreciation_method || "",
    useful_life_years: asset?.useful_life_years || "",
    company_code_id: asset?.company_code_id || "",
    cost_center_id: asset?.cost_center_id || "",
    location: asset?.location || "",
    status: asset?.status || "Active",
  });

  // Update form data when asset changes
  useEffect(() => {
    if (asset) {
      // Format date if it exists
      let formattedDate = "";
      if (asset.acquisition_date) {
        const date = new Date(asset.acquisition_date);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0];
        }
      }

      setFormData({
        asset_number: asset.asset_number || "",
        name: asset.name || "",
        description: asset.description || "",
        asset_class_id: asset.asset_class_id || "",
        asset_class: asset.asset_class || asset.asset_class_name || "",
        acquisition_date: formattedDate,
        acquisition_cost: asset.acquisition_cost || "",
        current_value: asset.current_value || "",
        depreciation_method: asset.depreciation_method || "",
        useful_life_years: asset.useful_life_years || "",
        company_code_id: asset.company_code_id || "",
        cost_center_id: asset.cost_center_id || "",
        location: asset.location || "",
        status: asset.status || "Active",
      });
    }
  }, [asset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="asset_number">Asset Number</Label>
          <Input
            id="asset_number"
            value={formData.asset_number}
            onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
            placeholder="Auto-generated if empty"
          />
        </div>
        <div>
          <Label htmlFor="name">Asset Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="asset_class_id">Asset Class</Label>
          <Select
            value={String(formData.asset_class_id || "none")}
            onValueChange={(value) => {
              if (value === "none") {
                setFormData({
                  ...formData,
                  asset_class_id: "",
                  asset_class: ""
                });
                return;
              }
              const selectedClass = assetClasses.find((ac: any) => String(ac.id) === value);
              setFormData({
                ...formData,
                asset_class_id: value,
                asset_class: selectedClass?.name || "",
                depreciation_method: selectedClass?.default_depreciation_method || formData.depreciation_method,
                useful_life_years: selectedClass?.default_useful_life_years || formData.useful_life_years
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select asset class</SelectItem>
              {assetClasses.map((ac: any) => (
                <SelectItem key={ac.id} value={String(ac.id)}>
                  {ac.code} - {ac.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Under Construction">Under Construction</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="acquisition_date">Acquisition Date</Label>
          <Input
            id="acquisition_date"
            type="date"
            value={formData.acquisition_date}
            onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="acquisition_cost">Acquisition Cost</Label>
          <Input
            id="acquisition_cost"
            type="number"
            step="0.01"
            value={formData.acquisition_cost}
            onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="current_value">Current Value</Label>
          <Input
            id="current_value"
            type="number"
            step="0.01"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="depreciation_method">Depreciation Method</Label>
          <Select
            value={formData.depreciation_method || "none"}
            onValueChange={(value) => setFormData({ ...formData, depreciation_method: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select method</SelectItem>
              {depreciationMethods && depreciationMethods.length > 0 ? (
                depreciationMethods.map((method: any) => {
                  const methodValue = method.code || method.name;
                  const methodLabel = method.name || method.code;
                  // Ensure value is not empty
                  if (!methodValue) return null;
                  return (
                    <SelectItem key={method.id} value={methodValue}>
                      {methodLabel}
                    </SelectItem>
                  );
                })
              ) : null}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="useful_life_years">Useful Life (Years)</Label>
          <Input
            id="useful_life_years"
            type="number"
            value={formData.useful_life_years}
            onChange={(e) => setFormData({ ...formData, useful_life_years: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_code_id">Company Code</Label>
          <Select
            value={String(formData.company_code_id || "none")}
            onValueChange={(value) => setFormData({ ...formData, company_code_id: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select company code</SelectItem>
              {companyCodes.map((cc: any) => (
                <SelectItem key={cc.id} value={String(cc.id)}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cost_center_id">Cost Center</Label>
          <Select
            value={String(formData.cost_center_id || "none")}
            onValueChange={(value) => setFormData({ ...formData, cost_center_id: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select cost center" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select cost center</SelectItem>
              {costCenters.map((cc: any) => (
                <SelectItem key={cc.id} value={String(cc.id)}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {asset ? "Update Asset" : "Create Asset"}
        </Button>
      </div>
    </form>
  );
}

