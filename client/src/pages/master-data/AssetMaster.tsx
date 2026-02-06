import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Asset type (matches database schema)
type Asset = {
  id: number;
  asset_code?: string | null;
  name: string;
  description?: string | null;
  asset_class?: string | null;
  asset_class_id?: number | null;
  asset_class_code?: string | null;
  asset_class_name?: string | null;
  category?: string | null;
  acquisition_date?: string | null;
  acquisition_value?: number | null;
  current_value?: number | null;
  depreciation_method?: string | null;
  useful_life_years?: number | null;
  status?: string | null;
  location?: string | null;
  company_code_id?: number | null;
  cost_center_id?: number | null;
  company_code?: string | null;
  company_name?: string | null;
  cost_center_code?: string | null;
  cost_center_description?: string | null;
  active?: boolean;
};

// Asset Class type
type AssetClass = {
  id: number;
  code: string;
  name: string;
  description?: string;
  default_depreciation_method?: string;
  default_useful_life_years?: number;
  account_determination?: string;
  is_active: boolean;
};

// Company Code type
type CompanyCode = {
  id: number;
  code: string;
  name: string;
  active?: boolean;
};

// Cost Center type
type CostCenter = {
  id: number;
  cost_center: string;
  description?: string | null;
  company_code?: string | null;
  active?: boolean;
};

