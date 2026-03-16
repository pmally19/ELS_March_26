import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Laptop, Headphones, Watch } from "lucide-react";

// Define proper types for inventory stats
interface CategoryDistribution {
  name: string;
  value: number;
}

interface InventoryStats {
  totalProducts: number;
  inventoryValue: number;
  lowStockItems: number;
  categoryDistribution?: CategoryDistribution[];
}

interface LowStockItem {
  id: number;
  name: string;
  category?: string;
  stock: number;
  minStock: number;
}

export default function InventoryActivity() {
  const { data: inventoryStats, isLoading: isLoadingStats } = useQuery<InventoryStats>({
    queryKey: ['/api/inventory/stats'],
  });

  const { data: lowStockItems, isLoading: isLoadingLowStock } = useQuery<LowStockItem[]>({
    queryKey: ['/api/inventory/low-stock'],
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getItemIcon = (category: string | undefined) => {
    if (!category || typeof category !== 'string') {
      return <Laptop className="h-4 w-4 text-gray-500" />;
    }
    switch (category.toLowerCase()) {
      case 'electronics':
        return <Laptop className="h-4 w-4 text-gray-500" />;
      case 'audio':
        return <Headphones className="h-4 w-4 text-gray-500" />;
      case 'wearables':
        return <Watch className="h-4 w-4 text-gray-500" />;
      default:
        return <Laptop className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="border border-gray-100">
      <CardHeader className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-900">Inventory Status</CardTitle>
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href="/inventory">
            <span className="text-sm font-medium">View all</span>
          </Link>
        </Button>
      </CardHeader>
      
      <CardContent className="px-4 py-3">
        <div className="h-[160px] mb-3">
          {isLoadingStats ? (
            <div className="h-full w-full flex items-center justify-center">
              <p>Loading inventory data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryStats?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={1}
                >
                  {inventoryStats?.categoryDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} units`, name]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Low Stock Items</h4>
          <span className="text-xs text-gray-500">{lowStockItems?.length || 0} items</span>
        </div>
        
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
          {isLoadingLowStock ? (
            <div className="py-3 text-center">
              <p className="text-sm text-gray-500">Loading low stock items...</p>
            </div>
          ) : lowStockItems && lowStockItems.length > 0 ? (
            lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-gray-100 rounded-md flex items-center justify-center">
                    {getItemIcon(item.category)}
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    item.stock <= item.minStock / 2 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {item.stock} units left
                  </p>
                  <p className="text-xs text-gray-500">Min: {item.minStock}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-gray-500 text-sm">
              No low stock items found
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Button variant="outline" className="w-full" size="sm">
            Restock Inventory
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
