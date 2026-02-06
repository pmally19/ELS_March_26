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

interface Country {
  id: number;
  code: string;
  name: string;
  description?: string;
  regionId?: number;
  region?: string;
  currencyCode?: string;
  languageCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CountryFormData {
  code: string;
  name: string;
  description?: string;
  regionId?: number;
  region?: string; // Keep for backward compatibility
  currencyCode?: string;
  languageCode?: string;
  isActive: boolean;
}

export default function Countries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState<CountryFormData>({
    code: "",
    name: "",
    description: "",
    regionId: undefined,
    region: "",
    currencyCode: "",
    languageCode: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch countries
  const { data: countries = [], isLoading, refetch } = useQuery<Country[]>({
    queryKey: ["/api/master-data/countries"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/countries");
      const data = await response.json();
      // Normalize field names to ensure consistency (map snake_case to camelCase if needed)
      return Array.isArray(data) ? data.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || c.Description || null,
        regionId: c.regionId || c.region_id || null,
        region: c.region || c.Region || null,
        currencyCode: c.currencyCode || c.currency_code || null,
        languageCode: c.languageCode || c.language_code || null,
        isActive: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true),
        createdAt: c.createdAt || c.created_at || new Date().toISOString(),
        updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
      })) : [];
    },
  });

  // Fetch currencies for dropdown selection
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

  // Fetch regions for dropdown selection
  const { data: regions = [], isLoading: regionsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/regions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/regions');
        const data = await response.json();
        return Array.isArray(data) ? data.map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          isActive: r.isActive !== undefined ? r.isActive : (r.is_active !== undefined ? r.is_active : true),
        })).filter((r: any) => r.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // Create country mutation
  const createMutation = useMutation({
    mutationFn: (data: CountryFormData) => apiRequest("/api/master-data/countries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/countries"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Country created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create country.", variant: "destructive" });
    }
  });

  // Update country mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CountryFormData> }) =>
      apiRequest(`/api/master-data/countries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/countries"] });
      setIsCreateDialogOpen(false);
      setEditingCountry(null);
      resetForm();
      toast({ title: "Success", description: "Country updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update country.", variant: "destructive" });
    }
  });

  // Delete country mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/countries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/countries"] });
      toast({ title: "Success", description: "Country deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete country.", variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/api/master-data/countries/import", { method: "POST", body: formData });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/countries"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} countries. ${data.errors?.length || 0} errors.` 
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
      regionId: undefined,
      region: "",
      currencyCode: "",
      languageCode: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({ title: "Validation Error", description: "Code and name are required.", variant: "destructive" });
      return;
    }

    if (formData.code.length !== 2) {
      toast({ title: "Validation Error", description: "Country code must be exactly 2 characters (ISO code).", variant: "destructive" });
      return;
    }

    if (editingCountry) {
      updateMutation.mutate({ id: editingCountry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    // Find region ID from region name if regionId is not set
    let regionId = country.regionId;
    if (!regionId && country.region) {
      const foundRegion = regions.find((r: any) => r.name === country.region);
      if (foundRegion) {
        regionId = foundRegion.id;
      }
    }
    setFormData({
      code: country.code,
      name: country.name,
      description: country.description || "",
      regionId: regionId,
      region: country.region || "",
      currencyCode: country.currencyCode || "",
      languageCode: country.languageCode || "",
      isActive: country.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (country: Country) => {
    if (window.confirm(`Are you sure you want to delete "${country.name}"?`)) {
      deleteMutation.mutate(country.id);
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
      ["Code", "Name", "Description", "Region", "Currency Code", "Language Code", "Active", "Created At"].join(","),
      ...filteredCountries.map(c => [
        c.code,
        c.name,
        c.description || "",
        c.region || "",
        c.currencyCode || "",
        c.languageCode || "",
        c.isActive ? "Yes" : "No",
        new Date(c.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `countries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Countries exported to CSV." });
  };

  const filteredCountries = countries.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.region && c.region.toLowerCase().includes(searchTerm.toLowerCase()))
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
          Master Data → Countries
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Countries</h1>
          <p className="text-muted-foreground">Manage country master data and geographic information</p>
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
              setEditingCountry(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCountry(null); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Country
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCountry ? "Edit Country" : "Create New Country"}</DialogTitle>
                <DialogDescription>
                  {editingCountry ? "Update country information." : "Add a new country to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Country Code (ISO 2-letter) *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="US"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Country Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="United States"
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
                    placeholder="Country description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Select
                      value={formData.regionId?.toString() || ""}
                      onValueChange={(value) => {
                        const regionId = value === "__none__" ? undefined : parseInt(value);
                        const selectedRegion = regions.find((r: any) => r.id === regionId);
                        setFormData({
                          ...formData,
                          regionId: regionId,
                          region: selectedRegion?.name || ""
                        });
                      }}
                      disabled={regionsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.length > 0 ? (
                          regions.map((region: any) => (
                            <SelectItem key={region.id} value={region.id.toString()}>
                              {region.code} - {region.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            {regionsLoading ? "Loading regions..." : "No regions available"}
                          </SelectItem>
                        )}
                        {regions.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currencyCode">Currency</Label>
                    <Select
                      value={formData.currencyCode || ""}
                      onValueChange={(value) => setFormData({ ...formData, currencyCode: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.length > 0 ? (
                          currencies.map((currency: any) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} - {currency.name} {currency.symbol ? `(${currency.symbol})` : ""}
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
                  <Label htmlFor="languageCode">Language Code</Label>
                  <Input
                    id="languageCode"
                    value={formData.languageCode}
                    onChange={(e) => setFormData({ ...formData, languageCode: e.target.value.toUpperCase().slice(0, 5) })}
                    placeholder="en-US"
                    maxLength={5}
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
                    {editingCountry ? "Update" : "Create"}
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
              <CardTitle>Countries</CardTitle>
              <CardDescription>List of all countries in the system</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCountries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No countries found matching your search." : "No countries available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCountries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell className="font-medium">{country.code}</TableCell>
                    <TableCell>{country.name}</TableCell>
                    <TableCell>{country.region || "-"}</TableCell>
                    <TableCell>{country.currencyCode || "-"}</TableCell>
                    <TableCell>{country.languageCode || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{country.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={country.isActive ? "default" : "secondary"}>
                        {country.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(country)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(country)}
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

