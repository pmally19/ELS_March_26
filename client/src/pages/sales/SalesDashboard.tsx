import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, Users, ShoppingCart, CreditCard } from "lucide-react";

export default function SalesDashboard() {
  const { data: salesStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/sales/stats'],
  });

  const { data: salesTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['/api/sales/trends'],
  });

  return (
    <>
      <Header title="Sales Dashboard" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-4">
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${salesStats?.totalSales.toFixed(2)}`}
                </h3>
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
                <p className="text-sm font-medium text-gray-500">Customers</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : salesStats?.totalCustomers}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Orders</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : salesStats?.totalOrders}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${salesStats?.avgOrderValue.toFixed(2)}`}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingTrends ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading sales data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesTrends?.monthlySales}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Sales"]} />
                    <Legend />
                    <Bar dataKey="value" name="Sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Sales by Product Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingTrends ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading category data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={salesTrends?.categoryTrends}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`]} />
                    <Legend />
                    {salesTrends?.categories.map((category: string, index: number) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stroke={
                          index === 0 ? "#3b82f6" : 
                          index === 1 ? "#10b981" : 
                          index === 2 ? "#f59e0b" : 
                          index === 3 ? "#ef4444" : 
                          "#8b5cf6"
                        }
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
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card className="border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/orders">
              <a className="text-sm font-medium text-primary-600 hover:text-primary-800">View all</a>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">Order ID</th>
                    <th className="py-3 px-4 text-left">Customer</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesStats?.recentOrders?.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">#{order.orderNumber}</td>
                      <td className="py-3 px-4">{order.customer}</td>
                      <td className="py-3 px-4">{new Date(order.date).toLocaleDateString()}</td>
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
                      <td className="py-3 px-4">${order.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
