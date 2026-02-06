import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Calendar, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface APReportingTileProps {
  onBack: () => void;
}

export default function APReportingTile({ onBack }: APReportingTileProps) {
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AP reports - using reporting statistics
  const { data: reportStats } = useQuery({
    queryKey: ['/api/ap/reporting-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/reporting-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  // Fetch DPO analysis (Days Payable Outstanding) - derived from reporting stats
  const dpoAnalysis = reportStats ? {
    current_dpo: reportStats.dpo || 0,
    target_dpo: 30,
    industry_average: 35,
    trend_direction: 'stable',
    trend_percentage: 0
  } : null;

  // Fetch cash flow analysis - using invoice data
  const { data: invoiceData } = useQuery({
    queryKey: ['/api/ap/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/ap/invoices');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  const cashFlowAnalysis = invoiceData ? {
    next_30_days: Array.isArray(invoiceData)
      ? invoiceData
        .filter((inv: any) => {
          const dueDate = new Date(inv.due_date);
          const today = new Date();
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 0 && daysDiff <= 30;
        })
        .reduce((sum: number, inv: any) => sum + parseFloat(inv.net_amount || inv.amount || 0), 0)
      : 0,
    next_60_days: Array.isArray(invoiceData)
      ? invoiceData
        .filter((inv: any) => {
          const dueDate = new Date(inv.due_date);
          const today = new Date();
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 31 && daysDiff <= 60;
        })
        .reduce((sum: number, inv: any) => sum + parseFloat(inv.net_amount || inv.amount || 0), 0)
      : 0,
    next_90_days: Array.isArray(invoiceData)
      ? invoiceData
        .filter((inv: any) => {
          const dueDate = new Date(inv.due_date);
          const today = new Date();
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 61 && daysDiff <= 90;
        })
        .reduce((sum: number, inv: any) => sum + parseFloat(inv.net_amount || inv.amount || 0), 0)
      : 0,
    next_30_count: Array.isArray(invoiceData)
      ? invoiceData.filter((inv: any) => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= 30;
      }).length
      : 0,
    next_60_count: Array.isArray(invoiceData)
      ? invoiceData.filter((inv: any) => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 31 && daysDiff <= 60;
      }).length
      : 0,
    next_90_count: Array.isArray(invoiceData)
      ? invoiceData.filter((inv: any) => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 61 && daysDiff <= 90;
      }).length
      : 0,
  } : null;

  // Fetch vendor performance metrics - using vendors data
  const { data: vendors } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  const vendorPerformance = vendors && Array.isArray(vendors) ? vendors.slice(0, 10).map((vendor: any) => ({
    id: vendor.id,
    name: vendor.name,
    total_spend: parseFloat(vendor.total_paid || 0),
    payment_terms: vendor.payment_terms || 30,
    on_time_performance: vendor.avg_payment_days ? (vendor.avg_payment_days <= vendor.payment_terms ? 95 : 75) : 85,
    discount_capture: 0,
    performance_score: vendor.avg_payment_days ? (vendor.avg_payment_days <= vendor.payment_terms ? 90 : 70) : 80
  })) : [];

  // Fetch payment analysis - using vendor payments
  const { data: vendorPayments } = useQuery({
    queryKey: ['/api/purchase/vendor-payments'],
    queryFn: async () => {
      const response = await fetch('/api/purchase/vendor-payments');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
  });

  const paymentAnalysis = vendorPayments && Array.isArray(vendorPayments) ? (() => {
    const total = vendorPayments.reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || 0), 0);
    const ach = vendorPayments.filter((p: any) => p.payment_method === 'BANK_TRANSFER' || p.payment_method === 'ONLINE_TRANSFER').reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || 0), 0);
    const wire = vendorPayments.filter((p: any) => p.payment_method === 'WIRE_TRANSFER').reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || 0), 0);
    const check = vendorPayments.filter((p: any) => p.payment_method === 'CHECK').reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || 0), 0);
    const card = vendorPayments.filter((p: any) => p.payment_method === 'CARD').reduce((sum: number, p: any) => sum + parseFloat(p.payment_amount || 0), 0);

    return {
      efficiency_score: 85,
      ach_percentage: total > 0 ? Math.round((ach / total) * 100) : 0,
      ach_amount: ach,
      wire_percentage: total > 0 ? Math.round((wire / total) * 100) : 0,
      wire_amount: wire,
      check_percentage: total > 0 ? Math.round((check / total) * 100) : 0,
      check_amount: check,
      card_percentage: total > 0 ? Math.round((card / total) * 100) : 0,
      card_amount: card,
    };
  })() : {
    efficiency_score: 0,
    ach_percentage: 0,
    ach_amount: 0,
    wire_percentage: 0,
    wire_amount: 0,
    check_percentage: 0,
    check_amount: 0,
    card_percentage: 0,
    card_amount: 0,
  };

  // Reports list - empty for now as we don't have a reports table
  // Report generation feature will be implemented in a future release

  // Generate report mutation - for now, just show a message
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      // For now, return success without actually generating a report
      // In the future, this would call a report generation service
      return { success: true, message: 'Report generation not yet implemented' };
    },
    onSuccess: () => {
      toast({
        title: "Report Request Received",
        description: "Report generation is not yet implemented. This feature will be available soon.",
      });
      setShowReportForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Report Generation Failed",
        description: error.message || 'Failed to generate report',
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    if (!reportType || !dateFrom || !dateTo) {
      toast({
        title: "Missing Information",
        description: "Please select report type and date range.",
        variant: "destructive",
      });
      return;
    }

    generateReportMutation.mutate({
      report_type: reportType,
      date_from: dateFrom,
      date_to: dateTo,
      vendor_filter: (vendorFilter && vendorFilter !== 'all') ? vendorFilter : null,
      generated_by: 'Current User',
      generated_date: new Date().toISOString(),
    });
  };

  const downloadReport = async (reportId: string) => {
    toast({
      title: "Download Not Available",
      description: "Report download is not yet implemented. This feature will be available soon.",
      variant: "destructive",
    });
  };

  const getReportTypeBadge = (type: string) => {
    const typeMap: { [key: string]: { color: string; label: string } } = {
      'vendor_analysis': { color: 'bg-blue-500', label: 'Vendor Analysis' },
      'payment_analysis': { color: 'bg-green-500', label: 'Payment Analysis' },
      'cash_flow_forecast': { color: 'bg-purple-500', label: 'Cash Flow' },
      'dpo_analysis': { color: 'bg-orange-500', label: 'DPO Analysis' },
      'compliance_report': { color: 'bg-red-500', label: 'Compliance' },
    };
    const config = typeMap[type] || { color: 'bg-gray-500', label: type };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* AP Reporting Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current DPO</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(dpoAnalysis?.current_dpo ?? 0)} days
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Efficiency</p>
                <p className="text-2xl font-bold text-green-600">
                  {(paymentAnalysis?.efficiency_score ?? 0)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">30-Day Payables</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${Number(cashFlowAnalysis?.next_30_days || 0).toFixed(0)}
                </p>
              </div>
              <PieChart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reports Generated</p>
                <p className="text-2xl font-bold text-orange-600">
                  {reportStats?.generated || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generate AP Report</CardTitle>
            <Button
              onClick={() => setShowReportForm(!showReportForm)}
              variant={showReportForm ? "outline" : "default"}
            >
              {showReportForm ? 'Hide Form' : 'New Report'}
            </Button>
          </div>
        </CardHeader>
        {showReportForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor_analysis">Vendor Analysis</SelectItem>
                    <SelectItem value="payment_analysis">Payment Analysis</SelectItem>
                    <SelectItem value="cash_flow_forecast">Cash Flow Forecast</SelectItem>
                    <SelectItem value="dpo_analysis">DPO Analysis</SelectItem>
                    <SelectItem value="compliance_report">Compliance Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Vendor (Optional)</Label>
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {Array.isArray(vendors) ? vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleGenerateReport}
                disabled={generateReportMutation.isPending}
              >
                {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* DPO Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Days Payable Outstanding (DPO) Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {(dpoAnalysis?.current_dpo ?? 0)}
              </p>
              <p className="text-sm text-blue-600">Current DPO</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {(dpoAnalysis?.target_dpo ?? 0)}
              </p>
              <p className="text-sm text-green-600">Target DPO</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {(dpoAnalysis?.industry_average ?? 0)}
              </p>
              <p className="text-sm text-purple-600">Industry Average</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {dpoAnalysis?.trend_direction === 'up' ? '↑' : dpoAnalysis?.trend_direction === 'down' ? '↓' : '→'} {(dpoAnalysis?.trend_percentage ?? 0)}%
              </p>
              <p className="text-sm text-orange-600">Trend</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vendor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>On-Time Performance</TableHead>
                  <TableHead>Discount Capture</TableHead>
                  <TableHead>Performance Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(vendorPerformance) ? vendorPerformance.slice() : []).map((vendor: any) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>${Number(vendor?.total_spend || 0).toFixed(2)}</TableCell>
                    <TableCell>Net {vendor.payment_terms} days</TableCell>
                    <TableCell>
                      <Badge className={vendor.on_time_performance >= 90 ? 'bg-green-500' : vendor.on_time_performance >= 75 ? 'bg-yellow-500' : 'bg-red-500'}>
                        {vendor.on_time_performance || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>{vendor.discount_capture || 0}%</TableCell>
                    <TableCell>
                      <Badge className={vendor.performance_score >= 85 ? 'bg-green-500' : vendor.performance_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}>
                        {vendor.performance_score || 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) || (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No vendor performance data available
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Analysis (Next 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                ${Number(cashFlowAnalysis?.next_30_days || 0).toFixed(0)}
              </p>
              <p className="text-sm text-red-600">Next 30 Days</p>
              <p className="text-xs text-gray-600">
                {(cashFlowAnalysis?.next_30_count ?? 0)} payments
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                ${Number(cashFlowAnalysis?.next_60_days || 0).toFixed(0)}
              </p>
              <p className="text-sm text-orange-600">Next 60 Days</p>
              <p className="text-xs text-gray-600">
                {(cashFlowAnalysis?.next_60_count ?? 0)} payments
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                ${Number(cashFlowAnalysis?.next_90_days || 0).toFixed(0)}
              </p>
              <p className="text-sm text-yellow-600">Next 90 Days</p>
              <p className="text-xs text-gray-600">
                {(cashFlowAnalysis?.next_90_count ?? 0)} payments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {(paymentAnalysis?.ach_percentage ?? 0)}%
              </p>
              <p className="text-sm text-blue-600">ACH Transfers</p>
              <p className="text-xs text-gray-600">
                ${Number(paymentAnalysis?.ach_amount || 0).toFixed(0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {(paymentAnalysis?.wire_percentage ?? 0)}%
              </p>
              <p className="text-sm text-purple-600">Wire Transfers</p>
              <p className="text-xs text-gray-600">
                ${Number(paymentAnalysis?.wire_amount || 0).toFixed(0)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {(paymentAnalysis?.check_percentage ?? 0)}%
              </p>
              <p className="text-sm text-green-600">Checks</p>
              <p className="text-xs text-gray-600">
                ${Number(paymentAnalysis?.check_amount || 0).toFixed(0)}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {(paymentAnalysis?.card_percentage ?? 0)}%
              </p>
              <p className="text-sm text-orange-600">Cards</p>
              <p className="text-xs text-gray-600">
                ${Number(paymentAnalysis?.card_amount || 0).toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AP Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No reports available. Report generation feature coming soon.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}