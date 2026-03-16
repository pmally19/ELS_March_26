import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, Search, ArrowLeft, Eye, Building, Calendar, Database } from "lucide-react";
import { Link } from "wouter";

const businessAreaSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  description: z.string().min(1, "Description is required").max(100, "Description must be 100 characters or less"),
  company_code_id: z.number().optional().nullable(),
  parent_business_area_code: z.string().max(10, "Parent business area code must be 10 characters or less").optional().nullable(),
  is_active: z.boolean().default(true),
});

type BusinessArea = z.infer<typeof businessAreaSchema> & {
  id: number;
  company_code?: string;
  company_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
  tenant_id?: string;
};

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export default function BusinessArea() {
  const [open, setOpen] = useState(false);
  const [editingBusinessArea, setEditingBusinessArea] = useState<BusinessArea | null>(null);
  const [viewingBusinessArea, setViewingBusinessArea] = useState<BusinessArea | null>(null);
  const [showAdminData, setShowAdminData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch business areas
  const { data: businessAreas = [], isLoading, refetch } = useQuery<BusinessArea[]>({
    queryKey: ["/api/master-data/business-areas"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/business-areas");
      if (!response.ok) {
        throw new Error("Failed to fetch business areas");
      }
      return response.json();
    },
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [], isLoading: isLoadingCompanyCodes } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/company-code");
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data.map((code: any) => ({
        id: code.id,
        code: code.code,
        name: code.name || code.code,
        description: code.description
      })) : [];
    },
  });

  const form = useForm<z.infer<typeof businessAreaSchema>>({
    resolver: zodResolver(businessAreaSchema),
    defaultValues: {
      code: "",
      description: "",
      company_code_id: undefined,
      parent_business_area_code: "",
      is_active: true,
    },
  });

  // Filter business areas based on search term
  const filteredBusinessAreas = businessAreas.filter((area) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      area.code?.toLowerCase().includes(searchLower) ||
      area.description?.toLowerCase().includes(searchLower) ||
      area.company_code?.toLowerCase().includes(searchLower) ||
      area.company_name?.toLowerCase().includes(searchLower) ||
      area.parent_business_area_code?.toLowerCase().includes(searchLower)
    );
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof businessAreaSchema>) => {
      const response = await apiRequest("/api/master-data/business-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create business area" }));
        throw new Error(errorData.message || "Failed to create business area");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/business-areas"] });
      setOpen(false);
      setEditingBusinessArea(null);
      form.reset({
        code: "",
        description: "",
        company_code_id: undefined,
        parent_business_area_code: "",
        is_active: true,
      });
      toast({ title: "Success", description: "Business area created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create business area";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof businessAreaSchema> }) => {
      const response = await apiRequest(`/api/master-data/business-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update business area" }));
        throw new Error(errorData.message || "Failed to update business area");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/business-areas"] });
      setOpen(false);
      setEditingBusinessArea(null);
      form.reset({
        code: "",
        description: "",
        company_code_id: undefined,
        parent_business_area_code: "",
        is_active: true,
      });
      toast({ title: "Success", description: "Business area updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update business area";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/business-areas/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete business area" }));
        throw new Error(errorData.message || "Failed to delete business area");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/business-areas"] });
      toast({ title: "Success", description: "Business area deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete business area";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingBusinessArea(null);
    form.reset({
      code: "",
      description: "",
      company_code_id: undefined,
      parent_business_area_code: "",
      is_active: true,
    });
    setOpen(true);
  };

  const handleEdit = (area: BusinessArea) => {
    setEditingBusinessArea(area);
    form.reset({
      code: area.code,
      description: area.description,
      company_code_id: area.company_code_id || undefined,
      parent_business_area_code: area.parent_business_area_code || "",
      is_active: area.is_active ?? true,
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this business area?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof businessAreaSchema>) => {
    if (editingBusinessArea) {
      updateMutation.mutate({ id: editingBusinessArea.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "Business areas data has been refreshed" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business areas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Areas</h1>
            <p className="text-gray-600">Manage business area master data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search business areas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Business Areas</CardTitle>
          <CardDescription>
            {filteredBusinessAreas.length} business area{filteredBusinessAreas.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Parent Business Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinessAreas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? "No business areas found matching your search." : "No business areas found. Create one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBusinessAreas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.code}</TableCell>
                      <TableCell>{area.description}</TableCell>
                      <TableCell>
                        {area.company_code && area.company_name
                          ? `${area.company_code} - ${area.company_name}`
                          : area.company_code_id
                            ? `ID: ${area.company_code_id}`
                            : "-"}
                      </TableCell>
                      <TableCell>{area.parent_business_area_code || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={area.is_active ? "default" : "secondary"}>
                          {area.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingBusinessArea(area)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(area)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(area.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBusinessArea ? "Edit Business Area" : "Create New Business Area"}
            </DialogTitle>
            <DialogDescription>
              {editingBusinessArea
                ? "Update the business area information below."
                : "Fill in the information below to create a new business area."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_code_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || undefined}
                          onValueChange={(value) => {
                            field.onChange(value ? parseInt(value) : undefined);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company code (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyCodes.map((code) => (
                              <SelectItem key={code.id} value={code.id.toString()}>
                                {code.code} - {code.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parent_business_area_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Business Area Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent business area code" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingBusinessArea(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingBusinessArea ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Business Area Details Dialog */}
      <Dialog open={!!viewingBusinessArea} onOpenChange={(open) => !open && setViewingBusinessArea(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingBusinessArea && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingBusinessArea(null)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Business Area Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingBusinessArea.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingBusinessArea.description}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingBusinessArea.code}
                      </Badge>
                      <Badge
                        variant={viewingBusinessArea.is_active ? "default" : "secondary"}
                        className={viewingBusinessArea.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingBusinessArea.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleEdit(viewingBusinessArea);
                        setViewingBusinessArea(null);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        handleDelete(viewingBusinessArea.id);
                        setViewingBusinessArea(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingBusinessArea.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Description:</dt>
                          <dd className="text-sm text-gray-900">{viewingBusinessArea.description}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Parent Area:</dt>
                          <dd className="text-sm text-gray-900">{viewingBusinessArea.parent_business_area_code || '—'}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        Organizational Link
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Company Code:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingBusinessArea.company_code && viewingBusinessArea.company_name
                              ? `${viewingBusinessArea.company_code} - ${viewingBusinessArea.company_name}`
                              : viewingBusinessArea.company_code_id
                                ? `ID: ${viewingBusinessArea.company_code_id}`
                                : "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowAdminData(!showAdminData)}>
                      <div className="flex justify-between items-center w-full">
                        <CardTitle className="text-lg flex items-center">
                          <Database className="h-4 w-4 mr-2" />
                          Administrative Data
                        </CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: showAdminData ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </CardHeader>
                    {showAdminData && (
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500">Created By</dt>
                            <dd className="text-sm text-gray-900">{viewingBusinessArea.created_by ?? '—'}</dd>
                          </div>
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                            <dd className="text-sm text-gray-900">{viewingBusinessArea.updated_by ?? '—'}</dd>
                          </div>
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500">Created At</dt>
                            <dd className="text-sm text-gray-900">{viewingBusinessArea.created_at ? new Date(viewingBusinessArea.created_at).toLocaleString() : '—'}</dd>
                          </div>
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                            <dd className="text-sm text-gray-900">{viewingBusinessArea.updated_at ? new Date(viewingBusinessArea.updated_at).toLocaleString() : '—'}</dd>
                          </div>
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                            <dd className="text-sm text-gray-900">{viewingBusinessArea.tenant_id ?? '—'}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
