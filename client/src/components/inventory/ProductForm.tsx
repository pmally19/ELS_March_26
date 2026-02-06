import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.string().min(1, "Price is required"),
  stock: z.string().min(1, "Stock is required"),
  minStock: z.string().min(1, "Minimum stock is required"),
  maxStock: z.string().min(1, "Maximum stock is required"),
  type: z.string().min(1, "Please select a product type"),
  description: z.string().optional(),
  storageLocationCode: z.string().min(1, "Please select a warehouse"),
  materialMasterId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  productId?: number;
  onSuccess?: () => void;
}

export default function ProductForm({ defaultValues, productId, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use material categories for product classification
  const { data: materialCategories, isLoading: materialCategoriesLoading, error: materialCategoriesError } = useQuery<any[]>({
    queryKey: ['/api/master-data/material-categories'],
    queryFn: () => apiGet('/api/master-data/material-categories'),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['/api/inventory/warehouses'],
  });

  const { data: materials } = useQuery<any[]>({
    queryKey: ['/api/master-data/materials'],
  });

  const { data: productTypes } = useQuery<any[]>({
    queryKey: ['/api/inventory/product-types'],
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      name: "",
      categoryId: "",
      sku: "",
      price: "0",
      stock: "0",
      minStock: "", // No default - must be provided
      maxStock: "", // No default - must be provided
      type: "", // No default - must be selected
      description: "",
      storageLocationCode: "",
      materialMasterId: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Transform the data to match API expectations
      const apiData = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: parseFloat(data.price),
        storage_location_code: data.storageLocationCode,
        category_id: data.categoryId,
        current_stock: parseInt(data.stock, 10),
        min_stock: parseInt(data.minStock, 10),
        max_stock: parseInt(data.maxStock, 10),
        type: data.type,
        material_master_id: data.materialMasterId || null,
      };
      
      if (productId) {
        return apiPut(`/api/inventory/products/${productId}`, apiData);
      } else {
        return apiPost("/api/inventory/products", apiData);
      }
    },
    onSuccess: () => {
      toast({
        title: productId ? "Product updated" : "Product created",
        description: productId
          ? "The product has been updated successfully."
          : "The new product has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ProductFormValues) {
    mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Laptop Pro X12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material Category</FormLabel>
                <Select 
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={materialCategoriesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={materialCategoriesLoading ? "Loading material categories..." : "Select material category"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {materialCategoriesLoading && (
                      <SelectItem value="loading" disabled>
                        Loading material categories...
                      </SelectItem>
                    )}
                    {materialCategoriesError && (
                      <SelectItem value="error" disabled>
                        Error loading material categories
                      </SelectItem>
                    )}
                    {!materialCategoriesLoading && !materialCategoriesError && (!materialCategories || !Array.isArray(materialCategories) || materialCategories.length === 0) && (
                      <SelectItem value="no-data" disabled>
                        No material categories found
                      </SelectItem>
                    )}
                    {Array.isArray(materialCategories) && materialCategories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.code ? `${category.code} - ${category.name}` : category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="LAP-X12-BLK" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="materialMasterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material Master (Optional)</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                // Auto-populate fields when material is selected
                if (value && materials) {
                  const selectedMaterial = materials.find((m: any) => m.id.toString() === value);
                  if (selectedMaterial) {
                    // Use material type directly as product type
                    const productType = selectedMaterial.type || 'FERT';
                    
                    // Update form fields
                    form.setValue('name', selectedMaterial.description || '');
                    form.setValue('sku', selectedMaterial.material_code || '');
                    form.setValue('description', selectedMaterial.description || '');
                    form.setValue('price', selectedMaterial.base_price?.toString() || '0');
                    form.setValue('type', productType);
                  }
                }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material from master data" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(materials) && materials.map((material: any) => (
                    <SelectItem key={material.id} value={material.id.toString()}>
                      {material.material_code} - {material.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storageLocationCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse/Storage Location</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse or storage location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(warehouses) && (() => {
                    // Separate warehouses and storage locations
                    const warehousesList = warehouses.filter((w: any) => w.location_type === 'warehouse');
                    const storageLocationsList = warehouses.filter((w: any) => w.location_type === 'storage_location');
                    
                    return (
                      <>
                        {/* Warehouses Section */}
                        {warehousesList.length > 0 && (
                          <>
                            <SelectItem value="__warehouse_header__" disabled className="font-semibold text-gray-700 bg-gray-50">
                              🏭 Warehouses
                            </SelectItem>
                            {warehousesList.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.code}>
                                {warehouse.name} ({warehouse.code}) - {warehouse.plant_name || 'No Plant'}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        
                        {/* Storage Locations Section */}
                        {storageLocationsList.length > 0 && (
                          <>
                            {warehousesList.length > 0 && (
                              <SelectItem value="__storage_header__" disabled className="font-semibold text-gray-700 bg-gray-50">
                                📦 Storage Locations
                              </SelectItem>
                            )}
                            {storageLocationsList.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.code}>
                                {warehouse.name} ({warehouse.code}) - {warehouse.plant_name || 'No Plant'}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Stock</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Stock</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Stock</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    readOnly 
                    className="bg-gray-50"
                    placeholder="Will be set automatically when material is selected"
                  />
                </FormControl>
                <p className="text-xs text-gray-600">
                  Product type is automatically set based on the selected material
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Product description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : productId ? "Update Product" : "Create Product"}
        </Button>
      </form>
    </Form>
  );
}
