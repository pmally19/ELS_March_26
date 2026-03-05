import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit2, Trash2, ArrowLeft, RefreshCw, Package, Upload, Download, MoreHorizontal, Search, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import MaterialMasterExcelImport from "@/components/master-data/MaterialMasterExcelImport";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: number;
  material_code: string;
  description: string;
  material_type?: string;
  valuation_class?: string;
  base_unit?: string;
  industry_sector?: string;
  material_group?: string;
  mrp_type?: string;
  procurement_type?: string;
  lot_size?: string;
  reorder_point?: number;
  safety_stock?: number;
  planned_delivery_time?: number;
  production_time?: number;
  mrp_controller?: string;
  base_price?: number;
  gross_weight?: number;
  net_weight?: number;
  weight_unit?: string;
  volume?: number;
  volume_unit?: string;
  price_control?: string;
  sales_organization?: string;
  distribution_channel?: string;
  division?: string;
  purchase_organization?: string;
  purchasing_group?: string;
  production_storage_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plant_ids?: number[];
  plant_code?: string;
  profit_center?: string;
  cost_center?: string;
  item_category_group?: string;
  material_assignment_group_code?: string;
  loading_group?: string; // New field
  min_stock?: number;
  max_stock?: number;
  lead_time?: number;
  tax_classification_code?: string;
  _tenantId?: string;
  _deletedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

interface ValuationClass {
  id: number;
  class_code: string;
  class_name: string | null;
  description: string | null;
  valuation_method: string | null;
  price_control: string | null;
  allowed_material_types: Array<{ id: number; code: string; description?: string }>;
  is_active: boolean;
}

