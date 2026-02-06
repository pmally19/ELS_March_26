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

interface State {
  id: number;
  code: string;
  name: string;
  description?: string;
  countryId?: number;
  countryCode?: string;
  countryName?: string;
  region?: string;
  taxJurisdictionId?: number;
  taxJurisdictionCode?: string;
  taxJurisdictionName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StateFormData {
  code: string;
  name: string;
  description?: string;
  countryId?: number;
  region?: string;
  taxJurisdictionId?: number;
  isActive: boolean;
}

export default function States() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [formData, setFormData] = useState<StateFormData>({
    code: "",
    name: "",
    description: "",
    countryId: undefined,
    region: "",
    taxJurisdictionId: undefined,
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch states
  const { data: states = [], isLoading, refetch } = useQuery<State[]>({
    queryKey: ["/api/master-data/states"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/states");
      const data = await response.json();
      // Normalize field names to ensure consistency
      return Array.isArray(data) ? data.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        description: s.description || null,
        countryId: s.countryId || s.country_id || null,
        countryCode: s.countryCode || s.country_code || null,
        countryName: s.countryName || s.country_name || null,
        region: s.region || null,
        taxJurisdictionId: s.taxJurisdictionId || s.tax_jurisdiction_id || null,
        taxJurisdictionCode: s.taxJurisdictionCode || s.tax_jurisdiction_code || null,
        taxJurisdictionName: s.taxJurisdictionName || s.tax_jurisdiction_name || null,
        isActive: s.isActive !== undefined ? s.isActive : (s.is_active !== undefined ? s.is_active : true),
        createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
      })) : [];
    },
  });

  // Fetch countries for dropdown selection
  const { data: countries = [], isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          isActive: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true),
        })).filter((c: any) => c.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch tax jurisdictions for dropdown selection
  const { data: taxJurisdictions = [], isLoading: taxJurisdictionsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/tax-jurisdictions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/tax-jurisdictions');
        const data = await response.json();
        return Array.isArray(data) ? data.map((tj: any) => ({
          id: tj.id,
          jurisdictionCode: tj.jurisdictionCode || tj.jurisdiction_code || tj.code,
          jurisdictionName: tj.jurisdictionName || tj.jurisdiction_name || tj.name,
          isActive: tj.isActive !== undefined ? tj.isActive : (tj.is_active !== undefined ? tj.is_active : true),
        })).filter((tj: any) => tj.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // Create state mutation
  const createMutation = useMutation({
    mutationFn: (data: StateFormData) => apiRequest("/api/master-data/states", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/states"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "State created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create state.", variant: "destructive" });
    }
  });

  // Update state mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StateFormData> }) =>
      apiRequest(`/api/master-data/states/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/states"] });
      setIsCreateDialogOpen(false);
      setEditingState(null);
      resetForm();
      toast({ title: "Success", description: "State updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update state.", variant: "destructive" });
    }
  });

  // Delete state mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/states/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/states"] });
      toast({ title: "Success", description: "State deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete state.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/states/import", { method: "POST", body: formData });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/states"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} states. ${data.errors?.length || 0} errors.` 
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
      countryId: undefined,
      region: "",
      taxJurisdictionId: undefined,
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({ title: "Validation Error", description: "Code and name are required.", variant: "destructive" });
      return;
    }

    if (editingState) {
      updateMutation.mutate({ id: editingState.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (state: State) => {
    setEditingState(state);
    setFormData({
      code: state.code,
      name: state.name,
      description: state.description || "",
      countryId: state.countryId || undefined,
      region: state.region || "",
      taxJurisdictionId: state.taxJurisdictionId || undefined,
      isActive: state.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (state: State) => {
    if (window.confirm(`Are you sure you want to delete "${state.name}"?`)) {
      deleteMutation.mutate(state.id);
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
      ["Code", "Name", "Description", "Country", "Region", "Tax Jurisdiction", "Active", "Created At"].join(","),
      ...filteredStates.map(s => [
        s.code,
        s.name,
        s.description || "",
        countries.find(c => c.id === s.countryId)?.name || "",
        s.region || "",
        s.taxJurisdictionCode || s.taxJurisdictionName || "",
        s.isActive ? "Yes" : "No",
        new Date(s.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `states_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "States exported to CSV." });
  };

  const filteredStates = states.filter(s =>
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.region && s.region.toLowerCase().includes(searchTerm.toLowerCase()))
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
          Master Data → States
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">States</h1>
          <p className="text-muted-foreground">Manage state/province master data and geographic subdivisions</p>
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
              setEditingState(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingState(null); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add State
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingState ? "Edit State" : "Create New State"}</DialogTitle>
                <DialogDescription>
                  {editingState ? "Update state information." : "Add a new state/province to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">State Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 10) })}
                      placeholder="CA, NY, TX"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">State Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="California"
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
                    placeholder="State description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryId">Country</Label>
                    <Select
                      value={formData.countryId?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, countryId: value === "__none__" ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.length > 0 ? (
                          countries.map((country: any) => (
                            <SelectItem key={country.id} value={country.id.toString()}>
                              {country.code} - {country.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            {countriesLoading ? "Loading countries..." : "No countries available"}
                          </SelectItem>
                        )}
                        {countries.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="West Coast, Northeast"
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxJurisdictionId">Tax Jurisdiction</Label>
                  <Select
                    value={formData.taxJurisdictionId?.toString() || ""}
                    onValueChange={(value) => setFormData({ ...formData, taxJurisdictionId: value === "__none__" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxJurisdictions.length > 0 ? (
                        taxJurisdictions.map((tj: any) => (
                          <SelectItem key={tj.id} value={tj.id.toString()}>
                            {tj.jurisdictionCode} - {tj.jurisdictionName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          {taxJurisdictionsLoading ? "Loading tax jurisdictions..." : "No tax jurisdictions available"}
                        </SelectItem>
                      )}
                      {taxJurisdictions.length > 0 && (
                        <SelectItem value="__none__">None</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                    {editingState ? "Update" : "Create"}
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
              <CardTitle>States</CardTitle>
              <CardDescription>List of all states/provinces in the system</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No states found matching your search." : "No states available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tax Jurisdiction</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStates.map((state) => (
                  <TableRow key={state.id}>
                    <TableCell className="font-medium">{state.code}</TableCell>
                    <TableCell>{state.name}</TableCell>
                    <TableCell>
                      {state.countryCode 
                        ? `${state.countryCode}${state.countryName ? ` - ${state.countryName}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell>{state.region || "-"}</TableCell>
                    <TableCell>
                      {state.taxJurisdictionCode 
                        ? `${state.taxJurisdictionCode}${state.taxJurisdictionName ? ` - ${state.taxJurisdictionName}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{state.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={state.isActive ? "default" : "secondary"}>
                        {state.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(state)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(state)}
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

