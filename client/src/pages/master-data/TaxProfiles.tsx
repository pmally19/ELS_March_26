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
import { Plus, Search, RefreshCw, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface TaxProfile {
  id: number;
  profileCode: string;
  name: string;
  description?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ruleCount?: number;
}

interface TaxProfileFormData {
  profileCode: string;
  name: string;
  description?: string;
  country?: string;
  isActive: boolean;
}

export default function TaxProfiles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [formData, setFormData] = useState<TaxProfileFormData>({
    profileCode: "",
    name: "",
    description: "",
    country: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch tax profiles
  const { data: taxProfiles = [], isLoading, refetch } = useQuery<TaxProfile[]>({
    queryKey: ["/api/master-data/tax-profiles"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-profiles");
      const data = await response.json();
      return Array.isArray(data) ? data.map((tp: any) => ({
        id: tp.id,
        profileCode: tp.profileCode || tp.profile_code || "",
        name: tp.name || "",
        description: tp.description || null,
        country: tp.country || null,
        isActive: tp.isActive !== undefined ? tp.isActive : (tp.is_active !== undefined ? tp.is_active : true),
        createdAt: tp.createdAt || tp.created_at || new Date().toISOString(),
        updatedAt: tp.updatedAt || tp.updated_at || new Date().toISOString(),
        ruleCount: tp.ruleCount || tp.rule_count || 0,
      })) : [];
    },
  });

  // Fetch countries for dropdown
  const { data: countries = [], isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data.map((c: any) => ({
          id: c.id,
          code: c.code || "",
          name: c.name || "",
          isActive: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true),
        })).filter((c: any) => c.isActive) : [];
      } catch (error) {
        console.error('Error fetching countries:', error);
        return [];
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TaxProfileFormData) => apiRequest("/api/master-data/tax-profiles", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-profiles"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Tax profile created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create tax profile.", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaxProfileFormData> }) =>
      apiRequest(`/api/master-data/tax-profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-profiles"] });
      setIsCreateDialogOpen(false);
      setEditingProfile(null);
      resetForm();
      toast({ title: "Success", description: "Tax profile updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update tax profile.", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/tax-profiles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-profiles"] });
      toast({ title: "Success", description: "Tax profile deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete tax profile.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      profileCode: "",
      name: "",
      description: "",
      country: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profileCode || !formData.name) {
      toast({ title: "Validation Error", description: "Profile code and name are required.", variant: "destructive" });
      return;
    }

    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (profile: TaxProfile) => {
    setEditingProfile(profile);
    setFormData({
      profileCode: profile.profileCode,
      name: profile.name,
      description: profile.description || "",
      country: profile.country || "",
      isActive: profile.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (profile: TaxProfile) => {
    if (window.confirm(`Are you sure you want to delete "${profile.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(profile.id);
    }
  };

  const filteredProfiles = taxProfiles.filter(tp =>
    tp.profileCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tp.description && tp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tp.country && tp.country.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h1 className="text-3xl font-bold tracking-tight">Tax Profiles</h1>
          <p className="text-muted-foreground">Master Data → Tax Profiles</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tax profiles..."
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
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) {
              resetForm();
              setEditingProfile(null);
            }
            setIsCreateDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingProfile(null); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProfile ? "Edit Tax Profile" : "Create New Tax Profile"}</DialogTitle>
                <DialogDescription>
                  {editingProfile ? "Update tax profile information." : "Add a new tax profile to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileCode">Profile Code *</Label>
                    <Input
                      id="profileCode"
                      value={formData.profileCode}
                      onChange={(e) => setFormData({ ...formData, profileCode: e.target.value.toUpperCase().slice(0, 12) })}
                      placeholder="US01, IN01"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="United States Standard"
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
                    placeholder="Tax profile description"
                    rows={3}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country || ""}
                    onValueChange={(value) => setFormData({ ...formData, country: value === "__none__" ? "" : value })}
                    disabled={countriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countriesLoading ? (
                        <SelectItem value="__loading__" disabled>Loading countries...</SelectItem>
                      ) : countries.length > 0 ? (
                        <>
                          {countries.map((country: any) => (
                            <SelectItem key={country.id} value={country.code}>
                              {country.code} - {country.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__none__">None</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="__none__" disabled>No countries available</SelectItem>
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
                    {editingProfile ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Profiles</CardTitle>
          <CardDescription>List of all tax profiles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No tax profiles found matching your search." : "No tax profiles available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Tax Rules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.profileCode}</TableCell>
                    <TableCell>{profile.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{profile.description || "-"}</TableCell>
                    <TableCell>{profile.country || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{profile.ruleCount || 0} rules</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.isActive ? "default" : "secondary"}>
                        {profile.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(profile)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(profile)}
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