export default function MaterialMaster() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>("materials");
  const [formData, setFormData] = useState({
    material_code: "",
    description: "",
    material_type: "", // Will be set dynamically when material types are loaded
    valuation_class: "",
    base_unit: "", // No default - must be selected
    industry_sector: "", // No default - must be selected
    material_group: "",
    mrp_type: "", // No default - must be selected from master data
    procurement_type: "", // F=External, E=In-house, X=Both
    lot_size: "", // EX=Exact, FX=Fixed, MB=Monthly, etc.
    reorder_point: 0,
    safety_stock: 0,
    min_stock: 0, // Minimum stock level
    max_stock: 0, // Maximum stock level
    lead_time: 0, // Lead time in days
    planned_delivery_time: 0, // Days (if Procurement Type = F)
    production_time: 0, // Days (if Procurement Type = E)
    mrp_controller: "", // MRP Controller code
    base_price: 0,
    gross_weight: 0,
    net_weight: 0,
    weight_unit: "", // No default - must be selected
    volume: 0,
    volume_unit: "", // No default - must be selected
    price_control: "", // S=Standard Price, V=Moving Average
    sales_organization: "", // Sales organization code
    distribution_channel: "", // Distribution channel code
    division: "", // Division code
    purchase_organization: "", // Purchase organization code
    purchasing_group: "", // Purchasing group code
    production_storage_location: "", // Production storage location
    is_active: true, // Required field - must be explicitly set
    plant_code: "", // Plant assignment
    profit_center: "", // Profit center code
    cost_center: "", // Cost center code
    item_category_group: "", // Item category group code
    material_assignment_group_code: "", // Material assignment group code
    loading_group: "", // Loading group code
    tax_classification_code: "" // Tax classification code
  });
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [activeMaterialView, setActiveMaterialView] = useState('basic');
  const [viewingMaterialDetails, setViewingMaterialDetails] = useState<Material | null>(null);
  const [isMaterialDetailsOpen, setIsMaterialDetailsOpen] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/master-data/material"],
  });

  // Fetch Units of Measure and filter to Weight category
  const { data: allUom = [] } = useQuery({
    queryKey: ["/api/master-data/units-of-measure"],
  });
  // Show all UOMs to maximize choices; sort by code
  const weightUoms: Array<{ id: number; code: string; name: string; category?: string }> = Array.isArray(allUom)
    ? [...allUom].sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Material Types for dropdown
  const { data: materialTypes = [], isLoading: materialTypesLoading, error: materialTypesError } = useQuery({
    queryKey: ["/api/master-data/material-types"],
  });

  // Fetch Valuation Classes for dropdown
  const { data: valuationClasses = [], isLoading: valuationClassesLoading } = useQuery({
    queryKey: ["/api/master-data/valuation-classes"],
  });

  // Fetch Material Groups for dropdown
  const { data: materialGroupsRaw = [], isLoading: materialGroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/material-groups"],
  });

  // Normalize material groups data (convert snake_case to camelCase)
  const materialGroups = Array.isArray(materialGroupsRaw)
    ? materialGroupsRaw.map((mg: any) => ({
      id: mg.id,
      code: mg.code,
      description: mg.description,
      isActive: mg.is_active !== undefined ? mg.is_active : (mg.isActive !== undefined ? mg.isActive : true),
    })).filter((mg: any) => mg.isActive) // Only show active material groups
      .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Sales Organizations for dropdown
  const { data: salesOrganizations = [], isLoading: salesOrganizationsLoading } = useQuery({
    queryKey: ["/api/master-data/sales-organizations"],
  });

  // Fetch Distribution Channels for dropdown
  const { data: distributionChannels = [], isLoading: distributionChannelsLoading } = useQuery({
    queryKey: ["/api/master-data/distribution-channels"],
  });

  // Fetch Divisions for dropdown
  const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
    queryKey: ["/api/master-data/divisions"],
  });

  // Fetch Item Category Groups for dropdown
  const { data: itemCategoryGroupsRaw = [], isLoading: itemCategoryGroupsLoading } = useQuery({
    queryKey: ["/api/master-data/item-category-groups"],
  });

  // Normalize Item Category Groups
  const itemCategoryGroups = Array.isArray(itemCategoryGroupsRaw)
    ? itemCategoryGroupsRaw.map((icg: any) => ({
      id: icg.id,
      code: icg.group_code || icg.code,
      description: icg.description,
      name: icg.name || icg.description
    })).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Material Assignment Groups for dropdown
  const { data: materialAssignmentGroupsRaw = [], isLoading: materialAssignmentGroupsLoading } = useQuery({
    queryKey: ["/api/master-data/material-account-assignment-groups"],
  });

  // Normalize Material Assignment Groups
  const materialAssignmentGroups = Array.isArray(materialAssignmentGroupsRaw)
    ? materialAssignmentGroupsRaw.map((mag: any) => ({
      id: mag.id,
      code: mag.code,
      name: mag.name,
      description: mag.description
    })).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Loading Groups for dropdown
  const { data: loadingGroupsRaw = [], isLoading: loadingGroupsLoading } = useQuery({
    queryKey: ["/api/master-data/loading-groups"],
  });

  // Normalize Loading Groups
  const loadingGroups = Array.isArray(loadingGroupsRaw)
    ? loadingGroupsRaw.map((lg: any) => ({
      id: lg.id,
      code: lg.code,
      description: lg.description
    })).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Plants for dropdown
  const { data: plantsRaw = [], isLoading: plantsLoading } = useQuery({
    queryKey: ["/api/master-data/plant"],
  });

  // Fetch Profit Centers for dropdown
  const { data: profitCenters = [] } = useQuery({
    queryKey: ["/api/master-data/profit-center"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/profit-center");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch Cost Centers for dropdown
  const { data: costCentersRaw = [] } = useQuery({
    queryKey: ["/api/master-data/cost-center"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/cost-center");
      if (!response.ok) return [];
      const data = await response.json();
      // Handle both array response and object with data property
      return Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
    },
  });

  // Normalize cost centers data to handle different response formats
  const costCenters = Array.isArray(costCentersRaw)
    ? costCentersRaw.map((cc: any) => ({
      id: cc.id,
      code: cc.cost_center_code || cc.code || cc.cost_center || String(cc.id),
      cost_center_code: cc.cost_center_code || cc.code || cc.cost_center,
      description: cc.description || cc.name || cc.costCenterName || "",
      name: cc.name || cc.description || cc.costCenterName || "",
      profit_center_code: cc.profit_center_code || cc.profitCenterCode,
      profit_center_id: cc.profit_center_id || cc.profitCenterId,
      profit_center: cc.profit_center
    }))
    : [];

  // Normalize plants data to handle field name variations and ensure consistent structure
  const plants = Array.isArray(plantsRaw)
    ? plantsRaw
      .filter((p: any) => p.isActive !== false && p.is_active !== false) // Only show active plants
      .map((p: any) => ({
        id: p.id,
        code: p.code || p.plant_code || '',
        name: p.name || p.plant_name || '',
        description: p.description || null,
        companyCodeId: p.companyCodeId || p.company_code_id || null,
        companyCodeName: p.companyCodeName || null,
        type: p.type || null,
        category: p.category || null,
        address: p.address || null,
        city: p.city || null,
        state: p.state || null,
        country: p.country || null,
        postalCode: p.postalCode || p.postal_code || null,
        phone: p.phone || null,
        email: p.email || null,
        manager: p.manager || null,
        timezone: p.timezone || p.timeZone || null,
        operatingHours: p.operatingHours || p.operating_hours || null,
        coordinates: p.coordinates || null,
        status: p.status || 'active',
        isActive: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
        createdAt: p.createdAt || p.created_at || null,
        updatedAt: p.updatedAt || p.updated_at || null
      }))
      .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch MRP Types for dropdown
  const { data: mrpTypes = [], isLoading: mrpTypesLoading } = useQuery({
    queryKey: ["/api/master-data/mrp-types"],
  });

  // Fetch MRP Controllers for dropdown
  const { data: mrpControllersRaw = [], isLoading: mrpControllersLoading } = useQuery({
    queryKey: ["/api/master-data/mrp-controllers"],
  });

  // Normalize MRP Controllers data (convert snake_case to camelCase and filter active)
  const mrpControllers = Array.isArray(mrpControllersRaw)
    ? mrpControllersRaw
      .filter((mc: any) => mc.is_active !== false) // Only show active controllers
      .map((mc: any) => ({
        id: mc.id,
        controller_code: mc.controller_code,
        controller_name: mc.controller_name,
        description: mc.description,
        mrp_controller: mc.controller_code, // Alias for compatibility
        is_active: mc.is_active
      }))
      .sort((a: any, b: any) => String(a.controller_code).localeCompare(String(b.controller_code)))
    : [];

  // Fetch Industry Sectors for dropdown
  const { data: industrySectorsRaw = [], isLoading: industrySectorsLoading } = useQuery({
    queryKey: ["/api/master-data/industry-sector"],
  });

  // Normalize Industry Sectors data and filter active
  const industrySectors = Array.isArray(industrySectorsRaw)
    ? industrySectorsRaw
      .filter((is: any) => is.active !== false) // Only show active sectors
      .map((is: any) => ({
        id: is.id,
        code: is.code,
        name: is.name,
        description: is.description,
        active: is.active
      }))
      .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Purchase Groups for dropdown (using purchasing-group endpoint which now queries correct table)
  const { data: purchaseGroupsRaw = [], isLoading: purchaseGroupsLoading } = useQuery({
    queryKey: ["/api/master-data/purchasing-groups"],
  });

  // Normalize Purchase Groups
  const purchaseGroups = Array.isArray(purchaseGroupsRaw)
    ? purchaseGroupsRaw.map((pg: any) => ({
      id: pg.id,
      code: pg.code,
      name: pg.name,
      description: pg.description
    })).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];

  // Fetch Purchase Organizations for dropdown
  const { data: purchaseOrganizationsRaw = [], isLoading: purchaseOrganizationsLoading } = useQuery({
    queryKey: ["/api/master-data/purchase-organization"],
  });

  // Normalize Purchase Organizations
  const purchaseOrganizations = Array.isArray(purchaseOrganizationsRaw)
    ? purchaseOrganizationsRaw.map((po: any) => ({
      id: po.id,
      code: po.code,
      name: po.name,
      description: po.description
    })).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];



  // Fetch Storage Locations for dropdown (plant-specific)
  const { data: storageLocationsRaw = [], isLoading: storageLocationsLoading } = useQuery({
    queryKey: ["/api/master-data/storage-location"],
  });

  // Normalize and filter Storage Locations by selected plant
  const storageLocations = Array.isArray(storageLocationsRaw)
    ? storageLocationsRaw
      .filter((sl: any) => {
        // If no plants selected yet, show all storage locations
        if (!formData.plant_code || formData.plant_code.length === 0) {
          return true;
        }
        // Filter by selected plant code
        return sl.plant?.code === formData.plant_code;
      })
      .map((sl: any) => ({
        id: sl.id,
        code: sl.code,
        name: sl.name,
        description: sl.description,
        plantId: sl.plantId || sl.plant_id
      }))
      .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
    : [];



  // Fetch Number Ranges for validation
  const { data: numberRangesRaw = [] } = useQuery({
    queryKey: ["/api/master-data/number-ranges"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/number-ranges");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Normalize number ranges
  const numberRanges = Array.isArray(numberRangesRaw) ? numberRangesRaw : [];

  // Fetch Tax Classifications
  const { data: taxClassifications = [] } = useQuery({
    queryKey: ['tax-classifications'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/tax-classifications');
      if (!res.ok) throw new Error('Failed to fetch tax classifications');
      return res.json();
    }
  });

  // State for material code validation
  const [materialCodeValidation, setMaterialCodeValidation] = useState<{
    isValid: boolean;
    message: string;
    rangeInfo: string;
  }>({ isValid: true, message: '', rangeInfo: '' });

  // Debug logging
  console.log('Material Types Data:', materialTypes);
  console.log('Material Types Loading:', materialTypesLoading);
  console.log('Material Types Error:', materialTypesError);

  // Get selected material type with defaults
  const getSelectedMaterialTypeDefaults = (): any => {
    if (!formData.material_type || !Array.isArray(materialTypes) || materialTypes.length === 0) {
      return null;
    }
    return (materialTypes as any[]).find((mt: any) => mt.code === formData.material_type) || null;
  };

  const selectedMaterialTypeDefaults: any = getSelectedMaterialTypeDefaults();

  // Set default material type when material types are loaded
  useEffect(() => {
    if (Array.isArray(materialTypes) && materialTypes.length > 0 && !formData.material_type) {
      const defaultType = (materialTypes as any[])[0].code;
      setFormData(prev => ({ ...prev, material_type: defaultType }));
    }
  }, [materialTypes, formData.material_type]);

  // Auto-fill fields based on selected material type defaults
  useEffect(() => {
    if (!formData.material_type || !Array.isArray(materialTypes) || materialTypes.length === 0) {
      return;
    }

    // Only auto-fill when creating new material, not when editing
    if (editingMaterial) {
      return;
    }

    const selectedMaterialType = (materialTypes as any[]).find(
      (mt: any) => mt.code === formData.material_type
    );

    if (!selectedMaterialType) {
      return;
    }

    // Auto-fill fields with defaults from material type, only if field is empty
    const updates: any = {};

    if (selectedMaterialType.default_base_unit && !formData.base_unit) {
      updates.base_unit = selectedMaterialType.default_base_unit;
    }

    if (selectedMaterialType.default_mrp_type && !formData.mrp_type) {
      updates.mrp_type = selectedMaterialType.default_mrp_type;
    }

    if (selectedMaterialType.default_procurement_type && !formData.procurement_type) {
      updates.procurement_type = selectedMaterialType.default_procurement_type;
    }

    if (selectedMaterialType.default_lot_size && !formData.lot_size) {
      updates.lot_size = selectedMaterialType.default_lot_size;
    }

    if (selectedMaterialType.default_valuation_class && !formData.valuation_class) {
      updates.valuation_class = selectedMaterialType.default_valuation_class;
    }

    if (selectedMaterialType.default_price_control && !formData.price_control) {
      updates.price_control = selectedMaterialType.default_price_control;
    }

    if (selectedMaterialType.default_material_group && !formData.material_group) {
      updates.material_group = selectedMaterialType.default_material_group;
    }

    if (selectedMaterialType.default_industry_sector && !formData.industry_sector) {
      updates.industry_sector = selectedMaterialType.default_industry_sector;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.material_type, materialTypes, editingMaterial]);

  // Function to validate material code against number range
  const validateMaterialCode = (code: string, materialType: string) => {
    if (!code || !materialType) {
      setMaterialCodeValidation({ isValid: true, message: '', rangeInfo: '' });
      return;
    }

    // Find the selected material type
    const selectedType = (materialTypes as any[])?.find((mt: any) => mt.code === materialType);

    if (!selectedType) {
      setMaterialCodeValidation({ isValid: true, message: '', rangeInfo: '' });
      return;
    }

    // Check if material type has a number range code
    if (!selectedType.number_range_code) {
      setMaterialCodeValidation({
        isValid: true,
        message: '',
        rangeInfo: 'No number range configured for this material type'
      });
      return;
    }

    // Find the number range
    const numberRange = numberRanges.find(
      (nr: any) => nr.number_range_code === selectedType.number_range_code
    );

    if (!numberRange) {
      setMaterialCodeValidation({
        isValid: true,
        message: '',
        rangeInfo: `Number range ${selectedType.number_range_code} not found`
      });
      return;
    }

    // Validate the code
    const codeNum = parseInt(code);
    const rangeFrom = parseInt(numberRange.range_from);
    const rangeTo = parseInt(numberRange.range_to);

    if (isNaN(codeNum)) {
      setMaterialCodeValidation({
        isValid: false,
        message: 'Material code must be numeric',
        rangeInfo: `Valid range: ${rangeFrom} - ${rangeTo}`
      });
      return;
    }

    const inRange = codeNum >= rangeFrom && codeNum <= rangeTo;

    if (!inRange) {
      setMaterialCodeValidation({
        isValid: false,
        message: `Code must be between ${rangeFrom} and ${rangeTo}`,
        rangeInfo: `Valid range for ${materialType}: ${rangeFrom} - ${rangeTo}`
      });
    } else {
      setMaterialCodeValidation({
        isValid: true,
        message: `✓ Code is within valid range`,
        rangeInfo: `Valid range: ${rangeFrom} - ${rangeTo}`
      });
    }
  };

  // Function to auto-generate material code
  const generateMaterialCode = (materialType: string) => {
    console.log('🔍 Generating material code for type:', materialType);
    console.log('Available material types:', materialTypes);
    console.log('Available number ranges:', numberRanges);

    if (!materialType) {
      console.log('❌ No material type provided');
      return;
    }

    const selectedType = (materialTypes as any[])?.find((mt: any) => mt.code === materialType);
    console.log('Selected material type:', selectedType);

    if (!selectedType?.number_range_code) {
      console.log('❌ No number_range_code for this material type');
      return;
    }

    console.log('Looking for number range with code:', selectedType.number_range_code);

    // The API returns number ranges with both 'code' and 'number_range_code'
    // Try matching on both fields
    const numberRange = numberRanges.find(
      (nr: any) => nr.number_range_code === selectedType.number_range_code ||
        nr.code === selectedType.number_range_code
    );

    console.log('Found number range:', numberRange);

    if (numberRange) {
      const currentNumber = numberRange.current_number ? parseInt(numberRange.current_number) : 0;
      const rangeFrom = parseInt(numberRange.range_from);

      // If current_number exists, next code is current_number + 1
      // If no current_number yet, start from range_from
      const nextCode = numberRange.current_number ? (currentNumber + 1) : rangeFrom;

      console.log('✅ Setting material code to:', nextCode);
      setFormData(prev => ({ ...prev, material_code: String(nextCode) }));
    } else {
      console.log('❌ Number range not found');
    }
  };

  // Validate material code when code or material type changes
  useEffect(() => {
    validateMaterialCode(formData.material_code, formData.material_type);
  }, [formData.material_code, formData.material_type, materialTypes, numberRanges]);

  // Auto-generate material code when material type changes (for new materials only)
  useEffect(() => {
    if (!editingMaterial && formData.material_type) {
      // Always regenerate when material type changes for new materials
      generateMaterialCode(formData.material_type);
    }
  }, [formData.material_type, editingMaterial, numberRanges, materialTypes]);

  // Check URL parameters for default tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'material-plants') {
      setDefaultTab('material-plants');
    }
  }, []);

  // Helper function to determine field enable/disable based on MRP Type
  const getMrpFieldDisabled = (fieldName: string): boolean => {
    if (!formData.mrp_type) {
      return false; // Enable all if no MRP type selected yet
    }

    const mrpType = formData.mrp_type.toUpperCase();

    // ND - No Planning: Disable ALL MRP fields
    if (mrpType === 'ND') {
      const mrpFields = [
        'procurement_type',
        'lot_size',
        'safety_stock',
        'reorder_point',
        'planned_delivery_time',
        'production_time',
        'mrp_controller'
      ];
      return mrpFields.includes(fieldName);
    }

    // VB - Reorder Point Planning: Enable reorder point, safety stock, lot size; Disable procurement type, delivery/production time
    if (mrpType === 'VB' || mrpType === 'VM') {
      if (fieldName === 'procurement_type' || fieldName === 'planned_delivery_time' || fieldName === 'production_time') {
        return true; // Disable
      }
      if (fieldName === 'reorder_point' || fieldName === 'safety_stock' || fieldName === 'lot_size') {
        return false; // Enable
      }
    }

    // PD - Full MRP: Enable all fields
    if (mrpType === 'PD') {
      return false; // Enable all
    }

    // Default: Enable all for other MRP types
    return false;
  };

  // Helper function to determine if field should be shown based on Procurement Type
  const shouldShowDeliveryTime = (): boolean => {
    if (!formData.procurement_type) return false;
    return formData.procurement_type === 'F' || formData.procurement_type === 'X';
  };

  const shouldShowProductionTime = (): boolean => {
    if (!formData.procurement_type) return false;
    return formData.procurement_type === 'E' || formData.procurement_type === 'X';
  };

  // Lot Size options
  const lotSizeOptions = [
    { value: 'EX', label: 'EX - Exact' },
    { value: 'FX', label: 'FX - Fixed' },
    { value: 'MB', label: 'MB - Monthly' },
    { value: 'EO', label: 'EO - Economic Order Quantity' },
    { value: 'HB', label: 'HB - Daily' },
    { value: 'TB', label: 'TB - Weekly' },
    { value: 'WB', label: 'WB - Period' },
  ];

  // Get allowed material types for a selected valuation class
  const getAllowedMaterialTypesForValuationClass = (valuationClassCode: string): string[] => {
    if (!valuationClassCode || !Array.isArray(valuationClasses)) {
      return [];
    }

    const selectedValuationClass = (valuationClasses as ValuationClass[]).find(
      (vc) => vc.class_code === valuationClassCode
    );

    if (!selectedValuationClass) {
      return [];
    }

    // If no allowed material types specified, all types are allowed
    if (!selectedValuationClass.allowed_material_types || selectedValuationClass.allowed_material_types.length === 0) {
      return Array.isArray(materialTypes) ? (materialTypes as any[]).map((mt: any) => mt.code) : [];
    }

    return selectedValuationClass.allowed_material_types.map((amt) => amt.code);
  };

  // Filter valuation classes based on selected material type
  const getAvailableValuationClasses = (): ValuationClass[] => {
    // If no material type is selected, return empty array (user must select material type first)
    if (!formData.material_type) {
      return [];
    }

    // If valuation classes data is not loaded yet, return empty array
    if (!Array.isArray(valuationClasses) || valuationClasses.length === 0) {
      return [];
    }

    // Find the selected material type
    const selectedMaterialType = Array.isArray(materialTypes)
      ? (materialTypes as any[]).find((mt: any) => mt.code === formData.material_type)
      : null;

    // Filter valuation classes that allow this material type
    const filtered = (valuationClasses as ValuationClass[]).filter((vc: ValuationClass) => {
      // Only show active valuation classes
      if (!vc.is_active) {
        return false;
      }

      // If no allowed material types are specified for this valuation class,
      // it means all material types are allowed - so show it
      if (!vc.allowed_material_types || vc.allowed_material_types.length === 0) {
        return true;
      }

      // If material type restrictions exist, check if this material type is allowed
      const isAllowed = vc.allowed_material_types.some((amt) => {
        // Check by code (most reliable)
        if (amt.code === formData.material_type) {
          return true;
        }
        // Also check by ID if we have the selected material type object
        if (selectedMaterialType && amt.id === selectedMaterialType.id) {
          return true;
        }
        return false;
      });

      return isAllowed;
    });

    return filtered;
  };

  // Auto-fill material type when valuation class is selected (only when creating, not editing)
  useEffect(() => {
    if (formData.valuation_class && !editingMaterial) {
      const allowedTypes = getAllowedMaterialTypesForValuationClass(formData.valuation_class);

      if (allowedTypes.length === 1) {
        // If only one material type is allowed, auto-select it
        if (formData.material_type !== allowedTypes[0]) {
          setFormData(prev => ({ ...prev, material_type: allowedTypes[0] }));
        }
      } else if (allowedTypes.length > 0 && !formData.material_type) {
        // If types are restricted and no type selected, select the first allowed one
        setFormData(prev => ({ ...prev, material_type: allowedTypes[0] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.valuation_class, valuationClasses, editingMaterial]);

  // Reset valuation class when material type changes if it's not compatible
  useEffect(() => {
    if (formData.material_type && formData.valuation_class) {
      const availableClasses = getAvailableValuationClasses();
      const currentClass = availableClasses.find(
        (vc) => vc.class_code === formData.valuation_class
      );

      // If current valuation class is not available for selected material type, clear it
      if (!currentClass) {
        setFormData(prev => ({ ...prev, valuation_class: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.material_type, valuationClasses]);

  // Filter materials based on search term
  const filteredMaterials = (materials as Material[]).filter((material: Material) =>
    material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (material.material_type && material.material_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (material.material_group && material.material_group.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createMutation = useMutation({
    mutationFn: (data: Omit<Material, "id" | "created_at" | "updated_at">) =>
      apiRequest("/api/master-data/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Material created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Material>) => {
      console.log('🔍 UPDATE MUTATION - Data being sent:', {
        id,
        hasItemCategoryGroup: 'item_category_group' in data,
        itemCategoryGroupValue: data.item_category_group,
        fullData: data
      });
      return apiRequest(`/api/master-data/material/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material"] });
      setEditingMaterial(null);
      resetForm();
      toast({ title: "Success", description: "Material updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/material/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material"] });
      toast({ title: "Success", description: "Material deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    // Get the first material type as default only if available, otherwise empty
    const defaultMaterialType = Array.isArray(materialTypes) && materialTypes.length > 0
      ? (materialTypes as any[])[0].code
      : "";

    setFormData({
      material_code: "",
      description: "",
      material_type: defaultMaterialType,
      valuation_class: "",
      base_unit: "", // No default - must be selected
      industry_sector: "", // No default - must be selected
      material_group: "",
      mrp_type: "", // No default - must be selected
      procurement_type: "",
      lot_size: "",
      reorder_point: 0,
      safety_stock: 0,
      min_stock: 0,
      max_stock: 0,
      lead_time: 0,
      planned_delivery_time: 0,
      production_time: 0,
      mrp_controller: "",
      base_price: 0,
      gross_weight: 0,
      net_weight: 0,
      weight_unit: "", // No default - must be selected
      volume: 0,
      volume_unit: "", // No default - must be selected
      price_control: "",
      sales_organization: "",
      distribution_channel: "",
      division: "",
      purchase_organization: "",
      purchasing_group: "",
      production_storage_location: "",
      is_active: true, // Required field - must be explicitly set
      plant_code: "",
      profit_center: "",
      cost_center: "",
      item_category_group: "",
      material_assignment_group_code: "",
      loading_group: "",
      tax_classification_code: ""
    });
    setSelectedPlantId('');
    setEditingMaterial(null);
    setIsDialogOpen(false);
    setActiveMaterialView('basic');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // HARD VALIDATION: Check material code is within number range
    if (!materialCodeValidation.isValid) {
      toast({
        title: "Invalid Material Code",
        description: materialCodeValidation.message || "Material code does not match the allowed number range for this material type.",
        variant: "destructive"
      });
      return;
    }

    // Validate valuation class compatibility before submitting
    if (formData.valuation_class && formData.material_type) {
      const availableClasses = getAvailableValuationClasses();
      const selectedClass = availableClasses.find(
        (vc) => vc.class_code === formData.valuation_class
      );

      if (!selectedClass) {
        toast({
          title: "Validation Error",
          description: `Material type "${formData.material_type}" is not allowed for valuation class "${formData.valuation_class}". Please select a compatible valuation class.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validate material_type is required
    if (!formData.material_type || formData.material_type.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Material type is required. Please select a material type.",
        variant: "destructive"
      });
      return;
    }

    // Validate base_unit is required
    if (!formData.base_unit || formData.base_unit.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Base unit of measure is required. Please select a unit of measure.",
        variant: "destructive"
      });
      return;
    }

    // Normalize material_group: if it's "__none__", convert to empty string
    // Also normalize item_category_group the same way
    const normalizedFormData = {
      ...formData,
      material_group: formData.material_group === "__none__" ? "" : (formData.material_group || ""),
      item_category_group: formData.item_category_group === "__none__" ? "" : (formData.item_category_group || ""),
      material_assignment_group_code: formData.material_assignment_group_code === "__none__" ? "" : (formData.material_assignment_group_code || ""),
      loading_group: formData.loading_group === "__none__" ? "" : (formData.loading_group || ""),
      tax_classification_code: formData.tax_classification_code === "__none__" ? "" : (formData.tax_classification_code || "")
    };

    // Log what we're sending
    console.log('MaterialMaster - Submitting form data:', {
      isEdit: !!editingMaterial,
      formData: normalizedFormData,
      plant_code: normalizedFormData.plant_code,
      plant_code_length: normalizedFormData.plant_code?.length || 0,
      valuation_class: normalizedFormData.valuation_class,
      valuation_class_type: typeof normalizedFormData.valuation_class,
      material_group: normalizedFormData.material_group,
      material_group_type: typeof normalizedFormData.material_group,
      division: normalizedFormData.division,
      division_type: typeof normalizedFormData.division,
      production_storage_location: normalizedFormData.production_storage_location,
      production_storage_location_exists: 'production_storage_location' in normalizedFormData,
      production_storage_location_value: normalizedFormData.production_storage_location,
      all_keys: Object.keys(normalizedFormData)
    });

    if (editingMaterial) {
      const payload = { id: editingMaterial.id, ...normalizedFormData };
      console.log('🔍 UPDATE PAYLOAD:', {
        hasDivision: 'division' in payload,
        divisionValue: payload.division,
        divisionType: typeof payload.division,
        fullPayload: payload
      });
      updateMutation.mutate(payload);
    } else {
      console.log('🔍 CREATE PAYLOAD:', {
        hasDivision: 'division' in normalizedFormData,
        divisionValue: normalizedFormData.division,
        divisionType: typeof normalizedFormData.division,
        fullPayload: normalizedFormData
      });
      createMutation.mutate(normalizedFormData, {
        onSuccess: () => {
          // Invalidate number ranges query to refetch updated current_number
          queryClient.invalidateQueries({ queryKey: ["/api/master-data/number-ranges"] });
        }
      });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    // Get the first material type as fallback, or use the existing material type
    const defaultMaterialType = Array.isArray(materialTypes) && materialTypes.length > 0
      ? (materialTypes as any[])[0].code
      : "FERT";

    const materialType = material.material_type || defaultMaterialType;
    let valuationClass = material.valuation_class || "";

    // Check if the existing valuation class is compatible with the material type
    if (valuationClass && materialType && Array.isArray(valuationClasses)) {
      const selectedMaterialType = (materialTypes as any[])?.find(
        (mt: any) => mt.code === materialType
      );

      if (selectedMaterialType) {
        const selectedValuationClass = (valuationClasses as ValuationClass[]).find(
          (vc) => vc.class_code === valuationClass
        );

        if (selectedValuationClass) {
          // Check if this material type is allowed for this valuation class
          const hasRestrictions = selectedValuationClass.allowed_material_types &&
            selectedValuationClass.allowed_material_types.length > 0;

          if (hasRestrictions) {
            const isAllowed = selectedValuationClass.allowed_material_types.some(
              (amt) => amt.id === selectedMaterialType.id || amt.code === materialType
            );

            if (!isAllowed) {
              // Clear incompatible valuation class
              valuationClass = "";
            }
          }
        }
      }
    }

    setFormData({
      material_code: material.material_code,
      description: material.description,
      material_type: materialType,
      valuation_class: valuationClass,
      base_unit: material.base_unit || "",
      industry_sector: material.industry_sector || "",
      material_group: material.material_group && material.material_group.trim() !== "" ? material.material_group : "",
      mrp_type: (material as any).mrp_type || "",
      procurement_type: (material as any).procurement_type || "",
      lot_size: (material as any).lot_size || "",
      reorder_point: (material as any).reorder_point || 0,
      safety_stock: (material as any).safety_stock || 0,
      min_stock: (material as any).min_stock || 0,
      max_stock: (material as any).max_stock || 0,
      lead_time: (material as any).lead_time || 0,
      planned_delivery_time: (material as any).planned_delivery_time || 0,
      production_time: (material as any).production_time || 0,
      mrp_controller: (material as any).mrp_controller || "",
      base_price: material.base_price || 0,
      gross_weight: material.gross_weight || 0,
      net_weight: material.net_weight || 0,
      weight_unit: material.weight_unit || "",
      volume: material.volume || 0,
      volume_unit: material.volume_unit || "",
      price_control: (material as any).price_control || "",
      sales_organization: (material as any).sales_organization || "",
      distribution_channel: (material as any).distribution_channel || "",
      division: (material as any).division || "",
      purchase_organization: (material as any).purchase_organization || "",
      purchasing_group: (material as any).purchasing_group || "",
      production_storage_location: (material as any).production_storage_location || "",
      is_active: material.is_active,
      plant_code: (material as any).plant_code || "",
      profit_center: (material as any).profit_center || material.profit_center || "",
      cost_center: (material as any).cost_center || material.cost_center || "",
      item_category_group: material.item_category_group || "",
      material_assignment_group_code: material.material_assignment_group_code || "",
      loading_group: material.loading_group || "",
      tax_classification_code: material.tax_classification_code || ""
    });
    setSelectedPlantId('');
    setIsDialogOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data refreshed",
        description: "Material master data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh material data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Material Code', 'Description', 'Type', 'Valuation Class', 'Base Unit', 'Industry Sector', 'Material Group', 'Gross Weight', 'Net Weight', 'Weight Unit', 'Volume', 'Volume Unit', 'Active', 'Created At'];
    const csvData = filteredMaterials.map((material: Material) => [
      material.material_code,
      material.description,
      material.material_type || '',
      material.valuation_class || '',
      material.base_unit || '',
      material.industry_sector || '',
      material.material_group || '',
      material.gross_weight || '',
      material.net_weight || '',
      material.weight_unit || '',
      material.volume || '',
      material.volume_unit || '',
      material.is_active ? 'Yes' : 'No',
      new Date(material.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `materials-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export completed",
      description: `Exported ${filteredMaterials.length} materials to CSV file.`
    });
  };

  // Function to open material details dialog
  const openMaterialDetails = (material: Material) => {
    setViewingMaterialDetails(material);
    setIsMaterialDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Material Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage materials, inventory items, and product master data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDefaultTab('import')}>
            <Upload className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredMaterials.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Material
          </Button>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          title="Refresh materials data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials">Material Data</TabsTrigger>
          <TabsTrigger value="import">Import Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-6">
          {/* Materials Table */}
          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>
                All materials and inventory items in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Valuation Class</TableHead>
                        <TableHead className="hidden lg:table-cell">Base Unit</TableHead>
                        <TableHead className="hidden lg:table-cell">MRP Type</TableHead>
                        <TableHead className="hidden xl:table-cell">Loading Grp</TableHead>
                        <TableHead className="hidden xl:table-cell">Mat Acct Grp</TableHead>
                        <TableHead className="hidden xl:table-cell">Tax Class</TableHead>
                        <TableHead className="hidden xl:table-cell">Storage Loc</TableHead>
                        <TableHead className="hidden xl:table-cell">Min Stock</TableHead>
                        <TableHead className="hidden xl:table-cell">Max Stock</TableHead>
                        <TableHead className="hidden xl:table-cell">Lead Time</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredMaterials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center h-24">
                            No materials found. {searchTerm ? "Try a different search." : "Create your first material."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMaterials.map((material: Material) => (
                          <TableRow
                            key={material.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => openMaterialDetails(material)}
                          >
                            <TableCell className="font-medium">{material.material_code}</TableCell>
                            <TableCell>{material.description}</TableCell>
                            <TableCell className="hidden md:table-cell">{material.material_type || "N/A"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{material.valuation_class || "N/A"}</TableCell>
                            <TableCell className="hidden lg:table-cell">{material.base_unit || "N/A"}</TableCell>
                            <TableCell className="hidden lg:table-cell">{material.mrp_type || "N/A"}</TableCell>
                            <TableCell className="hidden xl:table-cell">{material.loading_group || "N/A"}</TableCell>
                            <TableCell className="hidden xl:table-cell">{material.material_assignment_group_code || "N/A"}</TableCell>
                            <TableCell className="hidden xl:table-cell">{material.tax_classification_code || "N/A"}</TableCell>
                            <TableCell className="hidden xl:table-cell">{material.production_storage_location || "N/A"}</TableCell>
                            <TableCell className="hidden xl:table-cell">{(material as any).min_stock || 0}</TableCell>
                            <TableCell className="hidden xl:table-cell">{(material as any).max_stock || 0}</TableCell>
                            <TableCell className="hidden xl:table-cell">{(material as any).lead_time || 0} days</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${material.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {material.is_active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title="More actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openMaterialDetails(material)}>
                                    <Info className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(material)}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (window.confirm("Are you sure you want to delete this material?")) {
                                        deleteMutation.mutate(material.id);
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <span style={{ display: 'none' }}></span>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editingMaterial ? "Edit Material" : "Add New Material"}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Tabs value={activeMaterialView} onValueChange={setActiveMaterialView} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 mb-4 sticky top-0 bg-background z-10">
                      <TabsTrigger value="basic">Basic Data</TabsTrigger>
                      <TabsTrigger value="mrp">MRP View</TabsTrigger>
                      <TabsTrigger value="work">Work Scheduling</TabsTrigger>
                      <TabsTrigger value="sales">Sales View</TabsTrigger>
                      <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
                      <TabsTrigger value="accounting">Accounting</TabsTrigger>
                    </TabsList>

                    {/* Basic Data View */}
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Material Code <span className="text-red-500">*</span></label>
                          <Input
                            value={formData.material_code}
                            onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                            required
                            readOnly={!editingMaterial}
                            disabled={!editingMaterial}
                            className={`${!editingMaterial ? 'bg-gray-100 cursor-not-allowed' : ''} ${!materialCodeValidation.isValid ? 'border-red-500' : materialCodeValidation.message.startsWith('✓') ? 'border-green-500' : ''}`}
                            placeholder={!editingMaterial ? "Auto-generated based on material type" : "Enter material code"}
                          />
                          {!editingMaterial && (
                            <div className="text-xs mt-1 text-blue-600">
                              ℹ️ Code is auto-generated from the material type's number range
                            </div>
                          )}
                          {materialCodeValidation.rangeInfo && (
                            <div className={`text-xs mt-1 ${materialCodeValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                              {materialCodeValidation.rangeInfo}
                            </div>
                          )}
                          {materialCodeValidation.message && (
                            <div className={`text-sm mt-1 font-medium ${materialCodeValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                              {materialCodeValidation.message}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                          <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Material Type <span className="text-red-500">*</span> {materialTypesLoading ? "(Loading...)" : `(${Array.isArray(materialTypes) ? materialTypes.length : 0} types)`}</label>
                          <Select
                            value={formData.material_type}
                            onValueChange={(val) => {
                              console.log('Material type changed to:', val);
                              // Clear valuation class when material type changes
                              // The useEffect will auto-fill defaults
                              setFormData({ ...formData, material_type: val, valuation_class: "" });
                            }}
                            disabled={materialTypesLoading}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={materialTypesLoading ? "Loading material types..." : "Select material type"} />
                            </SelectTrigger>
                            <SelectContent>
                              {materialTypesLoading ? (
                                <SelectItem value="loading" disabled>
                                  Loading material types...
                                </SelectItem>
                              ) : Array.isArray(materialTypes) && materialTypes.length > 0 ? (
                                (materialTypes as any[]).slice().sort((a: any, b: any) => String(a.code).localeCompare(String(b.code))).map((type: any) => (
                                  <SelectItem key={type.id} value={type.code}>
                                    {type.code} — {type.name || type.description || 'No description'}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value={formData.material_type || 'FERT'}>
                                  {formData.material_type || 'FERT'} (Fallback)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {/* Display default values info */}
                          {selectedMaterialTypeDefaults && !editingMaterial && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">
                                    Default Values for {selectedMaterialTypeDefaults.code}
                                  </p>
                                  <div className="text-xs text-blue-800 space-y-1">
                                    {selectedMaterialTypeDefaults.default_base_unit && (
                                      <div>• Base Unit: <span className="font-medium">{selectedMaterialTypeDefaults.default_base_unit}</span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_mrp_type && (
                                      <div>• MRP Type: <span className="font-medium">{selectedMaterialTypeDefaults.default_mrp_type}</span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_procurement_type && (
                                      <div>• Procurement Type: <span className="font-medium">
                                        {selectedMaterialTypeDefaults.default_procurement_type === 'F' ? 'External' :
                                          selectedMaterialTypeDefaults.default_procurement_type === 'E' ? 'In-House' :
                                            selectedMaterialTypeDefaults.default_procurement_type === 'X' ? 'Both' :
                                              selectedMaterialTypeDefaults.default_procurement_type}
                                      </span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_lot_size && (
                                      <div>• Lot Size: <span className="font-medium">{selectedMaterialTypeDefaults.default_lot_size}</span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_valuation_class && (
                                      <div>• Valuation Class: <span className="font-medium">{selectedMaterialTypeDefaults.default_valuation_class}</span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_price_control && (
                                      <div>• Price Control: <span className="font-medium">
                                        {selectedMaterialTypeDefaults.default_price_control === 'S' ? 'Standard Price' :
                                          selectedMaterialTypeDefaults.default_price_control === 'V' ? 'Moving Average' :
                                            selectedMaterialTypeDefaults.default_price_control}
                                      </span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_material_group && (
                                      <div>• Material Group: <span className="font-medium">{selectedMaterialTypeDefaults.default_material_group}</span></div>
                                    )}
                                    {selectedMaterialTypeDefaults.default_industry_sector && (
                                      <div>• Industry Sector: <span className="font-medium">{selectedMaterialTypeDefaults.default_industry_sector}</span></div>
                                    )}
                                    {!selectedMaterialTypeDefaults.default_base_unit &&
                                      !selectedMaterialTypeDefaults.default_mrp_type &&
                                      !selectedMaterialTypeDefaults.default_procurement_type &&
                                      !selectedMaterialTypeDefaults.default_lot_size &&
                                      !selectedMaterialTypeDefaults.default_valuation_class &&
                                      !selectedMaterialTypeDefaults.default_price_control &&
                                      !selectedMaterialTypeDefaults.default_material_group &&
                                      !selectedMaterialTypeDefaults.default_industry_sector && (
                                        <div className="text-blue-600 italic">No default values configured for this material type.</div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Base Unit <span className="text-red-500">*</span></label>
                          <Select
                            value={formData.base_unit}
                            onValueChange={(val) => setFormData({ ...formData, base_unit: val })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select base unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(allUom) && allUom.length > 0 ? (
                                (allUom as any[]).slice().sort((a: any, b: any) => String(a.code).localeCompare(String(b.code))).map((u: any) => (
                                  <SelectItem key={u.id} value={u.code}>{u.code} — {u.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No units available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Industry Sector {industrySectorsLoading ? "(Loading...)" : `(${industrySectors.length} available)`}</label>
                          <Select
                            value={formData.industry_sector && formData.industry_sector.trim() !== "" ? formData.industry_sector : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, industry_sector: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={industrySectorsLoading ? "Loading industry sectors..." : "Select industry sector"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {industrySectorsLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading industry sectors...
                                </SelectItem>
                              ) : industrySectors.length > 0 ? (
                                industrySectors.map((is: any) => (
                                  <SelectItem key={is.id} value={is.code}>
                                    {is.code} — {is.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none__" disabled>
                                  No industry sectors available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Material Group {materialGroupsLoading ? "(Loading...)" : `(${materialGroups.length} available)`}</label>
                          <Select
                            value={formData.material_group && formData.material_group.trim() !== "" ? formData.material_group : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, material_group: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={materialGroupsLoading ? "Loading material groups..." : "Select material group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {materialGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading material groups...
                                </SelectItem>
                              ) : materialGroups.length > 0 ? (
                                materialGroups.map((mg: any) => (
                                  <SelectItem key={mg.id} value={mg.code}>
                                    {mg.code} — {mg.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No material groups available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Gross Weight</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.gross_weight}
                            onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Net Weight</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.net_weight}
                            onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Weight Unit</label>
                          <Select
                            value={formData.weight_unit}
                            onValueChange={(val) => setFormData({ ...formData, weight_unit: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select weight unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(weightUoms) && weightUoms.length > 0 ? (
                                weightUoms.map((u: any) => (
                                  <SelectItem key={u.id} value={u.code}>{u.code} — {u.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No weight units available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Volume</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.volume}
                            onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Volume Unit</label>
                          <Select
                            value={formData.volume_unit}
                            onValueChange={(val) => setFormData({ ...formData, volume_unit: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select volume unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(allUom) && allUom.length > 0 ? (
                                (allUom as any[]).slice().sort((a: any, b: any) => String(a.code).localeCompare(String(b.code))).map((u: any) => (
                                  <SelectItem key={u.id} value={u.code}>{u.code} — {u.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No volume units available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">Active</label>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Plant</label>
                        <Select
                          value={formData.plant_code || ""}
                          onValueChange={(value) => {
                            setFormData({
                              ...formData,
                              plant_code: value
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select plant" />
                          </SelectTrigger>
                          <SelectContent>
                            {plantsLoading ? (
                              <SelectItem value="__loading__" disabled>
                                Loading plants...
                              </SelectItem>
                            ) : plants.length > 0 ? (
                              plants.map((plant: any) => (
                                <SelectItem key={plant.id} value={plant.code}>
                                  {plant.code} - {plant.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_plants__" disabled>
                                No plants available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Inventory Management Section */}
                      <div className="col-span-2 mt-6">
                        <h3 className="text-sm font-semibold mb-3 border-b pb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Inventory Management
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Min Stock</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.min_stock || ''}
                            onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                            min="0"
                            placeholder="Minimum stock level"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Max Stock</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.max_stock || ''}
                            onChange={(e) => setFormData({ ...formData, max_stock: parseFloat(e.target.value) || 0 })}
                            min="0"
                            placeholder="Maximum stock level"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reorder Point</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.reorder_point || ''}
                            onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })}
                            min="0"
                            placeholder="Reorder point level"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Safety Stock</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.safety_stock || ''}
                            onChange={(e) => setFormData({ ...formData, safety_stock: parseFloat(e.target.value) || 0 })}
                            min="0"
                            placeholder="Safety stock level"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Lead Time (Days)</label>
                          <Input
                            type="number"
                            value={formData.lead_time || ''}
                            onChange={(e) => setFormData({ ...formData, lead_time: parseInt(e.target.value) || 0 })}
                            min="0"
                            placeholder="Lead time in days"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* MRP View */}
                    <TabsContent value="mrp" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">MRP Type {mrpTypesLoading ? "(Loading...)" : `(${Array.isArray(mrpTypes) ? mrpTypes.length : 0} types)`}</label>
                          <Select
                            value={formData.mrp_type}
                            onValueChange={(val) => setFormData({ ...formData, mrp_type: val })}
                            disabled={mrpTypesLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={mrpTypesLoading ? "Loading MRP types..." : "Select MRP type"} />
                            </SelectTrigger>
                            <SelectContent>
                              {mrpTypesLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading MRP types...
                                </SelectItem>
                              ) : Array.isArray(mrpTypes) && mrpTypes.length > 0 ? (
                                (mrpTypes as any[]).slice().sort((a: any, b: any) => String(a.code).localeCompare(String(b.code))).map((mrpType: any) => (
                                  <SelectItem key={mrpType.id} value={mrpType.code}>
                                    {mrpType.code} — {mrpType.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No MRP types available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Procurement Type
                            {formData.mrp_type && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({formData.mrp_type === 'ND' || formData.mrp_type === 'VB' || formData.mrp_type === 'VM' ? 'Disabled for ' + formData.mrp_type : 'Required'})
                              </span>
                            )}
                          </label>
                          <Select
                            value={formData.procurement_type}
                            onValueChange={(val) => setFormData({ ...formData, procurement_type: val })}
                            disabled={getMrpFieldDisabled('procurement_type')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select procurement type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="F">F - External Procurement</SelectItem>
                              <SelectItem value="E">E - In-House Production</SelectItem>
                              <SelectItem value="X">X - Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">
                            Lot Size
                            {formData.mrp_type === 'ND' && (
                              <span className="text-xs text-muted-foreground ml-2">(Disabled for ND)</span>
                            )}
                          </label>
                          <Select
                            value={formData.lot_size}
                            onValueChange={(val) => setFormData({ ...formData, lot_size: val })}
                            disabled={getMrpFieldDisabled('lot_size')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select lot size" />
                            </SelectTrigger>
                            <SelectContent>
                              {lotSizeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            MRP Controller
                            {formData.mrp_type === 'ND' && (
                              <span className="text-xs text-muted-foreground ml-2">(Disabled for ND)</span>
                            )}
                          </label>
                          <Select
                            value={formData.mrp_controller}
                            onValueChange={(val) => setFormData({ ...formData, mrp_controller: val })}
                            disabled={getMrpFieldDisabled('mrp_controller') || mrpControllersLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={mrpControllersLoading ? "Loading MRP controllers..." : "Select MRP controller"} />
                            </SelectTrigger>
                            <SelectContent>
                              {mrpControllersLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading MRP controllers...
                                </SelectItem>
                              ) : Array.isArray(mrpControllers) && mrpControllers.length > 0 ? (
                                mrpControllers.map((controller: any) => (
                                  <SelectItem key={controller.controller_code} value={controller.controller_code}>
                                    {controller.controller_code} — {controller.controller_name || controller.description || 'N/A'}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No MRP controllers available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">
                            Reorder Point
                            {formData.mrp_type && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({formData.mrp_type === 'ND' ? 'Disabled for ND' : (formData.mrp_type === 'VB' || formData.mrp_type === 'VM') ? 'Enabled for ' + formData.mrp_type : 'Optional'})
                              </span>
                            )}
                          </label>
                          <Input
                            type="number"
                            value={formData.reorder_point || ''}
                            onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })}
                            min="0"
                            disabled={getMrpFieldDisabled('reorder_point')}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Safety Stock
                            {formData.mrp_type === 'ND' && (
                              <span className="text-xs text-muted-foreground ml-2">(Disabled for ND)</span>
                            )}
                          </label>
                          <Input
                            type="number"
                            value={formData.safety_stock || ''}
                            onChange={(e) => setFormData({ ...formData, safety_stock: parseFloat(e.target.value) || 0 })}
                            min="0"
                            disabled={getMrpFieldDisabled('safety_stock')}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {shouldShowDeliveryTime() && (
                          <div>
                            <label className="text-sm font-medium">
                              Planned Delivery Time (Days)
                              {formData.mrp_type && (formData.mrp_type === 'VB' || formData.mrp_type === 'VM' || formData.mrp_type === 'ND') && (
                                <span className="text-xs text-muted-foreground ml-2">(Disabled for {formData.mrp_type})</span>
                              )}
                            </label>
                            <Input
                              type="number"
                              value={formData.planned_delivery_time || ''}
                              onChange={(e) => setFormData({ ...formData, planned_delivery_time: parseFloat(e.target.value) || 0 })}
                              min="0"
                              disabled={getMrpFieldDisabled('planned_delivery_time')}
                              placeholder="Vendor delivery duration in days"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Work Scheduling View */}
                    <TabsContent value="work" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Production Storage Location {storageLocationsLoading ? "(Loading...)" : `(${storageLocations.length} available)`}</label>
                          <Select
                            value={formData.production_storage_location}
                            onValueChange={(val) => setFormData({ ...formData, production_storage_location: val })}
                            disabled={storageLocationsLoading || !formData.plant_code}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                formData.plant_code.length === 0
                                  ? "Select plant(s) first"
                                  : "Select storage location"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {storageLocationsLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading storage locations...
                                </SelectItem>
                              ) : storageLocations.length > 0 ? (
                                storageLocations.map((sl: any) => {
                                  const plant = plants.find((p: any) => p.id === sl.plantId);
                                  return (
                                    <SelectItem key={sl.id} value={sl.code}>
                                      {sl.code} - {sl.name} (Plant: {plant?.code || 'N/A'})
                                    </SelectItem>
                                  );
                                })
                              ) : (
                                <SelectItem value="__no_locations__" disabled>
                                  {formData.plant_code.length === 0
                                    ? "Select plant(s) first to see storage locations"
                                    : "No storage locations available for selected plant(s)"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {shouldShowProductionTime() && (
                          <div>
                            <label className="text-sm font-medium">
                              In-House Production Time (Days)
                              {formData.mrp_type && (formData.mrp_type === 'VB' || formData.mrp_type === 'VM' || formData.mrp_type === 'ND') && (
                                <span className="text-xs text-muted-foreground ml-2">(Disabled for {formData.mrp_type})</span>
                              )}
                            </label>
                            <Input
                              type="number"
                              value={formData.production_time || ''}
                              onChange={(e) => setFormData({ ...formData, production_time: parseFloat(e.target.value) || 0 })}
                              min="0"
                              disabled={getMrpFieldDisabled('production_time')}
                              placeholder="Days needed to produce"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Sales View */}
                    <TabsContent value="sales" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Sales Organization</label>
                          <Select
                            value={formData.sales_organization}
                            onValueChange={(val) => setFormData({ ...formData, sales_organization: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={salesOrganizationsLoading ? "Loading..." : "Select sales organization"} />
                            </SelectTrigger>
                            <SelectContent>
                              {salesOrganizationsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : salesOrganizations.length > 0 ? (
                                salesOrganizations.map((org: any) => (
                                  <SelectItem key={org.id} value={org.code}>
                                    {org.code} — {org.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No sales organizations available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Distribution Channel</label>
                          <Select
                            value={formData.distribution_channel}
                            onValueChange={(val) => setFormData({ ...formData, distribution_channel: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={distributionChannelsLoading ? "Loading..." : "Select distribution channel"} />
                            </SelectTrigger>
                            <SelectContent>
                              {distributionChannelsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : distributionChannels.length > 0 ? (
                                distributionChannels.map((channel: any) => (
                                  <SelectItem key={channel.id} value={channel.code}>
                                    {channel.code} — {channel.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No channels available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Division {divisionsLoading ? "(Loading...)" : `(${divisions.length})`}</label>
                          <Select
                            value={formData.division}
                            onValueChange={(val) => setFormData({ ...formData, division: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={divisionsLoading ? "Loading..." : "Select division"} />
                            </SelectTrigger>
                            <SelectContent>
                              {divisionsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : divisions.length > 0 ? (
                                divisions.map((div: any) => (
                                  <SelectItem key={div.id} value={div.code}>
                                    {div.code} — {div.description || div.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No divisions available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Material Group {materialGroupsLoading ? "(Loading...)" : `(${materialGroups.length} available)`}</label>
                          <Select
                            value={formData.material_group && formData.material_group.trim() !== "" ? formData.material_group : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, material_group: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={materialGroupsLoading ? "Loading material groups..." : "Select material group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {materialGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading material groups...
                                </SelectItem>
                              ) : materialGroups.length > 0 ? (
                                materialGroups.map((mg: any) => (
                                  <SelectItem key={mg.id} value={mg.code}>
                                    {mg.code} — {mg.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No material groups available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Item Category Group {itemCategoryGroupsLoading ? "(Loading...)" : `(${itemCategoryGroups.length} available)`}</label>
                          <Select
                            value={formData.item_category_group && formData.item_category_group.trim() !== "" ? formData.item_category_group : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, item_category_group: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={itemCategoryGroupsLoading ? "Loading..." : "Select item category group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {itemCategoryGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : itemCategoryGroups.length > 0 ? (
                                itemCategoryGroups.map((icg: any) => (
                                  <SelectItem key={icg.id} value={icg.code}>
                                    {icg.code} — {icg.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No groups available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Material Assignment Group {materialAssignmentGroupsLoading ? "(Loading...)" : `(${materialAssignmentGroups.length} available)`}</label>
                          <Select
                            value={formData.material_assignment_group_code && formData.material_assignment_group_code.trim() !== "" ? formData.material_assignment_group_code : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, material_assignment_group_code: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={materialAssignmentGroupsLoading ? "Loading..." : "Select material assignment group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {materialAssignmentGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : materialAssignmentGroups.length > 0 ? (
                                materialAssignmentGroups.map((mag: any) => (
                                  <SelectItem key={mag.id} value={mag.code}>
                                    {mag.code} — {mag.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No groups available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Loading Group {loadingGroupsLoading ? "(Loading...)" : `(${loadingGroups.length} available)`}</label>
                          <Select
                            value={formData.loading_group && formData.loading_group.trim() !== "" ? formData.loading_group : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, loading_group: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingGroupsLoading ? "Loading..." : "Select loading group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {loadingGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : loadingGroups.length > 0 ? (
                                loadingGroups.map((lg: any) => (
                                  <SelectItem key={lg.id} value={lg.code}>
                                    {lg.code} — {lg.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No groups available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Tax Classification</label>
                          <Select
                            value={formData.tax_classification_code || ""}
                            onValueChange={(val) => setFormData({ ...formData, tax_classification_code: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select classification" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxClassifications
                                .filter((tc: any) => tc.applies_to === 'BOTH' || tc.applies_to === 'MATERIAL')
                                .map((tc: any) => (
                                  <SelectItem key={tc.id} value={tc.code}>
                                    {tc.code} - {tc.description}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Purchasing View */}
                    <TabsContent value="purchasing" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Purchase Organization {purchaseOrganizationsLoading ? "(Loading...)" : `(${purchaseOrganizations.length})`}</label>
                          <Select
                            value={formData.purchase_organization}
                            onValueChange={(val) => setFormData({ ...formData, purchase_organization: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={purchaseOrganizationsLoading ? "Loading..." : "Select purchase org"} />
                            </SelectTrigger>
                            <SelectContent>
                              {purchaseOrganizationsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : purchaseOrganizations.length > 0 ? (
                                purchaseOrganizations.map((po: any) => (
                                  <SelectItem key={po.id} value={po.code}>
                                    {po.code} — {po.description || po.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No purchase organizations</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Purchase Group {purchaseGroupsLoading ? "(Loading...)" : `(${purchaseGroups.length})`}</label>
                          <Select
                            value={formData.purchasing_group}
                            onValueChange={(val) => setFormData({ ...formData, purchasing_group: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={purchaseGroupsLoading ? "Loading..." : "Select purchase group"} />
                            </SelectTrigger>
                            <SelectContent>
                              {purchaseGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                              ) : purchaseGroups.length > 0 ? (
                                purchaseGroups.map((pg: any) => (
                                  <SelectItem key={pg.id} value={pg.code}>
                                    {pg.code} — {pg.description || pg.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>No purchase groups</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Material Group {materialGroupsLoading ? "(Loading...)" : `(${materialGroups.length} available)`}</label>
                          <Select
                            value={formData.material_group && formData.material_group.trim() !== "" ? formData.material_group : "__none__"}
                            onValueChange={(val) => {
                              const newValue = val === "__none__" ? "" : val;
                              setFormData({ ...formData, material_group: newValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={materialGroupsLoading ? "Loading material groups..." : "Select material group"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {materialGroupsLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading material groups...
                                </SelectItem>
                              ) : materialGroups.length > 0 ? (
                                materialGroups.map((mg: any) => (
                                  <SelectItem key={mg.id} value={mg.code}>
                                    {mg.code} — {mg.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No material groups available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Accounting View */}
                    <TabsContent value="accounting" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Valuation Class {valuationClassesLoading ? "(Loading...)" : `(${getAvailableValuationClasses().length} available)`}</label>
                          <Select
                            value={formData.valuation_class || undefined}
                            onValueChange={(val) => {
                              if (val && !val.startsWith('__')) {
                                setFormData({ ...formData, valuation_class: val });
                              }
                            }}
                            disabled={valuationClassesLoading || !formData.material_type}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                !formData.material_type
                                  ? "Select material type first"
                                  : valuationClassesLoading
                                    ? "Loading..."
                                    : "Select valuation class"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {!formData.material_type ? (
                                <SelectItem value="__placeholder__" disabled>
                                  Please select a material type first
                                </SelectItem>
                              ) : valuationClassesLoading ? (
                                <SelectItem value="__loading__" disabled>
                                  Loading valuation classes...
                                </SelectItem>
                              ) : getAvailableValuationClasses().length > 0 ? (
                                getAvailableValuationClasses().map((vc: ValuationClass) => (
                                  <SelectItem key={vc.id} value={vc.class_code}>
                                    {vc.class_code} — {vc.class_name || vc.description || 'No name'}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  No valuation classes available for this material type
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {formData.valuation_class && !editingMaterial && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(() => {
                                const allowedTypes = getAllowedMaterialTypesForValuationClass(formData.valuation_class);
                                const selectedValuationClass = (valuationClasses as ValuationClass[])?.find(
                                  (vc) => vc.class_code === formData.valuation_class
                                );
                                const hasRestrictions = selectedValuationClass?.allowed_material_types &&
                                  selectedValuationClass.allowed_material_types.length > 0;

                                if (hasRestrictions && allowedTypes.length === 1) {
                                  return `✓ Material type "${allowedTypes[0]}" auto-selected`;
                                } else if (hasRestrictions && allowedTypes.length > 1) {
                                  return `Allowed types: ${allowedTypes.join(", ")}`;
                                }
                                return "All material types allowed";
                              })()}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Price Control</label>
                          <Select
                            value={formData.price_control}
                            onValueChange={(val) => setFormData({ ...formData, price_control: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select price control" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="S">S - Standard Price</SelectItem>
                              <SelectItem value="V">V - Moving Average</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Standard Price</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.base_price || ''}
                            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                            placeholder="Base unit price"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Profit Center</label>
                          <Select
                            value={formData.profit_center || "none"}
                            onValueChange={(val) => {
                              const actualValue = val === "none" ? "" : val;
                              setFormData({ ...formData, profit_center: actualValue });

                              // Auto-populate cost center when profit center is selected
                              if (actualValue) {
                                // Find the selected profit center
                                const selectedProfitCenter = profitCenters.find(
                                  (pc: any) => (pc.profit_center || pc.code || String(pc.id)) === actualValue
                                );

                                if (selectedProfitCenter && selectedProfitCenter.cost_center_code) {
                                  // Auto-fill cost center from profit center's linked cost center
                                  setFormData(prev => ({
                                    ...prev,
                                    profit_center: actualValue,
                                    cost_center: selectedProfitCenter.cost_center_code
                                  }));
                                } else {
                                  // No cost center linked to this profit center, just set profit center
                                  setFormData(prev => ({ ...prev, profit_center: actualValue, cost_center: "" }));
                                }
                              } else {
                                // If profit center is cleared, also clear cost center
                                setFormData(prev => ({ ...prev, profit_center: actualValue, cost_center: "" }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select profit center" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {profitCenters.map((pc: any) => (
                                <SelectItem key={pc.id} value={pc.profit_center || pc.code || String(pc.id)}>
                                  {pc.profit_center || pc.code || ""} - {pc.description || pc.name || ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Cost Center</label>
                          <Select
                            value={formData.cost_center || "none"}
                            onValueChange={(val) => {
                              const actualValue = val === "none" ? "" : val;
                              setFormData({ ...formData, cost_center: actualValue });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost center" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {costCenters.map((cc: any) => (
                                <SelectItem key={cc.id} value={cc.cost_center_code || cc.code || String(cc.id)}>
                                  {cc.cost_center_code || cc.code || ""} - {cc.description || cc.name || ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingMaterial ? "Update" : "Create"} Material
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

        </TabsContent>


        <TabsContent value="import" className="space-y-6">
          <MaterialMasterExcelImport />
        </TabsContent>
      </Tabs>

      {/* Material Details Dialog */}
      <Dialog open={isMaterialDetailsOpen} onOpenChange={setIsMaterialDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Details
            </DialogTitle>
          </DialogHeader>
          {viewingMaterialDetails && (
            <div className="overflow-y-auto max-h-[calc(90vh-150px)] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Material Code</p>
                      <p className="font-medium">{viewingMaterialDetails.material_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{viewingMaterialDetails.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Material Type</p>
                      <p className="font-medium">{viewingMaterialDetails.material_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Material Group</p>
                      <p className="font-medium">{viewingMaterialDetails.material_group || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Item Category Group</p>
                      <p className="font-medium">{viewingMaterialDetails.item_category_group || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Material Assignment Group</p>
                      <p className="font-medium">{viewingMaterialDetails.material_assignment_group_code || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry Sector</p>
                      <p className="font-medium">{viewingMaterialDetails.industry_sector || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Base Unit</p>
                      <p className="font-medium">{viewingMaterialDetails.base_unit || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={viewingMaterialDetails.is_active ? "default" : "secondary"}>
                        {viewingMaterialDetails.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Plant Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Plant Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plant</p>
                      <p className="font-medium">{viewingMaterialDetails.plant_code || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage Location</p>
                      <p className="font-medium">{viewingMaterialDetails.production_storage_location || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Inventory Parameters */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Inventory Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Min Stock</p>
                      <p className="font-medium">{viewingMaterialDetails.min_stock ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Max Stock</p>
                      <p className="font-medium">{viewingMaterialDetails.max_stock ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Time</p>
                      <p className="font-medium">{viewingMaterialDetails.lead_time ?? 0} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Safety Stock</p>
                      <p className="font-medium">{viewingMaterialDetails.safety_stock ?? 0}</p>
                    </div>
                  </div>
                </div>

                {/* MRP Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">MRP Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">MRP Type</p>
                      <p className="font-medium">{viewingMaterialDetails.mrp_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Procurement Type</p>
                      <p className="font-medium">{viewingMaterialDetails.procurement_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lot Size</p>
                      <p className="font-medium">{viewingMaterialDetails.lot_size || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reorder Point</p>
                      <p className="font-medium">{viewingMaterialDetails.reorder_point ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Safety Stock</p>
                      <p className="font-medium">{viewingMaterialDetails.safety_stock ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MRP Controller</p>
                      <p className="font-medium">{viewingMaterialDetails.mrp_controller || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage Location</p>
                      <p className="font-medium">{viewingMaterialDetails.production_storage_location || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Weight & Dimensions */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Weight & Dimensions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Weight</p>
                      <p className="font-medium">{viewingMaterialDetails.gross_weight ?? "N/A"} {viewingMaterialDetails.weight_unit || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Weight</p>
                      <p className="font-medium">{viewingMaterialDetails.net_weight ?? "N/A"} {viewingMaterialDetails.weight_unit || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Volume</p>
                      <p className="font-medium">{viewingMaterialDetails.volume ?? "N/A"} {viewingMaterialDetails.volume_unit || ""}</p>
                    </div>
                  </div>
                </div>

                {/* Accounting Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Accounting</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valuation Class</p>
                      <p className="font-medium">{viewingMaterialDetails.valuation_class || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Control</p>
                      <p className="font-medium">{viewingMaterialDetails.price_control || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Base Price</p>
                      <p className="font-medium">{viewingMaterialDetails.base_price ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit Center</p>
                      <p className="font-medium">{viewingMaterialDetails.profit_center || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Sales & Purchasing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Sales & Purchasing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sales Organization</p>
                      <p className="font-medium">{viewingMaterialDetails.sales_organization || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Distribution Channel</p>
                      <p className="font-medium">{viewingMaterialDetails.distribution_channel || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Division</p>
                      <p className="font-medium">{viewingMaterialDetails.division || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Organization</p>
                      <p className="font-medium">{viewingMaterialDetails.purchase_organization || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Purchasing Group</p>
                      <p className="font-medium">{viewingMaterialDetails.purchasing_group || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Item Category Group</p>
                      <p className="font-medium">{viewingMaterialDetails.item_category_group || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Material Acct Assignment Group</p>
                      <p className="font-medium">{viewingMaterialDetails.material_assignment_group_code || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loading Group</p>
                      <p className="font-medium">{viewingMaterialDetails.loading_group || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Classification</p>
                      <p className="font-medium">{viewingMaterialDetails.tax_classification_code || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Administrative Data */}
                <Collapsible
                  open={adminDataOpen}
                  onOpenChange={setAdminDataOpen}
                  className="border rounded-md p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Administrative Data</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        {adminDataOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle Administrative Data</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Created At</p>
                        <p className="font-medium">
                          {viewingMaterialDetails?.created_at
                            ? new Date(viewingMaterialDetails.created_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated At</p>
                        <p className="font-medium">
                          {viewingMaterialDetails?.updated_at
                            ? new Date(viewingMaterialDetails.updated_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tenant ID</p>
                        <p className="font-medium">{viewingMaterialDetails?._tenantId || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created By ID</p>
                        <p className="font-medium">{viewingMaterialDetails?.createdBy || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated By ID</p>
                        <p className="font-medium">{viewingMaterialDetails?.updatedBy || "N/A"}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => setIsMaterialDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsMaterialDetailsOpen(false);
                  handleEdit(viewingMaterialDetails);
                }}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Material
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}