import { useState } from "react";
import Header from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { TrendingUp, BarChart2, PieChart as PieChartIcon, ChevronRight, DollarSign, Users, ShoppingBag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Revenue() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [revenueTimeframe, setRevenueTimeframe] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: salesStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/sales/stats'],
    queryFn: async () => {
      const response = await fetch('/api/sales/stats');
      if (!response.ok) throw new Error('Failed to fetch sales stats');
      return await response.json();
    },
  });
  
  const { data: revenueTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['/api/sales/trends', revenueTimeframe],
    queryFn: async () => {
      const response = await fetch(`/api/sales/trends?timeframe=${revenueTimeframe}`);
      if (!response.ok) throw new Error('Failed to fetch revenue trends');
      return await response.json();
    },
  });
  
  const { data: revenueByCategory, isLoading: isLoadingByCategory } = useQuery({
    queryKey: ['/api/dashboard/revenue-by-category'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/revenue-by-category');
      if (!response.ok) throw new Error('Failed to fetch revenue by category');
      return await response.json();
    },
  });

  // Calculate growth percentage from trends data
  const revenueGrowth = revenueTrends?.growth || 0;
  const customerGrowth = salesStats?.customerGrowth || 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <>
      <Header title="Revenue" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Analysis</h2>
          <p className="text-sm text-muted-foreground">Track and analyze your company's revenue performance.</p>
        </div>
        <DatePickerWithRange className="w-full md:w-auto" value={dateRange} onChange={setDateRange} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${salesStats?.totalSales.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className={`text-sm font-medium flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {isLoadingTrends ? "..." : `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs previous period</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : salesStats?.totalCustomers}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className={`text-sm font-medium flex items-center ${customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {isLoadingStats ? "..." : `${customerGrowth >= 0 ? '+' : ''}${customerGrowth.toFixed(1)}%`}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs previous period</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${salesStats?.avgOrderValue.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-green-600 text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  3.7%
                </span>
                <span className="text-gray-500 text-sm ml-2">vs previous period</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Revenue by Category
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border border-gray-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue Overview</CardTitle>
                <Select value={revenueTimeframe} onValueChange={setRevenueTimeframe}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Monthly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {isLoadingTrends ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <p>Loading revenue data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueTrends?.monthlySales}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                        <Legend />
                        <Bar dataKey="value" name="Revenue" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="category" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {isLoadingByCategory ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <p>Loading category data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {revenueByCategory?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingByCategory ? (
                  <div className="py-4 text-center">Loading category data...</div>
                ) : (
                  <div className="space-y-4">
                    {revenueByCategory?.map((category: any, index: number) => (
                      <div key={index} className="flex items-center">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                            <span className="text-sm font-medium text-gray-900">${category.value.toFixed(2)}</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="rounded-full h-1.5" 
                              style={{ 
                                width: `${(category.value / revenueByCategory[0].value) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            ></div>
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
        
        <TabsContent value="trends" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle>Revenue Trends by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {isLoadingTrends ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <p>Loading trend data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={revenueTrends?.categoryTrends}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`]} />
                        <Legend />
                        {revenueTrends?.categories.map((category: string, index: number) => (
                          <Line
                            key={category}
                            type="monotone"
                            dataKey={category}
                            stroke={COLORS[index % COLORS.length]}
                            activeDot={{ r: 8 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Card className="border border-gray-100 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest Revenue Transactions</CardTitle>
          <Button variant="outline" size="sm">Download Report</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left">Order ID</th>
                  <th className="py-3 px-4 text-left">Customer</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Amount</th>
                  <th className="py-3 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStats ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center">Loading transactions...</td>
                  </tr>
                ) : salesStats?.recentOrders?.slice(0, 10).map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">#{order.orderNumber}</td>
                    <td className="py-3 px-4">{order.customer}</td>
                    <td className="py-3 px-4">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-medium">${order.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}
                        ${order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : ''}
                        ${order.status === 'Canceled' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
