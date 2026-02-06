import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiClient";
import { Plus, Trash2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Vendor {
  id: number;
  name: string;
  vendor_number: string;
  code?: string;
  purchaseOrganizationId?: number | null;
  companyCodeId?: number | null;
  currency?: string | null;
}



interface PurchaseOrganization {
  id: number;
  code: string;
  name: string;
  companyCodeId?: number | null;
  currency?: string;
  isActive?: boolean;
  active?: boolean;
}

interface AssignedMaterial {
  id: number;
  materialId: number;
  material: {
    id: number;
    code: string;
    name: string;
    baseUom?: string;
    baseUnitPrice?: number | null;
  };
  unitPrice?: number;
  currency?: string;
}

interface OrderItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  uom?: string;
  vendorMaterialAssignmentId?: number; // ID from vendor_materials table
}

interface PODocumentType {
  id: number;
  code: string;
  name: string;
  numberRangeCode?: string;
  numberRangeName?: string;
}

interface BOMComponent {
  id: number;
  position: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  quantity: number;  // per unit
  requiredQuantity: number; // total = quantity * orderQty
  uom: string;
  estimatedPrice: number;
  isAssembly: boolean;
  notes?: string;
}

interface MaterialBOM {
  hasBom: boolean;
  bomId?: number;
  bomCode?: string;
  bomName?: string;
  baseQuantity?: number;
  components: BOMComponent[];
}

interface CreateOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
}

