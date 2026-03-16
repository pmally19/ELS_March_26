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
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface VendorGroup {
  id: number;
  code: string;
  description: string;
  accountGroup?: string;
  reconciliationAccount?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VendorGroupFormData {
  code: string;
  description: string;
  accountGroup?: string;
  reconciliationAccount?: string;
  isActive: boolean;
}

export default function VendorGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVendorGroup, setEditingVendorGroup] = useState<VendorGroup | null>(null);
  const [formData, setFormData] = useState<VendorGroupFormData>({
    code: "",
    description: "",
    accountGroup: "",
    reconciliationAccount: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch vendor groups
  const { data: vendorGroups = [], isLoading, refetch } = useQuery<VendorGroup[]>({
    queryKey: ["/api/master-data/vendor-groups"],
  });

  // Create vendor group mutation
  const createMutation = useMutation({
    mutationFn: (data: VendorGroupFormData) => apiRequest("/api/master-data/vendor-groups", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendor-groups"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Vendor group created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create vendor group.", variant: "destructive" });
    }
  });

  // Update vendor group mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VendorGroupFormData> }) =>
      apiRequest(`/api/master-data/vendor-groups/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendor-groups"] });
      setEditingVendorGroup(null);
      resetForm();
      toast({ title: "Success", description: "Vendor group updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update vendor group.", variant: "destructive" });
    }
  });

  // Delete vendor group mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/vendor-groups/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendor-groups"] });
      toast({ title: "Success", description: "Vendor group deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete vendor group.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/vendor-groups/import", "POST", formData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendor-groups"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} vendor groups. ${data.errors?.length || 0} errors.` 
      });
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Failed to import Excel file.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      accountGroup: "",
      reconciliationAccount: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) {
      toast({ title: "Validation Error", description: "Code and description are required.", variant: "destructive" });
      return;
    }

    if (editingVendorGroup) {
      updateMutation.mutate({ id: editingVendorGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (vendorGroup: VendorGroup) => {
    setEditingVendorGroup(vendorGroup);
    setFormData({
      code: vendorGroup.code,
      description: vendorGroup.description,
      accountGroup: vendorGroup.accountGroup || "",
      reconciliationAccount: vendorGroup.reconciliationAccount || "",
      isActive: vendorGroup.isActive
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
      ["Code", "Description", "Account Group", "Reconciliation Account", "Active", "Created At"].join(","),
      ...filteredVendorGroups.map(vg => [
        vg.code,
        vg.description,
        vg.accountGroup || "",
        vg.reconciliationAccount || "",
        vg.isActive ? "Yes" : "No",
        new Date(vg.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor_groups.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredVendorGroups = vendorGroups.filter(vg =>
    vg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Groups</h1>
          <p className="text-muted-foreground">Manage vendor classification and account assignments</p>
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
              <Button onClick={() => { resetForm(); setEditingVendorGroup(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVendorGroup ? "Edit Vendor Group" : "Create New Vendor Group"}</DialogTitle>
                <DialogDescription>
                  {editingVendorGroup ? "Update vendor group information." : "Add a new vendor group to the system."}
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
                      placeholder="VG001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Vendor group description"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountGroup">Account Group</Label>
                    <Input
                      id="accountGroup"
                      value={formData.accountGroup}
                      onChange={(e) => setFormData({ ...formData, accountGroup: e.target.value })}
                      placeholder="AG001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reconciliationAccount">Reconciliation Account</Label>
                    <Input
                      id="reconciliationAccount"
                      value={formData.reconciliationAccount}
                      onChange={(e) => setFormData({ ...formData, reconciliationAccount: e.target.value })}
                      placeholder="200001"
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
                    {editingVendorGroup ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Groups</CardTitle>
          <CardDescription>
            Configure vendor groups for classification and account determination
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading vendor groups...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account Group</TableHead>
                  <TableHead>Reconciliation Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendorGroups.map((vendorGroup) => (
                  <TableRow key={vendorGroup.id}>
                    <TableCell className="font-medium">{vendorGroup.code}</TableCell>
                    <TableCell>{vendorGroup.description}</TableCell>
                    <TableCell>{vendorGroup.accountGroup || "-"}</TableCell>
                    <TableCell>{vendorGroup.reconciliationAccount || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={vendorGroup.isActive ? "default" : "secondary"}>
                        {vendorGroup.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(vendorGroup.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(vendorGroup)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(vendorGroup.id)}
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