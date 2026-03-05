import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Upload, Download, RefreshCw, Edit, Trash2, ArrowLeft, ChevronDown, ChevronRight, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

// Types for Supply Types
interface SupplyType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  validFrom: string;
  validTo: string | null;
  active: boolean;
  // Audit trail fields
  _tenantId?: string | null;
  _createdBy?: string | null;
  _updatedBy?: string | null;
  _deletedAt?: string | null;
}

interface InsertSupplyType {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

// Form schema with proper validation
const supplyTypeFormSchema = z.object({
  code: z.string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores")
    .transform(val => val.toUpperCase()),
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  description: z.string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

type SupplyTypeFormData = z.infer<typeof supplyTypeFormSchema>;

export default function SupplyTypes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSupplyType, setEditingSupplyType] = useState<SupplyType | null>(null);
  const [viewDetailsSupplyType, setViewDetailsSupplyType] = useState<SupplyType | null>(null);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<SupplyTypeFormData>({
    resolver: zodResolver(supplyTypeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Query to fetch supply types
  const { data: supplyTypes = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/master-data/supply-type"],
    retry: false,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: InsertSupplyType) =>
      apiRequest("/api/master-data/supply-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/supply-type"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Supply type created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supply type",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSupplyType> }) =>
      apiRequest(`/api/master-data/supply-type/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/supply-type"] });
      setEditingSupplyType(null);
      form.reset();
      toast({
        title: "Success",
        description: "Supply type updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supply type",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/supply-type/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/supply-type"] });
      toast({
        title: "Success",
        description: "Supply type deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supply type",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: SupplyTypeFormData) => {
    if (editingSupplyType) {
      updateMutation.mutate({ id: editingSupplyType.id, data });
    } else {
      // Ensure required fields are present for creation
      const createData: InsertSupplyType = {
        code: data.code!,
        name: data.name!,
        description: data.description,
        isActive: data.isActive,
      };
      createMutation.mutate(createData);
    }
  };

  // Handle edit click
  const handleEdit = (supplyType: SupplyType) => {
    setEditingSupplyType(supplyType);
    form.reset({
      code: supplyType.code,
      name: supplyType.name,
      description: supplyType.description || "",
      isActive: supplyType.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle delete click
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this supply type?")) {
      deleteMutation.mutate(id);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Supply types data has been refreshed",
    });
  };

  // Export to CSV
  const handleExport = () => {
    if (!Array.isArray(supplyTypes) || supplyTypes.length === 0) {
      toast({
        title: "No Data",
        description: "No supply types to export",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["Code", "Name", "Description", "Active", "Updated"],
      ...supplyTypes.map((item: SupplyType) => [
        item.code,
        item.name,
        item.description || "",
        item.isActive ? "Yes" : "No",
        new Date(item.updatedAt).toLocaleDateString(),
      ]),
    ]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supply_types.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter supply types based on search
  const filteredSupplyTypes = Array.isArray(supplyTypes)
    ? supplyTypes.filter((item: SupplyType) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : [];

  return (
    <div className="space-y-6">
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
          Master Data → Supply Types
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supply Types</h1>
          <p className="text-muted-foreground">
            Manage supply type classifications for procurement processes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supply Types Management</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supply types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!Array.isArray(supplyTypes) || supplyTypes.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supply Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSupplyType ? "Edit Supply Type" : "Create New Supply Type"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., DIRECT, INDIRECT, SERVICES"
                                className="uppercase"
                                maxLength={10}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Required. Max 10 characters. Use uppercase letters, numbers, and underscores only.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Direct Materials, Indirect Supplies"
                                maxLength={100}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Required. Max 100 characters. Descriptive name for the supply type.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Raw materials used directly in production processes"
                                maxLength={500}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Optional. Max 500 characters. Detailed description of this supply type.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Enable this supply type for use
                              </div>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false);
                            setEditingSupplyType(null);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingSupplyType ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading supply types...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupplyTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No supply types found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSupplyTypes.map((supplyType: SupplyType) => (
                    <TableRow key={supplyType.id}>
                      <TableCell className="font-medium">{supplyType.code}</TableCell>
                      <TableCell className="font-medium">{supplyType.name}</TableCell>
                      <TableCell>{supplyType.description || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${supplyType.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {supplyType.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[9999]">
                            <DropdownMenuItem onClick={() => { setViewDetailsSupplyType(supplyType); setAdminDataOpen(false); }}>
                              <Search className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(supplyType)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(supplyType.id)}
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
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!viewDetailsSupplyType} onOpenChange={(open) => !open && setViewDetailsSupplyType(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Supply Type Details</DialogTitle>
          </DialogHeader>
          {viewDetailsSupplyType && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Code</h4>
                  <p>{viewDetailsSupplyType.code}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Status</h4>
                  <p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewDetailsSupplyType.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {viewDetailsSupplyType.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-500">Name</h4>
                <p>{viewDetailsSupplyType.name}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-500">Description</h4>
                <p>{viewDetailsSupplyType.description || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Created At</h4>
                  <p>{viewDetailsSupplyType.createdAt ? new Date(viewDetailsSupplyType.createdAt).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Updated At</h4>
                  <p>{viewDetailsSupplyType.updatedAt ? new Date(viewDetailsSupplyType.updatedAt).toLocaleString() : "—"}</p>
                </div>
              </div>

              {/* Collapsible Administrative Data */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setAdminDataOpen(o => !o)}
                >
                  {adminDataOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Info className="h-3 w-3" />
                  Administrative Data
                </button>
                {adminDataOpen && (
                  <dl className="mt-2 grid grid-cols-1 gap-y-1 text-xs text-gray-400">
                    <div><dt className="font-medium inline">Created By (ID): </dt><dd className="inline">{viewDetailsSupplyType._createdBy ?? "—"}</dd></div>
                    <div><dt className="font-medium inline">Updated By (ID): </dt><dd className="inline">{viewDetailsSupplyType._updatedBy ?? "—"}</dd></div>
                    <div><dt className="font-medium inline">Tenant ID: </dt><dd className="inline">{viewDetailsSupplyType._tenantId ?? "—"}</dd></div>
                  </dl>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setViewDetailsSupplyType(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}