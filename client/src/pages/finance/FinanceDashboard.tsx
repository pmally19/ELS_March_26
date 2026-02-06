import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, CreditCard, TrendingUp, TrendingDown, ArrowRight, Calendar, CircleDollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function FinanceDashboard() {
  const [timeframe, setTimeframe] = useState("monthly");
  
  const { data: financeStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/finance/stats'],
  });

  const { data: financeTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['/api/finance/trends', timeframe],
  });

  const { data: expenseBreakdown, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['/api/finance/expense-breakdown'],
  });

  const { data: upcomingExpenses, isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ['/api/finance/upcoming-expenses'],
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <>
      <Header title="Finance Dashboard" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-4">
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${financeStats?.totalRevenue.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-green-600 text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {isLoadingStats ? "" : `${financeStats?.revenueGrowth}%`}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last period</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${financeStats?.totalExpenses.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className="text-red-600 text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {isLoadingStats ? "" : `${financeStats?.expenseGrowth}%`}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last period</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                <CircleDollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Net Profit</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${financeStats?.netProfit.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <span className={`text-sm font-medium flex items-center ${
                  financeStats?.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {financeStats?.profitGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {isLoadingStats ? "" : `${Math.abs(financeStats?.profitGrowth)}%`}
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last period</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Outstanding Invoices</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${financeStats?.outstandingInvoices.toFixed(2)}`}
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/invoices?status=due">
                <a className="text-primary-600 text-sm font-medium hover:text-primary-800">
                  View invoices
                  <ArrowRight className="h-4 w-4 inline-block ml-1" />
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue vs Expenses</CardTitle>
            <Select value={timeframe} onValueChange={setTimeframe}>
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
                  <p>Loading financial data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={financeTrends?.revenueVsExpenses}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              {isLoadingExpenses ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading expense data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown?.map((entry: any, index: number) => (
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              {isLoadingTrends ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading trend data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financeTrends?.monthlyRevenue}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="value" name="Revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Expenses</CardTitle>
            <Link href="/expenses">
              <a className="text-sm font-medium text-primary-600 hover:text-primary-800">
                View all
              </a>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingUpcoming ? (
              <div className="py-4 text-center">Loading upcoming expenses...</div>
            ) : upcomingExpenses && upcomingExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-left">Due Date</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExpenses.map((expense: any) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{expense.description}</td>
                        <td className="py-3 px-4">{expense.category}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            {new Date(expense.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">${expense.amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            expense.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                            expense.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {expense.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">No upcoming expenses found.</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Record Expense</h3>
            <p className="text-sm text-gray-500">Add new business expenses</p>
          </div>
          <Link href="/expenses/new">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
        
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Manage Invoices</h3>
            <p className="text-sm text-gray-500">Create and track invoices</p>
          </div>
          <Link href="/invoices">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
        
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Financial Reports</h3>
            <p className="text-sm text-gray-500">Generate detailed reports</p>
          </div>
          <Link href="/reports">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
      </div>
    </>
  );
}
