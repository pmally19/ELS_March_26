import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Define interfaces for chart data
interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueCategoryPoint {
  name: string;
  value: number;
}

const timeframes = ["Day", "Week", "Month", "Year"];

export default function ChartSection() {
  const [activeTimeframe, setActiveTimeframe] = useState("Day");
  const [chartType, setChartType] = useState("pie");

  const { data: salesData, isLoading: isLoadingSales } = useQuery<SalesDataPoint[]>({
    queryKey: ['/api/dashboard/sales-chart', activeTimeframe.toLowerCase()],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-chart?timeframe=${activeTimeframe.toLowerCase()}`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
  });

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery<RevenueCategoryPoint[]>({
    queryKey: ['/api/dashboard/revenue-by-category'],
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Sales Chart */}
      <Card className="lg:col-span-2 border border-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
            <div className="flex flex-wrap items-center gap-1">
              {timeframes.map((timeframe) => (
                <Button
                  key={timeframe}
                  size="sm"
                  variant={activeTimeframe === timeframe ? "secondary" : "ghost"}
                  className={activeTimeframe === timeframe ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-gray-500"}
                  onClick={() => setActiveTimeframe(timeframe)}
                >
                  {timeframe}
                </Button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isLoadingSales ? (
              <div className="h-full w-full flex items-center justify-center">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(salesData && Array.isArray(salesData)) ? salesData : []}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    activeDot={{ r: 6 }}
                    name="Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    name="Orders"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Category */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={chartType === "pie" ? "secondary" : "ghost"}
                onClick={() => setChartType("pie")}
                className="text-xs px-2"
              >
                Pie
              </Button>
              <Button
                size="sm"
                variant={chartType === "bar" ? "secondary" : "ghost"}
                onClick={() => setChartType("bar")}
                className="text-xs px-2"
              >
                Bar
              </Button>
              <Button
                size="sm"
                variant={chartType === "horizontal" ? "secondary" : "ghost"}
                onClick={() => setChartType("horizontal")}
                className="text-xs px-2"
              >
                H-Bar
              </Button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isLoadingRevenue ? (
              <div className="h-full w-full flex items-center justify-center">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "pie" ? (
                  <PieChart>
                    <Pie
                      data={(revenueData && Array.isArray(revenueData)) ? revenueData : []}
                      cx="50%"
                      cy="40%"
                      labelLine={false}
                      label={false}
                      outerRadius={60}
                      innerRadius={20}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={1}
                    >
                      {Array.isArray(revenueData) && revenueData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${value?.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        fontSize: "12px"
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    />
                  </PieChart>
                ) : chartType === "bar" ? (
                  <BarChart
                    data={(revenueData && Array.isArray(revenueData)) ? revenueData : []}
                    margin={{ top: 5, right: 5, left: 5, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      formatter={(value) => `$${value?.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        fontSize: "12px"
                      }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {Array.isArray(revenueData) && revenueData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    layout="horizontal"
                    data={(revenueData && Array.isArray(revenueData)) ? revenueData : []}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => `$${value?.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        fontSize: "12px"
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                      {Array.isArray(revenueData) && revenueData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
