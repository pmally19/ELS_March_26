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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface CustomerGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  accountGroupId?: number;
  reconciliationAccountId?: number;
  creditLimitGroupId?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerGroupFormData {
  code: string;
  name: string;
  description?: string;
  accountGroupId?: number;
  reconciliationAccountId?: number;
  creditLimitGroupId?: number;
  sortOrder: number;
  isActive: boolean;
}

interface AccountGroup {
  id: number;
  code: string;
  name: string;
}

interface ReconciliationAccount {
  id: number;
  code: string;
  name: string;
}

interface CreditLimitGroup {
  id: number;
  code: string;
  name: string;
}

export default function CustomerGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomerGroup, setEditingCustomerGroup] = useState<CustomerGroup | null>(null);
  const [formData, setFormData] = useState<CustomerGroupFormData>({
    code: "",
    name: "",
    description: "",
    accountGroupId: undefined,
    reconciliationAccountId: undefined,
    creditLimitGroupId: undefined,
    sortOrder: 0,
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch customer groups
  const { data: customerGroups = [], isLoading, refetch } = useQuery<CustomerGroup[]>({
    queryKey: ["/api/master-data/customer-groups"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/customer-groups");
      return await response.json();
    },
  });

  // Fetch account groups for dropdown
  const { data: accountGroups = [] } = useQuery<AccountGroup[]>({
    queryKey: ["/api/master-data/account-groups"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/account-groups");
      return await response.json();
    },
  });

  // Fetch reconciliation accounts for dropdown
  const { data: reconciliationAccounts = [] } = useQuery<ReconciliationAccount[]>({
    queryKey: ["/api/master-data/reconciliation-accounts"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/reconciliation-accounts");
      return await response.json();
    },
  });

  // Fetch credit limit groups for dropdown
  const { data: creditLimitGroups = [] } = useQuery<CreditLimitGroup[]>({
    queryKey: ["/api/master-data/credit-limit-groups"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/credit-limit-groups");
      return await response.json();
    },
  });

  // Create customer group mutation
  const createMutation = useMutation({
    mutationFn: (data: CustomerGroupFormData) => apiRequest("/api/master-data/customer-groups", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-groups"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Customer group created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create customer group.", variant: "destructive" });
    }
  });

  // Update customer group mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomerGroupFormData> }) =>
      apiRequest(`/api/master-data/customer-groups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-groups"] });
      setIsCreateDialogOpen(false);
      setEditingCustomerGroup(null);
      resetForm();
      toast({ title: "Success", description: "Customer group updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update customer group.", variant: "destructive" });
    }
  });

  // Delete customer group mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/customer-groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-groups"] });
      toast({ title: "Success", description: "Customer group deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete customer group.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/customer-groups/import", { method: "POST", body: formData });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-groups"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} customer groups. ${data.errors?.length || 0} errors.` 
      });
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Failed to import Excel file.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      accountGroupId: undefined,
      reconciliationAccountId: undefined,
      creditLimitGroupId: undefined,
      sortOrder: 0,
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({ title: "Validation Error", description: "Code and name are required.", variant: "destructive" });
      return;
    }

    if (editingCustomerGroup) {
      updateMutation.mutate({ id: editingCustomerGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (customerGroup: CustomerGroup) => {
    setEditingCustomerGroup(customerGroup);
    setFormData({
      code: customerGroup.code,
      name: customerGroup.name,
      description: customerGroup.description || "",
      accountGroupId: customerGroup.accountGroupId,
      reconciliationAccountId: customerGroup.reconciliationAccountId,
      creditLimitGroupId: customerGroup.creditLimitGroupId,
      sortOrder: customerGroup.sortOrder,
      isActive: customerGroup.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (customerGroup: CustomerGroup) => {
    if (window.confirm(`Are you sure you want to delete "${customerGroup.name}"?`)) {
      deleteMutation.mutate(customerGroup.id);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Code", "Name", "Description", "Account Group", "Reconciliation Account", "Credit Limit Group", "Sort Order", "Active", "Created At"].join(","),
      ...filteredCustomerGroups.map(cg => [
        cg.code,
        cg.name,
        cg.description || "",
        accountGroups.find(ag => ag.id === cg.accountGroupId)?.name || "",
        reconciliationAccounts.find(ra => ra.id === cg.reconciliationAccountId)?.name || "",
        creditLimitGroups.find(clg => clg.id === cg.creditLimitGroupId)?.name || "",
        cg.sortOrder.toString(),
        cg.isActive ? "Yes" : "No",
        new Date(cg.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_groups_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Customer groups exported to CSV." });
  };

  const filteredCustomerGroups = customerGroups.filter(cg =>
    cg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cg.description && cg.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getAccountGroupName = (id?: number) => {
    if (!id) return "-";
    return accountGroups.find(ag => ag.id === id)?.name || "-";
  };

  const getReconciliationAccountName = (id?: number) => {
    if (!id) return "-";
    return reconciliationAccounts.find(ra => ra.id === id)?.name || "-";
  };

  const getCreditLimitGroupName = (id?: number) => {
    if (!id) return "-";
    return creditLimitGroups.find(clg => clg.id === id)?.name || "-";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Groups</h1>
          <p className="text-muted-foreground">Master Data → Customer Groups</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
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
          <Dialog 
            open={isCreateDialogOpen} 
            onOpenChange={(open) => {
              if (!open) {
                resetForm();
                setEditingCustomerGroup(null);
              }
              setIsCreateDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCustomerGroup(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomerGroup ? "Edit Customer Group" : "Create New Customer Group"}</DialogTitle>
                <DialogDescription>
                  {editingCustomerGroup ? "Update customer group information." : "Add a new customer group to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="CG001"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Customer group name"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Customer group description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountGroupId">Account Group</Label>
                    <Select
                      value={formData.accountGroupId?.toString() || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, accountGroupId: value === "__none__" ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {accountGroups.map((ag) => (
                          <SelectItem key={ag.id} value={ag.id.toString()}>
                            {ag.code} - {ag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reconciliationAccountId">Reconciliation Account</Label>
                    <Select
                      value={formData.reconciliationAccountId?.toString() || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, reconciliationAccountId: value === "__none__" ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reconciliation account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {reconciliationAccounts.map((ra) => (
                          <SelectItem key={ra.id} value={ra.id.toString()}>
                            {ra.code} - {ra.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimitGroupId">Credit Limit Group</Label>
                    <Select
                      value={formData.creditLimitGroupId?.toString() || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, creditLimitGroupId: value === "__none__" ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select credit limit group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {creditLimitGroups.map((clg) => (
                          <SelectItem key={clg.id} value={clg.id.toString()}>
                            {clg.code} - {clg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      placeholder="0"
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
                    {editingCustomerGroup ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Customer Groups</CardTitle>
            <CardDescription>List of all customer groups in the system</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomerGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No customer groups found matching your search." : "No customer groups available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account Group</TableHead>
                  <TableHead>Reconciliation Account</TableHead>
                  <TableHead>Credit Limit Group</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomerGroups.map((customerGroup) => (
                  <TableRow key={customerGroup.id}>
                    <TableCell className="font-medium">{customerGroup.code}</TableCell>
                    <TableCell>{customerGroup.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{customerGroup.description || "-"}</TableCell>
                    <TableCell>{getAccountGroupName(customerGroup.accountGroupId)}</TableCell>
                    <TableCell>{getReconciliationAccountName(customerGroup.reconciliationAccountId)}</TableCell>
                    <TableCell>{getCreditLimitGroupName(customerGroup.creditLimitGroupId)}</TableCell>
                    <TableCell>{customerGroup.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={customerGroup.isActive ? "default" : "secondary"}>
                        {customerGroup.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(customerGroup)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(customerGroup)}
                            className="text-destructive"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
