import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CreateProductDialog from "./CreateProductDialog";
import ProductForm from "./ProductForm";

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  price: string | number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  category_name: string;
  unit_of_measure_id?: number | null;
  category_id?: number | null;
  storage_location_id?: number | null;
  storage_location_name?: string | null;
  storage_location_code?: string | null;
  material_master_id?: number | null;
  type?: string | null;
  plant_id?: number | null;
  plant_code?: string | null;
}

export default function ProductsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock_quantity: ""
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: products, isLoading, isError } = useQuery<Product[]>({
    queryKey: ['/api/inventory/products'],
  });

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || product.category_name?.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStock = stockFilter === "all" ||
      (stockFilter === "low" && product.current_stock <= product.min_stock) ||
      (stockFilter === "out" && product.current_stock === 0) ||
      (stockFilter === "in" && product.current_stock > 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <>
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
              <SelectItem value="components">Components</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/master-data/material-master">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading products...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-500">Error loading products. Please try again.</div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              name={product.name}
              sku={product.sku}
              price={`$${(parseFloat(String(product.price)) || 0).toFixed(2)}`}
              stock={product.current_stock}
              minStock={product.min_stock}
              category={product.category_name || 'Uncategorized'}
              onEdit={() => {
                setEditingProduct(product);
                setIsEditDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          {searchTerm ? 'No products match your search.' : 'No products found. Add your first product!'}
        </div>
      )}

      {/* Legacy Create Dialog - Deprecated in favor of Material Master Redirect
      <CreateProductDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
      />
      */}

      {editingProduct && (
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product - {editingProduct.name}</DialogTitle>
            </DialogHeader>
            <ProductForm
              productId={editingProduct.id}
              defaultValues={{
                name: editingProduct.name,
                sku: editingProduct.sku,
                description: editingProduct.description,
                price: String(editingProduct.price ?? "0"),
                stock: String(editingProduct.current_stock ?? 0),
                minStock: String(editingProduct.min_stock ?? 0),
                maxStock: String(editingProduct.max_stock ?? 0),
                categoryId: editingProduct.category_id
                  ? String(editingProduct.category_id)
                  : "",
                storageLocationCode:
                  editingProduct.storage_location_code || undefined,
                type: editingProduct.type || "FINISHED_PRODUCT",
                materialMasterId: editingProduct.material_master_id
                  ? String(editingProduct.material_master_id)
                  : "",
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type ProductCardProps = {
  name: string;
  sku: string;
  price: string;
  stock: number;
  minStock: number;
  category: string;
  onEdit?: () => void;
};

function ProductCard({ name, sku, price, stock, minStock, category, onEdit }: ProductCardProps) {
  const isLowStock = stock < minStock;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center gap-2">
          <div className="text-base font-medium truncate">{name}</div>
          <div className="flex items-center gap-2">
            {isLowStock && (
              <Badge variant="destructive" className="rounded-sm text-xs">
                Low Stock
              </Badge>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-medium">{sku}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-medium">{price}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Stock:</span>
            <span className={`font-medium ${isLowStock ? 'text-red-500' : ''}`}>
              {stock}/{minStock}
            </span>
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="rounded-sm text-xs">
              {category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}