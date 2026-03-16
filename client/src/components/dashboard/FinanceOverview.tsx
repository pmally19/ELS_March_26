import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function FinanceOverview() {
  const [timeframe, setTimeframe] = useState("last30");

  const { data: financeData, isLoading: isLoadingFinance } = useQuery({
    queryKey: ['/api/finance/overview', timeframe],
  });

  return (
    <Card className="border border-gray-100 overflow-hidden mb-6">
      <CardHeader className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-900">Financial Overview</CardTitle>
        <div>
          <Select defaultValue="last30" onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px] text-sm border-gray-300 text-gray-500">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="lastQuarter">Last quarter</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center mb-1">
              <h4 className="text-sm font-medium text-gray-500">Revenue</h4>
              <span className="ml-auto flex items-center text-green-600 text-xs font-medium">
                <ArrowUp className="h-3 w-3 mr-1" />
                {isLoadingFinance ? "..." : `${financeData?.revenue.percentage}%`}
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {isLoadingFinance ? "Loading..." : `$${financeData?.revenue.value.toFixed(2)}`}
            </p>
          </div>
          
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center mb-1">
              <h4 className="text-sm font-medium text-gray-500">Expenses</h4>
              <span className="ml-auto flex items-center text-red-600 text-xs font-medium">
                <ArrowDown className="h-3 w-3 mr-1" />
                {isLoadingFinance ? "..." : `${financeData?.expenses.percentage}%`}
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {isLoadingFinance ? "Loading..." : `$${financeData?.expenses.value.toFixed(2)}`}
            </p>
          </div>
          
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center mb-1">
              <h4 className="text-sm font-medium text-gray-500">Profit</h4>
              <span className="ml-auto flex items-center text-green-600 text-xs font-medium">
                <ArrowUp className="h-3 w-3 mr-1" />
                {isLoadingFinance ? "..." : `${financeData?.profit.percentage}%`}
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {isLoadingFinance ? "Loading..." : `$${financeData?.profit.value.toFixed(2)}`}
            </p>
          </div>
        </div>
        
        <div className="h-64 w-full">
          {isLoadingFinance ? (
            <div className="h-full w-full flex items-center justify-center">
              <p>Loading financial data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={financeData?.chart}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#93c5fd" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#fca5a5" />
                <Area type="monotone" dataKey="profit" stackId="3" stroke="#10b981" fill="#a7f3d0" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
