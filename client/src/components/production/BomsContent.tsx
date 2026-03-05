import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download, Plus, Loader2, ChevronDown, ChevronRight, Trash2, Edit, ArrowLeft, Eye, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BOM {
  id: number;
  bom_number?: string;
  bom_code?: string;
  product_name: string | null;
  material_code?: string | null;
  description: string | null;
  bom_version?: string;
  version?: string;
  effective_date?: string;
  valid_from?: string;
  status?: string;
  bom_status?: string;
  components: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
  _tenantId?: string | null;
  _deletedAt?: string | null;
}

interface BOMItem {
  id: number;
  bom_id: number;
  material_id: number;
  material_code: string | null;
  material_name: string | null;
  quantity: number;
  unit_cost: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export default function BomsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewBomForm, setShowNewBomForm] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [viewingBom, setViewingBom] = useState<BOM | null>(null);
  const [showViewBomDialog, setShowViewBomDialog] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const [expandedBoms, setExpandedBoms] = useState<Set<number>>(new Set());
  const [selectedBomForItems, setSelectedBomForItems] = useState<number | null>(null);
  const [showNewBomItemForm, setShowNewBomItemForm] = useState(false);
  const [selectedBomForNewItem, setSelectedBomForNewItem] = useState<number | null>(null);
  const [editingBomItem, setEditingBomItem] = useState<BOMItem | null>(null);
  const [newBomItem, setNewBomItem] = useState({
    material_id: "",
    quantity: "",
    unit_cost: "",
    is_active: true
  });
  const [newBom, setNewBom] = useState({
    bom_code: "",
    material_code: "",
    plant_code: "",
    version: "",
    description: "",
    base_quantity: "",
    base_unit: "",
    product_name: "",
    uom: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch BOMs from API
  const { data: bomsData = [], isLoading: bomsLoading, refetch: refetchBoms } = useQuery<BOM[]>({
    queryKey: ["/api/master-data/bom"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/bom");
      if (!response.ok) {
        throw new Error("Failed to fetch bill of materials");
      }
      return await response.json();
    },
  });

  // Fetch unique statuses for filter
  const { data: statuses = [] } = useQuery<string[]>({
    queryKey: ["/api/master-data/bom/statuses"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/bom/statuses");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Fetch BOM items for selected BOM
  const { data: bomItems = [], isLoading: bomItemsLoading } = useQuery<BOMItem[]>({
    queryKey: ["/api/master-data/bom/items", selectedBomForItems],
    queryFn: async () => {
      if (!selectedBomForItems) return [];
      const response = await apiRequest(`/api/master-data/bom/${selectedBomForItems}/items`);
      if (!response.ok) {
        throw new Error("Failed to fetch BOM items");
      }
      return await response.json();
    },
    enabled: selectedBomForItems !== null,
  });

  // Fetch materials for dropdown
  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/material"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/material");
      if (!response.ok) {
        throw new Error("Failed to fetch materials");
      }
      const data = await response.json();
      // Debug: Log first material to check structure
      if (data && data.length > 0) {
        console.log("Materials API response sample:", data[0]);
        console.log("Base unit field:", data[0].base_unit, "Base UOM field:", data[0].base_uom);
      }
      return data;
    },
  });

  // Fetch plants for dropdown
  const { data: plants = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/plant"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/plant");
      if (!response.ok) {
        throw new Error("Failed to fetch plants");
      }
      return await response.json();
    },
  });

  // Toggle BOM expansion
  const toggleBomExpansion = (bomId: number) => {
    const newExpanded = new Set(expandedBoms);
    if (newExpanded.has(bomId)) {
      newExpanded.delete(bomId);
      setSelectedBomForItems(null);
    } else {
      newExpanded.add(bomId);
      setSelectedBomForItems(bomId);
    }
    setExpandedBoms(newExpanded);
  };

  // Handle edit BOM
  const handleEditBom = (bom: BOM) => {
    setEditingBom(bom);
    setNewBom({
      bom_code: bom.bom_code || bom.bom_number || "",
      material_code: bom.material_code || "",
      plant_code: "", // Will need to fetch from API
      version: bom.bom_version || bom.version || "",
      description: bom.description || "",
      base_quantity: "",
      base_unit: "",
      product_name: bom.product_name || "",
      uom: ""
    });
    setShowNewBomForm(true);
  };

  // Handle delete BOM
  const handleDeleteBom = async (bomId: number, bomCode: string) => {
    if (!confirm(`Are you sure you want to delete BOM "${bomCode}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/master-data/bom/${bomId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "BOM deleted successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete BOM");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete BOM",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingBom(null);
    setNewBom({
      bom_code: "",
      material_code: "",
      plant_code: "",
      version: "",
      description: "",
      base_quantity: "",
      base_unit: "",
      product_name: "",
      uom: ""
    });
    setShowNewBomForm(false);
  };

  // Transform BOM data to match component expectations
  const boms: (BOM & {
    bom_code: string;
    material_code: string;
    bom_version: string;
    valid_from: string;
    bom_status: string;
  })[] = bomsData.map(bom => ({
    ...bom,
    bom_number: bom.bom_number || bom.bom_code || "",
    bom_code: bom.bom_code || bom.bom_number || "",
    product_name: bom.product_name || bom.material_code || "",
    material_code: bom.material_code || "",
    description: bom.description || "",
    version: bom.bom_version || bom.version || "",
    bom_version: bom.bom_version || bom.version || "",
    effective_date: bom.effective_date || bom.valid_from || "",
    valid_from: bom.valid_from || bom.effective_date || "",
    status: bom.status || bom.bom_status || "Inactive",
    bom_status: bom.bom_status || bom.status || "Inactive",
    components: bom.components || 0,
    created_at: bom.created_at,
    updated_at: bom.updated_at,
    created_by: bom.created_by,
    updated_by: bom.updated_by,
    _tenantId: bom._tenantId,
    _deletedAt: bom._deletedAt
  }));

  const filteredBoms = boms.filter(bom => {
    const matchesSearch =
      (bom.bom_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (bom.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (bom.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (bom.status?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === "all" || bom.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 text-white">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Draft</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'obsolete':
        return <Badge variant="outline">Obsolete</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const [location] = useLocation();
  const isMasterDataRoute = location.includes('/master-data');
  const backPath = isMasterDataRoute ? '/master-data' : '/production';

  return (
    <div className="space-y-6">
      {/* Back Button - Only show if accessed from master-data routes */}
      {isMasterDataRoute && (
        <div className="flex items-center">
          <Link href={backPath}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Master Data
            </Button>
          </Link>
        </div>
      )}
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bill of materials..."
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredBoms.length === 0) {
                toast({
                  title: "No Data",
                  description: "No bill of materials to export",
                  variant: "destructive",
                });
                return;
              }

              const csvContent = filteredBoms.map(bom => ({
                BOMNumber: bom.bom_number || "",
                Product: bom.product_name || "",
                Version: bom.version || "",
                Description: bom.description || "",
                Status: bom.status || "",
                Components: bom.components || 0,
                EffectiveDate: formatDate(bom.effective_date)
              }));

              const csvString = [
                Object.keys(csvContent[0]).join(','),
                ...csvContent.map(row => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'bill-of-materials.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filteredBoms.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showNewBomForm} onOpenChange={setShowNewBomForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New BOM
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBom ? "Edit Bill of Materials" : "Create New Bill of Materials"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bom_code">BOM Code *</Label>
                  <Input
                    id="bom_code"
                    value={newBom.bom_code}
                    onChange={(e) => setNewBom({ ...newBom, bom_code: e.target.value })}
                    placeholder={editingBom ? "BOM code" : "Auto-generated when material is selected"}
                    disabled={!editingBom}
                    readOnly={!editingBom}
                    className={!editingBom ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {!editingBom && (
                    <p className="text-xs text-muted-foreground mt-1">
                      BOM code will be automatically generated based on the selected material
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="material_code">Material *</Label>
                  <Select
                    value={newBom.material_code}
                    onValueChange={(value) => {
                      const selectedMaterial = (materials as any[]).find(
                        (m: any) => m.material_code === value
                      );
                      if (selectedMaterial) {
                        // Auto-fill base unit from material - check multiple possible field names
                        const baseUnit = selectedMaterial.base_unit ||
                          selectedMaterial.base_uom ||
                          selectedMaterial.uom ||
                          (selectedMaterial as any).baseUnit ||
                          "";
                        console.log("Selected material:", selectedMaterial);
                        console.log("Base unit value:", baseUnit);
                        console.log("All material fields:", Object.keys(selectedMaterial));

                        // Auto-generate BOM code if not editing
                        let autoGeneratedBomCode = "";
                        if (!editingBom) {
                          // Generate BOM code: BOM-{MATERIAL_CODE}-{TIMESTAMP}
                          const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
                          autoGeneratedBomCode = `BOM-${value}-${timestamp}`;
                        }

                        // Force update with base unit and auto-generated BOM code
                        setNewBom(prev => ({
                          ...prev,
                          material_code: value,
                          base_unit: baseUnit,
                          uom: baseUnit,
                          bom_code: editingBom ? prev.bom_code : autoGeneratedBomCode,
                        }));
                      } else {
                        console.warn("Material not found for code:", value);
                        setNewBom(prev => ({
                          ...prev,
                          material_code: value,
                          bom_code: editingBom ? prev.bom_code : "",
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(materials) && materials.length > 0 ? (
                        materials.map((material: any) => (
                          <SelectItem key={material.id} value={material.material_code}>
                            {material.material_code} - {material.description || material.name || "N/A"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_materials__" disabled>No materials available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plant_code">Plant *</Label>
                  <Select
                    value={newBom.plant_code}
                    onValueChange={(value) => setNewBom({ ...newBom, plant_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(plants) && plants.length > 0 ? (
                        plants
                          .filter((plant: any) => plant.isActive !== false)
                          .map((plant: any) => (
                            <SelectItem key={plant.id} value={plant.code}>
                              {plant.code} - {plant.name || plant.description || "N/A"}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_plants__" disabled>No plants available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={newBom.version}
                    onChange={(e) => setNewBom({ ...newBom, version: e.target.value })}
                    placeholder="Enter BOM version (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newBom.description}
                    onChange={(e) => setNewBom({ ...newBom, description: e.target.value })}
                    placeholder="Enter BOM description (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="base_quantity">Base Quantity</Label>
                  <Input
                    id="base_quantity"
                    type="number"
                    value={newBom.base_quantity}
                    onChange={(e) => setNewBom({ ...newBom, base_quantity: e.target.value })}
                    placeholder="Enter base quantity (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="base_unit">Base Unit</Label>
                  <Input
                    id="base_unit"
                    value={newBom.base_unit || newBom.uom || ""}
                    onChange={(e) => {
                      if (!newBom.material_code) {
                        // Only allow manual edit if no material is selected
                        setNewBom({ ...newBom, base_unit: e.target.value, uom: e.target.value });
                      }
                    }}
                    placeholder={newBom.material_code ? "Auto-filled from material" : "Enter unit of measure"}
                    readOnly={!!newBom.material_code}
                    className={newBom.material_code ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {newBom.material_code && !newBom.base_unit && !newBom.uom && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ Selected material does not have a base unit defined
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={async () => {
                    try {
                      // Validate required fields
                      if (!newBom.material_code) {
                        toast({
                          title: "Validation Error",
                          description: "Please select a material",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (!newBom.plant_code) {
                        toast({
                          title: "Validation Error",
                          description: "Please select a plant",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Auto-generate BOM code if not provided and not editing
                      let bomCode = newBom.bom_code;
                      if (!bomCode && !editingBom && newBom.material_code) {
                        const timestamp = Date.now().toString().slice(-6);
                        bomCode = `BOM-${newBom.material_code}-${timestamp}`;
                      }

                      const bomData = {
                        bom_code: bomCode || `BOM-${newBom.material_code}`,
                        material_code: newBom.material_code,
                        plant_code: newBom.plant_code,
                        bom_version: newBom.version || undefined,
                        base_quantity: newBom.base_quantity ? parseFloat(newBom.base_quantity) : undefined,
                        base_unit: newBom.base_unit || newBom.uom || undefined,
                        valid_from: editingBom ? undefined : new Date().toISOString().split('T')[0],
                        is_active: true
                      };

                      if (editingBom) {
                        // Update existing BOM
                        const response = await apiRequest(`/api/master-data/bom/${editingBom.id}`, {
                          method: "PATCH",
                          body: JSON.stringify(bomData),
                        });

                        if (response.ok) {
                          toast({
                            title: "Success",
                            description: "BOM updated successfully",
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
                          resetForm();
                        } else {
                          const errorData = await response.json();
                          throw new Error(errorData.message || "Failed to update BOM");
                        }
                      } else {
                        // Create new BOM
                        const response = await apiRequest("/api/master-data/bom", {
                          method: "POST",
                          body: JSON.stringify(bomData),
                        });

                        if (response.ok) {
                          toast({
                            title: "Success",
                            description: "BOM created successfully",
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
                          resetForm();
                        } else {
                          const errorData = await response.json();
                          throw new Error(errorData.message || "Failed to create BOM");
                        }
                      }
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || (editingBom ? "Failed to update BOM" : "Failed to create BOM"),
                        variant: "destructive",
                      });
                    }
                  }}>
                    {editingBom ? "Update BOM" : "Create BOM"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* View Details Dialog */}
          <Dialog open={showViewBomDialog} onOpenChange={setShowViewBomDialog}>
            <DialogContent className="sm:max-w-[600px]">
              {viewingBom && (
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle>Bill of Materials Details</DialogTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowViewBomDialog(false);
                          handleEditBom(viewingBom);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{viewingBom.product_name || viewingBom.material_code || "N/A"}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-white">{viewingBom.bom_number || viewingBom.bom_code}</span>
                          {getStatusBadge(viewingBom.status || viewingBom.bom_status || "")}
                        </div>
                      </div>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">General Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Version</span>
                            <p className="font-medium mt-1">{viewingBom.version || viewingBom.bom_version || "—"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Effective Date</span>
                            <p className="font-medium mt-1">{formatDate(viewingBom.effective_date || viewingBom.valid_from)}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-muted-foreground">Description</span>
                            <p className="font-medium mt-1">{viewingBom.description || "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Created At</h4>
                        <p>{viewingBom.created_at ? new Date(viewingBom.created_at).toLocaleString() : "—"}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-500">Updated At</h4>
                        <p>{viewingBom.updated_at ? new Date(viewingBom.updated_at).toLocaleString() : "—"}</p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setAdminDataOpen(o => !o)}
                      >
                        {adminDataOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <Info className="h-3 w-3" />
                        Administrative Data
                      </button>
                      {adminDataOpen && (
                        <dl className="mt-2 grid grid-cols-1 gap-y-1 text-xs text-gray-400">
                          <div><dt className="font-medium inline">Created By (ID): </dt><dd className="inline">{viewingBom.created_by ?? "—"}</dd></div>
                          <div><dt className="font-medium inline">Updated By (ID): </dt><dd className="inline">{viewingBom.updated_by ?? "—"}</dd></div>
                          <div><dt className="font-medium inline">Tenant ID: </dt><dd className="inline">{viewingBom._tenantId ?? "—"}</dd></div>
                        </dl>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status.toLowerCase()}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOMs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {bomsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading bill of materials...</p>
            </div>
          ) : filteredBoms.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>BOM Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoms.map((bom) => (
                    <React.Fragment key={bom.id}>
                      <TableRow
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="w-8">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBomExpansion(bom.id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedBoms.has(bom.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{bom.bom_number || bom.bom_code || "N/A"}</TableCell>
                        <TableCell>{bom.product_name || bom.material_code || "N/A"}</TableCell>
                        <TableCell>{bom.description || "N/A"}</TableCell>
                        <TableCell>{bom.version || bom.bom_version || "N/A"}</TableCell>
                        <TableCell>{formatDate(bom.effective_date || bom.valid_from)}</TableCell>
                        <TableCell>{bom.components || 0}</TableCell>
                        <TableCell>{getStatusBadge(bom.status || bom.bom_status || "")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingBom(bom);
                                setShowViewBomDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBom(bom);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBom(bom.id, bom.bom_number || bom.bom_code || "");
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedBoms.has(bom.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 bg-muted/30">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm">BOM Components</h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBomForNewItem(bom.id);
                                    setNewBomItem({
                                      material_id: "",
                                      quantity: "",
                                      unit_cost: "",
                                      is_active: true
                                    });
                                    setShowNewBomItemForm(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Component
                                </Button>
                              </div>
                              {bomItemsLoading ? (
                                <div className="text-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                  <p className="text-sm text-muted-foreground mt-2">Loading components...</p>
                                </div>
                              ) : bomItems.length > 0 ? (
                                <div className="border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Material Code</TableHead>
                                        <TableHead>Material Name</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                        <TableHead className="w-20">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {bomItems.map((item, index) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                          <TableCell className="font-medium">{item.material_code || "N/A"}</TableCell>
                                          <TableCell>{item.material_name || "N/A"}</TableCell>
                                          <TableCell className="text-right">{parseFloat(item.quantity.toString()).toFixed(3)}</TableCell>
                                          <TableCell className="text-right">
                                            {item.unit_cost ? `$${parseFloat(item.unit_cost.toString()).toFixed(2)}` : "N/A"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {item.unit_cost
                                              ? `$${(parseFloat(item.quantity.toString()) * parseFloat(item.unit_cost.toString())).toFixed(2)}`
                                              : "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex gap-1">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingBomItem(item);
                                                  setNewBomItem({
                                                    material_id: item.material_id.toString(),
                                                    quantity: item.quantity.toString(),
                                                    unit_cost: item.unit_cost ? item.unit_cost.toString() : "",
                                                    is_active: item.is_active ?? true
                                                  });
                                                  setShowNewBomItemForm(true);
                                                }}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (confirm("Are you sure you want to delete this component?")) {
                                                    try {
                                                      const response = await apiRequest(`/api/master-data/bom/items/${item.id}`, {
                                                        method: "DELETE",
                                                      });
                                                      if (response.ok) {
                                                        toast({
                                                          title: "Success",
                                                          description: "Component deleted successfully",
                                                        });
                                                        queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom/items", bom.id] });
                                                        queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
                                                      } else {
                                                        throw new Error("Failed to delete");
                                                      }
                                                    } catch (error) {
                                                      toast({
                                                        title: "Error",
                                                        description: "Failed to delete component",
                                                        variant: "destructive",
                                                      });
                                                    }
                                                  }
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-6 text-sm text-muted-foreground border rounded-md">
                                  No components found for this BOM. Click "Add Component" to add one.
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm || statusFilter !== "all"
                ? 'No bill of materials match your filters.'
                : 'No bill of materials found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit BOM Item Dialog */}
      <Dialog open={showNewBomItemForm} onOpenChange={(open) => {
        setShowNewBomItemForm(open);
        if (!open) {
          setEditingBomItem(null);
          setSelectedBomForNewItem(null);
          setNewBomItem({
            material_id: "",
            quantity: "",
            unit_cost: "",
            is_active: true
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBomItem ? "Edit BOM Component" : "Add BOM Component"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_material">Material *</Label>
              <Select
                value={newBomItem.material_id}
                onValueChange={(value) => {
                  const selectedMaterial = materials?.find((m: any) => m.id.toString() === value);
                  const basePrice = selectedMaterial?.base_price;
                  const basePriceNum = basePrice != null ? parseFloat(basePrice.toString()) : null;

                  setNewBomItem({
                    ...newBomItem,
                    material_id: value,
                    // Auto-fill unit cost from material's base price
                    unit_cost: (basePriceNum != null && !isNaN(basePriceNum)) ? basePriceNum.toString() : newBomItem.unit_cost
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(materials) && materials.length > 0 ? (
                    materials.map((material: any) => (
                      <SelectItem key={material.id} value={material.id.toString()}>
                        {material.material_code} - {material.description || material.name || "N/A"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_materials__" disabled>No materials available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="item_quantity">Quantity *</Label>
              <Input
                id="item_quantity"
                type="number"
                step="0.001"
                min="0.001"
                value={newBomItem.quantity}
                onChange={(e) => setNewBomItem({ ...newBomItem, quantity: e.target.value })}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <Label htmlFor="item_unit_cost">Unit Cost (Base Price)</Label>
              <Input
                id="item_unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={newBomItem.unit_cost}
                onChange={(e) => setNewBomItem({ ...newBomItem, unit_cost: e.target.value })}
                placeholder="Auto-filled from material base price"
              />
              {newBomItem.material_id && (() => {
                const selectedMaterial = materials?.find((m: any) => m.id.toString() === newBomItem.material_id);
                const basePrice = selectedMaterial?.base_price;
                const basePriceNum = basePrice != null ? parseFloat(basePrice.toString()) : null;
                const currentUnitCost = parseFloat(newBomItem.unit_cost || "0");

                if (basePriceNum != null && !isNaN(basePriceNum) && currentUnitCost !== basePriceNum) {
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      Material base price: ${basePriceNum.toFixed(2)}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="item_is_active"
                checked={newBomItem.is_active}
                onChange={(e) => setNewBomItem({ ...newBomItem, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="item_is_active" className="cursor-pointer">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowNewBomItemForm(false);
                setEditingBomItem(null);
                setSelectedBomForNewItem(null);
                setNewBomItem({
                  material_id: "",
                  quantity: "",
                  unit_cost: "",
                  is_active: true
                });
              }}>
                Cancel
              </Button>
              <Button onClick={async () => {
                try {
                  // Validation
                  if (!newBomItem.material_id) {
                    toast({
                      title: "Validation Error",
                      description: "Please select a material",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!newBomItem.quantity || parseFloat(newBomItem.quantity) <= 0) {
                    toast({
                      title: "Validation Error",
                      description: "Please enter a valid quantity greater than 0",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (editingBomItem) {
                    // Update existing BOM item
                    if (!editingBomItem.id) {
                      toast({
                        title: "Validation Error",
                        description: "Invalid BOM item ID",
                        variant: "destructive",
                      });
                      return;
                    }

                    const response = await apiRequest(`/api/master-data/bom/items/${editingBomItem.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        material_id: parseInt(newBomItem.material_id),
                        quantity: parseFloat(newBomItem.quantity),
                        unit_cost: newBomItem.unit_cost ? parseFloat(newBomItem.unit_cost) : null,
                        is_active: newBomItem.is_active
                      }),
                    });

                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Component updated successfully",
                      });
                      // Invalidate queries for the BOM that contains this item
                      if (editingBomItem.bom_id) {
                        queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom/items", editingBomItem.bom_id] });
                      }
                      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
                      setShowNewBomItemForm(false);
                      setEditingBomItem(null);
                      setSelectedBomForNewItem(null);
                      setNewBomItem({
                        material_id: "",
                        quantity: "",
                        unit_cost: "",
                        is_active: true
                      });
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.message || "Failed to update component");
                    }
                  } else {
                    // Create new BOM item
                    if (!selectedBomForNewItem) {
                      toast({
                        title: "Validation Error",
                        description: "BOM not selected",
                        variant: "destructive",
                      });
                      return;
                    }

                    const response = await apiRequest(`/api/master-data/bom/${selectedBomForNewItem}/items`, {
                      method: "POST",
                      body: JSON.stringify({
                        material_id: parseInt(newBomItem.material_id),
                        quantity: parseFloat(newBomItem.quantity),
                        unit_cost: newBomItem.unit_cost ? parseFloat(newBomItem.unit_cost) : null,
                        is_active: newBomItem.is_active
                      }),
                    });

                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Component added successfully",
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom/items", selectedBomForNewItem] });
                      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bom"] });
                      setShowNewBomItemForm(false);
                      setSelectedBomForNewItem(null);
                      setNewBomItem({
                        material_id: "",
                        quantity: "",
                        unit_cost: "",
                        is_active: true
                      });
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.message || "Failed to add component");
                    }
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || (editingBomItem ? "Failed to update component" : "Failed to add component"),
                    variant: "destructive",
                  });
                }
              }}>
                {editingBomItem ? "Update Component" : "Add Component"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}