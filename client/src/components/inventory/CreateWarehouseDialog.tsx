import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Plant {
  id: number;
  name: string;
  code: string;
}

interface CreateWarehouseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWarehouseDialog({ isOpen, onClose }: CreateWarehouseDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: plants } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plants'],
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    plant_id: "",
    type: "", // No default - must be selected
    is_mrp_relevant: false, // No default - must be explicitly set
    is_negative_stock_allowed: false,
    is_goods_receipt_relevant: false, // No default - must be explicitly set
    is_goods_issue_relevant: false, // No default - must be explicitly set
    is_interim_storage: false,
    is_transit_storage: false,
    is_restricted_use: false,
    status: "", // No default - must be selected
    is_active: true // Required field - must be explicitly set
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
      code: "",
      name: "",
      description: "",
      plant_id: "",
      type: "", // No default - must be selected
      is_mrp_relevant: false, // No default - must be explicitly set
      is_negative_stock_allowed: false,
      is_goods_receipt_relevant: false, // No default - must be explicitly set
      is_goods_issue_relevant: false, // No default - must be explicitly set
      is_interim_storage: false,
      is_transit_storage: false,
      is_restricted_use: false,
      status: "", // No default - must be selected
      is_active: true // Required field - must be explicitly set
    });
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plant_id) {
      toast({
        title: "Error",
        description: "Please select a plant",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiPost('/api/inventory/warehouses', {
        ...formData,
        plant_id: parseInt(formData.plant_id)
      });
      
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/warehouses'] });
      
      toast({
        title: "Warehouse Created",
        description: `${formData.name} has been added as a new warehouse.`,
      });
      
      resetForm();
      onClose();
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create warehouse. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Warehouse</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Location Code *</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., WH01"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Main Warehouse"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the purpose or location of this storage area"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant_id">Plant *</Label>
                <Select 
                  value={formData.plant_id} 
                  onValueChange={(value) => handleSelectChange("plant_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants && plants.length > 0 ? (
                      plants.map(plant => (
                        <SelectItem key={plant.id} value={plant.id.toString()}>
                          {plant.name} ({plant.code})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no_plants_available__" disabled>
                        No plants available - Please add plants first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Storage Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="finished_goods">Finished Goods</SelectItem>
                    <SelectItem value="work_in_process">Work in Process</SelectItem>
                    <SelectItem value="semi_finished">Semi-Finished</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="spare_parts">Spare Parts</SelectItem>
                    <SelectItem value="scrap">Scrap</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Storage Location Settings</Label>
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_mrp_relevant"
                    checked={formData.is_mrp_relevant}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_mrp_relevant: checked }))
                    }
                  />
                  <Label htmlFor="is_mrp_relevant" className="text-sm">MRP Relevant</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_goods_receipt_relevant"
                    checked={formData.is_goods_receipt_relevant}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_goods_receipt_relevant: checked }))
                    }
                  />
                  <Label htmlFor="is_goods_receipt_relevant" className="text-sm">Goods Receipt Relevant</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_goods_issue_relevant"
                    checked={formData.is_goods_issue_relevant}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_goods_issue_relevant: checked }))
                    }
                  />
                  <Label htmlFor="is_goods_issue_relevant" className="text-sm">Goods Issue Relevant</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_negative_stock_allowed"
                    checked={formData.is_negative_stock_allowed}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_negative_stock_allowed: checked }))
                    }
                  />
                  <Label htmlFor="is_negative_stock_allowed" className="text-sm">Allow Negative Stock</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_interim_storage"
                    checked={formData.is_interim_storage}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_interim_storage: checked }))
                    }
                  />
                  <Label htmlFor="is_interim_storage" className="text-sm">Interim Storage</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_transit_storage"
                    checked={formData.is_transit_storage}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_transit_storage: checked }))
                    }
                  />
                  <Label htmlFor="is_transit_storage" className="text-sm">Transit Storage</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_restricted_use"
                    checked={formData.is_restricted_use}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_restricted_use: checked }))
                    }
                  />
                  <Label htmlFor="is_restricted_use" className="text-sm">Restricted Use</Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}