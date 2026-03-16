import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface MaterialGroup {
  id: number;
  code: string;
  description: string;
  materialGroupHierarchy?: string;
  material_group_hierarchy?: string;
  generalItemCategory?: string;
  general_item_category?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface MaterialGroupFormData {
  code: string;
  description: string;
  materialGroupHierarchy?: string;
  generalItemCategory?: string;
  isActive: boolean;
}

export default function MaterialGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMaterialGroup, setEditingMaterialGroup] = useState<MaterialGroup | null>(null);
  const [formData, setFormData] = useState<MaterialGroupFormData>({
    code: "",
    description: "",
    materialGroupHierarchy: "",
    generalItemCategory: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Helper function to normalize material group data (convert snake_case to camelCase)
  const normalizeMaterialGroup = (mg: any): MaterialGroup => ({
    id: mg.id,
    code: mg.code,
    description: mg.description,
    materialGroupHierarchy: mg.material_group_hierarchy || mg.materialGroupHierarchy || null,
    generalItemCategory: mg.general_item_category || mg.generalItemCategory || null,
    isActive: mg.is_active !== undefined ? mg.is_active : (mg.isActive !== undefined ? mg.isActive : true),
    createdAt: mg.created_at || mg.createdAt || '',
    updatedAt: mg.updated_at || mg.updatedAt || '',
  });

  // Fetch material groups
  const { data: materialGroupsRaw = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/master-data/material-groups"],
  });

  // Normalize the data
  const materialGroups = materialGroupsRaw.map(normalizeMaterialGroup);

  // Create material group mutation
  const createMutation = useMutation({
    mutationFn: async (data: MaterialGroupFormData) => {
      const res = await apiRequest("/api/master-data/material-groups", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-groups"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Material group created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create material group.", variant: "destructive" });
    }
  });

  // Update material group mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MaterialGroupFormData> }) => {
      const res = await apiRequest(`/api/master-data/material-groups/${id}`, { 
        method: "PUT", 
        body: JSON.stringify(data) 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-groups"] });
      setEditingMaterialGroup(null);
      resetForm();
      toast({ title: "Success", description: "Material group updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update material group.", variant: "destructive" });
    }
  });

  // Delete material group mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/master-data/material-groups/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-groups"] });
      toast({ title: "Success", description: "Material group deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete material group.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiRequest("/api/master-data/material-groups/import", { 
        method: "POST", 
        body: formData
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-groups"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported || data.imported?.length || 0} material groups. ${data.errors?.length || 0} errors.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Failed", description: error.message || "Failed to import Excel file.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      materialGroupHierarchy: "",
      generalItemCategory: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) {
      toast({ title: "Validation Error", description: "Code and description are required.", variant: "destructive" });
      return;
    }

    if (editingMaterialGroup) {
      updateMutation.mutate({ id: editingMaterialGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (materialGroup: MaterialGroup) => {
    setEditingMaterialGroup(materialGroup);
    setFormData({
      code: materialGroup.code,
      description: materialGroup.description,
      materialGroupHierarchy: materialGroup.materialGroupHierarchy || materialGroup.material_group_hierarchy || "",
      generalItemCategory: materialGroup.generalItemCategory || materialGroup.general_item_category || "",
      isActive: materialGroup.isActive !== undefined ? materialGroup.isActive : (materialGroup.is_active !== undefined ? materialGroup.is_active : true)
    });
    setIsCreateDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Code", "Description", "Material Group Hierarchy", "General Item Category", "Active", "Created At"].join(","),
      ...filteredMaterialGroups.map(mg => [
        mg.code,
        mg.description,
        mg.materialGroupHierarchy || "",
        mg.generalItemCategory || "",
        mg.isActive ? "Yes" : "No",
        new Date(mg.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material_groups.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredMaterialGroups = materialGroups.filter(mg =>
    mg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          Master Data → Material Groups
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Groups</h1>
          <p className="text-muted-foreground">Manage material classification and valuation settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: "none" }}
            id="excel-upload"
          />
          <Button variant="outline" onClick={() => document.getElementById("excel-upload")?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingMaterialGroup(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Material Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMaterialGroup ? "Edit Material Group" : "Create New Material Group"}</DialogTitle>
                <DialogDescription>
                  {editingMaterialGroup ? "Update material group information." : "Add a new material group to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="MG001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Material group description"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="materialGroupHierarchy">Material Group Hierarchy</Label>
                    <Input
                      id="materialGroupHierarchy"
                      value={formData.materialGroupHierarchy}
                      onChange={(e) => setFormData({ ...formData, materialGroupHierarchy: e.target.value })}
                      placeholder="Hierarchy path"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generalItemCategory">General Item Category</Label>
                    <Input
                      id="generalItemCategory"
                      value={formData.generalItemCategory}
                      onChange={(e) => setFormData({ ...formData, generalItemCategory: e.target.value })}
                      placeholder="Item category"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingMaterialGroup ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Groups</CardTitle>
          <CardDescription>
            Configure material groups for classification and valuation control
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search material groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading material groups...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Material Group Hierarchy</TableHead>
                  <TableHead>General Item Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterialGroups.map((materialGroup) => (
                  <TableRow key={materialGroup.id}>
                    <TableCell className="font-medium">{materialGroup.code}</TableCell>
                    <TableCell>{materialGroup.description}</TableCell>
                    <TableCell>{materialGroup.materialGroupHierarchy || "-"}</TableCell>
                    <TableCell>{materialGroup.generalItemCategory || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={materialGroup.isActive ? "default" : "secondary"}>
                        {materialGroup.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {materialGroup.createdAt ? 
                        (() => {
                          try {
                            const date = new Date(materialGroup.createdAt);
                            return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
                          } catch {
                            return "-";
                          }
                        })() 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(materialGroup)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(materialGroup.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}