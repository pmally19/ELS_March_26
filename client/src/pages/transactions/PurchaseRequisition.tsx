import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Save, Send, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/apiClient';

interface Material {
  id: number;
  code?: string;
  material_code?: string;
  name?: string;
  material_name?: string;
  description?: string;
  unit_of_measure?: string;
  base_unit?: string;
  base_uom?: string;
  price?: number;
  base_price?: number;
  standard_price?: number;
  base_unit_price?: number;
}

interface CostCenter {
  id: number;
  cost_center: string;
  description: string;
}

interface PRItem {
  tempId: string;
  material_id?: number;
  material_code: string;
  material_name: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number;
  estimated_total_price: number;
  required_date: string;
  plant_code?: string; // Add plant at item level
  material_group?: string;
  storage_location?: string;
  purchase_group?: string;
  purchase_org?: string;
  cost_center?: string;
  delivery_date?: string;
  item_category_id?: number | null;
}

interface BOMComponent {
  id: number;
  position: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  quantity: number;  // per unit
  requiredQuantity: number; // total = quantity * prQty
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

export default function PurchaseRequisition() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [requiredDate, setRequiredDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [justification, setJustification] = useState('');
  const [department, setDepartment] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [notes, setNotes] = useState('');

  // ERP Header Fields
  const [companyCodeId, setCompanyCodeId] = useState<number | null>(null);
  const [purchasingOrg, setPurchasingOrg] = useState('');
  const [purchasingGroup, setPurchasingGroup] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState<number | null>(null); // PR Document Type ID
  const [prType, setPrType] = useState('NB'); // NB = Standard PR
  const [currency, setCurrency] = useState('USD'); // Add currency state

  const [items, setItems] = useState<PRItem[]>([]);
  const [bomComponents, setBomComponents] = useState<Record<string, MaterialBOM>>({});
  const [expandedBoms, setExpandedBoms] = useState<Set<string>>(new Set());



  // Fetch plants filtered by company code
  const { data: plants = [] } = useQuery({
    queryKey: ['/api/master-data/plant', companyCodeId],
    queryFn: async () => {
      if (!companyCodeId) return [];
      const url = `/api/master-data/plant?company_code_id=${companyCodeId}`;
      const data = await apiRequest(url, 'GET');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!companyCodeId, // Only fetch when company code is selected
  });

  // Fetch ALL materials for the selected company code
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ['/api/materials', companyCodeId],
    queryFn: async () => {
      if (!companyCodeId) return [];
      const url = `/api/materials?company_code_id=${companyCodeId}`;
      const data = await apiRequest<Material[]>(url, 'GET');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!companyCodeId, // Only fetch when company code is selected
  });

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const data = await apiRequest('/api/master-data/company-codes', 'GET');
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch purchase organizations filtered by selected company code
  const { data: purchaseOrganizations = [] } = useQuery({
    queryKey: ['/api/master-data/purchase-organizations', companyCodeId],
    enabled: !!companyCodeId, // Only fetch when company code is selected
  });

  // Fetch purchasing groups
  const { data: purchasingGroups = [] } = useQuery({
    queryKey: ['/api/master-data/purchasing-groups'],
  });

  // Fetch PR Document Types from API (no hardcoded data)
  const { data: prDocumentTypes = [] } = useQuery({
    queryKey: ['/api/master-data/pr-document-types'],
    queryFn: async () => {
      const data = await apiRequest('/api/master-data/pr-document-types', 'GET');
      return Array.isArray(data) ? data.filter((dt: any) => dt.isActive) : [];
    },
  });

  // Fetch Purchasing Item Categories (NEW)
  const { data: itemCategories = [] } = useQuery({
    queryKey: ['/api/master-data/purchasing-item-categories'],
    queryFn: async () => {
      const data = await apiRequest('/api/master-data/purchasing-item-categories', 'GET');
      return Array.isArray(data) ? data : [];
    }
  });


  // Create PR mutation
  const createPRMutation = useMutation({
    mutationFn: async (data: { status: string }) => {
      const payload = {
        // ERP Header Fields
        document_type_id: documentTypeId, // CRITICAL: Send document type ID for number generation
        company_code_id: companyCodeId,
        purchasing_org: purchasingOrg || null,
        purchasing_group: purchasingGroup || null,
        pr_type: prType,
        currency: currency, // Add currency field
        // Standard Fields
        required_date: requiredDate,
        priority,
        justification,
        department,
        project_code: projectCode || null,
        notes: notes || null,
        status: data.status,
        items: items.map(item => ({
          material_id: item.material_id || null,
          material_code: item.material_code,
          material_name: item.material_name,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure,
          estimated_unit_price: item.estimated_unit_price,
          estimated_total_price: item.estimated_total_price,
          required_date: item.required_date || requiredDate,
          // Additional fields from material master
          material_group: item.material_group || null,
          storage_location: item.storage_location || null,
          purchasing_group: item.purchase_group || null,
          purchasing_org: item.purchase_org || null,
          cost_center: item.cost_center || null,
          item_category_id: item.item_category_id || null,
        })),
      };

      const response = await apiRequest('/api/purchase/requisitions', 'POST', payload);

      // apiRequest already returns parsed JSON
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
      toast({
        title: 'Success',
        description: data.pr_number
          ? `Purchase Requisition ${data.pr_number} ${variables.status === 'DRAFT' ? 'saved as draft' : 'submitted for approval'}`
          : variables.status === 'DRAFT'
            ? 'Purchase requisition saved as draft'
            : 'Purchase requisition submitted for approval',
      });
      setLocation('/purchase?tab=requisitions');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Function to fetch BOM components for a material
  const fetchBOMComponents = async (tempId: string, materialId: number, quantity: number) => {
    try {
      const response = await fetch(`/api/master-data/bom/material/${materialId}/components`);
      if (!response.ok) {
        console.error('Failed to fetch BOM components');
        return;
      }

      const data: MaterialBOM = await response.json();

      if (data.hasBom && data.components && data.components.length > 0) {
        // Calculate required quantities based on PR quantity
        const componentsWithCalc = data.components.map(comp => ({
          ...comp,
          requiredQuantity: comp.quantity * quantity
        }));

        setBomComponents(prev => ({
          ...prev,
          [tempId]: {
            ...data,
            components: componentsWithCalc
          }
        }));

        // Auto-expand BOM for new materials
        setExpandedBoms(prev => new Set(prev).add(tempId));
      }
    } catch (error) {
      console.error('Error fetching BOM components:', error);
    }
  };

  // Toggle BOM expansion
  const toggleBomExpansion = (tempId: string) => {
    setExpandedBoms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tempId)) {
        newSet.delete(tempId);
      } else {
        newSet.add(tempId);
      }
      return newSet;
    });
  };

