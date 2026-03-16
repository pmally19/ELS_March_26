import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Package, Warehouse } from "lucide-react";

interface WarehouseStock {
  id: number;
  product_id: number;
  storage_location_id: number;
  stock_quantity: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  is_active: boolean;
  warehouse_name: string;
  warehouse_code: string;
  plant_name: string;
  plant_code: string;
}

interface WarehouseStockLevelsProps {
  productId: number;
  productName: string;
}

export default function WarehouseStockLevels({ productId, productName }: WarehouseStockLevelsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<WarehouseStock | null>(null);
  const [editFormData, setEditFormData] = useState({
    stock_quantity: 0,
    min_stock: 0,
    max_stock: 0,
    reorder_point: 0,
  });

  const { data: warehouseStocks, isLoading, isError } = useQuery<WarehouseStock[]>({
    queryKey: [`/api/inventory/products/${productId}/warehouse-stock`],
    queryFn: async () => {
      const data = await apiGet(`/api/inventory/products/${productId}/warehouse-stock`);
      return data;
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async (data: typeof editFormData) => {
      if (!editingStock) throw new Error('No stock item selected for editing');
      return apiPut(
        `/api/inventory/products/${productId}/warehouse-stock/${editingStock.storage_location_id}`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Stock Updated",
        description: "Warehouse stock levels have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/inventory/products/${productId}/warehouse-stock`] });
      setIsEditDialogOpen(false);
      setEditingStock(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update stock levels. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditStock = (stock: WarehouseStock) => {
    setEditingStock(stock);
    setEditFormData({
      stock_quantity: stock.stock_quantity,
      min_stock: stock.min_stock,
      max_stock: stock.max_stock,
      reorder_point: stock.reorder_point,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveStock = () => {
    updateStockMutation.mutate(editFormData);
  };

  const getStockStatus = (stock: WarehouseStock) => {
    if (stock.stock_quantity <= stock.min_stock) {
      return { label: "Low Stock", variant: "destructive" as const };
    } else if (stock.stock_quantity >= stock.max_stock) {
      return { label: "Overstocked", variant: "outline" as const };
    } else {
      return { label: "Normal", variant: "outline" as const };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Warehouse Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading warehouse stock levels...</div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Warehouse Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Error loading warehouse stock levels. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Warehouse Stock Levels - {productName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehouseStocks && warehouseStocks.length > 0 ? (
            <div className="space-y-4">
              {warehouseStocks.map((stock) => {
                const status = getStockStatus(stock);
                return (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Warehouse className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold">{stock.warehouse_name}</h3>
                        <p className="text-sm text-gray-600">
                          {stock.warehouse_code} - {stock.plant_name || 'No Plant'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Current Stock</p>
                        <p className="text-2xl font-bold">{stock.stock_quantity}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Min/Max</p>
                        <p className="text-sm">{stock.min_stock} / {stock.max_stock}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Reorder Point</p>
                        <p className="text-sm">{stock.reorder_point}</p>
                      </div>
                      
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStock(stock)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No warehouse stock levels found for this product.</p>
              <p className="text-sm text-gray-500 mt-2">
                This product may not be assigned to any warehouses yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Stock Levels</DialogTitle>
          </DialogHeader>
          
          {editingStock && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold">{editingStock.warehouse_name}</h3>
                <p className="text-sm text-gray-600">
                  {editingStock.warehouse_code} - {editingStock.plant_name || 'No Plant'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Current Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={editFormData.stock_quantity}
                    onChange={(e) => setEditFormData(prev => ({
                      ...prev,
                      stock_quantity: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Minimum Stock</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min="0"
                    value={editFormData.min_stock}
                    onChange={(e) => setEditFormData(prev => ({
                      ...prev,
                      min_stock: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_stock">Maximum Stock</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    min="0"
                    value={editFormData.max_stock}
                    onChange={(e) => setEditFormData(prev => ({
                      ...prev,
                      max_stock: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reorder_point">Reorder Point</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    min="0"
                    value={editFormData.reorder_point}
                    onChange={(e) => setEditFormData(prev => ({
                      ...prev,
                      reorder_point: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveStock}
              disabled={updateStockMutation.isPending}
            >
              {updateStockMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
