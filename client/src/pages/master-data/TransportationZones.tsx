import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Download, Upload, Search, RotateCcw, Edit, Trash2, MapPin, Globe, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

interface TransportationZone {
  id: number;
  code: string;
  name: string;
  description?: string;
  region?: string;
  country?: string;
  zoneType?: string;
  transitTime?: number;
  shippingMultiplier?: number;
  postalCodeFrom?: string;
  postalCodeTo?: string;
  companyCodeId?: number;
  companyCode?: string;
  companyName?: string;
  baseFreightRate?: number;
  currency?: string;
  transportationType?: string;
  distanceKm?: number;
  shippingPointId?: number;
  shippingPointCode?: string;
  shippingPointName?: string;
  blockIndicator?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewTransportationZone {
  code: string;
  name: string;
  description?: string;
  region?: string;
  country?: string;
  zoneType?: string;
  transitTime?: number;
  shippingMultiplier?: number;
  postalCodeFrom?: string;
  postalCodeTo?: string;
  companyCodeId?: number;
  baseFreightRate?: number;
  currency?: string;
  transportationType?: string;
  distanceKm?: number;
  shippingPointId?: number;
  blockIndicator?: boolean;
  isActive: boolean;
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  currency?: string;
}

interface ShippingPoint {
  id: number;
  code: string;
  name: string;
}

export default function TransportationZones() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TransportationZone | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<NewTransportationZone>({
    code: "",
    name: "",
    description: "",
    region: "",
    country: "",
    zoneType: "",
    transitTime: undefined,
    shippingMultiplier: 1.00,
    postalCodeFrom: "",
    postalCodeTo: "",
    companyCodeId: undefined,
    baseFreightRate: undefined,
    currency: "",
    transportationType: "",
    distanceKm: undefined,
    shippingPointId: undefined,
    blockIndicator: false,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-codes"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/company-codes");
      if (!response.ok) throw new Error("Failed to fetch company codes");
      return response.json();
    },
  });

  // Fetch shipping points for dropdown
  const { data: shippingPoints = [] } = useQuery<ShippingPoint[]>({
    queryKey: ["/api/master-data/shipping-point"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/shipping-point");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch transportation zones
  const { data: zones = [], isLoading, error } = useQuery<TransportationZone[]>({
    queryKey: ["/api/master-data/transportation-zones"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/master-data/transportation-zones");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(errorData.message || `Failed to fetch transportation zones: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error("Unexpected response format:", data);
          return [];
        }
        return data.map((r: any) => ({
          id: r.id,
          code: r.code || '',
          name: r.name || '',
          description: r.description || '',
          region: r.region || undefined,
          country: r.country || undefined,
          zoneType: r.zoneType || r.zone_type || undefined,
          transitTime: r.transitTime || r.transit_time || undefined,
          shippingMultiplier: r.shippingMultiplier || r.shipping_multiplier || undefined,
          postalCodeFrom: r.postalCodeFrom || r.postal_code_from || undefined,
          postalCodeTo: r.postalCodeTo || r.postal_code_to || undefined,
          companyCodeId: r.companyCodeId || r.company_code_id || undefined,
          companyCode: r.companyCode || r.company_code || undefined,
          companyName: r.companyName || r.company_name || undefined,
          baseFreightRate: r.baseFreightRate || r.base_freight_rate || undefined,
          currency: r.currency || undefined,
          transportationType: r.transportationType || r.transportation_type || undefined,
          distanceKm: r.distanceKm || r.distance_km || undefined,
          shippingPointId: r.shippingPointId || r.shipping_point_id || undefined,
          shippingPointCode: r.shippingPointCode || r.shipping_point_code || undefined,
          shippingPointName: r.shippingPointName || r.shipping_point_name || undefined,
          blockIndicator: r.blockIndicator !== undefined ? r.blockIndicator : (r.block_indicator || false),
          isActive: typeof r.isActive === "boolean" ? r.isActive : !!(r.active ?? true),
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
          updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
        }));
      } catch (err: any) {
        console.error("Error fetching transportation zones:", err);
        throw err;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: NewTransportationZone) => {
      const response = await fetch("/api/master-data/transportation-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transportation zone");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-zones"] });
      setShowCreateDialog(false);
      setNewItem({
        code: "",
        name: "",
        description: "",
        region: "",
        country: "",
        zoneType: "",
        transitTime: undefined,
        shippingMultiplier: 1.00,
        postalCodeFrom: "",
        postalCodeTo: "",
        companyCodeId: undefined,
        baseFreightRate: undefined,
        currency: "",
        transportationType: "",
        distanceKm: undefined,
        shippingPointId: undefined,
        blockIndicator: false,
        isActive: true
      });
      toast({
        title: "Success",
        description: "Transportation zone created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transportation zone",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewTransportationZone> }) => {
      const response = await fetch(`/api/master-data/transportation-zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update transportation zone");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-zones"] });
      setShowEditDialog(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Transportation zone updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transportation zone",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/transportation-zones/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete transportation zone");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-zones"] });
      setShowDeleteDialog(false);
      setDeletingItemId(null);
      toast({
        title: "Success",
        description: "Transportation zone deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transportation zone",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newItem.code || !newItem.name) {
      toast({
        title: "Validation Error",
        description: "Code and name are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleUpdate = () => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          code: editingItem.code,
          name: editingItem.name,
          description: editingItem.description,
          region: editingItem.region,
          country: editingItem.country,
          zoneType: editingItem.zoneType,
          transitTime: editingItem.transitTime,
          shippingMultiplier: editingItem.shippingMultiplier,
          postalCodeFrom: editingItem.postalCodeFrom,
          postalCodeTo: editingItem.postalCodeTo,
          companyCodeId: editingItem.companyCodeId,
          baseFreightRate: editingItem.baseFreightRate,
          currency: editingItem.currency,
          transportationType: editingItem.transportationType,
          distanceKm: editingItem.distanceKm,
          shippingPointId: editingItem.shippingPointId,
          blockIndicator: editingItem.blockIndicator,
          isActive: editingItem.isActive
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  const handleEdit = (item: TransportationZone) => {
    setEditingItem({
      ...item,
      region: item.region || "",
      country: item.country || "",
      zoneType: item.zoneType || "",
      description: item.description || "",
      postalCodeFrom: item.postalCodeFrom || "",
      postalCodeTo: item.postalCodeTo || "",
      currency: item.currency || "",
      transportationType: item.transportationType || "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const dataToExport = filteredZones.map((zone) => ({
      Code: zone.code,
      Name: zone.name,
      Description: zone.description || '',
      Region: zone.region || '',
      Country: zone.country || '',
      "Zone Type": zone.zoneType || '',
      "Transit Time (Days)": zone.transitTime || '',
      "Shipping Multiplier": zone.shippingMultiplier || '',
      "Postal Code From": zone.postalCodeFrom || '',
      "Postal Code To": zone.postalCodeTo || '',
      "Company Code": zone.companyCode || '',
      "Base Freight Rate": zone.baseFreightRate || '',
      Currency: zone.currency || '',
      "Transportation Type": zone.transportationType || '',
      "Distance (km)": zone.distanceKm || '',
      "Shipping Point": zone.shippingPointCode || '',
      "Block Indicator": zone.blockIndicator ? 'Yes' : 'No',
      Active: zone.isActive ? 'Yes' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transportation Zones");
    XLSX.writeFile(wb, "transportation-zones.xlsx");
    toast({
      title: "Success",
      description: "Transportation zones exported successfully",
    });
  };

  const filteredZones = zones.filter((zone) => {
    const matchesSearch =
      zone.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (zone.description && zone.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (zone.region && zone.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (zone.country && zone.country.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && zone.isActive) ||
      (statusFilter === "inactive" && !zone.isActive);
    return matchesSearch && matchesStatus;
  });

  // Get available zone types dynamically from existing data
  const availableZoneTypes = Array.from(new Set(zones.map(z => z.zoneType).filter(Boolean))) as string[];
  // Get available currencies dynamically from company codes
  const availableCurrencies = Array.from(new Set(companyCodes.map(cc => cc.currency).filter(Boolean))) as string[];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Transportation Zones
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transportation Zones</h1>
          <p className="text-muted-foreground">
            Manage geographic shipping areas and transportation zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Transportation Zone</DialogTitle>
                <DialogDescription>
                  Add a new transportation zone for geographic shipping areas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={newItem.code}
                      onChange={(e) => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })}
                      placeholder="Enter zone code"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Enter zone name"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newItem.description || ""}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>

                <Separator />

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="shipping">Shipping</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zoneType">Zone Type</Label>
                        {availableZoneTypes.length > 0 ? (
                          <Select
                            value={newItem.zoneType || "none"}
                            onValueChange={(value) => setNewItem({ ...newItem, zoneType: value === "none" ? undefined : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {availableZoneTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="zoneType"
                            value={newItem.zoneType || ""}
                            onChange={(e) => setNewItem({ ...newItem, zoneType: e.target.value })}
                            placeholder="Enter zone type"
                            maxLength={20}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transitTime">Transit Time (Days)</Label>
                        <Input
                          id="transitTime"
                          type="number"
                          value={newItem.transitTime || ""}
                          onChange={(e) => setNewItem({ ...newItem, transitTime: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="Enter transit time"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shippingMultiplier">Shipping Multiplier</Label>
                        <Input
                          id="shippingMultiplier"
                          type="number"
                          step="0.01"
                          value={newItem.shippingMultiplier || ""}
                          onChange={(e) => setNewItem({ ...newItem, shippingMultiplier: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="1.00"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transportationType">Transportation Type</Label>
                        <Input
                          id="transportationType"
                          value={newItem.transportationType || ""}
                          onChange={(e) => setNewItem({ ...newItem, transportationType: e.target.value })}
                          placeholder="Enter transportation type"
                          maxLength={20}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input
                          id="region"
                          value={newItem.region || ""}
                          onChange={(e) => setNewItem({ ...newItem, region: e.target.value })}
                          placeholder="Enter region"
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country Code</Label>
                        <Input
                          id="country"
                          value={newItem.country || ""}
                          onChange={(e) => setNewItem({ ...newItem, country: e.target.value.toUpperCase() })}
                          placeholder="Enter 3-letter country code"
                          maxLength={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCodeFrom">Postal Code From</Label>
                        <Input
                          id="postalCodeFrom"
                          value={newItem.postalCodeFrom || ""}
                          onChange={(e) => setNewItem({ ...newItem, postalCodeFrom: e.target.value })}
                          placeholder="Enter starting postal code"
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCodeTo">Postal Code To</Label>
                        <Input
                          id="postalCodeTo"
                          value={newItem.postalCodeTo || ""}
                          onChange={(e) => setNewItem({ ...newItem, postalCodeTo: e.target.value })}
                          placeholder="Enter ending postal code"
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="distanceKm">Distance (km)</Label>
                        <Input
                          id="distanceKm"
                          type="number"
                          step="0.01"
                          value={newItem.distanceKm || ""}
                          onChange={(e) => setNewItem({ ...newItem, distanceKm: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Enter distance"
                          min={0}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="shipping" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyCodeId">Company Code</Label>
                        <Select
                          value={newItem.companyCodeId?.toString() || "none"}
                          onValueChange={(value) => {
                            const selectedCode = companyCodes.find(cc => cc.id.toString() === value);
                            setNewItem({
                              ...newItem,
                              companyCodeId: value === "none" ? undefined : parseInt(value),
                              currency: selectedCode?.currency || newItem.currency
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {companyCodes.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id.toString()}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        {newItem.companyCodeId && companyCodes.find(cc => cc.id === newItem.companyCodeId)?.currency ? (
                          <Input
                            id="currency"
                            value={companyCodes.find(cc => cc.id === newItem.companyCodeId)?.currency || ""}
                            readOnly
                            className="bg-muted"
                            placeholder="Auto-filled from company code"
                          />
                        ) : (
                          availableCurrencies.length > 0 ? (
                            <Select
                              value={newItem.currency || "none"}
                              onValueChange={(value) => setNewItem({ ...newItem, currency: value === "none" ? undefined : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {availableCurrencies.map((curr) => (
                                  <SelectItem key={curr} value={curr}>
                                    {curr}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="currency"
                              value={newItem.currency || ""}
                              onChange={(e) => setNewItem({ ...newItem, currency: e.target.value.toUpperCase() })}
                              placeholder="Enter currency code"
                              maxLength={3}
                            />
                          )
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseFreightRate">Base Freight Rate</Label>
                        <Input
                          id="baseFreightRate"
                          type="number"
                          step="0.01"
                          value={newItem.baseFreightRate || ""}
                          onChange={(e) => setNewItem({ ...newItem, baseFreightRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Enter base freight rate"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shippingPointId">Shipping Point</Label>
                        <Select
                          value={newItem.shippingPointId?.toString() || "none"}
                          onValueChange={(value) => setNewItem({ ...newItem, shippingPointId: value === "none" ? undefined : parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipping point" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {shippingPoints.map((sp) => (
                              <SelectItem key={sp.id} value={sp.id.toString()}>
                                {sp.code} - {sp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="blockIndicator"
                          checked={newItem.blockIndicator || false}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, blockIndicator: checked })}
                        />
                        <Label htmlFor="blockIndicator">Block Indicator</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={newItem.isActive}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, isActive: checked })}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newItem.code || !newItem.name || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by code, name, description, region, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transportation Zones ({filteredZones.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading transportation zones...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-destructive font-medium">Error loading transportation zones</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-zones"] })}
                className="mt-4"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transportation zones found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredZones.map((zone) => (
                <Card key={zone.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{zone.code}</span>
                          <Badge variant={zone.isActive ? "default" : "secondary"}>
                            {zone.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {zone.blockIndicator && (
                            <Badge variant="destructive">Blocked</Badge>
                          )}
                          {zone.zoneType && (
                            <Badge variant="outline">{zone.zoneType}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{zone.name}</p>
                        {zone.description && (
                          <p className="text-sm text-muted-foreground">{zone.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          {zone.region && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {zone.region}
                            </span>
                          )}
                          {zone.country && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {zone.country}
                            </span>
                          )}
                          {zone.transitTime && (
                            <span>Transit: {zone.transitTime} days</span>
                          )}
                          {zone.companyCode && (
                            <span>Company: {zone.companyCode}</span>
                          )}
                        </div>
                        {zone.postalCodeFrom && zone.postalCodeTo && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Postal Codes: {zone.postalCodeFrom} - {zone.postalCodeTo}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(zone)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(zone.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transportation Zone</DialogTitle>
            <DialogDescription>
              Update transportation zone information
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Code *</Label>
                  <Input
                    id="edit-code"
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                    placeholder="Enter zone code"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="Enter zone name"
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>

              <Separator />

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="shipping">Shipping</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-zoneType">Zone Type</Label>
                      {availableZoneTypes.length > 0 ? (
                        <Select
                          value={editingItem.zoneType || "none"}
                          onValueChange={(value) => setEditingItem({ ...editingItem, zoneType: value === "none" ? undefined : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableZoneTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="edit-zoneType"
                          value={editingItem.zoneType || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, zoneType: e.target.value })}
                          placeholder="Enter zone type"
                          maxLength={20}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-transitTime">Transit Time (Days)</Label>
                      <Input
                        id="edit-transitTime"
                        type="number"
                        value={editingItem.transitTime || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, transitTime: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Enter transit time"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shippingMultiplier">Shipping Multiplier</Label>
                      <Input
                        id="edit-shippingMultiplier"
                        type="number"
                        step="0.01"
                        value={editingItem.shippingMultiplier || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, shippingMultiplier: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="1.00"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-transportationType">Transportation Type</Label>
                      <Input
                        id="edit-transportationType"
                        value={editingItem.transportationType || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, transportationType: e.target.value })}
                        placeholder="Enter transportation type"
                        maxLength={20}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-region">Region</Label>
                      <Input
                        id="edit-region"
                        value={editingItem.region || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, region: e.target.value })}
                        placeholder="Enter region"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-country">Country Code</Label>
                      <Input
                        id="edit-country"
                        value={editingItem.country || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, country: e.target.value.toUpperCase() })}
                        placeholder="Enter 3-letter country code"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-postalCodeFrom">Postal Code From</Label>
                      <Input
                        id="edit-postalCodeFrom"
                        value={editingItem.postalCodeFrom || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, postalCodeFrom: e.target.value })}
                        placeholder="Enter starting postal code"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-postalCodeTo">Postal Code To</Label>
                      <Input
                        id="edit-postalCodeTo"
                        value={editingItem.postalCodeTo || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, postalCodeTo: e.target.value })}
                        placeholder="Enter ending postal code"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-distanceKm">Distance (km)</Label>
                      <Input
                        id="edit-distanceKm"
                        type="number"
                        step="0.01"
                        value={editingItem.distanceKm || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, distanceKm: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter distance"
                        min={0}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="shipping" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-companyCodeId">Company Code</Label>
                      <Select
                        value={editingItem.companyCodeId?.toString() || "none"}
                        onValueChange={(value) => {
                          const selectedCode = companyCodes.find(cc => cc.id.toString() === value);
                          setEditingItem({
                            ...editingItem,
                            companyCodeId: value === "none" ? undefined : parseInt(value),
                            currency: selectedCode?.currency || editingItem.currency
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company code" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {companyCodes.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id.toString()}>
                              {cc.code} - {cc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-currency">Currency</Label>
                      {editingItem.companyCodeId && companyCodes.find(cc => cc.id === editingItem.companyCodeId)?.currency ? (
                        <Input
                          id="edit-currency"
                          value={companyCodes.find(cc => cc.id === editingItem.companyCodeId)?.currency || ""}
                          readOnly
                          className="bg-muted"
                          placeholder="Auto-filled from company code"
                        />
                      ) : (
                        availableCurrencies.length > 0 ? (
                          <Select
                            value={editingItem.currency || "none"}
                            onValueChange={(value) => setEditingItem({ ...editingItem, currency: value === "none" ? undefined : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {availableCurrencies.map((curr) => (
                                <SelectItem key={curr} value={curr}>
                                  {curr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="edit-currency"
                            value={editingItem.currency || ""}
                            onChange={(e) => setEditingItem({ ...editingItem, currency: e.target.value.toUpperCase() })}
                            placeholder="Enter currency code"
                            maxLength={3}
                          />
                        )
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-baseFreightRate">Base Freight Rate</Label>
                      <Input
                        id="edit-baseFreightRate"
                        type="number"
                        step="0.01"
                        value={editingItem.baseFreightRate || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, baseFreightRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter base freight rate"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shippingPointId">Shipping Point</Label>
                      <Select
                        value={editingItem.shippingPointId?.toString() || "none"}
                        onValueChange={(value) => setEditingItem({ ...editingItem, shippingPointId: value === "none" ? undefined : parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shipping point" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {shippingPoints.map((sp) => (
                            <SelectItem key={sp.id} value={sp.id.toString()}>
                              {sp.code} - {sp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-blockIndicator"
                        checked={editingItem.blockIndicator || false}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, blockIndicator: checked })}
                      />
                      <Label htmlFor="edit-blockIndicator">Block Indicator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-active"
                        checked={editingItem.isActive}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, isActive: checked })}
                      />
                      <Label htmlFor="edit-active">Active</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!editingItem.code || !editingItem.name || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transportation zone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

