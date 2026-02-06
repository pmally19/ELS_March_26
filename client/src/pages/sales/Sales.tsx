import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import SalesFunnel from "@/components/sales/SalesFunnel";
import SalesFunnelCustomizer from "@/components/sales/SalesFunnelCustomizer";
import PipelineReport from "@/components/sales/PipelineReport";
import RegionalSalesChart from "@/components/sales/RegionalSalesChart";
import OrdersContent from "@/components/sales/OrdersContent";
import QuotesContent from "@/components/sales/QuotesContent";
import InvoicesContent from "@/components/sales/InvoicesContent";
import ReturnsContent from "@/components/sales/ReturnsContent";
import CustomersContent from "@/components/sales/CustomersContent";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  BarChart,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Filter,
  Search,
  ShoppingCart,
  Eye,
  Building,
  Phone,
  Mail,
  Settings,
  Database,
  Copy,
  ArrowLeft,
  Calculator
} from "lucide-react";
import PipelineByStage from "@/components/sales/PipelineByStage";
import OpenOpportunitiesList from "@/components/sales/OpenOpportunitiesList";
import LeadsList from "@/components/sales/LeadsList";
import { Input } from "@/components/ui/input";
import AddLeadDialog from "@/components/sales/AddLeadDialog";

export default function Sales() {
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [showPipelineReport, setShowPipelineReport] = useState(false);

  // Fetch revenue data from Financial Integration API to align values
  const { data: financialData } = useQuery({
    queryKey: ['/api/financial-integration/dashboard'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/financial-integration/dashboard');
        if (response.ok) {
          return response.json();
        }
        return null;
      } catch (error) {
        return null;
      }
    }
  });

  // Fetch real process flow counts from database
  const { data: processFlowCounts } = useQuery({
    queryKey: ['/api/sales/process-flow-counts'],
    queryFn: async () => {
      const response = await fetch('/api/sales/process-flow-counts');
      if (!response.ok) {
        throw new Error('Failed to fetch process flow counts');
      }
      return response.json();
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch sales metrics (revenue, opportunities, conversion rate)
  const { data: salesMetrics } = useQuery({
    queryKey: ['/api/sales/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/sales/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch sales metrics');
      }
      return response.json();
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Get aligned revenue value - prefer sales metrics, then financial data, then 0
  const totalRevenue = salesMetrics?.totalRevenue || financialData?.data?.summary?.totalRevenue || 0;

  // Fetch top performing products
  const { data: topProducts = [] } = useQuery({
    queryKey: ['/api/sales/top-products'],
    queryFn: async () => {
      const response = await fetch('/api/sales/top-products');
      if (!response.ok) {
        throw new Error('Failed to fetch top products');
      }
      return response.json();
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const handleFunnelCustomization = (config: any) => {
    console.log('Funnel configuration saved:', config);
    // Add logic to save customization preferences
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sales</h1>
            <p className="text-sm text-muted-foreground">Sales pipeline and customer management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Orders
          </Button>
          <Button size="sm" onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Sales Navigation Tabs */}
      <Card className="w-full max-w-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4 overflow-x-auto">
            <TabsList className="bg-transparent h-12 p-0 rounded-none min-w-max">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="leads"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Leads
              </TabsTrigger>
              <TabsTrigger
                value="opportunities"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Opportunities
              </TabsTrigger>
              <TabsTrigger
                value="quotes"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Quotes
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Invoices
              </TabsTrigger>
              <TabsTrigger
                value="returns"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Returns
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Customers
              </TabsTrigger>
              <TabsTrigger
                value="order-to-cash"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Order-to-Cash
              </TabsTrigger>
              <TabsTrigger
                value="configuration"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Configuration
              </TabsTrigger>
              <TabsTrigger
                value="customization"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                S&D Customization
              </TabsTrigger>
              <TabsTrigger
                value="shipping-logistics"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Shipping & Logistics
              </TabsTrigger>
              <TabsTrigger
                value="revenue-recognition"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Revenue Recognition
              </TabsTrigger>
              <TabsTrigger
                value="customer-portal"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4 flex-shrink-0 whitespace-nowrap"
              >
                Customer Portal
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="p-4 w-full max-w-full overflow-x-hidden">
            {/* Sales Process Flow - Aligned with tabs */}
            <Card className="mb-6 w-full max-w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 min-w-0">
                <CardTitle className="text-lg font-medium min-w-0 truncate">Sales Process</CardTitle>
                <div className="flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 whitespace-nowrap"
                    onClick={() => setShowPipelineReport(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><path d="M13 2v7h7"></path></svg>
                    View Pipeline Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-0 w-full max-w-full">
                  <Link href="/sales/leads" className="flex flex-col items-center group cursor-pointer min-w-0 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <span className="text-sm font-medium">Leads</span>
                    <span className="text-xs text-muted-foreground">({processFlowCounts?.leads || 0})</span>
                  </Link>
                  <div className="hidden md:block w-full max-w-[50px] h-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 h-full w-4/5 bg-blue-500"></div>
                  </div>
                  <div className="md:hidden h-6 w-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-4/5 bg-blue-500"></div>
                  </div>
                  <Link href="/sales/opportunities" className="flex flex-col items-center group cursor-pointer min-w-0 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-2 group-hover:bg-indigo-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><circle cx="12" cy="12" r="10"></circle><path d="m16 8-8 8"></path><path d="M8.5 8.5a2.5 2.5 0 0 1 5 0V12a2.5 2.5 0 0 1-5 0"></path></svg>
                    </div>
                    <span className="text-sm font-medium">Opportunities</span>
                    <span className="text-xs text-muted-foreground">({processFlowCounts?.opportunities || 0})</span>
                  </Link>
                  <div className="hidden md:block w-full max-w-[50px] h-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 h-full w-3/5 bg-indigo-500"></div>
                  </div>
                  <div className="md:hidden h-6 w-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-3/5 bg-indigo-500"></div>
                  </div>
                  <Link href="/sales/quotes" className="flex flex-col items-center group cursor-pointer min-w-0 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2 group-hover:bg-purple-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>
                    </div>
                    <span className="text-sm font-medium">Quote/Estimate</span>
                    <span className="text-xs text-muted-foreground">({processFlowCounts?.quotes || 0})</span>
                  </Link>
                  <div className="hidden md:block w-full max-w-[50px] h-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 h-full w-2/5 bg-purple-500"></div>
                  </div>
                  <div className="md:hidden h-6 w-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-2/5 bg-purple-500"></div>
                  </div>
                  <Link href="/sales/quotes/approved" className="flex flex-col items-center group cursor-pointer min-w-0 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="10"></circle></svg>
                    </div>
                    <span className="text-sm font-medium">Quote Approval</span>
                    <span className="text-xs text-muted-foreground">({Math.floor((processFlowCounts?.quotes || 0) * 0.7)})</span>
                  </Link>
                  <div className="hidden md:block w-full max-w-[50px] h-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 h-full w-1/5 bg-pink-500"></div>
                  </div>
                  <div className="md:hidden h-6 w-0.5 bg-gray-200 relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1/5 bg-pink-500"></div>
                  </div>
                  <Link href="/sales/orders" className="flex flex-col items-center group cursor-pointer min-w-0 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2 group-hover:bg-green-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg>
                    </div>
                    <span className="text-sm font-medium">Order Creation</span>
                    <span className="text-xs text-muted-foreground">({processFlowCounts?.orders || 0})</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {/* Summary KPI Cards */}
              <SalesCard
                title="Total Revenue"
                value={`$${totalRevenue.toLocaleString()}`}
                change={salesMetrics?.revenueChange || 0}
                isPositive={(salesMetrics?.revenueChange || 0) >= 0}
                period="vs last month"
                icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
              />
              <SalesCard
                title="Opportunities"
                value={String(salesMetrics?.opportunitiesCount || processFlowCounts?.opportunities || 0)}
                change={salesMetrics?.opportunitiesChange || 0}
                isPositive={(salesMetrics?.opportunitiesChange || 0) >= 0}
                period="vs last month"
                icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
              />
              <SalesCard
                title="Conversion Rate"
                value={`${(salesMetrics?.conversionRate || 0).toFixed(1)}%`}
                change={salesMetrics?.conversionRateChange || 0}
                isPositive={(salesMetrics?.conversionRateChange || 0) >= 0}
                period="vs last month"
                icon={<LineChart className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            {/* Sales Funnel Chart */}
            <div className="mt-6">
              <SalesFunnel onCustomize={() => setIsCustomizerOpen(true)} />
            </div>

            {/* Additional Sales Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 w-full min-w-0">
              <RegionalSalesChart />

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {topProducts.map((product: any, index: number) => (
                        <TopProduct
                          key={index}
                          name={product.name}
                          revenue={`$${product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          growth={product.growth}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No product data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leads Tab Content */}
          <TabsContent value="leads" className="p-4 w-full max-w-full overflow-x-hidden">
            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  className="pl-8 rounded-md border border-input bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Reset all filters and reload data
                    const searchInput = document.querySelector('input[placeholder="Search leads..."]') as HTMLInputElement;
                    if (searchInput) {
                      searchInput.value = '';
                    }
                    window.location.reload();
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Standalone LeadsList component - this will persist when navigating */}
            <LeadsList />
          </TabsContent>

          {/* Opportunities Tab Content */}
          <TabsContent value="opportunities" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="grid gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search opportunities..."
                    className="pl-8 rounded-md border border-input bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset all filters and reload data
                      const searchInput = document.querySelector('input[placeholder="Search opportunities..."]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.value = '';
                      }
                      window.location.reload();
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <PipelineByStage />
                <OpenOpportunitiesList />
              </div>
            </div>
          </TabsContent>

          {/* Other Tab Contents */}
          <TabsContent value="orders" className="p-4 w-full max-w-full overflow-x-hidden">
            <OrdersContent />
          </TabsContent>

          <TabsContent value="quotes" className="p-4 w-full max-w-full overflow-x-hidden">
            <QuotesContent />
          </TabsContent>

          <TabsContent value="invoices" className="p-4 w-full max-w-full overflow-x-hidden">
            <InvoicesContent />
          </TabsContent>

          <TabsContent value="returns" className="p-4 w-full max-w-full overflow-x-hidden">
            <ReturnsContent />
          </TabsContent>

          <TabsContent value="customers" className="p-4 w-full max-w-full overflow-x-hidden">
            <CustomersContent />
          </TabsContent>

          <TabsContent value="order-to-cash" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Order-to-Cash Process Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete enterprise order processing with inventory integration and financial posting
                  </p>
                </div>
                <Button asChild>
                  <Link href="/sales/order-to-cash">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Launch Order-to-Cash
                  </Link>
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Complete end-to-end process: Customer inquiry through payment collection</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Automated credit checks, inventory validation, and pricing calculations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium">Real-time financial posting to General Ledger with AR integration</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium">Inventory availability checks with material reservation and ATP calculation</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Sales & Distribution Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure enterprise structure, document types, and pricing procedures
                  </p>
                </div>
                <Button asChild>
                  <Link href="/sales/distribution-config">
                    Open Full Configuration
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                <Card className="min-w-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Sales Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">Legal sales units</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Sales Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">Organizational combinations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Document Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">Transaction documents</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Pricing Config
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">Pricing procedures</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Setup</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Get started with basic Sales & Distribution configuration
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">1. Enterprise Structure</p>
                        <p className="text-sm text-muted-foreground">Set up sales organizations, channels, and divisions</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">2. Sales Areas</p>
                        <p className="text-sm text-muted-foreground">Combine organizational units</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">3. Document Configuration</p>
                        <p className="text-sm text-muted-foreground">Define order, delivery, and billing documents</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                      <div>
                        <p className="font-medium text-blue-700">🔧 Condition Types & Pricing Framework</p>
                        <p className="text-sm text-muted-foreground">Complete pricing management: STD1, CDIS01-04, TAX01-04 with Access Sequences</p>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/condition-types-management">
                            <Calculator className="h-4 w-4 mr-2" />
                            Condition Types
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="default">
                          <Link href="/sales/pricing-procedures">
                            <Calculator className="h-4 w-4 mr-2" />
                            Procedures
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/sales/access-sequences">
                            <Database className="h-4 w-4 mr-2" />
                            Access Sequences
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* S&D Customization Tab Content */}
          <TabsContent value="customization" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Sales Distribution Customization
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage customer-specific SD configurations without affecting standard settings
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                      <Card className="p-4 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Database className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Standard Configuration</h4>
                            <p className="text-sm text-gray-600">Base SD settings for all clients</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Building className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Client-Specific</h4>
                            <p className="text-sm text-gray-600">Custom tables per client</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Copy className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Copy & Customize</h4>
                            <p className="text-sm text-gray-600">Start from standard, modify as needed</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="flex gap-4">
                      <Link href="/sales/sd-customization">
                        <Button className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Manage SD Customizations
                        </Button>
                      </Link>
                      <Link href="/sales/configuration">
                        <Button variant="outline" className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Standard Configuration
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Customization Types</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    These configuration areas can be customized per client
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                    <div className="p-4 border rounded-lg min-w-0">
                      <h4 className="font-medium mb-2">Sales Organizations</h4>
                      <p className="text-sm text-gray-600">Company sales organization structure</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Distribution Channels</h4>
                      <p className="text-sm text-gray-600">Sales distribution channel definitions</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Divisions</h4>
                      <p className="text-sm text-gray-600">Product/business divisions</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Sales Areas</h4>
                      <p className="text-sm text-gray-600">Combinations of sales org, channel, and division</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Document Types</h4>
                      <p className="text-sm text-gray-600">Order, delivery, and billing document types</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Pricing Procedures</h4>
                      <p className="text-sm text-gray-600">Pricing calculation procedures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Shipping & Logistics Tab Content */}
          <TabsContent value="shipping-logistics" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Shipping & Logistics</h3>
                  <p className="text-sm text-muted-foreground">Advanced logistics management and shipping optimization</p>
                </div>
                <Link href="/logistics/shipping">
                  <Button>
                    Open Full Module
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Smart Routing</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">AI-powered route optimization and carrier selection</p>
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <span>98.5% efficiency rate</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Real-time Tracking</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Live shipment tracking and delivery notifications</p>
                  <div className="mt-3 flex items-center text-sm text-blue-600">
                    <span>156 active shipments</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Cost Analytics</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Shipping cost analysis and optimization recommendations</p>
                  <div className="mt-3 flex items-center text-sm text-orange-600">
                    <span>15% cost reduction</span>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Revenue Recognition Tab Content */}
          <TabsContent value="revenue-recognition" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Revenue Recognition</h3>
                  <p className="text-sm text-muted-foreground">Advanced revenue management and financial compliance</p>
                </div>
                <Link href="/revenue-recognition">
                  <Button>
                    Open Full Module
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Multi-Currency</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Global revenue recognition with currency hedging</p>
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <span>$1.25M deferred revenue</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Compliance</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Automated compliance with accounting standards</p>
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <span>98.5% accuracy rate</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Performance Obligations</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Track and manage contract performance obligations</p>
                  <div className="mt-3 flex items-center text-sm text-blue-600">
                    <span>156 active contracts</span>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Customer Portal Tab Content */}
          <TabsContent value="customer-portal" className="p-4 w-full max-w-full overflow-x-hidden">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Customer Portal</h3>
                  <p className="text-sm text-muted-foreground">Self-service customer portal and automated engagement</p>
                </div>
                <Link href="/customer-portal">
                  <Button>
                    Open Full Portal
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Self-Service</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Complete customer self-service capabilities</p>
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <span>87% satisfaction rate</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Payment Processing</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Automated payment processing and collections</p>
                  <div className="mt-3 flex items-center text-sm text-blue-600">
                    <span>$485K outstanding</span>
                  </div>
                </Card>

                <Card className="p-4 min-w-0">
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium min-w-0 truncate">Support Hub</h4>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Integrated support ticket and knowledge base</p>
                  <div className="mt-3 flex items-center text-sm text-orange-600">
                    <span>24 open tickets</span>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        isOpen={isAddLeadOpen}
        onOpenChange={setIsAddLeadOpen}
      />

      {/* Pipeline Report Dialog */}
      {showPipelineReport && (
        <PipelineReport
          isOpen={showPipelineReport}
          onClose={() => setShowPipelineReport(false)}
        />
      )}

      {/* Sales Funnel Customizer Dialog */}
      <SalesFunnelCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onSave={handleFunnelCustomization}
      />
    </div>
  );
}

// Sub-components

type SalesCardProps = {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  period: string;
  icon: React.ReactNode;
};

function SalesCard({ title, value, change, isPositive, period, icon }: SalesCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-1 text-xs mt-1">
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3 text-green-500" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? "+" : "-"}{Math.abs(change)}%
          </span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardContent>
    </Card>
  );
}

type TopProductProps = {
  name: string;
  revenue: string;
  growth: number;
};

function TopProduct({ name, revenue, growth }: TopProductProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <p className="font-medium">{name}</p>
        <div className="text-sm text-muted-foreground flex items-center space-x-1">
          <ArrowUpRight className="h-3 w-3 text-green-500" />
          <span className="text-green-500">+{growth}%</span>
        </div>
      </div>
      <div className="font-medium">{revenue}</div>
    </div>
  );
}

type LeadCardProps = {
  name: string;
  company: string;
  location: string;
  phone: string;
  email: string;
  source: string;
};

function LeadCard({ name, company, location, phone, email, source }: LeadCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">{name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{company}</span>
            <span>{location}</span>
          </div>
          <div className="text-muted-foreground mt-1">{phone}</div>
          <div className="text-muted-foreground text-xs mt-1">{email}</div>
          <div className="text-xs mt-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full inline-block">
            {source}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}