export default function CreateOrderDialog({ isOpen, onClose, orderId }: CreateOrderDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditMode = !!orderId;

  // Fetch vendors from vendor_materials table (only vendors with assigned materials)
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/master-data/vendor-materials/vendors'],
    queryFn: () => apiRequest<Vendor[]>('/api/master-data/vendor-materials/vendors', 'GET'),
    enabled: isOpen, // Only fetch when dialog is open
  });



  // Fetch purchase organizations
  const { data: purchaseOrganizations } = useQuery<PurchaseOrganization[]>({
    queryKey: ['/api/master-data/purchase-organization'],
    queryFn: () => apiRequest<PurchaseOrganization[]>('/api/master-data/purchase-organization', 'GET'),
    enabled: isOpen, // Only fetch when dialog is open
    select: (data) => {
      // Filter to show only active purchase organizations
      return data.filter((org: any) => org.isActive !== false && org.active !== false);
    }
  });

  // Fetch currencies from database
  const { data: currencies } = useQuery<{ id: number; code: string; name: string }[]>({
    queryKey: ['/api/currencies'],
    queryFn: async () => {
      const response = await fetch('/api/currencies');
      if (!response.ok) throw new Error('Failed to fetch currencies');
      const data = await response.json();
      return data.currencies || [];
    },
    enabled: isOpen,
  });

  // Fetch PO document types
  const { data: poDocumentTypes } = useQuery<PODocumentType[]>({
    queryKey: ['/api/master-data/po-document-types'],
    queryFn: () => apiRequest<PODocumentType[]>('/api/master-data/po-document-types', 'GET'),
    enabled: isOpen,
    select: (data) => data.filter((type: any) => type.isActive !== false),
  });

  const [formData, setFormData] = useState<{
    vendor_id: string;
    po_document_type_id: string;
    order_date: string;
    delivery_date: string;
    status: string;
    currency: string;
    notes: string;
    ship_to_address_id?: string | null;
    purchase_organization_id?: string | null;
    plant_id?: string | null;
    company_code_id?: string | null;
  }>({
    vendor_id: "",
    po_document_type_id: "",
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "Draft",
    currency: "",
    notes: "",
    ship_to_address_id: null,
    purchase_organization_id: null,
    plant_id: null,
    company_code_id: null
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [bomComponents, setBomComponents] = useState<Record<number, MaterialBOM>>({});
  const [expandedBoms, setExpandedBoms] = useState<Set<number>>(new Set());

  // Fetch order data when editing
  const { data: orderData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['/api/purchase/orders', orderId],
    queryFn: () => apiRequest(`/api/purchase/orders/${orderId}`, 'GET'),
    enabled: isEditMode && isOpen && !!orderId,
  });

  // Fetch assigned materials when vendor is selected
  // Always fetch fresh data to get latest prices from vendor material assignments
  const { data: assignedMaterials = [] as AssignedMaterial[], isLoading: isLoadingMaterials } = useQuery<AssignedMaterial[]>({
    queryKey: ['/api/master-data/vendor-materials/vendor', formData.vendor_id],
    queryFn: () => apiRequest<AssignedMaterial[]>(`/api/master-data/vendor-materials/vendor/${formData.vendor_id}`, 'GET'),
    enabled: !!formData.vendor_id && isOpen, // Only fetch when vendor is selected and dialog is open
    staleTime: 0, // Always consider data stale to fetch fresh prices
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if form has been initialized to prevent resetting on assignedMaterials changes
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  // Load order data when editing (only once when dialog opens or orderData changes)
  useEffect(() => {
    if (isEditMode && orderData && isOpen && !isFormInitialized) {
      const order = orderData as any;
      console.log('Initializing form data from order:', order);
      setFormData({
        vendor_id: order.vendor_id?.toString() || "",

        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: order.status || "Draft",
        currency: order.currency || "",
        notes: order.notes || "",
        ship_to_address_id: order.ship_to_address_id?.toString() || null,
        purchase_organization_id: order.purchase_organization_id?.toString() || null,
        plant_id: order.plant_id?.toString() || null,
        company_code_id: order.company_code_id?.toString() || null
      });
      setIsFormInitialized(true);

      // Load order items
      if (order.items && order.items.length > 0) {
        const items: OrderItem[] = order.items.map((item: any) => {
          // Try to find the vendor material assignment ID if we have assigned materials
          const assignment = assignedMaterials.find(
            (a) => a.materialId === item.material_id
          );

          return {
            materialId: item.material_id,
            materialCode: item.material_code || '',
            materialName: item.material_name || '',
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unit_price) || 0,
            totalPrice: parseFloat(item.total_price) || 0,
            currency: order.currency || "",
            uom: item.material?.baseUom || "EA",
            vendorMaterialAssignmentId: assignment?.id
          };
        });
        setOrderItems(items);
      } else {
        setOrderItems([]);
      }
    }
  }, [orderData, isEditMode, isOpen, isFormInitialized, assignedMaterials]);

  // Reset form initialization when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsFormInitialized(false);
    }
  }, [isOpen]);

  // Debug: Log vendor_id changes
  useEffect(() => {
    console.log('formData.vendor_id changed:', formData.vendor_id);
  }, [formData.vendor_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    console.log('handleSelectChange called:', { name, value, currentFormData: formData });

    setFormData((prev) => {
      // Create updated object with the new value
      const updated = { ...prev, [name]: value };
      console.log('Form data updated:', { name, value, updated });

      // Reset materials when vendor changes
      if (name === "vendor_id") {
        console.log('Vendor changed, resetting materials and updating related fields');
        setOrderItems([]);
        setSelectedMaterialId("");
        // Auto-populate purchase_organization_id, company_code_id, and currency from vendor
        const selectedVendor = vendors?.find(
          (v) => v.id.toString() === value
        );
        console.log('Selected vendor:', selectedVendor);
        if (selectedVendor) {
          if (selectedVendor.purchaseOrganizationId) {
            updated.purchase_organization_id = selectedVendor.purchaseOrganizationId.toString();
            console.log('Set purchase_organization_id from vendor:', updated.purchase_organization_id);
          } else {
            updated.purchase_organization_id = null;
          }
          // Set company_code_id from vendor (prioritize vendor's company code)
          if (selectedVendor.companyCodeId) {
            updated.company_code_id = selectedVendor.companyCodeId.toString();
            console.log('Set company_code_id from vendor:', updated.company_code_id);
          }
          // Set currency from visitor
          if (selectedVendor.currency) {
            updated.currency = selectedVendor.currency;
            console.log('Set currency from vendor:', updated.currency);
          }
        } else {
          console.warn('Selected vendor not found in vendors list');
          updated.purchase_organization_id = null;
        }
      }
      // Auto-populate company_code_id and currency when purchase organization is selected
      if (name === "purchase_organization_id") {
        if (value) {
          const selectedPO = purchaseOrganizations?.find(
            (po) => po.id.toString() === value
          );
          console.log('Selected purchase organization:', selectedPO);
          if (selectedPO) {
            // Set company_code_id from purchase organization (only if not already set from vendor)
            // Vendor's company code takes priority
            if (!updated.company_code_id && selectedPO.companyCodeId) {
              updated.company_code_id = selectedPO.companyCodeId.toString();
              console.log('Set company_code_id from purchase organization:', updated.company_code_id);
            } else if (updated.company_code_id) {
              console.log('Keeping company_code_id from vendor:', updated.company_code_id);
            }
            // Always set currency from purchase organization when PO is selected
            if (selectedPO.currency) {
              updated.currency = selectedPO.currency;
              console.log('Set currency from purchase organization:', updated.currency);
            }
          } else {
            console.warn('Selected purchase organization not found in list');
          }
        } else {
          // Purchase organization was cleared - don't clear company_code_id if it was set from vendor
          console.log('Purchase organization cleared');
          // Currency can remain as is or reset to default - keeping current value for now
        }
      }

      return updated;
    });
  };

  // Function to fetch BOM components for a material
  const fetchBOMComponents = async (materialId: number, quantity: number) => {
    try {
      const response = await fetch(`/api/master-data/bom/material/${materialId}/components`);
      if (!response.ok) {
        console.error('Failed to fetch BOM components');
        return;
      }

      const data: MaterialBOM = await response.json();

      if (data.hasBom && data.components && data.components.length > 0) {
        // Calculate required quantities based on order quantity
        const componentsWithCalc = data.components.map(comp => ({
          ...comp,
          requiredQuantity: comp.quantity * quantity
        }));

        setBomComponents(prev => ({
          ...prev,
          [materialId]: {
            ...data,
            components: componentsWithCalc
          }
        }));

        // Auto-expand BOM for new materials
        setExpandedBoms(prev => new Set(prev).add(materialId));
      }
    } catch (error) {
      console.error('Error fetching BOM components:', error);
    }
  };

  // Toggle BOM expansion
  const toggleBomExpansion = (materialId: number) => {
    setExpandedBoms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const handleAddMaterial = () => {
    if (!selectedMaterialId) {
      toast({
        title: "Error",
        description: "Please select a material",
        variant: "destructive",
      });
      return;
    }

    const assignment = assignedMaterials.find(
      (a) => a.materialId.toString() === selectedMaterialId
    );

    if (!assignment) {
      toast({
        title: "Error",
        description: "Selected material not found",
        variant: "destructive",
      });
      return;
    }

    // Check if material is already added
    if (orderItems.some((item) => item.materialId === assignment.materialId)) {
      toast({
        title: "Error",
        description: "This material is already added to the order",
        variant: "destructive",
      });
      return;
    }

    // Use material's base price instead of vendor material assignment price
    const unitPrice = assignment.material.baseUnitPrice || 0;
    const currency = formData.currency || "";

    const newItem: OrderItem = {
      materialId: assignment.materialId,
      materialCode: assignment.material.code,
      materialName: assignment.material.name,
      quantity: 1,
      unitPrice: unitPrice,
      totalPrice: unitPrice * 1,
      currency: currency,
      uom: assignment.material.baseUom,
      vendorMaterialAssignmentId: assignment.id, // Store the vendor material assignment ID
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedMaterialId("");

    // Fetch BOM if material might have components
    // We'll check for all materials - backend will return hasBom: false if no BOM exists
    fetchBOMComponents(assignment.materialId, 1);
  };

  const handleRemoveItem = (materialId: number) => {
    setOrderItems(orderItems.filter((item) => item.materialId !== materialId));
    // Also remove BOM data
    setBomComponents(prev => {
      const updated = { ...prev };
      delete updated[materialId];
      return updated;
    });
    setExpandedBoms(prev => {
      const updated = new Set(prev);
      updated.delete(materialId);
      return updated;
    });
  };

  const handleItemQuantityChange = (materialId: number, quantity: number) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.materialId === materialId) {
          const newQuantity = Math.max(0, quantity);

          // Update BOM component quantities if this material has a BOM
          if (bomComponents[materialId]?.hasBom) {
            const updatedComponents = bomComponents[materialId].components.map(comp => ({
              ...comp,
              requiredQuantity: comp.quantity * newQuantity
            }));

            setBomComponents(prev => ({
              ...prev,
              [materialId]: {
                ...prev[materialId],
                components: updatedComponents
              }
            }));
          }

          return {
            ...item,
            quantity: newQuantity,
            totalPrice: item.unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const handleItemPriceChange = (materialId: number, value: string) => {
    const unitPrice = value === '' ? 0 : parseFloat(value);
    const newUnitPrice = isNaN(unitPrice) ? 0 : Math.max(0, unitPrice);

    // Update only the order item price (don't update vendor material assignment)
    // The price in purchase order can be different from vendor material assignment price
    setOrderItems((prevItems) =>
      prevItems.map((item) => {
        if (item.materialId === materialId) {
          return {
            ...item,
            unitPrice: newUnitPrice,
            totalPrice: newUnitPrice * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const calculateTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      po_document_type_id: "",
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "Draft",
      currency: "",
      notes: "",
      ship_to_address_id: null,
      purchase_organization_id: null,
      plant_id: null,
      company_code_id: null
    });
    setOrderItems([]);
    setSelectedMaterialId("");
  };

  useEffect(() => {
    if (!isOpen) {
      if (!isEditMode) {
        resetForm();
      }
    }
  }, [isOpen, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      toast({
        title: "Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    if (!formData.po_document_type_id) {
      toast({
        title: "Error",
        description: "Please select a PO document type",
        variant: "destructive",
      });
      return;
    }



    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one material to the order",
        variant: "destructive",
      });
      return;
    }

    // Validate all items have quantity > 0
    const invalidItems = orderItems.filter((item) => item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "All materials must have a quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotalAmount();
      const url = isEditMode ? `/api/purchase/orders/${orderId}` : '/api/purchase/orders';
      const method = isEditMode ? 'PUT' : 'POST';

      // Ensure vendor_id is properly parsed
      const vendorId = formData.vendor_id ? parseInt(formData.vendor_id) : null;
      if (!vendorId || isNaN(vendorId)) {
        toast({
          title: "Error",
          description: "Invalid vendor selected",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const requestBody = {
        vendor_id: vendorId,
        po_document_type_id: formData.po_document_type_id ? parseInt(formData.po_document_type_id) : null,
        purchase_organization_id: formData.purchase_organization_id ? parseInt(formData.purchase_organization_id) : null,
        plant_id: formData.plant_id ? parseInt(formData.plant_id) : null,
        company_code_id: formData.company_code_id ? parseInt(formData.company_code_id) : null,
        order_date: formData.order_date,
        delivery_date: formData.delivery_date,
        status: formData.status,
        total_amount: totalAmount,
        currency: formData.currency,
        notes: formData.notes,
        ship_to_address_id: formData.ship_to_address_id ? parseInt(formData.ship_to_address_id) : null,
        items: orderItems.map((item, index) => ({
          line_number: index + 1,
          material_id: item.materialId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          delivery_date: formData.delivery_date,
        }))
      };
      console.log('Submitting purchase order with data:', requestBody);
      console.log('Vendor ID being sent:', vendorId, 'Type:', typeof vendorId);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase order`;
        const errorDetail = errorData.detail || errorData.code ? ` (${errorData.code || ''}${errorData.detail ? ': ' + errorData.detail : ''})` : '';
        throw new Error(errorMessage + errorDetail);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/orders'] });
      // Invalidate inventory stock levels to update ordered quantity display
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/stock-levels'] });
      // Refetch inventory stock levels immediately to update the UI
      queryClient.refetchQueries({ queryKey: ['/api/inventory/stock-levels'] });
      // Also invalidate the specific order query if in edit mode
      if (isEditMode && orderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/purchase/orders', orderId] });
      }

      toast({
        title: isEditMode ? "Purchase Order Updated" : "Purchase Order Created",
        description: `Purchase order with ${orderItems.length} item(s) ${isEditMode ? 'updated' : 'created'} successfully.`,
      });

      if (!isEditMode) {
        resetForm();
      }
      onClose();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase order. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoadingOrder) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">Loading order data...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_id">Vendor *</Label>
              <Select
                value={formData.vendor_id ? formData.vendor_id.toString() : ""}
                onValueChange={(value) => {
                  console.log('Vendor selection changed from', formData.vendor_id, 'to', value);
                  handleSelectChange("vendor_id", value);
                }}
                disabled={isLoadingOrder}
                key={`vendor-select-${isFormInitialized ? 'initialized' : 'not-initialized'}`}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingOrder ? "Loading..." : "Select vendor"}>
                    {/* Fallback display if vendors list is loading but we have a selected vendor */}
                    {formData.vendor_id && (!vendors || !vendors.find(v => v.id.toString() === formData.vendor_id)) && (orderData as any)?.vendor_name
                      ? (orderData as any).vendor_name
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vendors && vendors.length > 0 ? (
                    vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.code ? `${vendor.code} - ${vendor.name}` : vendor.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                  )}
                  {/* Ensure current value is always an option if missing from list */}
                  {formData.vendor_id && vendors && !vendors.find(v => v.id.toString() === formData.vendor_id) && (
                    <SelectItem value={formData.vendor_id.toString()}>
                      {(orderData as any)?.vendor_name || `Vendor ${formData.vendor_id}`}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="po_document_type_id">PO Document Type *</Label>
              <Select
                value={formData.po_document_type_id}
                onValueChange={(value) => handleSelectChange("po_document_type_id", value)}
                disabled={isLoadingOrder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO type" />
                </SelectTrigger>
                <SelectContent>
                  {poDocumentTypes && poDocumentTypes.length > 0 ? (
                    poDocumentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.code} - {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Loading PO types...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {formData.po_document_type_id && (() => {
                const selectedType = poDocumentTypes?.find(
                  (t) => t.id.toString() === formData.po_document_type_id
                );
                return selectedType?.numberRangeCode ? (
                  <div className="text-xs text-muted-foreground">
                    Number Range: {selectedType.numberRangeCode}
                    {selectedType.numberRangeName && ` (${selectedType.numberRangeName})`}
                  </div>
                ) : null;
              })()}
            </div>

          </div>

          {/* Purchase Organization and Company Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_organization_id">Purchase Organization</Label>
              <div className="text-sm p-2 border rounded-md bg-muted/50 min-h-[38px] flex items-center">
                {formData.purchase_organization_id ? (
                  (() => {
                    const selectedPO = purchaseOrganizations?.find(
                      (po) => po.id.toString() === formData.purchase_organization_id
                    );

                    if (selectedPO) {
                      return <span>{selectedPO.code ? `${selectedPO.code} - ${selectedPO.name}` : selectedPO.name}</span>;
                    }

                    // Fallback to name from order data if available (though typically not populated)
                    const fallbackName = (orderData as any)?.purchasing_org_name || (orderData as any)?.purchase_organization_id;
                    return (
                      <span>{fallbackName && fallbackName !== formData.purchase_organization_id ? fallbackName : `Purchase Organization ID: ${formData.purchase_organization_id}`}</span>
                    );
                  })()
                ) : (
                  <span className="text-muted-foreground">Will be set from vendor</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_code_id">Company Code</Label>
              <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50 min-h-[38px] flex items-center">
                {formData.company_code_id ? (
                  <span>
                    {(orderData as any)?.company_code
                      ? `Company Code: ${(orderData as any).company_code}`
                      : `Company Code ID: ${formData.company_code_id}`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Will be set from vendor or purchase organization</span>
                )}
              </div>
            </div>
          </div>

          {/* Add Materials Section */}
          {formData.vendor_id && (
            <div className="space-y-2 border rounded-lg p-4">
              <Label>Add Materials</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedMaterialId}
                  onValueChange={setSelectedMaterialId}
                  disabled={isLoadingMaterials}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      isLoadingMaterials
                        ? "Loading materials..."
                        : assignedMaterials.length === 0
                          ? "No materials assigned to this vendor"
                          : "Select material to add"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingMaterials ? (
                      <SelectItem value="loading" disabled>Loading materials...</SelectItem>
                    ) : assignedMaterials.length === 0 ? (
                      <SelectItem value="none" disabled>No materials assigned to this vendor</SelectItem>
                    ) : (
                      assignedMaterials
                        .filter((assignment) =>
                          !orderItems.some((item) => item.materialId === assignment.materialId)
                        )
                        .map((assignment) => (
                          <SelectItem key={assignment.materialId} value={assignment.materialId.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{assignment.material.code} - {assignment.material.name}</span>
                              {assignment.material.baseUnitPrice && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({formData.currency || 'USD'} {typeof assignment.material.baseUnitPrice === 'number'
                                    ? assignment.material.baseUnitPrice.toFixed(2)
                                    : Number(assignment.material.baseUnitPrice || 0).toFixed(2)})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddMaterial}
                  disabled={!selectedMaterialId || isLoadingMaterials}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <Label>Order Items</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <>
                        {/* Main Material Row */}
                        <TableRow key={item.materialId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.materialCode}</div>
                              <div className="text-sm text-gray-500">{item.materialName}</div>
                              {/* BOM Indicator and Toggle */}
                              {bomComponents[item.materialId]?.hasBom && (
                                <button
                                  type="button"
                                  onClick={() => toggleBomExpansion(item.materialId)}
                                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                                >
                                  {expandedBoms.has(item.materialId) ? (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Hide {bomComponents[item.materialId].components.length} BOM components
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="h-3 w-3" />
                                      Show {bomComponents[item.materialId].components.length} BOM components
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemQuantityChange(item.materialId, parseFloat(e.target.value) || 0)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-sm">{item.currency}</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice ?? 0}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  handleItemPriceChange(item.materialId, value);
                                }}
                                className="w-24 text-right"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.currency} {item.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.materialId)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* BOM Components - Expandable Row */}
                        {bomComponents[item.materialId]?.hasBom && expandedBoms.has(item.materialId) && (
                          <TableRow className="bg-blue-50/50 border-l-4 border-l-blue-400">
                            <TableCell colSpan={6} className="py-3 px-6">
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Required Components (to be provided from stock):
                                </div>
                                <div className="grid gap-1 pl-4">
                                  {bomComponents[item.materialId].components.map((comp, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center text-sm py-1 px-2 bg-white/60 rounded border border-blue-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-500 font-mono text-xs w-6">{comp.position}.</span>
                                        <span className="font-medium text-gray-800">{comp.materialCode}</span>
                                        <span className="text-gray-600">{comp.materialName}</span>
                                      </div>
                                      <div className="flex gap-6 items-center">
                                        <span className="text-gray-700 font-medium">
                                          {comp.requiredQuantity} {comp.uom}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          ({comp.quantity} per unit × {item.quantity} units)
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pt-2">
                <div className="text-lg font-semibold">
                  Total: {formData.currency} {calculateTotalAmount().toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_date">Order Date *</Label>
              <Input
                id="order_date"
                name="order_date"
                type="date"
                value={formData.order_date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Requested Delivery *</Label>
              <Input
                id="delivery_date"
                name="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <div className="text-sm p-2 border rounded-md bg-muted/50">
                {formData.currency ? (
                  (() => {
                    const currency = currencies?.find((c) => c.code === formData.currency);
                    return currency ? (
                      <span>{currency.code} - {currency.name}</span>
                    ) : (
                      <span>{formData.currency}</span>
                    );
                  })()
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
            {orderItems.length > 0 && (
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="text-lg font-semibold pt-2">
                  {formData.currency} {calculateTotalAmount().toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                {/* Fallback for any other status */}
                {!['Draft', 'Pending', 'Approved', 'OPEN', 'CLOSED', 'RECEIVED', 'CANCELLED'].includes(formData.status) && formData.status && (
                  <SelectItem value={formData.status}>{formData.status}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any additional information"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <DialogFooter className="mt-6 flex-shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (isEditMode ? "Updating..." : "Creating...")
                : (isEditMode ? "Update Order" : "Create Order")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}