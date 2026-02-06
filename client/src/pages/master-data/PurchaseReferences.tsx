import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, RefreshCw, Search, LayoutList, Tag, ArrowLeft } from "lucide-react";
import { SearchRefreshBar } from "@/components/ui/search-refresh-bar";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Types
interface PurchaseGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface SupplyType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// Form schemas
const purchaseGroupSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const supplyTypeSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function PurchaseReferences() {
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("purchaseGroups");
  const [searchQuery, setSearchQuery] = useState("");

  // Purchase Group state
  const [isAddPurchaseGroupDialogOpen, setIsAddPurchaseGroupDialogOpen] = useState(false);
  const [isEditPurchaseGroupDialogOpen, setIsEditPurchaseGroupDialogOpen] = useState(false);
  const [isDeletePurchaseGroupDialogOpen, setIsDeletePurchaseGroupDialogOpen] = useState(false);
  const [editingPurchaseGroup, setEditingPurchaseGroup] = useState<PurchaseGroup | null>(null);
  const [deletingPurchaseGroup, setDeletingPurchaseGroup] = useState<PurchaseGroup | null>(null);

  // Supply Type state
  const [isAddSupplyTypeDialogOpen, setIsAddSupplyTypeDialogOpen] = useState(false);
  const [isEditSupplyTypeDialogOpen, setIsEditSupplyTypeDialogOpen] = useState(false);
  const [isDeleteSupplyTypeDialogOpen, setIsDeleteSupplyTypeDialogOpen] = useState(false);
  const [editingSupplyType, setEditingSupplyType] = useState<SupplyType | null>(null);
  const [deletingSupplyType, setDeletingSupplyType] = useState<SupplyType | null>(null);

  // Forms
  const purchaseGroupForm = useForm<z.infer<typeof purchaseGroupSchema>>({
    resolver: zodResolver(purchaseGroupSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editPurchaseGroupForm = useForm<z.infer<typeof purchaseGroupSchema>>({
    resolver: zodResolver(purchaseGroupSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const supplyTypeForm = useForm<z.infer<typeof supplyTypeSchema>>({
    resolver: zodResolver(supplyTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editSupplyTypeForm = useForm<z.infer<typeof supplyTypeSchema>>({
    resolver: zodResolver(supplyTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Queries
  const {
    data: purchaseGroups = [] as PurchaseGroup[],
    isLoading: isPurchaseGroupsLoading
  } = useQuery({
    queryKey: ['/api/master-data/purchase-group'],
    retry: 1,
  });

  const {
    data: supplyTypes = [] as SupplyType[],
    isLoading: isSupplyTypesLoading
  } = useQuery({
    queryKey: ['/api/master-data/supply-type'],
    retry: 1,
  });

  // Mutations - Purchase Groups
  const addPurchaseGroupMutation = useMutation({
    mutationFn: (data: z.infer<typeof purchaseGroupSchema>) =>
      apiRequest('/api/master-data/purchase-group', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          code: data.code.toUpperCase(), // Ensure code is uppercase
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-group'] });
      setIsAddPurchaseGroupDialogOpen(false);
      purchaseGroupForm.reset();
      toast({
        title: "Purchase Group Added",
        description: "Purchase group has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add purchase group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePurchaseGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof purchaseGroupSchema> }) =>
      apiRequest(`/api/master-data/purchase-group/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          code: data.code.toUpperCase(), // Ensure code is uppercase
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-group'] });
      setIsEditPurchaseGroupDialogOpen(false);
      setEditingPurchaseGroup(null);
      toast({
        title: "Purchase Group Updated",
        description: "Purchase group has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update purchase group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePurchaseGroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/purchase-group/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-group'] });
      setIsDeletePurchaseGroupDialogOpen(false);
      setDeletingPurchaseGroup(null);
      toast({
        title: "Purchase Group Deleted",
        description: "Purchase group has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete purchase group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutations - Supply Types
  const addSupplyTypeMutation = useMutation({
    mutationFn: (data: z.infer<typeof supplyTypeSchema>) =>
      apiRequest('/api/master-data/supply-type', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          code: data.code.toUpperCase(), // Ensure code is uppercase
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/supply-type'] });
      setIsAddSupplyTypeDialogOpen(false);
      supplyTypeForm.reset();
      toast({
        title: "Supply Type Added",
        description: "Supply type has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add supply type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSupplyTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof supplyTypeSchema> }) =>
      apiRequest(`/api/master-data/supply-type/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          code: data.code.toUpperCase(), // Ensure code is uppercase
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/supply-type'] });
      setIsEditSupplyTypeDialogOpen(false);
      setEditingSupplyType(null);
      toast({
        title: "Supply Type Updated",
        description: "Supply type has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update supply type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSupplyTypeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/supply-type/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/supply-type'] });
      setIsDeleteSupplyTypeDialogOpen(false);
      setDeletingSupplyType(null);
      toast({
        title: "Supply Type Deleted",
        description: "Supply type has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete supply type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddPurchaseGroupSubmit = (data: z.infer<typeof purchaseGroupSchema>) => {
    addPurchaseGroupMutation.mutate(data);
  };

  const handleEditPurchaseGroupSubmit = (data: z.infer<typeof purchaseGroupSchema>) => {
    if (!editingPurchaseGroup) return;
    updatePurchaseGroupMutation.mutate({ id: editingPurchaseGroup.id, data });
  };

  const handleAddSupplyTypeSubmit = (data: z.infer<typeof supplyTypeSchema>) => {
    addSupplyTypeMutation.mutate(data);
  };

  const handleEditSupplyTypeSubmit = (data: z.infer<typeof supplyTypeSchema>) => {
    if (!editingSupplyType) return;
    updateSupplyTypeMutation.mutate({ id: editingSupplyType.id, data });
  };

  // Dialog handlers
  const openEditPurchaseGroupDialog = (purchaseGroup: PurchaseGroup) => {
    setEditingPurchaseGroup(purchaseGroup);
    editPurchaseGroupForm.reset({
      code: purchaseGroup.code,
      name: purchaseGroup.name,
      description: purchaseGroup.description || "",
      isActive: purchaseGroup.isActive,
    });
    setIsEditPurchaseGroupDialogOpen(true);
  };

  const openDeletePurchaseGroupDialog = (purchaseGroup: PurchaseGroup) => {
    setDeletingPurchaseGroup(purchaseGroup);
    setIsDeletePurchaseGroupDialogOpen(true);
  };

  const openEditSupplyTypeDialog = (supplyType: SupplyType) => {
    setEditingSupplyType(supplyType);
    editSupplyTypeForm.reset({
      code: supplyType.code,
      name: supplyType.name,
      description: supplyType.description || "",
      isActive: supplyType.isActive,
    });
    setIsEditSupplyTypeDialogOpen(true);
  };

  const openDeleteSupplyTypeDialog = (supplyType: SupplyType) => {
    setDeletingSupplyType(supplyType);
    setIsDeleteSupplyTypeDialogOpen(true);
  };

  // Filter data based on search query
  const filteredPurchaseGroups = Array.isArray(purchaseGroups) ? purchaseGroups.filter((group: PurchaseGroup) =>
    searchQuery ? (
      group.code.toUpperCase().includes(searchQuery.toUpperCase()) ||
      group.name.toUpperCase().includes(searchQuery.toUpperCase()) ||
      (group.description && group.description.toUpperCase().includes(searchQuery.toUpperCase()))
    ) : true
  ) : [];

  const filteredSupplyTypes = Array.isArray(supplyTypes) ? supplyTypes.filter((type: SupplyType) =>
    searchQuery ? (
      type.code.toUpperCase().includes(searchQuery.toUpperCase()) ||
      type.name.toUpperCase().includes(searchQuery.toUpperCase()) ||
      (type.description && type.description.toUpperCase().includes(searchQuery.toUpperCase()))
    ) : true
  ) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Reference Data</h1>
            <p className="text-sm text-muted-foreground">
              Manage purchasing reference data like purchasing groups and supply types
            </p>
          </div>
        </div>
      </div>

      <SearchRefreshBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        resourceName={activeTab === "purchaseGroups" ? "purchase group" : "supply type"}
        queryKey={activeTab === "purchaseGroups" ? "/api/master-data/purchase-group" : "/api/master-data/supply-type"}
      />

      <Tabs defaultValue="purchaseGroups" className="w-full" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="purchaseGroups" className="flex items-center gap-1">
              <LayoutList className="h-4 w-4" />
              <span>Purchase Groups</span>
            </TabsTrigger>
            <TabsTrigger value="supplyTypes" className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span>Supply Types</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "purchaseGroups" && (
            <Button
              onClick={() => setIsAddPurchaseGroupDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Purchase Group
            </Button>
          )}

          {activeTab === "supplyTypes" && (
            <Button
              onClick={() => setIsAddSupplyTypeDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Supply Type
            </Button>
          )}
        </div>

        <TabsContent value="purchaseGroups">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Groups</CardTitle>
              <CardDescription>
                Categorize procurement activities by purchase groups
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isPurchaseGroupsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex justify-center items-center h-20">
                              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                              <span className="ml-2 text-gray-500">Loading purchase groups...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredPurchaseGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex flex-col items-center justify-center h-20">
                              <LayoutList className="h-8 w-8 text-gray-400" />
                              <p className="mt-2 text-gray-500">No purchase groups found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPurchaseGroups.map((group: PurchaseGroup) => (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.code}</TableCell>
                            <TableCell>{group.name}</TableCell>
                            <TableCell>{group.description || "—"}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${group.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {group.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditPurchaseGroupDialog(group)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeletePurchaseGroupDialog(group)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
        </TabsContent>

        <TabsContent value="supplyTypes">
          <Card>
            <CardHeader>
              <CardTitle>Supply Types</CardTitle>
              <CardDescription>
                Define different types of supplies for procurement classification
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isSupplyTypesLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex justify-center items-center h-20">
                              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                              <span className="ml-2 text-gray-500">Loading supply types...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredSupplyTypes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex flex-col items-center justify-center h-20">
                              <Tag className="h-8 w-8 text-gray-400" />
                              <p className="mt-2 text-gray-500">No supply types found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSupplyTypes.map((type: SupplyType) => (
                          <TableRow key={type.id}>
                            <TableCell className="font-medium">{type.code}</TableCell>
                            <TableCell>{type.name}</TableCell>
                            <TableCell>{type.description || "—"}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {type.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditSupplyTypeDialog(type)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteSupplyTypeDialog(type)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
        </TabsContent>
      </Tabs>

      {/* Add Purchase Group Dialog */}
      <Dialog open={isAddPurchaseGroupDialogOpen} onOpenChange={setIsAddPurchaseGroupDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Purchase Group</DialogTitle>
            <DialogDescription>
              Enter purchase group details for categorizing procurement activities.
            </DialogDescription>
          </DialogHeader>
          <Form {...purchaseGroupForm}>
            <form onSubmit={purchaseGroupForm.handleSubmit(handleAddPurchaseGroupSubmit)} className="space-y-4">
              <FormField
                control={purchaseGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MECH" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for this purchase group (will be converted to uppercase)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mechanical Parts" {...field} />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this purchase group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseGroupForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of this purchase group"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseGroupForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddPurchaseGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addPurchaseGroupMutation.isPending}>
                  {addPurchaseGroupMutation.isPending ? "Creating..." : "Create Purchase Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Group Dialog */}
      <Dialog open={isEditPurchaseGroupDialogOpen} onOpenChange={setIsEditPurchaseGroupDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Purchase Group</DialogTitle>
            <DialogDescription>
              Update purchase group details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editPurchaseGroupForm}>
            <form onSubmit={editPurchaseGroupForm.handleSubmit(handleEditPurchaseGroupSubmit)} className="space-y-4">
              <FormField
                control={editPurchaseGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MECH" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for this purchase group (will be converted to uppercase)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPurchaseGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mechanical Parts" {...field} />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this purchase group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPurchaseGroupForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of this purchase group"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPurchaseGroupForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditPurchaseGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePurchaseGroupMutation.isPending}>
                  {updatePurchaseGroupMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Purchase Group Dialog */}
      <AlertDialog open={isDeletePurchaseGroupDialogOpen} onOpenChange={setIsDeletePurchaseGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the purchase group "{deletingPurchaseGroup?.name}" ({deletingPurchaseGroup?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPurchaseGroup && deletePurchaseGroupMutation.mutate(deletingPurchaseGroup.id)}
              disabled={deletePurchaseGroupMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePurchaseGroupMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Supply Type Dialog */}
      <Dialog open={isAddSupplyTypeDialogOpen} onOpenChange={setIsAddSupplyTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Supply Type</DialogTitle>
            <DialogDescription>
              Enter supply type details for categorizing procurement activities.
            </DialogDescription>
          </DialogHeader>
          <Form {...supplyTypeForm}>
            <form onSubmit={supplyTypeForm.handleSubmit(handleAddSupplyTypeSubmit)} className="space-y-4">
              <FormField
                control={supplyTypeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Code</FormLabel>
                    <FormControl>
                      <Input placeholder="DIR" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for this supply type (will be converted to uppercase)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={supplyTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Direct Materials" {...field} />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this supply type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={supplyTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of this supply type"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={supplyTypeForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSupplyTypeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addSupplyTypeMutation.isPending}>
                  {addSupplyTypeMutation.isPending ? "Creating..." : "Create Supply Type"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Supply Type Dialog */}
      <Dialog open={isEditSupplyTypeDialogOpen} onOpenChange={setIsEditSupplyTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Supply Type</DialogTitle>
            <DialogDescription>
              Update supply type details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editSupplyTypeForm}>
            <form onSubmit={editSupplyTypeForm.handleSubmit(handleEditSupplyTypeSubmit)} className="space-y-4">
              <FormField
                control={editSupplyTypeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Code</FormLabel>
                    <FormControl>
                      <Input placeholder="DIR" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for this supply type (will be converted to uppercase)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSupplyTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Direct Materials" {...field} />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this supply type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSupplyTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of this supply type"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSupplyTypeForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditSupplyTypeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSupplyTypeMutation.isPending}>
                  {updateSupplyTypeMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Supply Type Dialog */}
      <AlertDialog open={isDeleteSupplyTypeDialogOpen} onOpenChange={setIsDeleteSupplyTypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the supply type "{deletingSupplyType?.name}" ({deletingSupplyType?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplyType && deleteSupplyTypeMutation.mutate(deletingSupplyType.id)}
              disabled={deleteSupplyTypeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSupplyTypeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}