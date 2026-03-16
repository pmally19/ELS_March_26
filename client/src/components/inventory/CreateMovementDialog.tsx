import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/* ========= TYPES ========= */
interface Material {
  id: number;
  code: string;
  description: string;
  base_uom: string;
  base_unit_price?: number;
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
  plant_id?: number;
}

interface CreateMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ========= MOVEMENT TYPES ========= */
const MOVEMENT_TYPES = [
  "Goods Receipt",
  "Goods Issue",
  "Production Receipt",
  "Production Issue",
  "Return",
  "Scrap",
];

/* ========= COMPONENT ========= */
export default function CreateMovementDialog({
  isOpen,
  onClose,
}: CreateMovementDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* ========= DATA FETCHING ========= */
  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/master-data/materials"],
    enabled: isOpen,
  });

  const { data: plants } = useQuery<Plant[]>({
    queryKey: ["/api/master-data/plants"],
    enabled: isOpen,
  });

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ["/api/inventory/warehouses"],
    enabled: isOpen,
  });

  /* ========= STATE ========= */
  const [formData, setFormData] = useState({
    material_id: "",
    quantity: "1",
    movement_type: "Goods Receipt",
    plant_id: "",
    storage_location_id: "",
    unit_of_measure: "",
    base_unit_price: "",
    posting_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
    user_id: "1",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ========= HANDLERS ========= */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-fill base unit price and UOM when material is selected
  const handleMaterialChange = (materialId: string) => {
    setFormData((prev) => ({ ...prev, material_id: materialId }));

    if (materialId) {
      const selectedMaterial = uniqueMaterials.find(
        (m) => m.id.toString() === materialId
      );

      if (selectedMaterial) {
        setFormData((prev) => ({
          ...prev,
          material_id: materialId,
          unit_of_measure: selectedMaterial.base_uom || "EA",
          base_unit_price: selectedMaterial.base_unit_price
            ? selectedMaterial.base_unit_price.toString()
            : "0.00",
        }));
      }
    } else {
      // Reset fields if no material selected
      setFormData((prev) => ({
        ...prev,
        unit_of_measure: "",
        base_unit_price: "",
      }));
    }
  };

  /* ========= UNIQUE LISTS ========= */
  const uniqueMaterials = useMemo(
    () =>
      materials
        ? Array.from(new Map(materials.map((m) => [m.id, m])).values())
        : [],
    [materials]
  );

  const uniquePlants = useMemo(
    () =>
      plants
        ? Array.from(new Map(plants.map((p) => [p.id, p])).values())
        : [],
    [plants]
  );

  const uniqueStorageLocations = useMemo(
    () =>
      storageLocations
        ? Array.from(new Map(storageLocations.map((l) => [l.id, l])).values())
        : [],
    [storageLocations]
  );

  // Filter storage locations by selected plant if applicable
  const filteredStorageLocations = useMemo(() => {
    if (!formData.plant_id) return uniqueStorageLocations;
    return uniqueStorageLocations.filter(
      (loc) => !loc.plant_id || loc.plant_id.toString() === formData.plant_id
    );
  }, [uniqueStorageLocations, formData.plant_id]);

  /* ========= EFFECTS ========= */
  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setFormData({
        material_id: "",
        quantity: "1",
        movement_type: "Goods Receipt",
        plant_id: "",
        storage_location_id: "",
        unit_of_measure: "",
        base_unit_price: "",
        posting_date: new Date().toISOString().split("T")[0],
        reference: "",
        notes: "",
        user_id: "1",
      });
    }
  }, [isOpen]);

  /* ========= SUBMIT ========= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.material_id) {
      toast({
        title: "Error",
        description: "Please select a material",
        variant: "destructive",
      });
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedLocation = storageLocations?.find(
        (l) => l.id.toString() === formData.storage_location_id
      );

      await apiRequest("/api/inventory/movements", "POST", {
        material_id: Number(formData.material_id),
        quantity: Number(formData.quantity),
        movement_type: formData.movement_type,
        plant_id: formData.plant_id ? Number(formData.plant_id) : null,
        storage_location: selectedLocation?.code || null,
        unit_of_measure: formData.unit_of_measure,
        posting_date: formData.posting_date,
        reference: formData.reference,
        notes: formData.notes,
        user_id: Number(formData.user_id),
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/inventory/movements"],
      });

      toast({
        title: "Success",
        description: "Stock movement recorded successfully",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record stock movement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ========= UI ========= */
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Material Selection Section */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Material Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>
                  Material <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.material_id}
                  onValueChange={handleMaterialChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.code} - {m.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit of Measure</Label>
                <Input
                  type="text"
                  value={formData.unit_of_measure}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-filled"
                />
              </div>

              <div>
                <Label>Base Unit Price</Label>
                <Input
                  type="text"
                  value={formData.base_unit_price}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-filled"
                />
              </div>
            </div>
          </div>

          {/* Movement Details Section */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Movement Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  Movement Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(v) => handleSelectChange("movement_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label>Posting Date</Label>
                <Input
                  type="date"
                  name="posting_date"
                  value={formData.posting_date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>Reference Document</Label>
                <Input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="PO/SO Number"
                />
              </div>
            </div>
          </div>

          {/* Location Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Location Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Plant</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(v) => handleSelectChange("plant_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePlants.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Storage Location</Label>
                <Select
                  value={formData.storage_location_id}
                  onValueChange={(v) =>
                    handleSelectChange("storage_location_id", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage location" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStorageLocations.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>
                        {l.code} - {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or comments"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
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