// Asset schema for form validation
const assetSchema = z.object({
  asset_code: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  asset_class_id: z.string().optional(),
  asset_class: z.string().optional(),
  category: z.string().optional(),
  acquisition_date: z.string().optional(),
  acquisition_value: z.string().optional().refine(
    (val) => !val || !isNaN(parseFloat(val)),
    "Must be a valid number"
  ),
  current_value: z.string().optional().refine(
    (val) => !val || !isNaN(parseFloat(val)),
    "Must be a valid number"
  ),
  depreciation_method: z.string().optional().refine(
    (val) => !val || val.length > 0,
    "Depreciation method must be valid"
  ),
  useful_life_years: z.string().optional().refine(
    (val) => !val || !isNaN(parseInt(val)),
    "Must be a valid number"
  ),
  status: z.string().optional(),
  location: z.string().optional(),
  company_code_id: z.string().optional(),
  cost_center_id: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

// Asset Master Management Page
export default function AssetMaster() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<Error | null>(null);
  
  // Fetch company codes and cost centers
  const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
  const [companyCodesLoading, setCompanyCodesLoading] = useState(true);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [costCentersLoading, setCostCentersLoading] = useState(true);

  // Fetch depreciation methods from API
  const { data: depreciationMethods = [], isLoading: depreciationMethodsLoading } = useQuery({
    queryKey: ['/api/master-data/depreciation-methods'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/depreciation-methods?is_active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch depreciation methods');
      }
      return response.json() as Promise<Array<{
        id: number;
        code: string;
        name: string;
        calculation_type: string;
        is_active: boolean;
      }>>;
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch asset classes from API
  const { data: assetClasses = [], isLoading: assetClassesLoading } = useQuery<AssetClass[]>({
    queryKey: ['/api/master-data/asset-classes'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/asset-classes?is_active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch asset classes');
      }
      return response.json();
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch data function
  const fetchData = async () => {
    try {
      setAssetsLoading(true);
      const response = await fetch("/api/master-data/assets", {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);
      setFilteredAssets(Array.isArray(data) ? data : []);
      setAssetsLoading(false);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setAssetsError(error instanceof Error ? error : new Error('Failed to fetch assets'));
      setAssetsLoading(false);
    }
  };

  // Fetch company codes
  const fetchCompanyCodes = async () => {
    try {
      setCompanyCodesLoading(true);
      const response = await fetch("/api/master-data/company-code", {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch company codes: ${response.status}`);
      }
      
      const data = await response.json();
      setCompanyCodes(Array.isArray(data) ? data.filter((cc: CompanyCode) => cc.active !== false) : []);
      setCompanyCodesLoading(false);
    } catch (error) {
      console.error("Error fetching company codes:", error);
      setCompanyCodesLoading(false);
    }
  };

  // Fetch cost centers
  const fetchCostCenters = async () => {
    try {
      setCostCentersLoading(true);
      const response = await fetch("/api/master-data/cost-center", {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cost centers: ${response.status}`);
      }
      
      const data = await response.json();
      setCostCenters(Array.isArray(data) ? data.filter((cc: CostCenter) => cc.active !== false) : []);
      setCostCentersLoading(false);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      setCostCentersLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchCompanyCodes();
    fetchCostCenters();
  }, []);

  // Filter assets based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAssets(assets);
    } else {
      setFilteredAssets(
        assets.filter(
          (asset) =>
            asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.asset_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.asset_class?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.company_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.cost_center_code?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, assets]);

  // Asset form setup
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_code: "",
      name: "",
      description: "",
      asset_class: "",
      category: "",
      acquisition_date: "",
      acquisition_value: "",
      current_value: "",
      depreciation_method: "",
      useful_life_years: "",
      status: "",
      location: "",
      company_code_id: "",
      cost_center_id: "",
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingAsset) {
      form.reset({
        asset_code: editingAsset.asset_code || "",
        name: editingAsset.name || "",
        description: editingAsset.description || "",
        asset_class_id: editingAsset.asset_class_id?.toString() || "",
        asset_class: editingAsset.asset_class_name || editingAsset.asset_class_code || editingAsset.asset_class || editingAsset.category || "",
        category: editingAsset.category || editingAsset.asset_class || "",
        acquisition_date: editingAsset.acquisition_date || "",
        acquisition_value: editingAsset.acquisition_value?.toString() || "",
        current_value: editingAsset.current_value?.toString() || "",
        depreciation_method: editingAsset.depreciation_method || undefined,
        useful_life_years: editingAsset.useful_life_years?.toString() || "",
        status: editingAsset.status || "",
        location: editingAsset.location || "",
        company_code_id: editingAsset.company_code_id?.toString() || "",
        cost_center_id: editingAsset.cost_center_id?.toString() || "",
      });
    } else {
      form.reset({
        asset_code: "",
        name: "",
        description: "",
        asset_class_id: "",
        asset_class: "",
        category: "",
        acquisition_date: "",
        acquisition_value: "",
        current_value: "",
        depreciation_method: undefined,
        useful_life_years: "",
        status: "",
        location: "",
        company_code_id: "",
        cost_center_id: "",
      });
    }
  }, [editingAsset, form]);

  // Auto-populate depreciation method and useful life when asset class is selected
  useEffect(() => {
    const assetClassId = form.watch('asset_class_id');
    if (assetClassId && !editingAsset) {
      const selectedClass = assetClasses.find(ac => String(ac.id) === assetClassId);
      if (selectedClass) {
        if (selectedClass.default_depreciation_method && !form.getValues('depreciation_method')) {
          form.setValue('depreciation_method', selectedClass.default_depreciation_method);
        }
        if (selectedClass.default_useful_life_years && !form.getValues('useful_life_years')) {
          form.setValue('useful_life_years', selectedClass.default_useful_life_years.toString());
        }
      }
    }
  }, [form.watch('asset_class_id'), assetClasses, editingAsset]);

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: (asset: AssetFormValues) => {
      return apiRequest(`/api/master-data/assets`, {
        method: "POST",
        body: JSON.stringify({
          asset_code: asset.asset_code || null,
          name: asset.name,
          description: asset.description || null,
          asset_class_id: asset.asset_class_id ? parseInt(asset.asset_class_id) : null,
          asset_class: asset.asset_class || asset.category || null,
          category: asset.category || asset.asset_class || null,
          acquisition_date: asset.acquisition_date || null,
          acquisition_value: asset.acquisition_value ? parseFloat(asset.acquisition_value) : null,
          current_value: asset.current_value ? parseFloat(asset.current_value) : null,
          depreciation_method: asset.depreciation_method || null,
          useful_life_years: asset.useful_life_years ? parseInt(asset.useful_life_years) : null,
          status: asset.status || null,
          location: asset.location || null,
          company_code_id: asset.company_code_id ? parseInt(asset.company_code_id) : null,
          cost_center_id: asset.cost_center_id ? parseInt(asset.cost_center_id) : null,
        })
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Failed to create asset");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
      setEditingAsset(null);
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create asset",
        variant: "destructive",
      });
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: (data: { id: number; asset: AssetFormValues }) => {
      return apiRequest(`/api/master-data/assets/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          asset_code: data.asset.asset_code || null,
          name: data.asset.name,
          description: data.asset.description || null,
          asset_class_id: data.asset.asset_class_id ? parseInt(data.asset.asset_class_id) : null,
          asset_class: data.asset.asset_class || data.asset.category || null,
          category: data.asset.category || data.asset.asset_class || null,
          acquisition_date: data.asset.acquisition_date || null,
          acquisition_value: data.asset.acquisition_value ? parseFloat(data.asset.acquisition_value) : null,
          current_value: data.asset.current_value ? parseFloat(data.asset.current_value) : null,
          depreciation_method: data.asset.depreciation_method || null,
          useful_life_years: data.asset.useful_life_years ? parseInt(data.asset.useful_life_years) : null,
          status: data.asset.status || null,
          location: data.asset.location || null,
          company_code_id: data.asset.company_code_id ? parseInt(data.asset.company_code_id) : null,
          cost_center_id: data.asset.cost_center_id ? parseInt(data.asset.cost_center_id) : null,
        }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Asset updated successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
      setEditingAsset(null);
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update asset",
        variant: "destructive",
      });
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/assets/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      fetchData();
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  // Form submit handler
  const onSubmit = (values: AssetFormValues) => {
    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, asset: values });
    } else {
      createAssetMutation.mutate(values);
    }
  };

  // Handle edit
  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowDialog(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  // Handle export
  const handleExport = () => {
    if (filteredAssets.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no assets to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredAssets.map(asset => ({
      'Asset Code': asset.asset_code || '',
      'Name': asset.name || '',
      'Description': asset.description || '',
      'Asset Class': asset.asset_class_name || asset.asset_class_code || asset.asset_class || asset.category || '',
      'Company Code': asset.company_code || '',
      'Company Name': asset.company_name || '',
      'Cost Center': asset.cost_center_code || '',
      'Cost Center Description': asset.cost_center_description || '',
      'Acquisition Date': asset.acquisition_date || '',
      'Acquisition Value': asset.acquisition_value || 0,
      'Current Value': asset.current_value || 0,
      'Depreciation Method': asset.depreciation_method || '',
      'Useful Life (Years)': asset.useful_life_years || '',
      'Status': asset.status || '',
      'Location': asset.location || ''
    }));

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredAssets.length} assets to CSV file.`,
    });
  };

  // Refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest assets...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Assets have been updated successfully.",
    });
  };

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format depreciation method
  const formatDepreciationMethod = (method: string | null | undefined) => {
    if (!method) return "-";
    return method.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Check for errors
  if (assetsError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(assetsError as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Asset Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage fixed assets and depreciation rules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.hasDataModificationRights ? (
            <>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button onClick={() => { setEditingAsset(null); setShowDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            </>
          ) : (
            <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
              {permissions.getRestrictedMessage()}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={assetsLoading}
          title="Refresh assets data"
        >
          <RefreshCw className={`h-4 w-4 ${assetsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>
            All registered fixed assets in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Asset Class</TableHead>
                    <TableHead className="hidden md:table-cell">Company Code</TableHead>
                    <TableHead className="hidden md:table-cell">Cost Center</TableHead>
                    <TableHead className="hidden lg:table-cell">Acquisition Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Acquisition Value</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">
                        No assets found. {searchQuery ? "Try a different search." : "Create your first asset."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_code || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            {asset.description && (
                              <div className="text-xs text-muted-foreground">{asset.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{asset.asset_class_name || asset.asset_class_code || asset.asset_class || asset.category || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {asset.company_code ? (
                            <div>
                              <div className="font-medium">{asset.company_code}</div>
                              {asset.company_name && (
                                <div className="text-xs text-muted-foreground">{asset.company_name}</div>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {asset.cost_center_code ? (
                            <div>
                              <div className="font-medium">{asset.cost_center_code}</div>
                              {asset.cost_center_description && (
                                <div className="text-xs text-muted-foreground">{asset.cost_center_description}</div>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(asset.acquisition_date)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatCurrency(asset.acquisition_value)}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              asset.status === 'active' || asset.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {asset.status === 'active' || asset.active ? "Active" : asset.status || "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {permissions.hasDataModificationRights ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(asset)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(asset.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              {permissions.label}
                            </span>
                          )}
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

      {/* Asset Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Edit Asset" : "Create Asset"}
            </DialogTitle>
            <DialogDescription>
              {editingAsset
                ? "Update the asset details below"
                : "Add a new fixed asset to your organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="asset_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., AST-001" 
                            {...field} 
                            disabled={!!editingAsset}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique code for this asset (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., Office Building" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Name of the asset
                        </FormDescription>
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
                        <Input 
                          placeholder="Brief description of this asset" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="asset_class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Class</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedClass = assetClasses.find(ac => String(ac.id) === value);
                            if (selectedClass && !editingAsset) {
                              if (selectedClass.default_depreciation_method) {
                                form.setValue('depreciation_method', selectedClass.default_depreciation_method);
                              }
                              if (selectedClass.default_useful_life_years) {
                                form.setValue('useful_life_years', selectedClass.default_useful_life_years.toString());
                              }
                            }
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assetClassesLoading ? (
                              <SelectItem value="loading-ac" disabled>Loading asset classes...</SelectItem>
                            ) : assetClasses.length === 0 ? (
                              <SelectItem value="no-ac" disabled>No asset classes available</SelectItem>
                            ) : (
                              assetClasses.map((ac) => (
                                <SelectItem key={ac.id} value={ac.id.toString()}>
                                  {ac.code} - {ac.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Classification of the asset (auto-fills depreciation defaults)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., Main Office, Warehouse A" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_code_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Code</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companyCodesLoading ? (
                              <SelectItem value="loading-cc" disabled>Loading company codes...</SelectItem>
                            ) : companyCodes.length === 0 ? (
                              <SelectItem value="no-cc" disabled>No company codes available</SelectItem>
                            ) : (
                              companyCodes.map((cc) => (
                                <SelectItem key={cc.id} value={cc.id.toString()}>
                                  {cc.code} - {cc.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_center_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Center</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost center" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {costCentersLoading ? (
                              <SelectItem value="loading-ctr" disabled>Loading cost centers...</SelectItem>
                            ) : costCenters.length === 0 ? (
                              <SelectItem value="no-ctr" disabled>No cost centers available</SelectItem>
                            ) : (
                              costCenters.map((cc) => (
                                <SelectItem key={cc.id} value={cc.id.toString()}>
                                  {cc.cost_center} - {cc.description || ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="acquisition_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acquisition Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depreciation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depreciation Method</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                          disabled={depreciationMethodsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                depreciationMethodsLoading 
                                  ? "Loading methods..." 
                                  : depreciationMethods.length === 0
                                  ? "No methods available"
                                  : "Select depreciation method"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {depreciationMethodsLoading ? (
                              <SelectItem value="loading-dm" disabled>Loading depreciation methods...</SelectItem>
                            ) : depreciationMethods.length === 0 ? (
                              <SelectItem value="no-dm" disabled>No methods available</SelectItem>
                            ) : (
                              depreciationMethods
                                .filter(method => method.is_active)
                                .map((method) => (
                                  <SelectItem key={method.id} value={method.code}>
                                    {method.name} ({method.code})
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {depreciationMethods.length > 0 
                            ? `Select from ${depreciationMethods.filter(m => m.is_active).length} available methods`
                            : "No active depreciation methods found. Create methods in Depreciation Methods master data."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="useful_life_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Useful Life (Years)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="E.g., 10" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Expected useful life in years
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="acquisition_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acquisition Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="current_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="disposed">Disposed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDialog(false);
                      setEditingAsset(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                  >
                    {createAssetMutation.isPending || updateAssetMutation.isPending
                      ? "Saving..."
                      : editingAsset
                      ? "Update Asset"
                      : "Create Asset"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
