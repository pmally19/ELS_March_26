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
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface CustomerType {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  requiresTaxId: boolean;
  requiresRegistration: boolean;
  defaultPaymentTerms?: string;
  defaultCreditLimit?: string;
  defaultCurrency?: string;
  businessRules?: any;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerTypeFormData {
  code: string;
  name: string;
  description?: string;
  category?: string;
  requiresTaxId: boolean;
  requiresRegistration: boolean;
  defaultPaymentTerms?: string;
  defaultCreditLimit?: string;
  defaultCurrency?: string;
  businessRules?: any;
  sortOrder: number;
  isActive: boolean;
}

export default function CustomerTypes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState<CustomerType | null>(null);
  const [formData, setFormData] = useState<CustomerTypeFormData>({
    code: "",
    name: "",
    description: "",
    category: "",
    requiresTaxId: false,
    requiresRegistration: false,
    defaultPaymentTerms: "",
    defaultCreditLimit: "",
    defaultCurrency: "",
    businessRules: null,
    sortOrder: 0,
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch customer types
  const { data: customerTypes = [], isLoading, refetch } = useQuery<CustomerType[]>({
    queryKey: ["/api/master-data/customer-types"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/customer-types");
      return await response.json();
    },
  });

  // Fetch currencies for dropdown
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/currencies'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/currencies');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch payment terms for dropdown
  const { data: paymentTerms = [], isLoading: paymentTermsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/payment-terms'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/payment-terms');
        const data = await response.json();
        // Handle different response formats
        if (Array.isArray(data)) {
          return data.filter((pt: any) => pt.isActive !== false);
        } else if (data.records && Array.isArray(data.records)) {
          return data.records.filter((pt: any) => pt.isActive !== false);
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // Fetch credit limit groups for dropdown
  const { data: creditLimitGroups = [], isLoading: creditLimitGroupsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/credit-limit-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/credit-limit-groups');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((clg: any) => clg.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Create customer type mutation
  const createMutation = useMutation({
    mutationFn: (data: CustomerTypeFormData) => apiRequest("/api/master-data/customer-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-types"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Customer type created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create customer type.", variant: "destructive" });
    }
  });

  // Update customer type mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomerTypeFormData> }) =>
      apiRequest(`/api/master-data/customer-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-types"] });
      setEditingCustomerType(null);
      resetForm();
      toast({ title: "Success", description: "Customer type updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update customer type.", variant: "destructive" });
    }
  });

  // Delete customer type mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/customer-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-types"] });
      toast({ title: "Success", description: "Customer type deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete customer type.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/customer-types/import", { method: "POST", body: formData });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-types"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} customer types. ${data.errors?.length || 0} errors.` 
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
      category: "",
      requiresTaxId: false,
      requiresRegistration: false,
      defaultPaymentTerms: "",
      defaultCreditLimit: "",
      defaultCurrency: "",
      businessRules: null,
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

    if (editingCustomerType) {
      updateMutation.mutate({ id: editingCustomerType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (customerType: CustomerType) => {
    setEditingCustomerType(customerType);
    
    // Find matching credit limit group by value if available
    let creditLimitValue = customerType.defaultCreditLimit || "";
    if (creditLimitValue && creditLimitGroups.length > 0) {
      const matchingGroup = creditLimitGroups.find((clg: any) => {
        const clgValue = clg.creditLimit?.toString() || "";
        return clgValue === creditLimitValue || parseFloat(clgValue) === parseFloat(creditLimitValue);
      });
      if (matchingGroup) {
        creditLimitValue = matchingGroup.id.toString(); // Use group ID for dropdown
      }
    }
    
    setFormData({
      code: customerType.code,
      name: customerType.name,
      description: customerType.description || "",
      category: customerType.category || "",
      requiresTaxId: customerType.requiresTaxId,
      requiresRegistration: customerType.requiresRegistration,
      defaultPaymentTerms: customerType.defaultPaymentTerms || "",
      defaultCreditLimit: creditLimitValue, // Use matched group ID or original value
      defaultCurrency: customerType.defaultCurrency || "",
      businessRules: customerType.businessRules || null,
      sortOrder: customerType.sortOrder,
      isActive: customerType.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (customerType: CustomerType) => {
    if (window.confirm(`Are you sure you want to delete "${customerType.name}"?`)) {
      deleteMutation.mutate(customerType.id);
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
      ["Code", "Name", "Description", "Category", "Requires Tax ID", "Requires Registration", "Default Payment Terms", "Default Credit Limit", "Default Currency", "Sort Order", "Active", "Created At"].join(","),
      ...filteredCustomerTypes.map(ct => [
        ct.code,
        ct.name,
        ct.description || "",
        ct.category || "",
        ct.requiresTaxId ? "Yes" : "No",
        ct.requiresRegistration ? "Yes" : "No",
        ct.defaultPaymentTerms || "",
        ct.defaultCreditLimit || "",
        ct.defaultCurrency || "",
        ct.sortOrder.toString(),
        ct.isActive ? "Yes" : "No",
        new Date(ct.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_types_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Customer types exported to CSV." });
  };

  const filteredCustomerTypes = customerTypes.filter(ct =>
    ct.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ct.description && ct.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ct.category && ct.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Customer Types</h1>
          <p className="text-muted-foreground">Master Data → Customer Types</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer types..."
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCustomerType(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomerType ? "Edit Customer Type" : "Create New Customer Type"}</DialogTitle>
                <DialogDescription>
                  {editingCustomerType ? "Update customer type information." : "Add a new customer type to the system."}
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
                      placeholder="CT001"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Individual, Business, etc."
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
                    placeholder="Customer type description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Individual, Corporate, Government"
                      maxLength={50}
                    />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
                    <Select
                      value={formData.defaultPaymentTerms || ""}
                      onValueChange={(value) => {
                        setFormData({ ...formData, defaultPaymentTerms: value === "__none__" ? "" : value });
                      }}
                      disabled={paymentTermsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={paymentTermsLoading ? "Loading..." : "Select payment terms"} />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTerms.length > 0 ? (
                          paymentTerms.map((pt: any) => (
                            <SelectItem key={pt.id || pt.paymentTermCode} value={pt.paymentTermCode || pt.code || pt.id?.toString()}>
                              {pt.paymentTermCode || pt.code || pt.id} - {pt.description || pt.name || ""}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            {paymentTermsLoading ? "Loading payment terms..." : "No payment terms available"}
                          </SelectItem>
                        )}
                        {paymentTerms.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={formData.defaultCurrency || ""}
                      onValueChange={(value) => {
                        setFormData({ ...formData, defaultCurrency: value === "__none__" ? "" : value });
                      }}
                      disabled={currenciesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={currenciesLoading ? "Loading..." : "Select currency"} />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.length > 0 ? (
                          currencies.map((currency: any) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} - {currency.name || currency.symbol || ""}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            {currenciesLoading ? "Loading currencies..." : "No currencies available"}
                          </SelectItem>
                        )}
                        {currencies.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCreditLimit">Default Credit Limit</Label>
                    <Select
                      value={(() => {
                        // If formData.defaultCreditLimit is a number (stored value), find matching group
                        if (formData.defaultCreditLimit && creditLimitGroups.length > 0) {
                          const matchingGroup = creditLimitGroups.find((clg: any) => {
                            const clgValue = clg.creditLimit?.toString() || "";
                            const formValue = formData.defaultCreditLimit;
                            return clgValue === formValue || parseFloat(clgValue) === parseFloat(formValue);
                          });
                          if (matchingGroup) {
                            return matchingGroup.id.toString();
                          }
                        }
                        // If it's already a group ID, use it
                        return formData.defaultCreditLimit || "";
                      })()}
                      onValueChange={(value) => {
                        if (value === "__none__") {
                          setFormData({ ...formData, defaultCreditLimit: "" });
                        } else {
                          // Find the selected credit limit group and use its credit limit value
                          const selectedGroup = creditLimitGroups.find((clg: any) => clg.id.toString() === value);
                          if (selectedGroup && selectedGroup.creditLimit) {
                            setFormData({ ...formData, defaultCreditLimit: selectedGroup.creditLimit.toString() });
                          } else {
                            setFormData({ ...formData, defaultCreditLimit: value });
                          }
                        }
                      }}
                      disabled={creditLimitGroupsLoading}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder={creditLimitGroupsLoading ? "Loading..." : "Select credit limit"} />
                    </SelectTrigger>
                    <SelectContent>
                      {creditLimitGroups.length > 0 ? (
                        creditLimitGroups.map((clg: any) => (
                          <SelectItem key={clg.id} value={clg.id.toString()}>
                            {clg.code} - {clg.name} ({clg.creditLimit ? `${clg.currency || 'USD'} ${clg.creditLimit}` : ""})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          {creditLimitGroupsLoading ? "Loading credit limit groups..." : "No credit limit groups available"}
                        </SelectItem>
                      )}
                      {creditLimitGroups.length > 0 && (
                        <SelectItem value="__none__">None</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresTaxId"
                      checked={formData.requiresTaxId}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresTaxId: checked })}
                    />
                    <Label htmlFor="requiresTaxId">Requires Tax ID</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresRegistration"
                      checked={formData.requiresRegistration}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresRegistration: checked })}
                    />
                    <Label htmlFor="requiresRegistration">Requires Registration</Label>
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
                    {editingCustomerType ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Types</CardTitle>
              <CardDescription>List of all customer types in the system</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomerTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No customer types found matching your search." : "No customer types available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Default Payment Terms</TableHead>
                  <TableHead>Default Currency</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomerTypes.map((customerType) => (
                  <TableRow key={customerType.id}>
                    <TableCell className="font-medium">{customerType.code}</TableCell>
                    <TableCell>{customerType.name}</TableCell>
                    <TableCell>{customerType.category || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{customerType.description || "-"}</TableCell>
                    <TableCell>{customerType.defaultPaymentTerms || "-"}</TableCell>
                    <TableCell>{customerType.defaultCurrency || "-"}</TableCell>
                    <TableCell>{customerType.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={customerType.isActive ? "default" : "secondary"}>
                        {customerType.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(customerType)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(customerType)}
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

