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

interface TaxJurisdiction {
  id: number;
  jurisdictionCode: string;
  jurisdictionName: string;
  jurisdictionType: string;
  parentJurisdictionId?: number;
  country?: string;
  stateProvince?: string;
  county?: string;
  city?: string;
  postalCodePattern?: string;
  isActive: boolean;
  createdAt: string;
}

interface TaxJurisdictionFormData {
  jurisdictionCode: string;
  jurisdictionName: string;
  jurisdictionType: string;
  parentJurisdictionId?: number;
  country?: string;
  stateProvince?: string;
  county?: string;
  city?: string;
  postalCodePattern?: string;
  isActive: boolean;
}

export default function TaxJurisdictions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState<TaxJurisdiction | null>(null);
  const [formData, setFormData] = useState<TaxJurisdictionFormData>({
    jurisdictionCode: "",
    jurisdictionName: "",
    jurisdictionType: "",
    parentJurisdictionId: undefined,
    country: "",
    stateProvince: "",
    county: "",
    city: "",
    postalCodePattern: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch tax jurisdictions
  const { data: jurisdictions = [], isLoading, refetch } = useQuery<TaxJurisdiction[]>({
    queryKey: ["/api/master-data/tax-jurisdictions"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-jurisdictions");
      const data = await response.json();
      return Array.isArray(data) ? data.map((tj: any) => ({
        id: tj.id,
        jurisdictionCode: tj.jurisdictionCode || tj.jurisdiction_code || "",
        jurisdictionName: tj.jurisdictionName || tj.jurisdiction_name || "",
        jurisdictionType: tj.jurisdictionType || tj.jurisdiction_type || "",
        parentJurisdictionId: tj.parentJurisdictionId || tj.parent_jurisdiction_id || null,
        country: tj.country || null,
        stateProvince: tj.stateProvince || tj.state_province || null,
        county: tj.county || null,
        city: tj.city || null,
        postalCodePattern: tj.postalCodePattern || tj.postal_code_pattern || null,
        isActive: tj.isActive !== undefined ? tj.isActive : (tj.is_active !== undefined ? tj.is_active : true),
        createdAt: tj.createdAt || tj.created_at || new Date().toISOString(),
      })) : [];
    },
  });

  // Fetch countries for dropdown
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch states for dropdown
  const { data: states = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/states'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/states');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((s: any) => s.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TaxJurisdictionFormData) => 
      apiRequest("/api/master-data/tax-jurisdictions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-jurisdictions"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Tax jurisdiction created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tax jurisdiction.", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaxJurisdictionFormData> }) =>
      apiRequest(`/api/master-data/tax-jurisdictions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-jurisdictions"] });
      setIsCreateDialogOpen(false);
      setEditingJurisdiction(null);
      resetForm();
      toast({ title: "Success", description: "Tax jurisdiction updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tax jurisdiction.", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/tax-jurisdictions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-jurisdictions"] });
      toast({ title: "Success", description: "Tax jurisdiction deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tax jurisdiction.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/tax-jurisdictions/import", { method: "POST", body: formData });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-jurisdictions"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} tax jurisdictions. ${data.errors?.length || 0} errors.` 
      });
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Failed to import Excel file.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      jurisdictionCode: "",
      jurisdictionName: "",
      jurisdictionType: "",
      parentJurisdictionId: undefined,
      country: "",
      stateProvince: "",
      county: "",
      city: "",
      postalCodePattern: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jurisdictionCode || !formData.jurisdictionName || !formData.jurisdictionType) {
      toast({ title: "Validation Error", description: "Code, name, and type are required.", variant: "destructive" });
      return;
    }

    if (editingJurisdiction) {
      updateMutation.mutate({ id: editingJurisdiction.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (jurisdiction: TaxJurisdiction) => {
    setEditingJurisdiction(jurisdiction);
    setFormData({
      jurisdictionCode: jurisdiction.jurisdictionCode,
      jurisdictionName: jurisdiction.jurisdictionName,
      jurisdictionType: jurisdiction.jurisdictionType,
      parentJurisdictionId: jurisdiction.parentJurisdictionId || undefined,
      country: jurisdiction.country || "",
      stateProvince: jurisdiction.stateProvince || "",
      county: jurisdiction.county || "",
      city: jurisdiction.city || "",
      postalCodePattern: jurisdiction.postalCodePattern || "",
      isActive: jurisdiction.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (jurisdiction: TaxJurisdiction) => {
    if (window.confirm(`Are you sure you want to delete "${jurisdiction.jurisdictionName}"?`)) {
      deleteMutation.mutate(jurisdiction.id);
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
      ["Code", "Name", "Type", "Country", "State/Province", "County", "City", "Postal Code Pattern", "Parent", "Active", "Created At"].join(","),
      ...filteredJurisdictions.map(j => [
        j.jurisdictionCode,
        j.jurisdictionName,
        j.jurisdictionType,
        j.country || "",
        j.stateProvince || "",
        j.county || "",
        j.city || "",
        j.postalCodePattern || "",
        j.parentJurisdictionId || "",
        j.isActive ? "Yes" : "No",
        new Date(j.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax_jurisdictions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Tax jurisdictions exported to CSV." });
  };

  const filteredJurisdictions = jurisdictions.filter(j =>
    j.jurisdictionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jurisdictionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jurisdictionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.country && j.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (j.stateProvince && j.stateProvince.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="text-sm text-gray-500">
          Master Data → Tax Jurisdictions
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Jurisdictions</h1>
          <p className="text-muted-foreground">Manage tax jurisdiction master data for tax reporting and compliance</p>
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
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingJurisdiction(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingJurisdiction(null); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Jurisdiction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJurisdiction ? "Edit Tax Jurisdiction" : "Create New Tax Jurisdiction"}</DialogTitle>
                <DialogDescription>
                  {editingJurisdiction ? "Update tax jurisdiction information." : "Add a new tax jurisdiction to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jurisdictionCode">Jurisdiction Code *</Label>
                    <Input
                      id="jurisdictionCode"
                      value={formData.jurisdictionCode}
                      onChange={(e) => setFormData({ ...formData, jurisdictionCode: e.target.value.toUpperCase().slice(0, 20) })}
                      placeholder="US-FED, CA-ON"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdictionName">Jurisdiction Name *</Label>
                    <Input
                      id="jurisdictionName"
                      value={formData.jurisdictionName}
                      onChange={(e) => setFormData({ ...formData, jurisdictionName: e.target.value })}
                      placeholder="United States Federal"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jurisdictionType">Jurisdiction Type *</Label>
                    <Input
                      id="jurisdictionType"
                      value={formData.jurisdictionType}
                      onChange={(e) => setFormData({ ...formData, jurisdictionType: e.target.value })}
                      placeholder="Federal, State, Province, County, City, etc."
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentJurisdictionId">Parent Jurisdiction ID</Label>
                    <Input
                      id="parentJurisdictionId"
                      type="number"
                      value={formData.parentJurisdictionId || ""}
                      onChange={(e) => setFormData({ ...formData, parentJurisdictionId: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Enter parent jurisdiction ID (optional)"
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country || ""}
                      onValueChange={(value) => setFormData({ ...formData, country: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.length > 0 ? (
                          countries.map((country: any) => (
                            <SelectItem key={country.id} value={country.code}>
                              {country.code} - {country.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            No countries available
                          </SelectItem>
                        )}
                        {countries.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stateProvince">State/Province</Label>
                    <Input
                      id="stateProvince"
                      value={formData.stateProvince}
                      onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value.toUpperCase().slice(0, 10) })}
                      placeholder="CA, NY, ON"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                      placeholder="County name"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City name"
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCodePattern">Postal Code Pattern</Label>
                  <Input
                    id="postalCodePattern"
                    value={formData.postalCodePattern}
                    onChange={(e) => setFormData({ ...formData, postalCodePattern: e.target.value })}
                    placeholder="##### or A#A #A#"
                    maxLength={20}
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
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingJurisdiction ? "Update" : "Create"}
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
              <CardTitle>Tax Jurisdictions</CardTitle>
              <CardDescription>List of all tax jurisdictions in the system</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tax jurisdictions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredJurisdictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No tax jurisdictions found matching your search." : "No tax jurisdictions available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State/Province</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJurisdictions.map((jurisdiction) => (
                  <TableRow key={jurisdiction.id}>
                    <TableCell className="font-medium">{jurisdiction.jurisdictionCode}</TableCell>
                    <TableCell>{jurisdiction.jurisdictionName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{jurisdiction.jurisdictionType}</Badge>
                    </TableCell>
                    <TableCell>{jurisdiction.country || "-"}</TableCell>
                    <TableCell>{jurisdiction.stateProvince || "-"}</TableCell>
                    <TableCell>{jurisdiction.county || "-"}</TableCell>
                    <TableCell>{jurisdiction.city || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={jurisdiction.isActive ? "default" : "secondary"}>
                        {jurisdiction.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(jurisdiction)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(jurisdiction)}
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