  const handleAddItem = () => {
    // Determine default item category logic (e.g. find 'Standard' or first available)
    let defaultCatId = null;
    if (itemCategories && itemCategories.length > 0) {
      const std = itemCategories.find((c: any) => c.code === '0' || c.name === 'Standard');
      defaultCatId = std ? std.id : itemCategories[0].id;
    }

    const newItem: PRItem = {
      tempId: Date.now().toString(),
      material_code: '',
      material_name: '',
      description: '',
      quantity: 1,
      unit_of_measure: 'EA',
      estimated_unit_price: 0,
      estimated_total_price: 0,
      required_date: requiredDate,
      material_group: '',
      storage_location: '',
      purchase_group: '',
      purchase_org: '',
      cost_center: '',
      delivery_date: requiredDate || '',
      item_category_id: defaultCatId, // Set default
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId));
    // Clean up BOM data
    setBomComponents(prev => {
      const updated = { ...prev };
      delete updated[tempId];
      return updated;
    });
    setExpandedBoms(prev => {
      const updated = new Set(prev);
      updated.delete(tempId);
      return updated;
    });
  };

  const handleItemChange = (tempId: string, field: keyof PRItem, value: any) => {
    setItems(items.map(item => {
      if (item.tempId === tempId) {
        const updated = { ...item, [field]: value };

        // Auto-calculate total when quantity or price changes
        if (field === 'quantity' || field === 'estimated_unit_price') {
          updated.estimated_total_price = updated.quantity * updated.estimated_unit_price;

          // Update BOM component quantities if this item has a BOM
          if (field === 'quantity' && bomComponents[tempId]?.hasBom) {
            const updatedComponents = bomComponents[tempId].components.map(comp => ({
              ...comp,
              requiredQuantity: comp.quantity * updated.quantity
            }));

            setBomComponents(prev => ({
              ...prev,
              [tempId]: {
                ...prev[tempId],
                components: updatedComponents
              }
            }));
          }
        }

        // Auto-fill material details when material is selected
        if (field === 'material_id' && value) {
          const material = materials.find(m => m.id === parseInt(value));
          if (material) {
            console.log('🔍 Selected material:', material); // Debug log

            // Map API field names to component fields
            updated.material_code = (material as any).code || material.material_code || material.id.toString();
            updated.material_name = (material as any).name || material.description || material.material_name || '';
            updated.description = material.description || (material as any).name || material.material_name || '';
            updated.unit_of_measure = (material as any).base_uom || material.unit_of_measure || material.base_unit || 'EA';

            // Auto-fill price with priority: vendor price > material base price
            // First, check if we have vendor-specific pricing
            const vendorMaterial = selectedVendorId
              ? vendorMaterials.find((vm: any) => vm.materialId === parseInt(value))
              : null;

            let priceToUse = 0;
            let priceSource = '';

            if (vendorMaterial && vendorMaterial.unitPrice) {
              // Use vendor-specific price
              priceToUse = typeof vendorMaterial.unitPrice === 'string'
                ? parseFloat(vendorMaterial.unitPrice)
                : vendorMaterial.unitPrice;
              priceSource = 'vendor';
              console.log('💰 Using vendor-specific price:', priceToUse, 'for vendor ID:', selectedVendorId);
            } else {
              // Fall back to material base price
              const materialPrice = (material as any).base_unit_price ||
                (material as any).base_price ||
                (material as any).standard_price ||
                (material as any).price ||
                0;
              priceToUse = typeof materialPrice === 'string' ? parseFloat(materialPrice) : materialPrice;
              priceSource = 'material';
              console.log('💰 Using material base price:', priceToUse);
            }

            if (priceToUse > 0) {
              updated.estimated_unit_price = priceToUse;
              console.log(`✅ Price auto-filled from ${priceSource}:`, priceToUse);

              // Recalculate total if quantity exists
              if (updated.quantity > 0) {
                updated.estimated_total_price = updated.quantity * updated.estimated_unit_price;
              }
            } else {
              console.warn('⚠️ No valid price found for material:', material);
            }

            // Auto-fill additional material master fields
            updated.material_group = (material as any).material_group || '';
            updated.storage_location = (material as any).production_storage_location || '';
            updated.purchase_group = (material as any).purchasing_group || '';
            updated.purchase_org = (material as any).purchase_organization || '';
            updated.cost_center = (material as any).cost_center || '';

            // Calculate delivery date from planned delivery time
            const plannedDays = (material as any).planned_delivery_time || 0;
            if (plannedDays > 0) {
              const deliveryDate = new Date();
              deliveryDate.setDate(deliveryDate.getDate() + plannedDays);
              updated.delivery_date = deliveryDate.toISOString().split('T')[0];
            }

            console.log('✅ Material fields auto-filled:', {
              material_group: updated.material_group,
              storage_location: updated.storage_location,
              purchase_group: updated.purchase_group,
              purchase_org: updated.purchase_org,
              cost_center: updated.cost_center,
            });

            // Fetch BOM components for this material
            if (updated.material_id && updated.quantity > 0) {
              fetchBOMComponents(tempId, updated.material_id, updated.quantity);
            }
          }
        }

        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.estimated_total_price, 0);
  };

  const handleSaveDraft = () => {
    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }
    createPRMutation.mutate({ status: 'DRAFT' });
  };

  const handleSubmit = () => {
    // Validation
    if (!requiredDate) {
      toast({ title: 'Validation Error', description: 'Required Date is required', variant: 'destructive' });
      return;
    }
    if (!justification || justification.length < 20) {
      toast({ title: 'Validation Error', description: 'Justification must be at least 20 characters', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    // Check if all items have required fields
    const invalidItems = items.filter(item =>
      !item.material_name || item.quantity <= 0 || item.estimated_unit_price < 0
    );
    if (invalidItems.length > 0) {
      toast({ title: 'Validation Error', description: 'All items must have material, quantity > 0, and price >= 0', variant: 'destructive' });
      return;
    }

    createPRMutation.mutate({ status: 'SUBMITTED' });
  };

  const handleBack = () => {
    setLocation('/purchase?tab=requisitions');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Purchase Requisition</h1>
            <p className="text-sm text-muted-foreground">Request materials or services for purchase</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Requisition Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Fill in the information below to create a purchase requisition
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={createPRMutation.isPending}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={createPRMutation.isPending} size="sm">
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ERP Organizational Fields */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">ERP Organizational Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyCode">Company Code *</Label>
                <Select
                  value={companyCodeId?.toString() || ''}
                  onValueChange={(value) => {
                    const id = value ? parseInt(value) : null;
                    setCompanyCodeId(id);
                    // Auto-fill currency from company code
                    if (id) {
                      const selectedCompany = companyCodes.find((cc: any) => cc.id === id);
                      if (selectedCompany && selectedCompany.currency) {
                        setCurrency(selectedCompany.currency);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company code" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyCodes.map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="documentType">PR Document Type *</Label>
                <Select
                  value={documentTypeId?.toString() || ''}
                  onValueChange={(value) => {
                    const id = value ? parseInt(value) : null;
                    setDocumentTypeId(id);
                    // Also update prType code for backward compatibility
                    const selectedType = prDocumentTypes.find((dt: any) => dt.id === id);
                    if (selectedType) {
                      setPrType(selectedType.code);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PR document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {prDocumentTypes.map((docType: any) => (
                      <SelectItem key={docType.id} value={docType.id.toString()}>
                        {docType.code} - {docType.name}
                      </SelectItem>
                    ))}
                    {prDocumentTypes.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No document types found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purchasingOrg">Purchasing Organization *</Label>
                <Select
                  value={purchasingOrg}
                  onValueChange={setPurchasingOrg}
                  disabled={!companyCodeId}
                >
                  <SelectTrigger id="purchasingOrg">
                    <SelectValue placeholder={companyCodeId ? "Select purchasing org" : "Select company code first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrganizations.map((org: any) => (
                      <SelectItem key={org.id} value={org.code}>
                        {org.code} - {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purchasingGroup">Purchasing Group</Label>
                <Select value={purchasingGroup} onValueChange={setPurchasingGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchasing group" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasingGroups.map((group) => (
                      <SelectItem key={group.code} value={group.code}>
                        {group.code} - {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requiredDate">Required Date *</Label>
              <Input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Enter department"
              />
            </div>

            <div>
              <Label htmlFor="projectCode">Project Code (Optional)</Label>
              <Input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Enter project code"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="justification">Justification *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why these materials are needed (minimum 20 characters)..."
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              {justification.length}/20 characters minimum
            </p>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg">Items</Label>
              <Button onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="border rounded-md overflow-x-auto" style={{ maxHeight: '600px' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow className="border-b-2">
                      <TableHead className="w-[80px] font-bold text-gray-900 bg-slate-50 border-r">Itm Cat</TableHead>
                      <TableHead className="w-[180px] font-bold text-gray-900 bg-slate-50 border-r">Material</TableHead>
                      <TableHead className="w-[150px] font-bold text-gray-900 bg-slate-50 border-r">Plant</TableHead>
                      <TableHead className="w-[200px] font-bold text-gray-900 bg-slate-50 border-r">Description</TableHead>
                      <TableHead className="w-[90px] text-right font-bold text-gray-900 bg-blue-50 border-r">Qty</TableHead>
                      <TableHead className="w-[90px] font-bold text-gray-900 bg-blue-50 border-r">UoM</TableHead>
                      <TableHead className="w-[130px] font-bold text-gray-900 bg-green-50 border-r">Mat. Group</TableHead>
                      <TableHead className="w-[130px] font-bold text-gray-900 bg-green-50 border-r">Storage Loc</TableHead>
                      <TableHead className="w-[130px] font-bold text-gray-900 bg-green-50 border-r">Purch. Group</TableHead>
                      <TableHead className="w-[130px] font-bold text-gray-900 bg-green-50 border-r">Purch. Org</TableHead>
                      <TableHead className="w-[120px] font-bold text-gray-900 bg-green-50 border-r">Cost Center</TableHead>
                      <TableHead className="w-[110px] text-right font-bold text-gray-900 bg-amber-50 border-r">Est. Price</TableHead>
                      <TableHead className="w-[110px] text-right font-bold text-gray-900 bg-amber-50 border-r">Total</TableHead>
                      <TableHead className="w-[60px] bg-slate-50"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <>
                        {/* Main PR Item Row */}
                        <TableRow key={item.tempId} className="border-b hover:bg-gray-50">
                          {/* Item Category Selection */}
                          <TableCell className="border-r bg-white p-2">
                            <Select
                              value={item.item_category_id?.toString() || ''}
                              onValueChange={(val) => handleItemChange(item.tempId, 'item_category_id', parseInt(val))}
                            >
                              <SelectTrigger className="h-8 w-full border-0 bg-transparent p-0 focus:ring-0">
                                <SelectValue placeholder="Cat" />
                              </SelectTrigger>
                              <SelectContent>
                                {itemCategories.map((cat: any) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Material Dropdown with BOM Toggle */}
                          <TableCell className="border-r bg-white">
                            <div className="space-y-1">
                              <Select
                                value={item.material_code || ''}
                                onValueChange={(value) => {
                                  // Filter materials by this item's plant
                                  const availableMaterials = item.plant_code
                                    ? (materials as Material[]).filter(m => m.plant_code === item.plant_code)
                                    : materials as Material[];

                                  const selectedMaterial = availableMaterials.find((m: Material) =>
                                    (m.code || m.material_code) === value
                                  );
                                  if (selectedMaterial) {
                                    // Update all material fields at once using setItems
                                    setItems(items.map(i => {
                                      if (i.tempId === item.tempId) {
                                        const price = selectedMaterial.price || selectedMaterial.base_price || selectedMaterial.standard_price || selectedMaterial.base_unit_price || 0;
                                        const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

                                        // Calculate delivery date from planned delivery time
                                        const plannedDays = (selectedMaterial as any).planned_delivery_time || 0;
                                        let deliveryDate = i.delivery_date;
                                        if (plannedDays > 0 && requiredDate) {
                                          const deliveryDateObj = new Date(requiredDate);
                                          deliveryDateObj.setDate(deliveryDateObj.getDate() + plannedDays);
                                          deliveryDate = deliveryDateObj.toISOString().split('T')[0];
                                        }

                                        return {
                                          ...i,
                                          material_id: selectedMaterial.id,
                                          material_code: selectedMaterial.code || selectedMaterial.material_code || '',
                                          material_name: selectedMaterial.name || selectedMaterial.material_name || selectedMaterial.description || '',
                                          description: selectedMaterial.description || selectedMaterial.name || selectedMaterial.material_name || '',
                                          unit_of_measure: selectedMaterial.unit_of_measure || selectedMaterial.base_unit || selectedMaterial.base_uom || 'EA',
                                          estimated_unit_price: numericPrice,
                                          estimated_total_price: i.quantity * numericPrice,
                                          // Auto-fill additional material master fields
                                          material_group: (selectedMaterial as any).material_group || i.material_group || '',
                                          storage_location: (selectedMaterial as any).production_storage_location || (selectedMaterial as any).storage_location || i.storage_location || '',
                                          purchase_group: (selectedMaterial as any).purchasing_group || (selectedMaterial as any).purchase_group || i.purchase_group || '',
                                          purchase_org: (selectedMaterial as any).purchase_organization || (selectedMaterial as any).purchase_org || i.purchase_org || '',
                                          cost_center: (selectedMaterial as any).cost_center || i.cost_center || '',
                                          delivery_date: deliveryDate,
                                        };
                                      }
                                      return i;
                                    }));

                                    // Fetch BOM for the selected material
                                    if (selectedMaterial.id && item.quantity > 0) {
                                      fetchBOMComponents(item.tempId, selectedMaterial.id, item.quantity);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder={item.plant_code ? "Select material" : "Select plant first"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(item.plant_code
                                    ? (materials as Material[]).filter((m: Material) => m.plant_code === item.plant_code)
                                    : (materials as Material[])
                                  ).map((material: Material) => (
                                    <SelectItem key={material.id} value={material.code || material.material_code || ''}>
                                      {material.code || material.material_code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* BOM Toggle Button */}
                              {bomComponents[item.tempId]?.hasBom && (
                                <button
                                  type="button"
                                  onClick={() => toggleBomExpansion(item.tempId)}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                >
                                  {expandedBoms.has(item.tempId) ? (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Hide {bomComponents[item.tempId].components.length} components
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="h-3 w-3" />
                                      Show {bomComponents[item.tempId].components.length} components
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* Plant Dropdown - NEW */}
                          <TableCell className="border-r bg-white">
                            <Select
                              value={item.plant_code || ''}
                              onValueChange={(value) => {
                                handleItemChange(item.tempId, 'plant_code', value);
                              }}
                              disabled={!companyCodeId}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder={companyCodeId ? "Select plant" : "Select company first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(plants as any[]).map((plant: any) => (
                                  <SelectItem key={plant.id} value={plant.code}>
                                    {plant.code} | {plant.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="border-r bg-white">
                            <Input
                              value={item.description}
                              disabled
                              className="bg-gray-50 h-9 text-sm"
                              placeholder="Auto-filled from material"
                            />
                          </TableCell>
                          <TableCell className="border-r">
                            <Input
                              type="number"
                              className="text-right h-9"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.tempId, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="1"
                            />
                          </TableCell>
                          <TableCell className="border-r">
                            <Input
                              value={item.unit_of_measure}
                              disabled
                              className="bg-gray-50 h-9 text-sm"
                              placeholder="UoM"
                            />
                          </TableCell>
                          <TableCell className="border-r bg-green-50/30">
                            <Input
                              value={item.material_group || ''}
                              disabled
                              className="bg-white h-9 text-sm"
                              placeholder="Mat. Group"
                            />
                          </TableCell>
                          <TableCell className="border-r bg-green-50/30">
                            <Input
                              value={item.storage_location || ''}
                              disabled
                              className="bg-white h-9 text-sm"
                              placeholder="Storage Loc"
                            />
                          </TableCell>
                          <TableCell className="border-r bg-green-50/30">
                            <Input
                              value={item.purchase_group || ''}
                              disabled
                              className="bg-white h-9 text-sm"
                              placeholder="Purch. Group"
                            />
                          </TableCell>
                          <TableCell className="border-r bg-green-50/30">
                            <Input
                              value={item.purchase_org || ''}
                              disabled
                              className="bg-white h-9 text-sm"
                              placeholder="Purch. Org"
                            />
                          </TableCell>
                          <TableCell className="border-r bg-green-50/30">
                            <Input
                              value={item.cost_center || ''}
                              disabled
                              className="bg-white h-9 text-sm"
                              placeholder="Cost Center"
                            />
                          </TableCell>
                          <TableCell className="border-r">
                            <Input
                              type="number"
                              className="text-right h-9"
                              value={item.estimated_unit_price}
                              onChange={(e) => handleItemChange(item.tempId, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold border-r bg-amber-50/30">
                            ${item.estimated_total_price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.tempId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* BOM Components - Expandable Row */}
                        {bomComponents[item.tempId]?.hasBom && expandedBoms.has(item.tempId) && (
                          <TableRow className="bg-blue-50/50 border-l-4 border-l-blue-400">
                            <TableCell colSpan={13} className="py-3 px-6">
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Required BOM Components (to be provided from stock):
                                </div>
                                <div className="grid gap-1 pl-4 max-w-4xl">
                                  {bomComponents[item.tempId].components.map((comp, idx) => (
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
                  </TableBody >
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <p className="text-gray-500">No items added yet. Click "Add Item" to start.</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="text-lg font-semibold">
                  Total Estimated Value: ${calculateTotal().toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or comments..."
              rows={2}
            />
          </div>

        </CardContent>
      </Card>
    </div>
  );
}