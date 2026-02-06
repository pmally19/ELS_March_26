import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, RefreshCw, Eye, TrendingUp, TrendingDown, Package, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiGet } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface StockLevel {
  id: number;
  name: string | null;
  sku: string | null;
  current_stock: number;
  available_stock: number;
  reserved_stock: number;
  ordered_stock?: number;
  min_stock: number;
  max_stock: number;
  type: string | null;
  category_name: string | null;
  storage_location_name: string | null;
  plant_name: string | null;
  plant_code?: string | null;
  storage_location_code?: string | null;
  unit?: string | null;
  moving_average_price?: number | null;
  total_value?: number | null;
  stock_last_updated?: string | null;
}

interface StockLocation {
  material_code: string;
  plant_code: string;
  storage_location: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  unit: string;
  moving_average_price: number;
  total_value: number;
  plant_name: string;
  material_name: string;
}

export default function StockLevelsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<StockLevel | null>(null);
  const [locationDetails, setLocationDetails] = useState<StockLocation[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [filterPlant, setFilterPlant] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stockLevels, isLoading, isError, refetch } = useQuery<StockLevel[]>({
    queryKey: ['/api/inventory/stock-levels'],
    queryFn: async (): Promise<StockLevel[]> => {
      const data = await apiGet('/api/inventory/stock-levels');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: plants } = useQuery<any[]>({
    queryKey: ['/api/plants'],
    queryFn: async (): Promise<any[]> => {
      try {
        const data = await apiGet('/api/plants');
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const handleViewLocations = async (product: StockLevel) => {
    setSelectedProduct(product);
    setIsLocationDialogOpen(true);
    try {
      const materialCode = product.sku || '';
      const data: any = await apiGet(`/api/inventory/balances/overview/${materialCode}`);
      setLocationDetails(Array.isArray(data?.locations) ? data.locations : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load location details",
        variant: "destructive",
      });
      setLocationDetails([]);
    }
  };

  const filteredStockLevels = stockLevels?.filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storage_location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.plant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlant = filterPlant === "all" || item.plant_code === filterPlant;
    
    let matchesStatus = true;
    if (filterStatus === "low") {
      matchesStatus = (item.available_stock ?? item.current_stock) < item.min_stock;
    } else if (filterStatus === "out") {
      matchesStatus = (item.available_stock ?? item.current_stock) <= 0;
    } else if (filterStatus === "overstock") {
      matchesStatus = item.current_stock > item.max_stock;
    }
    
    return matchesSearch && matchesPlant && matchesStatus;
  });

  // Calculate statistics
  const totalValue = Number(stockLevels?.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0) || 0);
  const lowStockCount = stockLevels?.filter(item => (Number(item.available_stock ?? item.current_stock) || 0) < (Number(item.min_stock) || 0)).length || 0;
  const outOfStockCount = stockLevels?.filter(item => (Number(item.available_stock ?? item.current_stock) || 0) <= 0).length || 0;
  const totalItems = stockLevels?.length || 0;
  const totalStock = Number(stockLevels?.reduce((sum, item) => sum + (Number(item.current_stock) || 0), 0) || 0);
  const totalReserved = Number(stockLevels?.reduce((sum, item) => sum + (Number(item.reserved_stock) || 0), 0) || 0);
  const totalOrdered = Number(stockLevels?.reduce((sum, item) => sum + (Number(item.ordered_stock) || 0), 0) || 0);
  const totalAvailable = Number(stockLevels?.reduce((sum, item) => sum + (Number(item.available_stock ?? item.current_stock) || 0), 0) || 0);

  // Prepare data for chart
  const chartData = filteredStockLevels?.map(item => ({
    name: item.name && item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name || 'Unknown',
    currentStock: Number(item.current_stock) || 0,
    availableStock: Number(item.available_stock ?? item.current_stock) || 0,
    reservedStock: Number(item.reserved_stock) || 0,
    orderedStock: Number(item.ordered_stock) || 0,
    minStock: Number(item.min_stock) || 0,
    maxStock: Number(item.max_stock) || 0
  })).slice(0, 10);

  // Status distribution for pie chart
  const statusData = [
    { name: 'In Stock', value: stockLevels?.filter(item => (item.available_stock ?? item.current_stock) >= item.min_stock && item.current_stock > 0).length || 0, color: '#10b981' },
    { name: 'Low Stock', value: stockLevels?.filter(item => (item.available_stock ?? item.current_stock) < item.min_stock && (item.available_stock ?? item.current_stock) > 0).length || 0, color: '#f59e0b' },
    { name: 'Out of Stock', value: stockLevels?.filter(item => (item.available_stock ?? item.current_stock) <= 0).length || 0, color: '#ef4444' },
    { name: 'Overstock', value: stockLevels?.filter(item => item.current_stock > item.max_stock).length || 0, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Active products in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Current inventory valuation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Below minimum stock level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Items with zero availability</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All units in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalAvailable.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Available for use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserved Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalReserved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Reserved for orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ordered Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalOrdered.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">On order from vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Level Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="currentStock" name="Total Stock" fill="#3b82f6" />
                    <Bar dataKey="availableStock" name="Available" fill="#10b981" />
                    <Bar dataKey="reservedStock" name="Reserved" fill="#f59e0b" />
                    <Bar dataKey="orderedStock" name="Ordered" fill="#06b6d4" />
                    <Bar dataKey="minStock" name="Min Stock" fill="#ef4444" />
                    <Bar dataKey="maxStock" name="Max Stock" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  {isLoading ? "Loading chart data..." : "No data available for chart"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusData && statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  {isLoading ? "Loading chart data..." : "No data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Levels Table */}
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Stock Levels</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search stock items..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterPlant}
                onChange={(e) => setFilterPlant(e.target.value)}
              >
                <option value="all">All Plants</option>
                {Array.isArray(plants) && plants.map((plant: any) => (
                  <option key={plant.code} value={plant.code}>
                    {plant.name || plant.code}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
                <option value="overstock">Overstock</option>
              </select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('Export stock levels clicked');
                  // Add export functionality
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading stock levels...</div>
          ) : isError ? (
            <div className="text-center py-4 text-red-500">Error loading stock data. Please try again.</div>
          ) : filteredStockLevels && filteredStockLevels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Max Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStockLevels.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.type?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.category_name || 'Uncategorized'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.storage_location_name || 'No Location'}</div>
                        {item.plant_name && (
                          <div className="text-xs text-gray-500">{item.plant_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.current_stock ?? 0).toFixed(2)} {item.unit || 'EA'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {Number(item.available_stock ?? item.current_stock ?? 0).toFixed(2)} {item.unit || 'EA'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {Number(item.reserved_stock ?? 0).toFixed(2)} {item.unit || 'EA'}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {Number(item.ordered_stock ?? 0).toFixed(2)} {item.unit || 'EA'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.moving_average_price != null && Number(item.moving_average_price) !== 0
                        ? `$${Number(item.moving_average_price).toFixed(2)}`
                        : '$0.00'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_value != null && Number(item.total_value) !== 0
                        ? `$${Number(item.total_value).toFixed(2)}`
                        : '$0.00'}
                    </TableCell>
                    <TableCell className="text-right">{item.min_stock}</TableCell>
                    <TableCell className="text-right">{item.max_stock}</TableCell>
                    <TableCell>
                      {(item.available_stock ?? item.current_stock) <= 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : (item.available_stock ?? item.current_stock) < item.min_stock ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : item.current_stock > item.max_stock ? (
                        <Badge variant="outline" className="bg-amber-500 text-white">Overstock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500 text-white">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLocations(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4">
              {searchTerm ? 'No items match your search.' : 'No stock data available.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Details Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Locations - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              SKU: {selectedProduct?.sku} | Total Stock: {Number(selectedProduct?.current_stock ?? 0).toFixed(2)} {selectedProduct?.unit || 'EA'}
            </DialogDescription>
          </DialogHeader>
          {locationDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant</TableHead>
                  <TableHead>Storage Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationDetails.map((loc, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{loc.plant_name || loc.plant_code}</TableCell>
                    <TableCell>{loc.storage_location}</TableCell>
                    <TableCell className="text-right">{parseFloat(String(loc.quantity || 0)).toFixed(2)} {loc.unit}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {parseFloat(String(loc.available_quantity || 0)).toFixed(2)} {loc.unit}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {parseFloat(String(loc.reserved_quantity || 0)).toFixed(2)} {loc.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      ${parseFloat(String(loc.moving_average_price || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${parseFloat(String(loc.total_value || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No location details available for this product.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}