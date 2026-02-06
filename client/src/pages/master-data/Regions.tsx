import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Edit, Plus, Search, Trash2, FileUp, ArrowLeft } from "lucide-react";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the region schema matching database
const regionSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must not exceed 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

interface Region {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Region display in table
function RegionTable({ regions, isLoading, onEdit, onDelete }: { 
  regions: Region[]; 
  isLoading: boolean; 
  onEdit: (region: Region) => void; 
  onDelete: (id: number) => void;
}) {
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
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading regions...
                    </TableCell>
                  </TableRow>
                ) : regions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No regions found. Create your first region.
                    </TableCell>
                  </TableRow>
                ) : (
                  regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.code}</TableCell>
                      <TableCell>{region.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{region.description || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            region.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {region.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(region)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(region.id)}
                            className="text-red-500 hover:text-red-700"
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
  );
}

export default function Regions() {
  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [deletingRegionId, setDeletingRegionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // Fetch regions from API
  const { data: regions = [], isLoading } = useQuery<Region[]>({
    queryKey: ['/api/master-data/regions'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/regions');
      const data = await response.json();
      return Array.isArray(data) ? data.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description || undefined,
        isActive: r.isActive !== undefined ? r.isActive : (r.is_active !== undefined ? r.is_active : true),
        createdAt: r.createdAt || r.created_at,
        updatedAt: r.updatedAt || r.updated_at,
      })) : [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof regionSchema>) => {
      const response = await apiRequest('/api/master-data/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create region');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/regions'] });
      toast({
        title: "Region created",
        description: "Region has been created successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof regionSchema>> }) => {
      const response = await apiRequest(`/api/master-data/regions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update region');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/regions'] });
      toast({
        title: "Region updated",
        description: "Region has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingRegion(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/regions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete region');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/regions'] });
      toast({
        title: "Region deleted",
        description: "Region has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setDeletingRegionId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms
  const addForm = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editForm = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Handlers
  const handleAddSubmit = (data: z.infer<typeof regionSchema>) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof regionSchema>) => {
    if (editingRegion) {
      updateMutation.mutate({ id: editingRegion.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingRegionId) {
      deleteMutation.mutate(deletingRegionId);
    }
  };

  const openEditDialog = (region: Region) => {
    setEditingRegion(region);
    editForm.reset({
      code: region.code,
      name: region.name,
      description: region.description || "",
      isActive: region.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (id: number) => {
    setDeletingRegionId(id);
    setIsDeleteDialogOpen(true);
  };

  // Filter regions based on search query
  const filteredRegions = regions.filter(region => 
    region.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (region.description && region.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-6">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
            <div>
          <h1 className="text-2xl font-bold">Regions</h1>
          <p className="text-sm text-muted-foreground">
            Manage global regions with country assignments
          </p>
        </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Region
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center border rounded-md px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground mr-2" />
        <Input
          className="border-0 p-0 shadow-none focus-visible:ring-0"
          placeholder="Search regions by code, name, countries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Regions Table */}
      <RegionTable
        regions={filteredRegions}
        isLoading={isLoading}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
      />

      {/* Add Region Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
            <DialogDescription>
              Define a new global region with its country assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code*</FormLabel>
                        <FormControl>
                          <Input placeholder="NA" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (e.g., NA, EMEA)
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
                          <Input placeholder="North America" {...field} />
                        </FormControl>
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
                        <Input placeholder="Region description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable or disable this region
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Region</DialogTitle>
            <DialogDescription>
              Update region details and country assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            {editingRegion && (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier (e.g., NA, EMEA)
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
                            <Input {...field} />
                          </FormControl>
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable or disable this region
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update</Button>
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
              This action cannot be undone. This will permanently delete the
              region and its associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}