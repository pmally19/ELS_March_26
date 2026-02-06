import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiGet } from "@/lib/apiClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  FileText, 
  Percent,
  Globe,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ===== TYPES =====
type TaxProfile = {
  id: number;
  profileCode: string;
  name: string;
  description?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ruleCount?: number;
};

type TaxRule = {
  id: number;
  profileId: number;
  ruleCode: string;
  title: string;
  ratePercent: string;
  jurisdiction?: string;
  appliesTo?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profileName?: string;
  profileCode?: string;
};

const TaxManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("profiles");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);

  // ===== FETCH DATA =====
  // Tax Profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<TaxProfile[]>({
    queryKey: ["tax-profiles"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-profiles");
      return await response.json();
    },
  });

  // Tax Rules
  const { data: rules = [], isLoading: loadingRules } = useQuery<TaxRule[]>({
    queryKey: ["tax-rules"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-rules");
      return await response.json();
    },
  });

  // Countries for dropdown
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

  // ===== FORM STATE =====
  const [profileFormData, setProfileFormData] = useState({
    profileCode: "",
    name: "",
    description: "",
    country: "",
    isActive: true,
  });

  const [ruleFormData, setRuleFormData] = useState({
    profileId: 0,
    ruleCode: "",
    title: "",
    ratePercent: "",
    jurisdiction: "",
    appliesTo: "",
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: "",
    isActive: true,
  });

  // ===== MUTATIONS - PROFILES =====
  const createProfile = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-profiles", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      toast({ title: "Success", description: "Tax profile created successfully" });
      setProfileDialogOpen(false);
      resetProfileForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-profiles/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      toast({ title: "Success", description: "Tax profile updated successfully" });
      setProfileDialogOpen(false);
      setEditingProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-profiles/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax profile deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ===== MUTATIONS - RULES =====
  const createRule = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-rules", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule created successfully" });
      setRuleDialogOpen(false);
      resetRuleForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule updated successfully" });
      setRuleDialogOpen(false);
      setEditingRule(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-rules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ===== HELPER FUNCTIONS =====
  const resetProfileForm = () => {
    setProfileFormData({
      profileCode: "",
      name: "",
      description: "",
      country: "",
      isActive: true,
    });
  };

  const resetRuleForm = () => {
    setRuleFormData({
      profileId: 0,
      ruleCode: "",
      title: "",
      ratePercent: "",
      jurisdiction: "",
      appliesTo: "",
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: "",
      isActive: true,
    });
  };

  const handleEditProfile = (profile: TaxProfile) => {
    setEditingProfile(profile);
    setProfileFormData({
      profileCode: profile.profileCode,
      name: profile.name,
      description: profile.description || "",
      country: profile.country || "",
      isActive: profile.isActive,
    });
    setProfileDialogOpen(true);
  };

  const handleEditRule = (rule: TaxRule) => {
    setEditingRule(rule);
    setRuleFormData({
      profileId: rule.profileId,
      ruleCode: rule.ruleCode,
      title: rule.title,
      ratePercent: rule.ratePercent,
      jurisdiction: rule.jurisdiction || "",
      appliesTo: rule.appliesTo || "",
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo || "",
      isActive: rule.isActive,
    });
    setRuleDialogOpen(true);
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profileCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.country && p.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRules = rules.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ruleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.jurisdiction && r.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
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
          Master Data → Tax Management
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Comprehensive tax configuration for your business
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profiles">
            <FileText className="mr-2 h-4 w-4" />
            Tax Profiles
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Percent className="mr-2 h-4 w-4" />
            Tax Rules
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TAX PROFILES */}
        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Profiles</CardTitle>
                  <CardDescription>
                    Define tax profile configurations for different countries or regions
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingProfile(null);
                  resetProfileForm();
                  setProfileDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search profiles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loadingProfiles ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.profileCode}</TableCell>
                        <TableCell>{profile.name}</TableCell>
                        <TableCell>
                          {profile.country ? (
                            <div className="flex items-center">
                              <Globe className="mr-1 h-3 w-3" />
                              {profile.country}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.ruleCount && profile.ruleCount > 0 ? "default" : "secondary"}>
                            {profile.ruleCount || 0} rule{profile.ruleCount !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.isActive ? "default" : "secondary"}>
                            {profile.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProfile(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this profile?")) {
                                  deleteProfile.mutate(profile.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProfiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tax profiles found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TAX RULES */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Rules</CardTitle>
                  <CardDescription>
                    Define specific tax rates and calculations for each profile
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingRule(null);
                  resetRuleForm();
                  setRuleDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loadingRules ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="font-medium">{rule.profileCode}</div>
                          <div className="text-xs text-muted-foreground">{rule.profileName}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{rule.ruleCode}</TableCell>
                        <TableCell>{rule.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Percent className="mr-1 h-3 w-3" />
                            {parseFloat(rule.ratePercent).toFixed(2)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.jurisdiction || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this rule?")) {
                                  deleteRule.mutate(rule.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No tax rules found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PROFILE DIALOG */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Tax Profile" : "Create Tax Profile"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile ? "Update the tax profile details" : "Create a new tax profile configuration"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingProfile) {
              updateProfile.mutate({ id: editingProfile.id, data: profileFormData });
            } else {
              createProfile.mutate(profileFormData);
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="profileCode">Profile Code</Label>
                <Input
                  id="profileCode"
                  placeholder="US01"
                  value={profileFormData.profileCode}
                  onChange={(e) => setProfileFormData({ ...profileFormData, profileCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="United States Standard"
                  value={profileFormData.name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Standard tax profile for US"
                  value={profileFormData.description}
                  onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={profileFormData.country || ""}
                  onValueChange={(value) => setProfileFormData({ ...profileFormData, country: value === "__none__" ? "" : value })}
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
                <input
                  type="checkbox"
                  id="isActive"
                  checked={profileFormData.isActive}
                  onChange={(e) => setProfileFormData({ ...profileFormData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProfile ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RULE DIALOG */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Tax Rule" : "Create Tax Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule ? "Update the tax rule details" : "Create a new tax rule for a profile"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingRule) {
              updateRule.mutate({ id: editingRule.id, data: ruleFormData });
            } else {
              createRule.mutate(ruleFormData);
            }
          }}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="profileId">Profile</Label>
                <select
                  id="profileId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={ruleFormData.profileId}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, profileId: Number(e.target.value) })}
                  required
                >
                  <option value="">Select a profile</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.profileCode} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ruleCode">Rule Code</Label>
                <Input
                  id="ruleCode"
                  placeholder="VAT01"
                  value={ruleFormData.ruleCode}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, ruleCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Standard Value Added Tax"
                  value={ruleFormData.title}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ratePercent">Rate (%)</Label>
                <Input
                  id="ratePercent"
                  type="number"
                  step="0.01"
                  placeholder="10.00"
                  value={ruleFormData.ratePercent}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, ratePercent: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input
                    id="jurisdiction"
                    placeholder="Federal, State"
                    value={ruleFormData.jurisdiction}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, jurisdiction: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appliesTo">Applies To</Label>
                  <Input
                    id="appliesTo"
                    placeholder="Sales, Services"
                    value={ruleFormData.appliesTo}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, appliesTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={ruleFormData.effectiveFrom}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, effectiveFrom: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="effectiveTo">Effective To (optional)</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={ruleFormData.effectiveTo}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, effectiveTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActiveRule"
                  checked={ruleFormData.isActive}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActiveRule">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxManagement;

