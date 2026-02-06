import { useState } from "react";
import Header from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, RefreshCw, Filter, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.string().transform((val) => parseInt(val, 10)).refine((val) => val !== 0, "Quantity cannot be zero"),
  type: z.enum(["add", "remove"]),
  reason: z.string().min(1, "Reason is required"),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/categories'],
  });

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: "",
      quantity: "1",
      type: "add",
      reason: "",
    },
  });

  const { mutate: adjustStock, isPending } = useMutation({
    mutationFn: async (data: StockAdjustmentFormValues) => {
      return apiRequest("POST", "/api/inventory/adjust-stock", data);
    },
    onSuccess: () => {
      toast({
        title: "Stock updated",
        description: "The inventory has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAdjustDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openAdjustDialog = (product: any, type: "add" | "remove") => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    form.setValue("productId", product.id.toString());
    form.setValue("type", type);
    setIsAdjustDialogOpen(true);
  };

  const onSubmit = (data: StockAdjustmentFormValues) => {
    adjustStock(data);
  };

  const getStockStatusClass = (stock: number, minStock: number) => {
    if (stock === 0) return "bg-red-100 text-red-800";
    if (stock < minStock) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStockStatusText = (stock: number, minStock: number) => {
    if (stock === 0) return "Out of Stock";
    if (stock < minStock) return "Low Stock";
    return "In Stock";
  };

  const getCategoryName = (categoryId: number) => {
    if (!categories) return "";
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "";
  };

  const filteredProducts = products?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categoryId.toString() === categoryFilter;
    const matchesStock = stockFilter === 'all' || 
                         (stockFilter === 'out' && product.stock === 0) ||
                         (stockFilter === 'low' && product.stock > 0 && product.stock < product.minStock) ||
                         (stockFilter === 'in' && product.stock >= product.minStock);
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <>
      <Header title="Stock Management" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Tabs defaultValue="list">
        <TabsList className="mb-6">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="reorder">Reorder List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle>Inventory Stock Levels</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="py-8 text-center">Loading stock data...</div>
              ) : filteredProducts && filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left">Product</th>
                        <th className="py-3 px-4 text-left">SKU</th>
                        <th className="py-3 px-4 text-left">Category</th>
                        <th className="py-3 px-4 text-left">Current Stock</th>
                        <th className="py-3 px-4 text-left">Min. Stock</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Stock Level</th>
                        <th className="py-3 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product: any) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{product.name}</td>
                          <td className="py-3 px-4 text-gray-500">{product.sku}</td>
                          <td className="py-3 px-4 text-gray-500">{getCategoryName(product.categoryId)}</td>
                          <td className="py-3 px-4 text-center font-medium">{product.stock}</td>
                          <td className="py-3 px-4 text-center text-gray-500">{product.minStock}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStockStatusClass(product.stock, product.minStock)}>
                              {getStockStatusText(product.stock, product.minStock)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-full h-2">
                              <Progress 
                                value={(product.stock / product.minStock) * 100} 
                                className={
                                  product.stock === 0 
                                    ? "bg-red-200" 
                                    : product.stock < product.minStock
                                      ? "bg-yellow-200"
                                      : "bg-green-200"
                                }
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => openAdjustDialog(product, "add")}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0" 
                                disabled={product.stock === 0}
                                onClick={() => openAdjustDialog(product, "remove")}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                    ? "No products found matching your criteria." 
                    : "No products found. Add products to manage inventory."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reorder">
          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reorder List</CardTitle>
              <Button>
                Generate Purchase Order
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="py-8 text-center">Loading reorder data...</div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-gray-500">Products that need to be reordered based on current stock levels.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-4 text-left">Product</th>
                          <th className="py-3 px-4 text-left">SKU</th>
                          <th className="py-3 px-4 text-left">Current Stock</th>
                          <th className="py-3 px-4 text-left">Min. Stock</th>
                          <th className="py-3 px-4 text-left">Reorder Quantity</th>
                          <th className="py-3 px-4 text-left">Status</th>
                          <th className="py-3 px-4 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products?.filter((p: any) => p.stock < p.minStock).map((product: any) => (
                          <tr key={product.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{product.name}</td>
                            <td className="py-3 px-4 text-gray-500">{product.sku}</td>
                            <td className="py-3 px-4 text-center">{product.stock}</td>
                            <td className="py-3 px-4 text-center">{product.minStock}</td>
                            <td className="py-3 px-4 text-center font-medium">
                              {product.minStock - product.stock}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                product.stock === 0 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }>
                                {product.stock === 0 ? "Out of Stock" : "Low Stock"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openAdjustDialog(product, "add")}
                              >
                                Restock
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {products?.filter((p: any) => p.stock < p.minStock).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500">
                              All products are at adequate stock levels. No items to reorder.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "Add Stock" : "Remove Stock"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Current stock: {selectedProduct?.stock}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adjustmentType === "add" ? (
                          <>
                            <SelectItem value="purchase">New Purchase</SelectItem>
                            <SelectItem value="return">Customer Return</SelectItem>
                            <SelectItem value="correction">Inventory Correction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="sale">Sale</SelectItem>
                            <SelectItem value="damage">Damaged/Defective</SelectItem>
                            <SelectItem value="loss">Lost/Stolen</SelectItem>
                            <SelectItem value="correction">Inventory Correction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjustDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
