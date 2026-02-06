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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft, Percent } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

interface DiscountGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  discountPercent: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  minimumOrderValue?: number;
  maximumDiscount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiscountGroupFormData {
  code: string;
  name: string;
  description?: string;
  discountPercent: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  minimumOrderValue?: number;
  maximumDiscount?: number;
  isActive: boolean;
}

export default function DiscountGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscountGroup | null>(null);
  const [newGroup, setNewGroup] = useState<Partial<DiscountGroupFormData>>({
    code: "",
    name: "",
    description: "",
    discountPercent: undefined,
    discountType: undefined,
    minimumOrderValue: undefined,
    maximumDiscount: undefined,
    isActive: true
  });

  const queryClient = useQueryClient();

  const { data: discountGroups = [], isLoading, refetch } = useQuery<DiscountGroup[]>({
    queryKey: ['/api/master-data/discount-groups'],
  });

  const createMutation = useMutation({
    mutationFn: (data: DiscountGroupFormData) => 
      apiRequest('/api/master-data/discount-groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/discount-groups'] });
      setIsCreateDialogOpen(false);
      setNewGroup({
        code: "",
        name: "",
        description: "",
        discountPercent: undefined,
        discountType: undefined,
        minimumOrderValue: undefined,
        maximumDiscount: undefined,
        isActive: true
      });
      toast({
        title: "Success",
        description: "Discount group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create discount group",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DiscountGroupFormData> }) =>
      apiRequest(`/api/master-data/discount-groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/discount-groups'] });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      toast({
        title: "Success",
        description: "Discount group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discount group",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/discount-groups/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/discount-groups'] });
      toast({
        title: "Success",
        description: "Discount group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete discount group",
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/master-data/discount-groups/seed', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/discount-groups'] });
      toast({
        title: "Success",
        description: "Sample discount groups added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed discount groups",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newGroup.code || !newGroup.name || 
        newGroup.discountPercent === undefined || 
        newGroup.discountPercent === null ||
        newGroup.discountPercent < 0 ||
        !newGroup.discountType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Code, Name, Discount Percent, Discount Type)",
        variant: "destructive",
      });
      return;
    }
    // Convert undefined to null for optional fields
    const formData: DiscountGroupFormData = {
      code: newGroup.code!,
      name: newGroup.name!,
      description: newGroup.description || undefined,
      discountPercent: newGroup.discountPercent!,
      discountType: newGroup.discountType!,
      minimumOrderValue: newGroup.minimumOrderValue ?? 0,
      maximumDiscount: newGroup.maximumDiscount ?? undefined,
      isActive: newGroup.isActive ?? true
    };
    createMutation.mutate(formData);
  };

  const handleEdit = (group: DiscountGroup) => {
    setEditingGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingGroup) return;
    if (!editingGroup.code || !editingGroup.name || editingGroup.discountPercent < 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      id: editingGroup.id,
      data: {
        code: editingGroup.code,
        name: editingGroup.name,
        description: editingGroup.description,
        discountPercent: editingGroup.discountPercent,
        discountType: editingGroup.discountType,
        minimumOrderValue: editingGroup.minimumOrderValue,
        maximumDiscount: editingGroup.maximumDiscount,
        isActive: editingGroup.isActive,
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this discount group?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredGroups.map(group => ({
      Code: group.code,
      Name: group.name,
      Description: group.description || "",
      "Discount Percent": group.discountPercent,
      "Discount Type": group.discountType,
      "Minimum Order Value": group.minimumOrderValue || 0,
      "Maximum Discount": group.maximumDiscount || "",
      "Is Active": group.isActive ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Discount Groups");
    XLSX.writeFile(workbook, "discount_groups.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const groups = jsonData.map((row: any) => ({
          code: row.Code || row.code || "",
          name: row.Name || row.name || "",
          description: row.Description || row.description || "",
          discountPercent: parseFloat(row["Discount Percent"] || row.discountPercent || 0),
          discountType: (row["Discount Type"] || row.discountType || "PERCENTAGE").toUpperCase(),
          minimumOrderValue: parseFloat(row["Minimum Order Value"] || row.minimumOrderValue || 0),
          maximumDiscount: row["Maximum Discount"] || row.maximumDiscount ? parseFloat(row["Maximum Discount"] || row.maximumDiscount) : undefined,
          isActive: row["Is Active"] === "Yes" || row.isActive === true || row.IsActive === true,
        })).filter(g => g.code && g.name);

        if (groups.length === 0) {
          toast({
            title: "Error",
            description: "No valid discount groups found in file",
            variant: "destructive",
          });
          return;
        }

        for (const group of groups) {
          await apiRequest('/api/master-data/discount-groups', {
            method: 'POST',
            body: JSON.stringify(group),
          });
        }

        queryClient.invalidateQueries({ queryKey: ['/api/master-data/discount-groups'] });
        toast({
          title: "Success",
          description: `Imported ${groups.length} discount groups`,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to import file",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const filteredGroups = discountGroups.filter(group =>
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDiscountTypeColor = (type: string) => {
    return type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discount groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
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
          Master Data → Discount Groups
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-8 w-8 text-blue-600" />
            Discount Groups
          </h1>
          <p className="text-muted-foreground">Manage pricing discount classifications and rules</p>
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
          <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sample Data
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Discount Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Discount Group</DialogTitle>
                <DialogDescription>
                  Add a new discount group for pricing classification
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={newGroup.code}
                      onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value.toUpperCase() })}
                      placeholder="Enter group code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      placeholder="Enter group name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountPercent">Discount Amount *</Label>
                    <Input
                      id="discountPercent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newGroup.discountPercent ?? ""}
                      onChange={(e) => setNewGroup({ ...newGroup, discountPercent: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Enter discount amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select
                      value={newGroup.discountType}
                      onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') => setNewGroup({ ...newGroup, discountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrderValue">Minimum Order Value</Label>
                    <Input
                      id="minimumOrderValue"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newGroup.minimumOrderValue ?? ""}
                      onChange={(e) => setNewGroup({ ...newGroup, minimumOrderValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Enter minimum order value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maximumDiscount">Maximum Discount</Label>
                    <Input
                      id="maximumDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newGroup.maximumDiscount ?? ""}
                      onChange={(e) => setNewGroup({ ...newGroup, maximumDiscount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Enter maximum discount"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={newGroup.isActive}
                    onCheckedChange={(checked) => setNewGroup({ ...newGroup, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discount Groups</CardTitle>
              <CardDescription>
                Manage pricing discount classifications and rules
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Min Order Value</TableHead>
                <TableHead>Max Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.code}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description || "-"}</TableCell>
                  <TableCell>
                    {group.discountType === 'PERCENTAGE' 
                      ? `${Number(group.discountPercent || 0).toFixed(2)}%` 
                      : `$${Number(group.discountPercent || 0).toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <Badge className={getDiscountTypeColor(group.discountType)}>
                      {group.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {group.minimumOrderValue ? `$${Number(group.minimumOrderValue).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    {group.maximumDiscount ? `$${Number(group.maximumDiscount).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(group)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(group.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredGroups.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No groups found matching your search." : "No discount groups found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Discount Group</DialogTitle>
            <DialogDescription>
              Update the discount group information
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Code *</Label>
                  <Input
                    id="edit-code"
                    value={editingGroup.code}
                    onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value.toUpperCase() })}
                    placeholder="Enter group code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    placeholder="Enter group name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingGroup.description || ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-discountPercent">Discount Amount *</Label>
                  <Input
                    id="edit-discountPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingGroup.discountPercent}
                    onChange={(e) => setEditingGroup({ ...editingGroup, discountPercent: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter discount amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-discountType">Discount Type *</Label>
                  <Select
                    value={editingGroup.discountType}
                    onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') => setEditingGroup({ ...editingGroup, discountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-minimumOrderValue">Minimum Order Value</Label>
                  <Input
                    id="edit-minimumOrderValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingGroup.minimumOrderValue || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, minimumOrderValue: parseFloat(e.target.value) || undefined })}
                    placeholder="Enter minimum order value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maximumDiscount">Maximum Discount</Label>
                  <Input
                    id="edit-maximumDiscount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingGroup.maximumDiscount || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, maximumDiscount: parseFloat(e.target.value) || undefined })}
                    placeholder="Enter maximum discount"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingGroup.isActive}
                  onCheckedChange={(checked) => setEditingGroup({ ...editingGroup, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

