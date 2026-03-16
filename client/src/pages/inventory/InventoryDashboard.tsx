import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Package, ShoppingBag, AlertTriangle, TrendingDown, ArrowRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function InventoryDashboard() {
  const { data: inventoryStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/inventory/dashboard-stats'],
  });

  const { data: inventoryDistribution, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ['/api/inventory/distribution'],
  });
  
  const { data: productMovement, isLoading: isLoadingMovement } = useQuery({
    queryKey: ['/api/inventory/product-movement'],
  });
  
  const { data: lowStockProducts, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['/api/inventory/low-stock'],
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <>
      <Header title="Inventory Dashboard" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-4">
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Products</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : inventoryStats?.totalProducts}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Inventory Value</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : `$${inventoryStats?.inventoryValue.toFixed(2)}`}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : inventoryStats?.lowStockItems}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? "Loading..." : inventoryStats?.outOfStockItems}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 border border-gray-100">
          <CardHeader>
            <CardTitle>Product Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingMovement ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading movement data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productMovement}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} units`]} />
                    <Legend />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Inventory Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingDistribution ? (
                <div className="h-full w-full flex items-center justify-center">
                  <p>Loading distribution data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {inventoryDistribution?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} units`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Items</CardTitle>
            <Link href="/stock">
              <a className="text-sm font-medium text-primary-600 hover:text-primary-800">View all</a>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingLowStock ? (
              <div className="py-4 text-center">Loading low stock items...</div>
            ) : lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product: any) => (
                  <div key={product.id} className="flex items-start">
                    <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                        <Badge className={product.stock === 0 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                          {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Stock Level</span>
                          <span>{product.stock} / {product.minStock}</span>
                        </div>
                        <Progress 
                          value={(product.stock / product.minStock) * 100} 
                          className={product.stock === 0 ? "bg-red-200" : "bg-yellow-200"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">No low stock items found.</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Alerts</CardTitle>
            <Button variant="outline" size="sm">
              Resolve All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="py-4 text-center">Loading alerts...</div>
            ) : (
              <div className="space-y-4">
                {inventoryStats?.alerts.map((alert: any, index: number) => (
                  <div key={index} className="flex items-start">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'critical' ? 'bg-red-100' : 
                      alert.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <AlertCircle className={`h-4 w-4 ${
                        alert.type === 'critical' ? 'text-red-600' : 
                        alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <Badge className={`ml-2 ${
                          alert.type === 'critical' ? 'bg-red-100 text-red-800' : 
                          alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.type === 'critical' ? 'Critical' : 
                           alert.type === 'warning' ? 'Warning' : 'Info'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
                {(!inventoryStats?.alerts || inventoryStats.alerts.length === 0) && (
                  <div className="py-4 text-center text-gray-500">No alerts at this time.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
            <p className="text-sm text-gray-500">Add products to inventory</p>
          </div>
          <Link href="/products/new">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
        
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Manage Stock</h3>
            <p className="text-sm text-gray-500">Update product quantities</p>
          </div>
          <Link href="/stock">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
        
        <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">Restock Inventory</h3>
            <p className="text-sm text-gray-500">Reorder low stock items</p>
          </div>
          <Link href="/stock/reorder">
            <a>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </a>
          </Link>
        </Card>
      </div>
    </>
  );
}
