import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Edit2, Trash2, ArrowLeft, MoreHorizontal, Eye, Globe, ChevronDown, ChevronRight, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

interface Division {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Audit trail fields
  _tenantId?: string | null;
  _createdBy?: number | null;
  _updatedBy?: number | null;
  _deletedAt?: string | null;
}

interface DivisionFormData {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function Divisions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [viewingDivision, setViewingDivision] = useState<Division | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const [formData, setFormData] = useState<DivisionFormData>({
    code: "",
    name: "",
    description: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch divisions
  const { data: divisions = [], isLoading, refetch } = useQuery<Division[]>({
    queryKey: ["/api/master-data/divisions"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/divisions");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching divisions:", error);
        return [];
      }
    },
  });

  // Create division mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<DivisionFormData, 'code'>) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive
      };

      const response = await apiRequest("/api/master-data/divisions", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create division`);
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/divisions"] });
      setIsCreateDialogOpen(false);
      setEditingDivision(null);
      resetForm();
      toast({ title: "Success", description: "Division created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to create division.", variant: "destructive" });
    }
  });

  // Update division mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DivisionFormData> }) => {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || null,
        isActive: data.isActive
      };
      const response = await apiRequest(`/api/master-data/divisions/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/divisions"] });
      setIsCreateDialogOpen(false);
      setEditingDivision(null);
      resetForm();
      toast({ title: "Success", description: "Division updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update division.", variant: "destructive" });
    }
  });

  // Delete division mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/divisions/${id}`, {
        method: "DELETE"
      });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/divisions"] });
      toast({ title: "Success", description: "Division deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to delete division.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive"
      });
      return;
    }

    if (editingDivision) {
      updateMutation.mutate({ id: editingDivision.id, data: formData });
    } else {
      const { code, ...dataWithoutCode } = formData;
      createMutation.mutate(dataWithoutCode);
    }
  };

  const handleEdit = (division: Division) => {
    setEditingDivision(division);
    setFormData({
      code: division.code,
      name: division.name,
      description: division.description || "",
      isActive: division.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this division?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetails = (division: Division) => {
    setViewingDivision(division);
    setIsViewDetailsOpen(true);
  };

  const filteredDivisions = divisions.filter((division) =>
    division.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    division.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (division.description && division.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <h1 className="text-2xl font-bold">Divisions</h1>
            <p className="text-sm text-muted-foreground">
              Manage organizational divisions for sales structure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Division
          </Button>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search divisions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          title="Refresh divisions data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Divisions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Divisions</CardTitle>
          <CardDescription>
            All registered divisions in your organization
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
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredDivisions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No divisions found. {searchTerm ? "Try a different search." : "Create your first division."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDivisions.map((division) => (
                      <TableRow
                        key={division.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetails(division)}
                      >
                        <TableCell className="font-medium">{division.code}</TableCell>
                        <TableCell>{division.name}</TableCell>
                        <TableCell>{division.description || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${division.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {division.isActive ? "Active" : "Inactive"}
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
                              <DropdownMenuItem onClick={() => handleViewDetails(division)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(division)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(division.id)}
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

      {/* Create/Edit Division Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          setEditingDivision(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDivision ? "Edit Division" : "Create New Division"}
            </DialogTitle>
            <DialogDescription>
              {editingDivision
                ? "Update division information below."
                : "Enter division details to create a new division."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {editingDivision && (
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Code (auto-generated)"
                    maxLength={5}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
                </div>
              )}
              <div className={editingDivision ? "" : "col-span-2"}>
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter division name"
                  required
                />
              </div>
            </div>
            {!editingDivision && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Division code will be automatically generated when you create the division.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter division description (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingDivision(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingDivision ? "Update" : "Create"} Division
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Division Details</DialogTitle>
            <DialogDescription>
              Complete information about this division
            </DialogDescription>
          </DialogHeader>
          {viewingDivision && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Code</Label>
                  <p className="font-mono font-semibold text-lg">{viewingDivision.code}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${viewingDivision.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {viewingDivision.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Name</Label>
                <p className="font-medium text-lg">{viewingDivision.name}</p>
              </div>

              {viewingDivision.description && (
                <div>
                  <Label className="text-gray-500">Description</Label>
                  <p className="text-gray-700">{viewingDivision.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900">System Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <Label className="text-gray-500">Created At</Label>
                    <p className="text-gray-700">
                      {viewingDivision.createdAt
                        ? new Date(viewingDivision.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Updated At</Label>
                    <p className="text-gray-700">
                      {viewingDivision.updatedAt
                        ? new Date(viewingDivision.updatedAt).toLocaleString()
                        : "-"}
                    </p>
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
                      <div><dt className="font-medium inline">Created By (ID): </dt><dd className="inline">{viewingDivision._createdBy ?? "—"}</dd></div>
                      <div><dt className="font-medium inline">Updated By (ID): </dt><dd className="inline">{viewingDivision._updatedBy ?? "—"}</dd></div>
                      <div><dt className="font-medium inline">Tenant ID: </dt><dd className="inline">{viewingDivision._tenantId ?? "—"}</dd></div>
                    </dl>
                  )}
                </div>
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
                    handleEdit(viewingDivision);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Division
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
