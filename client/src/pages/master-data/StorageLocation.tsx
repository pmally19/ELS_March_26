import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";
import { Link } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, RefreshCw, ArrowLeft, FileUp, MoreHorizontal, PowerOff, Eye, ChevronDown, ChevronRight, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import StorageLocationExcelImport from "../../components/master-data/StorageLocationExcelImport";
// Types for the data
interface Plant {
  id: number;
  code: string;
  name: string;
}

interface StorageLocation {
  id: number;
  code: string;
  name: string;
  description?: string;
  plantId: number;
  type: string;
  isMrpRelevant: boolean;
  isNegativeStockAllowed: boolean;
  isGoodsReceiptRelevant: boolean;
  isGoodsIssueRelevant: boolean;
  isInterimStorage: boolean;
  isTransitStorage: boolean;
  isRestrictedUse: boolean;
  status: string;
  isActive: boolean;
  notes?: string;
  plant?: Plant;
  // Audit trail fields
  createdAt?: string;
  updatedAt?: string;
  _tenantId?: string | null;
  _createdBy?: number | null;
  _updatedBy?: number | null;
  _deletedAt?: string | null;
}

// Validation schema for the form
const storageLocationFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  plantId: z.coerce.number().min(1, "Plant is required"),
  type: z.string().min(1, "Type is required"),
  isMrpRelevant: z.boolean().default(true),
  isNegativeStockAllowed: z.boolean().default(false),
  isGoodsReceiptRelevant: z.boolean().default(true),
  isGoodsIssueRelevant: z.boolean().default(true),
  isInterimStorage: z.boolean().default(false),
  isTransitStorage: z.boolean().default(false),
  isRestrictedUse: z.boolean().default(false),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// StorageLocation Table Component
interface StorageLocationTableProps {
  storageLocations: StorageLocation[];
  isLoading: boolean;
  onEdit: (storageLocation: StorageLocation) => void;
  onDelete: (storageLocation: StorageLocation) => void;
  onDeactivate: (storageLocation: StorageLocation) => void;
  onView: (storageLocation: StorageLocation) => void;
}

