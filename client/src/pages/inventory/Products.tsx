import { useState } from "react";
import Header from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ProductForm from "@/components/inventory/ProductForm";
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal, Package, ArrowUpDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Use material categories for filtering and display
  const { data: materialCategories, isLoading: isLoadingMaterialCategories } = useQuery({
    queryKey: ['/api/master-data/material-categories'],
    queryFn: () => apiGet('/api/master-data/material-categories'),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/products/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    if (!Array.isArray(materialCategories)) return "";
    const category = materialCategories.find((c: any) => c.id === categoryId);
    if (!category) return "";
    return category.code ? `${category.code} - ${category.name}` : category.name;
  };

  const handleEditClick = (product: any) => {
    setCurrentProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (product: any) => {
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredProducts = (products as any[] | undefined)
    ?.filter((product: any) => {
      const matchesSearch =
        (product.name || product.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku || product.materialCode || product.code || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" ||
        (product.categoryId !== undefined &&
          product.categoryId !== null &&
          product.categoryId.toString() === categoryFilter);
      return matchesSearch && matchesCategory;
    })
    .sort((a: any, b: any) => {
      if (sortField === "price" || sortField === "stock") {
        return sortDirection === "asc"
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      } else {
        return sortDirection === "asc"
          ? a[sortField]?.localeCompare(b[sortField])
          : b[sortField]?.localeCompare(a[sortField]);
      }
    });

  return (
    <>
      <Header title="Products" />

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
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            disabled={isLoadingMaterialCategories}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by material category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Array.isArray(materialCategories) && materialCategories.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.code ? `${category.code} - ${category.name}` : category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="py-8 text-center">Loading products...</div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Product
                        {sortField === 'name' && (
                          <ArrowUpDown className={`ml-1 h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('sku')}
                        className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        SKU
                        {sortField === 'sku' && (
                          <ArrowUpDown className={`ml-1 h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">Category</th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('price')}
                        className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Price
                        {sortField === 'price' && (
                          <ArrowUpDown className={`ml-1 h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('stock')}
                        className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Stock
                        {sortField === 'stock' && (
                          <ArrowUpDown className={`ml-1 h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product: any) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name || product.description || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">{product.description || product.name || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{product.sku || product.materialCode || product.code || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-500">{getCategoryName(product.categoryId)}</td>
                      <td className="py-3 px-4 font-medium">${Number(product.price || product.basePrice || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-500">{product.stock || 0}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStockStatusClass(product.stock || 0, product.minStock || 0)}>
                          {getStockStatusText(product.stock || 0, product.minStock || 0)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(product)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              {searchTerm || categoryFilter !== 'all' ? "No products found matching your criteria." : "No products found. Add your first product!"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <ProductForm onSuccess={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {currentProduct && (
            <ProductForm
              defaultValues={{
                name: currentProduct.name || currentProduct.description || "",
                categoryId: currentProduct.categoryId?.toString() ?? "",
                sku: currentProduct.sku || currentProduct.materialCode || currentProduct.code || "",
                price: (currentProduct.price || currentProduct.basePrice || 0).toString(),
                stock: (currentProduct.stock || 0).toString(),
                minStock: (currentProduct.minStock || 0).toString(),
                maxStock: currentProduct.maxStock?.toString() ?? "",
                description: currentProduct.description || currentProduct.name || "",
                storageLocationCode: currentProduct.storageLocationCode ?? "",
                materialMasterId: currentProduct.materialMasterId
                  ? currentProduct.materialMasterId.toString()
                  : "",
              }}
              productId={currentProduct.id}
              onSuccess={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {currentProduct?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteProduct(currentProduct?.id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
