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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, MoreHorizontal, PowerOff, FileUp, Eye, Info, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Work Center type
type WorkCenter = {
  id: number;
  code: string;
  name: string;
  description?: string;
  capacity?: number;
  capacity_unit?: string;
  cost_rate?: number;
  status: string;
  is_active: boolean;
  plant?: string;
  plant_code?: string;
  plant_id?: number;
  cost_center_id?: number;
  company_code_id?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
  tenant_id?: string | null;
  deleted_at?: string | null;
};

// Work Center Form Schema
const workCenterSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  capacity: z.union([z.number(), z.string()]).optional().transform(val => val === "" ? undefined : (typeof val === "string" ? parseFloat(val) : val)),
  capacity_unit: z.string().optional(),
  cost_rate: z.union([z.number(), z.string()]).optional().transform(val => val === "" ? undefined : (typeof val === "string" ? parseFloat(val) : val)),
  plant_id: z.union([z.number(), z.string()]).optional().transform(val => val === "" ? undefined : (typeof val === "string" ? parseInt(val) : val)),
  status: z.string().optional().default("active"),
  is_active: z.boolean().default(true),
});

// Work Centers Management Page
export default function WorkCentersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingWorkCenter, setEditingWorkCenter] = useState<WorkCenter | null>(null);
  const [viewingWorkCenter, setViewingWorkCenter] = useState<WorkCenter | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch work centers
  const { data: workCenters = [], isLoading: workCentersLoading, refetch: refetchWorkCenters, error: workCentersError } = useQuery<WorkCenter[]>({
    queryKey: ["/api/master-data/work-center"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/work-center?full=1");
      if (!response.ok) {
        throw new Error("Failed to fetch work centers");
      }
      return await response.json();
    },
  });

  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest work centers...",
    });
    await refetchWorkCenters();
    toast({
      title: "Data Refreshed",
      description: "Work centers have been updated successfully.",
    });
  };

  // Fetch plants for dropdown
  const { data: plants = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/work-center/options/plants"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/work-center/options/plants");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Filter work centers based on search query
  const filteredWorkCenters = workCenters.filter((wc) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      wc.code?.toLowerCase().includes(searchLower) ||
      wc.name?.toLowerCase().includes(searchLower) ||
      wc.description?.toLowerCase().includes(searchLower) ||
      wc.plant?.toLowerCase().includes(searchLower)
    );
  });

  // Work center form setup
  const form = useForm<z.infer<typeof workCenterSchema>>({
    resolver: zodResolver(workCenterSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      capacity: undefined,
      capacity_unit: "units/day",
      cost_rate: undefined,
      plant_id: undefined,
      status: "active",
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingWorkCenter) {
      form.reset({
        code: editingWorkCenter.code,
        name: editingWorkCenter.name,
        description: editingWorkCenter.description || "",
        capacity: editingWorkCenter.capacity,
        capacity_unit: editingWorkCenter.capacity_unit || "units/day",
        cost_rate: editingWorkCenter.cost_rate,
        plant_id: editingWorkCenter.plant_id,
        status: editingWorkCenter.status || "active",
        is_active: editingWorkCenter.is_active ?? true,
      });
    }
  }, [editingWorkCenter, form]);

  // Create work center mutation
  const createWorkCenterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof workCenterSchema>) => {
      const response = await apiRequest("/api/master-data/work-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create work center");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/work-center"] });
      setShowDialog(false);
      setEditingWorkCenter(null);
      setActiveTab("basic");
      form.reset();
      toast({
        title: "Success",
        description: "Work center created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work center",
        variant: "destructive",
      });
    },
  });

  // Update work center mutation
  const updateWorkCenterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof workCenterSchema> }) => {
      const response = await apiRequest(`/api/master-data/work-center/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update work center");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/work-center"] });
      setShowDialog(false);
      setEditingWorkCenter(null);
      setActiveTab("basic");
      form.reset();
      toast({
        title: "Success",
        description: "Work center updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update work center",
        variant: "destructive",
      });
    },
  });

  // Delete work center mutation
  const deleteWorkCenterMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/work-center/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work center deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/work-center"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work center",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof workCenterSchema>) => {
    const updatedValues: any = {
      ...values,
      code: values.code.toUpperCase(),
    };

    if (editingWorkCenter) {
      updateWorkCenterMutation.mutate({ id: editingWorkCenter.id, data: updatedValues });
    } else {
      createWorkCenterMutation.mutate(updatedValues);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingWorkCenter(null);
    setActiveTab("basic");
    form.reset();
  };

  // Function to handle editing a work center
  const handleEdit = (workCenter: WorkCenter) => {
    setEditingWorkCenter(workCenter);
    setShowDialog(true);
  };

  // Function to handle deleting a work center
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Work Center?")) {
      deleteWorkCenterMutation.mutate(id);
    }
  };

  // Function to handle deactivating a work center
  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this Work Center? This will set it to inactive status but preserve all associated records.")) {
      // Call the deactivate API
      fetch(`/api/master-data/work-center/${id}/deactivate`, {
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
            // Refresh the work centers list
            refetchWorkCenters();
          } else {
            throw new Error(data.error || 'Failed to deactivate work center');
          }
        })
        .catch(error => {
          console.error('Error deactivating work center:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to deactivate work center",
            variant: "destructive",
          });
        });
    }
  };

  // Check for errors
  if (workCentersError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(workCentersError as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  // Function to handle exporting work centers
  const handleExport = () => {
    if (filteredWorkCenters.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no work centers to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredWorkCenters.map(wc => ({
      'Code': wc.code,
      'Name': wc.name,
      'Description': wc.description || '',
      'Capacity': wc.capacity ? `${wc.capacity} ${wc.capacity_unit || ''}` : '',
      'Cost Rate': wc.cost_rate || '',
      'Plant': wc.plant || wc.plant_code || '',
      'Status': wc.status || (wc.is_active ? 'Active' : 'Inactive')
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
    link.setAttribute('download', `work-centers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredWorkCenters.length} work centers to CSV file.`,
    });
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
            <h1 className="text-2xl font-bold">Work Centers</h1>
            <p className="text-sm text-muted-foreground">
              Manage production work centers and resources
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
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Work Center
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
            placeholder="Search work centers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={workCentersLoading}
          title="Refresh work centers data"
        >
          <RefreshCw className={`h-4 w-4 ${workCentersLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Work Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Centers</CardTitle>
          <CardDescription>
            All production work centers and resources in your organization
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
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Capacity</TableHead>
                    <TableHead className="hidden md:table-cell">Plant</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workCentersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredWorkCenters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No work centers found. {searchQuery ? "Try a different search." : "Create your first work center."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWorkCenters.map((workCenter) => (
                      <TableRow key={workCenter.id}>
                        <TableCell className="font-medium">{workCenter.code}</TableCell>
                        <TableCell>{workCenter.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{workCenter.description || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {workCenter.capacity ? `${workCenter.capacity} ${workCenter.capacity_unit || ''}` : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{workCenter.plant || workCenter.plant_code || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${workCenter.is_active && workCenter.status !== 'inactive'
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {workCenter.is_active && workCenter.status !== 'inactive' ? "Active" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => {
                                  setViewingWorkCenter(workCenter);
                                  setShowViewDialog(true);
                                  setAdminDataOpen(false);
                                }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(workCenter)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {workCenter.is_active && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeactivate(workCenter.id)}
                                    className="text-orange-600"
                                  >
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(workCenter.id)}
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

      {/* Work Center Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingWorkCenter ? "Edit Work Center" : "Create Work Center"}
            </DialogTitle>
            <DialogDescription>
              {editingWorkCenter
                ? "Update the work center details below"
                : "Add a new production work center to your organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Information</TabsTrigger>
                    <TabsTrigger value="additional">Additional Information</TabsTrigger>
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., WC001"
                                {...field}
                                disabled={!!editingWorkCenter}
                              />
                            </FormControl>
                            <FormDescription>
                              Unique code for this work center (max 20 characters)
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
                                placeholder="E.g., Assembly Line 1"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Display name of the work center
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
                              placeholder="Brief description of this work center"
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
                        name="plant_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plant</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                              value={field.value?.toString() || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {plants.map((plant) => (
                                  <SelectItem key={plant.id} value={plant.id.toString()}>
                                    {plant.code} - {plant.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the plant where this work center is located
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Is this work center active and available for use?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Additional Information Tab */}
                  <TabsContent value="additional" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="E.g., 100"
                                {...field}
                                value={field.value === undefined ? "" : field.value}
                                onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Production capacity of the work center
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capacity_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity Unit</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., units/day"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Unit of measurement for capacity
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cost_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Rate</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="E.g., 50.00"
                              {...field}
                              value={field.value === undefined ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Cost rate per unit for this work center
                          </FormDescription>
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
                            if (activeTab === "additional") setActiveTab("basic");
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
                        onClick={closeDialog}
                      >
                        Cancel
                      </Button>

                      <div className="flex gap-2">
                        {/* Next button (visible on first tab) */}
                        {activeTab !== "additional" && (
                          <Button
                            type="button"
                            onClick={() => {
                              if (activeTab === "basic") setActiveTab("additional");
                            }}
                          >
                            Next
                          </Button>
                        )}

                        {/* Save button (visible on all tabs) */}
                        <Button
                          type="button"
                          variant={activeTab !== "additional" ? "outline" : "default"}
                          onClick={form.handleSubmit(onSubmit)}
                          disabled={createWorkCenterMutation.isPending || updateWorkCenterMutation.isPending}
                        >
                          {createWorkCenterMutation.isPending || updateWorkCenterMutation.isPending ? (
                            "Saving..."
                          ) : (
                            editingWorkCenter ? "Save Changes" : "Save"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Work Center Details</DialogTitle>
          </DialogHeader>

          {viewingWorkCenter && (
            <div className="flex-1 overflow-y-auto space-y-6 p-6 pt-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Code</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-1">{viewingWorkCenter.code}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-1">{viewingWorkCenter.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Plant</dt>
                      <dd className="text-sm text-gray-900 mt-1">{viewingWorkCenter.plant || viewingWorkCenter.plant_code || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingWorkCenter.is_active && viewingWorkCenter.status !== 'inactive'
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {viewingWorkCenter.is_active && viewingWorkCenter.status !== 'inactive' ? "Active" : "Inactive"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {viewingWorkCenter.capacity ? `${viewingWorkCenter.capacity} ${viewingWorkCenter.capacity_unit || ''}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cost Rate</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {viewingWorkCenter.cost_rate !== undefined ? viewingWorkCenter.cost_rate : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="text-sm text-gray-900 mt-1">{viewingWorkCenter.description || '—'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* ── Administrative Data (SAP ECC style) ────────────────── */}
              <div className="border rounded-md overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setAdminDataOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    Administrative Data
                  </span>
                  {adminDataOpen
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {adminDataOpen && (
                  <dl className="px-4 py-3 space-y-2 bg-white">
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingWorkCenter.created_at
                          ? new Date(viewingWorkCenter.created_at).toLocaleString()
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingWorkCenter.created_by ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingWorkCenter.updated_at
                          ? new Date(viewingWorkCenter.updated_at).toLocaleString()
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingWorkCenter.updated_by ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Tenant ID</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingWorkCenter.tenant_id ?? '—'}
                      </dd>
                    </div>
                    {viewingWorkCenter.deleted_at && (
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-red-500 font-medium">Deleted on</dt>
                        <dd className="text-xs text-red-500 font-medium">
                          {new Date(viewingWorkCenter.deleted_at).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>
          )}
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Work Centers from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with work center data to import in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-center py-8 text-muted-foreground">
              Import functionality coming soon. Please use the form to add work centers individually.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
