import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface CreateProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProductDialog({ isOpen, onClose }: CreateProductDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    unit_of_measure_id: "",
    price: "",
    cost: "",
    current_stock: "",
    min_stock: "0",
    max_stock: "100",
    type: "FINISHED_PRODUCT",
    storage_location_code: "",
    plant_id: "",
    plant_code: "",
    // new material fields
    gross_weight: "",
    net_weight: "",
    weight_unit: "KG",
    volume: "",
    volume_unit: "L"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories dynamically
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => apiGet('/api/categories'),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch plants
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ['/api/master-data/plant'],
    queryFn: () => apiGet('/api/master-data/plant'),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch warehouses/storage locations
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['/api/inventory/warehouses'],
    queryFn: () => apiGet('/api/inventory/warehouses'),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch units of measure
  const { data: unitsOfMeasure, isLoading: uomLoading } = useQuery({
    queryKey: ['/api/master-data/uom'],
    queryFn: () => apiGet('/api/master-data/uom'),
    staleTime: 10 * 60 * 1000,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.sku) {
      toast({ title: "Validation Error", description: "Material Code (SKU) is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiPost('/api/inventory/products', formData);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/materials'] });

      toast({
        title: "Material Created",
        description: `${formData.name} has been created successfully.`,
      });

      // Reset form
      setFormData({
        name: "",
        sku: "",
        description: "",
        category_id: "",
        unit_of_measure_id: "",
        price: "",
        cost: "",
        current_stock: "",
        min_stock: "0",
        max_stock: "100",
        type: "FINISHED_PRODUCT",
        storage_location_code: "",
        plant_id: "",
        plant_code: "",
        gross_weight: "",
        net_weight: "",
        weight_unit: "KG",
        volume: "",
        volume_unit: "L"
      });
      onClose();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create material.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Material</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">Material Code (SKU) *</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g. MAT-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Steel Pipe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
              />
            </div>

            {/* Classification */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Material Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINISHED_PRODUCT">Finished Product (FERT)</SelectItem>
                    <SelectItem value="SEMI_FINISHED_PRODUCT">Semi-Finished (HALB)</SelectItem>
                    <SelectItem value="RAW_MATERIAL">Raw Material (ROH)</SelectItem>
                    <SelectItem value="COMPONENT">Component</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange("category_id", value)}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_of_measure_id">Base UOM *</Label>
                <Select
                  value={formData.unit_of_measure_id}
                  onValueChange={(value) => handleSelectChange("unit_of_measure_id", value)}
                  disabled={uomLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure?.map((uom: any) => (
                      <SelectItem key={uom.id} value={uom.id.toString()}>{uom.code} - {uom.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Logistics & Price */}
            <h3 className="font-semibold">Logistics & Valuation</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant_id">Plant *</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(value) => {
                    const selectedPlant = plants?.find((p: any) => p.id.toString() === value);
                    handleSelectChange("plant_id", value);
                    if (selectedPlant) {
                      setFormData(prev => ({ ...prev, plant_code: selectedPlant.code || "" }));
                    }
                  }}
                  disabled={plantsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_location_code">Storage Location *</Label>
                <Select
                  value={formData.storage_location_code}
                  onValueChange={(value) => handleSelectChange("storage_location_code", value)}
                  disabled={warehousesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__subheader__" disabled className="font-bold">Warehouses / Locations</SelectItem>
                    {warehouses?.map((w: any) => (
                      <SelectItem key={w.id} value={w.code}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_stock">Initial Stock</Label>
                <Input
                  id="current_stock"
                  name="current_stock"
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Base Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Standard Cost ($)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator />

            {/* Dimensions & Weight */}
            <h3 className="font-semibold">Dimensions & Weight</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gross_weight">Gross Weight</Label>
                <Input name="gross_weight" type="number" step="0.001" value={formData.gross_weight} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net_weight">Net Weight</Label>
                <Input name="net_weight" type="number" step="0.001" value={formData.net_weight} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_unit">Weight Unit</Label>
                <Select value={formData.weight_unit} onValueChange={(v) => handleSelectChange("weight_unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="LB">LB</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="volume">Volume</Label>
                <Input name="volume" type="number" step="0.001" value={formData.volume} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume_unit">Volume Unit</Label>
                <Select value={formData.volume_unit} onValueChange={(v) => handleSelectChange("volume_unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="M3">M3</SelectItem>
                    <SelectItem value="FT3">FT3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}