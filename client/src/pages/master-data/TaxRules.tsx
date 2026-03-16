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
import { Plus, Search, RefreshCw, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface TaxRule {
  id: number;
  profileId: number;
  ruleCode: string;
  title: string;
  ratePercent: string | number;
  jurisdiction?: string;
  taxJurisdictionId?: number;
  taxCategoryId?: number;
  appliesTo?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profileName?: string;
  profileCode?: string;
  taxJurisdictionCode?: string;
  taxJurisdictionName?: string;
  taxCategoryCode?: string;
  taxCategoryName?: string;
}

interface TaxRuleFormData {
  profileId: number | undefined;
  ruleCode: string;
  title: string;
  ratePercent: number | string;
  jurisdiction?: string;
  taxJurisdictionId?: number;
  taxCategoryId?: number;
  appliesTo?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export default function TaxRules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [formData, setFormData] = useState<TaxRuleFormData>({
    profileId: undefined,
    ruleCode: "",
    title: "",
    ratePercent: "",
    jurisdiction: "",
    taxJurisdictionId: undefined,
    taxCategoryId: undefined,
    appliesTo: "",
    effectiveFrom: "",
    effectiveTo: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch tax rules
  const { data: taxRules = [], isLoading, refetch } = useQuery<TaxRule[]>({
    queryKey: ["/api/master-data/tax-rules"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-rules");
      const data = await response.json();
      return Array.isArray(data) ? data.map((tr: any) => ({
        id: tr.id,
        profileId: tr.profileId || tr.profile_id,
        ruleCode: tr.ruleCode || tr.rule_code || "",
        title: tr.title || "",
        ratePercent: tr.ratePercent || tr.rate_percent || 0,
        jurisdiction: tr.jurisdiction || null,
        taxJurisdictionId: tr.taxJurisdictionId || tr.tax_jurisdiction_id || null,
        appliesTo: tr.appliesTo || tr.applies_to || null,
        effectiveFrom: tr.effectiveFrom || tr.effective_from || "",
        effectiveTo: tr.effectiveTo || tr.effective_to || null,
        isActive: tr.isActive !== undefined ? tr.isActive : (tr.is_active !== undefined ? tr.is_active : true),
        createdAt: tr.createdAt || tr.created_at || new Date().toISOString(),
        updatedAt: tr.updatedAt || tr.updated_at || new Date().toISOString(),
        profileName: tr.profileName || tr.profile_name || "",
        profileCode: tr.profileCode || tr.profile_code || "",
        taxJurisdictionCode: tr.taxJurisdictionCode || tr.tax_jurisdiction_code || null,
        taxJurisdictionName: tr.taxJurisdictionName || tr.tax_jurisdiction_name || null,
        taxCategoryId: tr.taxCategoryId || tr.tax_category_id || null,
        taxCategoryCode: tr.taxCategoryCode || tr.tax_category_code || null,
        taxCategoryName: tr.taxCategoryName || tr.tax_category_name || null,
      })) : [];
    },
  });

  // Fetch tax profiles for dropdown
  const { data: taxProfiles = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/tax-profiles'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/tax-profiles');
        const data = await response.json();
        return Array.isArray(data) ? data.map((tp: any) => ({
          id: tp.id,
          profileCode: tp.profileCode || tp.profile_code || "",
          name: tp.name || "",
          isActive: tp.isActive !== undefined ? tp.isActive : (tp.is_active !== undefined ? tp.is_active : true),
        })).filter((tp: any) => tp.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch tax jurisdictions for dropdown
  const { data: taxJurisdictions = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/tax-jurisdictions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/tax-jurisdictions');
        const data = await response.json();
        return Array.isArray(data) ? data.map((tj: any) => ({
          id: tj.id,
          jurisdictionCode: tj.jurisdictionCode || tj.jurisdiction_code || "",
          jurisdictionName: tj.jurisdictionName || tj.jurisdiction_name || "",
          isActive: tj.isActive !== undefined ? tj.isActive : (tj.is_active !== undefined ? tj.is_active : true),
        })).filter((tj: any) => tj.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch tax categories for dropdown
  const { data: taxCategories = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/tax-rules/tax-categories'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/tax-rules/tax-categories');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TaxRuleFormData) => apiRequest("/api/master-data/tax-rules", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-rules"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Tax rule created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to create tax rule.", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaxRuleFormData> }) =>
      apiRequest(`/api/master-data/tax-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-rules"] });
      setIsCreateDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast({ title: "Success", description: "Tax rule updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update tax rule.", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/tax-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tax-rules"] });
      toast({ title: "Success", description: "Tax rule deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to delete tax rule.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      profileId: undefined,
      ruleCode: "",
      title: "",
      ratePercent: "",
      jurisdiction: "",
      taxJurisdictionId: undefined,
      taxCategoryId: undefined,
      appliesTo: "",
      effectiveFrom: "",
      effectiveTo: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profileId || !formData.ruleCode || !formData.title || !formData.ratePercent || !formData.effectiveFrom) {
      toast({ title: "Validation Error", description: "Profile, code, title, rate, and effective from date are required.", variant: "destructive" });
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (rule: TaxRule) => {
    setEditingRule(rule);
    setFormData({
      profileId: rule.profileId,
      ruleCode: rule.ruleCode,
      title: rule.title,
      ratePercent: rule.ratePercent,
      jurisdiction: rule.jurisdiction || "",
      taxJurisdictionId: rule.taxJurisdictionId || undefined,
      taxCategoryId: rule.taxCategoryId || undefined,
      appliesTo: rule.appliesTo || "",
      effectiveFrom: rule.effectiveFrom ? rule.effectiveFrom.split('T')[0] : "",
      effectiveTo: rule.effectiveTo ? rule.effectiveTo.split('T')[0] : "",
      isActive: rule.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (rule: TaxRule) => {
    if (window.confirm(`Are you sure you want to delete "${rule.title}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const filteredRules = taxRules.filter(tr =>
    tr.ruleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tr.profileName && tr.profileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tr.taxJurisdictionName && tr.taxJurisdictionName.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h1 className="text-3xl font-bold tracking-tight">Tax Rules</h1>
          <p className="text-muted-foreground">Master Data → Tax Rules</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tax rules..."
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
              setEditingRule(null);
            }
            setIsCreateDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingRule(null); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRule ? "Edit Tax Rule" : "Create New Tax Rule"}</DialogTitle>
                <DialogDescription>
                  {editingRule ? "Update tax rule information." : "Add a new tax rule to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileId">Tax Profile *</Label>
                    <Select
                      value={formData.profileId?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, profileId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxProfiles.length > 0 ? (
                          taxProfiles.map((profile: any) => (
                            <SelectItem key={profile.id} value={profile.id.toString()}>
                              {profile.profileCode} - {profile.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>No tax profiles available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ruleCode">Rule Code *</Label>
                    <Input
                      id="ruleCode"
                      value={formData.ruleCode}
                      onChange={(e) => setFormData({ ...formData, ruleCode: e.target.value.toUpperCase().slice(0, 12) })}
                      placeholder="TR001"
                      maxLength={12}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Standard Sales Tax"
                    maxLength={120}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ratePercent">Rate Percent *</Label>
                    <Input
                      id="ratePercent"
                      type="number"
                      step="0.01"
                      value={formData.ratePercent}
                      onChange={(e) => setFormData({ ...formData, ratePercent: e.target.value })}
                      placeholder="8.5"
                    />
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
                          <SelectItem value="__none__" disabled>No tax jurisdictions available</SelectItem>
                        )}
                        {taxJurisdictions.length > 0 && (
                          <SelectItem value="__none__">None</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction (Text)</Label>
                    <Input
                      id="jurisdiction"
                      value={formData.jurisdiction}
                      onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                      placeholder="US-CA, US-NY"
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxCategoryId">Tax Category</Label>
                    <Select
                      value={formData.taxCategoryId?.toString() || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, taxCategoryId: value === "__none__" ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {taxCategories.map((tc: any) => (
                          <SelectItem key={tc.id} value={tc.id.toString()}>
                            {tc.tax_category_code} - {tc.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appliesTo">Applies To</Label>
                    <Input
                      id="appliesTo"
                      value={formData.appliesTo}
                      onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                      placeholder="Goods, Services, Both"
                      maxLength={20}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveFrom">Effective From *</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effectiveTo">Effective To</Label>
                    <Input
                      id="effectiveTo"
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value || undefined })}
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
                    {editingRule ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Rules</CardTitle>
          <CardDescription>List of all tax rules in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No tax rules found matching your search." : "No tax rules available. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Tax Profile</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Tax Jurisdiction</TableHead>
                  <TableHead>Tax Category</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.ruleCode}</TableCell>
                    <TableCell>{rule.title}</TableCell>
                    <TableCell>{rule.profileCode || "-"}</TableCell>
                    <TableCell>{typeof rule.ratePercent === 'number' ? rule.ratePercent.toFixed(2) : parseFloat(String(rule.ratePercent)).toFixed(2)}%</TableCell>
                    <TableCell>{rule.taxJurisdictionName ? `${rule.taxJurisdictionCode} - ${rule.taxJurisdictionName}` : (rule.jurisdiction || "-")}</TableCell>
                    <TableCell>{rule.taxCategoryName ? `${rule.taxCategoryCode} - ${rule.taxCategoryName}` : "-"}</TableCell>
                    <TableCell>{rule.effectiveFrom ? new Date(rule.effectiveFrom).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(rule)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule)}
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

