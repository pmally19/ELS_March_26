import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Edit2, Trash2, ArrowLeft, MoreHorizontal, Eye, Building, Globe, MapPin, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

interface SalesArea {
  id: number;
  sales_org_code: string;
  sales_org_name?: string;
  distribution_channel_code: string;
  distribution_channel_name?: string;
  division_code: string;
  division_name?: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Audit trail fields
  _tenantId?: string | null;
  _createdBy?: number | null;
  _updatedBy?: number | null;
  _deletedAt?: string | null;
}

interface SalesAreaFormData {
  sales_org_code: string;
  distribution_channel_code: string;
  division_code: string;
  name: string;
  is_active: boolean;
}

interface SalesOffice {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface SalesOfficeAssignment {
  id: number;
  salesAreaId: number;
  salesOfficeCode: string;
  salesOfficeName: string;
  salesOfficeDescription: string;
  createdAt: string;
}

export default function SalesAreas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSalesArea, setEditingSalesArea] = useState<SalesArea | null>(null);
  const [viewingSalesArea, setViewingSalesArea] = useState<SalesArea | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SalesAreaFormData>({
    sales_org_code: "",
    distribution_channel_code: "",
    division_code: "",
    name: "",
    is_active: true
  });

  // Assignment Tab State
  const [selectedSalesAreaIdForAssignment, setSelectedSalesAreaIdForAssignment] = useState<string>("");
  const [selectedOfficeToAssign, setSelectedOfficeToAssign] = useState<string>("");

  const queryClient = useQueryClient();

  // Fetch sales organizations
  const { data: salesOrganizations = [] } = useQuery({
    queryKey: ["/api/master-data/sales-organization"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/sales-organization");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((so: any) => so.isActive !== false && so.status !== 'inactive') : [];
      } catch (error) {
        console.error("Error fetching sales organizations:", error);
        return [];
      }
    },
  });

  // Fetch distribution channels
  const { data: distributionChannels = [] } = useQuery({
    queryKey: ["/api/master-data/distribution-channels"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/distribution-channels");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((dc: any) => dc.isActive !== false) : [];
      } catch (error) {
        console.error("Error fetching distribution channels:", error);
        return [];
      }
    },
  });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ["/api/master-data/divisions"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/divisions");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((d: any) => d.isActive !== false) : [];
      } catch (error) {
        console.error("Error fetching divisions:", error);
        return [];
      }
    },
  });

  // Fetch sales areas with real-time updates
  const { data: salesAreas = [], isLoading, refetch } = useQuery<SalesArea[]>({
    queryKey: ["/api/master-data/sales-areas"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/sales-areas");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching sales areas:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Fetch sales offices (for assignment)
  const { data: salesOffices = [] } = useQuery<SalesOffice[]>({
    queryKey: ["/api/sales-distribution/sales-offices"],
    queryFn: async () => {
      const res = await apiRequest("/api/sales-distribution/sales-offices");
      return res.json();
    },
  });

  // Fetch assignments for selected sales area
  const { data: assignments = [], refetch: refetchAssignments } = useQuery<SalesOfficeAssignment[]>({
    queryKey: ["/api/sales-distribution/sales-office-assignments", selectedSalesAreaIdForAssignment],
    queryFn: async () => {
      if (!selectedSalesAreaIdForAssignment) return [];
      const res = await apiRequest(`/api/sales-distribution/sales-office-assignments/${selectedSalesAreaIdForAssignment}`);
      return res.json();
    },
    enabled: !!selectedSalesAreaIdForAssignment,
  });

  // Create sales area mutation
  const createMutation = useMutation({
    mutationFn: async (data: SalesAreaFormData) => {
      const payload = {
        sales_org_code: data.sales_org_code,
        distribution_channel_code: data.distribution_channel_code,
        division_code: data.division_code,
        name: data.name,
        is_active: data.is_active
      };

      console.log('Creating sales area with payload:', payload);

      const response = await apiRequest("/api/master-data/sales-areas", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Sales area creation failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to create sales area: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/sales-areas"] });
      setIsCreateDialogOpen(false);
      setEditingSalesArea(null);
      resetForm();
      toast({ title: "Success", description: "Sales area created successfully." });
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to create sales area.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Update sales area mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SalesAreaFormData> }) => {
      const payload = {
        sales_org_code: data.sales_org_code,
        distribution_channel_code: data.distribution_channel_code,
        division_code: data.division_code,
        name: data.name,
        is_active: data.is_active
      };
      const response = await apiRequest(`/api/master-data/sales-areas/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update sales area: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/sales-areas"] });
      setIsCreateDialogOpen(false);
      setEditingSalesArea(null);
      resetForm();
      toast({ title: "Success", description: "Sales area updated successfully." });
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to update sales area.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Delete sales area mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/sales-areas/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete sales area: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/sales-areas"] });
      toast({ title: "Success", description: "Sales area deleted successfully." });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to delete sales area.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Assign Sales Office Mutation
  const assignOfficeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/sales-distribution/sales-office-assignments", {
        method: "POST",
        body: JSON.stringify({
          salesAreaId: parseInt(selectedSalesAreaIdForAssignment),
          salesOfficeCode: selectedOfficeToAssign
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to assign sales office");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchAssignments();
      setIsAssignDialogOpen(false);
      setSelectedOfficeToAssign("");
      toast({ title: "Success", description: "Sales office assigned successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete Assignment Mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (salesOfficeCode: string) => {
      const response = await apiRequest(`/api/sales-distribution/sales-office-assignments/${selectedSalesAreaIdForAssignment}/${salesOfficeCode}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Failed to remove assignment");
      }
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Success", description: "Assignment removed successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      sales_org_code: "",
      distribution_channel_code: "",
      division_code: "",
      name: "",
      is_active: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sales_org_code || !formData.distribution_channel_code || !formData.division_code || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Sales organization, distribution channel, division, and name are required.",
        variant: "destructive"
      });
      return;
    }

    if (editingSalesArea) {
      updateMutation.mutate({ id: editingSalesArea.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (salesArea: SalesArea) => {
    setEditingSalesArea(salesArea);
    setFormData({
      sales_org_code: salesArea.sales_org_code,
      distribution_channel_code: salesArea.distribution_channel_code,
      division_code: salesArea.division_code,
      name: salesArea.name,
      is_active: salesArea.is_active
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this sales area?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetails = (salesArea: SalesArea) => {
    setViewingSalesArea(salesArea);
    setIsViewDetailsOpen(true);
  };

  const filteredSalesAreas = salesAreas.filter((salesArea) =>
    salesArea.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.sales_org_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.distribution_channel_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.division_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.sales_org_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.distribution_channel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesArea.division_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sales Areas</h1>
            <p className="text-sm text-muted-foreground">
              Manage sales area combinations and office assignments
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales-areas" className="w-full">
        <TabsList>
          <TabsTrigger value="sales-areas">Sales Areas</TabsTrigger>
          <TabsTrigger value="assignments">Sales Office Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="sales-areas" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sales areas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
                title="Refresh sales areas data"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Sales Area
            </Button>
          </div>

          {/* Sales Areas Table */}
          <Card>
            <CardContent className="p-0">
              <div className="border rounded-md">
                <div className="relative max-h-[600px] overflow-auto">
                  {isLoading ? (
                    <div className="text-center py-8">Loading sales areas...</div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-[200px]">Sales Organization</TableHead>
                          <TableHead className="w-[200px] hidden md:table-cell">Distribution Channel</TableHead>
                          <TableHead className="w-[150px] hidden md:table-cell">Division</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[100px] text-center">Status</TableHead>
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesAreas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {searchTerm ? "No sales areas found matching your search." : "No sales areas available. Create one to get started."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSalesAreas.map((salesArea) => (
                            <TableRow
                              key={salesArea.id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleViewDetails(salesArea)}
                            >
                              <TableCell className="py-4">
                                <div className="font-medium">{salesArea.sales_org_name || salesArea.sales_org_code}</div>
                                <div className="text-sm text-gray-500 font-mono">{salesArea.sales_org_code}</div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell py-4">
                                <div className="font-medium">{salesArea.distribution_channel_name || salesArea.distribution_channel_code}</div>
                                <div className="text-sm text-gray-500 font-mono">{salesArea.distribution_channel_code}</div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell py-4">
                                <div className="font-medium">{salesArea.division_name || salesArea.division_code}</div>
                                <div className="text-sm text-gray-500 font-mono">{salesArea.division_code}</div>
                              </TableCell>
                              <TableCell className="font-medium">{salesArea.name}</TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${salesArea.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                  {salesArea.is_active ? "Active" : "Inactive"}
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
                                    <DropdownMenuItem onClick={() => handleViewDetails(salesArea)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(salesArea)}>
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(salesArea.id)}
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Office Assignment</CardTitle>
              <CardDescription>Assign sales offices to specific sales areas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="w-full md:w-1/2">
                  <Label>Select Sales Area</Label>
                  <Select
                    value={selectedSalesAreaIdForAssignment}
                    onValueChange={setSelectedSalesAreaIdForAssignment}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a Sales Area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {salesAreas.map((sa) => (
                        <SelectItem key={sa.id} value={sa.id.toString()}>
                          {sa.name} ({sa.sales_org_code}/{sa.distribution_channel_code}/{sa.division_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSalesAreaIdForAssignment && (
                  <Button onClick={() => setIsAssignDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Sales Office
                  </Button>
                )}
              </div>

              {selectedSalesAreaIdForAssignment ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Office</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Assigned On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No sales offices assigned to this sales area.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div className="font-medium">{assignment.salesOfficeName}</div>
                              <div className="text-sm text-gray-500 font-mono">{assignment.salesOfficeCode}</div>
                            </TableCell>
                            <TableCell>{assignment.salesOfficeDescription || '-'}</TableCell>
                            <TableCell>{new Date(assignment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Are you sure you want to remove this assignment?")) {
                                    deleteAssignmentMutation.mutate(assignment.salesOfficeCode);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Please select a Sales Area to view and manage assignments.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sales Area Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSalesArea ? "Edit Sales Area" : "Create Sales Area"}</DialogTitle>
            <DialogDescription>
              {editingSalesArea ? "Update the sales area details below." : "Fill in the details to create a new sales area."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesOrg">Sales Organization *</Label>
                <Select
                  value={formData.sales_org_code}
                  onValueChange={(value) => setFormData({ ...formData, sales_org_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Sales Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrganizations.map((org: any) => (
                      <SelectItem key={org.id} value={org.code}>
                        {org.name} ({org.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distributionChannel">Distribution Channel *</Label>
                <Select
                  value={formData.distribution_channel_code}
                  onValueChange={(value) => setFormData({ ...formData, distribution_channel_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Distribution Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributionChannels.map((channel: any) => (
                      <SelectItem key={channel.id} value={channel.code}>
                        {channel.name} ({channel.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division *</Label>
                <Select
                  value={formData.division_code}
                  onValueChange={(value) => setFormData({ ...formData, division_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division: any) => (
                      <SelectItem key={division.id} value={division.code}>
                        {division.name} ({division.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Sales Area Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter sales area name"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingSalesArea(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSalesArea ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Sales Office Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Sales Office</DialogTitle>
            <DialogDescription>
              Select a sales office to assign to the selected sales area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sales Office</Label>
              <Select
                value={selectedOfficeToAssign}
                onValueChange={setSelectedOfficeToAssign}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Sales Office" />
                </SelectTrigger>
                <SelectContent>
                  {salesOffices
                    .filter(so => !assignments.some(a => a.salesOfficeCode === so.code)) // Exclude already assigned
                    .map((so) => (
                      <SelectItem key={so.id} value={so.code}>
                        {so.name} ({so.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => assignOfficeMutation.mutate()}
                disabled={!selectedOfficeToAssign || assignOfficeMutation.isPending}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* View Details Dialog */}
      < Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen} >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingSalesArea && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Sales Area Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingSalesArea.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingSalesArea.name}</h3>
                    <div className="flex items-center mt-1">
                      <Badge
                        variant={viewingSalesArea.is_active ? "default" : "secondary"}
                        className={viewingSalesArea.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingSalesArea.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsViewDetailsOpen(false);
                        handleEdit(viewingSalesArea);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsViewDetailsOpen(false);
                        handleDelete(viewingSalesArea.id);
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
                        Sales Organization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.sales_org_code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.sales_org_name || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Distribution Channel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.distribution_channel_code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.distribution_channel_name || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Division
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.division_code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.division_name || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sales Area Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesArea.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Created:</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(viewingSalesArea.created_at).toLocaleDateString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Updated:</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(viewingSalesArea.updated_at).toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>

                      {/* Collapsible Administrative Data */}
                      <div className="border-t mt-3 pt-3">
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
                            <div><dt className="font-medium inline">Created By (ID): </dt><dd className="inline">{viewingSalesArea._createdBy ?? "—"}</dd></div>
                            <div><dt className="font-medium inline">Updated By (ID): </dt><dd className="inline">{viewingSalesArea._updatedBy ?? "—"}</dd></div>
                            <div><dt className="font-medium inline">Tenant ID: </dt><dd className="inline">{viewingSalesArea._tenantId ?? "—"}</dd></div>
                          </dl>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
}

