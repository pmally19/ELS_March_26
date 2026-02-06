import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  sku: string;
}

interface Plant {
  id: number;
  code: string;
  name: string;
}

interface StorageLocation {
  id: number;
  code: string;
  name: string;
}

interface CreateMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMovementDialog({ isOpen, onClose }: CreateMovementDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/inventory/products'],
    enabled: isOpen,
  });

  const { data: plants } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plants'],
    enabled: isOpen,
  });

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ['/api/inventory/warehouses'],
    enabled: isOpen,
  });

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "1",
    movement_type: "Goods Receipt", // Full type, not just IN/OUT
    plant_id: "",
    from_location: "",
    to_location: "",
    unit_of_measure: "PCS",
    posting_date: new Date().toISOString().split('T')[0],
    reference: "",
    notes: "",
    user_id: "1"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      quantity: "1",
      movement_type: "Goods Receipt",
      plant_id: "",
      from_location: "",
      to_location: "",
      unit_of_measure: "PCS",
      posting_date: new Date().toISOString().split('T')[0],
      reference: "",
      notes: "",
      user_id: "1"
    });
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: parseInt(formData.product_id),
          quantity: parseFloat(formData.quantity),
          movement_type: formData.movement_type,
          plant_id: formData.plant_id ? parseInt(formData.plant_id) : null,
          from_location: formData.from_location || null,
          to_location: formData.to_location || null,
          unit_of_measure: formData.unit_of_measure,
          posting_date: formData.posting_date,
          reference: formData.reference,
          notes: formData.notes,
          user_id: parseInt(formData.user_id)
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/products'] });

      toast({
        title: "Movement Recorded",
        description: `Stock movement successfully recorded.`,
      });

      resetForm();
      onClose();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record stock movement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products?.find(p => p.id.toString() === formData.product_id);
  const isTransfer = formData.movement_type === 'Transfer';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_id">Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => handleSelectChange("product_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map(product => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement_type">Movement Type *</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) => handleSelectChange("movement_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Goods Receipt">Goods Receipt (IN)</SelectItem>
                    <SelectItem value="Goods Issue">Goods Issue (OUT)</SelectItem>
                    <SelectItem value="Production Receipt">Production Receipt (IN)</SelectItem>
                    <SelectItem value="Production Issue">Production Issue (OUT)</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                    <SelectItem value="Adjustment">Adjustment</SelectItem>
                    <SelectItem value="Scrap">Scrap</SelectItem>
                    <SelectItem value="Return">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit *</Label>
                <Input
                  id="unit_of_measure"
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleInputChange}
                  placeholder="PCS, KG, L"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="posting_date">Posting Date *</Label>
                <Input
                  id="posting_date"
                  name="posting_date"
                  type="date"
                  value={formData.posting_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plant_id">Plant</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(value) => handleSelectChange("plant_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map(plant => (
                    <SelectItem key={plant.id} value={plant.id.toString()}>
                      {plant.code} - {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_location">From Location{isTransfer ? ' *' : ''}</Label>
                <Select
                  value={formData.from_location}
                  onValueChange={(value) => handleSelectChange("from_location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.code}>
                        {loc.code} - {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to_location">To Location{isTransfer ? ' *' : ''}</Label>
                <Select
                  value={formData.to_location}
                  onValueChange={(value) => handleSelectChange("to_location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.code}>
                        {loc.code} - {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference/Document Number</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="e.g., PO-2025-001, SO-12345"
                value={formData.reference}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional information..."
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}