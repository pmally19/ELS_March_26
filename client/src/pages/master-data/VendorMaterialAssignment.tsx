import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Combobox } from "@/components/ui/combobox"; // REMOVED: File does not exist
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Building, Plus, Trash2, RefreshCw, Package, ArrowLeft, Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Types
interface Vendor {
  id: number;
  code: string;
  name: string;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
  leadTime?: number;
  isActive: boolean;
}

interface Material {
  id: number;
  code: string;              // Changed from material_code to match API
  name: string;              // Added name field
  description: string;
  type: string;              // Changed from material_type to match API
  base_uom?: string;         // Changed from base_unit to match API
  base_unit_price?: number;  // Changed from base_price to match API
  is_active?: boolean;
}

interface VendorMaterialAssignment {
  id: number;
  vendorId: number;
  materialId: number;
  vendorMaterialCode?: string;
  unitPrice?: number;
  currency?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  material: {
    id: number;
    code: string;
    name: string;
    type: string;
    description?: string;
    baseUom?: string;
    baseUnitPrice?: number;
  };
  vendor: {
    id: number;
    code: string;
    name: string;
  };
}

// Validation schema
const vendorMaterialFormSchema = z.object({
  vendorId: z.number().min(1, "Vendor is required"),
  materialIds: z.array(z.number()).min(1, "At least one material is required"),
  vendorMaterialCode: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  minimumOrderQuantity: z.coerce.number().min(0).optional(),
  leadTimeDays: z.coerce.number().min(0).optional(),
  isPreferred: z.boolean().default(false),
  notes: z.string().optional(),
});

type VendorMaterialFormData = z.infer<typeof vendorMaterialFormSchema>;

