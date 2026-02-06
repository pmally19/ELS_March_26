import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface GenericWidgetContentProps {
  type: string;
  dataSource: string;
}

export default function GenericWidgetContent({ type, dataSource }: GenericWidgetContentProps) {
  const [timeFrame, setTimeFrame] = useState("day");

  // Fetch data based on widget type and data source
  const { data, isLoading, isError } = useQuery({
    queryKey: [getQueryKeyForWidget(type, dataSource), timeFrame],
    queryFn: async () => {
      const response = await fetch(getEndpointForWidget(type, dataSource));
      if (!response.ok) {
        throw new Error('Failed to fetch widget data');
      }
      return response.json();
    },
    staleTime: 300000, // 5 min
  });

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="h-60 flex items-center justify-center">
        <p className="text-sm text-red-500">Error loading data</p>
      </div>
    );
  }

  // Render content based on widget type
  return (
    <div className="h-60 w-full">
      {renderWidgetContent(type, data)}
    </div>
  );
}

// Helper function to determine query key based on widget type and data source
function getQueryKeyForWidget(type: string, dataSource: string) {
  switch (type) {
    case 'line-chart':
      return dataSource === 'sales' ? '/api/dashboard/sales-chart' : '/api/inventory/stats';
    case 'bar-chart':
      return dataSource === 'sales' ? '/api/dashboard/sales-chart' : '/api/inventory/stats';
    case 'pie-chart':
      return dataSource === 'sales' ? '/api/dashboard/revenue-by-category' : '/api/inventory/stats';
    case 'kpi':
      return dataSource === 'sales' ? '/api/dashboard/sales-metrics' : '/api/inventory/stats';
    case 'table':
      return dataSource === 'products' ? '/api/materials/top-selling' : '/api/activities/recent';
    case 'activity':
      return '/api/activities/recent';
    default:
      return '';
  }
}

// Helper function to determine API endpoint based on widget type and data source
function getEndpointForWidget(type: string, dataSource: string) {
  switch (type) {
    case 'line-chart':
      return dataSource === 'sales' ? '/api/dashboard/sales-chart' : '/api/inventory/stats';
    case 'bar-chart':
      return dataSource === 'sales' ? '/api/dashboard/sales-chart' : '/api/inventory/stats';
    case 'pie-chart':
      return dataSource === 'sales' ? '/api/dashboard/revenue-by-category' : '/api/inventory/stats';
    case 'kpi':
      return dataSource === 'sales' ? '/api/dashboard/sales-metrics' : '/api/inventory/stats';
    case 'table':
      return dataSource === 'products' ? '/api/materials/top-selling' : '/api/activities/recent';
    case 'activity':
      return '/api/activities/recent';
    default:
      return '';
  }
}

// Helper function to render appropriate chart based on widget type
function renderWidgetContent(type: string, data: any) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  switch (type) {
    case 'line-chart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={Array.isArray(data) ? data : []}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
      );

    case 'pie-chart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={Array.isArray(data) ? data : []}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {Array.isArray(data) && data.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `$${value}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
              }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      return (
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <span className="text-sm text-blue-600 mb-1">Revenue</span>
            <span className="text-2xl font-semibold">${data.totalRevenue?.toLocaleString() || '0'}</span>
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <span className="text-sm text-green-600 mb-1">Orders</span>
            <span className="text-2xl font-semibold">{data.totalInvoices?.toLocaleString() || '0'}</span>
          </div>
        </div>
      );

    case 'table':
      if (!Array.isArray(data) || data.length === 0) {
        return <div className="h-full flex items-center justify-center">No data available</div>;
      }
      return (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {Object.keys(data[0]).slice(0, 3).map(key => (
                  <th key={key} className="p-2 text-left">{formatColumnName(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((item, i) => (
                <tr key={i} className="border-t">
                  {Object.entries(item).slice(0, 3).map(([key, value], j) => (
                    <td key={j} className="p-2">{formatCellValue(value, key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return <div className="h-full flex items-center justify-center">Widget type not implemented</div>;
  }
}

// Helper function to format column names
function formatColumnName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// Helper function to format cell values
function formatCellValue(value: any, key: string): string | number {
  if (typeof value === 'number') {
    if (key.includes('price') || key.includes('total') || key.includes('revenue')) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return new Date(value).toLocaleDateString();
    } catch (e) {
      return value;
    }
  }

  return value?.toString() || '';
}