function StorageLocationTable({ storageLocations, isLoading, onEdit, onDelete, onDeactivate, onView }: StorageLocationTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border rounded-md">
          <div className="relative max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : storageLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No storage locations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  storageLocations.map((location) => (
                    <TableRow
                      key={location.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onView(location)}
                    >
                      <TableCell className="font-medium">{location.code}</TableCell>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.plant ? `${location.plant.code} - ${location.plant.name}` : location.plantId}</TableCell>
                      <TableCell>
                        {location.type === 'raw_material' ? 'Raw Material' :
                          location.type === 'finished_goods' ? 'Finished Goods' :
                            location.type}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${location.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {location.isActive ? "Active" : "Inactive"}
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
                            <DropdownMenuItem onClick={() => onView(location)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(location)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {location.isActive && (
                              <DropdownMenuItem
                                onClick={() => onDeactivate(location)}
                                className="text-orange-600"
                              >
                                <PowerOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onDelete(location)}
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
  );
}

export default function StorageLocation() {
  const permissions = useAgentPermissions();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewingStorageLocation, setViewingStorageLocation] = useState<StorageLocation | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [editingStorageLocation, setEditingStorageLocation] = useState<StorageLocation | null>(null);
  const [deletingStorageLocation, setDeletingStorageLocation] = useState<StorageLocation | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [adminDataOpen, setAdminDataOpen] = useState(false);

  // Forms
  const addForm = useForm<z.infer<typeof storageLocationFormSchema>>({
    resolver: zodResolver(storageLocationFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "raw_material",
      isMrpRelevant: true,
      isNegativeStockAllowed: false,
      isGoodsReceiptRelevant: true,
      isGoodsIssueRelevant: true,
      isInterimStorage: false,
      isTransitStorage: false,
      isRestrictedUse: false,
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof storageLocationFormSchema>>({
    resolver: zodResolver(storageLocationFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "raw_material",
      isMrpRelevant: true,
      isNegativeStockAllowed: false,
      isGoodsReceiptRelevant: true,
      isGoodsIssueRelevant: true,
      isInterimStorage: false,
      isTransitStorage: false,
      isRestrictedUse: false,
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  // Fetch data
  const { data: storageLocations = [], isLoading, error, refetch: refetchStorageLocations } = useQuery<StorageLocation[]>({
    queryKey: ['/api/master-data/storage-location'],
    retry: 1,
  });

  const { data: plants = [] } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plant'],
    retry: 1,
  });

  // Mutations
  const addStorageLocationMutation = useMutation({
    mutationFn: (data: z.infer<typeof storageLocationFormSchema>) =>
      apiRequest('/api/master-data/storage-location', 'POST', data),
    onSuccess: () => {
      // Force immediate refetch to update the table
      refetchStorageLocations();

      // Clean up the form state
      setIsAddDialogOpen(false);
      setActiveTab("basic"); // Reset tab when closed
      addForm.reset();

      toast({
        title: "Storage Location Added",
        description: "Storage location has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add storage location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStorageLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof storageLocationFormSchema> }) =>
      apiRequest(`/api/master-data/storage-location/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/storage-location'] });
      setIsEditDialogOpen(false);
      setActiveTab("basic"); // Reset tab when closed
      setEditingStorageLocation(null);
      toast({
        title: "Storage Location Updated",
        description: "Storage location has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update storage location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteStorageLocationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/storage-location/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/storage-location'] });
      setIsDeleteDialogOpen(false);
      setDeletingStorageLocation(null);
      toast({
        title: "Storage Location Deleted",
        description: "Storage location has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete storage location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddSubmit = (data: z.infer<typeof storageLocationFormSchema>) => {
    // Check for validation errors
    const formErrors = addForm.formState.errors;
    if (Object.keys(formErrors).length > 0) {
      // Collect all error messages
      const errorMessages = Object.entries(formErrors)
        .map(([field, error]) => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
          return `${fieldName}: ${error.message}`;
        })
        .join("\n");

      // Display error toast with all validation errors
      toast({
        title: "Validation Error",
        description: "Please fix the following errors:\n" + errorMessages,
        variant: "destructive",
      });

      // Highlight the tab with errors
      if (formErrors.code || formErrors.name || formErrors.plantId || formErrors.type) {
        setActiveTab("basic");
      } else if (formErrors.isMrpRelevant || formErrors.isNegativeStockAllowed ||
        formErrors.isGoodsReceiptRelevant || formErrors.isGoodsIssueRelevant) {
        setActiveTab("settings");
      } else {
        setActiveTab("additional");
      }

      return;
    }

    // If validation passes, submit the data
    addStorageLocationMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof storageLocationFormSchema>) => {
    if (!editingStorageLocation) return;

    // Check for validation errors
    const formErrors = editForm.formState.errors;
    if (Object.keys(formErrors).length > 0) {
      // Collect all error messages
      const errorMessages = Object.entries(formErrors)
        .map(([field, error]) => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
          return `${fieldName}: ${error.message}`;
        })
        .join("\n");

      // Display error toast with all validation errors
      toast({
        title: "Validation Error",
        description: "Please fix the following errors:\n" + errorMessages,
        variant: "destructive",
      });

      // Highlight the tab with errors
      if (formErrors.code || formErrors.name || formErrors.plantId || formErrors.type) {
        setActiveTab("basic");
      } else if (formErrors.isMrpRelevant || formErrors.isNegativeStockAllowed ||
        formErrors.isGoodsReceiptRelevant || formErrors.isGoodsIssueRelevant) {
        setActiveTab("settings");
      } else {
        setActiveTab("additional");
      }

      return;
    }

    updateStorageLocationMutation.mutate({ id: editingStorageLocation.id, data });
  };

  const openEditDialog = (storageLocation: StorageLocation) => {
    setEditingStorageLocation(storageLocation);
    setActiveTab("basic"); // Reset to first tab
    editForm.reset({
      code: storageLocation.code,
      name: storageLocation.name,
      description: storageLocation.description || "",
      plantId: storageLocation.plantId,
      type: storageLocation.type,
      isMrpRelevant: storageLocation.isMrpRelevant,
      isNegativeStockAllowed: storageLocation.isNegativeStockAllowed,
      isGoodsReceiptRelevant: storageLocation.isGoodsReceiptRelevant,
      isGoodsIssueRelevant: storageLocation.isGoodsIssueRelevant,
      isInterimStorage: storageLocation.isInterimStorage,
      isTransitStorage: storageLocation.isTransitStorage,
      isRestrictedUse: storageLocation.isRestrictedUse,
      status: storageLocation.status,
      isActive: storageLocation.isActive,
      notes: storageLocation.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (storageLocation: StorageLocation) => {
    setDeletingStorageLocation(storageLocation);
    setIsDeleteDialogOpen(true);
  };

  const handleDeactivate = (storageLocation: StorageLocation) => {
    if (window.confirm("Are you sure you want to deactivate this Storage Location? This will set it to inactive status but preserve all associated records.")) {
      // Call the deactivate API
      fetch(`/api/master-data/storage-location/${storageLocation.id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            toast({
              title: "Success",
              description: data.message,
            });
            // Refresh the storage locations list
            refetchStorageLocations();
          } else {
            throw new Error(data.error || 'Failed to deactivate storage location');
          }
        })
        .catch(error => {
          console.error('Error deactivating storage location:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to deactivate storage location",
            variant: "destructive",
          });
        });
    }
  };

  const handleViewDetails = (storageLocation: StorageLocation) => {
    setViewingStorageLocation(storageLocation);
    setIsViewDetailsOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center mb-6">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Storage Location Management</h1>
            <p className="text-gray-600 mt-1">
              Manage storage locations within plants for inventory organization
            </p>
          </div>
        </div>
        <Button
          variant="default"
          onClick={() => setIsAddDialogOpen(true)}
          className="space-x-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Storage Location</span>
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Locations</TabsTrigger>
          <TabsTrigger value="raw-material">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <StorageLocationTable
            storageLocations={storageLocations}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onDeactivate={handleDeactivate}
            onView={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="raw-material">
          <StorageLocationTable
            storageLocations={storageLocations.filter(loc => loc.type === 'raw_material')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onDeactivate={handleDeactivate}
            onView={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="finished-goods">
          <StorageLocationTable
            storageLocations={storageLocations.filter(loc => loc.type === 'finished_goods')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onDeactivate={handleDeactivate}
            onView={handleViewDetails}
          />
        </TabsContent>
      </Tabs>

      {/* Add Storage Location Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setActiveTab("basic");
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Storage Location</DialogTitle>
            <DialogDescription>
              Enter storage location details to track inventory within a plant.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            <Form {...addForm}>
              <form className="space-y-6">

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4 grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="additional">Additional Info</TabsTrigger>
                  </TabsList>

                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={addForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Location Code*</FormLabel>
                            <FormControl>
                              <Input placeholder="SL001" {...field} />
                            </FormControl>
                            <FormDescription>
                              Unique identifier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Main Warehouse" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="plantId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plant*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Plant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plants.map((plant) => (
                                  <SelectItem key={plant.id} value={plant.id.toString()}>
                                    {plant.code} - {plant.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999]">
                                <SelectItem value="raw_material">Raw Material</SelectItem>
                                <SelectItem value="work_in_process">Work in Process</SelectItem>
                                <SelectItem value="finished_goods">Finished Goods</SelectItem>
                                <SelectItem value="quality_inspection">Quality Inspection</SelectItem>
                                <SelectItem value="returns">Returns</SelectItem>
                                <SelectItem value="transit">Transit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999]">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="restricted">Restricted</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={addForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of the storage location"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <FormField
                          control={addForm.control}
                          name="isMrpRelevant"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>MRP Relevant</FormLabel>
                                <FormDescription>
                                  Include in materials planning
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addForm.control}
                          name="isGoodsReceiptRelevant"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Goods Receipt Relevant</FormLabel>
                                <FormDescription>
                                  Can receive goods
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addForm.control}
                          name="isInterimStorage"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Interim Storage</FormLabel>
                                <FormDescription>
                                  Temporary storage location
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={addForm.control}
                          name="isNegativeStockAllowed"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Negative Stock Allowed</FormLabel>
                                <FormDescription>
                                  Allow negative inventory
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addForm.control}
                          name="isGoodsIssueRelevant"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Goods Issue Relevant</FormLabel>
                                <FormDescription>
                                  Can issue goods
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addForm.control}
                          name="isRestrictedUse"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Restricted Use</FormLabel>
                                <FormDescription>
                                  Limited access location
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Additional Info Tab */}
                  <TabsContent value="additional" className="space-y-4">
                    <FormField
                      control={addForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional information about this storage location"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-between">
                    <div>
                      {activeTab !== "basic" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (activeTab === "settings") setActiveTab("basic");
                            if (activeTab === "additional") setActiveTab("settings");
                          }}
                        >
                          Back
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>

                      {activeTab !== "additional" ? (
                        <Button
                          type="button"
                          onClick={() => {
                            // Validate current tab fields before proceeding
                            if (activeTab === "basic") {
                              // Check basic tab fields
                              const basicTabValid = addForm.trigger(["code", "name", "plantId", "type"]);
                              basicTabValid.then(isValid => {
                                if (isValid) {
                                  setActiveTab("settings");
                                } else {
                                  toast({
                                    title: "Validation Error",
                                    description: "Please fill in all required fields marked with *",
                                    variant: "destructive",
                                  });
                                }
                              });
                            }
                            if (activeTab === "settings") setActiveTab("additional");
                          }}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={addStorageLocationMutation.isPending}
                          onClick={() => {
                            // Only validate and submit when Create button is clicked
                            addForm.handleSubmit(handleAddSubmit)();
                          }}
                        >
                          {addStorageLocationMutation.isPending ? "Creating..." : "Create Storage Location"}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Storage Location Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setActiveTab("basic");
            setEditingStorageLocation(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Storage Location</DialogTitle>
            <DialogDescription>
              Update storage location details.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            {editingStorageLocation && (
              <Form {...editForm}>
                <form className="space-y-6">

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4 grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="additional">Additional Info</TabsTrigger>
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={editForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Storage Location Code*</FormLabel>
                              <FormControl>
                                <Input placeholder="SL001" {...field} />
                              </FormControl>
                              <FormDescription>
                                Unique identifier
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="Main Warehouse" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="plantId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plant*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value?.toString()}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Plant" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[9999]">
                                  {plants.map((plant) => (
                                    <SelectItem key={plant.id} value={plant.id.toString()}>
                                      {plant.code} - {plant.name}
                                    </SelectItem>
                                  ))}
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
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="raw_material">Raw Material</SelectItem>
                                  <SelectItem value="work_in_process">Work in Process</SelectItem>
                                  <SelectItem value="finished_goods">Finished Goods</SelectItem>
                                  <SelectItem value="quality_inspection">Quality Inspection</SelectItem>
                                  <SelectItem value="returns">Returns</SelectItem>
                                  <SelectItem value="transit">Transit</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                  <SelectItem value="restricted">Restricted</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed description of the storage location"
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <FormField
                            control={editForm.control}
                            name="isMrpRelevant"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>MRP Relevant</FormLabel>
                                  <FormDescription>
                                    Include in materials planning
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="isGoodsReceiptRelevant"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Goods Receipt Relevant</FormLabel>
                                  <FormDescription>
                                    Can receive goods
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="isInterimStorage"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Interim Storage</FormLabel>
                                  <FormDescription>
                                    Temporary storage location
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={editForm.control}
                            name="isNegativeStockAllowed"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Negative Stock Allowed</FormLabel>
                                  <FormDescription>
                                    Allow negative inventory
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="isGoodsIssueRelevant"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Goods Issue Relevant</FormLabel>
                                  <FormDescription>
                                    Can issue goods
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="isRestrictedUse"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Restricted Use</FormLabel>
                                  <FormDescription>
                                    Limited access location
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Additional Info Tab */}
                    <TabsContent value="additional" className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional information about this storage location"
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <DialogFooter className="pt-4">
                    <div className="flex w-full justify-between">
                      <div>
                        {activeTab !== "basic" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (activeTab === "settings") setActiveTab("basic");
                              if (activeTab === "additional") setActiveTab("settings");
                            }}
                          >
                            Back
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                        >
                          Cancel
                        </Button>

                        {activeTab !== "additional" ? (
                          <Button
                            type="button"
                            onClick={() => {
                              // Validate current tab fields before proceeding
                              if (activeTab === "basic") {
                                // Check basic tab fields
                                const basicTabValid = editForm.trigger(["code", "name", "plantId", "type"]);
                                basicTabValid.then(isValid => {
                                  if (isValid) {
                                    setActiveTab("settings");
                                  } else {
                                    toast({
                                      title: "Validation Error",
                                      description: "Please fill in all required fields marked with *",
                                      variant: "destructive",
                                    });
                                  }
                                });
                              }
                              if (activeTab === "settings") setActiveTab("additional");
                            }}
                          >
                            Next
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={updateStorageLocationMutation.isPending}
                            onClick={() => {
                              // Only validate and submit when Update button is clicked
                              editForm.handleSubmit(handleEditSubmit)();
                            }}
                          >
                            {updateStorageLocationMutation.isPending ? "Updating..." : "Update Storage Location"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the storage location &ldquo;
              {deletingStorageLocation?.name}&rdquo; (Code: {deletingStorageLocation?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingStorageLocation(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingStorageLocation) {
                  deleteStorageLocationMutation.mutate(deletingStorageLocation.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteStorageLocationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Storage Location Details</DialogTitle>
            <DialogDescription>
              Complete information about this storage location
            </DialogDescription>
          </DialogHeader>
          {viewingStorageLocation && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Code</Label>
                    <p className="font-mono font-semibold text-lg">{viewingStorageLocation.code}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${viewingStorageLocation.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {viewingStorageLocation.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium text-lg">{viewingStorageLocation.name}</p>
                  </div>
                  {viewingStorageLocation.description && (
                    <div className="col-span-2">
                      <Label className="text-gray-500">Description</Label>
                      <p className="text-gray-700">{viewingStorageLocation.description}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">Plant</Label>
                    <p className="text-gray-700">
                      {viewingStorageLocation.plant
                        ? `${viewingStorageLocation.plant.code} - ${viewingStorageLocation.plant.name}`
                        : viewingStorageLocation.plantId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Type</Label>
                    <p className="text-gray-700">
                      {viewingStorageLocation.type === 'raw_material' ? 'Raw Material' :
                        viewingStorageLocation.type === 'finished_goods' ? 'Finished Goods' :
                          viewingStorageLocation.type === 'work_in_process' ? 'Work in Process' :
                            viewingStorageLocation.type === 'quality_inspection' ? 'Quality Inspection' :
                              viewingStorageLocation.type === 'returns' ? 'Returns' :
                                viewingStorageLocation.type === 'transit' ? 'Transit' :
                                  viewingStorageLocation.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings & Configuration */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Settings & Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isMrpRelevant ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">MRP Relevant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isNegativeStockAllowed ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Negative Stock Allowed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isGoodsReceiptRelevant ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Goods Receipt Relevant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isGoodsIssueRelevant ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Goods Issue Relevant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isInterimStorage ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Interim Storage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isTransitStorage ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Transit Storage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${viewingStorageLocation.isRestrictedUse ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Label className="text-gray-700">Restricted Use</Label>
                  </div>
                </div>
              </div>

              {/* Administrative Data — collapsible (SAP ECC pattern) */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"
                  onClick={() => setAdminDataOpen(o => !o)}
                >
                  {adminDataOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
                  <Info className="h-3 w-3" />
                  Administrative Data
                </button>
                {adminDataOpen && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-400">
                    <div>
                      <dt className="font-medium">Created At</dt>
                      <dd>{viewingStorageLocation.createdAt ? new Date(viewingStorageLocation.createdAt).toLocaleString() : "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Updated At</dt>
                      <dd>{viewingStorageLocation.updatedAt ? new Date(viewingStorageLocation.updatedAt).toLocaleString() : "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Created By (ID)</dt>
                      <dd>{viewingStorageLocation._createdBy ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Updated By (ID)</dt>
                      <dd>{viewingStorageLocation._updatedBy ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Tenant ID</dt>
                      <dd>{viewingStorageLocation._tenantId ?? "—"}</dd>
                    </div>
                  </dl>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDetailsOpen(false);
                    openEditDialog(viewingStorageLocation);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Storage Location
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}