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

interface AdvancedReportingTileProps {
  onBack: () => void;
}

export default function AdvancedReportingTile({ onBack }: AdvancedReportingTileProps) {
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AR reports
  const { data: arReports, isLoading } = useQuery({
    queryKey: ['/api/ar/reports'],
  });

  // Fetch DSO analysis
  const { data: dsoAnalysis } = useQuery({
    queryKey: ['/api/ar/dso-analysis'],
  });

  // Fetch cash flow forecast
  const { data: cashFlowForecast } = useQuery({
    queryKey: ['/api/ar/cash-flow-forecast'],
  });

  // Fetch aging analysis
  const { data: agingAnalysis } = useQuery({
    queryKey: ['/api/ar/aging-analysis'],
  });

  // Fetch customers for report filtering
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      return await apiRequest('/api/ar/generate-report', {
        method: 'POST',
        body: JSON.stringify(reportData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: "Report has been generated successfully and is ready for download.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/reports'] });
      // Trigger download
      if ((data?.download_url ?? "")) {
        window.open((data?.download_url ?? ""), '_blank');
      }
      setShowReportForm(false);
    },
    onError: (error) => {
      toast({
        title: "Report Generation Failed",
        description: error.message,
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
      customer_id: customer || null,
      generated_by: 'Current User',
      generated_date: new Date().toISOString(),
    });
  };

  const downloadReport = async (reportId: string) => {
    try {
      const response = await apiRequest(`/api/ar/download-report/${reportId}`);
      if ((response?.download_url ?? "")) {
        window.open((response?.download_url ?? ""), '_blank');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download report.",
        variant: "destructive",
      });
    }
  };

  const getReportTypeBadge = (type: string) => {
    const typeMap: { [key: string]: { color: string; label: string } } = {
      'aging_analysis': { color: 'bg-blue-500', label: 'Aging Analysis' },
      'dso_analysis': { color: 'bg-green-500', label: 'DSO Analysis' },
      'cash_flow_forecast': { color: 'bg-purple-500', label: 'Cash Flow' },
      'customer_profitability': { color: 'bg-orange-500', label: 'Profitability' },
      'collection_effectiveness': { color: 'bg-red-500', label: 'Collections' },
    };
    const config = typeMap[type] || { color: 'bg-gray-500', label: type };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Reporting Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current DSO</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(dsoAnalysis?.current_dso ?? 0)} days
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
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {(dsoAnalysis?.collection_rate ?? 0)}%
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
                <p className="text-sm text-gray-600">30-Day Forecast</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${cashFlowForecast?.next_30_days?.toFixed(2) || '0.00'}
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
                  {Array.isArray(arReports) ? arReports.filter((r) => 
                    new Date(r.generated_date).getMonth() === new Date().getMonth()
                  ).length : 0}
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
            <CardTitle>Generate New Report</CardTitle>
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
                    <SelectItem value="aging_analysis">Aging Analysis</SelectItem>
                    <SelectItem value="dso_analysis">DSO Analysis</SelectItem>
                    <SelectItem value="cash_flow_forecast">Cash Flow Forecast</SelectItem>
                    <SelectItem value="customer_profitability">Customer Profitability</SelectItem>
                    <SelectItem value="collection_effectiveness">Collection Effectiveness</SelectItem>
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
                <Label>Customer (Optional)</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Customers</SelectItem>
                    {Array.isArray(customers) ? customers.map((cust) => (
                      <SelectItem key={cust.id} value={cust.id.toString()}>
                        {cust.name}
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

      {/* Aging Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                ${agingAnalysis?.current?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-600">Current</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                ${agingAnalysis?.days_1_30?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-600">1-30 Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                ${agingAnalysis?.days_31_60?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-600">31-60 Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                ${agingAnalysis?.days_61_90?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-600">61-90 Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-800">
                ${agingAnalysis?.days_over_90?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-600">Over 90 Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : !arReports || arReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  (Array.isArray(arReports) ? arReports.slice() : []).map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                      <TableCell>
                        {new Date(report.date_from).toLocaleDateString()} - {new Date(report.date_to).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{new Date(report.generated_date).toLocaleDateString()}</TableCell>
                      <TableCell>{report.generated_by}</TableCell>
                      <TableCell>
                        <Badge className={report.status === 'completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReport(report.id)}
                          disabled={report.status !== 'completed'}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Forecast (Next 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                ${cashFlowForecast?.next_30_days?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-blue-600">Next 30 Days</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                ${cashFlowForecast?.next_60_days?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-green-600">Next 60 Days</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                ${cashFlowForecast?.next_90_days?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-purple-600">Next 90 Days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}