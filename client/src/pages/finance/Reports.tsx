import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Mail, Printer, ArrowDown, BarChart, FileBarChart, TrendingUp, DollarSign, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [reportType, setReportType] = useState("sales");
  const [reportFormat, setReportFormat] = useState("pdf");
  const { toast } = useToast();
  
  const { mutate: generateReport, isPending: isGenerating } = useMutation({
    mutationFn: async (reportData: { type: string; format: string; dateRange?: any }) => {
      const response = await apiRequest('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify(reportData),
      } as RequestInit);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: `Your ${reportType} report has been generated successfully.`,
      });
      // If report has download URL, trigger download
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateReport = () => {
    generateReport({
      type: reportType,
      format: reportFormat,
      dateRange: dateRange,
    });
  };

  return (
    <>
      <Header title="Reports" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">Generate and download financial reports for your business.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2 border border-gray-100">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select criteria to generate your financial report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="report-type">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="inventory">Inventory Report</SelectItem>
                    <SelectItem value="expense">Expense Report</SelectItem>
                    <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                    <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                    <SelectItem value="cash-flow">Cash Flow Statement</SelectItem>
                    <SelectItem value="tax">Tax Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange value={dateRange} onChange={setDateRange} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-format">Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger id="report-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="include-charts">Additional Options</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="include-charts" />
                  <label
                    htmlFor="include-charts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include charts and graphs
                  </label>
                </div>
              </div>
            </div>
            
            {reportType === "sales" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-filter">Filter by Customer (Optional)</Label>
                  <Select>
                    <SelectTrigger id="customer-filter">
                      <SelectValue placeholder="All customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="1">Jane Doe</SelectItem>
                      <SelectItem value="2">Robert Johnson</SelectItem>
                      <SelectItem value="3">Emma Brown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="product-filter">Filter by Product (Optional)</Label>
                  <Select>
                    <SelectTrigger id="product-filter">
                      <SelectValue placeholder="All products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="1">Laptop Pro X12</SelectItem>
                      <SelectItem value="2">Wireless Earbuds</SelectItem>
                      <SelectItem value="3">Smart Watch S4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {reportType === "inventory" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category-filter">Filter by Category (Optional)</Label>
                  <Select>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="1">Electronics</SelectItem>
                      <SelectItem value="2">Audio</SelectItem>
                      <SelectItem value="3">Wearables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock-filter">Stock Level (Optional)</Label>
                  <Select>
                    <SelectTrigger id="stock-filter">
                      <SelectValue placeholder="All stock levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                      <SelectItem value="optimal">Optimal Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {reportType === "expense" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-category">Filter by Category (Optional)</Label>
                  <Select>
                    <SelectTrigger id="expense-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="salaries">Salaries</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method (Optional)</Label>
                  <Select>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="All payment methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your recently generated reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileBarChart className="h-6 w-6 text-primary-600 mr-3" />
                    <div>
                      <p className="font-medium">Sales Report</p>
                      <p className="text-xs text-gray-500">Generated on Jul 05, 2023</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium">Profit & Loss Statement</p>
                      <p className="text-xs text-gray-500">Generated on Jul 02, 2023</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Receipt className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium">Expense Report</p>
                      <p className="text-xs text-gray-500">Generated on Jun 28, 2023</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="h-6 w-6 text-purple-600 mr-3" />
                    <div>
                      <p className="font-medium">Inventory Report</p>
                      <p className="text-xs text-gray-500">Generated on Jun 25, 2023</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="premade" className="mb-6">
        <TabsList>
          <TabsTrigger value="premade" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pre-made Reports
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4" />
            Schedule Reports
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="premade" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <DollarSign className="h-5 w-5 mr-2 text-primary-600" />
                  Monthly Income Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">A summary of your business's income, expenses, and resulting profit or loss over the last month.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jul 01, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <BarChart className="h-5 w-5 mr-2 text-blue-600" />
                  Quarterly Sales Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Detailed analysis of your sales performance over the last quarter, broken down by product and customer.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jun 30, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <FileBarChart className="h-5 w-5 mr-2 text-green-600" />
                  Inventory Valuation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">A comprehensive valuation of your current inventory with cost, retail value, and profit margins.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jun 25, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                  Annual Revenue Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Projection of your annual revenue based on current sales trends and historical data.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jun 20, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Receipt className="h-5 w-5 mr-2 text-red-600" />
                  Expense Breakdown Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Detailed breakdown of your business expenses by category with month-over-month comparison.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jun 15, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-yellow-600" />
                  Tax Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Compilation of tax-relevant financial data to assist with tax preparation and filing.</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <div className="text-xs text-gray-500">Last Generated: Jun 10, 2023</div>
                <Button variant="outline" size="sm">Generate</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="schedule" className="mt-6">
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle>Schedule Automated Reports</CardTitle>
              <CardDescription>Set up recurring reports to be automatically generated and sent to specified recipients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-report">Report Type</Label>
                  <Select>
                    <SelectTrigger id="schedule-report">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Report</SelectItem>
                      <SelectItem value="inventory">Inventory Report</SelectItem>
                      <SelectItem value="expense">Expense Report</SelectItem>
                      <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                      <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select>
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipients">Email Recipients</Label>
                <Input id="recipients" placeholder="Enter email addresses (comma separated)" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="report-name">Report Name</Label>
                <Input id="report-name" placeholder="Enter a name for this scheduled report" />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="include-charts-scheduled" />
                <label
                  htmlFor="include-charts-scheduled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include charts and graphs
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4">
              <Button variant="outline">Cancel</Button>
              <Button>Schedule Report</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
