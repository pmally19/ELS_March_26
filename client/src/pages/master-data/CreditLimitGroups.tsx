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
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface CreditLimitGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  creditLimit: number;
  currency: string;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH';
  paymentTermsCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CreditLimitGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CreditLimitGroup | null>(null);
  const [newGroup, setNewGroup] = useState<Partial<CreditLimitGroup>>({
    code: "",
    name: "",
    description: "",
    creditLimit: 0,
    currency: "USD",
    riskCategory: "MEDIUM",
    paymentTermsCode: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  const { data: creditLimitGroups = [], isLoading, refetch } = useQuery<CreditLimitGroup[]>({
    queryKey: ['/api/master-data/credit-limit-groups'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CreditLimitGroup>) => 
      apiRequest('/api/master-data/credit-limit-groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-limit-groups'] });
      setIsCreateDialogOpen(false);
      setNewGroup({
        code: "",
        name: "",
        description: "",
        creditLimit: 0,
        currency: "USD",
        riskCategory: "MEDIUM",
        paymentTermsCode: "",
        isActive: true
      });
      toast({
        title: "Success",
        description: "Credit limit group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create credit limit group",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreditLimitGroup> }) =>
      apiRequest(`/api/master-data/credit-limit-groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-limit-groups'] });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      toast({
        title: "Success",
        description: "Credit limit group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update credit limit group",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/credit-limit-groups/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-limit-groups'] });
      toast({
        title: "Success",
        description: "Credit limit group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credit limit group",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(newGroup);
  };

  const handleEdit = (group: CreditLimitGroup) => {
    setEditingGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: editingGroup });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this credit limit group?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement Excel import functionality
    toast({
      title: "Info",
      description: "Excel import functionality will be implemented soon",
    });
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export functionality
    toast({
      title: "Info",
      description: "CSV export functionality will be implemented soon",
    });
  };

  const getRiskCategoryColor = (riskCategory: string) => {
    switch (riskCategory) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredGroups = creditLimitGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Limit Groups</h1>
            <p className="text-muted-foreground">Manage customer credit classifications and limits</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading credit limit groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-4 flex items-center gap-4">
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
          Master Data → Credit Limit Groups
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Credit Limit Groups</h1>
          <p className="text-gray-600">Manage customer credit classifications and limits</p>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Credit Limit Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Credit Limit Group</DialogTitle>
                <DialogDescription>
                  Add a new credit limit group for customer classification
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={newGroup.code}
                      onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })}
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
                    <Label htmlFor="creditLimit">Credit Limit *</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      value={newGroup.creditLimit}
                      onChange={(e) => setNewGroup({ ...newGroup, creditLimit: Number(e.target.value) })}
                      placeholder="Enter credit limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Input
                      id="currency"
                      value={newGroup.currency}
                      onChange={(e) => setNewGroup({ ...newGroup, currency: e.target.value })}
                      placeholder="USD"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="riskCategory">Risk Category *</Label>
                    <Select
                      value={newGroup.riskCategory}
                      onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setNewGroup({ ...newGroup, riskCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low Risk</SelectItem>
                        <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                        <SelectItem value="HIGH">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTermsCode">Payment Terms Code</Label>
                    <Input
                      id="paymentTermsCode"
                      value={newGroup.paymentTermsCode}
                      onChange={(e) => setNewGroup({ ...newGroup, paymentTermsCode: e.target.value })}
                      placeholder="e.g., NET30"
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
              <CardTitle>Credit Limit Groups</CardTitle>
              <CardDescription>
                Manage customer credit classifications and limits
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
                <TableHead>Credit Limit</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Risk Category</TableHead>
                <TableHead>Payment Terms</TableHead>
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
                  <TableCell>{group.creditLimit.toLocaleString()}</TableCell>
                  <TableCell>{group.currency}</TableCell>
                  <TableCell>
                    <Badge className={getRiskCategoryColor(group.riskCategory)}>
                      {group.riskCategory}
                    </Badge>
                  </TableCell>
                  <TableCell>{group.paymentTermsCode || "-"}</TableCell>
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
                {searchTerm ? "No groups found matching your search." : "No credit limit groups found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Credit Limit Group</DialogTitle>
            <DialogDescription>
              Update the credit limit group information
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
                    onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
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
                  <Label htmlFor="edit-creditLimit">Credit Limit *</Label>
                  <Input
                    id="edit-creditLimit"
                    type="number"
                    value={editingGroup.creditLimit}
                    onChange={(e) => setEditingGroup({ ...editingGroup, creditLimit: Number(e.target.value) })}
                    placeholder="Enter credit limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currency">Currency *</Label>
                  <Input
                    id="edit-currency"
                    value={editingGroup.currency}
                    onChange={(e) => setEditingGroup({ ...editingGroup, currency: e.target.value })}
                    placeholder="USD"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-riskCategory">Risk Category *</Label>
                  <Select
                    value={editingGroup.riskCategory}
                    onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setEditingGroup({ ...editingGroup, riskCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low Risk</SelectItem>
                      <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                      <SelectItem value="HIGH">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentTermsCode">Payment Terms Code</Label>
                  <Input
                    id="edit-paymentTermsCode"
                    value={editingGroup.paymentTermsCode || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, paymentTermsCode: e.target.value })}
                    placeholder="e.g., NET30"
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