export default function VendorMaterialAssignment() {
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  // Fetch vendors
  const { data: vendors = [] as Vendor[], isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ['/api/master-data/vendor'],
    queryFn: () => apiRequest<Vendor[]>('/api/master-data/vendor', 'GET'),
    select: (data: Vendor[]) => data.filter((v: Vendor) => v.isActive),
  });

  // Fetch all materials
  const { data: allMaterials = [] as Material[], isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
    queryFn: () => apiRequest<Material[]>('/api/materials', 'GET'),
  });

  // Filter materials by type
  const materials = materialTypeFilter
    ? allMaterials.filter(m => {
      const type = m.type?.toUpperCase();
      if (materialTypeFilter === 'RAW') {
        return type === 'RAW' || type === 'RAW_MATERIAL';
      } else if (materialTypeFilter === 'SEMI') {
        return type === 'SEMI_FINISHED' || type === 'COMPONENT';
      } else if (materialTypeFilter === 'FERT') {
        return type === 'FERT' || type === 'FER' || type === 'FINISHED_GOOD' || type === 'FINISHED_PRODUCT';
      }
      return false;
    })
    : allMaterials;

  // Form setup
  const form = useForm<VendorMaterialFormData>({
    resolver: zodResolver(vendorMaterialFormSchema),
    defaultValues: {
      vendorId: undefined,
      materialIds: [],
      vendorMaterialCode: "",
      unitPrice: undefined,
      currency: "USD",
      minimumOrderQuantity: undefined,
      leadTimeDays: undefined,
      isPreferred: false,
      notes: "",
    },
  });

  const selectedVendorId = form.watch("vendorId");

  // Fetch full vendor details when a vendor is selected
  const { data: selectedVendor } = useQuery<Vendor>({
    queryKey: ['/api/master-data/vendor', selectedVendorId],
    queryFn: () => apiRequest<Vendor>(`/api/master-data/vendor/${selectedVendorId}`, 'GET'),
    enabled: !!selectedVendorId,
  });

  // Autofill fields when vendor is selected
  useEffect(() => {
    if (selectedVendor && selectedVendorId) {
      // Autofill currency if vendor has one
      if (selectedVendor.currency) {
        form.setValue("currency", selectedVendor.currency);
      } else {
        // Reset to default if vendor doesn't have currency
        form.setValue("currency", "USD");
      }

      // Autofill lead time if vendor has one
      if (selectedVendor.leadTime) {
        form.setValue("leadTimeDays", selectedVendor.leadTime);
      } else {
        // Reset if vendor doesn't have lead time
        form.setValue("leadTimeDays", undefined);
      }

      // Autofill notes if vendor has notes
      if (selectedVendor.notes) {
        form.setValue("notes", selectedVendor.notes);
      } else {
        // Clear notes if vendor doesn't have any
        form.setValue("notes", "");
      }
    }
  }, [selectedVendor, selectedVendorId, form]);

  // Handle material selection from dropdown
  const handleMaterialSelect = (materialId: string) => {
    const id = Number(materialId);
    if (id && !selectedMaterialIds.includes(id)) {
      const updated = [...selectedMaterialIds, id];
      setSelectedMaterialIds(updated);
      form.setValue("materialIds", updated);
    }
  };

  // Handle material removal
  const handleMaterialRemove = (materialId: number) => {
    const updated = selectedMaterialIds.filter(id => id !== materialId);
    setSelectedMaterialIds(updated);
    form.setValue("materialIds", updated);
  };

  // Fetch assigned materials for selected vendor
  const { data: assignedMaterials = [] as VendorMaterialAssignment[], isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery<VendorMaterialAssignment[]>({
    queryKey: ['/api/master-data/vendor-materials/vendor', selectedVendorId],
    queryFn: () => apiRequest<VendorMaterialAssignment[]>(`/api/master-data/vendor-materials/vendor/${selectedVendorId}`, 'GET'),
    enabled: !!selectedVendorId,
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/master-data/vendor-materials', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor-materials/vendor'] });
      form.reset();
      setSelectedMaterialIds([]);
      toast({
        title: "Materials Assigned",
        description: "Materials have been successfully assigned to the vendor.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign materials. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: (data: Partial<VendorMaterialFormData> & { id: number }) =>
      apiRequest(`/api/master-data/vendor-materials/${data.id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor-materials/vendor'] });
      setEditingAssignment(null);
      toast({
        title: "Assignment Updated",
        description: "Material assignment has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [editingAssignment, setEditingAssignment] = useState<VendorMaterialAssignment | null>(null);

  const editForm = useForm<VendorMaterialFormData>({
    resolver: zodResolver(vendorMaterialFormSchema),
    defaultValues: {
      vendorId: 0,
      materialIds: [],
    },
  });

  // Populate edit form when an assignment is selected
  useEffect(() => {
    if (editingAssignment) {
      editForm.reset({
        vendorId: editingAssignment.vendorId,
        materialIds: [editingAssignment.materialId],
        vendorMaterialCode: editingAssignment.vendorMaterialCode || "",
        unitPrice: editingAssignment.unitPrice,
        currency: editingAssignment.currency || "USD",
        minimumOrderQuantity: editingAssignment.minimumOrderQuantity,
        leadTimeDays: editingAssignment.leadTimeDays,
        isPreferred: editingAssignment.isPreferred,
        notes: editingAssignment.notes || "",
      });
    }
  }, [editingAssignment, editForm]);

  const handleUpdate = (data: VendorMaterialFormData) => {
    if (editingAssignment) {
      updateAssignmentMutation.mutate({
        id: editingAssignment.id,
        ...data,
      });
    }
  };

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/vendor-materials/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor-materials/vendor'] });
      setIsDeleteDialogOpen(false);
      setDeletingAssignmentId(null);
      toast({
        title: "Assignment Removed",
        description: "Material assignment has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: VendorMaterialFormData) => {
    // If multiple materials are selected, create assignments for all of them
    if (data.materialIds && data.materialIds.length > 0) {
      // We need to make multiple requests, one for each material
      try {
        const promises = data.materialIds.map(materialId => {
          // Find the material to get its base price if no specific price is set
          const material = materials.find(m => m.id === materialId);
          // Use the entered unitPrice if available (it will be applied to all selected materials in this batch)
          // otherwise fallback to material base price
          const price = data.unitPrice !== undefined ? data.unitPrice : (material?.price || 0);

          return createAssignmentMutation.mutateAsync({
            vendorId: data.vendorId,
            materialIds: [materialId],
            vendorMaterialCode: data.vendorMaterialCode,
            unitPrice: price,
            currency: data.currency || "USD",
            minimumOrderQuantity: data.minimumOrderQuantity,
            leadTimeDays: data.leadTimeDays,
            isPreferred: data.isPreferred,
            notes: data.notes
          });
        });

        await Promise.all(promises);
      } catch (error) {
        console.error("Error creating assignments:", error);
      }
    }
  };

  const openDeleteDialog = (assignmentId: number) => {
    setDeletingAssignmentId(assignmentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deletingAssignmentId) {
      deleteAssignmentMutation.mutate(deletingAssignmentId);
    }
  };

  return (
    <div className="p-6">
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
          Master Data → Vendor Material Assignment
        </div>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Material Assignment</h1>
          <p className="text-gray-600 mt-1">
            Assign raw materials to vendors
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center space-x-2"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor'] });
            queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor-materials/vendor'] });
            toast({
              title: "Refreshed",
              description: "Data has been refreshed.",
            });
          }}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Assign Materials to Vendor</CardTitle>
            <CardDescription>
              Select a vendor and assign raw materials they can supply
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          setSelectedMaterialIds([]);
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingVendors ? (
                            <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                          ) : vendors.length === 0 ? (
                            <SelectItem value="none" disabled>No vendors available</SelectItem>
                          ) : (
                            vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.code} - {vendor.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedVendorId && (
                  <>
                    <FormField
                      control={form.control}
                      name="materialIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Materials</FormLabel>
                          <FormDescription>
                            Select materials from the dropdown to assign to this vendor
                          </FormDescription>

                          {/* Material Type Filter Buttons */}
                          <div className="flex gap-2 mb-3">
                            <Button
                              type="button"
                              size="sm"
                              variant={materialTypeFilter === null ? "default" : "outline"}
                              onClick={() => setMaterialTypeFilter(null)}
                            >
                              All
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={materialTypeFilter === "RAW" ? "default" : "outline"}
                              onClick={() => setMaterialTypeFilter("RAW")}
                            >
                              Raw
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={materialTypeFilter === "SEMI" ? "default" : "outline"}
                              onClick={() => setMaterialTypeFilter("SEMI")}
                            >
                              Semi-Finished
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={materialTypeFilter === "FERT" ? "default" : "outline"}
                              onClick={() => setMaterialTypeFilter("FERT")}
                            >
                              Finished
                            </Button>
                          </div>

                          {/* Searchable Material Dropdown */}
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="text"
                              placeholder="Search materials by code or name..."
                              value={materialSearchQuery}
                              onChange={(e) => setMaterialSearchQuery(e.target.value)}
                              className="pl-9 mb-2"
                              disabled={isLoadingMaterials}
                            />
                          </div>

                          <Select
                            onValueChange={handleMaterialSelect}
                            value=""
                            disabled={isLoadingMaterials}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  isLoadingMaterials
                                    ? "Loading materials..."
                                    : materials.filter(material =>
                                      !selectedMaterialIds.includes(material.id) &&
                                      (materialSearchQuery === '' ||
                                        (material.code || '').toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
                                        (material.description || material.name || '').toLowerCase().includes(materialSearchQuery.toLowerCase()))
                                    ).length === 0
                                      ? "No materials found"
                                      : "Select a material"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {materials
                                .filter(material =>
                                  !selectedMaterialIds.includes(material.id) &&
                                  (materialSearchQuery === '' ||
                                    (material.code || '').toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
                                    (material.description || material.name || '').toLowerCase().includes(materialSearchQuery.toLowerCase()))
                                )
                                .map((material) => (
                                  <SelectItem key={material.id} value={material.id.toString()}>
                                    {material.code} - {material.name || material.description}
                                    {material.base_unit_price && ` ($${typeof material.base_unit_price === 'number'
                                      ? material.base_unit_price.toFixed(2)
                                      : Number(material.base_unit_price || 0).toFixed(2)})`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          {/* Display selected materials */}
                          {selectedMaterialIds.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-gray-700">Selected Materials:</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedMaterialIds.map((materialId) => {
                                  const material = materials.find(m => m.id === materialId);
                                  if (!material) return null;
                                  return (
                                    <Badge
                                      key={materialId}
                                      variant="secondary"
                                      className="flex items-center gap-2 px-3 py-1"
                                    >
                                      <span>{material.code} - {material.name || material.description}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleMaterialRemove(materialId)}
                                        className="ml-2 hover:text-red-600"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Leave blank to use material base price
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="INR">INR</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minimumOrderQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Order Qty</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.001" placeholder="0" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leadTimeDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Time (Days)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="vendorMaterialCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Material Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor's internal code" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Vendor's internal code for this material
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPreferred"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Preferred Vendor</FormLabel>
                            <FormDescription>
                              Mark this vendor as preferred for the selected materials
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  disabled={!selectedVendorId || selectedMaterialIds.length === 0 || createAssignmentMutation.isPending}
                  className="w-full"
                >
                  {createAssignmentMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Materials
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Assigned Materials List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Materials</CardTitle>
            <CardDescription>
              Materials currently assigned to the selected vendor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedVendorId ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Building className="h-12 w-12 mb-4 text-gray-400" />
                <p className="text-sm">Select a vendor to view assigned materials</p>
              </div>
            ) : isLoadingAssignments ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <p className="ml-2 text-gray-500">Loading assignments...</p>
              </div>
            ) : assignedMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Package className="h-12 w-12 mb-4 text-gray-400" />
                <p className="text-sm">No materials assigned to this vendor yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Min Qty</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMaterials.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="min-w-[200px]">
                          <div>
                            <div className="font-medium truncate">{assignment.material.code} - {assignment.material.name}</div>
                            {assignment.vendorMaterialCode && (
                              <div className="text-xs text-gray-500 truncate">Vendor Code: {assignment.vendorMaterialCode}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {assignment.unitPrice ? (
                            <span>
                              {assignment.currency || 'USD'} {
                                typeof assignment.unitPrice === 'number'
                                  ? assignment.unitPrice.toFixed(2)
                                  : Number(assignment.unitPrice || 0).toFixed(2)
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {assignment.minimumOrderQuantity ? (
                            <span>{assignment.minimumOrderQuantity} {assignment.material.baseUom || 'PC'}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {assignment.leadTimeDays ? (
                            <span>{assignment.leadTimeDays} days</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {assignment.isPreferred && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">
                                Preferred
                              </Badge>
                            )}
                            <Badge variant={assignment.isActive ? "default" : "secondary"}>
                              {assignment.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAssignment(assignment)}
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(assignment.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vendor Material Assignment</DialogTitle>
            <DialogDescription>
              Update price and details for {editingAssignment?.material.code} - {editingAssignment?.material.name}
            </DialogDescription>
          </DialogHeader>
          {editingAssignment && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="INR">INR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="minimumOrderQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Qty</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" placeholder="0" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="leadTimeDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Time (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="vendorMaterialCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Material Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor's internal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isPreferred"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Preferred Vendor</FormLabel>
                        <FormDescription>
                          Mark this vendor as preferred for this material
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingAssignment(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateAssignmentMutation.isPending}>
                    {updateAssignmentMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the material assignment from the vendor. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteAssignmentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAssignmentMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

